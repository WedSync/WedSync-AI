// HoneyBook CRM Provider Implementation - OAuth2 Based
// Generated for WS-343 - CRM Integration Hub Backend

import type {
  CRMProviderInterface,
  CRMProviderType,
  AuthType,
  CRMClient,
  CRMProject,
  CRMInvoice,
  CRMFieldDefinition,
  FetchOptions,
  SyncConfig,
  SyncResult,
  FieldMappingValidation,
  CRMFieldMapping,
  OAuth2Config,
} from '@/types/crm';

export class HoneyBookCRMProvider implements CRMProviderInterface {
  providerName: CRMProviderType = 'honeybook';
  authType: AuthType = 'oauth2';
  private readonly baseUrl = 'https://api.honeybook.com';

  /**
   * Test connection to HoneyBook API
   */
  async testConnection(authConfig: Record<string, any>): Promise<boolean> {
    try {
      // First try to refresh token if it's expired
      const config = authConfig as OAuth2Config;
      if (this.isTokenExpired(config)) {
        // Note: In real implementation, this would refresh the token
        console.warn('HoneyBook token expired, refresh needed');
        return false;
      }

      const response = await fetch(`${this.baseUrl}/v1/me`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${config.access_token}`,
          'Content-Type': 'application/json',
          'User-Agent': 'WedSync-CRM-Integration/1.0',
        },
      });

      if (!response.ok) {
        console.error(
          'HoneyBook connection test failed:',
          response.status,
          response.statusText,
        );
        return false;
      }

      const data = await response.json();
      return !!(data && (data.user || data.account));
    } catch (error) {
      console.error('HoneyBook connection test error:', error);
      return false;
    }
  }

  /**
   * Authenticate with HoneyBook (OAuth2 flow handled externally)
   */
  async authenticate(authConfig: Record<string, any>): Promise<boolean> {
    return this.testConnection(authConfig);
  }

  /**
   * Refresh OAuth2 token
   */
  async refreshToken(authConfig: OAuth2Config): Promise<OAuth2Config> {
    try {
      const response = await fetch(`${this.baseUrl}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: authConfig.client_id,
          refresh_token: authConfig.refresh_token!,
        }),
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.statusText}`);
      }

      const tokenData = await response.json();

      return {
        ...authConfig,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || authConfig.refresh_token,
        token_expires_at: new Date(
          Date.now() + tokenData.expires_in * 1000,
        ).toISOString(),
      };
    } catch (error) {
      console.error('Failed to refresh HoneyBook token:', error);
      throw error;
    }
  }

  /**
   * Fetch contacts from HoneyBook
   */
  async fetchClients(
    authConfig: Record<string, any>,
    options?: FetchOptions,
  ): Promise<CRMClient[]> {
    try {
      const config = authConfig as OAuth2Config;

      // Check and refresh token if needed
      if (this.isTokenExpired(config)) {
        // In real implementation, this would trigger token refresh
        throw new Error('Token expired, refresh required');
      }

      const queryParams = new URLSearchParams();

      if (options?.page) {
        queryParams.append('page', options.page.toString());
      }
      if (options?.limit) {
        queryParams.append('limit', Math.min(options.limit, 100).toString());
      }
      if (options?.since) {
        queryParams.append('updated_since', options.since);
      }

      const url = `${this.baseUrl}/v1/contacts?${queryParams.toString()}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${config.access_token}`,
          'Content-Type': 'application/json',
          'User-Agent': 'WedSync-CRM-Integration/1.0',
        },
      });

      if (!response.ok) {
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After') || '60';
          await this.handleRateLimit({ retry_after: parseInt(retryAfter) });
          return this.fetchClients(authConfig, options);
        }
        throw new Error(
          `HoneyBook API error: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();

