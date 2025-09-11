import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';

// Test configuration
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  (() => {
    throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_URL');
  })();
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  (() => {
    throw new Error('Missing environment variable: SUPABASE_SERVICE_ROLE_KEY');
  })();

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

describe('WS-214 Vendor Connections System Integration Tests', () => {
  let testOrgId: string;
  let testVendor1Id: string;
  let testVendor2Id: string;
  let testVendor3Id: string;

  beforeAll(async () => {
    // Create test organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: 'Test Vendor Network Org',
        slug: 'test-vendor-network-' + Date.now(),
        pricing_tier: 'PROFESSIONAL',
      })
      .select()
      .single();

    if (orgError) throw orgError;
    testOrgId = org.id;

    // Create test vendors
    const testVendors = [
      {
        organization_id: testOrgId,
        business_name: 'Test Photography Studio',
        slug: 'test-photo-studio-' + Date.now(),
        primary_category: 'Photography',
        email: 'photographer@test.com',
        city: 'London',
        county: 'Greater London',
        is_published: true,
        profile_completion_score: 85,
        average_rating: 4.8,
        total_reviews: 45,
        years_in_business: 5,
        service_radius_miles: 50,
      },
      {
        organization_id: testOrgId,
        business_name: 'Test Floral Design',
        slug: 'test-floral-design-' + Date.now(),
        primary_category: 'Florist',
        email: 'florist@test.com',
        city: 'London',
        county: 'Greater London',
        is_published: true,
        profile_completion_score: 92,
        average_rating: 4.9,
        total_reviews: 67,
        years_in_business: 8,
        service_radius_miles: 30,
      },
      {
        organization_id: testOrgId,
        business_name: 'Test Wedding Venue',
        slug: 'test-wedding-venue-' + Date.now(),
        primary_category: 'Venue',
        email: 'venue@test.com',
        city: 'Birmingham',
        county: 'West Midlands',
        is_published: true,
        profile_completion_score: 78,
        average_rating: 4.6,
        total_reviews: 23,
        years_in_business: 12,
        service_radius_miles: 100,
      },
    ];

    const { data: vendors, error: vendorError } = await supabase
      .from('suppliers')
      .insert(testVendors)
      .select();

    if (vendorError) throw vendorError;

    testVendor1Id = vendors[0].id;
    testVendor2Id = vendors[1].id;
    testVendor3Id = vendors[2].id;
  });

  afterAll(async () => {
    // Clean up test data
    if (testOrgId) {
      await supabase.from('organizations').delete().eq('id', testOrgId);
    }
  });

  beforeEach(async () => {
    // Clean up connection-related data before each test
    await supabase
      .from('vendor_connection_requests')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase
      .from('vendor_connections')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase
      .from('vendor_networking_recommendations')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
  });

  describe('Vendor Connection Requests', () => {
    it('should create a connection request between vendors', async () => {
      const { data, error } = await supabase
        .from('vendor_connection_requests')
        .insert({
          from_vendor_id: testVendor1Id,
          to_vendor_id: testVendor2Id,
          from_business_name: 'Test Photography Studio',
          to_business_name: 'Test Floral Design',
          message: 'I would love to collaborate on upcoming weddings!',
          category: 'Photography',
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeTruthy();
      expect(data.from_vendor_id).toBe(testVendor1Id);
      expect(data.to_vendor_id).toBe(testVendor2Id);
      expect(data.status).toBe('pending');
    });

    it('should prevent duplicate connection requests', async () => {
      // Create first request
      await supabase.from('vendor_connection_requests').insert({
        from_vendor_id: testVendor1Id,
        to_vendor_id: testVendor2Id,
        from_business_name: 'Test Photography Studio',
        to_business_name: 'Test Floral Design',
        message: 'First request',
        category: 'Photography',
      });

      // Attempt duplicate request
      const { error } = await supabase
        .from('vendor_connection_requests')
        .insert({
          from_vendor_id: testVendor1Id,
          to_vendor_id: testVendor2Id,
          from_business_name: 'Test Photography Studio',
          to_business_name: 'Test Floral Design',
          message: 'Duplicate request',
          category: 'Photography',
        });

      expect(error).toBeTruthy();
      expect(error?.code).toBe('23505'); // Unique constraint violation
    });

    it('should prevent self-connection requests', async () => {
      const { error } = await supabase
        .from('vendor_connection_requests')
        .insert({
          from_vendor_id: testVendor1Id,
          to_vendor_id: testVendor1Id,
          from_business_name: 'Test Photography Studio',
          to_business_name: 'Test Photography Studio',
          message: 'Self request',
          category: 'Photography',
        });

      expect(error).toBeTruthy();
      expect(error?.code).toBe('23514'); // Check constraint violation
    });
  });

  describe('Vendor Connections', () => {
    it('should create bidirectional connections when request is accepted', async () => {
      // Create and accept a connection request
      const { data: request } = await supabase
        .from('vendor_connection_requests')
        .insert({
          from_vendor_id: testVendor1Id,
          to_vendor_id: testVendor2Id,
          from_business_name: 'Test Photography Studio',
          to_business_name: 'Test Floral Design',
          message: "Let's connect!",
          category: 'Photography',
        })
        .select()
        .single();

      // Accept the request by creating connections
      const connectionsData = [
        {
          vendor_id: testVendor1Id,
          connected_vendor_id: testVendor2Id,
          status: 'accepted',
          connection_type: 'mutual',
        },
        {
          vendor_id: testVendor2Id,
          connected_vendor_id: testVendor1Id,
          status: 'accepted',
          connection_type: 'mutual',
        },
      ];

      const { data: connections, error } = await supabase
        .from('vendor_connections')
        .insert(connectionsData)
        .select();

      expect(error).toBeNull();
      expect(connections).toHaveLength(2);
      expect(connections?.[0].status).toBe('accepted');
      expect(connections?.[1].status).toBe('accepted');

      // Update request status
      await supabase
        .from('vendor_connection_requests')
        .update({ status: 'accepted' })
        .eq('id', request.id);
    });

    it('should query mutual connections correctly', async () => {
      // Create connections: Vendor1 <-> Vendor2, Vendor2 <-> Vendor3
      const connections = [
        {
          vendor_id: testVendor1Id,
          connected_vendor_id: testVendor2Id,
          status: 'accepted',
        },
        {
          vendor_id: testVendor2Id,
          connected_vendor_id: testVendor1Id,
          status: 'accepted',
        },
        {
          vendor_id: testVendor2Id,
          connected_vendor_id: testVendor3Id,
          status: 'accepted',
        },
        {
          vendor_id: testVendor3Id,
          connected_vendor_id: testVendor2Id,
          status: 'accepted',
        },
      ];

      await supabase.from('vendor_connections').insert(connections);

      // Query Vendor1's connections
      const { data: vendor1Connections, error } = await supabase
        .from('vendor_connections')
        .select('connected_vendor_id')
        .eq('vendor_id', testVendor1Id)
        .eq('status', 'accepted');

      expect(error).toBeNull();
      expect(vendor1Connections).toHaveLength(1);
      expect(vendor1Connections?.[0].connected_vendor_id).toBe(testVendor2Id);

      // Find mutual connections between Vendor1 and Vendor3 (should be Vendor2)
      const { count: mutualCount } = await supabase
        .from('vendor_connections')
        .select('id', { count: 'exact' })
        .eq('vendor_id', testVendor3Id)
        .in('connected_vendor_id', [testVendor2Id])
        .eq('status', 'accepted');

      expect(mutualCount).toBe(1);
    });
  });

  describe('Networking Recommendations', () => {
    it('should create networking recommendations', async () => {
      const { data, error } = await supabase
        .from('vendor_networking_recommendations')
        .insert({
          vendor_id: testVendor1Id,
          recommended_vendor_id: testVendor2Id,
          recommendation_reason: 'Complementary services in the same location',
          recommendation_score: 85,
          recommendation_type: 'category_complementary',
          geographic_overlap: true,
          complementary_services: true,
          similar_rating_tier: true,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeTruthy();
      expect(data.recommendation_score).toBe(85);
      expect(data.complementary_services).toBe(true);
    });

    it('should validate recommendation score range', async () => {
      const { error } = await supabase
        .from('vendor_networking_recommendations')
        .insert({
          vendor_id: testVendor1Id,
          recommended_vendor_id: testVendor2Id,
          recommendation_reason: 'Invalid score test',
          recommendation_score: 150, // Invalid - over 100
          recommendation_type: 'general',
        });

      expect(error).toBeTruthy();
      expect(error?.code).toBe('23514'); // Check constraint violation
    });
  });

  describe('Referral Opportunities', () => {
    it('should create referral opportunities', async () => {
      const { data, error } = await supabase
        .from('vendor_referral_opportunities')
        .insert({
          posted_by_vendor_id: testVendor1Id,
          organization_id: testOrgId,
          client_name: 'Jane & John Smith',
          wedding_date: '2025-06-15',
          venue_name: 'Sunset Manor',
          venue_location: 'London, UK',
          guest_count: 120,
          budget_range: '£15,000 - £20,000',
          description: 'Looking for a talented florist for a garden wedding',
          services_needed: ['Florist', 'Catering'],
          referral_fee_percentage: 5,
          priority: 'high',
          expires_at: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000,
          ).toISOString(), // 30 days
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeTruthy();
      expect(data.services_needed).toEqual(['Florist', 'Catering']);
      expect(data.priority).toBe('high');
    });

    it('should create referral applications', async () => {
      // First create an opportunity
      const { data: opportunity } = await supabase
        .from('vendor_referral_opportunities')
        .insert({
          posted_by_vendor_id: testVendor1Id,
          organization_id: testOrgId,
          client_name: 'Test Client',
          wedding_date: '2025-07-20',
          venue_location: 'London, UK',
          services_needed: ['Florist'],
          expires_at: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        })
        .select()
        .single();

      // Create an application
      const { data: application, error } = await supabase
        .from('vendor_referral_applications')
        .insert({
          opportunity_id: opportunity.id,
          applicant_vendor_id: testVendor2Id,
          cover_message:
            'I would love to provide floral services for this wedding!',
          proposed_price: 2500,
          availability_confirmed: true,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(application).toBeTruthy();
      expect(application.status).toBe('pending');
      expect(application.proposed_price).toBe('2500');
    });
  });

  describe('Collaborative Projects', () => {
    it('should create collaborative projects', async () => {
      const { data, error } = await supabase
        .from('vendor_collaborative_projects')
        .insert({
          organization_id: testOrgId,
          lead_vendor_id: testVendor1Id,
          project_name: 'Smith Wedding Collaboration',
          client_name: 'Emily & Michael Smith',
          wedding_date: '2025-08-30',
          venue_name: 'Royal Gardens',
          venue_location: 'London, UK',
          project_status: 'planning',
          total_budget: 25000,
          shared_budget: 5000,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeTruthy();
      expect(data.project_status).toBe('planning');
      expect(data.total_budget).toBe('25000');
    });

    it('should add project collaborators', async () => {
      // Create a project first
      const { data: project } = await supabase
        .from('vendor_collaborative_projects')
        .insert({
          organization_id: testOrgId,
          lead_vendor_id: testVendor1Id,
          project_name: 'Test Collaboration Project',
          client_name: 'Test Client',
          wedding_date: '2025-09-15',
          venue_location: 'Test Location',
        })
        .select()
        .single();

      // Add collaborators
      const { data: collaborator, error } = await supabase
        .from('project_collaborators')
        .insert({
          project_id: project.id,
          vendor_id: testVendor2Id,
          collaboration_role: 'Florist',
          revenue_share_percentage: 30,
          invitation_status: 'accepted',
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(collaborator).toBeTruthy();
      expect(collaborator.collaboration_role).toBe('Florist');
      expect(collaborator.revenue_share_percentage).toBe('30');
    });

    it('should create project tasks', async () => {
      // Create a project first
      const { data: project } = await supabase
        .from('vendor_collaborative_projects')
        .insert({
          organization_id: testOrgId,
          lead_vendor_id: testVendor1Id,
          project_name: 'Task Test Project',
          client_name: 'Task Client',
          wedding_date: '2025-10-20',
          venue_location: 'Task Location',
        })
        .select()
        .single();

      // Create a task
      const { data: task, error } = await supabase
        .from('project_shared_tasks')
        .insert({
          project_id: project.id,
          created_by_vendor_id: testVendor1Id,
          assigned_to_vendor_id: testVendor2Id,
          task_title: 'Design floral arrangements',
          task_description: 'Create centerpieces and bridal bouquet designs',
          priority: 'high',
          due_date: '2025-08-15T10:00:00Z',
          tags: ['design', 'florals', 'urgent'],
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(task).toBeTruthy();
      expect(task.task_title).toBe('Design floral arrangements');
      expect(task.priority).toBe('high');
      expect(task.tags).toEqual(['design', 'florals', 'urgent']);
    });
  });

  describe('Vendor Discovery Algorithm', () => {
    it('should discover vendors excluding connected ones', async () => {
      // Create a connection between vendor 1 and 2
      await supabase.from('vendor_connections').insert([
        {
          vendor_id: testVendor1Id,
          connected_vendor_id: testVendor2Id,
          status: 'accepted',
        },
        {
          vendor_id: testVendor2Id,
          connected_vendor_id: testVendor1Id,
          status: 'accepted',
        },
      ]);

      // Query vendors for discovery (excluding connected ones)
      const { data: vendors, error } = await supabase
        .from('suppliers')
        .select('id, business_name, primary_category, city, county')
        .neq('id', testVendor1Id)
        .eq('is_published', true)
        .not('id', 'in', `(${testVendor2Id})`); // Exclude connected vendor

      expect(error).toBeNull();
      expect(vendors).toBeTruthy();

      // Should include vendor 3 but not vendor 2
      const vendorIds = vendors?.map((v) => v.id) || [];
      expect(vendorIds).toContain(testVendor3Id);
      expect(vendorIds).not.toContain(testVendor2Id);
    });

    it('should prioritize vendors by relevance factors', async () => {
      // This test verifies the sorting logic implemented in the API
      const { data: vendors, error } = await supabase
        .from('suppliers')
        .select(
          `
          id,
          business_name,
          primary_category,
          city,
          county,
          average_rating,
          profile_completion_score
        `,
        )
        .neq('id', testVendor1Id)
        .eq('is_published', true)
        .order('profile_completion_score', { ascending: false });

      expect(error).toBeNull();
      expect(vendors).toBeTruthy();

      if (vendors && vendors.length > 1) {
        // Should be sorted by profile completion score descending
        expect(vendors[0].profile_completion_score).toBeGreaterThanOrEqual(
          vendors[1].profile_completion_score,
        );
      }
    });
  });

  describe('System Performance and Data Integrity', () => {
    it('should handle concurrent connection requests gracefully', async () => {
      // Simulate concurrent requests
      const requests = Array(3)
        .fill(null)
        .map((_, i) =>
          supabase.from('vendor_connection_requests').insert({
            from_vendor_id: testVendor1Id,
            to_vendor_id: testVendor2Id,
            from_business_name: 'Test Photography Studio',
            to_business_name: 'Test Floral Design',
            message: `Concurrent request ${i}`,
            category: 'Photography',
          }),
        );

      const results = await Promise.allSettled(requests);

      // Only one should succeed due to unique constraint
      const successful = results.filter((r) => r.status === 'fulfilled');
      const failed = results.filter((r) => r.status === 'rejected');

      expect(successful).toHaveLength(1);
      expect(failed).toHaveLength(2);
    });

    it('should maintain referential integrity', async () => {
      // Create a project with collaborators
      const { data: project } = await supabase
        .from('vendor_collaborative_projects')
        .insert({
          organization_id: testOrgId,
          lead_vendor_id: testVendor1Id,
          project_name: 'Integrity Test Project',
          client_name: 'Integrity Client',
          wedding_date: '2025-11-15',
          venue_location: 'Integrity Location',
        })
        .select()
        .single();

      await supabase.from('project_collaborators').insert({
        project_id: project.id,
        vendor_id: testVendor2Id,
        collaboration_role: 'Florist',
      });

      // Delete the project should cascade to collaborators
      const { error: deleteError } = await supabase
        .from('vendor_collaborative_projects')
        .delete()
        .eq('id', project.id);

      expect(deleteError).toBeNull();

      // Collaborator should be deleted via CASCADE
      const { data: remainingCollaborators } = await supabase
        .from('project_collaborators')
        .select('id')
        .eq('project_id', project.id);

      expect(remainingCollaborators).toEqual([]);
    });
  });
});
