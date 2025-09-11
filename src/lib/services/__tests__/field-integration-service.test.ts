/**
 * Tests for FieldIntegrationService
 */

import {
  FieldIntegrationService,
  fieldIntegrationService,
} from '../field-integration-service';
import {
  FieldIntegrationSource,
  IntegrationConfig,
  FieldMapping,
} from '@/components/forms/FieldIntegration';
import { FormField } from '@/types/forms';

// Mock fetch globally
global.fetch = jest.fn();

describe('FieldIntegrationService', () => {
  let service: FieldIntegrationService;

  beforeEach(() => {
    service = FieldIntegrationService.getInstance();
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
  });

  describe('Singleton Pattern', () => {
    it('returns the same instance', () => {
      const instance1 = FieldIntegrationService.getInstance();
      const instance2 = FieldIntegrationService.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('exports the singleton instance', () => {
      expect(fieldIntegrationService).toBe(service);
    });
  });

  describe('connectIntegrationSource', () => {
    it('successfully connects to an API integration', async () => {
      const config = {
        name: 'Test API Integration',
        endpoint: 'https://api.example.com',
        credentials: { apiKey: 'test-key' },
      };

      const result = await service.connectIntegrationSource('api', config);

      expect(result).toMatchObject({
        name: 'Test API Integration',
        type: 'api',
        endpoint: 'https://api.example.com',
        status: 'connected',
      });
      expect(result.id).toBeDefined();
      expect(result.lastSync).toBeInstanceOf(Date);
    });

    it('successfully connects to a file integration', async () => {
      const config = {
        name: 'CSV Import',
        settings: { fileType: 'csv' },
      };

      const result = await service.connectIntegrationSource('file', config);

      expect(result).toMatchObject({
        name: 'CSV Import',
        type: 'file',
        status: 'connected',
      });
    });

    it('handles connection failures', async () => {
      const config = {
        name: 'Invalid API',
        endpoint: 'invalid-url',
      };

      await expect(
        service.connectIntegrationSource('invalid-type', config),
      ).rejects.toThrow('Failed to connect integration');
    });
  });

  describe('syncFieldsFromSource', () => {
    it('syncs fields from API source successfully', async () => {
      const mockFields = [
        { name: 'client_name', type: 'text', label: 'Client Name' },
        { name: 'client_email', type: 'email', label: 'Client Email' },
      ];

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockFields,
      });

      // Mock getting source
      jest.spyOn(service as any, 'getIntegrationSource').mockResolvedValue({
        id: 'test-source',
        type: 'api',
        endpoint: 'https://api.example.com',
        status: 'connected',
      });

      jest
        .spyOn(service as any, 'updateSourceMetadata')
        .mockResolvedValue(undefined);

      const result = await service.syncFieldsFromSource('test-source');

      expect(result).toEqual(mockFields);
      expect(fetch).toHaveBeenCalledWith(
        'https://api.example.com',
        expect.any(Object),
      );
    });

    it('handles sync failures and updates source status', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      jest.spyOn(service as any, 'getIntegrationSource').mockResolvedValue({
        id: 'test-source',
        type: 'api',
        endpoint: 'https://api.example.com',
        status: 'connected',
      });

      const updateMetadataSpy = jest
        .spyOn(service as any, 'updateSourceMetadata')
        .mockResolvedValue(undefined);

      await expect(
        service.syncFieldsFromSource('test-source'),
      ).rejects.toThrow();

      expect(updateMetadataSpy).toHaveBeenCalledWith('test-source', {
        status: 'error',
      });
    });

    it('throws error for non-existent source', async () => {
      jest
        .spyOn(service as any, 'getIntegrationSource')
        .mockResolvedValue(null);

      await expect(
        service.syncFieldsFromSource('non-existent'),
      ).rejects.toThrow('Integration source not found');
    });
  });

  describe('transformFields', () => {
    const sourceFields = [
      {
        name: 'client_name',
        type: 'text',
        label: 'Client Name',
        value: 'John Doe',
      },
      {
        name: 'client_email',
        type: 'email',
        label: 'Client Email',
        value: 'john@example.com',
      },
    ];

    const targetFields: FormField[] = [
      {
        id: 'name',
        type: 'text',
        label: 'Full Name',
        required: true,
        order: 1,
      },
      {
        id: 'email',
        type: 'email',
        label: 'Email Address',
        required: true,
        order: 2,
      },
    ];

    const mappings: FieldMapping[] = [
      {
        sourceField: 'client_name',
        targetField: 'name',
        transformation: 'uppercase',
        required: true,
      },
      {
        sourceField: 'client_email',
        targetField: 'email',
        transformation: 'none',
        required: true,
      },
    ];

    it('transforms fields based on mappings', () => {
      const result = service.transformFields(
        sourceFields,
        mappings,
        targetFields,
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        type: 'text',
        label: 'Client Name',
        required: true,
        defaultValue: 'JOHN DOE', // uppercase transformation
      });
      expect(result[1]).toMatchObject({
        type: 'email',
        label: 'Client Email',
        required: true,
        defaultValue: 'john@example.com', // no transformation
      });
    });

    it('handles missing source fields gracefully', () => {
      const mappingsWithMissingSource: FieldMapping[] = [
        {
          sourceField: 'non_existent',
          targetField: 'name',
          transformation: 'none',
          required: false,
        },
      ];

      const result = service.transformFields(
        sourceFields,
        mappingsWithMissingSource,
        targetFields,
      );

      expect(result).toHaveLength(0); // Filter out null results
    });

    it('applies different transformations correctly', () => {
      const testFields = [
        { name: 'test_field', type: 'text', value: 'Hello World' },
      ];

      const testMappings: FieldMapping[] = [
        {
          sourceField: 'test_field',
          targetField: 'test',
          transformation: 'lowercase',
          required: false,
        },
      ];

      const result = service.transformFields(testFields, testMappings, []);

      expect(result[0].defaultValue).toBe('hello world');
    });

    it('handles date formatting transformation', () => {
      const testFields = [
        { name: 'date_field', type: 'date', value: '2024-03-15T10:30:00Z' },
      ];

      const testMappings: FieldMapping[] = [
        {
          sourceField: 'date_field',
          targetField: 'date',
          transformation: 'date_format',
          required: false,
        },
      ];

      const result = service.transformFields(testFields, testMappings, []);

      expect(result[0].defaultValue).toBe('2024-03-15');
    });
  });

  describe('validateMappings', () => {
    const sourceFields = [
      { name: 'client_name', type: 'text', label: 'Client Name' },
      { name: 'client_email', type: 'email', label: 'Client Email' },
      { name: 'guest_count', type: 'number', label: 'Guest Count' },
    ];

    const targetFields: FormField[] = [
      {
        id: 'name',
        type: 'text',
        label: 'Full Name',
        required: true,
        order: 1,
      },
      {
        id: 'email',
        type: 'email',
        label: 'Email Address',
        required: true,
        order: 2,
      },
      {
        id: 'count',
        type: 'number',
        label: 'Count',
        required: false,
        order: 3,
      },
    ];

    it('validates correct mappings successfully', () => {
      const mappings: FieldMapping[] = [
        {
          sourceField: 'client_name',
          targetField: 'name',
          transformation: 'none',
          required: true,
        },
        {
          sourceField: 'client_email',
          targetField: 'email',
          transformation: 'none',
          required: true,
        },
      ];

      const errors = service.validateMappings(
        mappings,
        sourceFields,
        targetFields,
      );

      expect(errors).toHaveLength(0);
    });

    it('detects missing source fields', () => {
      const mappings: FieldMapping[] = [
        {
          sourceField: 'non_existent',
          targetField: 'name',
          transformation: 'none',
          required: true,
        },
      ];

      const errors = service.validateMappings(
        mappings,
        sourceFields,
        targetFields,
      );

      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain("Source field 'non_existent' not found");
    });

    it('detects missing target fields', () => {
      const mappings: FieldMapping[] = [
        {
          sourceField: 'client_name',
          targetField: 'non_existent',
          transformation: 'none',
          required: true,
        },
      ];

      const errors = service.validateMappings(
        mappings,
        sourceFields,
        targetFields,
      );

      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain("Target field 'non_existent' not found");
    });

    it('detects type compatibility issues', () => {
      const mappings: FieldMapping[] = [
        {
          sourceField: 'guest_count',
          targetField: 'email',
          transformation: 'none',
          required: true,
        },
      ];

      const errors = service.validateMappings(
        mappings,
        sourceFields,
        targetFields,
      );

      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('Cannot map number field to email field');
    });
  });

  describe('saveIntegrationConfig', () => {
    it('saves valid configuration successfully', async () => {
      const config: IntegrationConfig = {
        id: 'test-config',
        name: 'Test Configuration',
        source: {
          id: 'test-source',
          name: 'Test Source',
          type: 'api',
          status: 'connected',
        },
        targetFormId: 'test-form',
        mappings: [
          {
            sourceField: 'name',
            targetField: 'name',
            transformation: 'none',
            required: true,
          },
        ],
        autoSync: false,
        syncInterval: 60,
        validationRules: [],
        isActive: true,
      };

      jest
        .spyOn(service as any, 'persistIntegrationConfig')
        .mockResolvedValue(undefined);

      await expect(
        service.saveIntegrationConfig(config),
      ).resolves.not.toThrow();
    });

    it('rejects invalid configurations', async () => {
      const invalidConfig = {
        name: '', // Empty name
        mappings: [], // No mappings
      } as IntegrationConfig;

      await expect(
        service.saveIntegrationConfig(invalidConfig),
      ).rejects.toThrow('Configuration validation failed');
    });

    it('schedules auto-sync when enabled', async () => {
      const config: IntegrationConfig = {
        id: 'test-config',
        name: 'Auto Sync Config',
        source: {
          id: 'test-source',
          name: 'Test Source',
          type: 'api',
          status: 'connected',
        },
        targetFormId: 'test-form',
        mappings: [
          {
            sourceField: 'name',
            targetField: 'name',
            transformation: 'none',
            required: true,
          },
        ],
        autoSync: true,
        syncInterval: 30,
        validationRules: [],
        isActive: true,
      };

      jest
        .spyOn(service as any, 'persistIntegrationConfig')
        .mockResolvedValue(undefined);
      const scheduleAutoSyncSpy = jest
        .spyOn(service as any, 'scheduleAutoSync')
        .mockResolvedValue(undefined);

      await service.saveIntegrationConfig(config);

      expect(scheduleAutoSyncSpy).toHaveBeenCalledWith(config);
    });
  });

  describe('executeIntegration', () => {
    it('executes integration successfully', async () => {
      const mockConfig: IntegrationConfig = {
        id: 'test-config',
        name: 'Test Config',
        source: {
          id: 'test-source',
          name: 'Test Source',
          type: 'api',
          status: 'connected',
        },
        targetFormId: 'test-form',
        mappings: [
          {
            sourceField: 'name',
            targetField: 'name',
            transformation: 'none',
            required: true,
          },
        ],
        autoSync: false,
        syncInterval: 60,
        validationRules: [],
        isActive: true,
      };

      const mockSourceFields = [
        { name: 'name', type: 'text', label: 'Name', value: 'John Doe' },
      ];

      const mockTargetFields: FormField[] = [
        {
          id: 'name',
          type: 'text',
          label: 'Full Name',
          required: true,
          order: 1,
        },
      ];

      jest
        .spyOn(service as any, 'getIntegrationConfig')
        .mockResolvedValue(mockConfig);
      jest
        .spyOn(service, 'syncFieldsFromSource')
        .mockResolvedValue(mockSourceFields);
      jest
        .spyOn(service as any, 'getFormFields')
        .mockResolvedValue(mockTargetFields);
      jest
        .spyOn(service as any, 'applyValidationRules')
        .mockResolvedValue(undefined);
      jest
        .spyOn(service as any, 'logIntegrationExecution')
        .mockResolvedValue(undefined);

      const result = await service.executeIntegration('test-config');

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        type: 'text',
        label: 'Name',
        required: true,
        defaultValue: 'John Doe',
      });
    });

    it('handles inactive configurations', async () => {
      jest.spyOn(service as any, 'getIntegrationConfig').mockResolvedValue({
        isActive: false,
      });

      await expect(
        service.executeIntegration('inactive-config'),
      ).rejects.toThrow('Integration configuration not found or inactive');
    });

    it('logs errors on failure', async () => {
      jest
        .spyOn(service as any, 'getIntegrationConfig')
        .mockRejectedValue(new Error('Database error'));
      const logErrorSpy = jest
        .spyOn(service as any, 'logIntegrationError')
        .mockResolvedValue(undefined);

      await expect(
        service.executeIntegration('failing-config'),
      ).rejects.toThrow();

      expect(logErrorSpy).toHaveBeenCalledWith(
        'failing-config',
        'Database error',
      );
    });
  });

  describe('Field Type Mapping', () => {
    it('maps common field types correctly', () => {
      const typeMap = [
        { source: 'string', expected: 'text' },
        { source: 'email', expected: 'email' },
        { source: 'phone', expected: 'tel' },
        { source: 'number', expected: 'number' },
        { source: 'boolean', expected: 'checkbox' },
        { source: 'date', expected: 'date' },
        { source: 'unknown', expected: 'text' },
      ];

      typeMap.forEach(({ source, expected }) => {
        const result = (service as any).mapFieldType(source);
        expect(result).toBe(expected);
      });
    });

    it('respects preferred type when provided', () => {
      const result = (service as any).mapFieldType('string', 'textarea');
      expect(result).toBe('textarea');
    });
  });

  describe('Type Compatibility Checking', () => {
    it('detects incompatible type mappings', () => {
      const incompatibleMappings = [
        { source: 'number', target: 'email' },
        { source: 'date', target: 'number' },
        { source: 'boolean', target: 'text' },
      ];

      incompatibleMappings.forEach(({ source, target }) => {
        const result = (service as any).checkTypeCompatibility(source, target);
        expect(result).not.toBeNull();
        expect(typeof result).toBe('string');
      });
    });

    it('allows compatible type mappings', () => {
      const compatibleMappings = [
        { source: 'text', target: 'text' },
        { source: 'email', target: 'email' },
        { source: 'number', target: 'number' },
      ];

      compatibleMappings.forEach(({ source, target }) => {
        const result = (service as any).checkTypeCompatibility(source, target);
        expect(result).toBeNull();
      });
    });
  });

  describe('Configuration Validation', () => {
    it('validates required configuration fields', () => {
      const invalidConfigs = [
        { name: '', source: {}, targetFormId: 'test', mappings: [] },
        { name: 'Test', source: null, targetFormId: 'test', mappings: [] },
        { name: 'Test', source: {}, targetFormId: '', mappings: [] },
        { name: 'Test', source: {}, targetFormId: 'test', mappings: [] },
      ];

      invalidConfigs.forEach((config) => {
        const errors = (service as any).validateIntegrationConfig(config);
        expect(errors.length).toBeGreaterThan(0);
      });
    });

    it('passes validation for valid configurations', () => {
      const validConfig = {
        name: 'Valid Config',
        source: { id: 'test' },
        targetFormId: 'test-form',
        mappings: [
          {
            sourceField: 'test',
            targetField: 'test',
            transformation: 'none',
            required: false,
          },
        ],
      };

      const errors = (service as any).validateIntegrationConfig(validConfig);
      expect(errors).toHaveLength(0);
    });
  });

  describe('Transformations', () => {
    it('applies uppercase transformation', () => {
      const result = (service as any).applyTransformation(
        'hello world',
        'uppercase',
      );
      expect(result).toBe('HELLO WORLD');
    });

    it('applies lowercase transformation', () => {
      const result = (service as any).applyTransformation(
        'HELLO WORLD',
        'lowercase',
      );
      expect(result).toBe('hello world');
    });

    it('applies date format transformation', () => {
      const result = (service as any).applyTransformation(
        '2024-03-15T10:30:00Z',
        'date_format',
      );
      expect(result).toBe('2024-03-15');
    });

    it('handles null/undefined values', () => {
      expect(
        (service as any).applyTransformation(null, 'uppercase'),
      ).toBeNull();
      expect(
        (service as any).applyTransformation(undefined, 'lowercase'),
      ).toBeUndefined();
    });

    it('returns original value for no transformation', () => {
      const original = 'test value';
      const result = (service as any).applyTransformation(original, 'none');
      expect(result).toBe(original);
    });
  });
});
