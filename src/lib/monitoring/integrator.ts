/**
 * Monitoring Integrator for WS-151
 * Master coordinator for all monitoring services with health checks and graceful degradation
 */

import { enhancedSentry } from './sentry-enhanced';
import { logRocketIntegration } from './logrocket-integration';
import { securityScanner } from './security-scanner';
import { bundleAnalyzer } from './bundle-analyzer';
import { performanceValidator } from './performance-validator';

interface MonitoringService {
  name: string;
  initialized: boolean;
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: string;
  error?: string;
  metrics?: Record<string, any>;
}

interface MonitoringServices {
  sentry: MonitoringService;
  logRocket: MonitoringService;
  performance: MonitoringService;
  security: MonitoringService;
  bundleAnalyzer: MonitoringService;
}

interface MonitoringHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: MonitoringServices;
  performance: {
    overheadPercentage: number;
    withinThreshold: boolean;
    weddingDayOptimized: boolean;
  };
  timestamp: string;
  uptime: number;
}

interface InitializationResult {
  sentry: { initialized: boolean; error?: string };
  logRocket: { initialized: boolean; error?: string };
  performance: { initialized: boolean; overhead: number };
  security: { initialized: boolean; error?: string };
  status: 'healthy' | 'degraded' | 'unhealthy';
}

export class MonitoringIntegratorService {
  private static instance: MonitoringIntegratorService;
  private services: MonitoringServices;
  private initialized = false;
  private startTime: number;
  private healthCheckInterval?: NodeJS.Timeout;
  private isWeddingDay: boolean;

  private constructor() {
    this.startTime = Date.now();
    this.isWeddingDay = process.env.NEXT_PUBLIC_WEDDING_DAY_MODE === 'true';

    this.services = {
      sentry: {
        name: 'Enhanced Sentry',
        initialized: false,
        status: 'unhealthy',
        lastCheck: new Date().toISOString(),
      },
      logRocket: {
        name: 'LogRocket',
        initialized: false,
        status: 'unhealthy',
        lastCheck: new Date().toISOString(),
      },
      performance: {
        name: 'Performance Validator',
        initialized: false,
        status: 'unhealthy',
        lastCheck: new Date().toISOString(),
      },
      security: {
        name: 'Security Scanner',
        initialized: false,
        status: 'unhealthy',
        lastCheck: new Date().toISOString(),
      },
      bundleAnalyzer: {
        name: 'Bundle Analyzer',
        initialized: false,
        status: 'unhealthy',
        lastCheck: new Date().toISOString(),
      },
    };
  }

  static getInstance(): MonitoringIntegratorService {
    if (!MonitoringIntegratorService.instance) {
      MonitoringIntegratorService.instance = new MonitoringIntegratorService();
    }
    return MonitoringIntegratorService.instance;
  }

  /**
   * Initialize all monitoring services with graceful degradation
   */
  async initializeAllMonitoringServices(): Promise<InitializationResult> {
    console.log('Initializing all monitoring services...');

    const startTime = Date.now();
    const results: InitializationResult = {
      sentry: { initialized: false },
      logRocket: { initialized: false },
      performance: { initialized: false, overhead: 0 },
      security: { initialized: false },
      status: 'unhealthy',
    };

    // Initialize services in parallel with error handling
    const initPromises = [
      this.initializeSentry(),
      this.initializeLogRocket(),
      this.initializePerformanceValidator(),
      this.initializeSecurityScanner(),
      this.initializeBundleAnalyzer(),
    ];

    const settled = await Promise.allSettled(initPromises);

    // Process results
    results.sentry =
      settled[0].status === 'fulfilled'
        ? settled[0].value
        : {
            initialized: false,
            error: (settled[0] as PromiseRejectedResult).reason,
          };

    results.logRocket =
      settled[1].status === 'fulfilled'
        ? settled[1].value
        : {
            initialized: false,
            error: (settled[1] as PromiseRejectedResult).reason,
          };

    results.performance =
      settled[2].status === 'fulfilled'
        ? settled[2].value
        : {
            initialized: false,
            overhead: 0,
            error: (settled[2] as PromiseRejectedResult).reason,
          };

    results.security =
      settled[3].status === 'fulfilled'
        ? settled[3].value
        : {
            initialized: false,
            error: (settled[3] as PromiseRejectedResult).reason,
          };

    // Determine overall status
    const healthyServices = [
      results.sentry.initialized,
      results.logRocket.initialized,
      results.performance.initialized,
      results.security.initialized,
    ].filter(Boolean).length;

    if (healthyServices >= 3) {
      results.status = 'healthy';
    } else if (healthyServices >= 2) {
      results.status = 'degraded';
    } else {
      results.status = 'unhealthy';
    }

    this.initialized = true;

    // Start health check monitoring
    this.startHealthCheckMonitoring();

    console.log('Monitoring services initialization complete:', {
      status: results.status,
      healthyServices,
      totalServices: 5,
      overhead: `${results.performance.overhead.toFixed(2)}%`,
      weddingDayMode: this.isWeddingDay,
      initializationTime: Date.now() - startTime,
    });

    return results;
  }

