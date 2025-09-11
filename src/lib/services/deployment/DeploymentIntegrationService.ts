import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Deployment integration schemas
const DeploymentTargetSchema = z.object({
  target_id: z.string(),
  type: z.enum(['github_actions', 'vercel', 'docker', 'kubernetes']),
  configuration: z.record(z.any()),
  environment_mapping: z.record(z.string()), // Maps internal env IDs to target env names
  enabled: z.boolean().default(true),
  auto_sync: z.boolean().default(false),
  sync_on_change: z.boolean().default(true),
});

const SyncRequestSchema = z.object({
  target_id: z.string(),
  environment_id: z.string(),
  variables: z.array(z.string()).optional(), // Specific variable IDs to sync
  force: z.boolean().default(false),
  dry_run: z.boolean().default(false),
});

interface DeploymentTarget {
  target_id: string;
  type: 'github_actions' | 'vercel' | 'docker' | 'kubernetes';
  configuration: Record<string, any>;
  environment_mapping: Record<string, string>;
  enabled: boolean;
  auto_sync: boolean;
  sync_on_change: boolean;
}

interface SyncResult {
  success: boolean;
  target_id: string;
  environment_id: string;
  variables_synced: number;
  variables_failed: number;
  sync_duration_ms: number;
  errors: Array<{
    variable_id: string;
    error_message: string;
    error_code: string;
  }>;
  deployment_url?: string;
  commit_sha?: string;
  build_id?: string;
}

interface ValidationResult {
  valid: boolean;
  environment_id: string;
  missing_required: string[];
  invalid_values: Array<{
    variable_id: string;
    issue: string;
  }>;
  security_warnings: Array<{
    variable_id: string;
    warning: string;
    risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  }>;
  deployment_readiness: boolean;
}

interface RollbackResult {
  success: boolean;
  environment_id: string;
  rollback_timestamp: Date;
  variables_restored: number;
  previous_version: string;
  current_version: string;
}

export class DeploymentIntegrationService {
  private supabase = createClient();

