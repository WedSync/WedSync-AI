# WS-255 TEAM C PROMPT: Vercel Deployment - Integration & CI/CD Pipeline

## 🎯 TEAM C OBJECTIVE
Build the complete CI/CD pipeline integration with GitHub Actions, Vercel webhooks, notification systems, and deployment automation. Focus on seamless integration between development workflow and production deployments with comprehensive monitoring and rollback capabilities.

## 📚 CONTEXT - CRITICAL INTEGRATION SCENARIO
**Real Wedding Crisis:** A photographer uploads 500+ photos during reception. The upload service breaks due to a dependency conflict in the latest deployment. GitHub Actions must automatically detect the failure, trigger health checks, and execute rollback within 2 minutes while sending alerts to all admins. Your integration systems must orchestrate this flawlessly.

## 🔐 EVIDENCE OF REALITY REQUIREMENTS

### 1. FILE EXISTENCE PROOF
Before claiming completion, provide evidence these EXACT files exist:
```bash
# Paste the actual terminal output of these commands:
ls -la /.github/workflows/vercel-deploy.yml
ls -la /.github/workflows/deployment-verification.yml
ls -la /src/lib/integrations/DeploymentNotificationService.ts
ls -la /src/lib/integrations/GitHubActionsClient.ts
ls -la /src/lib/integrations/VercelWebhookHandler.ts
ls -la /vercel.json
```

### 2. GITHUB ACTIONS FUNCTIONALITY PROOF
```bash
# Must show workflow runs successfully:
gh workflow list
gh run list --limit 5
# Should show recent deployment workflows with status
```

### 3. WEBHOOK ENDPOINT PROOF
```bash
# Must respond to Vercel webhooks:
curl -X POST http://localhost:3000/api/webhooks/vercel \
  -H "Content-Type: application/json" \
  -H "X-Vercel-Signature: test_signature" \
  -d '{"type": "deployment.succeeded", "data": {"deploymentId": "test123"}}'
```

## 🛡️ SECURITY PATTERNS - WEBHOOK VERIFICATION

### Webhook Security Implementation
```typescript
// MANDATORY: Use this exact pattern for webhook verification
import { createHmac } from 'crypto';
import { withSecureValidation } from '@/lib/security/secure-validation';

const VercelWebhookHandler = withSecureValidation(
  async (request: Request) => {
    const body = await request.text();
    const signature = request.headers.get('X-Vercel-Signature');
    
    // 1. Verify webhook signature
    if (!signature) {
      throw new SecurityError('WEBHOOK_SIGNATURE_MISSING');
    }
    
    const expectedSignature = createHmac('sha1', process.env.VERCEL_WEBHOOK_SECRET!)
      .update(body)
      .digest('hex');
    
    if (`sha1=${expectedSignature}` !== signature) {
      throw new SecurityError('WEBHOOK_SIGNATURE_INVALID', {
        expected: 'sha1=' + expectedSignature.substring(0, 8) + '...',
        received: signature.substring(0, 16) + '...'
      });
    }
    
    // 2. Parse and validate webhook payload
    const payload = JSON.parse(body);
    
    if (!payload.type || !payload.data) {
      throw new SecurityError('WEBHOOK_PAYLOAD_INVALID', {
        type: payload.type || 'missing',
        hasData: !!payload.data
      });
    }
    
    // 3. Rate limiting for webhooks
    const webhookId = payload.data.deploymentId || 'unknown';
    await enforceRateLimit(`webhook:${webhookId}`, 'vercel_webhook', {
      requests: 10,
      windowMs: 60000 // 10 webhooks per minute per deployment
    });
    
    return await processVercelWebhook(payload);
  },
  {
    rateLimits: { 
      vercel_webhook: { requests: 50, windowMs: 60000 }
    },
    auditLog: {
      action: 'VERCEL_WEBHOOK',
      riskLevel: 'MEDIUM'
    }
  }
);
```

## 🔄 CI/CD PIPELINE IMPLEMENTATION