  /**
   * Get comprehensive health status
   */
  async getMonitoringHealthStatus(): Promise<MonitoringHealthStatus> {
    const performanceMetrics = await this.checkPerformanceStatus();

    const health: MonitoringHealthStatus = {
      status: this.calculateOverallStatus(),
      services: { ...this.services },
      performance: {
        overheadPercentage: performanceMetrics.overhead,
        withinThreshold: performanceMetrics.overhead < 2.0,
        weddingDayOptimized:
          this.isWeddingDay && performanceMetrics.overhead < 1.0,
      },
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
    };

    // Update last check times
    Object.values(this.services).forEach((service) => {
      service.lastCheck = new Date().toISOString();
    });

    return health;
  }

  /**
   * Initialize Enhanced Sentry
   */
  private async initializeSentry(): Promise<{
    initialized: boolean;
    error?: string;
  }> {
    try {
      enhancedSentry.initializeEnhancedSentry();

      const status = enhancedSentry.getStatus();
      this.services.sentry.initialized = status.initialized;
      this.services.sentry.status = status.initialized
        ? 'healthy'
        : 'unhealthy';
      this.services.sentry.metrics = {
        errorCount: status.errorCount,
        sessionId: status.sessionId,
        weddingDayMode: status.weddingDayMode,
      };

      return { initialized: status.initialized };
    } catch (error) {
      this.services.sentry.status = 'unhealthy';
      this.services.sentry.error =
        error instanceof Error ? error.message : 'Unknown error';

      console.error('Sentry initialization failed:', error);
      return { initialized: false, error: this.services.sentry.error };
    }
  }

  /**
   * Initialize LogRocket
   */
  private async initializeLogRocket(): Promise<{
    initialized: boolean;
    error?: string;
  }> {
    try {
      // Check if LogRocket should be enabled
      const shouldEnable = logRocketIntegration.shouldEnableLogRocket();

      if (!shouldEnable) {
        this.services.logRocket.initialized = false;
        this.services.logRocket.status = 'degraded';
        this.services.logRocket.error =
          'Disabled for wedding day performance optimization';
        return { initialized: false, error: this.services.logRocket.error };
      }

      logRocketIntegration.initializeLogRocket();

      const sessionInfo = logRocketIntegration.getSessionInfo();
      this.services.logRocket.initialized = sessionInfo.initialized;
      this.services.logRocket.status = sessionInfo.initialized
        ? 'healthy'
        : 'unhealthy';
      this.services.logRocket.metrics = {
        sessionUrl: sessionInfo.sessionUrl,
        samplingRate: sessionInfo.samplingRate,
        weddingDayMode: sessionInfo.weddingDayMode,
      };

      return { initialized: sessionInfo.initialized };
    } catch (error) {
      this.services.logRocket.status = 'unhealthy';
      this.services.logRocket.error =
        error instanceof Error ? error.message : 'Unknown error';

      console.error('LogRocket initialization failed:', error);
      return { initialized: false, error: this.services.logRocket.error };
    }
  }

  /**
   * Initialize Performance Validator
   */
  private async initializePerformanceValidator(): Promise<{
    initialized: boolean;
    overhead: number;
    error?: string;
  }> {
    try {
      const overhead = await performanceValidator.measureMonitoringOverhead();

      this.services.performance.initialized = true;
      this.services.performance.status =
        overhead.total < 2.0
          ? 'healthy'
          : overhead.total < 5.0
            ? 'degraded'
            : 'unhealthy';
      this.services.performance.metrics = {
        totalOverhead: overhead.total,
        sentryOverhead: overhead.sentry,
        logRocketOverhead: overhead.logRocket,
        webVitalsOverhead: overhead.webVitals,
      };

      return { initialized: true, overhead: overhead.total };
    } catch (error) {
      this.services.performance.status = 'unhealthy';
      this.services.performance.error =
        error instanceof Error ? error.message : 'Unknown error';

      console.error('Performance validator initialization failed:', error);
      return {
        initialized: false,
        overhead: 0,
        error: this.services.performance.error,
      };
    }
  }

  /**
   * Initialize Security Scanner
   */
  private async initializeSecurityScanner(): Promise<{
    initialized: boolean;
    error?: string;
  }> {
    try {
      // Test security scanner functionality
      const testResult = await securityScanner.runSecurityScan({
        type: 'dependencies',
        severity: 'critical',
      });

      this.services.security.initialized = true;
      this.services.security.status =
        testResult.status === 'pass' ? 'healthy' : 'degraded';
      this.services.security.metrics = {
        lastScanTimestamp: testResult.timestamp,
        vulnerabilities: testResult.summary.total,
        criticalVulnerabilities: testResult.summary.critical,
      };

      return { initialized: true };
    } catch (error) {
      this.services.security.status = 'degraded'; // Security scanner can fail but app continues
      this.services.security.error =
        error instanceof Error ? error.message : 'Unknown error';

      console.warn(
        'Security scanner initialization failed (non-critical):',
        error,
      );
      return { initialized: false, error: this.services.security.error };
    }
  }

