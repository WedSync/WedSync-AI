// Mock Octokit interface for CI/CD integration
interface Octokit {
  repos: {
    createCommitStatus: (params: any) => Promise<any>;
  };
  checks: {
    create: (params: any) => Promise<any>;
  };
  actions: {
    createWorkflowDispatch: (params: any) => Promise<any>;
    getWorkflowRun: (params: any) => Promise<any>;
    listWorkflowRuns: (params: any) => Promise<any>;
    listWorkflowRunArtifacts: (params: any) => Promise<any>;
    cancelWorkflowRun: (params: any) => Promise<any>;
    downloadWorkflowRunLogs: (params: any) => Promise<any>;
  };
}

// Mock Octokit constructor
class MockOctokit implements Octokit {
  constructor(options: any) {
    console.log('Mock Octokit initialized with:', options.userAgent);
  }

  repos = {
    createCommitStatus: async (params: any) => ({ data: params }),
  };

  checks = {
    create: async (params: any) => ({ data: params }),
  };

  actions = {
    createWorkflowDispatch: async (params: any) => ({ data: params }),
    getWorkflowRun: async (params: any) => ({
      data: {
        workflow_id: 123,
        status: 'completed',
        conclusion: 'success',
      },
    }),
    listWorkflowRuns: async (params: any) => ({
      data: {
        workflow_runs: [
          {
            id: 456,
            workflow_id: 123,
            status: 'completed',
            conclusion: 'success',
          },
        ],
      },
    }),
    listWorkflowRunArtifacts: async (params: any) => ({
      data: {
        artifacts: [
          {
            name: 'performance-report',
            archive_download_url:
              'https://api.github.com/repos/test/test/actions/artifacts/123/zip',
            size_in_bytes: 1024,
          },
        ],
      },
    }),
    cancelWorkflowRun: async (params: any) => ({ data: params }),
    downloadWorkflowRunLogs: async (params: any) => ({ status: 200 }),
  };
}
import {
  PerformanceTestConfig,
  PerformanceMetrics,
  PerformanceViolation,
} from './performance-gate';

export interface WorkflowInputs {
  testType: string;
  environment: string;
  testDuration: number;
  userCount: number;
  buildId: string;
  gitHash: string;
}

export interface WorkflowResult {
  workflowId: string;
  runId: string;
  status: 'queued' | 'in_progress' | 'completed' | 'failed';
  conclusion?: 'success' | 'failure' | 'cancelled' | 'skipped';
  performanceResults?: PerformanceMetrics;
  artifacts?: WorkflowArtifact[];
}

export interface WorkflowArtifact {
  name: string;
  downloadUrl: string;
  size: number;
  type: 'performance-report' | 'lighthouse-results' | 'k6-output';
}

export interface GitHubStatusCheck {
  context: string;
  state: 'pending' | 'success' | 'error' | 'failure';
  description: string;
  targetUrl?: string;
}

/**
 * GitHub Actions integration for CI/CD performance testing workflow
 * Manages workflow triggers, status checks, and result processing
 */
export class GitHubActionsIntegration {
  private octokit: Octokit;
  private owner: string;
  private repo: string;

  constructor(
    token: string,
    owner: string = 'WedSync',
    repo: string = 'WedSync-2.0',
  ) {
    this.octokit = new MockOctokit({
      auth: token,
      userAgent: 'WedSync-Performance-CI/1.0',
    }) as any;
    this.owner = owner;
    this.repo = repo;
  }

