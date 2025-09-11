import {
  CoupleProfile,
  WeddingFile,
  TimelineEvent,
  SupplierConnection,
  SyncEvent,
  DataSyncRule,
} from '@/types/wedme/file-management';

// API client for WedSync integration
export class WedSyncAPIClient {
  private baseUrl: string;
  private apiKey: string;
  private organizationId: string;
  private timeout: number;

  constructor(config: {
    baseUrl: string;
    apiKey: string;
    organizationId: string;
    timeout?: number;
  }) {
    this.baseUrl = config.baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.apiKey = config.apiKey;
    this.organizationId = config.organizationId;
    this.timeout = config.timeout || 10000; // 10 seconds default
  }

  // Authentication and connection methods
  async authenticate(): Promise<{
    success: boolean;
    user: any;
    permissions: string[];
  }> {
    const response = await this.makeRequest('POST', '/auth/authenticate', {
      apiKey: this.apiKey,
      organizationId: this.organizationId,
    });

    return response;
  }

  async testConnection(): Promise<{
    status: string;
    latency: number;
    version: string;
  }> {
    const startTime = Date.now();

    try {
      const response = await this.makeRequest('GET', '/health');
      const latency = Date.now() - startTime;

      return {
        status: 'connected',
        latency,
        version: response.version || '1.0.0',
      };
    } catch (error) {
      return {
        status: 'error',
        latency: Date.now() - startTime,
        version: 'unknown',
      };
    }
  }

  // Client data synchronization
  async syncClientData(
    coupleProfile: CoupleProfile,
    direction: 'push' | 'pull' | 'sync',
  ): Promise<{
    success: boolean;
    clientId?: string;
    conflicts?: any[];
    lastModified?: string;
  }> {
    const endpoint = '/clients/sync';
    const payload = {
      direction,
      organizationId: this.organizationId,
      clientData: this.transformCoupleProfile(coupleProfile),
    };

    const response = await this.makeRequest('POST', endpoint, payload);
    return response;
  }

  async getClientData(clientId: string): Promise<any> {
    return await this.makeRequest('GET', `/clients/${clientId}`);
  }

  async updateClientData(
    clientId: string,
    updates: Partial<CoupleProfile>,
  ): Promise<any> {
    return await this.makeRequest('PATCH', `/clients/${clientId}`, {
      updates: this.transformCoupleProfile(updates),
    });
  }

  // Timeline synchronization
  async syncTimelineData(
    timeline: TimelineEvent[],
    clientId: string,
    direction: 'push' | 'pull' | 'sync',
  ): Promise<{
    success: boolean;
    timelineId?: string;
    events?: TimelineEvent[];
    conflicts?: any[];
  }> {
    const endpoint = `/clients/${clientId}/timeline/sync`;
    const payload = {
      direction,
      timeline: timeline.map(this.transformTimelineEvent),
    };

    const response = await this.makeRequest('POST', endpoint, payload);

    // Transform response timeline back to WedMe format
    if (response.events) {
      response.events = response.events.map(this.transformWedSyncTimelineEvent);
    }

    return response;
  }

  async getTimeline(clientId: string): Promise<TimelineEvent[]> {
    const response = await this.makeRequest(
      'GET',
      `/clients/${clientId}/timeline`,
    );
    return response.events?.map(this.transformWedSyncTimelineEvent) || [];
  }

  async updateTimelineEvent(
    clientId: string,
    eventId: string,
    updates: Partial<TimelineEvent>,
  ): Promise<TimelineEvent> {
    const response = await this.makeRequest(
      'PATCH',
      `/clients/${clientId}/timeline/${eventId}`,
      {
        updates: this.transformTimelineEvent(updates),
      },
    );

    return this.transformWedSyncTimelineEvent(response.event);
  }

  async createTimelineEvent(
    clientId: string,
    event: TimelineEvent,
  ): Promise<TimelineEvent> {
    const response = await this.makeRequest(
      'POST',
      `/clients/${clientId}/timeline`,
      {
        event: this.transformTimelineEvent(event),
      },
    );

    return this.transformWedSyncTimelineEvent(response.event);
  }

