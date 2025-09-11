// /src/lib/integrations/GitHubActionsClient.ts
import { Octokit } from '@octokit/rest';

export interface WorkflowRun {
  id: number;
  name: string;
  status: 'queued' | 'in_progress' | 'completed';
  conclusion:
    | 'success'
    | 'failure'
    | 'neutral'
    | 'cancelled'
    | 'skipped'
    | 'timed_out'
    | 'action_required'
    | null;
  created_at: string;
  updated_at: string;
  head_branch: string;
  head_sha: string;
  html_url: string;
}

export interface WorkflowDispatchPayload {
  deployment_id: string;
  deployment_url: string;
  version?: string;
  environment?: 'production' | 'staging' | 'preview';
  [key: string]: any;
}

export interface GitHubActionsConfig {
  token: string;
  owner: string;
  repo: string;
}

export class GitHubActionsClient {
  private octokit: Octokit;
  private owner: string;
  private repo: string;

  constructor(config: GitHubActionsConfig) {
    this.octokit = new Octokit({
      auth: config.token,
    });
    this.owner = config.owner;
    this.repo = config.repo;
  }

  async triggerDeploymentVerification(
    payload: WorkflowDispatchPayload,
  ): Promise<boolean> {
    try {
      await this.octokit.rest.repos.createDispatchEvent({
        owner: this.owner,
        repo: this.repo,
        event_type: 'deployment_ready',
        client_payload: payload,
      });

      console.log(
        'Triggered deployment verification workflow:',
        payload.deployment_id,
      );
      return true;
    } catch (error) {
      console.error('Failed to trigger deployment verification:', error);
      return false;
    }
  }

  async triggerEmergencyRollback(
    deploymentId: string,
    reason: string,
  ): Promise<boolean> {
    try {
      await this.octokit.rest.repos.createDispatchEvent({
        owner: this.owner,
        repo: this.repo,
        event_type: 'emergency_rollback',
        client_payload: {
          deployment_id: deploymentId,
          reason,
          initiated_at: new Date().toISOString(),
          urgency: 'critical',
        },
      });

      console.log('Triggered emergency rollback workflow:', deploymentId);
      return true;
    } catch (error) {
      console.error('Failed to trigger emergency rollback:', error);
      return false;
    }
  }

  async getWorkflowRuns(
    workflowId?: string,
    limit: number = 10,
  ): Promise<WorkflowRun[]> {
    try {
      const params: any = {
        owner: this.owner,
        repo: this.repo,
        per_page: limit,
      };

      let response;
      if (workflowId) {
        response = await this.octokit.rest.actions.listWorkflowRuns({
          ...params,
          workflow_id: workflowId,
        });
      } else {
        response =
          await this.octokit.rest.actions.listWorkflowRunsForRepo(params);
      }

      return response.data.workflow_runs.map((run) => ({
        id: run.id,
        name: run.name,
        status: run.status as any,
        conclusion: run.conclusion as any,
        created_at: run.created_at,
        updated_at: run.updated_at,
        head_branch: run.head_branch,
        head_sha: run.head_sha,
        html_url: run.html_url,
      }));
    } catch (error) {
      console.error('Failed to get workflow runs:', error);
      return [];
    }
  }

  async getWorkflowRun(runId: number): Promise<WorkflowRun | null> {
    try {
      const response = await this.octokit.rest.actions.getWorkflowRun({
        owner: this.owner,
        repo: this.repo,
        run_id: runId,
      });

      const run = response.data;
      return {
        id: run.id,
        name: run.name,
        status: run.status as any,
        conclusion: run.conclusion as any,
        created_at: run.created_at,
        updated_at: run.updated_at,
        head_branch: run.head_branch,
        head_sha: run.head_sha,
        html_url: run.html_url,
      };
    } catch (error) {
      console.error('Failed to get workflow run:', error);
      return null;
    }
  }

  async cancelWorkflowRun(runId: number): Promise<boolean> {
    try {
      await this.octokit.rest.actions.cancelWorkflowRun({
        owner: this.owner,
        repo: this.repo,
        run_id: runId,
      });

      console.log('Cancelled workflow run:', runId);
      return true;
    } catch (error) {
      console.error('Failed to cancel workflow run:', error);
      return false;
    }
  }

  async rerunWorkflow(runId: number): Promise<boolean> {
    try {
      await this.octokit.rest.actions.reRunWorkflow({
        owner: this.owner,
        repo: this.repo,
        run_id: runId,
      });

      console.log('Rerunning workflow:', runId);
      return true;
    } catch (error) {
      console.error('Failed to rerun workflow:', error);
      return false;
    }
  }

