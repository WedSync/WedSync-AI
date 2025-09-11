/**
 * CRM Integrations API Client
 * WS-343 - Team A - Round 1
 *
 * Client-side functions for managing CRM integrations
 */

// Types
import type {
  CRMIntegration,
  CRMProvider,
  CRMSyncJob,
  FieldMapping,
  CRMField,
  WedSyncField,
  SyncLogEntry,
  SyncMetrics,
} from '@/types/crm';

/**
 * Get all CRM integrations for an organization
 */
export async function getCRMIntegrations(
  organizationId: string,
): Promise<CRMIntegration[]> {
  const response = await fetch('/api/crm/integrations', {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch CRM integrations');
  }

  return response.json();
}

/**
 * Get a specific CRM integration by ID
 */
export async function getCRMIntegration(
  integrationId: string,
): Promise<CRMIntegration | null> {
  const response = await fetch(`/api/crm/integrations/${integrationId}`, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error('Failed to fetch CRM integration');
  }

  return response.json();
}

/**
 * Create a new CRM integration
 */
export async function createCRMIntegration(data: {
  crm_provider: string;
  connection_name: string;
  auth_config: any;
  sync_config: any;
}): Promise<CRMIntegration> {
  const response = await fetch('/api/crm/integrations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create CRM integration');
  }

  return response.json();
}

/**
 * Update a CRM integration
 */
export async function updateCRMIntegration(
  integrationId: string,
  data: Partial<CRMIntegration>,
): Promise<CRMIntegration> {
  const response = await fetch(`/api/crm/integrations/${integrationId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update CRM integration');
  }

  return response.json();
}

/**
 * Delete a CRM integration
 */
export async function deleteCRMIntegration(
  integrationId: string,
): Promise<void> {
  const response = await fetch(`/api/crm/integrations/${integrationId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to delete CRM integration');
  }
}

/**
 * Test CRM integration connection
 */
export async function testCRMConnection(
  integrationId: string,
): Promise<{ success: boolean; message?: string }> {
  const response = await fetch(`/api/crm/integrations/${integrationId}/test`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to test CRM connection');
  }

  return response.json();
}

/**
 * Trigger a sync job for a CRM integration
 */
export async function triggerCRMSync(
  integrationId: string,
  options: {
    job_type: 'full_sync' | 'incremental_sync' | 'test_sync';
    sync_direction?: 'import_only' | 'export_only' | 'bidirectional';
  },
): Promise<CRMSyncJob> {
  const response = await fetch(`/api/crm/integrations/${integrationId}/sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(options),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to trigger CRM sync');
  }

  return response.json();
}

/**
 * Get sync jobs for a CRM integration
 */
export async function getSyncJobs(
  integrationId: string,
  options: {
    status?: string;
    limit?: number;
    offset?: number;
  } = {},
): Promise<CRMSyncJob[]> {
  const searchParams = new URLSearchParams();

  if (options.status) searchParams.set('status', options.status);
  if (options.limit) searchParams.set('limit', options.limit.toString());
  if (options.offset) searchParams.set('offset', options.offset.toString());

  const response = await fetch(
    `/api/crm/integrations/${integrationId}/jobs?${searchParams}`,
    {
      headers: {
        'Content-Type': 'application/json',
      },
    },
  );

  if (!response.ok) {
    throw new Error('Failed to fetch sync jobs');
  }

  return response.json();
}

/**
 * Get sync job details
 */
export async function getSyncJob(jobId: string): Promise<CRMSyncJob> {
  const response = await fetch(`/api/crm/sync-jobs/${jobId}`, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch sync job details');
  }

  return response.json();
}

/**
 * Control sync job (pause, resume, cancel)
 */
export async function controlSyncJob(
  jobId: string,
  action: 'pause' | 'resume' | 'cancel',
): Promise<void> {
  const response = await fetch(`/api/crm/sync-jobs/${jobId}/${action}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `Failed to ${action} sync job`);
  }
}

/**
 * Get sync job logs
 */
export async function getSyncJobLogs(jobId: string): Promise<SyncLogEntry[]> {
  const response = await fetch(`/api/crm/sync-jobs/${jobId}/logs`, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch sync job logs');
  }

  return response.json();
}

/**
 * Get CRM fields for a provider
 */
export async function getCRMFields(
  provider: string,
  integrationId?: string,
): Promise<CRMField[]> {
  const searchParams = new URLSearchParams();
  if (integrationId) searchParams.set('integration_id', integrationId);

  const response = await fetch(
    `/api/crm/providers/${provider}/fields?${searchParams}`,
    {
      headers: {
        'Content-Type': 'application/json',
      },
    },
  );

  if (!response.ok) {
    throw new Error('Failed to fetch CRM fields');
  }

  return response.json();
}

/**
 * Get WedSync fields for mapping
 */
export async function getWedSyncFields(): Promise<WedSyncField[]> {
  const response = await fetch('/api/crm/wedsync-fields', {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch WedSync fields');
  }

  return response.json();
}

/**
 * Get field mappings for an integration
 */
export async function getFieldMappings(
  integrationId: string,
): Promise<FieldMapping[]> {
  const response = await fetch(
    `/api/crm/integrations/${integrationId}/mappings`,
    {
      headers: {
        'Content-Type': 'application/json',
      },
    },
  );

  if (!response.ok) {
    throw new Error('Failed to fetch field mappings');
  }

  return response.json();
}

/**
 * Save field mappings for an integration
 */
export async function saveFieldMappings(
  integrationId: string,
  mappings: FieldMapping[],
): Promise<void> {
  const response = await fetch(
    `/api/crm/integrations/${integrationId}/mappings`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ mappings }),
    },
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to save field mappings');
  }
}

/**
 * Get sync metrics for an integration
 */
export async function getSyncMetrics(
  integrationId?: string,
): Promise<SyncMetrics> {
  const searchParams = new URLSearchParams();
  if (integrationId) searchParams.set('integration_id', integrationId);

  const response = await fetch(`/api/crm/metrics?${searchParams}`, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch sync metrics');
  }

  return response.json();
}

/**
 * Get available CRM providers
 */
export async function getCRMProviders(): Promise<Record<string, CRMProvider>> {
  const response = await fetch('/api/crm/providers', {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch CRM providers');
  }

  return response.json();
}

/**
 * OAuth URL generation for CRM providers
 */
export async function getOAuthURL(
  provider: string,
  redirectUri: string,
): Promise<{ authUrl: string; state: string }> {
  const response = await fetch('/api/crm/oauth/auth-url', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      provider,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to generate OAuth URL');
  }

  return response.json();
}

/**
 * Handle OAuth callback and exchange code for tokens
 */
export async function handleOAuthCallback(
  provider: string,
  code: string,
  state: string,
  codeVerifier?: string,
): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_at?: string;
}> {
  const response = await fetch('/api/crm/oauth/callback', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      provider,
      code,
      state,
      code_verifier: codeVerifier,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to handle OAuth callback');
  }

  return response.json();
}
