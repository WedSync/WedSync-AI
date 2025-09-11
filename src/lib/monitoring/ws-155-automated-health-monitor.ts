/**
 * WS-155: Automated Health Monitor
 * Automated health check system that runs every 5 minutes
 * Integrates with existing health check infrastructure and alert systems
 */

import { EventEmitter } from 'events';
import {
  generateSystemHealthReport,
  checkDatabaseHealth,
  checkAPIEndpoints,
  checkRLSPolicies,
  checkStorageHealth,
  checkMemoryUsage,
  checkCPUUsage,
  type SystemHealthReport,
  type HealthCheckResult,
} from '@/lib/monitoring/healthChecks';
import { AlertManager } from '@/lib/monitoring/alerts';
import { MultiChannelOrchestrator } from '@/lib/alerts/channels/MultiChannelOrchestrator';

export interface HealthMonitorConfig {
  intervalMinutes: number;
  enabledChecks: HealthCheckType[];
  alertThresholds: {
    responseTime: number;
    errorRate: number;
    cpuUsage: number;
    memoryUsage: number;
    storageUsage?: number;
  };
  retryAttempts?: number;
  retryDelayMs?: number;
  circuitBreakerThreshold?: number;
}

export type HealthCheckType =
  | 'database'
  | 'api'
  | 'rls'
  | 'storage'
  | 'memory'
  | 'cpu';

export interface HealthAlert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical' | 'emergency';
  type: 'system_health' | 'performance_degraded' | 'service_failure';
  title: string;
  description: string;
  timestamp: Date;
  healthReport?: SystemHealthReport;
  affectedServices: string[];
  recommendedActions: string[];
  metadata: Record<string, any>;
}

export interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half-open';
  failureCount: number;
  lastFailureTime?: Date;
  nextAttemptTime?: Date;
}

/**
 * Automated Health Monitor
 * Runs continuous health checks and triggers alerts when issues are detected
 */
export class AutomatedHealthMonitor extends EventEmitter {
  private config: HealthMonitorConfig;
  private intervalId: NodeJS.Timeout | null = null;
  private isActive = false;
  private alertManager: AlertManager;
  private multiChannelOrchestrator: MultiChannelOrchestrator;
  private circuitBreakers = new Map<string, CircuitBreakerState>();
  private healthHistory: SystemHealthReport[] = [];
  private readonly maxHistoryEntries = 100;

  constructor() {
    super();
    this.config = this.getDefaultConfiguration();
    this.alertManager = new AlertManager();
    this.multiChannelOrchestrator = new MultiChannelOrchestrator();

    this.initializeCircuitBreakers();
  }

  /**
   * Get default configuration
   */
  private getDefaultConfiguration(): HealthMonitorConfig {
    return {
      intervalMinutes: 5,
      enabledChecks: ['database', 'api', 'rls', 'storage', 'memory', 'cpu'],
      alertThresholds: {
        responseTime: 1000, // 1 second
        errorRate: 0.05, // 5%
        cpuUsage: 0.8, // 80%
        memoryUsage: 0.8, // 80%
        storageUsage: 0.9, // 90%
      },
      retryAttempts: 3,
      retryDelayMs: 1000,
      circuitBreakerThreshold: 5,
    };
  }

  /**
   * Initialize circuit breakers for each health check type
   */
  private initializeCircuitBreakers(): void {
    const checkTypes: HealthCheckType[] = [
      'database',
      'api',
      'rls',
      'storage',
      'memory',
      'cpu',
    ];

    for (const checkType of checkTypes) {
      this.circuitBreakers.set(checkType, {
        state: 'closed',
        failureCount: 0,
      });
    }
  }