### GitHub Actions: Main Deployment Workflow
```yaml
# /.github/workflows/vercel-deploy.yml
name: Vercel Deployment Pipeline

on:
  push:
    branches: [main, staging]
  pull_request:
    branches: [main]

env:
  VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
  VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

jobs:
  # Pre-deployment validation
  validate:
    runs-on: ubuntu-latest
    name: Pre-deployment Validation
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run TypeScript checks
        run: npx tsc --noEmit

      - name: Run build verification
        run: node scripts/build-check.js

      - name: Run security audit
        run: npm audit --audit-level high

      - name: Run tests
        run: npm run test:ci
        env:
          NODE_ENV: test

  # Production deployment
  deploy-production:
    needs: validate
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    name: Deploy to Production
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Install Vercel CLI
        run: npm install --global vercel@latest

      - name: Pull Vercel Environment Information
        run: vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}

      - name: Build Project Artifacts
        run: vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}

      - name: Deploy Project Artifacts to Vercel
        id: deploy
        run: |
          deployment_url=$(vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }})
          echo "deployment_url=$deployment_url" >> $GITHUB_OUTPUT
          echo "deployment_id=$(echo $deployment_url | sed 's/.*-\([a-z0-9]*\)\.vercel\.app/\1/')" >> $GITHUB_OUTPUT

      - name: Wait for deployment to be ready
        run: |
          max_attempts=60
          attempt=1
          while [ $attempt -le $max_attempts ]; do
            if curl -s -o /dev/null -w "%{http_code}" "${{ steps.deploy.outputs.deployment_url }}" | grep -q "200"; then
              echo "✅ Deployment is ready!"
              break
            fi
            echo "⏳ Waiting for deployment... (attempt $attempt/$max_attempts)"
            sleep 5
            attempt=$((attempt + 1))
          done
          
          if [ $attempt -gt $max_attempts ]; then
            echo "❌ Deployment failed to become ready within timeout"
            exit 1
          fi

      - name: Run post-deployment health checks
        run: |
          health_url="${{ steps.deploy.outputs.deployment_url }}/api/health/deployment"
          response=$(curl -s "$health_url" | jq -r '.success')
          
          if [ "$response" = "true" ]; then
            echo "✅ Health check passed"
          else
            echo "❌ Health check failed"
            curl -s "$health_url" | jq .
            exit 1
          fi

      - name: Notify deployment success
        if: success()
        uses: ./.github/actions/notify-deployment
        with:
          status: 'success'
          deployment_url: ${{ steps.deploy.outputs.deployment_url }}
          deployment_id: ${{ steps.deploy.outputs.deployment_id }}

      - name: Rollback on failure
        if: failure()
        run: |
          echo "🚨 Deployment failed, initiating rollback..."
          # Get previous successful deployment
          previous_deployment=$(vercel ls --token=${{ secrets.VERCEL_TOKEN }} | grep "READY" | head -n 2 | tail -n 1 | awk '{print $1}')
          
          if [ -n "$previous_deployment" ]; then
            echo "↩️ Rolling back to: $previous_deployment"
            vercel promote "$previous_deployment" --token=${{ secrets.VERCEL_TOKEN }}
            
            # Notify about rollback
            curl -X POST "${{ secrets.SLACK_WEBHOOK_URL }}" \
              -H 'Content-Type: application/json' \
              -d '{
                "text": "🚨 Production deployment failed and rolled back automatically",
                "attachments": [{
                  "color": "danger",
                  "fields": [
                    {"title": "Repository", "value": "${{ github.repository }}", "short": true},
                    {"title": "Branch", "value": "${{ github.ref_name }}", "short": true},
                    {"title": "Commit", "value": "${{ github.sha }}", "short": true},
                    {"title": "Rolled back to", "value": "'$previous_deployment'", "short": true}
                  ]
                }]
              }'
          else
            echo "❌ No previous deployment found for rollback"
            exit 1
          fi

  # Preview deployment for pull requests
  deploy-preview:
    needs: validate
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    name: Deploy Preview
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Install Vercel CLI
        run: npm install --global vercel@latest

      - name: Pull Vercel Environment Information
        run: vercel pull --yes --environment=preview --token=${{ secrets.VERCEL_TOKEN }}

      - name: Build Project Artifacts
        run: vercel build --token=${{ secrets.VERCEL_TOKEN }}

      - name: Deploy Project Artifacts to Vercel
        id: deploy-preview
        run: |
          deployment_url=$(vercel deploy --prebuilt --token=${{ secrets.VERCEL_TOKEN }})
          echo "deployment_url=$deployment_url" >> $GITHUB_OUTPUT

      - name: Comment PR with preview link
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `
              ## 🚀 Preview Deployment Ready!
              
              **Preview URL:** ${{ steps.deploy-preview.outputs.deployment_url }}
              
              ### What to test:
              - [ ] All pages load correctly
              - [ ] Authentication flow works
              - [ ] Forms submit successfully
              - [ ] Mobile responsive design
              - [ ] Wedding day critical paths
              
              This preview will be automatically deleted when the PR is merged.
              `
            })

  # Post-deployment monitoring
  monitor-deployment:
    needs: deploy-production
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    name: Monitor Deployment
    steps:
      - name: Monitor deployment health
        run: |
          echo "🔍 Monitoring deployment health for 5 minutes..."
          
          for i in {1..10}; do
            echo "Health check $i/10..."
            
            response=$(curl -s "https://wedsync.com/api/health/deployment" | jq -r '.success')
            
            if [ "$response" = "true" ]; then
              echo "✅ Health check $i passed"
            else
              echo "❌ Health check $i failed"
              
              # If health check fails 3 times in a row, trigger alert
              if [ $i -ge 3 ]; then
                curl -X POST "${{ secrets.SLACK_WEBHOOK_URL }}" \
                  -H 'Content-Type: application/json' \
                  -d '{
                    "text": "🚨 Production deployment health check failing!",
                    "attachments": [{
                      "color": "danger",
                      "text": "Multiple health checks failed after deployment. Manual intervention required."
                    }]
                  }'
                exit 1
              fi
            fi
            
            sleep 30
          done
          
          echo "✅ Deployment monitoring completed successfully"
```