  /**
   * Creates GitHub status check for performance validation
   * Prevents PR merge on performance test failures
   */
  async createStatusCheck(
    gitHash: string,
    status: GitHubStatusCheck['state'],
    description: string,
    violations?: PerformanceViolation[],
  ): Promise<void> {
    try {
      console.log(
        `📝 Creating GitHub status check: ${status} for commit ${gitHash}`,
      );

      const targetUrl =
        violations && violations.length > 0
          ? `${process.env.VERCEL_URL}/performance/report?commit=${gitHash}`
          : undefined;

      await this.octokit.repos.createCommitStatus({
        owner: this.owner,
        repo: this.repo,
        sha: gitHash,
        state: status,
        description: this.truncateDescription(description),
        context: 'ci/performance-validation',
        target_url: targetUrl,
      });

      // Add detailed check run for more information
      await this.createDetailedCheckRun(
        gitHash,
        status,
        description,
        violations,
      );

      console.log(`✅ GitHub status check created successfully`);
    } catch (error) {
      console.error(`❌ Failed to create GitHub status check:`, error);
      throw error;
    }
  }

  /**
   * Triggers GitHub Actions performance testing workflow
   * Returns workflow run ID for monitoring
   */
  async triggerPerformanceWorkflow(
    ref: string,
    inputs: WorkflowInputs,
  ): Promise<string> {
    try {
      console.log(`🚀 Triggering performance workflow for ref: ${ref}`);

      const response = await this.octokit.actions.createWorkflowDispatch({
        owner: this.owner,
        repo: this.repo,
        workflow_id: 'performance-validation.yml',
        ref: ref,
        inputs: {
          testType: inputs.testType,
          environment: inputs.environment,
          testDuration: inputs.testDuration.toString(),
          userCount: inputs.userCount.toString(),
          buildId: inputs.buildId,
          gitHash: inputs.gitHash,
        },
      });

      // Get the workflow run ID
      const workflowRunId = await this.getLatestWorkflowRunId(ref);

      console.log(`✅ Performance workflow triggered: ${workflowRunId}`);
      return workflowRunId;
    } catch (error) {
      console.error(`❌ Failed to trigger performance workflow:`, error);
      throw error;
    }
  }

  /**
   * Monitors workflow execution and returns results
   */
  async monitorWorkflowExecution(
    workflowRunId: string,
    timeoutMs: number = 300000, // 5 minutes
  ): Promise<WorkflowResult> {
    const startTime = Date.now();
    let lastStatus = '';

    console.log(`⏳ Monitoring workflow execution: ${workflowRunId}`);

    while (Date.now() - startTime < timeoutMs) {
      try {
        const run = await this.octokit.actions.getWorkflowRun({
          owner: this.owner,
          repo: this.repo,
          run_id: parseInt(workflowRunId),
        });

        const currentStatus = run.data.status;

        if (currentStatus !== lastStatus) {
          console.log(`🔄 Workflow status: ${currentStatus}`);
          lastStatus = currentStatus;
        }

        if (currentStatus === 'completed') {
          const artifacts = await this.getWorkflowArtifacts(workflowRunId);
          const performanceResults =
            await this.parsePerformanceResults(artifacts);

          return {
            workflowId: run.data.workflow_id.toString(),
            runId: workflowRunId,
            status: 'completed',
            conclusion: run.data.conclusion as any,
            performanceResults,
            artifacts,
          };
        }

        if (currentStatus === 'failed') {
          return {
            workflowId: run.data.workflow_id.toString(),
            runId: workflowRunId,
            status: 'failed',
            conclusion: 'failure',
          };
        }

        // Wait before next check
        await new Promise((resolve) => setTimeout(resolve, 10000)); // 10 seconds
      } catch (error) {
        console.error(`❌ Error monitoring workflow:`, error);
        break;
      }
    }

    throw new Error(`Workflow monitoring timeout after ${timeoutMs}ms`);
  }

  /**
   * Parses performance test results from GitHub Actions workflow artifacts
   */
  private async parseWorkflowResults(
    workflowRunId: string,
  ): Promise<PerformanceMetrics | undefined> {
    try {
      const artifacts = await this.getWorkflowArtifacts(workflowRunId);
      return await this.parsePerformanceResults(artifacts);
    } catch (error) {
      console.error(`❌ Failed to parse workflow results:`, error);
      return undefined;
    }
  }