  // File synchronization
  async syncFiles(
    files: WeddingFile[],
    clientId: string,
    options: {
      uploadNew?: boolean;
      updateMetadata?: boolean;
      shareWithSuppliers?: boolean;
    } = {},
  ): Promise<{
    success: boolean;
    uploadedFiles?: string[];
    errors?: string[];
    sharedWithSuppliers?: string[];
  }> {
    const endpoint = `/clients/${clientId}/files/sync`;
    const payload = {
      files: files.map(this.transformWeddingFile),
      options,
    };

    const response = await this.makeRequest('POST', endpoint, payload);
    return response;
  }

  async uploadFile(
    clientId: string,
    file: WeddingFile,
    fileContent: Blob | Buffer,
  ): Promise<{
    success: boolean;
    fileId?: string;
    url?: string;
    sharedUrl?: string;
  }> {
    // Create multipart form data
    const formData = new FormData();
    formData.append('file', fileContent, file.name);
    formData.append(
      'metadata',
      JSON.stringify(this.transformWeddingFile(file)),
    );

    const response = await this.makeUploadRequest(
      `/clients/${clientId}/files/upload`,
      formData,
    );
    return response;
  }

  async getFileList(
    clientId: string,
    filters?: {
      type?: string;
      tag?: string;
      dateRange?: { start: string; end: string };
    },
  ): Promise<WeddingFile[]> {
    let endpoint = `/clients/${clientId}/files`;

    if (filters) {
      const params = new URLSearchParams();
      if (filters.type) params.append('type', filters.type);
      if (filters.tag) params.append('tag', filters.tag);
      if (filters.dateRange) {
        params.append('start_date', filters.dateRange.start);
        params.append('end_date', filters.dateRange.end);
      }
      endpoint += `?${params.toString()}`;
    }

    const response = await this.makeRequest('GET', endpoint);
    return response.files?.map(this.transformWedSyncFile) || [];
  }

  async shareFileWithSupplier(
    clientId: string,
    fileId: string,
    supplierId: string,
    permissions: string[] = ['read'],
  ): Promise<{ success: boolean; shareId?: string; expiresAt?: string }> {
    const endpoint = `/clients/${clientId}/files/${fileId}/share`;
    const payload = {
      supplierId,
      permissions,
      expiresIn: 30 * 24 * 60 * 60, // 30 days
    };

    const response = await this.makeRequest('POST', endpoint, payload);
    return response;
  }

  // Supplier connection management
  async getConnectedSuppliers(clientId: string): Promise<SupplierConnection[]> {
    const response = await this.makeRequest(
      'GET',
      `/clients/${clientId}/suppliers`,
    );
    return response.suppliers?.map(this.transformWedSyncSupplier) || [];
  }

  async inviteSupplier(
    clientId: string,
    supplierInfo: {
      email: string;
      name: string;
      type: string;
      permissions: string[];
      personalMessage?: string;
    },
  ): Promise<{
    success: boolean;
    invitationId?: string;
    supplierId?: string;
    invitationUrl?: string;
  }> {
    const endpoint = `/clients/${clientId}/suppliers/invite`;
    const response = await this.makeRequest('POST', endpoint, supplierInfo);
    return response;
  }

  async acceptSupplierInvitation(invitationId: string): Promise<{
    success: boolean;
    supplierId?: string;
    clientId?: string;
  }> {
    const endpoint = `/suppliers/invitations/${invitationId}/accept`;
    const response = await this.makeRequest('POST', endpoint);
    return response;
  }

  async updateSupplierPermissions(
    clientId: string,
    supplierId: string,
    permissions: string[],
  ): Promise<{ success: boolean }> {
    const endpoint = `/clients/${clientId}/suppliers/${supplierId}/permissions`;
    const response = await this.makeRequest('PATCH', endpoint, { permissions });
    return response;
  }

  // Communication synchronization
  async syncCommunications(
    clientId: string,
    communications: any[],
    direction: 'push' | 'pull' | 'sync',
  ): Promise<{
    success: boolean;
    syncedCount?: number;
    newMessages?: any[];
  }> {
    const endpoint = `/clients/${clientId}/communications/sync`;
    const payload = {
      direction,
      communications: communications.map(this.transformCommunication),
    };

    const response = await this.makeRequest('POST', endpoint, payload);
    return response;
  }

