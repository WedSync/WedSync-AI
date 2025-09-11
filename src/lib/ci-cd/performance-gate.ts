import { createHash, randomBytes } from 'crypto';

export interface PerformanceTestConfig {
  testType: 'load' | 'stress' | 'spike' | 'volume';
  duration: number; // in seconds
  userCount: number;
  targetUrl: string;
  thresholds: PerformanceThresholds;
  environment: 'staging' | 'production';
  weddingContext?: {
    peakSeason?: boolean;
    criticalPeriod?: boolean;
    userSegment?: 'photographer' | 'couple' | 'vendor';
  };
}

export interface PerformanceThresholds {
  responseTime: number; // milliseconds
  errorRate: number; // percentage (0-1)
  throughput: number; // requests per second
  coreWebVitals: {
    LCP: number; // Largest Contentful Paint (ms)
    FID: number; // First Input Delay (ms)
    CLS: number; // Cumulative Layout Shift
    TTFB: number; // Time to First Byte (ms)
  };
  weddingSpecific?: {
    guestListLoad: number;
    photoGalleryRender: number;
    timelineInteraction: number;
    vendorSearchResponse: number;
  };
}

export interface PerformanceMetrics {
  responseTime: number;
  errorRate: number;
  throughput: number;
  coreWebVitals: {
    LCP: number;
    FID: number;
    CLS: number;
    TTFB: number;
  };
  timestamp: Date;
  testId: string;
  environment: string;
}

export interface DeploymentValidationResult {
  passed: boolean;
  validationId: string;
  buildId: string;
  metrics: PerformanceMetrics;
  violations: PerformanceViolation[];
  recommendation: string;
  blockedDeployment: boolean;
  timestamp: Date;
}

export interface PerformanceViolation {
  metric: string;
  threshold: number;
  actual: number;
  severity: 'warning' | 'error' | 'critical';
  impact: string;
}

export interface PerformanceBaseline {
  baselineId: string;
  environment: string;
  metrics: PerformanceMetrics;
  createdAt: Date;
  validUntil: Date;
  confidence: number; // 0-1
  sampleSize: number;
}

export interface DeploymentContext {
  buildId: string;
  gitHash: string;
  branch: string;
  environment: string;
  triggeredBy: string;
  timestamp: Date;
  migrationChanges?: boolean;
  criticalChanges?: boolean;
}

/**
 * Core CI/CD integration engine for performance testing and deployment validation
 * Prevents performance regressions from reaching production
 */
export class PerformanceGate {
  private baselines: Map<string, PerformanceBaseline> = new Map();
  private validationResults: Map<string, DeploymentValidationResult> =
    new Map();

  constructor(
    private githubToken?: string,
    private vercelToken?: string,
    private monitoringWebhook?: string,
  ) {}

  /**
   * Validates a deployment against performance criteria
   * Blocks deployment if performance thresholds are exceeded
   */
  async validateDeployment(
    buildId: string,
    environment: 'staging' | 'production',
    testConfig: PerformanceTestConfig,
    deploymentContext?: DeploymentContext,
  ): Promise<DeploymentValidationResult> {
    const validationId = this.generateValidationId();

    try {
      // 1. Execute performance tests
      console.log(
        `🚀 Starting performance validation for build ${buildId} in ${environment}`,
      );
      const metrics = await this.executePerformanceTest(testConfig, buildId);

      // 2. Get baseline for comparison
      const baseline = await this.getBaseline(environment, testConfig.testType);

      // 3. Analyze performance against thresholds and baseline
      const violations = await this.analyzePerformance(
        metrics,
        testConfig.thresholds,
        baseline,
      );

      // 4. Determine if deployment should be blocked
      const blockedDeployment = this.shouldBlockDeployment(
        violations,
        environment,
      );

      // 5. Generate recommendations
      const recommendation = this.generateRecommendation(
        violations,
        metrics,
        baseline,
      );

      const result: DeploymentValidationResult = {
        passed: !blockedDeployment,
        validationId,
        buildId,
        metrics,
        violations,
        recommendation,
        blockedDeployment,
        timestamp: new Date(),
      };

      // 6. Store validation result
      this.validationResults.set(validationId, result);

      // 7. If deployment is blocked, trigger blocking mechanism
      if (blockedDeployment) {
        await this.blockDeployment(
          buildId,
          violations,
          metrics,
          deploymentContext,
        );
      }

      // 8. Send notifications
      await this.sendValidationNotification(result, deploymentContext);

      console.log(
        `✅ Performance validation completed: ${result.passed ? 'PASSED' : 'BLOCKED'}`,
      );
      return result;
    } catch (error) {
      console.error(
        `❌ Performance validation failed for build ${buildId}:`,
        error,
      );

      const failureResult: DeploymentValidationResult = {
        passed: false,
        validationId,
        buildId,
        metrics: this.getEmptyMetrics(),
        violations: [
          {
            metric: 'validation_execution',
            threshold: 0,
            actual: 1,
            severity: 'critical',
            impact: `Validation failed: ${error.message}`,
          },
        ],
        recommendation: 'Fix validation execution errors before deployment',
        blockedDeployment: true,
        timestamp: new Date(),
      };

      this.validationResults.set(validationId, failureResult);
      return failureResult;
    }
  }

