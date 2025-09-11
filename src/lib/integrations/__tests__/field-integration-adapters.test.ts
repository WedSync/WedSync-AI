/**
 * Tests for Field Integration Adapters
 */

import {
  APIIntegrationAdapter,
  FileIntegrationAdapter,
  DatabaseIntegrationAdapter,
  WebhookIntegrationAdapter,
  ExternalFormIntegrationAdapter,
  FieldIntegrationAdapterFactory,
} from '../field-integration-adapters';

import { FieldIntegrationSource } from '@/components/forms/FieldIntegration';

// Mock fetch globally
global.fetch = jest.fn();

describe('Field Integration Adapters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
  });

  describe('APIIntegrationAdapter', () => {
    let adapter: APIIntegrationAdapter;
    let mockSource: FieldIntegrationSource;

    beforeEach(() => {
      mockSource = {
        id: 'api-source',
        name: 'Test API',
        type: 'api',
        endpoint: 'https://api.example.com',
        credentials: { apiKey: 'test-key' },
        status: 'connected',
      };
      adapter = new APIIntegrationAdapter(mockSource);
    });

    describe('connect', () => {
      it('connects successfully with valid configuration', async () => {
        (fetch as jest.Mock)
          .mockResolvedValueOnce({ ok: true }) // health check
          .mockResolvedValueOnce({ ok: true }); // main endpoint check

        const config = {
          endpoint: 'https://api.example.com',
          apiKey: 'test-key',
        };

        const result = await adapter.connect(config);
        expect(result).toBe(true);
      });

      it('handles connection failures', async () => {
        (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

        const config = {
          endpoint: 'https://invalid.com',
          apiKey: 'invalid-key',
        };

        const result = await adapter.connect(config);
        expect(result).toBe(false);
      });

      it('sets custom headers correctly', async () => {
        (fetch as jest.Mock).mockResolvedValueOnce({ ok: true });

        const config = {
          endpoint: 'https://api.example.com',
          apiKey: 'test-key',
          customHeaders: { 'X-Custom': 'value' },
        };

        await adapter.connect(config);

        // Call syncFields to verify headers are set
        (fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => [],
        });

        await adapter.syncFields();

        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/fields'),
          expect.objectContaining({
            headers: expect.objectContaining({
              Authorization: 'Bearer test-key',
              'X-Custom': 'value',
            }),
          }),
        );
      });
    });

    describe('validateConnection', () => {
      it('validates connection using health endpoint', async () => {
        (fetch as jest.Mock).mockResolvedValueOnce({ ok: true });

        const result = await adapter.validateConnection();
        expect(result).toBe(true);
        expect(fetch).toHaveBeenCalledWith(
          'https://api.example.com/health',
          expect.any(Object),
        );
      });

      it('falls back to main endpoint if health endpoint fails', async () => {
        (fetch as jest.Mock)
          .mockRejectedValueOnce(new Error('Health endpoint not found'))
          .mockResolvedValueOnce({ ok: true });

        const result = await adapter.validateConnection();
        expect(result).toBe(true);
        expect(fetch).toHaveBeenCalledTimes(2);
      });

      it('returns false when both endpoints fail', async () => {
        (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

        const result = await adapter.validateConnection();
        expect(result).toBe(false);
      });
    });

    describe('syncFields', () => {
      beforeEach(async () => {
        // Mock successful connection
        (fetch as jest.Mock).mockResolvedValueOnce({ ok: true });
        await adapter.connect({
          endpoint: 'https://api.example.com',
          apiKey: 'test-key',
        });
      });

      it('syncs fields successfully', async () => {
        const mockFields = [
          { name: 'name', type: 'text', label: 'Name' },
          { name: 'email', type: 'email', label: 'Email' },
        ];

        (fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => mockFields,
        });

        const result = await adapter.syncFields();
        expect(result).toEqual(mockFields);
        expect(fetch).toHaveBeenCalledWith(
          'https://api.example.com/fields',
          expect.objectContaining({
            method: 'GET',
            headers: expect.objectContaining({
              Authorization: 'Bearer test-key',
            }),
          }),
        );
      });

      it('handles different response formats', async () => {
        const testCases = [
          { response: [{ name: 'test' }], expected: [{ name: 'test' }] },
          {
            response: { fields: [{ name: 'test' }] },
            expected: [{ name: 'test' }],
          },
          {
            response: { data: [{ name: 'test' }] },
            expected: [{ name: 'test' }],
          },
          {
            response: { items: [{ name: 'test' }] },
            expected: [{ name: 'test' }],
          },
          { response: { other: 'data' }, expected: [] },
        ];

        for (const testCase of testCases) {
          (fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => testCase.response,
          });

          const result = await adapter.syncFields();
          expect(result).toEqual(testCase.expected);
        }
      });

      it('throws error when not connected', async () => {
        const disconnectedAdapter = new APIIntegrationAdapter(mockSource);
        await expect(disconnectedAdapter.syncFields()).rejects.toThrow(
          'Not connected to API',
        );
      });

      it('handles API errors', async () => {
        (fetch as jest.Mock).mockResolvedValueOnce({
          ok: false,
          statusText: 'Unauthorized',
        });

        await expect(adapter.syncFields()).rejects.toThrow(
          'API request failed: Unauthorized',
        );
      });
    });

    describe('getFieldSchema', () => {
      it('retrieves field schema when available', async () => {
        const mockSchema = { fields: ['name', 'email'] };

        (fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => mockSchema,
        });

        const result = await adapter.getFieldSchema();
        expect(result).toEqual(mockSchema);
      });

      it('returns null when schema endpoint is not available', async () => {
        (fetch as jest.Mock).mockResolvedValueOnce({ ok: false });

        const result = await adapter.getFieldSchema();
        expect(result).toBeNull();
      });
    });
  });

  describe('FileIntegrationAdapter', () => {
    let adapter: FileIntegrationAdapter;
    let mockSource: FieldIntegrationSource;

    beforeEach(() => {
      mockSource = {
        id: 'file-source',
        name: 'CSV Import',
        type: 'file',
        status: 'disconnected',
      };
      adapter = new FileIntegrationAdapter(mockSource);
    });

    describe('CSV parsing', () => {
      it('parses CSV content correctly', async () => {
        const csvContent = `name,type,label,required
client_name,text,Client Name,true
client_email,email,Client Email,true
guest_count,number,Guest Count,false`;

        const result = await adapter.connect({
          fileContent: csvContent,
          fileType: 'csv',
        });
        expect(result).toBe(true);

        const fields = await adapter.syncFields();
        expect(fields).toHaveLength(3);
        expect(fields[0]).toMatchObject({
          name: 'client_name',
          type: 'text',
          label: 'Client Name',
          required: true,
        });
      });

      it('handles CSV with missing columns', async () => {
        const csvContent = `name,type
field1,text
field2,email`;

        const result = await adapter.connect({
          fileContent: csvContent,
          fileType: 'csv',
        });
        expect(result).toBe(true);

        const fields = await adapter.syncFields();
        expect(fields).toHaveLength(2);
        expect(fields[0].label).toBe('Field 1'); // Generated label
      });
    });

    describe('JSON parsing', () => {
      it('parses JSON content correctly', async () => {
        const jsonContent = JSON.stringify([
          { name: 'client_name', type: 'text', label: 'Client Name' },
          { name: 'client_email', type: 'email', label: 'Client Email' },
        ]);

        const result = await adapter.connect({
          fileContent: jsonContent,
          fileType: 'json',
        });
        expect(result).toBe(true);

        const fields = await adapter.syncFields();
        expect(fields).toHaveLength(2);
        expect(fields[0]).toMatchObject({
          name: 'client_name',
          type: 'text',
          label: 'Client Name',
        });
      });

      it('handles invalid JSON', async () => {
        const invalidJson = 'invalid json content';

        const result = await adapter.connect({
          fileContent: invalidJson,
          fileType: 'json',
        });
        expect(result).toBe(false);
      });
    });

    describe('options parsing', () => {
      it('parses pipe-separated options', async () => {
        const csvContent = `name,type,options
event_type,select,"Wedding|Corporate|Birthday"`;

        await adapter.connect({ fileContent: csvContent, fileType: 'csv' });
        const fields = await adapter.syncFields();

        expect(fields[0].options).toHaveLength(3);
        expect(fields[0].options[0]).toMatchObject({
          label: 'Wedding',
          value: 'wedding',
        });
      });

      it('parses JSON array options', async () => {
        const csvContent = `name,type,options
status,select,"[{""label"":""Active"",""value"":""active""},{""label"":""Inactive"",""value"":""inactive""}]"`;

        await adapter.connect({ fileContent: csvContent, fileType: 'csv' });
        const fields = await adapter.syncFields();

        expect(fields[0].options).toHaveLength(2);
        expect(fields[0].options[0]).toMatchObject({
          label: 'Active',
          value: 'active',
        });
      });
    });

    describe('type inference', () => {
      it('infers field types from values', async () => {
        const csvContent = `field1,field2,field3,field4
123,test@example.com,2024-01-01,true`;

        await adapter.connect({ fileContent: csvContent, fileType: 'csv' });
        const schema = await adapter.getFieldSchema();

        expect(schema.fields[0].type).toBe('number');
        expect(schema.fields[1].type).toBe('email');
        expect(schema.fields[2].type).toBe('date');
        expect(schema.fields[3].type).toBe('text'); // boolean as string
      });
    });
  });

  describe('DatabaseIntegrationAdapter', () => {
    let adapter: DatabaseIntegrationAdapter;
    let mockSource: FieldIntegrationSource;

    beforeEach(() => {
      mockSource = {
        id: 'db-source',
        name: 'Database Connection',
        type: 'database',
        credentials: { connectionString: 'postgresql://localhost/test' },
        status: 'disconnected',
      };
      adapter = new DatabaseIntegrationAdapter(mockSource);
    });

    describe('connect', () => {
      it('connects successfully with valid connection string', async () => {
        const config = { connectionString: 'postgresql://localhost/testdb' };
        const result = await adapter.connect(config);
        expect(result).toBe(true);
      });

      it('validates connection correctly', async () => {
        await adapter.connect({ connectionString: 'test-connection' });
        const isValid = await adapter.validateConnection();
        expect(isValid).toBe(true);
      });
    });

    describe('syncFields', () => {
      it('returns mock database fields', async () => {
        await adapter.connect({ connectionString: 'test-connection' });
        const fields = await adapter.syncFields();

        expect(fields).toHaveLength(5);
        expect(fields[0]).toMatchObject({
          name: 'client_name',
          type: 'text',
          label: 'Client Name',
          required: true,
        });
      });

      it('throws error when not connected', async () => {
        await expect(adapter.syncFields()).rejects.toThrow(
          'Not connected to database',
        );
      });
    });

    describe('getFieldSchema', () => {
      it('returns database schema information', async () => {
        const schema = await adapter.getFieldSchema();
        expect(schema).toHaveProperty('tables');
        expect(schema).toHaveProperty('fields');
        expect(schema.tables).toContain('clients');
        expect(schema.tables).toContain('weddings');
      });
    });
  });

  describe('WebhookIntegrationAdapter', () => {
    let adapter: WebhookIntegrationAdapter;
    let mockSource: FieldIntegrationSource;

    beforeEach(() => {
      mockSource = {
        id: 'webhook-source',
        name: 'Webhook Integration',
        type: 'webhook',
        endpoint: 'https://webhook.example.com',
        credentials: { secret: 'webhook-secret' },
        status: 'disconnected',
      };
      adapter = new WebhookIntegrationAdapter(mockSource);
    });

    describe('connect', () => {
      it('connects successfully when webhook endpoint is valid', async () => {
        (fetch as jest.Mock).mockResolvedValueOnce({ ok: true });

        const config = {
          webhookUrl: 'https://webhook.example.com',
          secret: 'test-secret',
        };

        const result = await adapter.connect(config);
        expect(result).toBe(true);
        expect(fetch).toHaveBeenCalledWith(
          'https://webhook.example.com',
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'X-Webhook-Secret': 'test-secret',
            }),
            body: JSON.stringify({ test: true }),
          }),
        );
      });

      it('handles webhook validation failures', async () => {
        (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

        const config = { webhookUrl: 'https://invalid-webhook.com' };
        const result = await adapter.connect(config);
        expect(result).toBe(false);
      });
    });

    describe('syncFields', () => {
      it('returns webhook-specific fields', async () => {
        const fields = await adapter.syncFields();
        expect(fields).toHaveLength(3);
        expect(fields[0]).toMatchObject({
          name: 'form_name',
          type: 'text',
          label: 'Form Name',
        });
      });
    });

    describe('getFieldSchema', () => {
      it('returns webhook schema information', async () => {
        const schema = await adapter.getFieldSchema();
        expect(schema).toHaveProperty('webhook_url');
        expect(schema).toHaveProperty('supported_events');
        expect(schema.supported_events).toContain('form_submitted');
      });
    });
  });

  describe('ExternalFormIntegrationAdapter', () => {
    let adapter: ExternalFormIntegrationAdapter;
    let mockSource: FieldIntegrationSource;

    beforeEach(() => {
      mockSource = {
        id: 'external-form-source',
        name: 'External Form Builder',
        type: 'external_form',
        credentials: { apiKey: 'form-api-key', formId: 'form-123' },
        status: 'disconnected',
      };
      adapter = new ExternalFormIntegrationAdapter(mockSource);
    });

    describe('connect', () => {
      it('connects successfully with valid API key', async () => {
        const config = {
          apiKey: 'valid-api-key',
          formId: 'form-456',
        };

        const result = await adapter.connect(config);
        expect(result).toBe(true);
      });

      it('validates connection based on API key presence', async () => {
        await adapter.connect({ apiKey: 'test-key' });
        const isValid = await adapter.validateConnection();
        expect(isValid).toBe(true);
      });

      it('fails validation without API key', async () => {
        const result = await adapter.connect({ apiKey: '' });
        expect(result).toBe(false);
      });
    });

    describe('syncFields', () => {
      it('returns external form fields', async () => {
        await adapter.connect({ apiKey: 'test-key' });
        const fields = await adapter.syncFields();

        expect(fields).toHaveLength(5);
        expect(fields[0]).toMatchObject({
          name: 'contact_name',
          type: 'text',
          label: 'Contact Name',
          required: true,
        });

        // Check that select field has options
        const selectField = fields.find((f) => f.type === 'select');
        expect(selectField).toBeDefined();
        expect(selectField.options).toHaveLength(3);
      });

      it('throws error when API key is not configured', async () => {
        await expect(adapter.syncFields()).rejects.toThrow(
          'API key not configured',
        );
      });
    });

    describe('getFieldSchema', () => {
      it('returns external form schema information', async () => {
        const schema = await adapter.getFieldSchema();
        expect(schema).toHaveProperty('supported_field_types');
        expect(schema).toHaveProperty('webhook_support');
        expect(schema.supported_field_types).toContain('text');
        expect(schema.supported_field_types).toContain('email');
        expect(schema.webhook_support).toBe(true);
      });
    });
  });

  describe('FieldIntegrationAdapterFactory', () => {
    describe('createAdapter', () => {
      it('creates API adapter correctly', () => {
        const source: FieldIntegrationSource = {
          id: 'test',
          name: 'Test API',
          type: 'api',
          status: 'disconnected',
        };

        const adapter = FieldIntegrationAdapterFactory.createAdapter(source);
        expect(adapter).toBeInstanceOf(APIIntegrationAdapter);
        expect(adapter.type).toBe('api');
      });

      it('creates File adapter correctly', () => {
        const source: FieldIntegrationSource = {
          id: 'test',
          name: 'Test File',
          type: 'file',
          status: 'disconnected',
        };

        const adapter = FieldIntegrationAdapterFactory.createAdapter(source);
        expect(adapter).toBeInstanceOf(FileIntegrationAdapter);
        expect(adapter.type).toBe('file');
      });

      it('creates Database adapter correctly', () => {
        const source: FieldIntegrationSource = {
          id: 'test',
          name: 'Test DB',
          type: 'database',
          status: 'disconnected',
        };

        const adapter = FieldIntegrationAdapterFactory.createAdapter(source);
        expect(adapter).toBeInstanceOf(DatabaseIntegrationAdapter);
        expect(adapter.type).toBe('database');
      });

      it('creates Webhook adapter correctly', () => {
        const source: FieldIntegrationSource = {
          id: 'test',
          name: 'Test Webhook',
          type: 'webhook',
          status: 'disconnected',
        };

        const adapter = FieldIntegrationAdapterFactory.createAdapter(source);
        expect(adapter).toBeInstanceOf(WebhookIntegrationAdapter);
        expect(adapter.type).toBe('webhook');
      });

      it('creates External Form adapter correctly', () => {
        const source: FieldIntegrationSource = {
          id: 'test',
          name: 'Test External Form',
          type: 'external_form',
          status: 'disconnected',
        };

        const adapter = FieldIntegrationAdapterFactory.createAdapter(source);
        expect(adapter).toBeInstanceOf(ExternalFormIntegrationAdapter);
        expect(adapter.type).toBe('external_form');
      });

      it('throws error for unsupported integration type', () => {
        const source = {
          id: 'test',
          name: 'Unsupported',
          type: 'unsupported',
          status: 'disconnected',
        } as any;

        expect(() =>
          FieldIntegrationAdapterFactory.createAdapter(source),
        ).toThrow('Unsupported integration type: unsupported');
      });
    });

    describe('getSupportedTypes', () => {
      it('returns all supported integration types', () => {
        const supportedTypes =
          FieldIntegrationAdapterFactory.getSupportedTypes();
        expect(supportedTypes).toEqual([
          'api',
          'file',
          'database',
          'webhook',
          'external_form',
        ]);
      });
    });
  });

  describe('Common Adapter Interface', () => {
    const adapterTypes = [
      { type: 'api', adapter: APIIntegrationAdapter },
      { type: 'file', adapter: FileIntegrationAdapter },
      { type: 'database', adapter: DatabaseIntegrationAdapter },
      { type: 'webhook', adapter: WebhookIntegrationAdapter },
      { type: 'external_form', adapter: ExternalFormIntegrationAdapter },
    ];

    adapterTypes.forEach(({ type, adapter: AdapterClass }) => {
      describe(`${type} adapter interface compliance`, () => {
        let adapter: any;

        beforeEach(() => {
          const mockSource = {
            id: `${type}-test`,
            name: `Test ${type}`,
            type: type as any,
            status: 'disconnected' as const,
          };
          adapter = new AdapterClass(mockSource);
        });

        it('implements required interface methods', () => {
          expect(adapter).toHaveProperty('name');
          expect(adapter).toHaveProperty('type');
          expect(adapter.connect).toBeInstanceOf(Function);
          expect(adapter.disconnect).toBeInstanceOf(Function);
          expect(adapter.validateConnection).toBeInstanceOf(Function);
          expect(adapter.syncFields).toBeInstanceOf(Function);
          expect(adapter.getFieldSchema).toBeInstanceOf(Function);
        });

        it('has correct type property', () => {
          expect(adapter.type).toBe(type);
        });

        it('disconnect method works', async () => {
          await expect(adapter.disconnect()).resolves.not.toThrow();
        });
      });
    });
  });
});