  async sendMessage(
    clientId: string,
    message: {
      to: string[];
      subject: string;
      content: string;
      type: 'email' | 'sms' | 'notification';
      attachments?: string[];
    },
  ): Promise<{
    success: boolean;
    messageId?: string;
    deliveryStatus?: string;
  }> {
    const endpoint = `/clients/${clientId}/communications/send`;
    const response = await this.makeRequest('POST', endpoint, message);
    return response;
  }

  async getMessages(
    clientId: string,
    filters?: {
      supplierId?: string;
      type?: string;
      since?: string;
    },
  ): Promise<any[]> {
    let endpoint = `/clients/${clientId}/communications`;

    if (filters) {
      const params = new URLSearchParams();
      if (filters.supplierId) params.append('supplier_id', filters.supplierId);
      if (filters.type) params.append('type', filters.type);
      if (filters.since) params.append('since', filters.since);
      endpoint += `?${params.toString()}`;
    }

    const response = await this.makeRequest('GET', endpoint);
    return response.messages || [];
  }

  // Webhook management
  async registerWebhook(
    events: string[],
    url: string,
    secret?: string,
  ): Promise<{
    success: boolean;
    webhookId?: string;
    verificationToken?: string;
  }> {
    const endpoint = '/webhooks/register';
    const payload = {
      organizationId: this.organizationId,
      events,
      url,
      secret,
    };

    const response = await this.makeRequest('POST', endpoint, payload);
    return response;
  }

  async updateWebhook(
    webhookId: string,
    updates: {
      events?: string[];
      url?: string;
      active?: boolean;
    },
  ): Promise<{ success: boolean }> {
    const endpoint = `/webhooks/${webhookId}`;
    const response = await this.makeRequest('PATCH', endpoint, updates);
    return response;
  }

  async getWebhooks(): Promise<any[]> {
    const endpoint = '/webhooks';
    const response = await this.makeRequest('GET', endpoint);
    return response.webhooks || [];
  }

  // Real-time sync status
  async getSyncStatus(clientId: string): Promise<{
    status: string;
    lastSync: string;
    nextSync?: string;
    pendingChanges: number;
    conflicts: any[];
  }> {
    const endpoint = `/clients/${clientId}/sync/status`;
    const response = await this.makeRequest('GET', endpoint);
    return response;
  }

  async triggerSync(
    clientId: string,
    dataTypes: string[] = ['all'],
  ): Promise<{
    success: boolean;
    syncId?: string;
    estimatedDuration?: number;
  }> {
    const endpoint = `/clients/${clientId}/sync/trigger`;
    const payload = { dataTypes };
    const response = await this.makeRequest('POST', endpoint, payload);
    return response;
  }

  // Analytics and reporting
  async getSyncAnalytics(
    clientId: string,
    dateRange: { start: string; end: string },
  ): Promise<{
    totalSyncs: number;
    successfulSyncs: number;
    failedSyncs: number;
    avgSyncTime: number;
    dataTypes: { [key: string]: number };
  }> {
    const endpoint = `/clients/${clientId}/analytics/sync`;
    const params = new URLSearchParams({
      start_date: dateRange.start,
      end_date: dateRange.end,
    });

    const response = await this.makeRequest('GET', `${endpoint}?${params}`);
    return response;
  }

  // Error handling and utilities
  async getErrorLogs(
    clientId: string,
    severity: 'error' | 'warning' | 'all' = 'all',
    limit: number = 50,
  ): Promise<any[]> {
    const endpoint = `/clients/${clientId}/logs`;
    const params = new URLSearchParams({
      severity,
      limit: limit.toString(),
    });

    const response = await this.makeRequest('GET', `${endpoint}?${params}`);
    return response.logs || [];
  }

