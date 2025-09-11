/**
 * Field Integration Adapters
 * Specific adapters for different integration sources
 */

import { FieldIntegrationSource } from '@/components/forms/FieldIntegration';

export interface FieldIntegrationAdapter {
  name: string;
  type: string;
  connect(config: any): Promise<boolean>;
  disconnect(): Promise<void>;
  syncFields(): Promise<any[]>;
  validateConnection(): Promise<boolean>;
  getFieldSchema(): Promise<any>;
}

/**
 * REST API Integration Adapter
 */
class APIIntegrationAdapter implements FieldIntegrationAdapter {
  name = 'REST API';
  type = 'api';

  private endpoint: string;
  private headers: Record<string, string>;
  private isConnected = false;

  constructor(private source: FieldIntegrationSource) {
    this.endpoint = source.endpoint || '';
    this.headers = {
      'Content-Type': 'application/json',
      ...(source.credentials?.apiKey
        ? { Authorization: `Bearer ${source.credentials.apiKey}` }
        : {}),
      ...(source.credentials?.customHeaders || {}),
    };
  }

  async connect(config: {
    endpoint: string;
    apiKey?: string;
    customHeaders?: Record<string, string>;
  }): Promise<boolean> {
    try {
      this.endpoint = config.endpoint;
      if (config.apiKey) {
        this.headers['Authorization'] = `Bearer ${config.apiKey}`;
      }
      if (config.customHeaders) {
        this.headers = { ...this.headers, ...config.customHeaders };
      }

      const isValid = await this.validateConnection();
      this.isConnected = isValid;
      return isValid;
    } catch (error) {
      console.error('API connection failed:', error);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    this.isConnected = false;
    this.headers = { 'Content-Type': 'application/json' };
  }

  async validateConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.endpoint}/health`, {
        method: 'GET',
        headers: this.headers,
      });
      return response.ok;
    } catch {
      // If health endpoint doesn't exist, try the main endpoint
      try {
        const response = await fetch(this.endpoint, {
          method: 'HEAD',
          headers: this.headers,
        });
        return response.ok;
      } catch {
        return false;
      }
    }
  }

  async syncFields(): Promise<any[]> {
    if (!this.isConnected) {
      throw new Error('Not connected to API');
    }

    try {
      const response = await fetch(`${this.endpoint}/fields`, {
        method: 'GET',
        headers: this.headers,
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const data = await response.json();
      return this.normalizeFields(data);
    } catch (error) {
      console.error('Field sync failed:', error);
      throw error;
    }
  }

  async getFieldSchema(): Promise<any> {
    try {
      const response = await fetch(`${this.endpoint}/schema`, {
        method: 'GET',
        headers: this.headers,
      });

      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch {
      return null;
    }
  }

  private normalizeFields(data: any): any[] {
    // Handle different API response formats
    if (Array.isArray(data)) return data;
    if (data.fields && Array.isArray(data.fields)) return data.fields;
    if (data.data && Array.isArray(data.data)) return data.data;
    if (data.items && Array.isArray(data.items)) return data.items;
    return [];
  }
}

/**
 * CSV/File Integration Adapter
 */
class FileIntegrationAdapter implements FieldIntegrationAdapter {
  name = 'File Import';
  type = 'file';
  private fileData: any[] = [];

  constructor(private source: FieldIntegrationSource) {}

  async connect(config: {
    fileContent: string;
    fileType: 'csv' | 'json';
  }): Promise<boolean> {
    try {
      if (config.fileType === 'csv') {
        this.fileData = this.parseCSV(config.fileContent);
      } else if (config.fileType === 'json') {
        this.fileData = JSON.parse(config.fileContent);
      }
      return true;
    } catch (error) {
      console.error('File parsing failed:', error);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    this.fileData = [];
  }

  async validateConnection(): Promise<boolean> {
    return this.fileData.length > 0;
  }

  async syncFields(): Promise<any[]> {
    return this.fileData.map((row, index) => ({
      id: `field_${index}`,
      name: row.name || row.field_name || `field_${index}`,
      label: row.label || row.display_name || row.name || `Field ${index + 1}`,
      type: row.type || 'text',
      required: row.required === 'true' || row.required === true,
      placeholder: row.placeholder,
      description: row.description || row.help_text,
      defaultValue: row.default_value,
      options: row.options ? this.parseOptions(row.options) : undefined,
    }));
  }

  async getFieldSchema(): Promise<any> {
    if (this.fileData.length === 0) return null;

    const firstRow = this.fileData[0];
    return {
      fields: Object.keys(firstRow).map((key) => ({
        name: key,
        type: this.inferType(firstRow[key]),
      })),
    };
  }

  private parseCSV(csvContent: string): any[] {
    const lines = csvContent.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map((h) => h.trim().replace(/"/g, ''));
    return lines.slice(1).map((line) => {
      const values = line.split(',').map((v) => v.trim().replace(/"/g, ''));
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      return row;
    });
  }

  private parseOptions(optionsStr: string): any[] {
    try {
      if (optionsStr.startsWith('[')) {
        return JSON.parse(optionsStr);
      }
      // Parse pipe-separated options: "Option 1|Option 2|Option 3"
      return optionsStr.split('|').map((opt, index) => ({
        id: `opt_${index}`,
        label: opt.trim(),
        value: opt.trim().toLowerCase().replace(/\s+/g, '_'),
      }));
    } catch {
      return [];
    }
  }

  private inferType(value: any): string {
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'checkbox';
    if (typeof value === 'string') {
      if (value.includes('@')) return 'email';
      if (value.match(/^\d{4}-\d{2}-\d{2}/)) return 'date';
      if (value.match(/^\d+$/)) return 'number';
    }
    return 'text';
  }
}

/**
 * Database Integration Adapter
 */
class DatabaseIntegrationAdapter implements FieldIntegrationAdapter {
  name = 'Database';
  type = 'database';
  private connectionString: string;
  private isConnected = false;

  constructor(private source: FieldIntegrationSource) {
    this.connectionString = source.credentials?.connectionString || '';
  }

  async connect(config: {
    connectionString: string;
    query?: string;
  }): Promise<boolean> {
    try {
      this.connectionString = config.connectionString;
      // In real implementation, establish database connection
      this.isConnected = true;
      return true;
    } catch (error) {
      console.error('Database connection failed:', error);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    this.isConnected = false;
  }

  async validateConnection(): Promise<boolean> {
    // In real implementation, test database connection
    return this.isConnected;
  }

  async syncFields(): Promise<any[]> {
    if (!this.isConnected) {
      throw new Error('Not connected to database');
    }

    // Mock field data - in real implementation, query database
    return [
      {
        name: 'client_name',
        type: 'text',
        label: 'Client Name',
        required: true,
      },
      {
        name: 'client_email',
        type: 'email',
        label: 'Email Address',
        required: true,
      },
      {
        name: 'wedding_date',
        type: 'date',
        label: 'Wedding Date',
        required: true,
      },
      { name: 'venue_name', type: 'text', label: 'Venue Name' },
      { name: 'guest_count', type: 'number', label: 'Number of Guests' },
    ];
  }

  async getFieldSchema(): Promise<any> {
    // In real implementation, get database schema
    return {
      tables: ['clients', 'weddings', 'venues'],
      fields: await this.syncFields(),
    };
  }
}

/**
 * Webhook Integration Adapter
 */
class WebhookIntegrationAdapter implements FieldIntegrationAdapter {
  name = 'Webhook';
  type = 'webhook';
  private webhookUrl: string;
  private secret?: string;

  constructor(private source: FieldIntegrationSource) {
    this.webhookUrl = source.endpoint || '';
    this.secret = source.credentials?.secret;
  }

  async connect(config: {
    webhookUrl: string;
    secret?: string;
  }): Promise<boolean> {
    this.webhookUrl = config.webhookUrl;
    this.secret = config.secret;
    return this.validateConnection();
  }

  async disconnect(): Promise<void> {
    this.webhookUrl = '';
    this.secret = undefined;
  }

  async validateConnection(): Promise<boolean> {
    try {
      // Test webhook endpoint
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.secret ? { 'X-Webhook-Secret': this.secret } : {}),
        },
        body: JSON.stringify({ test: true }),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async syncFields(): Promise<any[]> {
    // Mock webhook field data
    return [
      { name: 'form_name', type: 'text', label: 'Form Name' },
      { name: 'submission_data', type: 'textarea', label: 'Submission Data' },
      { name: 'timestamp', type: 'date', label: 'Submission Time' },
    ];
  }

  async getFieldSchema(): Promise<any> {
    return {
      webhook_url: this.webhookUrl,
      supported_events: ['form_submitted', 'field_updated', 'form_published'],
    };
  }
}

/**
 * External Form Builder Integration Adapter
 */
class ExternalFormIntegrationAdapter implements FieldIntegrationAdapter {
  name = 'External Form Builder';
  type = 'external_form';
  private apiKey: string;
  private formId?: string;

  constructor(private source: FieldIntegrationSource) {
    this.apiKey = source.credentials?.apiKey || '';
    this.formId = source.credentials?.formId;
  }

  async connect(config: {
    apiKey: string;
    formId?: string;
    baseUrl?: string;
  }): Promise<boolean> {
    this.apiKey = config.apiKey;
    this.formId = config.formId;
    return this.validateConnection();
  }

  async disconnect(): Promise<void> {
    this.apiKey = '';
    this.formId = undefined;
  }

  async validateConnection(): Promise<boolean> {
    return Boolean(this.apiKey);
  }

  async syncFields(): Promise<any[]> {
    if (!this.apiKey) {
      throw new Error('API key not configured');
    }

    // Mock external form fields
    return [
      {
        name: 'contact_name',
        type: 'text',
        label: 'Contact Name',
        required: true,
      },
      {
        name: 'contact_email',
        type: 'email',
        label: 'Contact Email',
        required: true,
      },
      {
        name: 'event_type',
        type: 'select',
        label: 'Event Type',
        options: [
          { label: 'Wedding', value: 'wedding' },
          { label: 'Corporate', value: 'corporate' },
          { label: 'Birthday', value: 'birthday' },
        ],
      },
      { name: 'event_date', type: 'date', label: 'Event Date', required: true },
      { name: 'message', type: 'textarea', label: 'Additional Message' },
    ];
  }

  async getFieldSchema(): Promise<any> {
    return {
      form_id: this.formId,
      supported_field_types: [
        'text',
        'email',
        'select',
        'textarea',
        'date',
        'checkbox',
        'radio',
      ],
      webhook_support: true,
    };
  }
}

/**
 * Adapter Factory
 */
export class FieldIntegrationAdapterFactory {
  static createAdapter(
    source: FieldIntegrationSource,
  ): FieldIntegrationAdapter {
    switch (source.type) {
      case 'api':
        return new APIIntegrationAdapter(source);
      case 'file':
        return new FileIntegrationAdapter(source);
      case 'database':
        return new DatabaseIntegrationAdapter(source);
      case 'webhook':
        return new WebhookIntegrationAdapter(source);
      case 'external_form':
        return new ExternalFormIntegrationAdapter(source);
      default:
        throw new Error(`Unsupported integration type: ${source.type}`);
    }
  }

  static getSupportedTypes(): string[] {
    return ['api', 'file', 'database', 'webhook', 'external_form'];
  }
}

export {
  APIIntegrationAdapter,
  FileIntegrationAdapter,
  DatabaseIntegrationAdapter,
  WebhookIntegrationAdapter,
  ExternalFormIntegrationAdapter,
};