  /**
   * Start automated health monitoring
   */
  async start(customConfig?: Partial<HealthMonitorConfig>): Promise<void> {
    if (this.isActive) {
      throw new Error('Health monitor is already running');
    }

    // Merge custom configuration
    if (customConfig) {
      this.config = { ...this.config, ...customConfig };
    }

    // Validate configuration
    this.validateConfiguration();

    console.log('🏥 Starting Automated Health Monitor', {
      intervalMinutes: this.config.intervalMinutes,
      enabledChecks: this.config.enabledChecks,
      alertThresholds: this.config.alertThresholds,
    });

    // Run initial health check
    try {
      await this.runHealthCheck();
    } catch (error) {
      console.error('Initial health check failed:', error);
    }

    // Start periodic monitoring
    this.intervalId = setInterval(
      async () => {
        try {
          await this.runHealthCheck();
        } catch (error) {
          console.error('Scheduled health check failed:', error);
          this.emit('error', error);
        }
      },
      this.config.intervalMinutes * 60 * 1000,
    );

    this.isActive = true;
    this.emit('started', { config: this.config });
  }

  /**
   * Stop automated health monitoring
   */
  async stop(): Promise<void> {
    if (!this.isActive) {
      return;
    }

    console.log('🛑 Stopping Automated Health Monitor');

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isActive = false;
    this.emit('stopped');
  }

  /**
   * Check if monitoring is currently running
   */
  isRunning(): boolean {
    return this.isActive;
  }

  /**
   * Get current configuration
   */
  getConfiguration(): HealthMonitorConfig {
    return { ...this.config };
  }

  /**
   * Get latest health report
   */
  getLatestHealthReport(): SystemHealthReport | null {
    return this.healthHistory.length > 0 ? this.healthHistory[0] : null;
  }

  /**
   * Get health history
   */
  getHealthHistory(limit: number = 10): SystemHealthReport[] {
    return this.healthHistory.slice(0, limit);
  }

  /**
   * Validate configuration
   */
  private validateConfiguration(): void {
    if (this.config.intervalMinutes <= 0) {
      throw new Error(
        'Invalid configuration: intervalMinutes must be greater than 0',
      );
    }

    if (this.config.enabledChecks.length === 0) {
      throw new Error(
        'Invalid configuration: must have at least one enabled health check',
      );
    }

    if (this.config.alertThresholds.responseTime <= 0) {
      throw new Error(
        'Invalid configuration: responseTime threshold must be positive',
      );
    }

    if (
      this.config.alertThresholds.errorRate < 0 ||
      this.config.alertThresholds.errorRate > 1
    ) {
      throw new Error(
        'Invalid configuration: errorRate must be between 0 and 1',
      );
    }

    if (
      this.config.alertThresholds.cpuUsage < 0 ||
      this.config.alertThresholds.cpuUsage > 1
    ) {
      throw new Error(
        'Invalid configuration: cpuUsage must be between 0 and 1',
      );
    }

    if (
      this.config.alertThresholds.memoryUsage < 0 ||
      this.config.alertThresholds.memoryUsage > 1
    ) {
      throw new Error(
        'Invalid configuration: memoryUsage must be between 0 and 1',
      );
    }
  }

