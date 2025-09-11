/**
 * WS-228 Alert Performance Tracker
 * Team E Implementation - Performance Integration
 *
 * Integrates with AlertManager to track performance metrics
 * Automatically monitors and reports performance violations
 */

import { AlertManager, AlertPriority, AlertType } from './alertManager';
import { alertSystemMonitor } from '../monitoring/ws-228-alert-system-monitor';

export class AlertPerformanceTracker {
  private static instance: AlertPerformanceTracker;

  private constructor() {
    this.setupPerformanceMonitoring();
  }

  static getInstance(): AlertPerformanceTracker {
    if (!AlertPerformanceTracker.instance) {
      AlertPerformanceTracker.instance = new AlertPerformanceTracker();
    }
    return AlertPerformanceTracker.instance;
  }

  /**
   * Set up automatic performance monitoring hooks
   */
  private setupPerformanceMonitoring() {
    // Listen for performance violations
    alertSystemMonitor.on('performance_violation', async (violation) => {
      await this.handlePerformanceViolation(violation);
    });

    // Listen for Saturday protection events
    alertSystemMonitor.on('saturday_protection_triggered', async (event) => {
      await this.handleSaturdayProtection(event);
    });

    // Listen for wedding day events
    alertSystemMonitor.on('wedding_day_maximum_protection', async (event) => {
      await this.handleWeddingDayProtection(event);
    });

    // Monitor slow alert creation
    alertSystemMonitor.on('alert_creation_slow', async (event) => {
      await this.handleSlowAlertCreation(event);
    });

    // Start monitoring
    alertSystemMonitor.startMonitoring(15000); // Every 15 seconds
  }

  /**
   * Wrap AlertManager.createAlert with performance tracking
   */
  async trackAlertCreation<T>(
    alertData: any,
    createAlertFn: () => Promise<T>,
  ): Promise<T> {
    const startTime = performance.now();

    try {
      // Execute the actual alert creation
      const result = await createAlertFn();

      const duration = performance.now() - startTime;

      // Record performance metrics
      alertSystemMonitor.recordAlertCreationTime(duration);

      // Check for wedding day context
      if (this.isWeddingDayContext(alertData)) {
        await this.trackWeddingDayAlert(alertData, duration);
      }

      // Check if creation was slow
      if (duration > 500) {
        console.warn(
          `⚠️ Slow alert creation: ${duration}ms (threshold: 500ms)`,
        );
      }

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;

      // Record failed creation attempt
      await this.recordFailedAlertCreation(alertData, duration, error);

      throw error;
    }
  }

  /**
   * Track deduplication performance
   */
  async trackDeduplication<T>(deduplicationFn: () => Promise<T>): Promise<T> {
    const startTime = performance.now();

    const result = await deduplicationFn();

    const duration = performance.now() - startTime;
    alertSystemMonitor.recordDeduplicationTime(duration);

    return result;
  }

  /**
   * Track WebSocket notification performance
   */
  async trackWebSocketNotification<T>(
    notificationFn: () => Promise<T>,
  ): Promise<T> {
    const startTime = performance.now();

    const result = await notificationFn();

    const duration = performance.now() - startTime;
    alertSystemMonitor.recordWebSocketNotificationTime(duration);

    return result;
  }

  /**
   * Handle performance violations by creating meta-alerts
   */
  private async handlePerformanceViolation(violation: any) {
    const alertManager = new AlertManager();

    await alertManager.createAlert({
      title: `Alert System Performance Violation: ${violation.metric}`,
      message: `Performance metric ${violation.metric} exceeded threshold. Current: ${violation.current}ms, Threshold: ${violation.threshold}ms`,
      priority: this.mapSeverityToPriority(violation.severity),
      type: AlertType.SYSTEM_HEALTH,
      source: 'alert-performance-tracker',
      metadata: {
        violation_type: 'performance',
        metric: violation.metric,
        current_value: violation.current,
        threshold: violation.threshold,
        severity: violation.severity,
        is_meta_alert: true,
      },
    });
  }

  /**
   * Handle Saturday deployment protection
   */
  private async handleSaturdayProtection(event: any) {
    const alertManager = new AlertManager();

    await alertSystemMonitor.recordSaturdayDeploymentBlock();

    await alertManager.createAlert({
      title: 'Saturday Deployment Protection Activated',
      message: `Deployment attempt blocked due to ${event.active_weddings} active weddings today. Wedding day protocol in effect.`,
      priority: AlertPriority.CRITICAL,
      type: AlertType.WEDDING_DAY,
      source: 'saturday-protection-system',
      metadata: {
        protection_type: 'saturday_deployment',
        active_weddings: event.active_weddings,
        blocked_attempts: event.attempts,
        is_wedding_day: true,
      },
    });
  }

  /**
   * Handle wedding day maximum protection mode
   */
  private async handleWeddingDayProtection(event: any) {
    console.log(
      `🚨 WEDDING DAY MAXIMUM PROTECTION MODE - ${event.active_weddings} Active Weddings`,
    );

    // Create informational alert for admins
    const alertManager = new AlertManager();

    await alertManager.createAlert({
      title: 'Wedding Day Maximum Protection Mode Active',
      message: `System operating in maximum protection mode with ${event.active_weddings} active weddings today. All deployments blocked, monitoring increased.`,
      priority: AlertPriority.HIGH,
      type: AlertType.WEDDING_DAY,
      source: 'wedding-day-protection',
      metadata: {
        protection_level: event.protection_level,
        active_weddings: event.active_weddings,
        monitoring_mode: 'MAXIMUM',
        saturday_protection: new Date().getDay() === 6,
      },
    });
  }

