/**
 * WS-256 Environment Variables Management System - Wedding Day Protection Tests
 * Tests weekend deployment blocking and wedding-specific business logic
 * 
 * Critical for: Wedding day stability, Saturday protection, emergency procedures
 */

import { describe, beforeAll, afterAll, it, expect, jest } from '@jest/globals';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { faker } from '@faker-js/faker';

// Mock the current time for testing different days/hours
const mockDate = (dateString: string) => {
  const mockDate = new Date(dateString);
  jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);
  jest.spyOn(Date, 'now').mockReturnValue(mockDate.getTime());
};

describe('WS-256 Environment Variables - Wedding Day Protection Tests', () => {
  let supabase: SupabaseClient;
  let testOrgId: string;
  let testUserId: string;
  let testEnvironmentId: string;
  let testVariableId: string;
  let weddingProtectedEnvId: string;

  beforeAll(async () => {
    console.log('💒 Setting up wedding day protection test environment...');

    // Initialize Supabase client
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
        name: 'Wedding Protection Test Org',
        slug: `wedding-test-${Date.now()}`,
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
        email: 'wedding-test@wedsync.com',
        role: 'admin',
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (userError) throw userError;
    testUserId = user.id;

    // Get standard environment ID
    const { data: env } = await supabase
      .from('environments')
      .select('id')
      .eq('name', 'production')
      .single();

    testEnvironmentId = env.id;

    // Create wedding-protected environment
    const { data: weddingEnv, error: weddingEnvError } = await supabase
      .from('environments')
      .insert([{
        id: faker.string.uuid(),
        name: `wedding-protected-${Date.now()}`,
        display_name: 'Wedding Protected Production',
        description: 'Production environment with wedding day protection',
        environment_type: 'production',
        is_active: true,
        wedding_day_protection: true,
        deployment_order: 100
      }])
      .select()
      .single();

    if (weddingEnvError) throw weddingEnvError;
    weddingProtectedEnvId = weddingEnv.id;

    // Create test wedding-critical variable
    const { data: variable, error: varError } = await supabase
      .from('environment_variables')
      .insert([{
        organization_id: testOrgId,
        name: 'WEDDING_CRITICAL_STRIPE_KEY',
        display_name: 'Wedding Critical Stripe API Key',
        description: 'Payment processing key critical for wedding bookings',
        variable_type: 'api_key',
        security_classification_id: (await supabase
          .from('security_classifications')
          .select('id')
          .eq('name', 'secret')
          .single()
        ).data.id,
        is_wedding_critical: true,
        is_required: true,
        category: 'payment',
        created_by: testUserId
      }])
      .select()
      .single();

    if (varError) throw varError;
    testVariableId = variable.id;

    console.log('✅ Wedding day protection test environment setup complete');
  });

  afterAll(async () => {
    // Cleanup
    await supabase.from('organizations').delete().eq('id', testOrgId);
    await supabase.from('environments').delete().eq('id', weddingProtectedEnvId);
    
    // Restore real Date
    jest.restoreAllMocks();
  });

  describe('Wedding Day Detection', () => {
    it('should correctly identify Saturday as wedding day', async () => {
      // Mock Saturday afternoon (peak wedding time)
      mockDate('2024-06-15T15:00:00Z'); // Saturday 3 PM

      const { data: isWeddingDay, error } = await supabase
        .rpc('is_wedding_hours');

      expect(error).toBeNull();
      expect(isWeddingDay).toBe(true);

      jest.restoreAllMocks();
    });

    it('should correctly identify Friday evening as wedding hours', async () => {
      // Mock Friday 7 PM (wedding preparation time)
      mockDate('2024-06-14T19:00:00Z'); // Friday 7 PM

      const { data: isWeddingDay, error } = await supabase
        .rpc('is_wedding_hours');

      expect(error).toBeNull();
      expect(isWeddingDay).toBe(true);

      jest.restoreAllMocks();
    });

    it('should correctly identify Sunday as wedding day', async () => {
      // Mock Sunday morning (wedding brunch/recovery time)
      mockDate('2024-06-16T11:00:00Z'); // Sunday 11 AM

      const { data: isWeddingDay, error } = await supabase
        .rpc('is_wedding_hours');

      expect(error).toBeNull();
      expect(isWeddingDay).toBe(true);

      jest.restoreAllMocks();
    });

    it('should correctly identify Tuesday as safe deployment day', async () => {
      // Mock Tuesday morning (safe deployment time)
      mockDate('2024-06-11T10:00:00Z'); // Tuesday 10 AM

      const { data: isWeddingDay, error } = await supabase
        .rpc('is_wedding_hours');

      expect(error).toBeNull();
      expect(isWeddingDay).toBe(false);

      jest.restoreAllMocks();
    });

    it('should correctly identify Friday morning as safe deployment time', async () => {
      // Mock Friday 10 AM (safe before 6 PM)
      mockDate('2024-06-14T10:00:00Z'); // Friday 10 AM

      const { data: isWeddingDay, error } = await supabase
        .rpc('is_wedding_hours');

      expect(error).toBeNull();
      expect(isWeddingDay).toBe(false);

      jest.restoreAllMocks();
    });
  });

  describe('Wedding Day Protection Enforcement', () => {
    it('should prevent environment variable updates during wedding hours', async () => {
      // Mock Saturday wedding day
      mockDate('2024-06-15T14:00:00Z'); // Saturday 2 PM

      // Create variable value first
      const { data: encKey } = await supabase
        .from('encryption_keys')
        .select('id')
        .eq('key_name', 'default_env_key')
        .single();

      const { data: value } = await supabase
        .from('environment_variable_values')
        .insert([{
          environment_variable_id: testVariableId,
          environment_id: weddingProtectedEnvId,
          encrypted_value: 'original_wedding_critical_value',
          encryption_key_id: encKey.id,
          created_by: testUserId
        }])
        .select()
        .single();

      // Attempt to update during wedding hours (should be prevented by trigger)
      const { error } = await supabase
        .from('environment_variable_values')
        .update({
          encrypted_value: 'updated_value_during_wedding',
          updated_by: testUserId
        })
        .eq('id', value.id);

      // Should fail due to wedding day protection
      expect(error).toBeTruthy();
      expect(error?.message).toContain('WEDDING DAY PROTECTION');

      jest.restoreAllMocks();
    });

    it('should allow emergency override during wedding hours', async () => {
      // Mock Saturday wedding day
      mockDate('2024-06-15T16:00:00Z'); // Saturday 4 PM

      const { data: encKey } = await supabase
        .from('encryption_keys')
        .select('id')
        .eq('key_name', 'default_env_key')
        .single();

      const { data: value } = await supabase
        .from('environment_variable_values')
        .insert([{
          environment_variable_id: testVariableId,
          environment_id: weddingProtectedEnvId,
          encrypted_value: 'emergency_test_value',
          encryption_key_id: encKey.id,
          created_by: testUserId
        }])
        .select()
        .single();

      // Set emergency override
      await supabase.rpc('set', { 
        name: 'wedsync.emergency_override', 
        value: 'true' 
      });

      // Attempt update with emergency override
      const { error } = await supabase
        .from('environment_variable_values')
        .update({
          encrypted_value: 'emergency_updated_value',
          updated_by: testUserId
        })
        .eq('id', value.id);

      // Should succeed with emergency override
      expect(error).toBeNull();

      // Verify emergency override was logged
      const { data: emergencyLogs } = await supabase
        .from('environment_variable_audit')
        .select('*')
        .eq('action', 'emergency_override')
        .order('created_at', { ascending: false })
        .limit(1);

      expect(emergencyLogs?.length).toBeGreaterThan(0);
      expect(emergencyLogs?.[0].details).toMatchObject({
        is_wedding_hours: true
      });

      // Reset emergency override
      await supabase.rpc('set', { 
        name: 'wedsync.emergency_override', 
        value: 'false' 
      });

      jest.restoreAllMocks();
    });

    it('should allow normal operations during safe hours', async () => {
      // Mock Tuesday safe deployment time
      mockDate('2024-06-11T14:00:00Z'); // Tuesday 2 PM

      const { data: encKey } = await supabase
        .from('encryption_keys')
        .select('id')
        .eq('key_name', 'default_env_key')
        .single();

      const { data: value } = await supabase
        .from('environment_variable_values')
        .insert([{
          environment_variable_id: testVariableId,
          environment_id: weddingProtectedEnvId,
          encrypted_value: 'safe_hours_value',
          encryption_key_id: encKey.id,
          created_by: testUserId
        }])
        .select()
        .single();

      // Update during safe hours
      const { error } = await supabase
        .from('environment_variable_values')
        .update({
          encrypted_value: 'updated_during_safe_hours',
          updated_by: testUserId
        })
        .eq('id', value.id);

      // Should succeed during safe hours
      expect(error).toBeNull();

      jest.restoreAllMocks();
    });

    it('should prevent environment deletion during wedding hours', async () => {
      // Mock Saturday wedding day
      mockDate('2024-06-15T18:00:00Z'); // Saturday 6 PM

      // Create temporary environment for deletion test
      const { data: tempEnv } = await supabase
        .from('environments')
        .insert([{
          id: faker.string.uuid(),
          name: `temp-wedding-test-${Date.now()}`,
          display_name: 'Temporary Wedding Test Env',
          environment_type: 'staging',
          wedding_day_protection: true
        }])
        .select()
        .single();

      // Attempt to delete environment during wedding hours
      const { error } = await supabase
        .from('environments')
        .delete()
        .eq('id', tempEnv.id);

      // Should be prevented by wedding day protection trigger
      expect(error).toBeTruthy();
      expect(error?.message).toContain('WEDDING DAY PROTECTION');

      jest.restoreAllMocks();

      // Cleanup during safe hours
      await supabase
        .from('environments')
        .delete()
        .eq('id', tempEnv.id);
    });
  });

  describe('Wedding Critical Variable Protection', () => {
    it('should enforce strict access control for wedding critical variables', async () => {
      // Verify variable is marked as wedding critical
      const { data: variable } = await supabase
        .from('environment_variables')
        .select('*')
        .eq('id', testVariableId)
        .single();

      expect(variable.is_wedding_critical).toBe(true);

      // Wedding critical variables should have high security classification
      const { data: classification } = await supabase
        .from('security_classifications')
        .select('*')
        .eq('id', variable.security_classification_id)
        .single();

      expect(classification.level).toBeGreaterThanOrEqual(70); // Secret level or higher
      expect(classification.encryption_required).toBe(true);
    });

    it('should log all access to wedding critical variables', async () => {
      // Simulate access to wedding critical variable
      const auditData = {
        organization_id: testOrgId,
        environment_variable_id: testVariableId,
        action: 'read',
        actor_id: testUserId,
        details: {
          wedding_critical_access: true,
          access_reason: 'Payment processing verification'
        },
        is_wedding_day: false,
        severity: 'warning' // Wedding critical access is always elevated severity
      };

      const { data: auditEvent, error } = await supabase
        .from('environment_variable_audit')
        .insert([auditData])
        .select()
        .single();

      expect(error).toBeNull();
      expect(auditEvent.severity).toBe('warning');
      expect(auditEvent.details).toMatchObject({
        wedding_critical_access: true
      });
    });

    it('should require approval for wedding critical variable changes', async () => {
      // Mock approval process for wedding critical variable change
      const changeRequestData = {
        organization_id: testOrgId,
        environment_variable_id: testVariableId,
        action: 'update',
        actor_id: testUserId,
        details: {
          wedding_critical_change: true,
          change_request_id: 'WCR-001',
          approval_required: true,
          approver_id: testUserId,
          business_justification: 'Update payment processor API key for wedding season'
        },
        severity: 'critical'
      };

      const { data: changeRequest, error } = await supabase
        .from('environment_variable_audit')
        .insert([changeRequestData])
        .select()
        .single();

      expect(error).toBeNull();
      expect(changeRequest.details).toMatchObject({
        wedding_critical_change: true,
        approval_required: true
      });
    });

    it('should handle wedding critical variable validation failures', async () => {
      // Create validation failure for wedding critical variable
      const validationData = {
        environment_variable_id: testVariableId,
        environment_id: weddingProtectedEnvId,
        validation_type: 'connectivity',
        status: 'failed',
        result_message: 'API key validation failed - payment processor unreachable',
        result_data: {
          error_code: 'CONN_TIMEOUT',
          last_successful_validation: '2024-06-01T10:00:00Z'
        },
        validated_by: testUserId
      };

      const { data: validation, error } = await supabase
        .from('variable_validations')
        .insert([validationData])
        .select()
        .single();

      expect(error).toBeNull();
      expect(validation.status).toBe('failed');

      // Validation failure for wedding critical variable should create high-priority alert
      expect(validation.result_data).toMatchObject({
        error_code: 'CONN_TIMEOUT'
      });
    });
  });

  describe('Wedding Day Incident Response', () => {
    it('should create critical alerts for wedding day issues', async () => {
      // Mock Saturday wedding day
      mockDate('2024-06-15T13:00:00Z'); // Saturday 1 PM

      const incidentData = {
        organization_id: testOrgId,
        environment_variable_id: testVariableId,
        action: 'system_failure',
        actor_id: null, // System-generated
        details: {
          incident_type: 'payment_processor_down',
          affected_weddings: 5,
          estimated_impact: 'HIGH',
          mitigation_required: true,
          escalation_level: 'CRITICAL'
        },
        is_wedding_day: true,
        severity: 'critical'
      };

      const { data: incident, error } = await supabase
        .from('environment_variable_audit')
        .insert([incidentData])
        .select()
        .single();

      expect(error).toBeNull();
      expect(incident.is_wedding_day).toBe(true);
      expect(incident.severity).toBe('critical');
      expect(incident.details).toMatchObject({
        incident_type: 'payment_processor_down',
        affected_weddings: 5
      });

      jest.restoreAllMocks();
    });

    it('should track resolution time for wedding day incidents', async () => {
      const incidentStartTime = new Date().toISOString();
      
      // Create incident
      const { data: incident } = await supabase
        .from('environment_variable_audit')
        .insert([{
          organization_id: testOrgId,
          action: 'incident_created',
          actor_id: testUserId,
          details: {
            incident_id: 'WD-INC-001',
            created_at: incidentStartTime,
            severity: 'high'
          },
          is_wedding_day: true,
          severity: 'critical'
        }])
        .select()
        .single();

      // Wait a moment to simulate resolution time
      await new Promise(resolve => setTimeout(resolve, 100));

      // Create resolution
      const incidentEndTime = new Date().toISOString();
      const { data: resolution, error } = await supabase
        .from('environment_variable_audit')
        .insert([{
          organization_id: testOrgId,
          action: 'incident_resolved',
          actor_id: testUserId,
          details: {
            incident_id: 'WD-INC-001',
            resolved_at: incidentEndTime,
            resolution_time_ms: new Date(incidentEndTime).getTime() - new Date(incidentStartTime).getTime(),
            resolution_method: 'emergency_override'
          },
          is_wedding_day: true,
          severity: 'info'
        }])
        .select()
        .single();

      expect(error).toBeNull();
      expect(resolution.details).toHaveProperty('resolution_time_ms');
      expect(resolution.details.resolution_method).toBe('emergency_override');
    });

    it('should maintain incident response communication log', async () => {
      const communicationData = {
        organization_id: testOrgId,
        action: 'incident_communication',
        actor_id: testUserId,
        details: {
          communication_type: 'status_update',
          recipients: ['wedding_coordinators', 'venue_managers', 'photographers'],
          message: 'Payment system restored - all wedding bookings processing normally',
          channel: 'emergency_alerts',
          incident_id: 'WD-INC-002'
        },
        is_wedding_day: true,
        severity: 'info'
      };

      const { data: communication, error } = await supabase
        .from('environment_variable_audit')
        .insert([communicationData])
        .select()
        .single();

      expect(error).toBeNull();
      expect(communication.details).toMatchObject({
        communication_type: 'status_update',
        recipients: expect.arrayContaining(['wedding_coordinators', 'venue_managers'])
      });
    });
  });

  describe('Wedding Day Performance Monitoring', () => {
    it('should monitor system performance during wedding hours', async () => {
      // Mock Saturday afternoon peak time
      mockDate('2024-06-15T15:30:00Z'); // Saturday 3:30 PM

      const performanceData = {
        organization_id: testOrgId,
        action: 'performance_check',
        actor_id: null, // System-generated
        details: {
          check_type: 'environment_health',
          environment_id: weddingProtectedEnvId,
          response_time_ms: 45,
          error_rate: 0.001,
          concurrent_users: 1250,
          wedding_load_factor: 'HIGH',
          performance_score: 95
        },
        is_wedding_day: true,
        severity: 'info'
      };

      const { data: perfCheck, error } = await supabase
        .from('environment_variable_audit')
        .insert([performanceData])
        .select()
        .single();

      expect(error).toBeNull();
      expect(perfCheck.details).toMatchObject({
        check_type: 'environment_health',
        performance_score: 95
      });

      jest.restoreAllMocks();
    });

    it('should alert on performance degradation during weddings', async () => {
      const degradationData = {
        organization_id: testOrgId,
        action: 'performance_alert',
        actor_id: null,
        details: {
          alert_type: 'response_time_degradation',
          threshold_exceeded: 'p95_response_time',
          current_value: 850,
          threshold_value: 500,
          affected_services: ['payment_processing', 'booking_system'],
          impact_assessment: 'MEDIUM'
        },
        is_wedding_day: true,
        severity: 'warning'
      };

      const { data: alert, error } = await supabase
        .from('environment_variable_audit')
        .insert([degradationData])
        .select()
        .single();

      expect(error).toBeNull();
      expect(alert.severity).toBe('warning');
      expect(alert.details.current_value).toBeGreaterThan(alert.details.threshold_value);
    });
  });

  describe('Configuration Drift During Weddings', () => {
    it('should detect configuration drift between environments during wedding hours', async () => {
      // Create drift record
      const driftData = {
        organization_id: testOrgId,
        source_environment_id: weddingProtectedEnvId,
        target_environment_id: testEnvironmentId,
        drift_type: 'value_mismatch',
        variable_name: 'WEDDING_CRITICAL_STRIPE_KEY',
        environment_variable_id: testVariableId,
        drift_severity: 'critical',
        expected_value_hash: 'expected_hash_123',
        actual_value_hash: 'actual_hash_456',
        drift_details: {
          detected_during_wedding: true,
          potential_impact: 'Payment processing may fail for current weddings',
          recommended_action: 'Emergency sync required'
        }
      };

      const { data: drift, error } = await supabase
        .from('configuration_drift')
        .insert([driftData])
        .select()
        .single();

      expect(error).toBeNull();
      expect(drift.drift_severity).toBe('critical');
      expect(drift.drift_details).toMatchObject({
        detected_during_wedding: true
      });
    });

    it('should escalate wedding day configuration drift immediately', async () => {
      // Create high-severity drift during wedding day
      const { data: envs } = await supabase
        .from('environments')
        .select('id')
        .limit(2);

      const escalatedDriftData = {
        organization_id: testOrgId,
        source_environment_id: envs[0].id,
        target_environment_id: envs[1].id,
        drift_type: 'missing_variable',
        variable_name: 'CRITICAL_PAYMENT_CONFIG',
        drift_severity: 'critical',
        drift_details: {
          escalation_required: true,
          business_impact: 'HIGH',
          affected_weddings: ['WED-001', 'WED-002', 'WED-003'],
          escalation_channels: ['ops_team', 'management', 'on_call_engineer']
        }
      };

      const { data: escalatedDrift, error } = await supabase
        .from('configuration_drift')
        .insert([escalatedDriftData])
        .select()
        .single();

      expect(error).toBeNull();
      expect(escalatedDrift.drift_details).toMatchObject({
        escalation_required: true,
        business_impact: 'HIGH'
      });
    });
  });

  describe('Wedding Season Load Testing', () => {
    it('should validate system capacity for peak wedding season', async () => {
      const loadTestData = {
        organization_id: testOrgId,
        action: 'load_test',
        actor_id: testUserId,
        details: {
          test_type: 'wedding_season_simulation',
          concurrent_weddings: 50,
          peak_bookings_per_minute: 25,
          environment_variables_accessed: 500,
          configuration_changes: 10,
          test_duration_minutes: 30,
          success_rate: 99.8,
          performance_metrics: {
            avg_response_time: 35,
            p95_response_time: 85,
            p99_response_time: 150,
            error_rate: 0.002
          }
        },
        severity: 'info'
      };

      const { data: loadTest, error } = await supabase
        .from('environment_variable_audit')
        .insert([loadTestData])
        .select()
        .single();

      expect(error).toBeNull();
      expect(loadTest.details.success_rate).toBeGreaterThan(99);
      expect(loadTest.details.performance_metrics.p95_response_time).toBeLessThan(100);
    });
  });
});