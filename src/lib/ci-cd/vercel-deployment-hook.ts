import {
  PerformanceGate,
  PerformanceTestConfig,
  PerformanceMetrics,
  DeploymentValidationResult,
} from './performance-gate';

export interface VercelDeployment {
  id: string;
  url: string;
  projectId: string;
  environment: 'production' | 'preview' | 'development';
  state: 'BUILDING' | 'READY' | 'ERROR' | 'CANCELED';
  creator: {
    uid: string;
    username: string;
  };
  createdAt: number;
  target?: string;
  alias?: string[];
  meta?: {
    githubCommitSha?: string;
    githubCommitMessage?: string;
    githubCommitAuthorName?: string;
    githubCommitRef?: string;
  };
}

export interface DeploymentHookResult {
  allowed: boolean;
  deploymentId: string;
  reason?: string;
  performanceResults?: PerformanceMetrics;
  validationId?: string;
  blockingViolations?: string[];
}

export interface VercelClient {
  token: string;
  teamId?: string;
  baseUrl: string;
}

/**
 * Vercel deployment hook integration handler
 * Manages pre/post deployment performance validation
 */
export class VercelDeploymentHook {
  private performanceGate: PerformanceGate;
  private vercelClient: VercelClient;

  constructor(
    performanceGate: PerformanceGate,
    vercelToken: string,
    teamId?: string,
  ) {
    this.performanceGate = performanceGate;
    this.vercelClient = {
      token: vercelToken,
      teamId,
      baseUrl: 'https://api.vercel.com',
    };
  }

  /**
   * Handles pre-deployment performance validation
   * Executes performance tests before Vercel deployment
   * Blocks deployment if performance criteria not met
   */
  async handlePreDeployment(
    deploymentId: string,
    projectId: string,
    environment: string,
    deployment?: VercelDeployment,
  ): Promise<DeploymentHookResult> {
    console.log(
      `🚀 Pre-deployment validation for ${deploymentId} in ${environment}`,
    );

    try {
      // 1. Determine if this deployment requires performance validation
      if (!this.shouldValidateDeployment(environment, deployment)) {
        return {
          allowed: true,
          deploymentId,
          reason: 'Performance validation skipped for this deployment type',
        };
      }

      // 2. Get deployment details from Vercel
      const deploymentDetails = await this.getDeploymentDetails(deploymentId);

      // 3. Configure performance test based on deployment context
      const testConfig = this.createTestConfig(environment, deploymentDetails);

      // 4. Execute performance validation
      const validationResult = await this.performanceGate.validateDeployment(
        deploymentId,
        environment as 'staging' | 'production',
        testConfig,
        {
          buildId: deploymentId,
          gitHash: deployment?.meta?.githubCommitSha || 'unknown',
          branch: deployment?.meta?.githubCommitRef || 'unknown',
          environment,
          triggeredBy: deployment?.creator?.username || 'unknown',
          timestamp: new Date(),
          criticalChanges: this.hasCriticalChanges(deployment),
        },
      );

      // 5. Determine deployment blocking based on results
      if (!validationResult.passed) {
        // Block deployment through Vercel API
        await this.blockVercelDeployment(deploymentId, validationResult);

        return {
          allowed: false,
          deploymentId,
          reason: validationResult.recommendation,
          validationId: validationResult.validationId,
          blockingViolations: validationResult.violations.map(
            (v) =>
              `${v.metric}: ${v.actual} exceeds ${v.threshold} (${v.severity})`,
          ),
        };
      }

      console.log(`✅ Pre-deployment validation passed for ${deploymentId}`);
      return {
        allowed: true,
        deploymentId,
        performanceResults: validationResult.metrics,
        validationId: validationResult.validationId,
      };
    } catch (error) {
      console.error(`❌ Pre-deployment validation failed:`, error);

      // In case of validation error, block deployment to be safe
      return {
        allowed: false,
        deploymentId,
        reason: `Performance validation error: ${error.message}`,
        blockingViolations: ['validation_execution_failed'],
      };
    }
  }