  /**
   * Retrieves workflow artifacts containing performance test results
   */
  private async getWorkflowArtifacts(
    workflowRunId: string,
  ): Promise<WorkflowArtifact[]> {
    try {
      const response = await this.octokit.actions.listWorkflowRunArtifacts({
        owner: this.owner,
        repo: this.repo,
        run_id: parseInt(workflowRunId),
      });

      return response.data.artifacts.map((artifact) => ({
        name: artifact.name,
        downloadUrl: artifact.archive_download_url,
        size: artifact.size_in_bytes,
        type: this.determineArtifactType(artifact.name),
      }));
    } catch (error) {
      console.error(`❌ Failed to get workflow artifacts:`, error);
      return [];
    }
  }

  /**
   * Parses performance metrics from workflow artifacts
   */
  private async parsePerformanceResults(
    artifacts: WorkflowArtifact[],
  ): Promise<PerformanceMetrics | undefined> {
    const performanceArtifact = artifacts.find(
      (a) => a.type === 'performance-report',
    );
    if (!performanceArtifact) {
      console.log('📊 No performance report artifact found');
      return undefined;
    }

    try {
      // Download and parse performance results
      // In production, this would download and parse the actual artifact
      console.log(
        `📊 Parsing performance results from: ${performanceArtifact.name}`,
      );

      // Mock performance results - in production, parse actual artifact content
      const mockResults: PerformanceMetrics = {
        responseTime: Math.random() * 2000 + 500,
        errorRate: Math.random() * 0.05,
        throughput: Math.random() * 200 + 50,
        coreWebVitals: {
          LCP: Math.random() * 3000 + 1000,
          FID: Math.random() * 200 + 50,
          CLS: Math.random() * 0.2,
          TTFB: Math.random() * 800 + 200,
        },
        timestamp: new Date(),
        testId: `github_workflow_${Date.now()}`,
        environment: 'ci',
      };

      return mockResults;
    } catch (error) {
      console.error(`❌ Failed to parse performance results:`, error);
      return undefined;
    }
  }

  /**
   * Creates detailed check run with performance violation information
   */
  private async createDetailedCheckRun(
    gitHash: string,
    status: GitHubStatusCheck['state'],
    description: string,
    violations?: PerformanceViolation[],
  ): Promise<void> {
    try {
      const checkStatus = status === 'success' ? 'completed' : 'completed';
      const conclusion = status === 'success' ? 'success' : 'failure';

      let summary = description;
      let text = '';

      if (violations && violations.length > 0) {
        summary = `Performance validation failed with ${violations.length} violations`;
        text = this.formatViolationsForCheckRun(violations);
      } else {
        summary =
          'Performance validation passed - all metrics within acceptable ranges';
        text =
          'All performance tests completed successfully. No performance budget violations detected.';
      }

      await this.octokit.checks.create({
        owner: this.owner,
        repo: this.repo,
        name: 'Performance Validation',
        head_sha: gitHash,
        status: checkStatus,
        conclusion: conclusion as any,
        output: {
          title: 'Wedding Platform Performance Validation',
          summary,
          text,
        },
      });

      console.log(`✅ Detailed check run created for commit ${gitHash}`);
    } catch (error) {
      console.error(`❌ Failed to create detailed check run:`, error);
      // Don't throw - this is supplementary to the status check
    }
  }

