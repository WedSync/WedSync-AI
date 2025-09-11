/**
 * WS-342 Real-Time Wedding Collaboration - Tave Integration Adapter
 * Team C: Integration & System Architecture
 */

import type {
  VendorSystemAdapter,
  VendorSyncResult,
  TimelineUpdateResult,
  WebhookProcessResult,
  VendorCapabilities,
  ConnectionTestResult,
  TaveSystemConfig,
  TaveJob,
  TaveClient,
  TaveTimelineEvent,
  TavePackage,
  TavePayment,
} from '../../types/vendor-systems';

import type {
  VendorAPIConfig,
  DataMappingRules,
  WebhookConfig,
  AuthResult,
  VendorData,
  PushResult,
  SubscriptionResult,
  UpdateCallback,
  DataQuery,
} from '../../types/integration';

export class TaveIntegrationAdapter implements VendorSystemAdapter {
  systemId = 'tave';
  systemType = 'photography_crm' as const;

  apiConfig: VendorAPIConfig = {
    baseUrl: 'https://api.tave.com/v2',
    apiVersion: 'v2',
    authMethod: 'api_key',
    rateLimits: {
      requestsPerMinute: 60,
      requestsPerHour: 1000,
    },
    timeout: 30000,
  };

  dataMapping: DataMappingRules = {
    fieldMappings: {
      'job.id': 'external_id',
      'job.client.firstName': 'client_first_name',
      'job.client.lastName': 'client_last_name',
      'job.client.email': 'client_email',
      'job.client.phone': 'client_phone',
      'job.eventDate': 'wedding_date',
      'job.venue': 'venue_name',
    },
    transformations: [
      {
        field: 'wedding_date',
        transformer: 'iso_date',
        parameters: { format: 'YYYY-MM-DD' },
      },
    ],
    validationRules: [
      {
        field: 'client_email',
        rules: ['required', 'email'],
        required: true,
      },
      {
        field: 'wedding_date',
        rules: ['required', 'future_date'],
        required: true,
      },
    ],
  };

  supportsRealTime = true;
  webSocketEndpoint = 'wss://realtime.tave.com/websocket';

  webhookEndpoints: WebhookConfig[] = [
    {
      endpoint: '/api/integrations/webhooks/tave',
      events: ['job.created', 'job.updated', 'job.deleted', 'payment.received'],
      secret: process.env.TAVE_WEBHOOK_SECRET || '',
      retryAttempts: 3,
    },
  ];

  private config: TaveSystemConfig | null = null;
  private isAuthenticated = false;

  constructor(config?: TaveSystemConfig) {
    this.config = config || null;
  }