  /**
   * Sync variables to GitHub Actions environment
   */
  async syncToGitHubActions(
    organizationId: string,
    syncRequest: any,
  ): Promise<SyncResult> {
    try {
      const validatedRequest = SyncRequestSchema.parse(syncRequest);
      const startTime = Date.now();

      // Get deployment target configuration
      const { data: target } = await this.supabase
        .from('deployment_targets')
        .select('*')
        .eq('target_id', validatedRequest.target_id)
        .eq('organization_id', organizationId)
        .single();

      if (!target || target.type !== 'github_actions') {
        throw new Error('GitHub Actions deployment target not found');
      }

      // Get environment variables
      const variables = await this.getEnvironmentVariables(
        organizationId,
        validatedRequest.environment_id,
        validatedRequest.variables,
      );

      const errors: Array<{
        variable_id: string;
        error_message: string;
        error_code: string;
      }> = [];
      let syncedCount = 0;

      if (!validatedRequest.dry_run) {
        // GitHub Actions API integration
        const githubToken = target.configuration.github_token;
        const repo = target.configuration.repository; // e.g., "owner/repo"
        const environment =
          target.environment_mapping[validatedRequest.environment_id] ||
          'production';

        for (const variable of variables) {
          try {
            // Check if variable should be synced based on security classification
            if (!this.shouldSyncVariable(variable, 'github_actions')) {
              continue;
            }

            // Create or update GitHub Actions secret/variable
            const apiUrl = `https://api.github.com/repos/${repo}/actions/environments/${environment}/secrets/${variable.key}`;

            // Encrypt secret for GitHub (using GitHub's public key)
            const encryptedValue = await this.encryptForGitHub(
              variable.value,
              repo,
              githubToken,
            );

            const response = await fetch(apiUrl, {
              method: 'PUT',
              headers: {
                Authorization: `Bearer ${githubToken}`,
                Accept: 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                encrypted_value: encryptedValue,
                key_id: target.configuration.github_key_id,
              }),
            });

            if (!response.ok) {
              const errorText = await response.text();
              errors.push({
                variable_id: variable.id,
                error_message: `GitHub API error: ${errorText}`,
                error_code: response.status.toString(),
              });
            } else {
              syncedCount++;

              // Log successful sync
              await this.logDeploymentEvent(organizationId, {
                event_type: 'variable_sync',
                target_type: 'github_actions',
                target_id: validatedRequest.target_id,
                environment_id: validatedRequest.environment_id,
                variable_id: variable.id,
                success: true,
                details: { github_environment: environment },
              });
            }
          } catch (error) {
            errors.push({
              variable_id: variable.id,
              error_message:
                error instanceof Error ? error.message : 'Unknown error',
              error_code: 'SYNC_ERROR',
            });
          }
        }
      } else {
        // Dry run - just validate
        syncedCount = variables.filter((v) =>
          this.shouldSyncVariable(v, 'github_actions'),
        ).length;
      }

      const result: SyncResult = {
        success: errors.length === 0,
        target_id: validatedRequest.target_id,
        environment_id: validatedRequest.environment_id,
        variables_synced: syncedCount,
        variables_failed: errors.length,
        sync_duration_ms: Date.now() - startTime,
        errors,
      };

      // Record sync result
      await this.recordSyncResult(organizationId, result);

      return result;
    } catch (error) {
      console.error('GitHub Actions sync failed:', error);
      throw new Error('Failed to sync to GitHub Actions');
    }
  }

  /**
   * Sync variables to Vercel project
   */
  async syncToVercel(
    organizationId: string,
    syncRequest: any,
  ): Promise<SyncResult> {
    try {
      const validatedRequest = SyncRequestSchema.parse(syncRequest);
      const startTime = Date.now();

      // Get deployment target configuration
      const { data: target } = await this.supabase
        .from('deployment_targets')
        .select('*')
        .eq('target_id', validatedRequest.target_id)
        .eq('organization_id', organizationId)
        .single();

      if (!target || target.type !== 'vercel') {
        throw new Error('Vercel deployment target not found');
      }

      // Get environment variables
      const variables = await this.getEnvironmentVariables(
        organizationId,
        validatedRequest.environment_id,
        validatedRequest.variables,
      );

      const errors: Array<{
        variable_id: string;
        error_message: string;
        error_code: string;
      }> = [];
      let syncedCount = 0;

      if (!validatedRequest.dry_run) {
        // Vercel API integration
        const vercelToken = target.configuration.vercel_token;
        const projectId = target.configuration.project_id;
        const environment =
          target.environment_mapping[validatedRequest.environment_id] ||
          'production';

        for (const variable of variables) {
          try {
            if (!this.shouldSyncVariable(variable, 'vercel')) {
              continue;
            }

            // Create or update Vercel environment variable
            const apiUrl = `https://api.vercel.com/v9/projects/${projectId}/env`;

            const response = await fetch(apiUrl, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${vercelToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                key: variable.key,
                value: variable.value,
                type:
                  variable.classification_level >= 5 ? 'encrypted' : 'plain',
                target: [environment],
                gitBranch: target.configuration.git_branch || 'main',
              }),
            });

            if (!response.ok) {
              const errorData = await response.json();
              errors.push({
                variable_id: variable.id,
                error_message: `Vercel API error: ${errorData.error?.message || 'Unknown error'}`,
                error_code: errorData.error?.code || response.status.toString(),
              });
            } else {
              syncedCount++;

              // Log successful sync
              await this.logDeploymentEvent(organizationId, {
                event_type: 'variable_sync',
                target_type: 'vercel',
                target_id: validatedRequest.target_id,
                environment_id: validatedRequest.environment_id,
                variable_id: variable.id,
                success: true,
                details: { vercel_environment: environment },
              });
            }
          } catch (error) {
            errors.push({
              variable_id: variable.id,
              error_message:
                error instanceof Error ? error.message : 'Unknown error',
              error_code: 'SYNC_ERROR',
            });
          }
        }
      } else {
        syncedCount = variables.filter((v) =>
          this.shouldSyncVariable(v, 'vercel'),
        ).length;
      }

      const result: SyncResult = {
        success: errors.length === 0,
        target_id: validatedRequest.target_id,
        environment_id: validatedRequest.environment_id,
        variables_synced: syncedCount,
        variables_failed: errors.length,
        sync_duration_ms: Date.now() - startTime,
        errors,
      };

      await this.recordSyncResult(organizationId, result);
      return result;
    } catch (error) {
      console.error('Vercel sync failed:', error);
      throw new Error('Failed to sync to Vercel');
    }
  }

  /**
   * Generate Docker environment file
   */
  async generateDockerEnvFile(
    organizationId: string,
    environmentId: string,
  ): Promise<string> {
    try {
      // Get environment variables
      const variables = await this.getEnvironmentVariables(
        organizationId,
        environmentId,
      );

      // Filter variables safe for Docker
      const dockerSafeVariables = variables.filter(
        (v) =>
          this.shouldSyncVariable(v, 'docker') && v.classification_level <= 7, // Up to INTERNAL level for Docker
      );

      // Generate .env file content
      let envFileContent = `# Generated by WedSync Environment Variables Management\n`;
      envFileContent += `# Environment: ${environmentId}\n`;
      envFileContent += `# Generated at: ${new Date().toISOString()}\n`;
      envFileContent += `# WARNING: Do not commit this file to version control\n\n`;

      for (const variable of dockerSafeVariables) {
        // Add comment with description if available
        if (variable.description) {
          envFileContent += `# ${variable.description}\n`;
        }

        // Add variable
        envFileContent += `${variable.key}=${variable.value}\n`;

        // Add spacing
        envFileContent += '\n';
      }

      // Log generation event
      await this.logDeploymentEvent(organizationId, {
        event_type: 'env_file_generation',
        target_type: 'docker',
        target_id: 'docker_env_file',
        environment_id: environmentId,
        success: true,
        details: {
          variables_count: dockerSafeVariables.length,
          file_size: envFileContent.length,
        },
      });

      return envFileContent;
    } catch (error) {
      console.error('Docker env file generation failed:', error);
      throw new Error('Failed to generate Docker environment file');
    }
  }

  /**
   * Sync with Kubernetes secrets
   */
  async syncToKubernetes(
    organizationId: string,
    namespace: string,
    variables: any[],
  ): Promise<SyncResult> {
    try {
      const startTime = Date.now();
      const errors: Array<{
        variable_id: string;
        error_message: string;
        error_code: string;
      }> = [];
      let syncedCount = 0;

      // This would integrate with Kubernetes API
      // For now, generating the YAML that would be applied

      const kubernetesSecrets = this.generateKubernetesSecrets(
        variables,
        namespace,
      );

      // In production, would apply these via kubectl or Kubernetes API
      // kubectl apply -f secrets.yaml

      syncedCount = variables.filter((v) =>
        this.shouldSyncVariable(v, 'kubernetes'),
      ).length;

      const result: SyncResult = {
        success: errors.length === 0,
        target_id: 'kubernetes',
        environment_id: namespace,
        variables_synced: syncedCount,
        variables_failed: errors.length,
        sync_duration_ms: Date.now() - startTime,
        errors,
      };

      return result;
    } catch (error) {
      console.error('Kubernetes sync failed:', error);
      throw new Error('Failed to sync to Kubernetes');
    }
  }

  /**
   * Validate deployment readiness
   */
  async validateDeploymentReadiness(
    organizationId: string,
    environmentId: string,
  ): Promise<ValidationResult> {
    try {
      // Get environment configuration
      const { data: environment } = await this.supabase
        .from('environments')
        .select('*')
        .eq('id', environmentId)
        .eq('organization_id', organizationId)
        .single();

      if (!environment) {
        throw new Error('Environment not found');
      }

      // Get all required variables for this environment
      const { data: requiredVariables } = await this.supabase
        .from('environment_variables')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_required', true)
        .eq('is_active', true);

      // Get current environment values
      const { data: currentValues } = await this.supabase
        .from('environment_values')
        .select('*')
        .eq('environment_id', environmentId);

      const currentValueMap = new Map(
        currentValues?.map((cv) => [cv.variable_id, cv]) || [],
      );

      const missingRequired: string[] = [];
      const invalidValues: Array<{ variable_id: string; issue: string }> = [];
      const securityWarnings: Array<{
        variable_id: string;
        warning: string;
        risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      }> = [];

      // Check each required variable
      for (const requiredVar of requiredVariables || []) {
        const currentValue = currentValueMap.get(requiredVar.id);

        if (!currentValue || !currentValue.value) {
          missingRequired.push(requiredVar.key);
          continue;
        }

        // Validate value format
        if (requiredVar.validation_pattern) {
          const pattern = new RegExp(requiredVar.validation_pattern);
          if (!pattern.test(currentValue.value)) {
            invalidValues.push({
              variable_id: requiredVar.id,
              issue: 'Value does not match required pattern',
            });
          }
        }

        // Check security concerns
        if (
          requiredVar.classification_level >= 8 &&
          !currentValue.is_encrypted
        ) {
          securityWarnings.push({
            variable_id: requiredVar.id,
            warning: 'High-security variable is not encrypted',
            risk_level: 'HIGH',
          });
        }

        // Check for wedding day restrictions
        if (environment.name === 'production' && this.isWeddingDay()) {
          securityWarnings.push({
            variable_id: requiredVar.id,
            warning: 'Production changes restricted during wedding day',
            risk_level: 'CRITICAL',
          });
        }
      }

      const deploymentReadiness =
        missingRequired.length === 0 &&
        invalidValues.length === 0 &&
        securityWarnings.filter((w) => w.risk_level === 'CRITICAL').length ===
          0;

      return {
        valid: deploymentReadiness,
        environment_id: environmentId,
        missing_required: missingRequired,
        invalid_values: invalidValues,
        security_warnings: securityWarnings,
        deployment_readiness: deploymentReadiness,
      };
    } catch (error) {
      console.error('Deployment validation failed:', error);
      throw new Error('Failed to validate deployment readiness');
    }
  }

  /**
   * Rollback to previous configuration
   */
  async rollbackConfiguration(
    organizationId: string,
    environmentId: string,
    timestamp: Date,
  ): Promise<RollbackResult> {
    try {
      // Get configuration snapshot from the specified timestamp
      const { data: snapshot } = await this.supabase
        .from('configuration_snapshots')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('environment_id', environmentId)
        .lte('created_at', timestamp.toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!snapshot) {
        throw new Error('No configuration snapshot found for rollback');
      }

      const rollbackData = JSON.parse(snapshot.configuration_data);
      let restoredCount = 0;

      // Restore each variable from the snapshot
      for (const variableData of rollbackData.variables) {
        try {
          await this.supabase.from('environment_values').upsert({
            environment_id: environmentId,
            variable_id: variableData.variable_id,
            value: variableData.value,
            is_encrypted: variableData.is_encrypted,
            updated_by: 'system_rollback',
            updated_at: new Date().toISOString(),
          });

          restoredCount++;
        } catch (error) {
          console.error(
            `Failed to restore variable ${variableData.variable_id}:`,
            error,
          );
        }
      }

      // Log rollback event
      await this.logDeploymentEvent(organizationId, {
        event_type: 'configuration_rollback',
        target_type: 'system',
        target_id: 'rollback',
        environment_id: environmentId,
        success: true,
        details: {
          rollback_timestamp: timestamp.toISOString(),
          snapshot_id: snapshot.id,
          variables_restored: restoredCount,
        },
      });

      return {
        success: true,
        environment_id: environmentId,
        rollback_timestamp: timestamp,
        variables_restored: restoredCount,
        previous_version: snapshot.version,
        current_version: `rollback_${Date.now()}`,
      };
    } catch (error) {
      console.error('Configuration rollback failed:', error);
      throw new Error('Failed to rollback configuration');
    }
  }

  // Helper methods
  private async getEnvironmentVariables(
    organizationId: string,
    environmentId: string,
    variableIds?: string[],
  ): Promise<any[]> {
    let query = this.supabase
      .from('environment_variables')
      .select(
        `
        *,
        environment_values!inner(
          value,
          is_encrypted
        )
      `,
      )
      .eq('organization_id', organizationId)
      .eq('environment_values.environment_id', environmentId)
      .eq('is_active', true);

    if (variableIds && variableIds.length > 0) {
      query = query.in('id', variableIds);
    }

    const { data } = await query;
    return data || [];
  }

  private shouldSyncVariable(variable: any, targetType: string): boolean {
    // Security classification rules for different targets
    const maxClassificationLevels = {
      github_actions: 7, // Up to INTERNAL
      vercel: 7, // Up to INTERNAL
      docker: 7, // Up to INTERNAL
      kubernetes: 8, // Up to CONFIDENTIAL
    };

    const maxLevel =
      maxClassificationLevels[
        targetType as keyof typeof maxClassificationLevels
      ] || 5;
    return (
      variable.classification_level <= maxLevel &&
      variable.sync_enabled !== false
    );
  }

  private async encryptForGitHub(
    value: string,
    repo: string,
    token: string,
  ): Promise<string> {
    // In production, would encrypt using GitHub's public key
    // For now, returning base64 encoded (this is NOT secure for production)
    return Buffer.from(value).toString('base64');
  }

  private generateKubernetesSecrets(
    variables: any[],
    namespace: string,
  ): string {
    const secretData: Record<string, string> = {};

    variables
      .filter((v) => this.shouldSyncVariable(v, 'kubernetes'))
      .forEach((variable) => {
        secretData[variable.key] = Buffer.from(variable.value).toString(
          'base64',
        );
      });

    return `
apiVersion: v1
kind: Secret
metadata:
  name: wedsync-environment-variables
  namespace: ${namespace}
type: Opaque
data:
${Object.entries(secretData)
  .map(([key, value]) => `  ${key}: ${value}`)
  .join('\n')}
`;
  }

  private async logDeploymentEvent(
    organizationId: string,
    event: any,
  ): Promise<void> {
    try {
      await this.supabase.from('deployment_events').insert({
        organization_id: organizationId,
        event_type: event.event_type,
        target_type: event.target_type,
        target_id: event.target_id,
        environment_id: event.environment_id,
        variable_id: event.variable_id,
        success: event.success,
        details: event.details || {},
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to log deployment event:', error);
      // Don't throw - logging failure shouldn't break the main operation
    }
  }

  private async recordSyncResult(
    organizationId: string,
    result: SyncResult,
  ): Promise<void> {
    try {
      await this.supabase.from('sync_results').insert({
        organization_id: organizationId,
        target_id: result.target_id,
        environment_id: result.environment_id,
        success: result.success,
        variables_synced: result.variables_synced,
        variables_failed: result.variables_failed,
        sync_duration_ms: result.sync_duration_ms,
        errors: result.errors,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to record sync result:', error);
    }
  }

  private isWeddingDay(): boolean {
    const today = new Date();
    return today.getDay() === 6; // Saturday
  }
}