  /**
   * Initialize Bundle Analyzer
   */
  private async initializeBundleAnalyzer(): Promise<{
    initialized: boolean;
    error?: string;
  }> {
    try {
      // Test bundle analyzer functionality
      const bundleSize = await bundleAnalyzer.getMonitoringBundleSize();

      this.services.bundleAnalyzer.initialized = true;
      this.services.bundleAnalyzer.status =
        bundleSize.percentage < 5
          ? 'healthy'
          : bundleSize.percentage < 10
            ? 'degraded'
            : 'unhealthy';
      this.services.bundleAnalyzer.metrics = {
        monitoringBundleSize: bundleSize.total,
        percentage: bundleSize.percentage,
        sentrySize: bundleSize.sentry,
        logRocketSize: bundleSize.logRocket,
      };

      return { initialized: true };
    } catch (error) {
      this.services.bundleAnalyzer.status = 'degraded'; // Bundle analyzer is non-critical
      this.services.bundleAnalyzer.error =
        error instanceof Error ? error.message : 'Unknown error';

      console.warn(
        'Bundle analyzer initialization failed (non-critical):',
        error,
      );
      return { initialized: false, error: this.services.bundleAnalyzer.error };
    }
  }

  /**
   * Calculate overall system status
   */
  private calculateOverallStatus(): 'healthy' | 'degraded' | 'unhealthy' {
    const statuses = Object.values(this.services).map(
      (service) => service.status,
    );

    const healthyCount = statuses.filter(
      (status) => status === 'healthy',
    ).length;
    const degradedCount = statuses.filter(
      (status) => status === 'degraded',
    ).length;

    if (healthyCount >= 4) {
      return 'healthy';
    } else if (healthyCount >= 2 || (healthyCount >= 1 && degradedCount >= 2)) {
      return 'degraded';
    } else {
      return 'unhealthy';
    }
  }

  /**
   * Check performance status
   */
  private async checkPerformanceStatus(): Promise<{ overhead: number }> {
    try {
      const overhead = await performanceValidator.measureMonitoringOverhead();
      return { overhead: overhead.total };
    } catch (error) {
      console.error('Performance check failed:', error);
      return { overhead: this.isWeddingDay ? 0.5 : 1.5 }; // Conservative estimate
    }
  }

  /**
   * Start continuous health check monitoring
   */
  private startHealthCheckMonitoring(): void {
    const interval = this.isWeddingDay ? 30000 : 60000; // More frequent checks on wedding day

    this.healthCheckInterval = setInterval(async () => {
      try {
        const health = await this.getMonitoringHealthStatus();

        // Log status changes
        if (health.status !== this.calculateOverallStatus()) {
          console.log('Monitoring health status changed:', {
            newStatus: health.status,
            timestamp: health.timestamp,
            performance: health.performance,
          });
        }

        // Alert on critical issues
        if (
          health.status === 'unhealthy' ||
          health.performance.overheadPercentage > 5
        ) {
          console.error(
            'CRITICAL: Monitoring system unhealthy or high overhead:',
            {
              status: health.status,
              overhead: health.performance.overheadPercentage,
              services: Object.entries(health.services)
                .filter(([_, service]) => service.status === 'unhealthy')
                .map(([name, _]) => name),
            },
          );
        }
      } catch (error) {
        console.error('Health check monitoring failed:', error);
      }
    }, interval);
  }

  /**
   * Stop health check monitoring
   */
  stopHealthCheckMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }
  }

  /**
   * Get service-specific metrics
   */
  getServiceMetrics(
    serviceName: keyof MonitoringServices,
  ): MonitoringService | undefined {
    return this.services[serviceName];
  }

  /**
   * Force health check for specific service
   */
  async checkServiceHealth(
    serviceName: keyof MonitoringServices,
  ): Promise<MonitoringService> {
    const service = this.services[serviceName];

    try {
      switch (serviceName) {
        case 'sentry':
          const sentryStatus = enhancedSentry.getStatus();
          service.status = sentryStatus.initialized ? 'healthy' : 'unhealthy';
          service.metrics = { errorCount: sentryStatus.errorCount };
          break;

        case 'performance':
          const overhead =
            await performanceValidator.measureMonitoringOverhead();
          service.status = overhead.total < 2.0 ? 'healthy' : 'degraded';
          service.metrics = { overhead: overhead.total };
          break;

        default:
          // Generic health check
          service.lastCheck = new Date().toISOString();
      }
    } catch (error) {
      service.status = 'unhealthy';
      service.error = error instanceof Error ? error.message : 'Unknown error';
    }

    return service;
  }
}

// Export singleton instance and convenience functions
export const monitoringIntegrator = MonitoringIntegratorService.getInstance();

export const initializeAllMonitoringServices = () => {
  return monitoringIntegrator.initializeAllMonitoringServices();
};

export const getMonitoringHealthStatus = () => {
  return monitoringIntegrator.getMonitoringHealthStatus();
};
