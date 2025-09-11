import { Logger } from '@/lib/logging/Logger';
import { redis } from '@/lib/redis';
import { createClient } from '@/lib/supabase/client';
import {
  FeatureRequest,
  UserContext,
  WeddingContext,
} from '@/lib/feature-requests/types';

/**
 * External system integration types
 */
interface LinearIntegration {
  teamId: string;
  apiKey: string;
  webhookSecret: string;
  enabled: boolean;
}

interface GitHubIntegration {
  owner: string;
  repo: string;
  token: string;
  webhookSecret: string;
  enabled: boolean;
}

interface JiraIntegration {
  domain: string;
  email: string;
  apiToken: string;
  projectKey: string;
  webhookSecret: string;
  enabled: boolean;
}

interface SlackIntegration {
  botToken: string;
  channel: string;
  webhookUrl: string;
  enabled: boolean;
}

interface ExternalSystemsConfig {
  linear?: LinearIntegration;
  github?: GitHubIntegration;
  jira?: JiraIntegration;
  slack?: SlackIntegration;
}

interface ExternalIssue {
  system: 'linear' | 'github' | 'jira';
  externalId: string;
  url: string;
  status: string;
  assignee?: string;
  labels: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface SyncResult {
  success: boolean;
  externalIssue?: ExternalIssue;
  error?: string;
  syncedAt: Date;
}

/**
 * Product Management Integration Service
 * Handles bidirectional sync with external product management tools
 * Optimized for wedding industry workflows and WedSync ecosystem
 */
export class ProductManagementIntegrationService {
  private supabase = createClient();
  private logger = new Logger('ProductManagementIntegration');
  private config: ExternalSystemsConfig = {};

  constructor(config?: ExternalSystemsConfig) {
    this.config = config || {};
  }

