export interface CRMIntegration {
  id: string;
  organization_id: string;
  crm_provider: 'tave' | 'lightblue' | 'honeybook';
  connection_status: 'connected' | 'disconnected' | 'error';
  auth_config: {
    accessToken?: string;
    refreshToken?: string;
    apiKey?: string;
    username?: string;
    password?: string;
    [key: string]: any;
  };
  field_mappings: Record<string, string>;
  last_sync_at: string | null;
  last_sync_status: 'success' | 'failed' | 'pending' | null;
  sync_error_details?: {
    message: string;
    timestamp: string;
  };
  created_at: string;
  updated_at: string;
}

export interface CRMSyncJob {
  id: string;
  integration_id: string;
  organization_id: string;
  job_type: 'full_import' | 'incremental_sync' | 'export_to_crm';
  job_config: {
    clients?: any[];
    clientIds?: string[];
    [key: string]: any;
  };
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress_percent?: number;
  records_processed?: number;
  records_total?: number;
  error_details?: {
    message: string;
    stack?: string;
    timestamp: string;
  };
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CRMClient {
  id: string;
  organization_id: string;
  integration_id?: string;
  external_crm_id?: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  wedding_date?: string;
  status: 'active' | 'archived' | 'lead';
  imported_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CRMProvider {
  name: string;
  displayName: string;
  authType: 'oauth' | 'api_key' | 'credentials' | 'scraping';
  capabilities: {
    import: boolean;
    export: boolean;
    incremental_sync: boolean;
    webhooks: boolean;
  };
  rateLimits: {
    requestsPerMinute: number;
    requestsPerHour?: number;
  };
  fieldMappings: {
    [wedSyncField: string]: {
      crmField: string;
      required: boolean;
      type: 'string' | 'number' | 'date' | 'boolean';
    };
  };
}

export interface CRMSyncLog {
  id: string;
  integration_id: string;
  job_id: string;
  action: 'import' | 'export' | 'update' | 'delete';
  resource_type: 'client' | 'event' | 'contact';
  resource_id?: string;
  status: 'success' | 'failed' | 'skipped';
  error_message?: string;
  created_at: string;
}

export interface CRMWebhookEvent {
  id: string;
  integration_id: string;
  event_type: string;
  payload: any;
  processed: boolean;
  error_message?: string;
  created_at: string;
}