  /**
   * Run comprehensive health check
   */
  async runHealthCheck(): Promise<SystemHealthReport> {
    const startTime = Date.now();
    console.log('🔍 Running automated health check...');

    try {
      const report = await this.executeHealthChecks();
      const processingTime = Date.now() - startTime;

      // Add to history
      this.addToHistory(report);

      // Process health report for alerts
      await this.processHealthReport(report);

      console.log('✅ Health check completed', {
        overallHealth: report.overallHealth,
        processingTime: `${processingTime}ms`,
        checksRun: Object.keys(report.checks).length,
      });

      this.emit('healthCheckComplete', { report, processingTime });
      return report;
    } catch (error) {
      console.error('❌ Health check failed:', error);

      const errorReport: SystemHealthReport = {
        overallHealth: 'critical',
        timestamp: new Date(),
        processingTime: Date.now() - startTime,
        checks: {},
        alerts: [],
        recommendations: ['Investigate health check system failure'],
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error',
          source: 'automated_health_monitor',
        },
      };

      this.addToHistory(errorReport);
      this.emit('healthCheckError', error);
      throw error;
    }
  }

  /**
   * Execute individual health checks based on configuration
   */
  private async executeHealthChecks(): Promise<SystemHealthReport> {
    const checks: Record<string, HealthCheckResult> = {};
    const promises: Promise<void>[] = [];

    // Execute enabled health checks in parallel
    for (const checkType of this.config.enabledChecks) {
      const circuitBreaker = this.circuitBreakers.get(checkType);

      // Skip if circuit breaker is open
      if (
        circuitBreaker?.state === 'open' &&
        !this.shouldAttemptCircuitBreakerReset(circuitBreaker)
      ) {
        checks[checkType] = {
          status: 'failed',
          responseTime: 0,
          error: 'Circuit breaker is open',
          timestamp: new Date(),
        };
        continue;
      }

      promises.push(
        this.executeHealthCheck(checkType)
          .then((result) => {
            checks[checkType] = result;
            this.recordHealthCheckSuccess(checkType);
          })
          .catch((error) => {
            checks[checkType] = {
              status: 'failed',
              responseTime: 0,
              error: error.message,
              timestamp: new Date(),
            };
            this.recordHealthCheckFailure(checkType);
          }),
      );
    }

    // Wait for all checks to complete
    await Promise.all(promises);

    // Generate comprehensive report
    const overallHealth = this.calculateOverallHealth(checks);
    const alerts = this.generateHealthAlerts(checks);
    const recommendations = this.generateRecommendations(checks);

    return {
      overallHealth,
      timestamp: new Date(),
      processingTime: 0, // Will be set by caller
      checks,
      alerts,
      recommendations,
      metadata: {
        source: 'automated_health_monitor',
        configuredChecks: this.config.enabledChecks,
        circuitBreakerStates: Object.fromEntries(this.circuitBreakers),
      },
    };
  }

  /**
   * Execute individual health check with retry logic
   */
  private async executeHealthCheck(
    checkType: HealthCheckType,
  ): Promise<HealthCheckResult> {
    const maxRetries = this.config.retryAttempts || 3;
    const retryDelay = this.config.retryDelayMs || 1000;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const startTime = Date.now();
        let result: HealthCheckResult;

        switch (checkType) {
          case 'database':
            result = await checkDatabaseHealth();
            break;
          case 'api':
            result = await checkAPIEndpoints();
            break;
          case 'rls':
            result = await checkRLSPolicies();
            break;
          case 'storage':
            result = await checkStorageHealth();
            break;
          case 'memory':
            result = await checkMemoryUsage();
            break;
          case 'cpu':
            result = await checkCPUUsage();
            break;
          default:
            throw new Error(`Unknown health check type: ${checkType}`);
        }

        result.responseTime = Date.now() - startTime;
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        if (attempt < maxRetries) {
          console.warn(
            `Health check ${checkType} failed on attempt ${attempt}, retrying...`,
            error,
          );
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
        }
      }
    }

    throw (
      lastError ||
      new Error(`Health check ${checkType} failed after ${maxRetries} attempts`)
    );
  }

  /**
   * Calculate overall system health
   */
  private calculateOverallHealth(
    checks: Record<string, HealthCheckResult>,
  ): 'healthy' | 'degraded' | 'critical' {
    const checkResults = Object.values(checks);
    const failedChecks = checkResults.filter(
      (check) => check.status === 'failed',
    );
    const degradedChecks = checkResults.filter(
      (check) => check.status === 'degraded',
    );

    if (failedChecks.length > 0) {
      // Critical if any essential service is down
      const essentialServices = ['database', 'api'];
      const failedEssential = failedChecks.some((check) =>
        essentialServices.includes(check.metadata?.checkType as string),
      );
      return failedEssential ? 'critical' : 'degraded';
    }

    if (degradedChecks.length > 0) {
      return 'degraded';
    }

    return 'healthy';
  }

  /**
   * Generate health alerts based on check results
   */
  private generateHealthAlerts(
    checks: Record<string, HealthCheckResult>,
  ): HealthAlert[] {
    const alerts: HealthAlert[] = [];

    for (const [checkType, result] of Object.entries(checks)) {
      if (result.status === 'failed') {
        alerts.push({
          id: `health_alert_${checkType}_${Date.now()}`,
          severity: this.getAlertSeverity(checkType, result),
          type: 'service_failure',
          title: `${checkType.charAt(0).toUpperCase() + checkType.slice(1)} Health Check Failed`,
          description:
            result.error || `${checkType} service is not responding correctly`,
          timestamp: new Date(),
          affectedServices: [checkType],
          recommendedActions: this.getRecommendedActions(checkType, result),
          metadata: {
            checkType,
            responseTime: result.responseTime,
            error: result.error,
            threshold: this.getThresholdForCheck(checkType),
          },
        });
      } else if (result.status === 'degraded') {
        alerts.push({
          id: `health_alert_${checkType}_degraded_${Date.now()}`,
          severity: 'medium',
          type: 'performance_degraded',
          title: `${checkType.charAt(0).toUpperCase() + checkType.slice(1)} Performance Degraded`,
          description: `${checkType} service is experiencing performance issues`,
          timestamp: new Date(),
          affectedServices: [checkType],
          recommendedActions: this.getRecommendedActions(checkType, result),
          metadata: {
            checkType,
            responseTime: result.responseTime,
            threshold: this.getThresholdForCheck(checkType),
          },
        });
      }
    }

    return alerts;
  }

  /**
   * Get alert severity based on check type and result
   */
  private getAlertSeverity(
    checkType: string,
    result: HealthCheckResult,
  ): HealthAlert['severity'] {
    const essentialServices = ['database', 'api'];

    if (result.status === 'failed') {
      return essentialServices.includes(checkType) ? 'critical' : 'high';
    }

    if (result.status === 'degraded') {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Get recommended actions for failed health checks
   */
  private getRecommendedActions(
    checkType: string,
    result: HealthCheckResult,
  ): string[] {
    const baseActions = [
      'Check system logs for detailed error information',
      'Verify service configuration and connectivity',
      'Monitor system resources (CPU, memory, disk space)',
    ];

    const specificActions: Record<string, string[]> = {
      database: [
        'Check database connection pool status',
        'Verify database server is running and accessible',
        'Check for long-running queries or locks',
        'Review database logs for errors',
      ],
      api: [
        'Check API server health and response times',
        'Verify external API dependencies are accessible',
        'Review API rate limiting and quotas',
        'Check load balancer configuration',
      ],
      rls: [
        'Review Row Level Security policy configuration',
        'Check database permissions and roles',
        'Verify RLS policies are not overly restrictive',
      ],
      storage: [
        'Check available disk space',
        'Verify storage service accessibility',
        'Review file upload/download capabilities',
      ],
      memory: [
        'Identify memory-intensive processes',
        'Consider increasing available memory',
        'Review application memory usage patterns',
      ],
      cpu: [
        'Identify CPU-intensive processes',
        'Consider scaling up compute resources',
        'Review application performance bottlenecks',
      ],
    };

    return [...baseActions, ...(specificActions[checkType] || [])];
  }

  /**
   * Get threshold value for a specific check type
   */
  private getThresholdForCheck(checkType: string): number {
    switch (checkType) {
      case 'database':
      case 'api':
        return this.config.alertThresholds.responseTime;
      case 'cpu':
        return this.config.alertThresholds.cpuUsage;
      case 'memory':
        return this.config.alertThresholds.memoryUsage;
      case 'storage':
        return this.config.alertThresholds.storageUsage || 0.9;
      default:
        return 0;
    }
  }

  /**
   * Generate health recommendations
   */
  private generateRecommendations(
    checks: Record<string, HealthCheckResult>,
  ): string[] {
    const recommendations: string[] = [];
    const failedChecks = Object.entries(checks).filter(
      ([, result]) => result.status === 'failed',
    );
    const degradedChecks = Object.entries(checks).filter(
      ([, result]) => result.status === 'degraded',
    );

    if (failedChecks.length === 0 && degradedChecks.length === 0) {
      recommendations.push('All systems are operating normally');
      return recommendations;
    }

    if (failedChecks.length > 0) {
      recommendations.push(
        `Immediate attention required: ${failedChecks.length} critical system(s) failing`,
        'Review system logs and error messages',
        'Consider implementing emergency procedures if necessary',
      );
    }

    if (degradedChecks.length > 0) {
      recommendations.push(
        `Performance optimization needed: ${degradedChecks.length} system(s) degraded`,
        'Monitor system performance closely',
        'Plan capacity upgrades if performance issues persist',
      );
    }

    return recommendations;
  }

  /**
   * Process health report and trigger alerts if necessary
   */
  async processHealthReport(report: SystemHealthReport): Promise<void> {
    // Only trigger alerts for degraded or critical health states
    if (report.overallHealth === 'healthy') {
      return;
    }

    console.log(`⚠️ Health issue detected: ${report.overallHealth}`);

    // Process each health alert
    for (const healthAlert of report.alerts) {
      await this.triggerHealthAlert(healthAlert, report);
    }

    // Trigger overall system health alert if critical
    if (report.overallHealth === 'critical') {
      await this.triggerCriticalSystemAlert(report);
    }
  }

  /**
   * Trigger individual health alert
   */
  private async triggerHealthAlert(
    healthAlert: HealthAlert,
    report: SystemHealthReport,
  ): Promise<void> {
    try {
      // Use existing AlertManager to process the alert
      await this.alertManager.processAlert({
        id: healthAlert.id,
        type: 'system_health',
        severity: healthAlert.severity,
        title: healthAlert.title,
        description: healthAlert.description,
        source: 'automated_health_monitor',
        timestamp: healthAlert.timestamp,
        data: {
          affectedServices: healthAlert.affectedServices,
          recommendedActions: healthAlert.recommendedActions,
          healthReport: report,
          metadata: healthAlert.metadata,
        },
        tags: ['health_check', 'automated', ...healthAlert.affectedServices],
      });

      this.emit('healthAlert', healthAlert);
    } catch (error) {
      console.error('Failed to process health alert:', error);
      this.emit('alertError', { alert: healthAlert, error });
    }
  }

  /**
   * Trigger critical system alert
   */
  private async triggerCriticalSystemAlert(
    report: SystemHealthReport,
  ): Promise<void> {
    const criticalAlert: HealthAlert = {
      id: `critical_system_health_${Date.now()}`,
      severity: 'critical',
      type: 'service_failure',
      title: 'Critical System Health Issue Detected',
      description: `Multiple systems are experiencing failures. Immediate attention required.`,
      timestamp: new Date(),
      healthReport: report,
      affectedServices: Object.keys(report.checks).filter(
        (key) => report.checks[key].status === 'failed',
      ),
      recommendedActions: [
        'Investigate all failed system components immediately',
        'Activate incident response procedures',
        'Consider enabling emergency fallback systems',
        'Monitor system recovery closely',
      ],
      metadata: {
        overallHealth: report.overallHealth,
        failedChecks: Object.keys(report.checks).filter(
          (key) => report.checks[key].status === 'failed',
        ),
        degradedChecks: Object.keys(report.checks).filter(
          (key) => report.checks[key].status === 'degraded',
        ),
      },
    };

    await this.triggerHealthAlert(criticalAlert, report);
  }

  /**
   * Record successful health check for circuit breaker
   */
  private recordHealthCheckSuccess(checkType: HealthCheckType): void {
    const circuitBreaker = this.circuitBreakers.get(checkType);
    if (circuitBreaker) {
      circuitBreaker.failureCount = 0;
      circuitBreaker.state = 'closed';
      circuitBreaker.lastFailureTime = undefined;
      circuitBreaker.nextAttemptTime = undefined;
    }
  }

  /**
   * Record failed health check for circuit breaker
   */
  private recordHealthCheckFailure(checkType: HealthCheckType): void {
    const circuitBreaker = this.circuitBreakers.get(checkType);
    if (circuitBreaker) {
      circuitBreaker.failureCount++;
      circuitBreaker.lastFailureTime = new Date();

      const threshold = this.config.circuitBreakerThreshold || 5;
      if (circuitBreaker.failureCount >= threshold) {
        circuitBreaker.state = 'open';
        circuitBreaker.nextAttemptTime = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
        console.warn(
          `🔧 Circuit breaker opened for ${checkType} after ${circuitBreaker.failureCount} failures`,
        );
      }
    }
  }

  /**
   * Check if circuit breaker should attempt reset
   */
  private shouldAttemptCircuitBreakerReset(
    circuitBreaker: CircuitBreakerState,
  ): boolean {
    if (circuitBreaker.state !== 'open') return false;
    if (!circuitBreaker.nextAttemptTime) return false;
    return new Date() >= circuitBreaker.nextAttemptTime;
  }

  /**
   * Add health report to history
   */
  private addToHistory(report: SystemHealthReport): void {
    this.healthHistory.unshift(report);

    // Keep only the most recent entries
    if (this.healthHistory.length > this.maxHistoryEntries) {
      this.healthHistory = this.healthHistory.slice(0, this.maxHistoryEntries);
    }
  }

  /**
   * Get circuit breaker state for a specific check type
   */
  getCircuitBreakerState(
    checkType: HealthCheckType,
  ): CircuitBreakerState | undefined {
    return this.circuitBreakers.get(checkType);
  }

  /**
   * Reset circuit breaker for a specific check type
   */
  resetCircuitBreaker(checkType: HealthCheckType): boolean {
    const circuitBreaker = this.circuitBreakers.get(checkType);
    if (circuitBreaker) {
      circuitBreaker.state = 'closed';
      circuitBreaker.failureCount = 0;
      circuitBreaker.lastFailureTime = undefined;
      circuitBreaker.nextAttemptTime = undefined;
      console.log(`🔧 Circuit breaker reset for ${checkType}`);
      return true;
    }
    return false;
  }

  /**
   * Force immediate health check (for admin/manual triggers)
   */
  async forceHealthCheck(): Promise<SystemHealthReport> {
    console.log('🚀 Force triggering health check...');
    return await this.runHealthCheck();
  }

  /**
   * Process health issue (for external triggers)
   */
  async processHealthIssue(issue: {
    type: string;
    severity: HealthAlert['severity'];
    details: Record<string, any>;
  }): Promise<void> {
    const healthAlert: HealthAlert = {
      id: `external_health_issue_${Date.now()}`,
      severity: issue.severity,
      type: 'service_failure',
      title: `External Health Issue: ${issue.type}`,
      description: `Health issue detected by external system: ${JSON.stringify(issue.details)}`,
      timestamp: new Date(),
      affectedServices: [issue.type],
      recommendedActions: [
        'Investigate external health issue',
        'Check system status',
      ],
      metadata: { ...issue.details, source: 'external_trigger' },
    };

    await this.triggerHealthAlert(healthAlert, {
      overallHealth: issue.severity === 'critical' ? 'critical' : 'degraded',
      timestamp: new Date(),
      processingTime: 0,
      checks: {},
      alerts: [healthAlert],
      recommendations: [],
      metadata: { source: 'external_health_issue' },
    });
  }
}

// Export singleton instance
export const automatedHealthMonitor = new AutomatedHealthMonitor();