  /**
   * Handles post-deployment performance monitoring
   * Monitors performance immediately after deployment
   * Triggers rollback if performance degrades
   */
  async handlePostDeployment(
    deploymentId: string,
    deploymentUrl: string,
    environment?: string,
  ): Promise<void> {
    console.log(
      `📊 Post-deployment monitoring for ${deploymentId} at ${deploymentUrl}`,
    );

    try {
      // 1. Wait for deployment to be fully ready
      await this.waitForDeploymentReady(deploymentId);

      // 2. Configure post-deployment monitoring
      const monitoringConfig = this.createMonitoringConfig(
        deploymentUrl,
        environment,
      );

      // 3. Execute immediate performance check
      const validationResult = await this.performanceGate.validateDeployment(
        deploymentId,
        (environment || 'production') as 'staging' | 'production',
        monitoringConfig,
      );

      // 4. If post-deployment check fails, trigger rollback
      if (!validationResult.passed && environment === 'production') {
        console.log(`🚨 Post-deployment check failed, triggering rollback`);
        await this.rollbackDeployment(
          deploymentId,
          validationResult.recommendation,
        );
      }

      // 5. Schedule continuous monitoring
      await this.scheduleContinuousMonitoring(
        deploymentId,
        deploymentUrl,
        environment,
      );

      console.log(
        `✅ Post-deployment monitoring setup complete for ${deploymentId}`,
      );
    } catch (error) {
      console.error(`❌ Post-deployment handling failed:`, error);

      // If monitoring fails on production, consider emergency rollback
      if (environment === 'production') {
        console.log(
          `🚨 Emergency rollback triggered due to monitoring failure`,
        );
        await this.emergencyRollback(deploymentId, error.message);
      }
    }
  }

  /**
   * Initiates automatic deployment rollback
   * Triggers when performance degrades post-deployment
   */
  private async rollbackDeployment(
    deploymentId: string,
    reason: string,
  ): Promise<void> {
    console.log(
      `🔄 Initiating rollback for deployment ${deploymentId}: ${reason}`,
    );

    try {
      // 1. Get previous successful deployment
      const previousDeployment =
        await this.getPreviousSuccessfulDeployment(deploymentId);

      if (!previousDeployment) {
        throw new Error('No previous deployment found for rollback');
      }

      // 2. Promote previous deployment
      await this.promoteDeployment(previousDeployment.id);

      // 3. Cancel current deployment
      await this.cancelDeployment(deploymentId);

      // 4. Notify team of rollback
      await this.notifyRollback(deploymentId, previousDeployment.id, reason);

      console.log(
        `✅ Rollback completed: ${deploymentId} → ${previousDeployment.id}`,
      );
    } catch (error) {
      console.error(`❌ Rollback failed:`, error);

      // Emergency escalation
      await this.escalateRollbackFailure(deploymentId, error.message);
      throw error;
    }
  }

  /**
   * Emergency rollback procedure for critical failures
   */
  private async emergencyRollback(
    deploymentId: string,
    reason: string,
  ): Promise<void> {
    console.log(`🚨 EMERGENCY ROLLBACK: ${deploymentId} - ${reason}`);

    try {
      // Immediate rollback without waiting
      await this.rollbackDeployment(deploymentId, `EMERGENCY: ${reason}`);

      // Send high-priority alert
      await this.sendEmergencyAlert(deploymentId, reason);
    } catch (error) {
      // If emergency rollback fails, escalate to on-call team
      await this.escalateToOnCall(deploymentId, reason, error.message);
    }
  }

  /**
   * Determines if deployment requires performance validation
   */
  private shouldValidateDeployment(
    environment: string,
    deployment?: VercelDeployment,
  ): boolean {
    // Always validate production deployments
    if (environment === 'production') return true;

    // Validate preview deployments from main/master branch
    if (environment === 'preview' && deployment?.meta?.githubCommitRef) {
      const branch = deployment.meta.githubCommitRef;
      return ['main', 'master', 'develop'].includes(branch);
    }

    // Skip development deployments
    return false;
  }