  /**
   * Establishes a performance baseline for regression detection
   */
  async establishBaseline(
    environment: string,
    testResults: PerformanceMetrics,
    testType: string = 'load',
  ): Promise<PerformanceBaseline> {
    const baselineId = this.generateBaselineId(environment, testType);

    // Calculate confidence based on historical data consistency
    const confidence = await this.calculateBaselineConfidence(
      testResults,
      environment,
    );

    const baseline: PerformanceBaseline = {
      baselineId,
      environment,
      metrics: testResults,
      createdAt: new Date(),
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Valid for 7 days
      confidence,
      sampleSize: 1,
    };

    this.baselines.set(baselineId, baseline);

    console.log(`📊 Baseline established for ${environment}: ${baselineId}`);
    return baseline;
  }

  /**
   * Blocks deployment through CI/CD integration
   */
  private async blockDeployment(
    buildId: string,
    violations: PerformanceViolation[],
    metrics: PerformanceMetrics,
    deploymentContext?: DeploymentContext,
  ): Promise<void> {
    console.log(
      `🚫 BLOCKING DEPLOYMENT: Build ${buildId} failed performance validation`,
    );

    // 1. Block via GitHub Actions status check
    if (this.githubToken && deploymentContext) {
      await this.setGitHubStatusCheck(
        deploymentContext.gitHash,
        'failure',
        'Performance validation failed',
        violations,
      );
    }

    // 2. Block via Vercel deployment
    if (this.vercelToken) {
      await this.blockVercelDeployment(buildId, violations);
    }

    // 3. Log blocking decision with audit trail
    await this.logDeploymentBlock(
      buildId,
      violations,
      metrics,
      deploymentContext,
    );

    // 4. Notify development team
    await this.notifyTeam('deployment_blocked', {
      buildId,
      violations: violations.map(
        (v) => `${v.metric}: ${v.actual} exceeds ${v.threshold}`,
      ),
      environment: deploymentContext?.environment || 'unknown',
      branch: deploymentContext?.branch || 'unknown',
    });
  }

  /**
   * Executes performance tests using k6 or similar tool
   */
  private async executePerformanceTest(
    config: PerformanceTestConfig,
    buildId: string,
  ): Promise<PerformanceMetrics> {
    console.log(
      `⚡ Executing ${config.testType} test for ${config.duration}s with ${config.userCount} users`,
    );

    // Simulate k6 performance test execution
    // In production, this would integrate with actual k6 or similar performance testing tools
    const startTime = Date.now();

    // Enhanced thresholds for wedding-critical periods
    const adjustedThresholds = this.adjustThresholdsForContext(
      config.thresholds,
      config.weddingContext,
    );

    // Mock performance test results - in production, integrate with real testing tools
    const mockResults: PerformanceMetrics = {
      responseTime: Math.random() * 2000 + 500, // 500-2500ms
      errorRate: Math.random() * 0.05, // 0-5%
      throughput: Math.random() * 200 + 50, // 50-250 req/s
      coreWebVitals: {
        LCP: Math.random() * 3000 + 1000, // 1000-4000ms
        FID: Math.random() * 200 + 50, // 50-250ms
        CLS: Math.random() * 0.2, // 0-0.2
        TTFB: Math.random() * 800 + 200, // 200-1000ms
      },
      timestamp: new Date(),
      testId: `test_${buildId}_${Date.now()}`,
      environment: config.environment,
    };

    console.log(`📊 Test completed in ${Date.now() - startTime}ms`);
    return mockResults;
  }

