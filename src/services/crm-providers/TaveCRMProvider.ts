// Tave CRM Provider Implementation
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
} from '@/types/crm';

export class TaveCRMProvider implements CRMProviderInterface {
  providerName: CRMProviderType = 'tave';
  authType: AuthType = 'api_key';

  /**
   * Test connection to Tave API
   */
  async testConnection(authConfig: Record<string, any>): Promise<boolean> {
    try {
      const response = await fetch(
        `${authConfig.endpoint_base_url}/api/v1/account`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${authConfig.api_key}`,
            'Content-Type': 'application/json',
            'User-Agent': 'WedSync-CRM-Integration/1.0',
          },
        },
      );

      if (!response.ok) {
        console.error(
          'Tave connection test failed:',
          response.status,
          response.statusText,
        );
        return false;
      }

      const data = await response.json();
      return !!(data && data.account);
    } catch (error) {
      console.error('Tave connection test error:', error);
      return false;
    }
  }

  /**
   * Authenticate with Tave (for API key, this is implicit in requests)
   */
  async authenticate(authConfig: Record<string, any>): Promise<boolean> {
    return this.testConnection(authConfig);
  }

  /**
   * Fetch clients from Tave
   */
  async fetchClients(
    authConfig: Record<string, any>,
    options?: FetchOptions,
  ): Promise<CRMClient[]> {
    try {
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

      const url = `${authConfig.endpoint_base_url}/api/v1/clients?${queryParams.toString()}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authConfig.api_key}`,
          'Content-Type': 'application/json',
          'User-Agent': 'WedSync-CRM-Integration/1.0',
        },
      });

      if (!response.ok) {
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After') || '60';
          await this.handleRateLimit({ retry_after: parseInt(retryAfter) });
          // Retry the request
          return this.fetchClients(authConfig, options);
        }
        throw new Error(
          `Tave API error: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();

      return this.mapTaveClientsToWedSync(data.clients || []);
    } catch (error) {
      console.error('Failed to fetch Tave clients:', error);
      throw error;
    }
  }