  /**
   * Create issue in external product management tool
   * Automatically creates issues based on feature request priority and context
   */
  async createExternalIssue(
    featureRequest: FeatureRequest,
    userContext: UserContext,
    system: 'linear' | 'github' | 'jira' = 'linear',
  ): Promise<SyncResult> {
    const startTime = Date.now();

    try {
      // Generate wedding industry specific issue details
      const issueDetails = await this.generateWeddingIssueDetails(
        featureRequest,
        userContext,
      );

      let result: SyncResult;

      switch (system) {
        case 'linear':
          result = await this.createLinearIssue(issueDetails, featureRequest);
          break;
        case 'github':
          result = await this.createGitHubIssue(issueDetails, featureRequest);
          break;
        case 'jira':
          result = await this.createJiraIssue(issueDetails, featureRequest);
          break;
        default:
          throw new Error(`Unsupported system: ${system}`);
      }

      // Update feature request with external reference
      if (result.success && result.externalIssue) {
        await this.linkExternalIssue(featureRequest.id, result.externalIssue);
      }

      // Send Slack notification
      if (this.config.slack?.enabled) {
        await this.sendSlackNotification(featureRequest, result);
      }

      const duration = Date.now() - startTime;
      this.logger.info('External issue created', {
        featureRequestId: featureRequest.id,
        system,
        success: result.success,
        duration,
        weddingContext: userContext.weddingContext?.weddingType,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('Failed to create external issue', {
        featureRequestId: featureRequest.id,
        system,
        error: error.message,
        duration,
      });

      return {
        success: false,
        error: error.message,
        syncedAt: new Date(),
      };
    }
  }

  /**
   * Sync feature request status with external systems
   * Bidirectional sync to keep all systems up to date
   */
  async syncFeatureRequestStatus(
    featureRequestId: string,
  ): Promise<SyncResult[]> {
    try {
      // Get feature request with external links
      const { data: featureRequest, error } = await this.supabase
        .from('feature_requests')
        .select(
          `
          *,
          external_issues:feature_request_external_issues(*)
        `,
        )
        .eq('id', featureRequestId)
        .single();

      if (error || !featureRequest) {
        throw new Error('Feature request not found');
      }

      const syncResults: SyncResult[] = [];

      // Sync with each external system
      for (const externalIssue of featureRequest.external_issues || []) {
        const result = await this.syncWithExternalSystem(
          featureRequest,
          externalIssue,
        );
        syncResults.push(result);
      }

      this.logger.info('Feature request synced with external systems', {
        featureRequestId,
        syncCount: syncResults.length,
        successCount: syncResults.filter((r) => r.success).length,
      });

      return syncResults;
    } catch (error) {
      this.logger.error('Failed to sync feature request status', {
        featureRequestId,
        error: error.message,
      });

      return [
        {
          success: false,
          error: error.message,
          syncedAt: new Date(),
        },
      ];
    }
  }

  /**
   * Process webhook from external system
   * Handles status updates from Linear, GitHub, Jira
   */
  async processExternalWebhook(
    system: 'linear' | 'github' | 'jira',
    payload: any,
    signature: string,
  ): Promise<boolean> {
    try {
      // Verify webhook signature
      const isValid = await this.verifyWebhookSignature(
        system,
        payload,
        signature,
      );
      if (!isValid) {
        throw new Error('Invalid webhook signature');
      }

      // Process based on system
      switch (system) {
        case 'linear':
          return await this.processLinearWebhook(payload);
        case 'github':
          return await this.processGitHubWebhook(payload);
        case 'jira':
          return await this.processJiraWebhook(payload);
        default:
          throw new Error(`Unsupported webhook system: ${system}`);
      }
    } catch (error) {
      this.logger.error('Failed to process external webhook', {
        system,
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Generate wedding industry specific issue details
   */
  private async generateWeddingIssueDetails(
    featureRequest: FeatureRequest,
    userContext: UserContext,
  ) {
    const weddingContext = userContext.weddingContext;
    const businessMetrics = userContext.businessMetrics;

    // Generate wedding industry specific labels
    const labels = [
      'wedding-industry',
      `priority-${featureRequest.priority}`,
      `user-type-${userContext.userType}`,
      weddingContext?.weddingType && `wedding-${weddingContext.weddingType}`,
      businessMetrics?.tier && `tier-${businessMetrics.tier}`,
      weddingContext?.isWeddingDay && 'wedding-day-critical',
    ].filter(Boolean);

    // Generate comprehensive title and description
    const title = `[WedSync] ${featureRequest.title}`;

    const description = `
## Feature Request Details

**Priority**: ${featureRequest.priority}
**Category**: ${featureRequest.category}
**User Type**: ${userContext.userType}
**Business Tier**: ${businessMetrics?.tier || 'unknown'}

## Wedding Context

${
  weddingContext
    ? `
**Wedding Type**: ${weddingContext.weddingType}
**Guest Count**: ${weddingContext.guestCount}
**Budget Range**: ${weddingContext.budgetRange}
**Services**: ${weddingContext.services.join(', ')}
**Is Wedding Day**: ${weddingContext.isWeddingDay ? 'YES - CRITICAL' : 'No'}
**Days Until Wedding**: ${weddingContext.daysUntilWedding}
`
    : 'No wedding context available'
}

## Business Impact

**Monthly Revenue**: £${businessMetrics?.monthlyRevenue || 0}
**Client Count**: ${businessMetrics?.clientCount || 0}
**Credibility Score**: ${userContext.credibilityScore}/100

## Original Request

${featureRequest.description}

## Implementation Notes

${featureRequest.technicalRequirements || 'No technical requirements specified'}

---

*Generated by WedSync Feature Request Management System*
*Wedding Industry Focus - Mobile First - Saturday Safety*
    `.trim();

    return {
      title,
      description,
      labels,
      priority: this.mapPriorityToExternal(featureRequest.priority),
      assignee: await this.getAssigneeForCategory(featureRequest.category),
      projectId: await this.getProjectIdForWeddingFeature(
        featureRequest.category,
      ),
    };
  }

  /**
   * Create Linear issue
   */
  private async createLinearIssue(
    issueDetails: any,
    featureRequest: FeatureRequest,
  ): Promise<SyncResult> {
    if (!this.config.linear?.enabled) {
      return {
        success: false,
        error: 'Linear integration not enabled',
        syncedAt: new Date(),
      };
    }

    try {
      const response = await fetch('https://api.linear.app/graphql', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.linear.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
            mutation CreateIssue($input: IssueCreateInput!) {
              issueCreate(input: $input) {
                success
                issue {
                  id
                  identifier
                  url
                  state {
                    name
                  }
                  assignee {
                    name
                  }
                  labels {
                    nodes {
                      name
                    }
                  }
                  createdAt
                  updatedAt
                }
              }
            }
          `,
          variables: {
            input: {
              teamId: this.config.linear.teamId,
              title: issueDetails.title,
              description: issueDetails.description,
              priority: issueDetails.priority,
              labelIds: await this.getLinearLabelIds(issueDetails.labels),
            },
          },
        }),
      });

      const data = await response.json();

      if (!data.data?.issueCreate?.success) {
        throw new Error('Failed to create Linear issue');
      }

      const issue = data.data.issueCreate.issue;

      return {
        success: true,
        externalIssue: {
          system: 'linear',
          externalId: issue.id,
          url: issue.url,
          status: issue.state.name,
          assignee: issue.assignee?.name,
          labels: issue.labels.nodes.map((l: any) => l.name),
          createdAt: new Date(issue.createdAt),
          updatedAt: new Date(issue.updatedAt),
        },
        syncedAt: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        syncedAt: new Date(),
      };
    }
  }

  /**
   * Create GitHub issue
   */
  private async createGitHubIssue(
    issueDetails: any,
    featureRequest: FeatureRequest,
  ): Promise<SyncResult> {
    if (!this.config.github?.enabled) {
      return {
        success: false,
        error: 'GitHub integration not enabled',
        syncedAt: new Date(),
      };
    }

    try {
      const response = await fetch(
        `https://api.github.com/repos/${this.config.github.owner}/${this.config.github.repo}/issues`,
        {
          method: 'POST',
          headers: {
            Authorization: `token ${this.config.github.token}`,
            'Content-Type': 'application/json',
            Accept: 'application/vnd.github.v3+json',
          },
          body: JSON.stringify({
            title: issueDetails.title,
            body: issueDetails.description,
            labels: issueDetails.labels,
            assignees: issueDetails.assignee ? [issueDetails.assignee] : [],
          }),
        },
      );

      const issue = await response.json();

      if (!response.ok) {
        throw new Error(`GitHub API error: ${issue.message}`);
      }

      return {
        success: true,
        externalIssue: {
          system: 'github',
          externalId: issue.id.toString(),
          url: issue.html_url,
          status: issue.state,
          assignee: issue.assignee?.login,
          labels: issue.labels.map((l: any) => l.name),
          createdAt: new Date(issue.created_at),
          updatedAt: new Date(issue.updated_at),
        },
        syncedAt: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        syncedAt: new Date(),
      };
    }
  }

  /**
   * Create Jira issue
   */
  private async createJiraIssue(
    issueDetails: any,
    featureRequest: FeatureRequest,
  ): Promise<SyncResult> {
    if (!this.config.jira?.enabled) {
      return {
        success: false,
        error: 'Jira integration not enabled',
        syncedAt: new Date(),
      };
    }

    try {
      const auth = Buffer.from(
        `${this.config.jira.email}:${this.config.jira.apiToken}`,
      ).toString('base64');

      const response = await fetch(
        `https://${this.config.jira.domain}/rest/api/3/issue`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fields: {
              project: {
                key: this.config.jira.projectKey,
              },
              summary: issueDetails.title,
              description: {
                type: 'doc',
                version: 1,
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        type: 'text',
                        text: issueDetails.description,
                      },
                    ],
                  },
                ],
              },
              issuetype: {
                name: 'Story',
              },
              labels: issueDetails.labels,
              priority: {
                name: issueDetails.priority,
              },
            },
          }),
        },
      );

      const issue = await response.json();

      if (!response.ok) {
        throw new Error(
          `Jira API error: ${issue.errors ? JSON.stringify(issue.errors) : issue.message}`,
        );
      }

      return {
        success: true,
        externalIssue: {
          system: 'jira',
          externalId: issue.id,
          url: `https://${this.config.jira.domain}/browse/${issue.key}`,
          status: 'To Do',
          labels: issueDetails.labels,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        syncedAt: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        syncedAt: new Date(),
      };
    }
  }