### GitHub Actions: Deployment Verification Workflow
```yaml
# /.github/workflows/deployment-verification.yml
name: Deployment Verification

on:
  repository_dispatch:
    types: [deployment_ready]

jobs:
  verify-deployment:
    runs-on: ubuntu-latest
    name: Verify Production Deployment
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install

      - name: Run E2E tests against production
        run: npm run test:e2e:production
        env:
          TEST_BASE_URL: https://wedsync.com
          
      - name: Run performance tests
        run: npm run test:performance
        env:
          TEST_URL: https://wedsync.com

      - name: Run accessibility tests
        run: npm run test:a11y
        env:
          TEST_URL: https://wedsync.com

      - name: Report verification results
        if: always()
        uses: ./.github/actions/report-verification
        with:
          status: ${{ job.status }}
          test_results: ${{ steps.tests.outputs.results }}
```

## 📧 DEPLOYMENT NOTIFICATION SERVICE

### Comprehensive Notification System
```typescript
// /src/lib/integrations/DeploymentNotificationService.ts
import { Resend } from 'resend';
import { supabase } from '@/lib/supabase/client';

export interface DeploymentEvent {
  type: 'deployment.started' | 'deployment.succeeded' | 'deployment.failed' | 'deployment.rollback';
  deploymentId: string;
  version?: string;
  url?: string;
  error?: string;
  metadata?: any;
}

export interface NotificationChannel {
  type: 'email' | 'slack' | 'sms' | 'webhook';
  destination: string;
  enabled: boolean;
  urgency: 'low' | 'medium' | 'high' | 'critical';
}

export class DeploymentNotificationService {
  private resend: Resend;
  private slackWebhookUrl?: string;

  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY);
    this.slackWebhookUrl = process.env.SLACK_DEPLOYMENT_WEBHOOK_URL;
  }

  async sendDeploymentNotification(event: DeploymentEvent): Promise<void> {
    try {
      // Get notification preferences for admins
      const { data: adminUsers } = await supabase
        .from('user_profiles')
        .select('id, email, notification_preferences')
        .eq('role', 'admin');

      if (!adminUsers || adminUsers.length === 0) {
        console.warn('No admin users found for deployment notifications');
        return;
      }

      // Determine urgency based on event type
      const urgency = this.getEventUrgency(event.type);
      
      // Send notifications through all enabled channels
      const notifications = await Promise.allSettled([
        this.sendEmailNotifications(event, adminUsers, urgency),
        this.sendSlackNotification(event, urgency),
        this.sendWebhookNotifications(event, urgency)
      ]);

      // Log notification results
      await this.logNotificationResults(event, notifications);

    } catch (error) {
      console.error('Failed to send deployment notifications:', error);
      // Don't throw - notification failures shouldn't break deployments
    }
  }

  private async sendEmailNotifications(
    event: DeploymentEvent, 
    adminUsers: any[], 
    urgency: string
  ): Promise<void> {
    const emailPromises = adminUsers
      .filter(user => user.notification_preferences?.deployment_emails !== false)
      .map(async (user) => {
        const emailTemplate = this.getEmailTemplate(event, urgency);
        
        return this.resend.emails.send({
          from: 'deployments@wedsync.com',
          to: user.email,
          subject: emailTemplate.subject,
          html: emailTemplate.html
        });
      });

    await Promise.allSettled(emailPromises);
  }

  private async sendSlackNotification(event: DeploymentEvent, urgency: string): Promise<void> {
    if (!this.slackWebhookUrl) return;

    const slackMessage = this.getSlackMessage(event, urgency);

    await fetch(this.slackWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(slackMessage)
    });
  }

  private async sendWebhookNotifications(event: DeploymentEvent, urgency: string): Promise<void> {
    // Get custom webhook endpoints from database
    const { data: webhooks } = await supabase
      .from('deployment_webhooks')
      .select('url, secret, enabled')
      .eq('enabled', true);

    if (!webhooks || webhooks.length === 0) return;

    const webhookPromises = webhooks.map(async (webhook) => {
      try {
        const payload = {
          event: event.type,
          deployment: {
            id: event.deploymentId,
            version: event.version,
            url: event.url,
            timestamp: new Date().toISOString()
          },
          urgency
        };

        const signature = this.generateWebhookSignature(JSON.stringify(payload), webhook.secret);

        await fetch(webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-WedSync-Signature': signature,
            'X-WedSync-Event': event.type
          },
          body: JSON.stringify(payload)
        });
      } catch (error) {
        console.error(`Webhook notification failed for ${webhook.url}:`, error);
      }
    });

    await Promise.allSettled(webhookPromises);
  }

  private getEventUrgency(eventType: string): 'low' | 'medium' | 'high' | 'critical' {
    switch (eventType) {
      case 'deployment.started': return 'low';
      case 'deployment.succeeded': return 'medium';
      case 'deployment.failed': return 'critical';
      case 'deployment.rollback': return 'critical';
      default: return 'medium';
    }
  }

  private getEmailTemplate(event: DeploymentEvent, urgency: string) {
    const isSuccess = event.type === 'deployment.succeeded';
    const isFailure = event.type === 'deployment.failed';
    const isRollback = event.type === 'deployment.rollback';

    let subject = `WedSync Deployment: ${event.type.split('.')[1].toUpperCase()}`;
    let urgencyLabel = '';
    let color = '#2563eb'; // blue

    if (urgency === 'critical') {
      urgencyLabel = '🚨 CRITICAL: ';
      color = '#dc2626'; // red
    } else if (urgency === 'high') {
      urgencyLabel = '⚠️ HIGH: ';
      color = '#f59e0b'; // amber
    }

    if (isSuccess) {
      subject = `✅ ${subject}`;
      color = '#16a34a'; // green
    } else if (isFailure || isRollback) {
      subject = `❌ ${urgencyLabel}${subject}`;
    }

    const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>WedSync Deployment Notification</title>
      </head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, ${color}, ${color}dd); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">WedSync Deployment Update</h1>
          <p style="margin: 5px 0 0 0; opacity: 0.9;">${new Date().toLocaleString()}</p>
        </div>
        
        <div style="border: 1px solid #e5e7eb; border-top: none; padding: 20px; border-radius: 0 0 8px 8px;">
          <h2 style="color: ${color}; margin-top: 0;">${event.type.split('.')[1].toUpperCase()}</h2>
          
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;"><strong>Deployment ID:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-family: monospace;">${event.deploymentId}</td>
            </tr>
            ${event.version ? `
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;"><strong>Version:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-family: monospace;">${event.version}</td>
            </tr>
            ` : ''}
            ${event.url ? `
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;"><strong>URL:</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;">
                <a href="${event.url}" style="color: ${color};">${event.url}</a>
              </td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding: 8px 0;"><strong>Urgency:</strong></td>
              <td style="padding: 8px 0;">
                <span style="background: ${color}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">
                  ${urgency.toUpperCase()}
                </span>
              </td>
            </tr>
          </table>

          ${event.error ? `
          <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 12px; margin-top: 16px;">
            <h3 style="color: #dc2626; margin: 0 0 8px 0;">Error Details:</h3>
            <pre style="background: #fff; border: 1px solid #e5e7eb; border-radius: 4px; padding: 8px; overflow-x: auto; font-size: 12px;">${event.error}</pre>
          </div>
          ` : ''}

          ${isFailure || isRollback ? `
          <div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 6px; padding: 12px; margin-top: 16px;">
            <h3 style="color: #92400e; margin: 0 0 8px 0;">⚠️ Wedding Day Impact</h3>
            <p style="margin: 0; color: #92400e;">
              ${isRollback ? 
                'A rollback was executed. Users may have experienced a brief interruption (10-30 seconds).' :
                'This deployment failure may affect couples and vendors currently using the system.'
              }
            </p>
          </div>
          ` : ''}

          <div style="margin-top: 24px; padding: 16px; background: #f9fafb; border-radius: 6px;">
            <h3 style="margin: 0 0 8px 0; color: #374151;">Next Steps:</h3>
            <ul style="margin: 0; padding-left: 20px; color: #6b7280;">
              ${isSuccess ? `
              <li>Monitor system health for the next 30 minutes</li>
              <li>Review deployment metrics in admin dashboard</li>
              <li>Verify all critical wedding day functions work correctly</li>
              ` : isFailure ? `
              <li><strong>Check admin dashboard for health status</strong></li>
              <li><strong>Review error logs and fix underlying issues</strong></li>
              <li><strong>Consider manual rollback if automatic rollback failed</strong></li>
              ` : `
              <li><strong>Verify rollback completed successfully</strong></li>
              <li><strong>Investigate root cause of original failure</strong></li>
              <li><strong>Plan fix and re-deployment strategy</strong></li>
              `}
            </ul>
          </div>

          <div style="margin-top: 20px; text-align: center;">
            <a href="https://wedsync.com/admin/deployment" 
               style="background: ${color}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              View Admin Dashboard
            </a>
          </div>
        </div>

        <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px;">
          <p>This is an automated message from WedSync deployment system.</p>
          <p>Do not reply to this email.</p>
        </div>
      </body>
    </html>
    `;

    return { subject, html };
  }

  private getSlackMessage(event: DeploymentEvent, urgency: string) {
    const isSuccess = event.type === 'deployment.succeeded';
    const isFailure = event.type === 'deployment.failed';
    const isRollback = event.type === 'deployment.rollback';

    let color = 'good';
    let emoji = '🚀';
    
    if (isFailure || isRollback) {
      color = 'danger';
      emoji = '🚨';
    } else if (urgency === 'critical') {
      color = 'warning';
      emoji = '⚠️';
    }

    return {
      text: `${emoji} WedSync Deployment ${event.type.split('.')[1].toUpperCase()}`,
      attachments: [{
        color,
        fields: [
          {
            title: 'Deployment ID',
            value: `\`${event.deploymentId}\``,
            short: true
          },
          {
            title: 'Version',
            value: event.version || 'Unknown',
            short: true
          },
          {
            title: 'Urgency',
            value: urgency.toUpperCase(),
            short: true
          },
          {
            title: 'Timestamp',
            value: new Date().toISOString(),
            short: true
          }
        ],
        actions: isSuccess ? [{
          type: 'button',
          text: 'View Dashboard',
          url: 'https://wedsync.com/admin/deployment'
        }] : [{
          type: 'button',
          text: 'Emergency Dashboard',
          url: 'https://wedsync.com/admin/deployment',
          style: 'danger'
        }]
      }]
    };
  }

  private generateWebhookSignature(payload: string, secret: string): string {
    const crypto = require('crypto');
    return 'sha256=' + crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }

  private async logNotificationResults(event: DeploymentEvent, results: any[]): Promise<void> {
    try {
      await supabase.from('deployment_notifications').insert({
        deployment_id: event.deploymentId,
        event_type: event.type,
        urgency: this.getEventUrgency(event.type),
        channels_attempted: results.length,
        channels_successful: results.filter(r => r.status === 'fulfilled').length,
        sent_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to log notification results:', error);
    }
  }
}
```

## 🔗 VERCEL WEBHOOK HANDLER

### Webhook Processing Service
```typescript
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

  private async handleDeploymentCreated(payload: VercelWebhookPayload): Promise<void> {
    const deployment = payload.data.deployment;
    if (!deployment) return;

    // Send low-priority notification
    await this.notificationService.sendDeploymentNotification({
      type: 'deployment.started',
      deploymentId: deployment.id,
      version: deployment.meta?.githubCommitSha?.substring(0, 8),
      url: deployment.url
    });

    console.log(`Deployment started: ${deployment.id}`);
  }

  private async handleDeploymentSucceeded(payload: VercelWebhookPayload): Promise<void> {
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
              performance: healthCheck.performance
            }
          });

          // Trigger GitHub Actions verification workflow
          await this.triggerVerificationWorkflow(deployment);

          console.log(`Deployment succeeded and verified: ${deployment.id}`);
        } else {
          // Health check failed - treat as deployment failure
          console.error('Health check failed for successful deployment:', healthCheck);
          await this.handleDeploymentHealthFailure(deployment, healthCheck);
        }
      } catch (error) {
        console.error('Post-deployment verification failed:', error);
        await this.handleDeploymentHealthFailure(deployment, { success: false, error: error.message });
      }
    }, 5000); // Wait 5 seconds for deployment to stabilize
  }

  private async handleDeploymentFailed(payload: VercelWebhookPayload): Promise<void> {
    const deployment = payload.data.deployment;
    if (!deployment) return;

    // Get error details from Vercel API
    let errorDetails = 'Deployment failed';
    try {
      const vercelClient = new (await import('../services/VercelClient')).VercelClient({
        token: process.env.VERCEL_TOKEN!
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
      error: errorDetails
    });

    // Check if it's wedding hours (Saturdays 8am-10pm) for immediate escalation
    const now = new Date();
    if (now.getDay() === 6 && now.getHours() >= 8 && now.getHours() <= 22) {
      await this.escalateWeddingDayFailure(deployment, errorDetails);
    }

    console.error(`Deployment failed: ${deployment.id}`, errorDetails);
  }

  private async handleDeploymentCanceled(payload: VercelWebhookPayload): Promise<void> {
    const deployment = payload.data.deployment;
    if (!deployment) return;

    console.log(`Deployment canceled: ${deployment.id}`);
  }

  private async handleDeploymentHealthFailure(deployment: any, healthCheck: any): Promise<void> {
    // Attempt automatic rollback for health check failures
    try {
      const currentDeployment = await this.deploymentManager.getCurrentDeployment();
      if (currentDeployment && currentDeployment.id === deployment.id) {
        console.log('Attempting automatic rollback due to health check failure...');
        
        // This would need the previous deployment ID - simplified for this example
        const rollbackSuccess = await this.deploymentManager.rollbackDeployment(
          'previous-deployment-id', // Would get this from Vercel API
          'system',
          'Automatic rollback due to health check failure'
        );

        if (rollbackSuccess) {
          await this.notificationService.sendDeploymentNotification({
            type: 'deployment.rollback',
            deploymentId: deployment.id,
            metadata: { 
              reason: 'Health check failure',
              automatic: true,
              healthCheck 
            }
          });
        }
      }
    } catch (error) {
      console.error('Automatic rollback failed:', error);
      
      // Send critical alert about rollback failure
      await this.notificationService.sendDeploymentNotification({
        type: 'deployment.failed',
        deploymentId: deployment.id,
        error: `Health check failed AND automatic rollback failed: ${error.message}`
      });
    }
  }

  private async escalateWeddingDayFailure(deployment: any, error: string): Promise<void> {
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
      severity: 'CRITICAL'
    });
  }

  private async triggerVerificationWorkflow(deployment: any): Promise<void> {
    // Trigger GitHub Actions verification workflow using repository dispatch
    try {
      const octokit = new (await import('@octokit/rest')).Octokit({
        auth: process.env.GITHUB_TOKEN
      });

      await octokit.rest.repos.createDispatchEvent({
        owner: process.env.GITHUB_REPOSITORY_OWNER!,
        repo: process.env.GITHUB_REPOSITORY_NAME!,
        event_type: 'deployment_ready',
        client_payload: {
          deployment_id: deployment.id,
          deployment_url: deployment.url,
          version: deployment.meta?.githubCommitSha?.substring(0, 8)
        }
      });

      console.log('Triggered verification workflow for deployment:', deployment.id);
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
        processed_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to log webhook event:', error);
    }
  }
}
```

## 🔧 TEAM C DELIVERABLES CHECKLIST
- [x] Complete GitHub Actions CI/CD pipeline with validation and deployment
- [x] Vercel webhook handler with comprehensive event processing
- [x] Multi-channel deployment notification service (email, Slack, webhooks)
- [x] Automated rollback capabilities with health check integration
- [x] Preview deployment workflow for pull requests
- [x] Post-deployment monitoring and verification
- [x] Wedding-day specific escalation procedures
- [x] Comprehensive logging and audit trails
- [x] Security validation for all webhook endpoints
- [x] Integration with GitHub repository dispatch for workflow triggers
- [x] Performance monitoring and alerting systems
- [x] Emergency notification systems for critical failures

**MISSION CRITICAL: This integration layer is the nervous system of our deployment process. Every webhook, every notification, every rollback must be bulletproof for wedding day reliability!**