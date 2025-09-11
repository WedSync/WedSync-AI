/**
 * WS-256 Environment Variables Management System - Schema Validation Tests
 * Tests database schema constraints, relationships, and data integrity
 * 
 * Critical for: Wedding platform stability, data integrity, constraint validation
 */

import { describe, beforeAll, beforeEach, afterAll, afterEach, it, expect } from '@jest/globals';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { faker } from '@faker-js/faker';

describe('WS-256 Environment Variables - Schema Validation Tests', () => {
  let supabase: SupabaseClient;
  let testOrgId: string;
  let testUserId: string;
  let testEnvId: string;
  let testVariableId: string;

  beforeAll(async () => {
    // Initialize Supabase client for testing
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: { autoRefreshToken: false, persistSession: false }
      }
    );

    // Create test organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert([{
        id: faker.string.uuid(),
        name: 'Test Org - WS256 Schema',
        slug: `test-org-schema-${Date.now()}`,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (orgError) throw orgError;
    testOrgId = org.id;

    // Create test user
    const { data: user, error: userError } = await supabase
      .from('user_profiles')
      .insert([{
        id: faker.string.uuid(),
        organization_id: testOrgId,
        email: faker.internet.email(),
        role: 'admin',
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (userError) throw userError;
    testUserId = user.id;

    // Get test environment ID
    const { data: env, error: envError } = await supabase
      .from('environments')
      .select('id')
      .eq('name', 'development')
      .single();

    if (envError) throw envError;
    testEnvId = env.id;
  });

  afterAll(async () => {
    // Cleanup test data
    await supabase.from('organizations').delete().eq('id', testOrgId);
    await supabase.from('user_profiles').delete().eq('id', testUserId);
  });

  beforeEach(async () => {
    // Clean up any test variables before each test
    await supabase
      .from('environment_variables')
      .delete()
      .eq('organization_id', testOrgId);
  });

  describe('Environment Variables Table Schema', () => {
    it('should create environment variable with all required fields', async () => {
      const variableData = {
        organization_id: testOrgId,
        name: 'TEST_API_KEY',
        display_name: 'Test API Key',
        description: 'Test API key for schema validation',
        variable_type: 'api_key',
        security_classification: 'confidential',
        is_required: true,
        is_wedding_critical: false,
        created_by: testUserId
      };

      const { data, error } = await supabase
        .from('environment_variables')
        .insert([variableData])
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeTruthy();
      expect(data.id).toBeTruthy();
      expect(data.name).toBe(variableData.name);
      expect(data.organization_id).toBe(testOrgId);
      expect(data.created_at).toBeTruthy();
      expect(data.updated_at).toBeTruthy();

      testVariableId = data.id;
    });

    it('should enforce unique constraint on organization_id + name', async () => {
      const variableData = {
        organization_id: testOrgId,
        name: 'DUPLICATE_TEST_KEY',
        created_by: testUserId
      };

      // Insert first variable
      const { error: firstError } = await supabase
        .from('environment_variables')
        .insert([variableData]);

      expect(firstError).toBeNull();

      // Attempt to insert duplicate
      const { error: duplicateError } = await supabase
        .from('environment_variables')
        .insert([variableData]);

      expect(duplicateError).toBeTruthy();
      expect(duplicateError?.code).toBe('23505'); // Unique violation
      expect(duplicateError?.message).toContain('environment_variables_unique_per_org');
    });

    it('should validate variable_type enum constraint', async () => {
      const invalidVariableData = {
        organization_id: testOrgId,
        name: 'INVALID_TYPE_TEST',
        variable_type: 'invalid_type',
        created_by: testUserId
      };

      const { error } = await supabase
        .from('environment_variables')
        .insert([invalidVariableData]);

      expect(error).toBeTruthy();
      expect(error?.code).toBe('23514'); // Check violation
    });

    it('should validate name format constraint (uppercase with underscores)', async () => {
      const invalidNameData = {
        organization_id: testOrgId,
        name: 'invalid-name-format',
        created_by: testUserId
      };

      const { error } = await supabase
        .from('environment_variables')
        .insert([invalidNameData]);

      expect(error).toBeTruthy();
      expect(error?.code).toBe('23514'); // Check violation
      expect(error?.message).toContain('environment_variables_valid_name');
    });

    it('should require organization_id foreign key', async () => {
      const invalidOrgData = {
        organization_id: faker.string.uuid(),
        name: 'TEST_FOREIGN_KEY',
        created_by: testUserId
      };

      const { error } = await supabase
        .from('environment_variables')
        .insert([invalidOrgData]);

      expect(error).toBeTruthy();
      expect(error?.code).toBe('23503'); // Foreign key violation
    });
  });

  describe('Environment Variable Values Table Schema', () => {
    beforeEach(async () => {
      // Create a test variable for value tests
      const { data: variable } = await supabase
        .from('environment_variables')
        .insert([{
          organization_id: testOrgId,
          name: 'TEST_VALUE_VARIABLE',
          created_by: testUserId
        }])
        .select()
        .single();

      testVariableId = variable.id;
    });

    it('should create environment variable value with proper relationships', async () => {
      const { data: encKey } = await supabase
        .from('encryption_keys')
        .select('id')
        .eq('key_name', 'default_env_key')
        .single();

      const valueData = {
        environment_variable_id: testVariableId,
        environment_id: testEnvId,
        encrypted_value: 'encrypted_test_value_123',
        encryption_key_id: encKey.id,
        value_hash: 'hash_of_test_value',
        created_by: testUserId
      };

      const { data, error } = await supabase
        .from('environment_variable_values')
        .insert([valueData])
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeTruthy();
      expect(data.environment_variable_id).toBe(testVariableId);
      expect(data.environment_id).toBe(testEnvId);
      expect(data.encrypted_value).toBe(valueData.encrypted_value);
    });

    it('should enforce unique constraint on variable_id + environment_id', async () => {
      const { data: encKey } = await supabase
        .from('encryption_keys')
        .select('id')
        .eq('key_name', 'default_env_key')
        .single();

      const valueData = {
        environment_variable_id: testVariableId,
        environment_id: testEnvId,
        encrypted_value: 'test_value',
        encryption_key_id: encKey.id,
        created_by: testUserId
      };

      // Insert first value
      const { error: firstError } = await supabase
        .from('environment_variable_values')
        .insert([valueData]);

      expect(firstError).toBeNull();

      // Attempt duplicate
      const { error: duplicateError } = await supabase
        .from('environment_variable_values')
        .insert([valueData]);

      expect(duplicateError).toBeTruthy();
      expect(duplicateError?.code).toBe('23505');
      expect(duplicateError?.message).toContain('environment_variable_values_unique_per_env');
    });

    it('should require valid foreign keys', async () => {
      const invalidValueData = {
        environment_variable_id: faker.string.uuid(),
        environment_id: testEnvId,
        encrypted_value: 'test',
        encryption_key_id: faker.string.uuid(),
        created_by: testUserId
      };

      const { error } = await supabase
        .from('environment_variable_values')
        .insert([invalidValueData]);

      expect(error).toBeTruthy();
      expect(error?.code).toBe('23503'); // Foreign key violation
    });

    it('should validate override reason constraint', async () => {
      const { data: encKey } = await supabase
        .from('encryption_keys')
        .select('id')
        .eq('key_name', 'default_env_key')
        .single();

      const invalidOverrideData = {
        environment_variable_id: testVariableId,
        environment_id: testEnvId,
        encrypted_value: 'test',
        encryption_key_id: encKey.id,
        is_overridden: true,
        override_reason: null, // Should fail - override reason required when is_overridden = true
        created_by: testUserId
      };

      const { error } = await supabase
        .from('environment_variable_values')
        .insert([invalidOverrideData]);

      expect(error).toBeTruthy();
      expect(error?.code).toBe('23514'); // Check violation
      expect(error?.message).toContain('environment_variable_values_override_reason');
    });
  });

  describe('Security Classifications Table Schema', () => {
    it('should have default security classifications', async () => {
      const { data: classifications, error } = await supabase
        .from('security_classifications')
        .select('*')
        .order('level');

      expect(error).toBeNull();
      expect(classifications).toBeTruthy();
      expect(classifications.length).toBeGreaterThanOrEqual(5);

      // Verify default classifications exist
      const classificationNames = classifications.map(c => c.name);
      expect(classificationNames).toContain('public');
      expect(classificationNames).toContain('internal');
      expect(classificationNames).toContain('confidential');
      expect(classificationNames).toContain('secret');
      expect(classificationNames).toContain('top_secret');
    });

    it('should enforce unique name constraint', async () => {
      const duplicateClassification = {
        name: 'public',
        level: 99,
        description: 'Duplicate test'
      };

      const { error } = await supabase
        .from('security_classifications')
        .insert([duplicateClassification]);

      expect(error).toBeTruthy();
      expect(error?.code).toBe('23505'); // Unique violation
    });

    it('should validate level constraint (0-100)', async () => {
      const invalidLevelClassification = {
        name: 'invalid_level',
        level: 101, // Should fail - level must be 0-100
        description: 'Invalid level test'
      };

      const { error } = await supabase
        .from('security_classifications')
        .insert([invalidLevelClassification]);

      expect(error).toBeTruthy();
      expect(error?.code).toBe('23514'); // Check violation
      expect(error?.message).toContain('security_classifications_valid_level');
    });
  });

  describe('Audit Trail Table Schema', () => {
    it('should log audit events with proper constraints', async () => {
      // Create test variable first
      const { data: variable } = await supabase
        .from('environment_variables')
        .insert([{
          organization_id: testOrgId,
          name: 'TEST_AUDIT_VARIABLE',
          created_by: testUserId
        }])
        .select()
        .single();

      const auditData = {
        organization_id: testOrgId,
        environment_variable_id: variable.id,
        environment_id: testEnvId,
        action: 'create',
        actor_id: testUserId,
        details: { test: 'audit details' },
        severity: 'info'
      };

      const { data, error } = await supabase
        .from('environment_variable_audit')
        .insert([auditData])
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeTruthy();
      expect(data.action).toBe('create');
      expect(data.organization_id).toBe(testOrgId);
      expect(data.created_at).toBeTruthy();
    });

    it('should validate action enum constraint', async () => {
      const invalidAuditData = {
        organization_id: testOrgId,
        action: 'invalid_action',
        actor_id: testUserId,
        details: {}
      };

      const { error } = await supabase
        .from('environment_variable_audit')
        .insert([invalidAuditData]);

      expect(error).toBeTruthy();
      expect(error?.code).toBe('23514'); // Check violation
    });

    it('should validate severity enum constraint', async () => {
      const invalidSeverityData = {
        organization_id: testOrgId,
        action: 'read',
        actor_id: testUserId,
        severity: 'invalid_severity',
        details: {}
      };

      const { error } = await supabase
        .from('environment_variable_audit')
        .insert([invalidSeverityData]);

      expect(error).toBeTruthy();
      expect(error?.code).toBe('23514'); // Check violation
    });

    it('should validate details JSONB constraint', async () => {
      const validDetailsData = {
        organization_id: testOrgId,
        action: 'read',
        actor_id: testUserId,
        details: { valid: 'json object' }
      };

      const { error } = await supabase
        .from('environment_variable_audit')
        .insert([validDetailsData]);

      expect(error).toBeNull();
    });
  });

  describe('Configuration Drift Table Schema', () => {
    it('should create drift record with proper relationships', async () => {
      const { data: envs } = await supabase
        .from('environments')
        .select('id')
        .limit(2);

      expect(envs.length).toBeGreaterThanOrEqual(2);

      const driftData = {
        organization_id: testOrgId,
        source_environment_id: envs[0].id,
        target_environment_id: envs[1].id,
        drift_type: 'missing_variable',
        variable_name: 'MISSING_TEST_VAR',
        drift_severity: 'high'
      };

      const { data, error } = await supabase
        .from('configuration_drift')
        .insert([driftData])
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeTruthy();
      expect(data.drift_type).toBe('missing_variable');
      expect(data.is_resolved).toBe(false);
      expect(data.detected_at).toBeTruthy();
    });

    it('should enforce different environments constraint', async () => {
      const sameEnvDriftData = {
        organization_id: testOrgId,
        source_environment_id: testEnvId,
        target_environment_id: testEnvId, // Same as source - should fail
        drift_type: 'value_mismatch',
        variable_name: 'TEST_VAR',
        drift_severity: 'medium'
      };

      const { error } = await supabase
        .from('configuration_drift')
        .insert([sameEnvDriftData]);

      expect(error).toBeTruthy();
      expect(error?.code).toBe('23514'); // Check violation
      expect(error?.message).toContain('configuration_drift_different_environments');
    });

    it('should validate drift_type enum constraint', async () => {
      const { data: envs } = await supabase
        .from('environments')
        .select('id')
        .limit(2);

      const invalidDriftTypeData = {
        organization_id: testOrgId,
        source_environment_id: envs[0].id,
        target_environment_id: envs[1].id,
        drift_type: 'invalid_drift_type',
        variable_name: 'TEST_VAR',
        drift_severity: 'low'
      };

      const { error } = await supabase
        .from('configuration_drift')
        .insert([invalidDriftTypeData]);

      expect(error).toBeTruthy();
      expect(error?.code).toBe('23514'); // Check violation
    });

    it('should validate resolution constraint', async () => {
      const { data: envs } = await supabase
        .from('environments')
        .select('id')
        .limit(2);

      // Create drift record
      const { data: drift } = await supabase
        .from('configuration_drift')
        .insert([{
          organization_id: testOrgId,
          source_environment_id: envs[0].id,
          target_environment_id: envs[1].id,
          drift_type: 'value_mismatch',
          variable_name: 'TEST_RESOLUTION',
          drift_severity: 'medium'
        }])
        .select()
        .single();

      // Test invalid resolution state (resolved = true but missing resolved_by/resolved_at)
      const { error } = await supabase
        .from('configuration_drift')
        .update({
          is_resolved: true,
          resolved_by: null,
          resolved_at: null
        })
        .eq('id', drift.id);

      expect(error).toBeTruthy();
      expect(error?.code).toBe('23514'); // Check violation
      expect(error?.message).toContain('configuration_drift_resolution');
    });
  });

  describe('Deployment Syncs Table Schema', () => {
    it('should create deployment sync with valid counts', async () => {
      const syncData = {
        organization_id: testOrgId,
        environment_id: testEnvId,
        sync_type: 'manual',
        status: 'pending',
        variables_count: 10,
        variables_synced: 5,
        errors_count: 1,
        initiated_by: testUserId
      };

      const { data, error } = await supabase
        .from('deployment_syncs')
        .insert([syncData])
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeTruthy();
      expect(data.variables_count).toBe(10);
      expect(data.variables_synced).toBe(5);
      expect(data.errors_count).toBe(1);
    });

    it('should validate count constraints', async () => {
      const invalidCountData = {
        organization_id: testOrgId,
        environment_id: testEnvId,
        sync_type: 'manual',
        variables_count: 5,
        variables_synced: 10, // More synced than total - should fail
        errors_count: 0,
        initiated_by: testUserId
      };

      const { error } = await supabase
        .from('deployment_syncs')
        .insert([invalidCountData]);

      expect(error).toBeTruthy();
      expect(error?.code).toBe('23514'); // Check violation
      expect(error?.message).toContain('deployment_syncs_valid_counts');
    });

    it('should validate sync_type enum constraint', async () => {
      const invalidSyncTypeData = {
        organization_id: testOrgId,
        environment_id: testEnvId,
        sync_type: 'invalid_sync_type',
        initiated_by: testUserId
      };

      const { error } = await supabase
        .from('deployment_syncs')
        .insert([invalidSyncTypeData]);

      expect(error).toBeTruthy();
      expect(error?.code).toBe('23514'); // Check violation
    });
  });

  describe('Variable Validations Table Schema', () => {
    beforeEach(async () => {
      // Create test variable for validation tests
      const { data: variable } = await supabase
        .from('environment_variables')
        .insert([{
          organization_id: testOrgId,
          name: 'TEST_VALIDATION_VAR',
          created_by: testUserId
        }])
        .select()
        .single();

      testVariableId = variable.id;
    });

    it('should create validation record with proper relationships', async () => {
      const validationData = {
        environment_variable_id: testVariableId,
        environment_id: testEnvId,
        validation_type: 'syntax',
        status: 'passed',
        result_message: 'Validation successful',
        validated_by: testUserId
      };

      const { data, error } = await supabase
        .from('variable_validations')
        .insert([validationData])
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeTruthy();
      expect(data.validation_type).toBe('syntax');
      expect(data.status).toBe('passed');
      expect(data.validated_at).toBeTruthy();
    });

    it('should enforce unique constraint per validation type', async () => {
      const validationData = {
        environment_variable_id: testVariableId,
        environment_id: testEnvId,
        validation_type: 'connectivity',
        status: 'passed',
        validated_by: testUserId
      };

      // Insert first validation
      const { error: firstError } = await supabase
        .from('variable_validations')
        .insert([validationData]);

      expect(firstError).toBeNull();

      // Attempt duplicate (same variable + environment + type)
      const { error: duplicateError } = await supabase
        .from('variable_validations')
        .insert([validationData]);

      expect(duplicateError).toBeTruthy();
      expect(duplicateError?.code).toBe('23505');
      expect(duplicateError?.message).toContain('variable_validations_unique_latest');
    });

    it('should validate validation_type enum constraint', async () => {
      const invalidValidationData = {
        environment_variable_id: testVariableId,
        environment_id: testEnvId,
        validation_type: 'invalid_validation_type',
        status: 'failed',
        validated_by: testUserId
      };

      const { error } = await supabase
        .from('variable_validations')
        .insert([invalidValidationData]);

      expect(error).toBeTruthy();
      expect(error?.code).toBe('23514'); // Check violation
    });

    it('should validate duration constraint', async () => {
      const negativeDurationData = {
        environment_variable_id: testVariableId,
        environment_id: testEnvId,
        validation_type: 'performance',
        status: 'failed',
        validation_duration_ms: -100, // Negative duration should fail
        validated_by: testUserId
      };

      const { error } = await supabase
        .from('variable_validations')
        .insert([negativeDurationData]);

      expect(error).toBeTruthy();
      expect(error?.code).toBe('23514'); // Check violation
      expect(error?.message).toContain('variable_validations_valid_duration');
    });
  });

  describe('Index Performance', () => {
    it('should have proper indexes for common queries', async () => {
      // Test org + name index performance
      const startTime = Date.now();
      
      await supabase
        .from('environment_variables')
        .select('*')
        .eq('organization_id', testOrgId)
        .eq('name', 'NON_EXISTENT_VARIABLE');

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(50); // Should be very fast with index
    });

    it('should have audit table indexes for performance', async () => {
      const startTime = Date.now();
      
      await supabase
        .from('environment_variable_audit')
        .select('*')
        .eq('organization_id', testOrgId)
        .order('created_at', { ascending: false })
        .limit(10);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(100); // Should be fast with proper indexes
    });
  });

  describe('Trigger Functions', () => {
    it('should update updated_at timestamp on variable update', async () => {
      // Create variable
      const { data: variable } = await supabase
        .from('environment_variables')
        .insert([{
          organization_id: testOrgId,
          name: 'TEST_TRIGGER_VAR',
          created_by: testUserId
        }])
        .select()
        .single();

      const originalUpdatedAt = variable.updated_at;

      // Wait a moment to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Update variable
      const { data: updatedVariable } = await supabase
        .from('environment_variables')
        .update({ description: 'Updated description' })
        .eq('id', variable.id)
        .select()
        .single();

      expect(new Date(updatedVariable.updated_at).getTime())
        .toBeGreaterThan(new Date(originalUpdatedAt).getTime());
    });
  });
});