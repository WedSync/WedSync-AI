// /src/lib/integrations/VercelWebhookHandler.ts
import { DeploymentNotificationService } from './DeploymentNotificationService';
import { DeploymentManager } from '../services/DeploymentManager';
import { supabase } from '@/lib/supabase/client';

export interface VercelWebhookPayload {
  type: string;
  createdAt: number;
  data: {
    deployment?: {
      id: string;
      url: string;
      name: string;
      state: string;
      meta?: {
        githubCommitSha?: string;
      };
    };
    project?: {
      id: string;
      name: string;
    };
    user?: {
      id: string;
      username: string;
    };
  };
}

export class VercelWebhookHandler {
  private notificationService: DeploymentNotificationService;
  private deploymentManager: DeploymentManager;

  constructor() {
    this.notificationService = new DeploymentNotificationService();
    this.deploymentManager = new DeploymentManager();
  }

  async processWebhook(payload: VercelWebhookPayload): Promise<void> {
    try {
      await this.logWebhookEvent(payload);

      switch (payload.type) {
        case 'deployment.created':
          await this.handleDeploymentCreated(payload);
          break;
        case 'deployment.succeeded':
          await this.handleDeploymentSucceeded(payload);
          break;
        case 'deployment.failed':
        case 'deployment.error':
          await this.handleDeploymentFailed(payload);
          break;
        case 'deployment.canceled':
          await this.handleDeploymentCanceled(payload);
          break;
        default:
          console.log(`Unhandled webhook type: ${payload.type}`);
      }
    } catch (error) {
      console.error('Webhook processing failed:', error);
      throw error;
    }
  }

  private async handleDeploymentCreated(
    payload: VercelWebhookPayload,
  ): Promise<void> {
    const deployment = payload.data.deployment;
    if (!deployment) return;

    // Send low-priority notification
    await this.notificationService.sendDeploymentNotification({
      type: 'deployment.started',
      deploymentId: deployment.id,
      version: deployment.meta?.githubCommitSha?.substring(0, 8),
      url: deployment.url,
    });

    console.log(`Deployment started: ${deployment.id}`);
  }

  private async handleDeploymentSucceeded(
    payload: VercelWebhookPayload,
  ): Promise<void> {
    const deployment = payload.data.deployment;
    if (!deployment) return;

    // Wait a moment for deployment to be fully ready
    setTimeout(async () => {
      try {
        // Perform health check on new deployment
        const healthCheck = await this.deploymentManager.performHealthCheck();

        if (healthCheck.success) {
          // Send success notification
          await this.notificationService.sendDeploymentNotification({
            type: 'deployment.succeeded',
            deploymentId: deployment.id,
            version: deployment.meta?.githubCommitSha?.substring(0, 8),
            url: deployment.url,
            metadata: {
              healthCheck,
              performance: healthCheck.performance,
            },
          });

          // Trigger GitHub Actions verification workflow
          await this.triggerVerificationWorkflow(deployment);

          console.log(`Deployment succeeded and verified: ${deployment.id}`);
        } else {
          // Health check failed - treat as deployment failure
          console.error(
            'Health check failed for successful deployment:',
            healthCheck,
          );
          await this.handleDeploymentHealthFailure(deployment, healthCheck);
        }
      } catch (error) {
        console.error('Post-deployment verification failed:', error);
        await this.handleDeploymentHealthFailure(deployment, {
          success: false,
          error: error.message,
        });
      }
    }, 5000); // Wait 5 seconds for deployment to stabilize
  }

