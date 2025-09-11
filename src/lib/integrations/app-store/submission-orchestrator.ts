import { createClient } from '@/lib/supabase/client';
import {
  StoreAPIs,
  StoreCredentials,
  SubmissionStatus,
  AppStoreAsset,
} from './store-apis';
import { NotificationService } from '../NotificationService';
import {
  AppStoreMetadata,
  SubmissionConfig,
  SubmissionWorkflow,
  SubmissionOrchestratorInterface,
  AssetDistributorInterface,
  ComplianceCheckerInterface,
  AppStoreServices,
} from './types';

// Interfaces now imported from types.ts

export class SubmissionOrchestrator implements SubmissionOrchestratorInterface {
  private storeAPIs: StoreAPIs;
  private assetDistributor?: AssetDistributorInterface;
  private complianceChecker?: ComplianceCheckerInterface;
  private notificationService: NotificationService;
  private supabase: ReturnType<typeof createClient>;

  constructor(credentials: StoreCredentials, services: AppStoreServices = {}) {
    this.storeAPIs = new StoreAPIs(credentials);
    this.assetDistributor = services.assetDistributor;
    this.complianceChecker = services.complianceChecker;
    this.notificationService = new NotificationService();
    this.supabase = createClient();
  }

  async initiateSubmission(
    organizationId: string,
    metadata: AppStoreMetadata,
    config: SubmissionConfig,
    submittedBy: string,
  ): Promise<string> {
    const workflowId = `submission_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Create workflow record
      const workflow: SubmissionWorkflow = {
        id: workflowId,
        organizationId,
        config,
        status: 'pending',
        platformSubmissions: {},
        assets: {},
        metadata,
        progress: 0,
        errors: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        submittedBy,
      };

      await this.saveWorkflow(workflow);

      // Start submission process
      if (config.submissionType === 'immediate') {
        await this.processSubmission(workflowId);
      } else if (
        config.submissionType === 'scheduled' &&
        config.scheduledDate
      ) {
        await this.scheduleSubmission(workflowId, config.scheduledDate);
      }

      return workflowId;
    } catch (error) {
      console.error('Failed to initiate submission:', error);
      await this.updateWorkflowStatus(workflowId, 'failed', [
        `Initiation failed: ${error}`,
      ]);
      throw error;
    }
  }

  private async processSubmission(workflowId: string): Promise<void> {
    const workflow = await this.getWorkflow(workflowId);
    if (!workflow) throw new Error('Workflow not found');

    try {
      await this.updateWorkflowStatus(workflowId, 'processing', [], 5);

      // Step 1: Compliance validation
      await this.validateCompliance(workflow);
      await this.updateWorkflowProgress(workflowId, 15);

      // Step 2: Asset generation and distribution
      const distributedAssets = await this.distributeAssets(workflow);
      await this.updateWorkflowAssets(workflowId, distributedAssets);
      await this.updateWorkflowProgress(workflowId, 35);

      // Step 3: Platform-specific submissions
      const submissionResults = await this.submitToPlatforms(
        workflow,
        distributedAssets,
      );
      await this.updatePlatformSubmissions(workflowId, submissionResults);
      await this.updateWorkflowProgress(workflowId, 70);

      // Step 4: Monitor submission status
      await this.monitorSubmissions(workflowId, submissionResults);
      await this.updateWorkflowProgress(workflowId, 100);

      await this.updateWorkflowStatus(workflowId, 'completed');
      await this.sendNotification(workflow, 'submission_completed');
    } catch (error) {
      console.error('Submission processing failed:', error);
      await this.updateWorkflowStatus(workflowId, 'failed', [
        `Processing failed: ${error}`,
      ]);
      await this.sendNotification(workflow, 'submission_failed', {
        error: error.toString(),
      });
    }
  }

  private async validateCompliance(
    workflow: SubmissionWorkflow,
  ): Promise<void> {
    if (!this.complianceChecker) {
      console.warn(
        '[SubmissionOrchestrator] Compliance checker not available - skipping validation',
      );
      return;
    }

    const complianceResults = await Promise.all(
      workflow.config.platforms.map(async (platform) => {
        const result = await this.complianceChecker!.validateForPlatform(
          platform,
          workflow.metadata,
        );
        return { platform, ...result };
      }),
    );

    const failures = complianceResults.filter((result) => !result.isCompliant);
    if (failures.length > 0) {
      const errorMessages = failures.map(
        (failure) => `${failure.platform}: ${failure.violations.join(', ')}`,
      );
      throw new Error(
        `Compliance validation failed: ${errorMessages.join('; ')}`,
      );
    }
  }

  private async distributeAssets(
    workflow: SubmissionWorkflow,
  ): Promise<{ [platform: string]: FormData }> {
    const distributedAssets: { [platform: string]: FormData } = {};

    if (!this.assetDistributor) {
      console.warn(
        '[SubmissionOrchestrator] Asset distributor not available - returning empty assets',
      );
      return distributedAssets;
    }

    for (const platform of workflow.config.platforms) {
      const assets = await this.assetDistributor.generatePlatformAssets(
        platform,
        workflow.metadata,
        workflow.config.testMode || false,
      );
      distributedAssets[platform] = assets;
    }

    return distributedAssets;
  }

  private async submitToPlatforms(
    workflow: SubmissionWorkflow,
    assets: { [platform: string]: FormData },
  ): Promise<{ [platform: string]: string }> {
    const submissionResults: { [platform: string]: string } = {};

    // Filter assets based on selected platforms
    const filteredAssets = Object.fromEntries(
      Object.entries(assets).filter(([platform]) =>
        workflow.config.platforms.includes(platform as any),
      ),
    );

    try {
      const results = await this.storeAPIs.submitToAllStores(
        filteredAssets,
        workflow.metadata,
      );
      return results;
    } catch (error) {
      console.error('Platform submission failed:', error);
      throw error;
    }
  }

  private async monitorSubmissions(
    workflowId: string,
    submissionIds: { [platform: string]: string },
  ): Promise<void> {
    const maxRetries = 10;
    let retryCount = 0;

    while (retryCount < maxRetries) {
      try {
        const statuses =
          await this.storeAPIs.getMultiPlatformStatus(submissionIds);
        await this.updateSubmissionStatuses(workflowId, statuses);

        // Check if all submissions are in final state
        const allCompleted = statuses.every((status) =>
          ['approved', 'rejected', 'published'].includes(status.status),
        );

        if (allCompleted) {
          break;
        }

        // Wait before next check (exponential backoff)
        const waitTime = Math.min(300000, 30000 * Math.pow(2, retryCount)); // Max 5 minutes
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        retryCount++;
      } catch (error) {
        console.error('Monitoring error:', error);
        retryCount++;
      }
    }
  }

  async submitToStores(
    config: SubmissionConfig,
    metadata: AppStoreMetadata,
  ): Promise<SubmissionWorkflow> {
    // This is a wrapper around initiateSubmission to match the interface
    const workflowId = await this.initiateSubmission('', metadata, config, '');
    const workflow = await this.getWorkflow(workflowId);
    if (!workflow) throw new Error('Failed to create submission workflow');
    return workflow;
  }

  async getSubmissionStatus(
    workflowId: string,
  ): Promise<SubmissionWorkflow | null> {
    return await this.getWorkflow(workflowId);
  }

  async cancelSubmission(workflowId: string): Promise<boolean> {
    const workflow = await this.getWorkflow(workflowId);
    if (!workflow) throw new Error('Workflow not found');

    if (['completed', 'failed', 'cancelled'].includes(workflow.status)) {
      throw new Error('Cannot cancel submission in current state');
    }

    await this.updateWorkflowStatus(workflowId, 'cancelled', [
      `Cancelled by system`,
    ]);
    await this.sendNotification(workflow, 'submission_cancelled', {
      cancelledBy: 'system',
    });
    return true;
  }

  async retryFailedSubmission(
    workflowId: string,
    platforms?: string[],
  ): Promise<void> {
    const workflow = await this.getWorkflow(workflowId);
    if (!workflow) throw new Error('Workflow not found');

    if (workflow.status !== 'failed') {
      throw new Error('Can only retry failed submissions');
    }

    // Filter platforms to retry if specified
    if (platforms && platforms.length > 0) {
      workflow.config.platforms = workflow.config.platforms.filter((p) =>
        platforms.includes(p),
      );
    }

    // Clear previous errors
    workflow.errors = [];
    workflow.progress = 0;
    workflow.updatedAt = new Date();

    await this.saveWorkflow(workflow);
    await this.processSubmission(workflowId);
  }

  private async scheduleSubmission(
    workflowId: string,
    scheduledDate: Date,
  ): Promise<void> {
    // In a real implementation, this would use a job queue system like Bull or Agenda
    const delay = scheduledDate.getTime() - Date.now();

    if (delay <= 0) {
      throw new Error('Scheduled date must be in the future');
    }

    setTimeout(async () => {
      await this.processSubmission(workflowId);
    }, delay);
  }

  private async saveWorkflow(workflow: SubmissionWorkflow): Promise<void> {
    const { error } = await this.supabase.from('app_store_submissions').upsert({
      id: workflow.id,
      organization_id: workflow.organizationId,
      config: workflow.config,
      status: workflow.status,
      platform_submissions: workflow.platformSubmissions,
      assets: workflow.assets,
      metadata: workflow.metadata,
      progress: workflow.progress,
      errors: workflow.errors,
      created_at: workflow.createdAt.toISOString(),
      updated_at: workflow.updatedAt.toISOString(),
      submitted_by: workflow.submittedBy,
    });

    if (error) {
      console.error('Failed to save workflow:', error);
      throw error;
    }

    // Real-time update for dashboard
    await this.supabase.channel(`submission_${workflow.id}`).send({
      type: 'broadcast',
      event: 'workflow_updated',
      payload: workflow,
    });
  }

  private async getWorkflow(
    workflowId: string,
  ): Promise<SubmissionWorkflow | null> {
    const { data, error } = await this.supabase
      .from('app_store_submissions')
      .select('*')
      .eq('id', workflowId)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      organizationId: data.organization_id,
      config: data.config,
      status: data.status,
      platformSubmissions: data.platform_submissions,
      assets: data.assets,
      metadata: data.metadata,
      progress: data.progress,
      errors: data.errors,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      submittedBy: data.submitted_by,
    };
  }

  private async updateWorkflowStatus(
    workflowId: string,
    status: SubmissionWorkflow['status'],
    errors: string[] = [],
    progress?: number,
  ): Promise<void> {
    const updates: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (errors.length > 0) {
      updates.errors = errors;
    }

    if (progress !== undefined) {
      updates.progress = progress;
    }

    const { error } = await this.supabase
      .from('app_store_submissions')
      .update(updates)
      .eq('id', workflowId);

    if (error) {
      console.error('Failed to update workflow status:', error);
      throw error;
    }
  }

  private async updateWorkflowProgress(
    workflowId: string,
    progress: number,
  ): Promise<void> {
    await this.updateWorkflowStatus(workflowId, 'processing', [], progress);
  }

  private async updateWorkflowAssets(
    workflowId: string,
    assets: { [platform: string]: any },
  ): Promise<void> {
    const { error } = await this.supabase
      .from('app_store_submissions')
      .update({
        assets,
        updated_at: new Date().toISOString(),
      })
      .eq('id', workflowId);

    if (error) {
      console.error('Failed to update workflow assets:', error);
      throw error;
    }
  }

  private async updatePlatformSubmissions(
    workflowId: string,
    submissionIds: { [platform: string]: string },
  ): Promise<void> {
    const { error } = await this.supabase
      .from('app_store_submissions')
      .update({
        platform_submissions: submissionIds,
        updated_at: new Date().toISOString(),
      })
      .eq('id', workflowId);

    if (error) {
      console.error('Failed to update platform submissions:', error);
      throw error;
    }
  }

  private async updateSubmissionStatuses(
    workflowId: string,
    statuses: SubmissionStatus[],
  ): Promise<void> {
    // Store detailed submission statuses for monitoring
    for (const status of statuses) {
      await this.supabase.from('app_store_submission_statuses').upsert({
        workflow_id: workflowId,
        platform: status.platform,
        platform_submission_id: status.id,
        status: status.status,
        progress: status.progress,
        message: status.message,
        submitted_at: status.submittedAt.toISOString(),
        updated_at: status.updatedAt.toISOString(),
      });
    }
  }

  private async sendNotification(
    workflow: SubmissionWorkflow,
    type: 'submission_completed' | 'submission_failed' | 'submission_cancelled',
    data?: any,
  ): Promise<void> {
    if (workflow.config.notificationPreferences.email) {
      await this.notificationService.sendNotification({
        type: 'email',
        recipientId: workflow.submittedBy,
        templateId: type,
        variables: { workflow: workflow.metadata.title, status: type, ...data },
        priority: 'normal',
      });
    }

    if (workflow.config.notificationPreferences.dashboard) {
      await this.supabase.channel(`org_${workflow.organizationId}`).send({
        type: 'broadcast',
        event: 'app_store_notification',
        payload: { type, workflow, ...data },
      });
    }
  }

  async getSubmissionHistory(
    organizationId: string,
    limit = 50,
  ): Promise<SubmissionWorkflow[]> {
    const { data, error } = await this.supabase
      .from('app_store_submissions')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to get submission history:', error);
      throw error;
    }

    return data.map((row) => ({
      id: row.id,
      organizationId: row.organization_id,
      config: row.config,
      status: row.status,
      platformSubmissions: row.platform_submissions,
      assets: row.assets,
      metadata: row.metadata,
      progress: row.progress,
      errors: row.errors,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      submittedBy: row.submitted_by,
    }));
  }

  async getAnalytics(organizationId: string): Promise<any> {
    const { data, error } = await this.supabase.rpc('get_app_store_analytics', {
      org_id: organizationId,
    });

    if (error) {
      console.error('Failed to get analytics:', error);
      throw error;
    }

    return data;
  }
}