  /**
   * Formats performance violations for GitHub check run display
   */
  private formatViolationsForCheckRun(
    violations: PerformanceViolation[],
  ): string {
    let text = '## Performance Issues Detected\n\n';
    text +=
      'The following performance metrics exceeded acceptable thresholds:\n\n';

    violations.forEach((violation, index) => {
      const severity = this.getSeverityEmoji(violation.severity);
      text += `### ${severity} ${violation.metric}\n`;
      text += `- **Threshold**: ${violation.threshold}\n`;
      text += `- **Actual**: ${violation.actual}\n`;
      text += `- **Impact**: ${violation.impact}\n\n`;
    });

    text += '## Wedding Platform Context\n';
    text += 'These performance issues could affect:\n';
    text += '- Wedding couples planning their special day\n';
    text += '- Photographers uploading and managing photo galleries\n';
    text += '- Vendors coordinating wedding services\n';
    text += '- Timeline and guest management functionality\n\n';

    text += '## Next Steps\n';
    text += '1. Review the performance recommendations\n';
    text += '2. Optimize the identified issues\n';
    text += '3. Re-run performance tests\n';
    text += '4. Ensure all metrics pass before deployment\n';

    return text;
  }

  /**
   * Gets the latest workflow run ID for a given ref
   */
  private async getLatestWorkflowRunId(ref: string): Promise<string> {
    try {
      const runs = await this.octokit.actions.listWorkflowRuns({
        owner: this.owner,
        repo: this.repo,
        workflow_id: 'performance-validation.yml',
        branch: ref,
        per_page: 1,
      });

      if (runs.data.workflow_runs.length > 0) {
        return runs.data.workflow_runs[0].id.toString();
      }

      throw new Error(`No workflow runs found for ref: ${ref}`);
    } catch (error) {
      console.error(`❌ Failed to get latest workflow run ID:`, error);
      throw error;
    }
  }

  /**
   * Determines artifact type based on name
   */
  private determineArtifactType(name: string): WorkflowArtifact['type'] {
    if (name.includes('lighthouse')) return 'lighthouse-results';
    if (name.includes('k6')) return 'k6-output';
    return 'performance-report';
  }

  /**
   * Gets emoji for severity level
   */
  private getSeverityEmoji(severity: string): string {
    switch (severity) {
      case 'critical':
        return '🚨';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      default:
        return 'ℹ️';
    }
  }

  /**
   * Truncates description to GitHub's 140 character limit
   */
  private truncateDescription(description: string): string {
    return description.length > 140
      ? description.substring(0, 137) + '...'
      : description;
  }

  /**
   * Public utility methods
   */

  /**
   * Lists all performance workflow runs for a branch
   */
  async listPerformanceWorkflowRuns(
    branch?: string,
    limit: number = 10,
  ): Promise<WorkflowResult[]> {
    try {
      const runs = await this.octokit.actions.listWorkflowRuns({
        owner: this.owner,
        repo: this.repo,
        workflow_id: 'performance-validation.yml',
        branch,
        per_page: limit,
      });

      return runs.data.workflow_runs.map((run) => ({
        workflowId: run.workflow_id.toString(),
        runId: run.id.toString(),
        status: run.status as any,
        conclusion: run.conclusion as any,
      }));
    } catch (error) {
      console.error(`❌ Failed to list workflow runs:`, error);
      return [];
    }
  }

  /**
   * Cancels a running performance workflow
   */
  async cancelWorkflowRun(workflowRunId: string): Promise<void> {
    try {
      await this.octokit.actions.cancelWorkflowRun({
        owner: this.owner,
        repo: this.repo,
        run_id: parseInt(workflowRunId),
      });

      console.log(`🛑 Cancelled workflow run: ${workflowRunId}`);
    } catch (error) {
      console.error(`❌ Failed to cancel workflow run:`, error);
      throw error;
    }
  }

  /**
   * Retrieves workflow run logs for debugging
   */
  async getWorkflowRunLogs(workflowRunId: string): Promise<string> {
    try {
      const response = await this.octokit.actions.downloadWorkflowRunLogs({
        owner: this.owner,
        repo: this.repo,
        run_id: parseInt(workflowRunId),
      });

      // In production, this would return the actual log content
      return `Workflow logs for run ${workflowRunId} (${response.status})`;
    } catch (error) {
      console.error(`❌ Failed to get workflow logs:`, error);
      return 'Failed to retrieve workflow logs';
    }
  }
}

export default GitHubActionsIntegration;