  /**
   * Analyzes performance metrics against thresholds and baseline
   */
  private async analyzePerformance(
    metrics: PerformanceMetrics,
    thresholds: PerformanceThresholds,
    baseline?: PerformanceBaseline,
  ): Promise<PerformanceViolation[]> {
    const violations: PerformanceViolation[] = [];

    // Check against absolute thresholds
    if (metrics.responseTime > thresholds.responseTime) {
      violations.push({
        metric: 'responseTime',
        threshold: thresholds.responseTime,
        actual: metrics.responseTime,
        severity: 'error',
        impact:
          'Wedding couples may experience slow page loads during critical planning',
      });
    }

    if (metrics.errorRate > thresholds.errorRate) {
      violations.push({
        metric: 'errorRate',
        threshold: thresholds.errorRate,
        actual: metrics.errorRate,
        severity: 'critical',
        impact:
          'Wedding vendors may lose access to critical booking information',
      });
    }

    if (metrics.coreWebVitals.LCP > thresholds.coreWebVitals.LCP) {
      violations.push({
        metric: 'LCP',
        threshold: thresholds.coreWebVitals.LCP,
        actual: metrics.coreWebVitals.LCP,
        severity: 'error',
        impact:
          'Photo gallery loading may frustrate photographers during portfolio updates',
      });
    }

    if (metrics.coreWebVitals.CLS > thresholds.coreWebVitals.CLS) {
      violations.push({
        metric: 'CLS',
        threshold: thresholds.coreWebVitals.CLS,
        actual: metrics.coreWebVitals.CLS,
        severity: 'warning',
        impact: 'Layout shifts may disrupt wedding timeline editing',
      });
    }

    // Check against baseline if available (regression detection)
    if (baseline) {
      const regressionThreshold = 0.2; // 20% regression threshold

      if (
        metrics.responseTime >
        baseline.metrics.responseTime * (1 + regressionThreshold)
      ) {
        violations.push({
          metric: 'responseTime_regression',
          threshold: baseline.metrics.responseTime,
          actual: metrics.responseTime,
          severity: 'error',
          impact:
            'Performance regression detected - response time significantly worse than baseline',
        });
      }
    }

    return violations;
  }

  /**
   * Determines if deployment should be blocked based on violations
   */
  private shouldBlockDeployment(
    violations: PerformanceViolation[],
    environment: string,
  ): boolean {
    const criticalViolations = violations.filter(
      (v) => v.severity === 'critical',
    );
    const errorViolations = violations.filter((v) => v.severity === 'error');

    // Production deployments: Block on any critical or more than 2 error violations
    if (environment === 'production') {
      return criticalViolations.length > 0 || errorViolations.length > 2;
    }

    // Staging deployments: Block only on critical violations
    return criticalViolations.length > 0;
  }

  /**
   * Generates performance optimization recommendations
   */
  private generateRecommendation(
    violations: PerformanceViolation[],
    metrics: PerformanceMetrics,
    baseline?: PerformanceBaseline,
  ): string {
    if (violations.length === 0) {
      return 'Performance validation passed. Deployment approved.';
    }

    const recommendations: string[] = [];

    violations.forEach((violation) => {
      switch (violation.metric) {
        case 'responseTime':
          recommendations.push(
            'Optimize database queries and consider implementing caching',
          );
          break;
        case 'errorRate':
          recommendations.push(
            'Investigate and fix application errors before deployment',
          );
          break;
        case 'LCP':
          recommendations.push(
            'Optimize images and implement lazy loading for faster content rendering',
          );
          break;
        case 'CLS':
          recommendations.push(
            'Set explicit dimensions for images and avoid dynamic content injection',
          );
          break;
        default:
          recommendations.push(`Address ${violation.metric} performance issue`);
      }
    });

    return `Performance issues detected: ${recommendations.join('; ')}`;
  }

  /**
   * Adjusts performance thresholds based on wedding context
   */
  private adjustThresholdsForContext(
    baseThresholds: PerformanceThresholds,
    context?: PerformanceTestConfig['weddingContext'],
  ): PerformanceThresholds {
    if (!context) return baseThresholds;

    const adjustedThresholds = { ...baseThresholds };

    // During peak wedding season, be more strict
    if (context.peakSeason) {
      adjustedThresholds.responseTime *= 0.8; // 20% stricter
      adjustedThresholds.coreWebVitals.LCP *= 0.8;
      adjustedThresholds.errorRate *= 0.5; // 50% stricter
    }

    // During critical periods (weekends, evenings), be even more strict
    if (context.criticalPeriod) {
      adjustedThresholds.responseTime *= 0.7; // 30% stricter
      adjustedThresholds.coreWebVitals.LCP *= 0.7;
    }

    return adjustedThresholds;
  }

  /**
   * Retrieves performance baseline for comparison
   */
  private async getBaseline(
    environment: string,
    testType: string,
  ): Promise<PerformanceBaseline | undefined> {
    const baselineId = this.generateBaselineId(environment, testType);
    const baseline = this.baselines.get(baselineId);

    if (baseline && baseline.validUntil > new Date()) {
      return baseline;
    }

    return undefined;
  }