  /**
   * Creates performance test configuration based on deployment context
   */
  private createTestConfig(
    environment: string,
    deployment?: VercelDeployment,
  ): PerformanceTestConfig {
    const isProduction = environment === 'production';
    const isPeakTime = this.isPeakWeddingTime();

    return {
      testType: isProduction ? 'load' : 'stress',
      duration: isProduction ? 300 : 180, // 5 minutes for prod, 3 for staging
      userCount: isProduction ? 100 : 50,
      targetUrl: deployment?.url || `https://wedsync.com`,
      environment: environment as 'staging' | 'production',
      thresholds: {
        responseTime: isProduction ? 2000 : 3000,
        errorRate: isProduction ? 0.01 : 0.02,
        throughput: isProduction ? 100 : 50,
        coreWebVitals: {
          LCP: isProduction ? 2500 : 3500,
          FID: isProduction ? 100 : 150,
          CLS: isProduction ? 0.1 : 0.15,
          TTFB: isProduction ? 800 : 1200,
        },
        weddingSpecific: {
          guestListLoad: isProduction ? 2000 : 3000,
          photoGalleryRender: isProduction ? 1500 : 2500,
          timelineInteraction: isProduction ? 300 : 500,
          vendorSearchResponse: isProduction ? 750 : 1000,
        },
      },
      weddingContext: {
        peakSeason: isPeakTime,
        criticalPeriod: this.isCriticalPeriod(),
        userSegment: this.detectUserSegment(deployment),
      },
    };
  }

  /**
   * Creates monitoring configuration for post-deployment
   */
  private createMonitoringConfig(
    deploymentUrl: string,
    environment?: string,
  ): PerformanceTestConfig {
    return {
      testType: 'load',
      duration: 60, // Quick 1-minute validation
      userCount: 10,
      targetUrl: deploymentUrl,
      environment: (environment || 'production') as 'staging' | 'production',
      thresholds: {
        responseTime: 3000, // More lenient for immediate post-deployment
        errorRate: 0.05,
        throughput: 20,
        coreWebVitals: {
          LCP: 4000,
          FID: 200,
          CLS: 0.2,
          TTFB: 1500,
        },
      },
    };
  }

  /**
   * Vercel API integration methods
   */

  private async getDeploymentDetails(
    deploymentId: string,
  ): Promise<VercelDeployment | undefined> {
    try {
      const response = await fetch(
        `${this.vercelClient.baseUrl}/v13/deployments/${deploymentId}`,
        {
          headers: {
            Authorization: `Bearer ${this.vercelClient.token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (response.ok) {
        return await response.json();
      }

      console.log(`⚠️ Could not get deployment details: ${response.status}`);
      return undefined;
    } catch (error) {
      console.error(`❌ Failed to get deployment details:`, error);
      return undefined;
    }
  }

  private async blockVercelDeployment(
    deploymentId: string,
    validationResult: DeploymentValidationResult,
  ): Promise<void> {
    try {
      // Cancel deployment via Vercel API
      const response = await fetch(
        `${this.vercelClient.baseUrl}/v12/deployments/${deploymentId}/cancel`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${this.vercelClient.token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to cancel deployment: ${response.status}`);
      }

      console.log(`🛑 Vercel deployment blocked: ${deploymentId}`);
    } catch (error) {
      console.error(`❌ Failed to block Vercel deployment:`, error);
      throw error;
    }
  }

  private async waitForDeploymentReady(
    deploymentId: string,
    timeoutMs: number = 300000,
  ): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const deployment = await this.getDeploymentDetails(deploymentId);

      if (deployment?.state === 'READY') {
        console.log(`✅ Deployment ready: ${deploymentId}`);
        return;
      }

      if (deployment?.state === 'ERROR' || deployment?.state === 'CANCELED') {
        throw new Error(`Deployment failed: ${deployment.state}`);
      }

      // Wait 10 seconds before checking again
      await new Promise((resolve) => setTimeout(resolve, 10000));
    }