  private async handleDeploymentFailed(
    payload: VercelWebhookPayload,
  ): Promise<void> {
    const deployment = payload.data.deployment;
    if (!deployment) return;

    // Get error details from Vercel API
    let errorDetails = 'Deployment failed';
    try {
      const vercelClient = new (
        await import('../services/VercelClient')
      ).VercelClient({
        token: process.env.VERCEL_TOKEN!,
      });
      const logs = await vercelClient.getDeploymentLogs(deployment.id);
      errorDetails = logs.slice(-10).join('\n'); // Last 10 log entries
    } catch (error) {
      console.error('Failed to get deployment logs:', error);
    }

    // Send critical failure notification
    await this.notificationService.sendDeploymentNotification({
      type: 'deployment.failed',
      deploymentId: deployment.id,
      version: deployment.meta?.githubCommitSha?.substring(0, 8),
      error: errorDetails,
    });

    // Check if it's wedding hours (Saturdays 8am-10pm) for immediate escalation
    const now = new Date();
    if (now.getDay() === 6 && now.getHours() >= 8 && now.getHours() <= 22) {
      await this.escalateWeddingDayFailure(deployment, errorDetails);
    }

    console.error(`Deployment failed: ${deployment.id}`, errorDetails);
  }

  private async handleDeploymentCanceled(
    payload: VercelWebhookPayload,
  ): Promise<void> {
    const deployment = payload.data.deployment;
    if (!deployment) return;

    console.log(`Deployment canceled: ${deployment.id}`);
  }

  private async handleDeploymentHealthFailure(
    deployment: any,
    healthCheck: any,
  ): Promise<void> {
    // Attempt automatic rollback for health check failures
    try {
      const currentDeployment =
        await this.deploymentManager.getCurrentDeployment();
      if (currentDeployment && currentDeployment.id === deployment.id) {
        console.log(
          'Attempting automatic rollback due to health check failure...',
        );

        // This would need the previous deployment ID - simplified for this example
        const rollbackSuccess = await this.deploymentManager.rollbackDeployment(
          'previous-deployment-id', // Would get this from Vercel API
          'system',
          'Automatic rollback due to health check failure',
        );

        if (rollbackSuccess) {
          await this.notificationService.sendDeploymentNotification({
            type: 'deployment.rollback',
            deploymentId: deployment.id,
            metadata: {
              reason: 'Health check failure',
              automatic: true,
              healthCheck,
            },
          });
        }
      }
    } catch (error) {
      console.error('Automatic rollback failed:', error);

      // Send critical alert about rollback failure
      await this.notificationService.sendDeploymentNotification({
        type: 'deployment.failed',
        deploymentId: deployment.id,
        error: `Health check failed AND automatic rollback failed: ${error.message}`,
      });
    }
  }

  private async escalateWeddingDayFailure(
    deployment: any,
    error: string,
  ): Promise<void> {
    // Additional escalation for Saturday failures
    console.log('🚨 WEDDING DAY DEPLOYMENT FAILURE - ESCALATING');

    // Send immediate SMS to all admins (if configured)
    // Send additional Slack alerts with @channel
    // Log to high-priority monitoring systems

    await supabase.from('critical_alerts').insert({
      alert_type: 'WEDDING_DAY_DEPLOYMENT_FAILURE',
      deployment_id: deployment.id,
      error_details: error,
      escalated_at: new Date().toISOString(),
      severity: 'CRITICAL',
    });
  }

  private async triggerVerificationWorkflow(deployment: any): Promise<void> {
    // Trigger GitHub Actions verification workflow using repository dispatch
    try {
      // GitHub integration disabled - install @octokit/rest if needed
      console.log('GitHub integration skipped - @octokit/rest not installed');

      // Simulate workflow trigger without actual API call
      console.log('Would trigger workflow for deployment:', deployment.id);
      console.log('Deployment URL:', deployment.url);
      console.log(
        'Version:',
        deployment.meta?.githubCommitSha?.substring(0, 8),
      );

      console.log(
        'Verification workflow simulation completed for deployment:',
        deployment.id,
      );
    } catch (error) {
      console.error('Failed to trigger verification workflow:', error);
    }
  }

  private async logWebhookEvent(payload: VercelWebhookPayload): Promise<void> {
    try {
      await supabase.from('vercel_webhook_events').insert({
        event_type: payload.type,
        deployment_id: payload.data.deployment?.id,
        payload: payload,
        processed_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to log webhook event:', error);
    }
  }
}