  /**
   * Sets GitHub status check for performance validation
   */
  private async setGitHubStatusCheck(
    gitHash: string,
    status: 'success' | 'failure' | 'pending',
    description: string,
    violations?: PerformanceViolation[],
  ): Promise<void> {
    console.log(`📝 Setting GitHub status check: ${status} - ${description}`);

    // In production, this would use GitHub API
    const statusPayload = {
      state: status,
      description,
      context: 'ci/performance-validation',
      target_url: violations
        ? `${process.env.VERCEL_URL}/performance/report`
        : undefined,
    };

    // Mock GitHub API call
    console.log('GitHub Status Check:', statusPayload);
  }

  /**
   * Blocks Vercel deployment
   */
  private async blockVercelDeployment(
    buildId: string,
    violations: PerformanceViolation[],
  ): Promise<void> {
    console.log(`🛑 Blocking Vercel deployment for build ${buildId}`);

    // In production, this would use Vercel API to cancel/block deployment
    const blockPayload = {
      buildId,
      reason: 'Performance validation failed',
      violations: violations.map((v) => v.metric),
    };

    console.log('Vercel Deployment Block:', blockPayload);
  }

  /**
   * Logs deployment blocking decision for audit trail
   */
  private async logDeploymentBlock(
    buildId: string,
    violations: PerformanceViolation[],
    metrics: PerformanceMetrics,
    deploymentContext?: DeploymentContext,
  ): Promise<void> {
    const logEntry = {
      timestamp: new Date().toISOString(),
      action: 'deployment_blocked',
      buildId,
      violations,
      metrics,
      context: deploymentContext,
      reason: 'Performance validation failed',
    };

    // In production, this would write to secure audit log
    console.log('🔍 AUDIT LOG:', JSON.stringify(logEntry, null, 2));
  }

  /**
   * Sends notifications to development team
   */
  private async notifyTeam(event: string, data: any): Promise<void> {
    if (this.monitoringWebhook) {
      console.log(`📢 Notifying team: ${event}`, data);

      // In production, send to Slack/Teams/email
      const notification = {
        event,
        data,
        timestamp: new Date().toISOString(),
      };

      console.log('Team Notification:', notification);
    }
  }

  /**
   * Sends validation notification with results
   */
  private async sendValidationNotification(
    result: DeploymentValidationResult,
    deploymentContext?: DeploymentContext,
  ): Promise<void> {
    const message = result.passed
      ? `✅ Performance validation passed for build ${result.buildId}`
      : `❌ Performance validation failed for build ${result.buildId}: ${result.violations.length} violations`;

    await this.notifyTeam('performance_validation', {
      result,
      context: deploymentContext,
      message,
    });
  }

  /**
   * Calculates baseline confidence based on historical consistency
   */
  private async calculateBaselineConfidence(
    metrics: PerformanceMetrics,
    environment: string,
  ): Promise<number> {
    // In production, this would analyze historical data for consistency
    // Return a confidence score between 0 and 1
    return 0.85; // Mock confidence score
  }

  /**
   * Utility methods
   */
  private generateValidationId(): string {
    return `val_${Date.now()}_${randomBytes(4).toString('hex')}`;
  }

  private generateBaselineId(environment: string, testType: string): string {
    return `baseline_${environment}_${testType}`;
  }

  private getEmptyMetrics(): PerformanceMetrics {
    return {
      responseTime: 0,
      errorRate: 0,
      throughput: 0,
      coreWebVitals: { LCP: 0, FID: 0, CLS: 0, TTFB: 0 },
      timestamp: new Date(),
      testId: 'failed',
      environment: 'unknown',
    };
  }

  /**
   * Public methods for external integration
   */
  public async getValidationResult(
    validationId: string,
  ): Promise<DeploymentValidationResult | undefined> {
    return this.validationResults.get(validationId);
  }

  public async getBaselines(): Promise<PerformanceBaseline[]> {
    const baselines: PerformanceBaseline[] = [];
    this.baselines.forEach((baseline) => {
      baselines.push(baseline);
    });
    return baselines;
  }

  public async clearExpiredBaselines(): Promise<void> {
    const now = new Date();
    const expiredIds: string[] = [];

    this.baselines.forEach((baseline, id) => {
      if (baseline.validUntil <= now) {
        expiredIds.push(id);
      }
    });

    expiredIds.forEach((id) => {
      this.baselines.delete(id);
      console.log(`🗑️  Cleared expired baseline: ${id}`);
    });
  }
}

export default PerformanceGate;