  /**
   * Handle slow alert creation events
   */
  private async handleSlowAlertCreation(event: any) {
    // Only create meta-alert if it's significantly slow (> 1000ms)
    if (event.duration > 1000) {
      const alertManager = new AlertManager();

      await alertManager.createAlert({
        title: 'Alert System Performance Degradation',
        message: `Alert creation took ${event.duration}ms (threshold: ${event.threshold}ms). System may be under stress.`,
        priority: AlertPriority.MEDIUM,
        type: AlertType.SYSTEM_HEALTH,
        source: 'alert-performance-tracker',
        metadata: {
          performance_issue: 'slow_alert_creation',
          duration_ms: event.duration,
          threshold_ms: event.threshold,
          degradation_factor: (event.duration / event.threshold).toFixed(2),
        },
      });
    }
  }

  /**
   * Track wedding day specific alert performance
   */
  private async trackWeddingDayAlert(alertData: any, duration: number) {
    // Wedding day alerts get special tracking
    console.log(
      `📸 Wedding day alert processed in ${duration}ms:`,
      alertData.title,
    );

    // Store wedding-specific metrics
    await alertSystemMonitor.redis.lpush(
      'wedding_day_alert_performance',
      JSON.stringify({
        timestamp: Date.now(),
        duration,
        alert_type: alertData.type,
        priority: alertData.priority,
        wedding_context: alertData.metadata?.wedding_id || 'unknown',
      }),
    );

    // Keep only last 100 wedding day performance records
    await alertSystemMonitor.redis.ltrim(
      'wedding_day_alert_performance',
      0,
      99,
    );
  }

  /**
   * Record failed alert creation for debugging
   */
  private async recordFailedAlertCreation(
    alertData: any,
    duration: number,
    error: any,
  ) {
    console.error(`❌ Alert creation failed after ${duration}ms:`, error);

    // Store failure for analysis
    await alertSystemMonitor.redis.lpush(
      'failed_alert_creation',
      JSON.stringify({
        timestamp: Date.now(),
        duration,
        error: error.message,
        alert_data: alertData,
        stack_trace: error.stack?.split('\n').slice(0, 5), // First 5 lines
      }),
    );

    // Keep only last 50 failures
    await alertSystemMonitor.redis.ltrim('failed_alert_creation', 0, 49);
  }

  /**
   * Utilities
   */
  private isWeddingDayContext(alertData: any): boolean {
    return (
      alertData.type === AlertType.WEDDING_DAY ||
      alertData.metadata?.is_wedding_day === true ||
      alertData.metadata?.wedding_id !== undefined
    );
  }

  private mapSeverityToPriority(severity: string): AlertPriority {
    switch (severity) {
      case 'CRITICAL':
        return AlertPriority.CRITICAL;
      case 'HIGH':
        return AlertPriority.HIGH;
      case 'MEDIUM':
        return AlertPriority.MEDIUM;
      case 'LOW':
        return AlertPriority.LOW;
      default:
        return AlertPriority.INFO;
    }
  }

  /**
   * Get real-time performance dashboard data
   */
  async getPerformanceDashboard() {
    return await alertSystemMonitor.getDashboardMetrics();
  }

  /**
   * Get wedding day performance summary
   */
  async getWeddingDayPerformanceSummary() {
    const weddingPerformance = await alertSystemMonitor.redis.lrange(
      'wedding_day_alert_performance',
      0,
      99,
    );

    const performanceData = weddingPerformance.map((item) => JSON.parse(item));

    return {
      total_wedding_alerts: performanceData.length,
      average_response_time:
        performanceData.length > 0
          ? performanceData.reduce((sum, item) => sum + item.duration, 0) /
            performanceData.length
          : 0,
      fastest_response: Math.min(
        ...performanceData.map((item) => item.duration),
        0,
      ),
      slowest_response: Math.max(
        ...performanceData.map((item) => item.duration),
        0,
      ),
      performance_target_met: performanceData.filter(
        (item) => item.duration <= 500,
      ).length,
      performance_target_missed: performanceData.filter(
        (item) => item.duration > 500,
      ).length,
    };
  }

  /**
   * Emergency shutdown for wedding day incidents
   */
  async emergencyWeddingDayShutdown() {
    console.log('🚨 EMERGENCY WEDDING DAY SHUTDOWN INITIATED');

    // Stop all non-essential monitoring
    await alertSystemMonitor.stopMonitoring();

    // Create emergency alert
    const alertManager = new AlertManager();
    await alertManager.createAlert({
      title: 'EMERGENCY: Wedding Day System Shutdown',
      message:
        'Alert system monitoring temporarily disabled due to wedding day emergency.',
      priority: AlertPriority.CRITICAL,
      type: AlertType.WEDDING_DAY,
      source: 'emergency-shutdown',
      metadata: {
        emergency_type: 'wedding_day_shutdown',
        timestamp: Date.now(),
        active_weddings: (await alertSystemMonitor.getDashboardMetrics())
          .wedding_day.active_weddings_today,
      },
    });
  }
}

// Export singleton instance
export const alertPerformanceTracker = AlertPerformanceTracker.getInstance();