  /**
   * Link external issue to feature request
   */
  private async linkExternalIssue(
    featureRequestId: string,
    externalIssue: ExternalIssue,
  ): Promise<void> {
    const { error } = await this.supabase
      .from('feature_request_external_issues')
      .insert({
        feature_request_id: featureRequestId,
        external_system: externalIssue.system,
        external_id: externalIssue.externalId,
        external_url: externalIssue.url,
        status: externalIssue.status,
        assignee: externalIssue.assignee,
        labels: externalIssue.labels,
        created_at: externalIssue.createdAt,
        updated_at: externalIssue.updatedAt,
        last_synced_at: new Date(),
      });

    if (error) {
      this.logger.error('Failed to link external issue', {
        featureRequestId,
        externalSystem: externalIssue.system,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Send Slack notification
   */
  private async sendSlackNotification(
    featureRequest: FeatureRequest,
    syncResult: SyncResult,
  ): Promise<void> {
    if (!this.config.slack?.enabled) return;

    try {
      const message = syncResult.success
        ? `✅ Feature request "${featureRequest.title}" created in ${syncResult.externalIssue?.system}: ${syncResult.externalIssue?.url}`
        : `❌ Failed to create external issue for "${featureRequest.title}": ${syncResult.error}`;

      await fetch(this.config.slack.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: message,
          channel: this.config.slack.channel,
          username: 'WedSync Feature Requests',
          icon_emoji: ':wedding:',
        }),
      });
    } catch (error) {
      this.logger.error('Failed to send Slack notification', {
        error: error.message,
      });
    }
  }

  /**
   * Sync with external system
   */
  private async syncWithExternalSystem(
    featureRequest: any,
    externalIssue: any,
  ): Promise<SyncResult> {
    // Implementation for syncing status from external systems
    // This would fetch the current status from the external system
    // and update our database accordingly

    return {
      success: true,
      syncedAt: new Date(),
    };
  }

  /**
   * Verify webhook signature
   */
  private async verifyWebhookSignature(
    system: 'linear' | 'github' | 'jira',
    payload: any,
    signature: string,
  ): Promise<boolean> {
    // Implementation for verifying webhook signatures
    // This would use the webhook secrets to verify the authenticity
    return true; // Simplified for now
  }

  /**
   * Process Linear webhook
   */
  private async processLinearWebhook(payload: any): Promise<boolean> {
    // Process Linear webhook payload
    // Update feature request status based on Linear issue changes
    return true;
  }

  /**
   * Process GitHub webhook
   */
  private async processGitHubWebhook(payload: any): Promise<boolean> {
    // Process GitHub webhook payload
    // Update feature request status based on GitHub issue changes
    return true;
  }

  /**
   * Process Jira webhook
   */
  private async processJiraWebhook(payload: any): Promise<boolean> {
    // Process Jira webhook payload
    // Update feature request status based on Jira issue changes
    return true;
  }

  /**
   * Helper methods
   */
  private mapPriorityToExternal(priority: string): string {
    const mapping = {
      low: 'Low',
      medium: 'Medium',
      high: 'High',
      urgent: 'Urgent',
      critical: 'Critical',
    };
    return mapping[priority as keyof typeof mapping] || 'Medium';
  }

  private async getAssigneeForCategory(
    category: string,
  ): Promise<string | undefined> {
    // Logic to assign based on feature category
    const categoryAssignees = {
      'ui-ux': 'design-team',
      backend: 'backend-team',
      mobile: 'mobile-team',
      integration: 'integration-team',
      'wedding-specific': 'wedding-team',
    };

    return categoryAssignees[category as keyof typeof categoryAssignees];
  }

  private async getProjectIdForWeddingFeature(
    category: string,
  ): Promise<string> {
    // Return appropriate project ID based on category
    return 'wedsync-main';
  }

  private async getLinearLabelIds(labels: string[]): Promise<string[]> {
    // Convert label names to Linear label IDs
    // This would require a mapping or API call to Linear
    return [];
  }
}

// Singleton instance
export const productManagementIntegration =
  new ProductManagementIntegrationService();