  // Private utility methods
  private async makeRequest(
    method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: any,
  ): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'X-Organization-ID': this.organizationId,
      'User-Agent': 'WedMe-Integration/1.0',
    };

    const config: RequestInit = {
      method,
      headers,
      signal: AbortSignal.timeout(this.timeout),
    };

    if (data && method !== 'GET') {
      config.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new WedSyncAPIError(
          response.status,
          errorData.message || response.statusText,
          errorData.code,
          errorData.details,
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof WedSyncAPIError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new WedSyncAPIError(408, 'Request timeout', 'TIMEOUT');
        }
        throw new WedSyncAPIError(
          0,
          `Network error: ${error.message}`,
          'NETWORK_ERROR',
        );
      }

      throw new WedSyncAPIError(0, 'Unknown error occurred', 'UNKNOWN_ERROR');
    }
  }

  private async makeUploadRequest(
    endpoint: string,
    formData: FormData,
  ): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      'X-Organization-ID': this.organizationId,
      'User-Agent': 'WedMe-Integration/1.0',
      // Don't set Content-Type for FormData - let the browser set it with boundary
    };

    const config: RequestInit = {
      method: 'POST',
      headers,
      body: formData,
      signal: AbortSignal.timeout(this.timeout * 3), // Longer timeout for uploads
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new WedSyncAPIError(
          response.status,
          errorData.message || response.statusText,
          errorData.code,
          errorData.details,
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof WedSyncAPIError) {
        throw error;
      }

      throw new WedSyncAPIError(0, `Upload failed: ${error}`, 'UPLOAD_ERROR');
    }
  }

  // Data transformation methods
  private transformCoupleProfile(profile: Partial<CoupleProfile>): any {
    return {
      id: profile.id,
      names: {
        partner1: profile.partner1Name,
        partner2: profile.partner2Name,
      },
      contact: {
        email: profile.email,
        phone: profile.phone,
        address: profile.address,
      },
      wedding: {
        date: profile.weddingDate,
        venue: profile.venue,
        location: profile.weddingLocation,
        style: profile.weddingStyle,
        budget: profile.budget,
      },
      preferences: profile.preferences,
      timeline: profile.timeline,
    };
  }

  private transformTimelineEvent(event: Partial<TimelineEvent>): any {
    return {
      id: event.id,
      title: event.name,
      description: event.description,
      start_time: event.startTime,
      end_time: event.endTime,
      location: event.location,
      type: event.type,
      supplier_id: event.supplierId,
      notes: event.notes,
      status: event.status,
      reminder: event.reminder,
    };
  }

  private transformWedSyncTimelineEvent(event: any): TimelineEvent {
    return {
      id: event.id,
      name: event.title,
      description: event.description,
      startTime: event.start_time,
      endTime: event.end_time,
      location: event.location,
      type: event.type,
      supplierId: event.supplier_id,
      notes: event.notes,
      status: event.status,
      reminder: event.reminder,
    };
  }

  private transformWeddingFile(file: Partial<WeddingFile>): any {
    return {
      id: file.id,
      name: file.name,
      type: file.type,
      size: file.size,
      url: file.url,
      thumbnail_url: file.thumbnailUrl,
      upload_date: file.uploadDate,
      tags: file.tags,
      privacy_level: file.privacyLevel,
      shared_with: file.sharedWith,
      metadata: file.metadata,
    };
  }

  private transformWedSyncFile(file: any): WeddingFile {
    return {
      id: file.id,
      name: file.name,
      type: file.type,
      size: file.size,
      url: file.url,
      thumbnailUrl: file.thumbnail_url,
      uploadDate: file.upload_date,
      tags: file.tags,
      privacyLevel: file.privacy_level,
      sharedWith: file.shared_with,
      metadata: file.metadata,
    };
  }

  private transformWedSyncSupplier(supplier: any): SupplierConnection {
    return {
      id: supplier.id,
      name: supplier.name,
      type: supplier.type,
      email: supplier.email,
      wedSyncUserId: supplier.user_id,
      status: supplier.status,
      permissions: supplier.permissions,
      connectedAt: supplier.connected_at,
      lastSync: supplier.last_sync,
      pendingChanges: supplier.pending_changes || 0,
    };
  }

  private transformCommunication(comm: any): any {
    return {
      id: comm.id,
      type: comm.type,
      subject: comm.subject,
      content: comm.content,
      from: comm.from,
      to: comm.to,
      timestamp: comm.timestamp,
      thread_id: comm.threadId,
      attachments: comm.attachments,
    };
  }
}

// Custom error class for API errors
export class WedSyncAPIError extends Error {
  public readonly status: number;
  public readonly code?: string;
  public readonly details?: any;

