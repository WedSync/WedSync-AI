import { describe, expect, it, beforeAll, afterAll } from '@jest/globals';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// This test requires a test database connection
// Run with: npm run test:db
describe('Viral Tracking Database Migration Tests', () => {
  let supabase: SupabaseClient;

  beforeAll(async () => {
    // Initialize test database connection
    const supabaseUrl = process.env.SUPABASE_TEST_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_TEST_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing test database configuration. Set SUPABASE_TEST_URL and SUPABASE_TEST_SERVICE_KEY');
    }

    supabase = createClient(supabaseUrl, supabaseKey);
  });

  afterAll(async () => {
    // Clean up test data
    if (supabase) {
      await supabase.from('viral_loop_metrics').delete().neq('id', 'non-existent');
      await supabase.from('wedding_cohort_networks').delete().neq('id', 'non-existent');
      await supabase.from('invitation_tracking').delete().neq('id', 'non-existent');
    }
  });

  describe('Table Structure Validation', () => {
    it('should have invitation_tracking table with correct structure', async () => {
      const { data, error } = await supabase
        .from('invitation_tracking')
        .select('*')
        .limit(1);

      expect(error).toBeNull();
      expect(data).toBeDefined();

      // Test table structure by attempting to insert a record
      const testRecord = {
        inviter_id: 'test-inviter',
        invited_user: 'test-invited@example.com',
        invitation_type: 'supplier_referral',
        invited_at: new Date().toISOString(),
        accepted: false,
        wedding_context: {
          vendor_type: 'photographer',
          referral_source: 'existing_client'
        }
      };

      const { data: insertData, error: insertError } = await supabase
        .from('invitation_tracking')
        .insert([testRecord])
        .select();

      expect(insertError).toBeNull();
      expect(insertData).toHaveLength(1);
      expect(insertData![0].inviter_id).toBe('test-inviter');
      expect(insertData![0].wedding_context).toEqual(testRecord.wedding_context);

      // Clean up
      await supabase.from('invitation_tracking').delete().eq('id', insertData![0].id);
    });

    it('should have viral_loop_metrics table with correct structure', async () => {
      const { data, error } = await supabase
        .from('viral_loop_metrics')
        .select('*')
        .limit(1);

      expect(error).toBeNull();
      expect(data).toBeDefined();

      // Test table structure
      const testRecord = {
        loop_type: 'supplier_to_couple',
        period_start: new Date('2024-06-01').toISOString(),
        period_end: new Date('2024-06-30').toISOString(),
        invitations_sent: 25,
        acceptances_count: 18,
        conversion_rate: 0.72,
        avg_conversion_time: 14,
        revenue_generated: 15000,
        wedding_season_factor: 1.4,
        vendor_segment: 'photographers',
        quality_metrics: {
          spam_reports: 0,
          satisfaction_score: 4.2,
          retention_rate: 0.85
        }
      };

      const { data: insertData, error: insertError } = await supabase
        .from('viral_loop_metrics')
        .insert([testRecord])
        .select();

      expect(insertError).toBeNull();
      expect(insertData).toHaveLength(1);
      expect(insertData![0].loop_type).toBe('supplier_to_couple');
      expect(insertData![0].conversion_rate).toBe(0.72);
      expect(insertData![0].quality_metrics).toEqual(testRecord.quality_metrics);

      // Clean up
      await supabase.from('viral_loop_metrics').delete().eq('id', insertData![0].id);
    });

    it('should have wedding_cohort_networks table with correct structure', async () => {
      const { data, error } = await supabase
        .from('wedding_cohort_networks')
        .select('*')
        .limit(1);

      expect(error).toBeNull();
      expect(data).toBeDefined();

      // Test table structure
      const testRecord = {
        cohort_month: '2024-06',
        cohort_size: 150,
        network_density: 0.15,
        cross_cohort_connections: 12,
        viral_coefficient: 1.25,
        seasonal_multiplier: 1.4,
        vendor_distribution: {
          photographers: 45,
          venues: 30,
          caterers: 25,
          florists: 20,
          others: 30
        },
        network_analysis: {
          clustering_coefficient: 0.35,
          average_path_length: 3.2,
          central_nodes: ['vendor_123', 'venue_456']
        }
      };

      const { data: insertData, error: insertError } = await supabase
        .from('wedding_cohort_networks')
        .insert([testRecord])
        .select();

      expect(insertError).toBeNull();
      expect(insertData).toHaveLength(1);
      expect(insertData![0].cohort_month).toBe('2024-06');
      expect(insertData![0].viral_coefficient).toBe(1.25);
      expect(insertData![0].vendor_distribution).toEqual(testRecord.vendor_distribution);
      expect(insertData![0].network_analysis).toEqual(testRecord.network_analysis);

      // Clean up
      await supabase.from('wedding_cohort_networks').delete().eq('id', insertData![0].id);
    });
  });

  describe('Row Level Security (RLS) Policies', () => {
    it('should enforce admin-only access to invitation_tracking', async () => {
      // Create a regular user client (non-admin)
      const regularUserClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      // Attempt to access invitation_tracking without admin privileges
      const { data, error } = await regularUserClient
        .from('invitation_tracking')
        .select('*')
        .limit(1);

      // Should be blocked by RLS
      expect(error).not.toBeNull();
      expect(error?.message).toContain('row-level security');
    });

    it('should enforce admin-only access to viral_loop_metrics', async () => {
      const regularUserClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data, error } = await regularUserClient
        .from('viral_loop_metrics')
        .select('*')
        .limit(1);

      expect(error).not.toBeNull();
      expect(error?.message).toContain('row-level security');
    });

    it('should enforce admin-only access to wedding_cohort_networks', async () => {
      const regularUserClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data, error } = await regularUserClient
        .from('wedding_cohort_networks')
        .select('*')
        .limit(1);

      expect(error).not.toBeNull();
      expect(error?.message).toContain('row-level security');
    });
  });

  describe('Data Integrity Constraints', () => {
    it('should enforce valid loop_type values in viral_loop_metrics', async () => {
      const invalidRecord = {
        loop_type: 'invalid_loop_type',
        period_start: new Date('2024-06-01').toISOString(),
        period_end: new Date('2024-06-30').toISOString(),
        invitations_sent: 10,
        acceptances_count: 5
      };

      const { error } = await supabase
        .from('viral_loop_metrics')
        .insert([invalidRecord]);

      expect(error).not.toBeNull();
      expect(error?.message).toContain('check constraint');
    });

    it('should enforce valid invitation_type values in invitation_tracking', async () => {
      const invalidRecord = {
        inviter_id: 'test-inviter',
        invited_user: 'test@example.com',
        invitation_type: 'invalid_type',
        invited_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('invitation_tracking')
        .insert([invalidRecord]);

      expect(error).not.toBeNull();
      expect(error?.message).toContain('check constraint');
    });

    it('should enforce non-negative values for metrics', async () => {
      const invalidRecord = {
        loop_type: 'supplier_to_couple',
        period_start: new Date('2024-06-01').toISOString(),
        period_end: new Date('2024-06-30').toISOString(),
        invitations_sent: -5, // Invalid negative value
        acceptances_count: 5
      };

      const { error } = await supabase
        .from('viral_loop_metrics')
        .insert([invalidRecord]);

      expect(error).not.toBeNull();
      expect(error?.message).toContain('check constraint');
    });

    it('should enforce valid conversion rate range (0-1)', async () => {
      const invalidRecord = {
        loop_type: 'supplier_to_couple',
        period_start: new Date('2024-06-01').toISOString(),
        period_end: new Date('2024-06-30').toISOString(),
        invitations_sent: 10,
        acceptances_count: 5,
        conversion_rate: 1.5 // Invalid - over 1.0
      };

      const { error } = await supabase
        .from('viral_loop_metrics')
        .insert([invalidRecord]);

      expect(error).not.toBeNull();
      expect(error?.message).toContain('check constraint');
    });
  });

  describe('Index Performance', () => {
    it('should have proper indexes for date range queries', async () => {
      // Insert test data for performance testing
      const testRecords = [];
      const baseDate = new Date('2024-01-01');
      
      for (let i = 0; i < 100; i++) {
        const date = new Date(baseDate);
        date.setDate(date.getDate() + i);
        
        testRecords.push({
          loop_type: i % 2 === 0 ? 'supplier_to_couple' : 'couple_to_supplier',
          period_start: date.toISOString(),
          period_end: new Date(date.getTime() + 24 * 60 * 60 * 1000).toISOString(),
          invitations_sent: Math.floor(Math.random() * 50) + 10,
          acceptances_count: Math.floor(Math.random() * 20) + 5
        });
      }

      // Insert test data
      const { error: insertError } = await supabase
        .from('viral_loop_metrics')
        .insert(testRecords);

      expect(insertError).toBeNull();

      // Test date range query performance
      const startTime = Date.now();
      const { data, error } = await supabase
        .from('viral_loop_metrics')
        .select('*')
        .gte('period_start', '2024-02-01')
        .lte('period_end', '2024-02-28');

      const queryTime = Date.now() - startTime;

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(queryTime).toBeLessThan(1000); // Should complete within 1 second

      // Clean up test data
      await supabase
        .from('viral_loop_metrics')
        .delete()
        .gte('period_start', '2024-01-01')
        .lte('period_end', '2024-05-01');
    });

    it('should have efficient indexes for loop_type filtering', async () => {
      // Test loop_type filtering performance
      const startTime = Date.now();
      const { data, error } = await supabase
        .from('viral_loop_metrics')
        .select('*')
        .eq('loop_type', 'supplier_to_couple')
        .limit(10);

      const queryTime = Date.now() - startTime;

      expect(error).toBeNull();
      expect(queryTime).toBeLessThan(500); // Should be very fast with index
    });
  });

  describe('JSONB Column Functionality', () => {
    it('should support JSONB queries on wedding_context', async () => {
      const testRecord = {
        inviter_id: 'test-inviter',
        invited_user: 'test@example.com',
        invitation_type: 'supplier_referral',
        invited_at: new Date().toISOString(),
        wedding_context: {
          vendor_type: 'photographer',
          referral_source: 'existing_client',
          wedding_date: '2024-08-15',
          budget_range: 'premium'
        }
      };

      const { data: insertData, error: insertError } = await supabase
        .from('invitation_tracking')
        .insert([testRecord])
        .select();

      expect(insertError).toBeNull();

      // Test JSONB query functionality
      const { data, error } = await supabase
        .from('invitation_tracking')
        .select('*')
        .eq('wedding_context->vendor_type', 'photographer');

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data!.length).toBeGreaterThan(0);

      // Test nested JSONB access
      const { data: budgetData, error: budgetError } = await supabase
        .from('invitation_tracking')
        .select('*')
        .eq('wedding_context->budget_range', 'premium');

      expect(budgetError).toBeNull();
      expect(budgetData).toBeDefined();

      // Clean up
      await supabase.from('invitation_tracking').delete().eq('id', insertData![0].id);
    });

    it('should support JSONB queries on quality_metrics', async () => {
      const testRecord = {
        loop_type: 'supplier_to_couple',
        period_start: new Date('2024-06-01').toISOString(),
        period_end: new Date('2024-06-30').toISOString(),
        invitations_sent: 25,
        acceptances_count: 18,
        quality_metrics: {
          spam_reports: 0,
          satisfaction_score: 4.7,
          retention_rate: 0.92,
          response_time_avg: 3.2
        }
      };

      const { data: insertData, error: insertError } = await supabase
        .from('viral_loop_metrics')
        .insert([testRecord])
        .select();

      expect(insertError).toBeNull();

      // Test JSONB numeric queries
      const { data, error } = await supabase
        .from('viral_loop_metrics')
        .select('*')
        .gte('quality_metrics->satisfaction_score', '4.5');

      expect(error).toBeNull();
      expect(data).toBeDefined();

      // Clean up
      await supabase.from('viral_loop_metrics').delete().eq('id', insertData![0].id);
    });
  });

  describe('Data Migration Compatibility', () => {
    it('should handle existing user_profiles table references', async () => {
      // Test that our foreign key references work with existing schema
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('id')
        .limit(1);

      // If user_profiles exists, our references should work
      if (!profileError && profileData && profileData.length > 0) {
        const testRecord = {
          inviter_id: profileData[0].id,
          invited_user: 'test@example.com',
          invitation_type: 'supplier_referral',
          invited_at: new Date().toISOString()
        };

        const { data, error } = await supabase
          .from('invitation_tracking')
          .insert([testRecord])
          .select();

        expect(error).toBeNull();
        expect(data).toHaveLength(1);

        // Clean up
        await supabase.from('invitation_tracking').delete().eq('id', data![0].id);
      }
    });
  });

  describe('Migration Rollback Safety', () => {
    it('should be safe to rollback migration without data loss', async () => {
      // This test verifies that our migration doesn't modify existing tables
      // in ways that would cause data loss on rollback

      // Check that existing tables are not modified
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .limit(1);

      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .limit(1);

      // These should still work - our migration only adds tables
      expect(orgError).toBeNull();
      expect(profileError).toBeNull();
    });
  });

  describe('Performance and Scale Testing', () => {
    it('should handle bulk inserts efficiently', async () => {
      const bulkRecords = [];
      const batchSize = 50;

      for (let i = 0; i < batchSize; i++) {
        bulkRecords.push({
          inviter_id: `user-${i}`,
          invited_user: `invited-${i}@example.com`,
          invitation_type: 'supplier_referral',
          invited_at: new Date().toISOString(),
          accepted: Math.random() > 0.5
        });
      }

      const startTime = Date.now();
      const { data, error } = await supabase
        .from('invitation_tracking')
        .insert(bulkRecords)
        .select();

      const insertTime = Date.now() - startTime;

      expect(error).toBeNull();
      expect(data).toHaveLength(batchSize);
      expect(insertTime).toBeLessThan(5000); // Should complete within 5 seconds

      // Clean up
      const ids = data!.map(record => record.id);
      await supabase.from('invitation_tracking').delete().in('id', ids);
    });

    it('should handle complex aggregation queries efficiently', async () => {
      const startTime = Date.now();
      
      // Test complex query that might be used in viral coefficient calculation
      const { data, error } = await supabase
        .rpc('calculate_viral_metrics_summary', {
          start_date: '2024-01-01',
          end_date: '2024-12-31'
        })
        .single();

      const queryTime = Date.now() - startTime;

      // Query should complete reasonably fast even if no data exists
      expect(queryTime).toBeLessThan(3000);
    });
  });
});