  async getWorkflowJobs(runId: number): Promise<
    Array<{
      id: number;
      name: string;
      status: string;
      conclusion: string | null;
      started_at: string;
      completed_at: string | null;
      html_url: string;
    }>
  > {
    try {
      const response = await this.octokit.rest.actions.listJobsForWorkflowRun({
        owner: this.owner,
        repo: this.repo,
        run_id: runId,
      });

      return response.data.jobs.map((job) => ({
        id: job.id,
        name: job.name,
        status: job.status,
        conclusion: job.conclusion,
        started_at: job.started_at,
        completed_at: job.completed_at,
        html_url: job.html_url,
      }));
    } catch (error) {
      console.error('Failed to get workflow jobs:', error);
      return [];
    }
  }

  async getWorkflowJobLogs(jobId: number): Promise<string> {
    try {
      const response =
        await this.octokit.rest.actions.downloadJobLogsForWorkflowRun({
          owner: this.owner,
          repo: this.repo,
          job_id: jobId,
        });

      // The response is typically a redirect URL or binary data
      // In a real implementation, you'd handle the download properly
      return 'Logs downloaded successfully';
    } catch (error) {
      console.error('Failed to get workflow job logs:', error);
      return 'Failed to download logs';
    }
  }

  async createDeploymentStatus(
    deploymentId: number,
    state:
      | 'error'
      | 'failure'
      | 'inactive'
      | 'in_progress'
      | 'queued'
      | 'pending'
      | 'success',
    targetUrl?: string,
    description?: string,
  ): Promise<boolean> {
    try {
      await this.octokit.rest.repos.createDeploymentStatus({
        owner: this.owner,
        repo: this.repo,
        deployment_id: deploymentId,
        state,
        target_url: targetUrl,
        description,
      });

      console.log('Created deployment status:', { deploymentId, state });
      return true;
    } catch (error) {
      console.error('Failed to create deployment status:', error);
      return false;
    }
  }

  async createDeployment(
    ref: string,
    environment: string = 'production',
    description?: string,
  ): Promise<{ id: number; url: string } | null> {
    try {
      const response = await this.octokit.rest.repos.createDeployment({
        owner: this.owner,
        repo: this.repo,
        ref,
        environment,
        description,
        auto_merge: false,
        required_contexts: [],
      });

      const deployment = response.data;
      return {
        id: deployment.id,
        url: deployment.url,
      };
    } catch (error) {
      console.error('Failed to create deployment:', error);
      return null;
    }
  }

  async getRepositorySecrets(): Promise<string[]> {
    try {
      const response = await this.octokit.rest.actions.listRepoSecrets({
        owner: this.owner,
        repo: this.repo,
      });

      return response.data.secrets.map((secret) => secret.name);
    } catch (error) {
      console.error('Failed to get repository secrets:', error);
      return [];
    }
  }

  async triggerWorkflow(
    workflowId: string,
    ref: string = 'main',
    inputs: Record<string, string> = {},
  ): Promise<boolean> {
    try {
      await this.octokit.rest.actions.createWorkflowDispatch({
        owner: this.owner,
        repo: this.repo,
        workflow_id: workflowId,
        ref,
        inputs,
      });

      console.log('Triggered workflow:', workflowId);
      return true;
    } catch (error) {
      console.error('Failed to trigger workflow:', error);
      return false;
    }
  }

  async getLatestDeploymentRun(): Promise<WorkflowRun | null> {
    try {
      const runs = await this.getWorkflowRuns('vercel-deploy.yml', 1);
      return runs.length > 0 ? runs[0] : null;
    } catch (error) {
      console.error('Failed to get latest deployment run:', error);
      return null;
    }
  }

  async waitForWorkflowCompletion(
    runId: number,
    timeoutMs: number = 300000, // 5 minutes
  ): Promise<WorkflowRun | null> {
    const startTime = Date.now();
    const pollInterval = 10000; // 10 seconds

    while (Date.now() - startTime < timeoutMs) {
      const run = await this.getWorkflowRun(runId);

      if (!run) {
        console.error('Workflow run not found:', runId);
        return null;
      }

      if (run.status === 'completed') {
        return run;
      }

      console.log(`Waiting for workflow completion... Status: ${run.status}`);
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    console.error('Workflow completion timeout:', runId);
    return null;
  }
}
