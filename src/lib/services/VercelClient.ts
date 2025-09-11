// /src/lib/services/VercelClient.ts
export interface VercelClientConfig {
  token: string;
  teamId?: string;
}

export interface VercelDeployment {
  uid: string;
  name: string;
  url: string;
  created: number;
  state:
    | 'BUILDING'
    | 'ERROR'
    | 'INITIALIZING'
    | 'QUEUED'
    | 'READY'
    | 'CANCELED';
  target: 'production' | 'staging' | null;
  meta: {
    githubCommitSha?: string;
    githubCommitMessage?: string;
    githubCommitAuthorName?: string;
  };
}

export interface VercelProject {
  id: string;
  name: string;
  accountId: string;
  createdAt: number;
  updatedAt: number;
}

export class VercelClient {
  private token: string;
  private teamId?: string;
  private baseUrl = 'https://api.vercel.com';

  constructor(config: VercelClientConfig) {
    this.token = config.token;
    this.teamId = config.teamId;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.teamId) {
      headers['X-Vercel-Team-Id'] = this.teamId;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(
        `Vercel API error: ${response.status} ${response.statusText}`,
      );
    }

    return response.json();
  }

  async getDeployments(
    projectId?: string,
    limit: number = 20,
  ): Promise<VercelDeployment[]> {
    const params = new URLSearchParams();
    if (projectId) params.set('projectId', projectId);
    params.set('limit', limit.toString());

    const response = await this.request<{ deployments: VercelDeployment[] }>(
      `/v6/deployments?${params}`,
    );
    return response.deployments;
  }

  async getDeployment(deploymentId: string): Promise<VercelDeployment> {
    return this.request<VercelDeployment>(`/v13/deployments/${deploymentId}`);
  }

  async getDeploymentLogs(deploymentId: string): Promise<string[]> {
    try {
      const response = await this.request<{ logs: Array<{ message: string }> }>(
        `/v2/deployments/${deploymentId}/events`,
      );
      return response.logs.map((log) => log.message);
    } catch (error) {
      console.error('Failed to get deployment logs:', error);
      return ['Failed to retrieve deployment logs'];
    }
  }

  async promoteDeployment(deploymentId: string): Promise<boolean> {
    try {
      await this.request(`/v13/deployments/${deploymentId}/promote`, {
        method: 'POST',
      });
      return true;
    } catch (error) {
      console.error('Failed to promote deployment:', error);
      return false;
    }
  }

  async cancelDeployment(deploymentId: string): Promise<boolean> {
    try {
      await this.request(`/v12/deployments/${deploymentId}/cancel`, {
        method: 'PATCH',
      });
      return true;
    } catch (error) {
      console.error('Failed to cancel deployment:', error);
      return false;
    }
  }

  async getProjects(): Promise<VercelProject[]> {
    const response = await this.request<{ projects: VercelProject[] }>(
      '/v9/projects',
    );
    return response.projects;
  }

  async getProject(projectId: string): Promise<VercelProject> {
    return this.request<VercelProject>(`/v9/projects/${projectId}`);
  }

  async createDeployment(
    projectId: string,
    files: Record<string, string>,
  ): Promise<VercelDeployment> {
    const payload = {
      name: projectId,
      files: Object.entries(files).map(([path, content]) => ({
        file: path,
        data: content,
      })),
      target: 'production',
    };

    return this.request<VercelDeployment>('/v13/deployments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getDomains(
    projectId?: string,
  ): Promise<Array<{ name: string; verified: boolean }>> {
    const params = new URLSearchParams();
    if (projectId) params.set('projectId', projectId);

    const response = await this.request<{
      domains: Array<{ name: string; verified: boolean }>;
    }>(`/v5/domains?${params}`);
    return response.domains;
  }

  async getEnvironmentVariables(
    projectId: string,
  ): Promise<Array<{ key: string; value: string; target: string[] }>> {
    const response = await this.request<{
      envs: Array<{ key: string; value: string; target: string[] }>;
    }>(`/v9/projects/${projectId}/env`);
    return response.envs;
  }

  async setEnvironmentVariable(
    projectId: string,
    key: string,
    value: string,
    targets: string[] = ['production'],
  ): Promise<boolean> {
    try {
      await this.request(`/v10/projects/${projectId}/env`, {
        method: 'POST',
        body: JSON.stringify({
          key,
          value,
          target: targets,
          type: 'encrypted',
        }),
      });
      return true;
    } catch (error) {
      console.error('Failed to set environment variable:', error);
      return false;
    }
  }

  async getDeploymentBuilds(
    deploymentId: string,
  ): Promise<Array<{ id: string; use: string; status: string }>> {
    try {
      const response = await this.request<{
        builds: Array<{ id: string; use: string; status: string }>;
      }>(`/v1/deployments/${deploymentId}/builds`);
      return response.builds;
    } catch (error) {
      console.error('Failed to get deployment builds:', error);
      return [];
    }
  }

  async getTeamInfo(): Promise<{
    id: string;
    name: string;
    slug: string;
  } | null> {
    if (!this.teamId) return null;

    try {
      return this.request<{ id: string; name: string; slug: string }>(
        `/v2/teams/${this.teamId}`,
      );
    } catch (error) {
      console.error('Failed to get team info:', error);
      return null;
    }
  }
}