  /**
   * Authenticate with Tave API
   */
  async authenticate(): Promise<AuthResult> {
    try {
      if (!this.config) {
        return {
          success: false,
          error: 'Tave configuration not provided',
        };
      }

      // Test API key with a simple request
      const response = await fetch(
        `${this.apiConfig.baseUrl}/studios/${this.config.studioId}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (response.ok) {
        this.isAuthenticated = true;
        return {
          success: true,
          token: this.config.apiKey,
          expiresAt: undefined, // API keys don't expire
        };
      } else {
        const errorData = await response.text();
        return {
          success: false,
          error: `Authentication failed: ${response.status} ${errorData}`,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication error',
      };
    }
  }

  /**
   * Fetch data from Tave
   */
  async fetchData(query: DataQuery): Promise<VendorData> {
    if (!this.isAuthenticated) {
      const authResult = await this.authenticate();
      if (!authResult.success) {
        throw new Error(`Authentication failed: ${authResult.error}`);
      }
    }

    try {
      let endpoint = '';

      switch (query.type) {
        case 'jobs':
          endpoint = `/studios/${this.config?.studioId}/jobs`;
          break;
        case 'clients':
          endpoint = `/studios/${this.config?.studioId}/clients`;
          break;
        case 'payments':
          endpoint = `/studios/${this.config?.studioId}/payments`;
          break;
        default:
          throw new Error(`Unsupported data type: ${query.type}`);
      }

      // Build query parameters
      const params = new URLSearchParams();
      if (query.limit) params.append('limit', query.limit.toString());
      if (query.offset) params.append('offset', query.offset.toString());
      if (query.sortBy) params.append('sort', query.sortBy);
      if (query.sortOrder) params.append('order', query.sortOrder);

      // Add filters
      if (query.filters) {
        Object.entries(query.filters).forEach(([key, value]) => {
          params.append(key, String(value));
        });
      }

      const url = `${this.apiConfig.baseUrl}${endpoint}?${params}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.config?.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(
          `Tave API error: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();

      return {
        systemId: this.systemId,
        dataType: query.type,
        records: Array.isArray(data) ? data : [data],
        lastModified: new Date(),
        version: '2.0',
      };
    } catch (error) {
      console.error('Tave fetch data failed:', error);
      throw error;
    }
  }

  /**
   * Push data to Tave
   */
  async pushData(data: VendorData): Promise<PushResult> {
    if (!this.isAuthenticated) {
      const authResult = await this.authenticate();
      if (!authResult.success) {
        throw new Error(`Authentication failed: ${authResult.error}`);
      }
    }

    let recordsUpdated = 0;
    let recordsCreated = 0;
    const errors: any[] = [];

    try {
      for (const record of data.records) {
        try {
          const result = await this.pushSingleRecord(data.dataType, record);
          if (result.created) {
            recordsCreated++;
          } else {
            recordsUpdated++;
          }
        } catch (error) {
          errors.push({
            recordId: record.id || 'unknown',
            error: error instanceof Error ? error.message : 'Unknown error',
            retryable: true,
          });
        }
      }

      return {
        success: errors.length === 0,
        recordsUpdated,
        recordsCreated,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      console.error('Tave push data failed:', error);
      throw error;
    }
  }

  /**
   * Subscribe to Tave updates
   */
  async subscribeToUpdates(
    callback: UpdateCallback,
  ): Promise<SubscriptionResult> {
    try {
      // TODO: Implement Tave webhook subscription
      // This would involve registering webhook endpoints with Tave

      return {
        success: true,
        subscriptionId: `tave_subscription_${Date.now()}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Subscription failed',
      };
    }
  }

  /**
   * Sync wedding data from Tave
   */
  async syncWeddingData(weddingId: string): Promise<VendorSyncResult> {
    try {
      console.log(`Syncing Tave data for wedding: ${weddingId}`);

      // Fetch job data from Tave
      const jobData = await this.fetchTaveJob(weddingId);

      if (!jobData) {
        return {
          success: false,
          syncedData: {},
          errors: [
            {
              type: 'network',
              message: 'Job not found in Tave',
              retryable: false,
            },
          ],
        };
      }

      // Transform Tave data to WedSync format
      const weddingData = await this.transformTaveJobToWeddingData(jobData);

      return {
        success: true,
        syncedData: weddingData,
      };
    } catch (error) {
      console.error('Tave wedding sync failed:', error);
      return {
        success: false,
        syncedData: {},
        errors: [
          {
            type: 'network',
            message: error instanceof Error ? error.message : 'Sync failed',
            retryable: true,
          },
        ],
      };
    }
  }

  /**
   * Update wedding timeline in Tave
   */
  async updateWeddingTimeline(
    externalId: string,
    timeline: any,
  ): Promise<TimelineUpdateResult> {
    try {
      const updatedEvents: string[] = [];
      const conflicts: any[] = [];

      // Convert WedSync timeline to Tave format
      const taveTimelineEvents = this.transformTimelineToTave(timeline);

      // Update each timeline event in Tave
      for (const event of taveTimelineEvents) {
        try {
          await this.updateTaveTimelineEvent(externalId, event);
          updatedEvents.push(event.id);
        } catch (error) {
          conflicts.push({
            eventId: event.id,
            conflictType: 'update_failed',
            details: error instanceof Error ? error.message : 'Update failed',
          });
        }
      }

      return {
        success: conflicts.length === 0,
        updatedEvents,
        conflicts: conflicts.length > 0 ? conflicts : undefined,
      };
    } catch (error) {
      return {
        success: false,
        updatedEvents: [],
        error:
          error instanceof Error ? error.message : 'Timeline update failed',
      };
    }
  }

  /**
   * Handle Tave webhook
   */
  async handleWebhook(webhookData: any): Promise<WebhookProcessResult> {
    try {
      const processedEvents = [];
      const errors: any[] = [];

      const event = this.parseTaveWebhook(webhookData);

      if (event) {
        processedEvents.push({
          eventType: event.type,
          weddingId: event.jobId,
          data: event.data,
          processed: true,
        });

        // Trigger real-time sync if this is a wedding-related event
        if (event.type === 'job_updated' && event.jobId) {
          // This would trigger a real-time sync via the orchestrator
          console.log(`Tave job updated: ${event.jobId}`, event.data);
        }
      }

      return {
        success: true,
        processedEvents,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      return {
        success: false,
        processedEvents: [],
        errors: [
          {
            error:
              error instanceof Error
                ? error.message
                : 'Webhook processing failed',
            eventData: webhookData,
            retryable: true,
          },
        ],
      };
    }
  }

  /**
   * Get system capabilities
   */
  getCapabilities(): VendorCapabilities {
    return {
      supportsRealTimeSync: true,
      supportsWebhooks: true,
      supportedDataTypes: [
        'jobs',
        'clients',
        'payments',
        'timeline',
        'packages',
      ],
      supportedOperations: [
        { operation: 'read', dataType: 'jobs', supported: true },
        { operation: 'write', dataType: 'jobs', supported: true },
        { operation: 'read', dataType: 'clients', supported: true },
        { operation: 'write', dataType: 'clients', supported: true },
        { operation: 'read', dataType: 'payments', supported: true },
        { operation: 'read', dataType: 'timeline', supported: true },
        { operation: 'write', dataType: 'timeline', supported: true },
      ],
      rateLimits: {
        requestsPerMinute: 60,
        requestsPerHour: 1000,
      },
    };
  }

  /**
   * Test connection to Tave
   */
  async testConnection(): Promise<ConnectionTestResult> {
    const startTime = Date.now();

    try {
      const authResult = await this.authenticate();

      if (!authResult.success) {
        return {
          success: false,
          responseTime: Date.now() - startTime,
          capabilities: this.getCapabilities(),
          error: authResult.error,
        };
      }

      // Test a simple API call
      const testData = await this.fetchData({
        type: 'jobs',
        limit: 1,
      });

      return {
        success: true,
        responseTime: Date.now() - startTime,
        capabilities: this.getCapabilities(),
      };
    } catch (error) {
      return {
        success: false,
        responseTime: Date.now() - startTime,
        capabilities: this.getCapabilities(),
        error:
          error instanceof Error ? error.message : 'Connection test failed',
      };
    }
  }

  // Private helper methods

  private async fetchTaveJob(jobId: string): Promise<TaveJob | null> {
    try {
      const response = await fetch(
        `${this.apiConfig.baseUrl}/studios/${this.config?.studioId}/jobs/${jobId}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${this.config?.apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (response.ok) {
        return await response.json();
      }

      return null;
    } catch (error) {
      console.error('Failed to fetch Tave job:', error);
      return null;
    }
  }

  private async transformTaveJobToWeddingData(job: TaveJob): Promise<any> {
    return {
      clients: job.clients.map((client) => ({
        id: client.id,
        name: `${client.firstName} ${client.lastName}`,
        email: client.email,
        phone: client.phone,
        weddingDate: job.timeline.find((event) => event.eventType === 'wedding')
          ?.startDate,
        partnerName:
          client.partnerFirstName && client.partnerLastName
            ? `${client.partnerFirstName} ${client.partnerLastName}`
            : undefined,
      })),
      timeline: {
        events: job.timeline.map((event) => ({
          id: event.id,
          title: event.title,
          startTime: new Date(event.startDate),
          endTime: new Date(event.endDate),
          eventType: event.eventType,
          location: event.location,
        })),
      },
      packages: job.packages.map((pkg) => ({
        id: pkg.id,
        name: pkg.name,
        price: pkg.price,
        description: pkg.description,
      })),
      payments: job.payments.map((payment) => ({
        id: payment.id,
        amount: payment.amount,
        status: payment.status,
        dueDate: new Date(payment.dueDate),
        paidDate: payment.paidDate ? new Date(payment.paidDate) : undefined,
      })),
    };
  }

  private transformTimelineToTave(timeline: any): TaveTimelineEvent[] {
    if (!timeline.events) return [];

    return timeline.events.map((event: any) => ({
      id: event.id,
      title: event.title,
      startDate: event.startTime.toISOString(),
      endDate: event.endTime.toISOString(),
      eventType: event.category || 'custom',
      location: event.location || '',
    }));
  }

  private async updateTaveTimelineEvent(
    jobId: string,
    event: TaveTimelineEvent,
  ): Promise<void> {
    const response = await fetch(
      `${this.apiConfig.baseUrl}/studios/${this.config?.studioId}/jobs/${jobId}/timeline/${event.id}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${this.config?.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      },
    );

    if (!response.ok) {
      throw new Error(
        `Failed to update Tave timeline event: ${response.status} ${response.statusText}`,
      );
    }
  }

  private parseTaveWebhook(webhookData: any): any {
    // Parse Tave webhook structure
    if (webhookData.event && webhookData.data) {
      return {
        type: webhookData.event,
        jobId: webhookData.data.job?.id,
        data: webhookData.data,
        timestamp: new Date(webhookData.timestamp || Date.now()),
      };
    }

    return null;
  }

  private async pushSingleRecord(
    dataType: string,
    record: any,
  ): Promise<{ created: boolean }> {
    const endpoint = this.getEndpointForDataType(dataType);

    // Determine if this is a create or update operation
    const isUpdate = !!record.id;
    const method = isUpdate ? 'PUT' : 'POST';
    const url = isUpdate
      ? `${this.apiConfig.baseUrl}${endpoint}/${record.id}`
      : `${this.apiConfig.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${this.config?.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(record),
    });

    if (!response.ok) {
      throw new Error(
        `Tave API error: ${response.status} ${response.statusText}`,
      );
    }

    return { created: !isUpdate };
  }

  private getEndpointForDataType(dataType: string): string {
    const endpoints: Record<string, string> = {
      jobs: `/studios/${this.config?.studioId}/jobs`,
      clients: `/studios/${this.config?.studioId}/clients`,
      payments: `/studios/${this.config?.studioId}/payments`,
      timeline: `/studios/${this.config?.studioId}/timeline`,
    };

    return endpoints[dataType] || endpoints.jobs;
  }
}