      return this.mapHoneyBookClientsToWedSync(
        data.contacts || data.data || [],
      );
    } catch (error) {
      console.error('Failed to fetch HoneyBook clients:', error);
      throw error;
    }
  }

  /**
   * Fetch projects from HoneyBook
   */
  async fetchProjects(
    authConfig: Record<string, any>,
    options?: FetchOptions,
  ): Promise<CRMProject[]> {
    try {
      const config = authConfig as OAuth2Config;

      if (this.isTokenExpired(config)) {
        throw new Error('Token expired, refresh required');
      }

      const queryParams = new URLSearchParams();

      if (options?.page) {
        queryParams.append('page', options.page.toString());
      }
      if (options?.limit) {
        queryParams.append('limit', Math.min(options.limit, 100).toString());
      }
      if (options?.since) {
        queryParams.append('updated_since', options.since);
      }

      const url = `${this.baseUrl}/v1/projects?${queryParams.toString()}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${config.access_token}`,
          'Content-Type': 'application/json',
          'User-Agent': 'WedSync-CRM-Integration/1.0',
        },
      });

      if (!response.ok) {
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After') || '60';
          await this.handleRateLimit({ retry_after: parseInt(retryAfter) });
          return this.fetchProjects(authConfig, options);
        }
        throw new Error(
          `HoneyBook API error: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();

      return this.mapHoneyBookProjectsToWedSync(
        data.projects || data.data || [],
      );
    } catch (error) {
      console.error('Failed to fetch HoneyBook projects:', error);
      throw error;
    }
  }

  /**
   * Fetch invoices from HoneyBook
   */
  async fetchInvoices(
    authConfig: Record<string, any>,
    options?: FetchOptions,
  ): Promise<CRMInvoice[]> {
    try {
      const config = authConfig as OAuth2Config;

      if (this.isTokenExpired(config)) {
        throw new Error('Token expired, refresh required');
      }

      const queryParams = new URLSearchParams();

      if (options?.page) {
        queryParams.append('page', options.page.toString());
      }
      if (options?.limit) {
        queryParams.append('limit', Math.min(options.limit, 100).toString());
      }

      const url = `${this.baseUrl}/v1/invoices?${queryParams.toString()}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${config.access_token}`,
          'Content-Type': 'application/json',
          'User-Agent': 'WedSync-CRM-Integration/1.0',
        },
      });

      if (!response.ok) {
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After') || '60';
          await this.handleRateLimit({ retry_after: parseInt(retryAfter) });
          return this.fetchInvoices(authConfig, options);
        }
        throw new Error(
          `HoneyBook API error: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();

      return this.mapHoneyBookInvoicesToWedSync(
        data.invoices || data.data || [],
      );
    } catch (error) {
      console.error('Failed to fetch HoneyBook invoices:', error);
      throw error;
    }
  }

  /**
   * Sync data to WedSync format
   */
  async syncToWedSync(
    authConfig: Record<string, any>,
    syncConfig: SyncConfig,
  ): Promise<SyncResult> {
    const startTime = Date.now();
    let totalProcessed = 0;
    let totalCreated = 0;
    let totalUpdated = 0;
    let totalFailed = 0;
    const errors: any[] = [];

    try {
      // Fetch clients with pagination
      let page = 1;
      let hasMore = true;

      while (hasMore && totalProcessed < 2000) {
        // Higher limit for OAuth API
        const clients = await this.fetchClients(authConfig, {
          page,
          limit: syncConfig.batch_size || 100,
          since: syncConfig.date_range_filter?.start_date,
        });

        if (clients.length === 0) {
          hasMore = false;
          break;
        }

        totalProcessed += clients.length;
        totalCreated += clients.length; // Assuming all are new for this example

        page++;

        // Rate limiting - respect HoneyBook's limits (120 requests/minute)
        if (page > 1) {
          await new Promise((resolve) => setTimeout(resolve, 600)); // 600ms between requests
        }
      }

      return {
        success: totalFailed === 0,
        records_processed: totalProcessed,
        records_created: totalCreated,
        records_updated: totalUpdated,
        records_failed: totalFailed,
        errors,
        warnings: [],
        execution_time_ms: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        records_processed: totalProcessed,
        records_created: totalCreated,
        records_updated: totalUpdated,
        records_failed: totalFailed + 1,
        errors: [
          ...errors,
          {
            error_code: 'SYNC_FAILED',
            error_message: (error as Error).message,
          },
        ],
        warnings: [],
        execution_time_ms: Date.now() - startTime,
      };
    }
  }

  /**
   * Discover fields available in HoneyBook
   */
  async discoverFields(
    authConfig: Record<string, any>,
  ): Promise<CRMFieldDefinition[]> {
    try {
      const config = authConfig as OAuth2Config;

      if (this.isTokenExpired(config)) {
        throw new Error('Token expired, refresh required');
      }

      const response = await fetch(`${this.baseUrl}/v1/schema/contact`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${config.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch HoneyBook schema: ${response.status}`);
      }

      const schema = await response.json();

      return this.mapHoneyBookSchemaToFieldDefinitions(schema.fields || []);
    } catch (error) {
      console.error('Failed to discover HoneyBook fields:', error);

      // Return default known fields if schema discovery fails
      return this.getDefaultHoneyBookFields();
    }
  }

  /**
   * Validate field mappings for HoneyBook
   */
  async validateFieldMapping(
    fieldMappings: CRMFieldMapping[],
  ): Promise<FieldMappingValidation> {
    const errors: any[] = [];
    const warnings: any[] = [];
    const suggestions: any[] = [];

    for (const mapping of fieldMappings) {
      // Validate required fields are mapped
      if (mapping.is_required && !mapping.wedsync_field_name) {
        errors.push({
          field_name: mapping.crm_field_name,
          error_code: 'REQUIRED_FIELD_UNMAPPED',
          error_message: `Required field '${mapping.crm_field_name}' is not mapped to a WedSync field`,
        });
      }

      // Validate data type compatibility
      if (
        !this.areTypesCompatible(
          mapping.crm_field_type,
          mapping.wedsync_field_type,
        )
      ) {
        warnings.push({
          field_name: mapping.crm_field_name,
          warning_code: 'TYPE_MISMATCH',
          warning_message: `Type mismatch: ${mapping.crm_field_type} -> ${mapping.wedsync_field_type}`,
        });
      }
    }

    return {
      is_valid: errors.length === 0,
      errors,
      warnings,
      suggestions,
    };
  }

  /**
   * Get rate limits for HoneyBook
   */
  getRateLimit(): { requests_per_minute: number; requests_per_hour: number } {
    return { requests_per_minute: 120, requests_per_hour: 2000 };
  }

  /**
   * Handle rate limiting
   */
  async handleRateLimit(error: any): Promise<number> {
    const retryAfter = error.retry_after || 60;
    console.warn(`HoneyBook rate limit hit. Waiting ${retryAfter} seconds...`);
    await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
    return retryAfter;
  }

  // Private helper methods

  private isTokenExpired(config: OAuth2Config): boolean {
    if (!config.token_expires_at) return false;

    const expiryTime = new Date(config.token_expires_at).getTime();
    const now = Date.now();
    const bufferTime = 5 * 60 * 1000; // 5 minutes buffer

    return expiryTime - bufferTime <= now;
  }

  private mapHoneyBookClientsToWedSync(honeyBookClients: any[]): CRMClient[] {
    return honeyBookClients.map((client) => ({
      id: client.id?.toString() || client.contactId?.toString(),
      name:
        this.buildClientName(client.firstName, client.lastName) || client.name,
      email: client.email || client.primaryEmail,
      phone: client.phone || client.phoneNumber,
      partner_name: this.buildClientName(
        client.partnerFirstName,
        client.partnerLastName,
      ),
      partner_email: client.partnerEmail,
      wedding_date: client.eventDate || client.weddingDate,
      venue_name: client.venue || client.venueName,
      budget: client.budget ? parseFloat(client.budget.toString()) : undefined,
      source: client.source || 'HoneyBook',
      status: this.mapHoneyBookStatusToWedSync(client.status),
      custom_fields: {
        honeybook_id: client.id,
        inquiry_type: client.inquiryType,
        event_type: client.eventType,
        referral_source: client.referralSource,
        notes: client.notes,
        tags: client.tags,
      },
      created_at: client.createdAt || client.created_at,
      updated_at: client.updatedAt || client.updated_at,
    }));
  }

  private mapHoneyBookProjectsToWedSync(
    honeyBookProjects: any[],
  ): CRMProject[] {
    return honeyBookProjects.map((project) => ({
      id: project.id?.toString(),
      client_id: project.clientId?.toString() || project.contactId?.toString(),
      name: project.name || project.title,
      event_date: project.eventDate,
      event_type: project.eventType || 'Wedding',
      venue: project.venue || project.venueName,
      status: this.mapHoneyBookProjectStatus(project.status),
      total_amount: project.contractValue
        ? parseFloat(project.contractValue.toString())
        : 0,
      paid_amount: project.amountPaid
        ? parseFloat(project.amountPaid.toString())
        : 0,
      custom_fields: {
        honeybook_project_id: project.id,
        package_name: project.packageName,
        contract_status: project.contractStatus,
        proposal_status: project.proposalStatus,
      },
      created_at: project.createdAt || project.created_at,
      updated_at: project.updatedAt || project.updated_at,
    }));
  }

  private mapHoneyBookInvoicesToWedSync(
    honeyBookInvoices: any[],
  ): CRMInvoice[] {
    return honeyBookInvoices.map((invoice) => ({
      id: invoice.id?.toString(),
      client_id: invoice.clientId?.toString() || invoice.contactId?.toString(),
      project_id: invoice.projectId?.toString(),
      invoice_number: invoice.invoiceNumber || invoice.number,
      amount: parseFloat(invoice.amount?.toString() || '0'),
      paid_amount: parseFloat(invoice.paidAmount?.toString() || '0'),
      due_date: invoice.dueDate,
      status: this.mapHoneyBookInvoiceStatus(invoice.status),
      line_items:
        invoice.lineItems?.map((item: any) => ({
          id: item.id?.toString(),
          description: item.description || item.name,
          quantity: item.quantity || 1,
          unit_price: parseFloat(item.unitPrice?.toString() || '0'),
          total: parseFloat(item.total?.toString() || '0'),
        })) || [],
      created_at: invoice.createdAt || invoice.created_at,
      updated_at: invoice.updatedAt || invoice.updated_at,
    }));
  }

  private buildClientName(firstName?: string, lastName?: string): string {
    const parts = [firstName, lastName].filter(Boolean);
    return parts.join(' ') || '';
  }

  private mapHoneyBookStatusToWedSync(status: string): string {
    const statusMap: Record<string, string> = {
      inquiry: 'pending',
      lead: 'pending',
      qualified: 'pending',
      booked: 'active',
      confirmed: 'active',
      completed: 'completed',
      cancelled: 'inactive',
      archived: 'inactive',
    };
    return statusMap[status?.toLowerCase()] || 'pending';
  }

  private mapHoneyBookProjectStatus(status: string): string {
    const statusMap: Record<string, string> = {
      inquiry: 'pending',
      proposal_sent: 'pending',
      contract_sent: 'pending',
      booked: 'active',
      confirmed: 'active',
      in_progress: 'active',
      completed: 'completed',
      cancelled: 'cancelled',
    };
    return statusMap[status?.toLowerCase()] || 'pending';
  }

  private mapHoneyBookInvoiceStatus(status: string): string {
    const statusMap: Record<string, string> = {
      draft: 'draft',
      sent: 'sent',
      viewed: 'sent',
      paid: 'paid',
      partially_paid: 'partial',
      overdue: 'overdue',
      cancelled: 'cancelled',
    };
    return statusMap[status?.toLowerCase()] || 'draft';
  }

  private mapHoneyBookSchemaToFieldDefinitions(
    honeyBookFields: any[],
  ): CRMFieldDefinition[] {
    return honeyBookFields.map((field) => ({
      name: field.name || field.key,
      label: field.label || field.displayName || field.name,
      type: this.mapHoneyBookFieldType(field.type),
      required: field.required || false,
      options: field.options || field.choices,
      description: field.description || field.help,
      category: this.categorizeField(field.name || field.key),
    }));
  }

  private mapHoneyBookFieldType(honeyBookType: string): any {
    const typeMap: Record<string, string> = {
      text: 'string',
      string: 'string',
      email: 'email',
      phone: 'phone',
      number: 'number',
      currency: 'number',
      date: 'date',
      datetime: 'datetime',
      timestamp: 'datetime',
      boolean: 'boolean',
      select: 'string',
      multiselect: 'array',
      array: 'array',
      object: 'object',
    };
    return typeMap[honeyBookType?.toLowerCase()] || 'string';
  }

  private categorizeField(
    fieldName: string,
  ): 'client' | 'project' | 'invoice' | 'custom' {
    const clientFields = [
      'firstname',
      'lastname',
      'email',
      'phone',
      'address',
      'contact',
    ];
    const projectFields = ['event', 'wedding', 'venue', 'package', 'date'];
    const invoiceFields = ['amount', 'payment', 'invoice', 'contract', 'price'];

    const lowerFieldName = fieldName.toLowerCase();

    if (clientFields.some((f) => lowerFieldName.includes(f))) return 'client';
    if (projectFields.some((f) => lowerFieldName.includes(f))) return 'project';
    if (invoiceFields.some((f) => lowerFieldName.includes(f))) return 'invoice';

    return 'custom';
  }

  private getDefaultHoneyBookFields(): CRMFieldDefinition[] {
    return [
      {
        name: 'firstName',
        label: 'First Name',
        type: 'string',
        required: true,
        category: 'client',
      },
      {
        name: 'lastName',
        label: 'Last Name',
        type: 'string',
        required: true,
        category: 'client',
      },
      {
        name: 'email',
        label: 'Email',
        type: 'email',
        required: true,
        category: 'client',
      },
      {
        name: 'phone',
        label: 'Phone',
        type: 'phone',
        required: false,
        category: 'client',
      },
      {
        name: 'eventDate',
        label: 'Event Date',
        type: 'date',
        required: false,
        category: 'project',
      },
      {
        name: 'venue',
        label: 'Venue',
        type: 'string',
        required: false,
        category: 'project',
      },
      {
        name: 'budget',
        label: 'Budget',
        type: 'number',
        required: false,
        category: 'project',
      },
      {
        name: 'eventType',
        label: 'Event Type',
        type: 'string',
        required: false,
        options: ['Wedding', 'Engagement', 'Portrait', 'Corporate'],
        category: 'project',
      },
    ];
  }

  private areTypesCompatible(crmType: string, wedSyncType: string): boolean {
    const compatibilityMap: Record<string, string[]> = {
      string: ['string', 'email', 'phone'],
      email: ['string', 'email'],
      phone: ['string', 'phone'],
      number: ['number', 'string'],
      boolean: ['boolean', 'string'],
      date: ['date', 'datetime', 'string'],
      datetime: ['datetime', 'date', 'string'],
      array: ['array', 'string'],
      object: ['object', 'string'],
    };

    return compatibilityMap[crmType]?.includes(wedSyncType) || false;
  }
}
