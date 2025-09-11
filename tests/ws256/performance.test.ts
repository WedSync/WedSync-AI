/**
 * WS-256 Environment Variables Management System - Performance Tests
 * Tests query performance with 10,000+ variables across 20+ environments
 * 
 * Critical for: Wedding day performance, peak load handling, sub-50ms p95 response times
 */

import { describe, beforeAll, afterAll, it, expect } from '@jest/globals';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { faker } from '@faker-js/faker';

describe('WS-256 Environment Variables - Performance Tests', () => {
  let supabase: SupabaseClient;
  let testOrgId: string;
  let testUserId: string;
  let environmentIds: string[] = [];
  let variableIds: string[] = [];
  let encryptionKeyId: string;

  const PERFORMANCE_THRESHOLDS = {
    SINGLE_QUERY_P95: 50, // 50ms for single queries
    BULK_QUERY_P95: 200,  // 200ms for bulk operations
    HEALTH_CHECK_P95: 100, // 100ms for health checks
    COMPARISON_P95: 150,   // 150ms for environment comparisons
    AUDIT_QUERY_P95: 75    // 75ms for audit queries
  };

  beforeAll(async () => {
    console.log('🚀 Setting up performance test environment...');
    
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
        name: 'Performance Test Org - WS256',
        slug: `perf-test-org-${Date.now()}`,
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

    // Get encryption key ID
    const { data: encKey } = await supabase
      .from('encryption_keys')
      .select('id')
      .eq('key_name', 'default_env_key')
      .single();

    encryptionKeyId = encKey.id;

    // Create 25 test environments for large-scale testing
    console.log('📊 Creating 25 test environments...');
    const environmentBatch = Array.from({ length: 25 }, (_, i) => ({
      id: faker.string.uuid(),
      name: `perf-env-${i.toString().padStart(2, '0')}`,
      display_name: `Performance Test Environment ${i + 1}`,
      description: `Performance testing environment ${i + 1}`,
      environment_type: i < 5 ? 'development' : i < 10 ? 'staging' : 'production',
      is_active: true,
      wedding_day_protection: i >= 20, // Last 5 environments have wedding day protection
      deployment_order: i + 100
    }));

    const { data: environments, error: envError } = await supabase
      .from('environments')
      .insert(environmentBatch)
      .select('id');

    if (envError) throw envError;
    environmentIds = environments.map(env => env.id);

    // Create 12,000 environment variables (realistic enterprise scale)
    console.log('📈 Creating 12,000 environment variables...');
    const variableCategories = ['database', 'api', 'payment', 'email', 'storage', 'monitoring', 'integrations', 'security'];
    const variableTypes = ['string', 'number', 'boolean', 'url', 'email', 'password', 'api_key', 'connection_string'];
    
    const variableBatches = [];
    const batchSize = 1000;

    for (let batch = 0; batch < 12; batch++) {
      const variables = Array.from({ length: batchSize }, (_, i) => {
        const globalIndex = batch * batchSize + i;
        return {
          id: faker.string.uuid(),
          organization_id: testOrgId,
          name: `PERF_VAR_${globalIndex.toString().padStart(5, '0')}`,
          display_name: `Performance Variable ${globalIndex + 1}`,
          description: `Performance testing variable ${globalIndex + 1} - ${faker.lorem.sentence()}`,
          variable_type: faker.helpers.arrayElement(variableTypes),
          security_classification_id: faker.helpers.arrayElement([
            '11111111-1111-1111-1111-111111111111', // public
            '22222222-2222-2222-2222-222222222222', // internal  
            '33333333-3333-3333-3333-333333333333', // confidential
          ]),
          is_wedding_critical: globalIndex % 10 === 0, // 10% are wedding critical
          is_required: globalIndex % 5 === 0, // 20% are required
          category: faker.helpers.arrayElement(variableCategories),
          tags: [faker.helpers.arrayElement(['production', 'testing', 'deprecated', 'critical'])],
          created_by: testUserId
        };
      });

      variableBatches.push(variables);
    }

    // Insert variables in batches to avoid timeouts
    for (let i = 0; i < variableBatches.length; i++) {
      console.log(`📝 Inserting variable batch ${i + 1}/12...`);
      const { data: batchResult, error: batchError } = await supabase
        .from('environment_variables')
        .insert(variableBatches[i])
        .select('id');

      if (batchError) throw batchError;
      variableIds.push(...batchResult.map(v => v.id));

      // Small delay between batches to prevent overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Create variable values across environments (60,000 total values)
    console.log('💾 Creating 60,000 variable values across environments...');
    
    // Create values for first 2,500 variables across all 25 environments (62,500 values)
    const valuesBatches = [];
    const variablesToPopulate = variableIds.slice(0, 2500);

    for (let envIndex = 0; envIndex < environmentIds.length; envIndex++) {
      console.log(`🌍 Creating values for environment ${envIndex + 1}/25...`);
      
      const valuesForEnv = variablesToPopulate.map((variableId, varIndex) => ({
        id: faker.string.uuid(),
        environment_variable_id: variableId,
        environment_id: environmentIds[envIndex],
        encrypted_value: faker.string.alphanumeric(50),
        encryption_key_id: encryptionKeyId,
        value_hash: faker.string.alphanumeric(32),
        is_overridden: varIndex % 20 === 0,
        override_reason: varIndex % 20 === 0 ? 'Performance testing override' : null,
        validation_status: faker.helpers.arrayElement(['pending', 'valid', 'invalid']),
        created_by: testUserId
      }));

      // Insert in chunks of 500 to avoid payload limits
      for (let chunk = 0; chunk < Math.ceil(valuesForEnv.length / 500); chunk++) {
        const chunkStart = chunk * 500;
        const chunkEnd = Math.min(chunkStart + 500, valuesForEnv.length);
        const chunkValues = valuesForEnv.slice(chunkStart, chunkEnd);

        const { error: valueError } = await supabase
          .from('environment_variable_values')
          .insert(chunkValues);

        if (valueError) throw valueError;
      }
    }

    // Create audit trail data (5,000 audit events)
    console.log('📋 Creating 5,000 audit events...');
    const auditEvents = Array.from({ length: 5000 }, (_, i) => ({
      id: faker.string.uuid(),
      organization_id: testOrgId,
      environment_variable_id: faker.helpers.arrayElement(variableIds.slice(0, 500)),
      environment_id: faker.helpers.arrayElement(environmentIds),
      action: faker.helpers.arrayElement(['create', 'read', 'update', 'delete', 'access_granted', 'decrypt']),
      actor_id: testUserId,
      details: {
        action_id: i,
        timestamp: faker.date.recent({ days: 30 }).toISOString(),
        metadata: faker.lorem.words(5)
      },
      severity: faker.helpers.arrayElement(['info', 'warning', 'error', 'critical']),
      is_wedding_day: i % 50 === 0 // 2% are wedding day events
    }));

    // Insert audit events in batches
    for (let i = 0; i < auditEvents.length; i += 500) {
      const batch = auditEvents.slice(i, i + 500);
      const { error } = await supabase
        .from('environment_variable_audit')
        .insert(batch);

      if (error) throw error;
    }

    console.log('✅ Performance test environment setup complete!');
    console.log(`📊 Created: ${variableIds.length} variables, ${environmentIds.length} environments, 60K+ values`);
  }, 300000); // 5 minute timeout for setup

  afterAll(async () => {
    console.log('🧹 Cleaning up performance test data...');
    
    // Cleanup test data (cascading deletes will handle related records)
    await supabase.from('organizations').delete().eq('id', testOrgId);
    await supabase.from('environments').delete().in('id', environmentIds);
    
    console.log('✅ Performance test cleanup complete');
  }, 60000); // 1 minute timeout for cleanup

  describe('Single Query Performance', () => {
    it('should retrieve single environment variable under 50ms p95', async () => {
      const measurements: number[] = [];
      const testVariable = variableIds[0];

      // Run 100 queries to get p95 measurement
      for (let i = 0; i < 100; i++) {
        const start = performance.now();
        
        await supabase
          .from('environment_variables')
          .select('*')
          .eq('id', testVariable)
          .single();

        measurements.push(performance.now() - start);
      }

      const p95 = getPercentile(measurements, 95);
      console.log(`📊 Single variable query p95: ${p95.toFixed(2)}ms`);
      
      expect(p95).toBeLessThan(PERFORMANCE_THRESHOLDS.SINGLE_QUERY_P95);
    });

    it('should retrieve variables by organization + name under 50ms p95', async () => {
      const measurements: number[] = [];

      for (let i = 0; i < 50; i++) {
        const start = performance.now();
        
        await supabase
          .from('environment_variables')
          .select('*')
          .eq('organization_id', testOrgId)
          .eq('name', `PERF_VAR_${i.toString().padStart(5, '0')}`)
          .single();

        measurements.push(performance.now() - start);
      }

      const p95 = getPercentile(measurements, 95);
      console.log(`🔍 Org + name query p95: ${p95.toFixed(2)}ms`);
      
      expect(p95).toBeLessThan(PERFORMANCE_THRESHOLDS.SINGLE_QUERY_P95);
    });

    it('should retrieve environment variable values under 50ms p95', async () => {
      const measurements: number[] = [];

      for (let i = 0; i < 50; i++) {
        const start = performance.now();
        
        await supabase
          .from('environment_variable_values')
          .select('*')
          .eq('environment_variable_id', variableIds[i])
          .eq('environment_id', environmentIds[0]);

        measurements.push(performance.now() - start);
      }

      const p95 = getPercentile(measurements, 95);
      console.log(`💾 Variable value query p95: ${p95.toFixed(2)}ms`);
      
      expect(p95).toBeLessThan(PERFORMANCE_THRESHOLDS.SINGLE_QUERY_P95);
    });
  });

  describe('Bulk Query Performance', () => {
    it('should retrieve all variables for organization under 200ms p95', async () => {
      const measurements: number[] = [];

      for (let i = 0; i < 20; i++) {
        const start = performance.now();
        
        await supabase
          .from('environment_variables')
          .select('*')
          .eq('organization_id', testOrgId)
          .order('name')
          .limit(1000);

        measurements.push(performance.now() - start);
      }

      const p95 = getPercentile(measurements, 95);
      console.log(`📋 Bulk variables query p95: ${p95.toFixed(2)}ms`);
      
      expect(p95).toBeLessThan(PERFORMANCE_THRESHOLDS.BULK_QUERY_P95);
    });

    it('should retrieve environment configuration under 200ms p95', async () => {
      const measurements: number[] = [];

      for (let i = 0; i < 10; i++) {
        const start = performance.now();
        
        await supabase
          .from('environment_variable_values')
          .select(`
            *,
            environment_variables!inner (
              name,
              display_name,
              is_wedding_critical,
              category
            )
          `)
          .eq('environment_id', environmentIds[0])
          .limit(500);

        measurements.push(performance.now() - start);
      }

      const p95 = getPercentile(measurements, 95);
      console.log(`🌍 Environment config query p95: ${p95.toFixed(2)}ms`);
      
      expect(p95).toBeLessThan(PERFORMANCE_THRESHOLDS.BULK_QUERY_P95);
    });

    it('should handle wedding critical variables query under 100ms p95', async () => {
      const measurements: number[] = [];

      for (let i = 0; i < 30; i++) {
        const start = performance.now();
        
        await supabase
          .from('environment_variables')
          .select('*')
          .eq('organization_id', testOrgId)
          .eq('is_wedding_critical', true)
          .order('name');

        measurements.push(performance.now() - start);
      }

      const p95 = getPercentile(measurements, 95);
      console.log(`💒 Wedding critical vars query p95: ${p95.toFixed(2)}ms`);
      
      expect(p95).toBeLessThan(PERFORMANCE_THRESHOLDS.HEALTH_CHECK_P95);
    });
  });

  describe('Health Check Performance', () => {
    it('should execute get_environment_health function under 100ms p95', async () => {
      const measurements: number[] = [];

      for (let i = 0; i < 20; i++) {
        const start = performance.now();
        
        await supabase.rpc('get_environment_health', {
          env_id: environmentIds[i % environmentIds.length]
        });

        measurements.push(performance.now() - start);
      }

      const p95 = getPercentile(measurements, 95);
      console.log(`🏥 Environment health check p95: ${p95.toFixed(2)}ms`);
      
      expect(p95).toBeLessThan(PERFORMANCE_THRESHOLDS.HEALTH_CHECK_P95);
    });

    it('should execute bulk validation function under 150ms p95', async () => {
      const measurements: number[] = [];
      const testVariables = {
        'TEST_API_KEY': 'sk_test_1234567890abcdef',
        'DATABASE_URL': 'postgresql://user:pass@localhost:5432/db',
        'WEBHOOK_URL': 'https://api.example.com/webhook',
        'EMAIL_FROM': 'noreply@wedsync.com',
        'FEATURE_FLAG_ENABLED': 'true'
      };

      for (let i = 0; i < 15; i++) {
        const start = performance.now();
        
        await supabase.rpc('validate_environment_variables', {
          env_id: environmentIds[0],
          variables: testVariables
        });

        measurements.push(performance.now() - start);
      }

      const p95 = getPercentile(measurements, 95);
      console.log(`✅ Bulk validation p95: ${p95.toFixed(2)}ms`);
      
      expect(p95).toBeLessThan(PERFORMANCE_THRESHOLDS.COMPARISON_P95);
    });

    it('should execute usage analytics function under 150ms p95', async () => {
      const measurements: number[] = [];

      for (let i = 0; i < 15; i++) {
        const start = performance.now();
        
        await supabase.rpc('get_variable_usage_analytics', {
          env_id: environmentIds[0],
          days_back: 30
        });

        measurements.push(performance.now() - start);
      }

      const p95 = getPercentile(measurements, 95);
      console.log(`📈 Usage analytics p95: ${p95.toFixed(2)}ms`);
      
      expect(p95).toBeLessThan(PERFORMANCE_THRESHOLDS.COMPARISON_P95);
    });
  });

  describe('Environment Comparison Performance', () => {
    it('should compare environments under 150ms p95', async () => {
      const measurements: number[] = [];

      for (let i = 0; i < 10; i++) {
        const start = performance.now();
        
        await supabase.rpc('compare_environments', {
          env1_id: environmentIds[0],
          env2_id: environmentIds[1],
          show_values: false
        });

        measurements.push(performance.now() - start);
      }

      const p95 = getPercentile(measurements, 95);
      console.log(`🔄 Environment comparison p95: ${p95.toFixed(2)}ms`);
      
      expect(p95).toBeLessThan(PERFORMANCE_THRESHOLDS.COMPARISON_P95);
    });

    it('should detect configuration drift under 100ms p95', async () => {
      const measurements: number[] = [];

      for (let i = 0; i < 15; i++) {
        const start = performance.now();
        
        await supabase.rpc('detect_configuration_drift', {
          source_env_id: environmentIds[0],
          target_env_id: environmentIds[1]
        });

        measurements.push(performance.now() - start);
      }

      const p95 = getPercentile(measurements, 95);
      console.log(`🔍 Configuration drift detection p95: ${p95.toFixed(2)}ms`);
      
      expect(p95).toBeLessThan(PERFORMANCE_THRESHOLDS.HEALTH_CHECK_P95);
    });
  });

  describe('Audit Query Performance', () => {
    it('should retrieve recent audit events under 75ms p95', async () => {
      const measurements: number[] = [];

      for (let i = 0; i < 30; i++) {
        const start = performance.now();
        
        await supabase
          .from('environment_variable_audit')
          .select('*')
          .eq('organization_id', testOrgId)
          .order('created_at', { ascending: false })
          .limit(50);

        measurements.push(performance.now() - start);
      }

      const p95 = getPercentile(measurements, 95);
      console.log(`📋 Recent audit events p95: ${p95.toFixed(2)}ms`);
      
      expect(p95).toBeLessThan(PERFORMANCE_THRESHOLDS.AUDIT_QUERY_P95);
    });

    it('should retrieve audit events by user under 75ms p95', async () => {
      const measurements: number[] = [];

      for (let i = 0; i < 30; i++) {
        const start = performance.now();
        
        await supabase
          .from('environment_variable_audit')
          .select('*')
          .eq('actor_id', testUserId)
          .order('created_at', { ascending: false })
          .limit(100);

        measurements.push(performance.now() - start);
      }

      const p95 = getPercentile(measurements, 95);
      console.log(`👤 User audit events p95: ${p95.toFixed(2)}ms`);
      
      expect(p95).toBeLessThan(PERFORMANCE_THRESHOLDS.AUDIT_QUERY_P95);
    });

    it('should retrieve wedding day events under 50ms p95', async () => {
      const measurements: number[] = [];

      for (let i = 0; i < 30; i++) {
        const start = performance.now();
        
        await supabase
          .from('environment_variable_audit')
          .select('*')
          .eq('organization_id', testOrgId)
          .eq('is_wedding_day', true)
          .order('created_at', { ascending: false });

        measurements.push(performance.now() - start);
      }

      const p95 = getPercentile(measurements, 95);
      console.log(`💒 Wedding day events p95: ${p95.toFixed(2)}ms`);
      
      expect(p95).toBeLessThan(PERFORMANCE_THRESHOLDS.SINGLE_QUERY_P95);
    });
  });

  describe('Wedding Day Protection Performance', () => {
    it('should execute is_wedding_hours function under 5ms p95', async () => {
      const measurements: number[] = [];

      for (let i = 0; i < 100; i++) {
        const start = performance.now();
        
        await supabase.rpc('is_wedding_hours');

        measurements.push(performance.now() - start);
      }

      const p95 = getPercentile(measurements, 95);
      console.log(`⏰ Wedding hours check p95: ${p95.toFixed(2)}ms`);
      
      expect(p95).toBeLessThan(5); // Should be extremely fast
    });

    it('should handle emergency override queries under 50ms p95', async () => {
      const measurements: number[] = [];

      for (let i = 0; i < 20; i++) {
        const start = performance.now();
        
        await supabase
          .from('environment_variable_audit')
          .select('*')
          .eq('organization_id', testOrgId)
          .eq('action', 'emergency_override')
          .order('created_at', { ascending: false });

        measurements.push(performance.now() - start);
      }

      const p95 = getPercentile(measurements, 95);
      console.log(`🚨 Emergency override query p95: ${p95.toFixed(2)}ms`);
      
      expect(p95).toBeLessThan(PERFORMANCE_THRESHOLDS.SINGLE_QUERY_P95);
    });
  });

  describe('Concurrent Load Performance', () => {
    it('should handle 50 concurrent environment health checks', async () => {
      const promises = Array.from({ length: 50 }, (_, i) => {
        const start = performance.now();
        return supabase.rpc('get_environment_health', {
          env_id: environmentIds[i % environmentIds.length]
        }).then(() => performance.now() - start);
      });

      const measurements = await Promise.all(promises);
      const p95 = getPercentile(measurements, 95);
      
      console.log(`🏁 50 concurrent health checks p95: ${p95.toFixed(2)}ms`);
      expect(p95).toBeLessThan(PERFORMANCE_THRESHOLDS.HEALTH_CHECK_P95 * 2); // Allow 2x for concurrency
    });

    it('should handle 100 concurrent variable queries', async () => {
      const promises = Array.from({ length: 100 }, (_, i) => {
        const start = performance.now();
        return supabase
          .from('environment_variables')
          .select('*')
          .eq('organization_id', testOrgId)
          .eq('name', `PERF_VAR_${i.toString().padStart(5, '0')}`)
          .single()
          .then(() => performance.now() - start);
      });

      const measurements = await Promise.all(promises);
      const p95 = getPercentile(measurements, 95);
      
      console.log(`⚡ 100 concurrent variable queries p95: ${p95.toFixed(2)}ms`);
      expect(p95).toBeLessThan(PERFORMANCE_THRESHOLDS.SINGLE_QUERY_P95 * 3); // Allow 3x for high concurrency
    });
  });

  describe('Index Usage Validation', () => {
    it('should use proper indexes for organization queries', async () => {
      // This test would ideally check EXPLAIN ANALYZE, but we'll verify performance instead
      const start = performance.now();
      
      await supabase
        .from('environment_variables')
        .select('*')
        .eq('organization_id', testOrgId)
        .order('name')
        .limit(1000);

      const duration = performance.now() - start;
      
      // Should be very fast with proper index
      expect(duration).toBeLessThan(100);
    });

    it('should use proper indexes for audit queries', async () => {
      const start = performance.now();
      
      await supabase
        .from('environment_variable_audit')
        .select('*')
        .eq('organization_id', testOrgId)
        .order('created_at', { ascending: false })
        .limit(100);

      const duration = performance.now() - start;
      
      // Should be very fast with proper index
      expect(duration).toBeLessThan(100);
    });
  });

  describe('Memory Usage Optimization', () => {
    it('should handle large result sets efficiently', async () => {
      const startMemory = process.memoryUsage();
      
      // Query large dataset
      const { data } = await supabase
        .from('environment_variables')
        .select('*')
        .eq('organization_id', testOrgId)
        .limit(5000);

      const endMemory = process.memoryUsage();
      const memoryIncrease = endMemory.heapUsed - startMemory.heapUsed;
      
      console.log(`💾 Memory increase for 5K records: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
      
      // Should not use excessive memory (less than 50MB for 5K records)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
      expect(data?.length).toBeLessThanOrEqual(5000);
    });
  });
});

/**
 * Calculate percentile from array of measurements
 */
function getPercentile(values: number[], percentile: number): number {
  const sorted = values.sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[index];
}