  /**
   * Fetch projects from Tave
   */
  async fetchProjects(
    authConfig: Record<string, any>,
    options?: FetchOptions,
  ): Promise<CRMProject[]> {
    try {
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

      const url = `${authConfig.endpoint_base_url}/api/v1/jobs?${queryParams.toString()}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authConfig.api_key}`,
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
          `Tave API error: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();

      return this.mapTaveProjectsToWedSync(data.jobs || []);
    } catch (error) {
      console.error('Failed to fetch Tave projects:', error);
      throw error;
    }
  }

  /**
   * Fetch invoices from Tave
   */
  async fetchInvoices(
    authConfig: Record<string, any>,
    options?: FetchOptions,
  ): Promise<CRMInvoice[]> {
    try {
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

      const url = `${authConfig.endpoint_base_url}/api/v1/invoices?${queryParams.toString()}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authConfig.api_key}`,
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
          `Tave API error: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();

      return this.mapTaveInvoicesToWedSync(data.invoices || []);
    } catch (error) {
      console.error('Failed to fetch Tave invoices:', error);
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

      while (hasMore && totalProcessed < 1000) {
        // Safety limit
        const clients = await this.fetchClients(authConfig, {
          page,
          limit: syncConfig.batch_size || 50,
          since: syncConfig.date_range_filter?.start_date,
        });

        if (clients.length === 0) {
          hasMore = false;
          break;
        }

        totalProcessed += clients.length;

        // In a real implementation, this would save to database
        totalCreated += clients.length; // Assuming all are new for this example

        page++;

        // Rate limiting - respect Tave's limits (60 requests/minute)
        if (page > 1) {
          await new Promise((resolve) => setTimeout(resolve, 1100)); // Just over 1 second
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
   * Discover fields available in Tave
   */
  async discoverFields(
    authConfig: Record<string, any>,
  ): Promise<CRMFieldDefinition[]> {
    try {
      // Fetch schema/fields info from Tave API
      const response = await fetch(
        `${authConfig.endpoint_base_url}/api/v1/schema/client`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${authConfig.api_key}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch Tave schema: ${response.status}`);
      }

      const schema = await response.json();

      return this.mapTaveSchemaToFieldDefinitions(schema.fields || []);
    } catch (error) {
      console.error('Failed to discover Tave fields:', error);

      // Return default known fields if schema discovery fails
      return this.getDefaultTaveFields();
    }
  }

  /**
   * Validate field mappings for Tave
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
   * Get rate limits for Tave
   */
  getRateLimit(): { requests_per_minute: number; requests_per_hour: number } {
    return { requests_per_minute: 60, requests_per_hour: 1000 };
  }

  /**
   * Handle rate limiting
   */
  async handleRateLimit(error: any): Promise<number> {
    const retryAfter = error.retry_after || 60;
    console.warn(`Tave rate limit hit. Waiting ${retryAfter} seconds...`);
    await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
    return retryAfter;
  }

  // Private helper methods

  private mapTaveClientsToWedSync(taveClients: any[]): CRMClient[] {
    return taveClients.map((client) => ({
      id: client.id.toString(),
      name: this.buildClientName(client.first_name, client.last_name),
      email: client.email || client.primary_email,
      phone: client.phone || client.mobile_phone,
      partner_name: this.buildClientName(
        client.partner_first_name,
        client.partner_last_name,
      ),
      partner_email: client.partner_email,
      wedding_date: client.event_date,
      venue_name: client.venue,
      budget: client.budget ? parseFloat(client.budget) : undefined,
      source: client.lead_source,
      status: this.mapTaveStatusToWedSync(client.status),
      custom_fields: {
        tave_id: client.id,
        referral_source: client.referral_source,
        notes: client.notes,
        package_type: client.package_type,
      },
      created_at: client.created_at,
      updated_at: client.updated_at,
    }));
  }

  private mapTaveProjectsToWedSync(taveProjects: any[]): CRMProject[] {
    return taveProjects.map((project) => ({
      id: project.id.toString(),
      client_id: project.client_id.toString(),
      name: project.name || `${project.event_type} - ${project.event_date}`,
      event_date: project.event_date,
      event_type: project.event_type || 'Wedding',
      venue: project.venue,
      status: this.mapTaveProjectStatus(project.status),
      total_amount: project.contract_amount
        ? parseFloat(project.contract_amount)
        : 0,
      paid_amount: project.amount_paid ? parseFloat(project.amount_paid) : 0,
      custom_fields: {
        tave_job_id: project.id,
        package_name: project.package_name,
        shoot_type: project.shoot_type,
      },
      created_at: project.created_at,
      updated_at: project.updated_at,
    }));
  }

  private mapTaveInvoicesToWedSync(taveInvoices: any[]): CRMInvoice[] {
    return taveInvoices.map((invoice) => ({
      id: invoice.id.toString(),
      client_id: invoice.client_id.toString(),
      project_id: invoice.job_id?.toString(),
      invoice_number: invoice.invoice_number,
      amount: parseFloat(invoice.amount || '0'),
      paid_amount: parseFloat(invoice.amount_paid || '0'),
      due_date: invoice.due_date,
      status: this.mapTaveInvoiceStatus(invoice.status),
      line_items:
        invoice.line_items?.map((item: any) => ({
          id: item.id.toString(),
          description: item.description,
          quantity: item.quantity || 1,
          unit_price: parseFloat(item.unit_price || '0'),
          total: parseFloat(item.total || '0'),
        })) || [],
      created_at: invoice.created_at,
      updated_at: invoice.updated_at,
    }));
  }

  private buildClientName(firstName?: string, lastName?: string): string {
    const parts = [firstName, lastName].filter(Boolean);
    return parts.join(' ') || 'Unknown Client';
  }

  private mapTaveStatusToWedSync(taveStatus: string): string {
    const statusMap: Record<string, string> = {
      lead: 'pending',
      prospect: 'pending',
      booked: 'active',
      completed: 'completed',
      cancelled: 'inactive',
    };
    return statusMap[taveStatus?.toLowerCase()] || 'pending';
  }

  private mapTaveProjectStatus(taveStatus: string): string {
    const statusMap: Record<string, string> = {
      inquiry: 'pending',
      proposal: 'pending',
      booked: 'active',
      completed: 'completed',
      cancelled: 'cancelled',
    };
    return statusMap[taveStatus?.toLowerCase()] || 'pending';
  }

  private mapTaveInvoiceStatus(taveStatus: string): string {
    const statusMap: Record<string, string> = {
      draft: 'draft',
      sent: 'sent',
      paid: 'paid',
      overdue: 'overdue',
      cancelled: 'cancelled',
    };
    return statusMap[taveStatus?.toLowerCase()] || 'draft';
  }

  private mapTaveSchemaToFieldDefinitions(
    taveFields: any[],
  ): CRMFieldDefinition[] {
    return taveFields.map((field) => ({
      name: field.name,
      label: field.label || field.name,
      type: this.mapTaveFieldType(field.type),
      required: field.required || false,
      options: field.options,
      description: field.description,
      category: this.categorizeField(field.name),
    }));
  }

  private mapTaveFieldType(taveType: string): any {
    const typeMap: Record<string, string> = {
      text: 'string',
      email: 'email',
      phone: 'phone',
      number: 'number',
      currency: 'number',
      date: 'date',
      datetime: 'datetime',
      boolean: 'boolean',
      select: 'string',
      multiselect: 'array',
    };
    return typeMap[taveType] || 'string';
  }

  private categorizeField(
    fieldName: string,
  ): 'client' | 'project' | 'invoice' | 'custom' {
    const clientFields = [
      'first_name',
      'last_name',
      'email',
      'phone',
      'address',
    ];
    const projectFields = ['event_date', 'venue', 'event_type', 'package'];
    const invoiceFields = ['amount', 'due_date', 'payment_status'];

    if (clientFields.some((f) => fieldName.toLowerCase().includes(f)))
      return 'client';
    if (projectFields.some((f) => fieldName.toLowerCase().includes(f)))
      return 'project';
    if (invoiceFields.some((f) => fieldName.toLowerCase().includes(f)))
      return 'invoice';

    return 'custom';
  }

  private getDefaultTaveFields(): CRMFieldDefinition[] {
    return [
      {
        name: 'first_name',
        label: 'First Name',
        type: 'string',
        required: true,
        category: 'client',
      },
      {
        name: 'last_name',
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
        name: 'event_date',
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
    ];
  }

  private areTypesCompatible(crmType: string, wedSyncType: string): boolean {
    // Define compatible type mappings
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