    throw new Error(`Deployment readiness timeout: ${deploymentId}`);
  }

  private async getPreviousSuccessfulDeployment(
    currentDeploymentId: string,
  ): Promise<VercelDeployment | undefined> {
    try {
      // Get deployment list and find the previous successful one
      const response = await fetch(
        `${this.vercelClient.baseUrl}/v6/deployments?limit=10`,
        {
          headers: {
            Authorization: `Bearer ${this.vercelClient.token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to get deployments: ${response.status}`);
      }

      const data = await response.json();
      const deployments = data.deployments || [];

      // Find the last successful deployment before the current one
      for (const deployment of deployments) {
        if (
          deployment.id !== currentDeploymentId &&
          deployment.state === 'READY'
        ) {
          return deployment;
        }
      }

      return undefined;
    } catch (error) {
      console.error(`❌ Failed to get previous deployment:`, error);
      return undefined;
    }
  }

  private async promoteDeployment(deploymentId: string): Promise<void> {
    try {
      const response = await fetch(
        `${this.vercelClient.baseUrl}/v13/deployments/${deploymentId}/promote`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.vercelClient.token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to promote deployment: ${response.status}`);
      }

      console.log(`📈 Deployment promoted: ${deploymentId}`);
    } catch (error) {
      console.error(`❌ Failed to promote deployment:`, error);
      throw error;
    }
  }

  private async cancelDeployment(deploymentId: string): Promise<void> {
    await this.blockVercelDeployment(deploymentId, {} as any);
  }

  /**
   * Notification and alerting methods
   */

  private async notifyRollback(
    failedDeploymentId: string,
    rollbackDeploymentId: string,
    reason: string,
  ): Promise<void> {
    const message = {
      event: 'deployment_rollback',
      failedDeployment: failedDeploymentId,
      rollbackDeployment: rollbackDeploymentId,
      reason,
      timestamp: new Date().toISOString(),
      severity: 'high',
    };

    console.log('📢 ROLLBACK NOTIFICATION:', message);

    // In production, send to Slack/Teams/PagerDuty
  }

  private async sendEmergencyAlert(
    deploymentId: string,
    reason: string,
  ): Promise<void> {
    const alert = {
      event: 'emergency_rollback',
      deployment: deploymentId,
      reason,
      timestamp: new Date().toISOString(),
      severity: 'critical',
      action: 'immediate_attention_required',
    };

    console.log('🚨 EMERGENCY ALERT:', alert);

    // In production, trigger PagerDuty/on-call system
  }

  private async escalateRollbackFailure(
    deploymentId: string,
    error: string,
  ): Promise<void> {
    const escalation = {
      event: 'rollback_failure',
      deployment: deploymentId,
      error,
      timestamp: new Date().toISOString(),
      severity: 'critical',
      action: 'manual_intervention_required',
    };

    console.log('🆘 ROLLBACK FAILURE ESCALATION:', escalation);
  }

  private async escalateToOnCall(
    deploymentId: string,
    reason: string,
    error: string,
  ): Promise<void> {
    const escalation = {
      event: 'on_call_escalation',
      deployment: deploymentId,
      reason,
      error,
      timestamp: new Date().toISOString(),
      severity: 'critical',
      action: 'on_call_team_activation',
    };

    console.log('📞 ON-CALL ESCALATION:', escalation);
  }

  private async scheduleContinuousMonitoring(
    deploymentId: string,
    deploymentUrl: string,
    environment?: string,
  ): Promise<void> {
    console.log(`📊 Scheduling continuous monitoring for ${deploymentId}`);

    // In production, this would set up ongoing performance monitoring
    // Could integrate with monitoring services like DataDog, New Relic, etc.
  }

  /**
   * Utility methods
   */

  private isPeakWeddingTime(): boolean {
    const now = new Date();
    const month = now.getMonth() + 1; // 1-12
    const hour = now.getHours();
    const dayOfWeek = now.getDay(); // 0 = Sunday

    // Peak wedding season: May through October
    const isPeakSeason = month >= 5 && month <= 10;

    // Peak hours: 6 PM - 10 PM when couples are most active
    const isPeakHours = hour >= 18 && hour <= 22;

    // Weekends when wedding planning is most active
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    return isPeakSeason || isPeakHours || isWeekend;
  }

  private isCriticalPeriod(): boolean {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();

    // Friday-Sunday evenings are critical for wedding planning
    return (dayOfWeek >= 5 || dayOfWeek === 0) && hour >= 17 && hour <= 23;
  }

  private detectUserSegment(
    deployment?: VercelDeployment,
  ): 'photographer' | 'couple' | 'vendor' | undefined {
    // In production, this would analyze deployment changes to determine primary user impact
    // For now, return undefined (general deployment)
    return undefined;
  }

  private hasCriticalChanges(deployment?: VercelDeployment): boolean {
    if (!deployment?.meta?.githubCommitMessage) return false;

    const criticalKeywords = [
      'database',
      'migration',
      'auth',
      'payment',
      'security',
    ];
    const message = deployment.meta.githubCommitMessage.toLowerCase();

    return criticalKeywords.some((keyword) => message.includes(keyword));
  }
}

export default VercelDeploymentHook;
