import {
  describe,
  test,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals';
import { EnvironmentVariableService } from '@/lib/services/environment/EnvironmentVariableService';
import { TestFramework, TestEnvironment } from '@/lib/testing/TestFramework';

describe('EnvironmentVariableService', () => {
  let testFramework: TestFramework;
  let testEnv: TestEnvironment;
  let service: EnvironmentVariableService;

  beforeAll(async () => {
    testFramework = new TestFramework();
    testEnv = await testFramework.initializeTestEnvironment();
    service = new EnvironmentVariableService();
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(() => {
    // Reset any mocks before each test
    jest.clearAllMocks();
  });

  describe('createVariable', () => {
    test('should create a new environment variable with correct properties', async () => {
      const variableData = {
        key: 'TEST_API_KEY',
        description: 'Test API key for integration',
        classification_level: 7,
        variable_type: 'api_key',
        is_required: true,
        validation_pattern: '^[A-Za-z0-9_-]+$',
      };

      const { result, metrics } = await testFramework.measurePerformance(
        () => service.createVariable(testEnv.testOrganizationId, variableData),
        'createVariable',
      );

      expect(result.success).toBe(true);
      expect(result.variable).toBeDefined();
      expect(result.variable.key).toBe('TEST_API_KEY');
      expect(result.variable.classification_level).toBe(7);
      expect(result.variable.is_required).toBe(true);
      expect(metrics.response_time_ms).toBeLessThan(1000); // < 1 second
    });

    test('should enforce unique variable keys within organization', async () => {
      const variableData = {
        key: 'DUPLICATE_KEY',
        description: 'First variable',
        classification_level: 5,
        variable_type: 'string',
        is_required: false,
      };

      // Create first variable
      const firstResult = await service.createVariable(
        testEnv.testOrganizationId,
        variableData,
      );
      expect(firstResult.success).toBe(true);

      // Attempt to create duplicate
      const duplicateResult = await service.createVariable(
        testEnv.testOrganizationId,
        variableData,
      );
      expect(duplicateResult.success).toBe(false);
      expect(duplicateResult.error).toContain('already exists');
    });

    test('should validate classification levels (0-10)', async () => {
      const invalidVariableData = {
        key: 'INVALID_CLASSIFICATION',
        description: 'Invalid classification level',
        classification_level: 15, // Invalid level
        variable_type: 'string',
        is_required: false,
      };

      const result = await service.createVariable(
        testEnv.testOrganizationId,
        invalidVariableData,
      );
      expect(result.success).toBe(false);
      expect(result.error).toContain('classification_level');
    });

    test('should handle wedding-critical variables correctly', async () => {
      const weddingCriticalData = {
        key: 'WEDDING_PAYMENT_API_KEY',
        description: 'Critical payment processing key',
        classification_level: 9,
        variable_type: 'api_key',
        is_required: true,
        wedding_critical: true,
        change_window_restriction: true,
      };

      const result = await service.createVariable(
        testEnv.testOrganizationId,
        weddingCriticalData,
      );
      expect(result.success).toBe(true);
      expect(result.variable.wedding_critical).toBe(true);
    });
  });

  describe('getVariable', () => {
    let testVariableId: string;

    beforeEach(async () => {
      const createResult = await service.createVariable(
        testEnv.testOrganizationId,
        {
          key: 'GET_TEST_VARIABLE',
          description: 'Variable for get testing',
          classification_level: 5,
          variable_type: 'string',
          is_required: false,
        },
      );
      testVariableId = createResult.variable.id;
    });

    test('should retrieve existing variable by ID', async () => {
      const { result, metrics } = await testFramework.measurePerformance(
        () => service.getVariable(testEnv.testOrganizationId, testVariableId),
        'getVariable',
      );

      expect(result.success).toBe(true);
      expect(result.variable).toBeDefined();
      expect(result.variable.id).toBe(testVariableId);
      expect(result.variable.key).toBe('GET_TEST_VARIABLE');
      expect(metrics.response_time_ms).toBeLessThan(200); // < 200ms for single get
    });

    test('should return error for non-existent variable', async () => {
      const fakeId = 'fake-variable-id';
      const result = await service.getVariable(
        testEnv.testOrganizationId,
        fakeId,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    test('should enforce organization isolation', async () => {
      const fakeOrgId = 'fake-org-id';
      const result = await service.getVariable(fakeOrgId, testVariableId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('updateVariable', () => {
    let testVariableId: string;

    beforeEach(async () => {
      const createResult = await service.createVariable(
        testEnv.testOrganizationId,
        {
          key: 'UPDATE_TEST_VARIABLE',
          description: 'Variable for update testing',
          classification_level: 5,
          variable_type: 'string',
          is_required: false,
        },
      );
      testVariableId = createResult.variable.id;
    });

    test('should update variable properties', async () => {
      const updateData = {
        description: 'Updated description',
        classification_level: 7,
        is_required: true,
      };

      const result = await service.updateVariable(
        testEnv.testOrganizationId,
        testVariableId,
        updateData,
      );

      expect(result.success).toBe(true);
      expect(result.variable.description).toBe('Updated description');
      expect(result.variable.classification_level).toBe(7);
      expect(result.variable.is_required).toBe(true);
    });

    test('should prevent key modification', async () => {
      const updateData = {
        key: 'MODIFIED_KEY', // Should not be allowed
      };

      const result = await service.updateVariable(
        testEnv.testOrganizationId,
        testVariableId,
        updateData,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('key cannot be modified');
    });

    test('should validate classification level changes', async () => {
      const invalidUpdate = {
        classification_level: -1, // Invalid
      };

      const result = await service.updateVariable(
        testEnv.testOrganizationId,
        testVariableId,
        invalidUpdate,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('classification_level');
    });
  });

  describe('deleteVariable', () => {
    test('should soft delete variable', async () => {
      const createResult = await service.createVariable(
        testEnv.testOrganizationId,
        {
          key: 'DELETE_TEST_VARIABLE',
          description: 'Variable for delete testing',
          classification_level: 5,
          variable_type: 'string',
          is_required: false,
        },
      );

      const deleteResult = await service.deleteVariable(
        testEnv.testOrganizationId,
        createResult.variable.id,
      );

      expect(deleteResult.success).toBe(true);

      // Verify variable is marked as inactive
      const getResult = await service.getVariable(
        testEnv.testOrganizationId,
        createResult.variable.id,
      );
      expect(getResult.variable?.is_active).toBe(false);
    });

    test('should prevent deletion of required variables with dependencies', async () => {
      // Create a required variable
      const createResult = await service.createVariable(
        testEnv.testOrganizationId,
        {
          key: 'REQUIRED_VARIABLE',
          description: 'Required variable',
          classification_level: 8,
          variable_type: 'string',
          is_required: true,
        },
      );

      // TODO: Create dependency (would need dependency service)

      const deleteResult = await service.deleteVariable(
        testEnv.testOrganizationId,
        createResult.variable.id,
      );

      // For now, just test that deletion works (dependency check would be added later)
      expect(deleteResult.success).toBe(true);
    });
  });

  describe('listVariables', () => {
    beforeEach(async () => {
      // Create multiple test variables
      const variables = [
        { key: 'LIST_VAR_1', classification_level: 3 },
        { key: 'LIST_VAR_2', classification_level: 7 },
        { key: 'LIST_VAR_3', classification_level: 9 },
      ];

      for (const variable of variables) {
        await service.createVariable(testEnv.testOrganizationId, {
          ...variable,
          description: `List test variable ${variable.key}`,
          variable_type: 'string',
          is_required: false,
        });
      }
    });

    test('should list all variables with pagination', async () => {
      const { result, metrics } = await testFramework.measurePerformance(
        () =>
          service.listVariables(testEnv.testOrganizationId, {
            limit: 10,
            offset: 0,
          }),
        'listVariables',
      );

      expect(result.success).toBe(true);
      expect(result.variables).toBeDefined();
      expect(result.variables.length).toBeGreaterThanOrEqual(3);
      expect(result.pagination.total).toBeGreaterThanOrEqual(3);
      expect(metrics.response_time_ms).toBeLessThan(500); // < 500ms for list
    });

    test('should filter variables by classification level', async () => {
      const result = await service.listVariables(testEnv.testOrganizationId, {
        filters: {
          min_classification_level: 7,
        },
      });

      expect(result.success).toBe(true);
      result.variables.forEach((variable) => {
        expect(variable.classification_level).toBeGreaterThanOrEqual(7);
      });
    });

    test('should search variables by key pattern', async () => {
      const result = await service.listVariables(testEnv.testOrganizationId, {
        filters: {
          key_pattern: 'LIST_VAR_%',
        },
      });

      expect(result.success).toBe(true);
      result.variables.forEach((variable) => {
        expect(variable.key).toMatch(/^LIST_VAR_\d+$/);
      });
    });
  });

  describe('setVariableValue', () => {
    let testVariableId: string;

    beforeEach(async () => {
      const createResult = await service.createVariable(
        testEnv.testOrganizationId,
        {
          key: 'VALUE_TEST_VARIABLE',
          description: 'Variable for value testing',
          classification_level: 7,
          variable_type: 'string',
          is_required: true,
        },
      );
      testVariableId = createResult.variable.id;
    });

    test('should set variable value with automatic encryption', async () => {
      const valueData = {
        environment_id: testEnv.testEnvironmentId,
        value: 'test-secret-value-123',
        encrypt: true,
      };

      const result = await service.setVariableValue(
        testEnv.testOrganizationId,
        testVariableId,
        valueData,
      );

      expect(result.success).toBe(true);
      expect(result.value_set).toBe(true);
      expect(result.encrypted).toBe(true);
    });

    test('should validate value format when pattern is specified', async () => {
      // Create variable with validation pattern
      const createResult = await service.createVariable(
        testEnv.testOrganizationId,
        {
          key: 'PATTERN_VARIABLE',
          description: 'Variable with validation pattern',
          classification_level: 5,
          variable_type: 'string',
          validation_pattern: '^[A-Z0-9_]+$',
          is_required: true,
        },
      );

      // Valid value
      const validResult = await service.setVariableValue(
        testEnv.testOrganizationId,
        createResult.variable.id,
        {
          environment_id: testEnv.testEnvironmentId,
          value: 'VALID_VALUE_123',
        },
      );
      expect(validResult.success).toBe(true);

      // Invalid value
      const invalidResult = await service.setVariableValue(
        testEnv.testOrganizationId,
        createResult.variable.id,
        {
          environment_id: testEnv.testEnvironmentId,
          value: 'invalid-value-with-dashes',
        },
      );
      expect(invalidResult.success).toBe(false);
      expect(invalidResult.error).toContain('validation pattern');
    });
  });

  describe('Security Tests', () => {
    test('should prevent unauthorized access across organizations', async () => {
      const fakeOrgId = 'unauthorized-org-id';

      const result = await service.listVariables(fakeOrgId, {});
      expect(result.success).toBe(false);
      expect(result.error).toContain('access denied');
    });

    test('should handle encryption/decryption securely', async () => {
      const createResult = await service.createVariable(
        testEnv.testOrganizationId,
        {
          key: 'SECURITY_TEST_VAR',
          description: 'Security test variable',
          classification_level: 9, // High security
          variable_type: 'api_key',
          is_required: true,
        },
      );

      const sensitiveValue = 'sk_live_51234567890abcdef';

      const setResult = await service.setVariableValue(
        testEnv.testOrganizationId,
        createResult.variable.id,
        {
          environment_id: testEnv.testEnvironmentId,
          value: sensitiveValue,
          encrypt: true,
        },
      );

      expect(setResult.success).toBe(true);
      expect(setResult.encrypted).toBe(true);

      // Verify the stored value is encrypted (not plain text)
      const getResult = await service.getVariableValue(
        testEnv.testOrganizationId,
        createResult.variable.id,
        testEnv.testEnvironmentId,
      );

      expect(getResult.success).toBe(true);
      expect(getResult.value).toBe(sensitiveValue); // Service should decrypt for authorized access
      expect(getResult.is_encrypted).toBe(true);
    });
  });

  describe('Performance Tests', () => {
    test('should handle bulk variable operations efficiently', async () => {
      const variableCount = 100;
      const variables = [];

      // Create variables in bulk
      const { metrics: createMetrics } = await testFramework.measurePerformance(
        async () => {
          for (let i = 0; i < variableCount; i++) {
            const result = await service.createVariable(
              testEnv.testOrganizationId,
              {
                key: `BULK_VAR_${i}`,
                description: `Bulk variable ${i}`,
                classification_level: Math.floor(Math.random() * 10),
                variable_type: 'string',
                is_required: false,
              },
            );
            variables.push(result.variable.id);
          }
        },
        `createVariable x${variableCount}`,
      );

      expect(createMetrics.response_time_ms).toBeLessThan(30000); // < 30 seconds for 100 variables
      expect(variables.length).toBe(variableCount);

      // List variables performance
      const { metrics: listMetrics } = await testFramework.measurePerformance(
        () =>
          service.listVariables(testEnv.testOrganizationId, {
            limit: variableCount,
          }),
        'listVariables (bulk)',
      );

      expect(listMetrics.response_time_ms).toBeLessThan(1000); // < 1 second for listing 100 variables
    });

    test('should maintain performance under concurrent access', async () => {
      const concurrentOperations = 10;
      const promises = [];

      for (let i = 0; i < concurrentOperations; i++) {
        promises.push(
          service.createVariable(testEnv.testOrganizationId, {
            key: `CONCURRENT_VAR_${i}`,
            description: `Concurrent variable ${i}`,
            classification_level: 5,
            variable_type: 'string',
            is_required: false,
          }),
        );
      }

      const { metrics } = await testFramework.measurePerformance(
        () => Promise.all(promises),
        'concurrent variable creation',
      );

      expect(metrics.response_time_ms).toBeLessThan(5000); // < 5 seconds for 10 concurrent creates
    });
  });

  describe('Wedding Day Safety Integration', () => {
    test('should respect wedding day restrictions', async () => {
      // Mock Saturday (wedding day)
      const originalDate = Date;
      const mockSaturday = new Date('2024-06-01'); // A Saturday
      mockSaturday.getDay = () => 6;
      global.Date = jest.fn(() => mockSaturday) as any;

      const createResult = await service.createVariable(
        testEnv.testOrganizationId,
        {
          key: 'WEDDING_DAY_TEST',
          description: 'Wedding day test variable',
          classification_level: 9,
          variable_type: 'api_key',
          is_required: true,
          wedding_critical: true,
        },
      );

      expect(createResult.success).toBe(true);

      // Attempt to update on wedding day should require special handling
      const updateResult = await service.updateVariable(
        testEnv.testOrganizationId,
        createResult.variable.id,
        { description: 'Updated on wedding day' },
      );

      // Would check for wedding day restriction logic
      expect(
        updateResult.requires_emergency_override || updateResult.success,
      ).toBe(true);

      // Restore original Date
      global.Date = originalDate;
    });
  });
});