  constructor(status: number, message: string, code?: string, details?: any) {
    super(message);
    this.name = 'WedSyncAPIError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  public isNetworkError(): boolean {
    return this.status === 0;
  }

  public isTimeout(): boolean {
    return this.code === 'TIMEOUT';
  }

  public isAuthenticationError(): boolean {
    return this.status === 401 || this.status === 403;
  }

  public isRateLimited(): boolean {
    return this.status === 429;
  }

  public isServerError(): boolean {
    return this.status >= 500;
  }
}

// Factory function and utilities
export function createWedSyncAPIClient(config: {
  baseUrl: string;
  apiKey: string;
  organizationId: string;
  timeout?: number;
}): WedSyncAPIClient {
  return new WedSyncAPIClient(config);
}

export function isWedSyncAPIError(error: any): error is WedSyncAPIError {
  return error instanceof WedSyncAPIError;
}

// Retry wrapper for API calls
export async function withRetry<T>(
  apiCall: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000,
): Promise<T> {
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      lastError = error;

      // Don't retry for certain error types
      if (isWedSyncAPIError(error)) {
        if (error.isAuthenticationError() || error.status === 400) {
          throw error; // Don't retry authentication or bad request errors
        }
      }

      // If this was the last attempt, throw the error
      if (attempt === maxRetries) {
        throw lastError;
      }

      // Wait before retrying with exponential backoff
      const delay = delayMs * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

// Batch operations helper
export class WedSyncBatchOperations {
  private client: WedSyncAPIClient;
  private batchSize: number;

  constructor(client: WedSyncAPIClient, batchSize: number = 10) {
    this.client = client;
    this.batchSize = batchSize;
  }

  async syncMultipleFiles(
    clientId: string,
    files: WeddingFile[],
  ): Promise<{
    successful: string[];
    failed: { fileId: string; error: string }[];
  }> {
    const successful: string[] = [];
    const failed: { fileId: string; error: string }[] = [];

    // Process files in batches
    for (let i = 0; i < files.length; i += this.batchSize) {
      const batch = files.slice(i, i + this.batchSize);

      const batchPromises = batch.map(async (file) => {
        try {
          const result = await this.client.syncFiles([file], clientId);
          if (result.success) {
            successful.push(file.id);
          } else {
            failed.push({
              fileId: file.id,
              error: result.errors?.join(', ') || 'Unknown error',
            });
          }
        } catch (error) {
          failed.push({
            fileId: file.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

      await Promise.all(batchPromises);

      // Add delay between batches to avoid rate limiting
      if (i + this.batchSize < files.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    return { successful, failed };
  }

  async inviteMultipleSuppliers(
    clientId: string,
    suppliers: Array<{
      email: string;
      name: string;
      type: string;
      permissions: string[];
    }>,
  ): Promise<{
    successful: Array<{ email: string; invitationId: string }>;
    failed: Array<{ email: string; error: string }>;
  }> {
    const successful: Array<{ email: string; invitationId: string }> = [];
    const failed: Array<{ email: string; error: string }> = [];

    for (const supplier of suppliers) {
      try {
        const result = await this.client.inviteSupplier(clientId, supplier);
        if (result.success && result.invitationId) {
          successful.push({
            email: supplier.email,
            invitationId: result.invitationId,
          });
        } else {
          failed.push({
            email: supplier.email,
            error: 'Invitation failed',
          });
        }
      } catch (error) {
        failed.push({
          email: supplier.email,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      // Add delay between invitations
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    return { successful, failed };
  }
}

// Configuration helper
export function createWedSyncConfig(
  environment: 'development' | 'staging' | 'production',
  apiKey: string,
  organizationId: string,
): {
  baseUrl: string;
  apiKey: string;
  organizationId: string;
  timeout: number;
} {
  const baseUrls = {
    development: 'https://api.dev.wedsync.com/v1',
    staging: 'https://api.staging.wedsync.com/v1',
    production: 'https://api.wedsync.com/v1',
  };

  return {
    baseUrl: baseUrls[environment],
    apiKey,
    organizationId,
    timeout: environment === 'development' ? 30000 : 10000,
  };
}
