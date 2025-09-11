/**
 * @file setup-endpoints.test.ts
 * @description API tests for wedding setup endpoints (BasicAPI - Team B)
 * @coverage Setup creation, validation, updates, retrieval, error handling
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createMocks } from 'node-mocks-http';
import { createClient } from '@supabase/supabase-js';
import handler from '@/app/api/wedding-setup/route';
import updateHandler from '@/app/api/wedding-setup/[id]/route';
import validateHandler from '@/app/api/wedding-setup/validate/route';
import venueSearchHandler from '@/app/api/wedding-setup/venues/search/route';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
    (() => {
      throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_URL');
    })(),
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    (() => {
      throw new Error(
        'Missing environment variable: SUPABASE_SERVICE_ROLE_KEY',
      );
    })(),
);

describe('Wedding Setup API Endpoints', () => {
  let testUserId: string;
  let testOrganizationId: string;
  let testSetupId: string;

  beforeAll(async () => {
    // Create test user
    const { data: userData, error: userError } = await supabase.auth.signUp({
      email: 'api-test@weddingsetup.test',
      password: 'testpassword123',
    });

    if (userError) throw userError;
    testUserId = userData.user!.id;

    // Create test organization
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: 'Test API Organization',
        owner_id: testUserId,
        subscription_tier: 'professional',
      })
      .select()
      .single();

    if (orgError) throw orgError;
    testOrganizationId = orgData.id;
  });

  afterAll(async () => {
    // Cleanup
    if (testSetupId) {
      await supabase.from('wedding_setups').delete().eq('id', testSetupId);
    }
    await supabase.from('organizations').delete().eq('id', testOrganizationId);
    await supabase.auth.admin.deleteUser(testUserId);
  });

  beforeEach(async () => {
    // Clean up any existing setups
    await supabase.from('wedding_setups').delete().eq('user_id', testUserId);
  });

  describe('POST /api/wedding-setup', () => {
    it('creates a new wedding setup with valid data', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${testUserId}`, // Mock auth
        },
        body: {
          partner1Name: 'John Doe',
          partner2Name: 'Jane Smith',
          weddingDate: '2025-06-15',
          contactEmail: 'john.jane@example.com',
          contactPhone: '+1234567890',
          guestCount: 150,
          weddingStyle: 'Traditional',
          budgetRange: '$20,000 - $30,000',
          organizationId: testOrganizationId,
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(201);

      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(true);
      expect(responseData.data).toMatchObject({
        id: expect.any(String),
        partner1Name: 'John Doe',
        partner2Name: 'Jane Smith',
        contactEmail: 'john.jane@example.com',
        setupComplete: false,
      });

      testSetupId = responseData.data.id;

      // Verify database record
      const { data: dbRecord } = await supabase
        .from('wedding_setups')
        .select('*')
        .eq('id', testSetupId)
        .single();

      expect(dbRecord).toBeDefined();
      expect(dbRecord.partner1_name).toBe('John Doe');
      expect(dbRecord.setup_complete).toBe(false);
    });

    it('validates required fields', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${testUserId}`,
        },
        body: {
          // Missing required fields
          partner1Name: '',
          organizationId: testOrganizationId,
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);

      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(false);
      expect(responseData.errors).toContain('Partner 1 name is required');
      expect(responseData.errors).toContain('Partner 2 name is required');
      expect(responseData.errors).toContain('Wedding date is required');
      expect(responseData.errors).toContain('Contact email is required');
    });

    it('validates email format', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${testUserId}`,
        },
        body: {
          partner1Name: 'John Doe',
          partner2Name: 'Jane Smith',
          weddingDate: '2025-06-15',
          contactEmail: 'invalid-email-format',
          organizationId: testOrganizationId,
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);

      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(false);
      expect(responseData.errors).toContain(
        'Please enter a valid email address',
      );
    });

    it('validates wedding date is in future', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${testUserId}`,
        },
        body: {
          partner1Name: 'John Doe',
          partner2Name: 'Jane Smith',
          weddingDate: '2020-01-01', // Past date
          contactEmail: 'john.jane@example.com',
          organizationId: testOrganizationId,
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);

      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(false);
      expect(responseData.errors).toContain(
        'Wedding date must be in the future',
      );
    });

    it('handles authentication errors', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Missing Authorization header
        },
        body: {
          partner1Name: 'John Doe',
          partner2Name: 'Jane Smith',
          weddingDate: '2025-06-15',
          contactEmail: 'john.jane@example.com',
          organizationId: testOrganizationId,
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(401);

      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Authentication required');
    });

    it('handles organization permission errors', async () => {
      // Create another organization that the user doesn't own
      const { data: otherOrg } = await supabase
        .from('organizations')
        .insert({
          name: 'Other Organization',
          owner_id: 'other-user-id',
        })
        .select()
        .single();

      const { req, res } = createMocks({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${testUserId}`,
        },
        body: {
          partner1Name: 'John Doe',
          partner2Name: 'Jane Smith',
          weddingDate: '2025-06-15',
          contactEmail: 'john.jane@example.com',
          organizationId: otherOrg.id,
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(403);

      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Access denied to organization');

      // Cleanup
      await supabase.from('organizations').delete().eq('id', otherOrg.id);
    });

    it('handles database errors gracefully', async () => {
      // Mock database error by using invalid organization ID
      const { req, res } = createMocks({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${testUserId}`,
        },
        body: {
          partner1Name: 'John Doe',
          partner2Name: 'Jane Smith',
          weddingDate: '2025-06-15',
          contactEmail: 'john.jane@example.com',
          organizationId: 'invalid-uuid',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);

      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain('Database error');
    });
  });

  describe('GET /api/wedding-setup/[id]', () => {
    beforeEach(async () => {
      // Create a test setup
      const { data: setup } = await supabase
        .from('wedding_setups')
        .insert({
          user_id: testUserId,
          organization_id: testOrganizationId,
          partner1_name: 'John Doe',
          partner2_name: 'Jane Smith',
          wedding_date: '2025-06-15',
          contact_email: 'john.jane@example.com',
          guest_count: 150,
          setup_complete: false,
        })
        .select()
        .single();

      testSetupId = setup.id;
    });

    it('retrieves wedding setup by ID', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        headers: {
          Authorization: `Bearer ${testUserId}`,
        },
        query: {
          id: testSetupId,
        },
      });

      await updateHandler(req, res);

      expect(res._getStatusCode()).toBe(200);

      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(true);
      expect(responseData.data).toMatchObject({
        id: testSetupId,
        partner1Name: 'John Doe',
        partner2Name: 'Jane Smith',
        contactEmail: 'john.jane@example.com',
        guestCount: 150,
        setupComplete: false,
      });
    });

    it('returns 404 for non-existent setup', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        headers: {
          Authorization: `Bearer ${testUserId}`,
        },
        query: {
          id: 'non-existent-id',
        },
      });

      await updateHandler(req, res);

      expect(res._getStatusCode()).toBe(404);

      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Wedding setup not found');
    });

    it('enforces ownership permissions', async () => {
      // Create another user's setup
      const { data: otherUser } = await supabase.auth.signUp({
        email: 'other@example.com',
        password: 'password123',
      });

      const { data: otherSetup } = await supabase
        .from('wedding_setups')
        .insert({
          user_id: otherUser.user!.id,
          organization_id: testOrganizationId,
          partner1_name: 'Other User',
          partner2_name: 'Other Partner',
          wedding_date: '2025-07-01',
          contact_email: 'other@example.com',
        })
        .select()
        .single();

      const { req, res } = createMocks({
        method: 'GET',
        headers: {
          Authorization: `Bearer ${testUserId}`, // Different user
        },
        query: {
          id: otherSetup.id,
        },
      });

      await updateHandler(req, res);

      expect(res._getStatusCode()).toBe(403);

      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Access denied');

      // Cleanup
      await supabase.from('wedding_setups').delete().eq('id', otherSetup.id);
      await supabase.auth.admin.deleteUser(otherUser.user!.id);
    });
  });

  describe('PUT /api/wedding-setup/[id]', () => {
    beforeEach(async () => {
      // Create a test setup
      const { data: setup } = await supabase
        .from('wedding_setups')
        .insert({
          user_id: testUserId,
          organization_id: testOrganizationId,
          partner1_name: 'John Doe',
          partner2_name: 'Jane Smith',
          wedding_date: '2025-06-15',
          contact_email: 'john.jane@example.com',
          guest_count: 150,
        })
        .select()
        .single();

      testSetupId = setup.id;
    });

    it('updates wedding setup with valid data', async () => {
      const { req, res } = createMocks({
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${testUserId}`,
        },
        query: {
          id: testSetupId,
        },
        body: {
          partner1Name: 'John Updated',
          guestCount: 200,
          weddingStyle: 'Modern',
        },
      });

      await updateHandler(req, res);

      expect(res._getStatusCode()).toBe(200);

      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(true);
      expect(responseData.data).toMatchObject({
        id: testSetupId,
        partner1Name: 'John Updated',
        partner2Name: 'Jane Smith', // Unchanged
        guestCount: 200,
        weddingStyle: 'Modern',
      });

      // Verify database update
      const { data: dbRecord } = await supabase
        .from('wedding_setups')
        .select('*')
        .eq('id', testSetupId)
        .single();

      expect(dbRecord.partner1_name).toBe('John Updated');
      expect(dbRecord.guest_count).toBe(200);
      expect(dbRecord.wedding_style).toBe('Modern');
    });

    it('validates updated data', async () => {
      const { req, res } = createMocks({
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${testUserId}`,
        },
        query: {
          id: testSetupId,
        },
        body: {
          contactEmail: 'invalid-email',
          guestCount: -50,
        },
      });

      await updateHandler(req, res);

      expect(res._getStatusCode()).toBe(400);

      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(false);
      expect(responseData.errors).toContain(
        'Please enter a valid email address',
      );
      expect(responseData.errors).toContain(
        'Guest count must be a positive number',
      );
    });

    it('handles partial updates correctly', async () => {
      const { req, res } = createMocks({
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${testUserId}`,
        },
        query: {
          id: testSetupId,
        },
        body: {
          guestCount: 175,
        },
      });

      await updateHandler(req, res);

      expect(res._getStatusCode()).toBe(200);

      // Verify only guest count was updated
      const { data: dbRecord } = await supabase
        .from('wedding_setups')
        .select('*')
        .eq('id', testSetupId)
        .single();

      expect(dbRecord.guest_count).toBe(175);
      expect(dbRecord.partner1_name).toBe('John Doe'); // Unchanged
      expect(dbRecord.partner2_name).toBe('Jane Smith'); // Unchanged
    });
  });

  describe('POST /api/wedding-setup/validate', () => {
    it('validates wedding setup data without saving', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: {
          partner1Name: 'John Doe',
          partner2Name: 'Jane Smith',
          weddingDate: '2025-06-15',
          contactEmail: 'john.jane@example.com',
          contactPhone: '+1234567890',
          guestCount: 150,
        },
      });

      await validateHandler(req, res);

      expect(res._getStatusCode()).toBe(200);

      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(true);
      expect(responseData.valid).toBe(true);
      expect(responseData.errors).toHaveLength(0);
    });

    it('returns validation errors for invalid data', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: {
          partner1Name: '', // Invalid
          partner2Name: 'Jane Smith',
          weddingDate: '2020-01-01', // Past date
          contactEmail: 'invalid-email',
          guestCount: -10, // Invalid number
        },
      });

      await validateHandler(req, res);

      expect(res._getStatusCode()).toBe(200);

      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(true);
      expect(responseData.valid).toBe(false);
      expect(responseData.errors.length).toBeGreaterThan(0);
      expect(responseData.errors).toContain('Partner 1 name is required');
      expect(responseData.errors).toContain(
        'Wedding date must be in the future',
      );
      expect(responseData.errors).toContain(
        'Please enter a valid email address',
      );
      expect(responseData.errors).toContain(
        'Guest count must be a positive number',
      );
    });

    it('provides warnings for potential issues', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: {
          partner1Name: 'John Doe',
          partner2Name: 'Jane Smith',
          weddingDate: '2025-06-15',
          contactEmail: 'john.jane@example.com',
          guestCount: 500, // Very large
          budgetRange: 'Under $10,000', // Low budget for high guest count
        },
      });

      await validateHandler(req, res);

      expect(res._getStatusCode()).toBe(200);

      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(true);
      expect(responseData.valid).toBe(true);
      expect(responseData.warnings.length).toBeGreaterThan(0);
      expect(responseData.warnings).toContain(
        'Budget may be insufficient for planned guest count',
      );
    });
  });

  describe('GET /api/wedding-setup/venues/search', () => {
    it('searches venues by location', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        headers: {
          Authorization: `Bearer ${testUserId}`,
        },
        query: {
          location: 'New York',
          capacity: '150',
        },
      });

      await venueSearchHandler(req, res);

      expect(res._getStatusCode()).toBe(200);

      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(true);
      expect(responseData.venues).toBeDefined();
      expect(Array.isArray(responseData.venues)).toBe(true);

      // Should have venue properties
      if (responseData.venues.length > 0) {
        const venue = responseData.venues[0];
        expect(venue).toHaveProperty('id');
        expect(venue).toHaveProperty('name');
        expect(venue).toHaveProperty('address');
        expect(venue).toHaveProperty('capacity');
        expect(venue).toHaveProperty('priceRange');
      }
    });

    it('filters venues by capacity', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        headers: {
          Authorization: `Bearer ${testUserId}`,
        },
        query: {
          location: 'Los Angeles',
          minCapacity: '100',
          maxCapacity: '200',
        },
      });

      await venueSearchHandler(req, res);

      expect(res._getStatusCode()).toBe(200);

      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(true);

      // All returned venues should meet capacity requirements
      responseData.venues.forEach((venue: any) => {
        expect(venue.capacity).toBeGreaterThanOrEqual(100);
        expect(venue.capacity).toBeLessThanOrEqual(200);
      });
    });

    it('filters venues by price range', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        headers: {
          Authorization: `Bearer ${testUserId}`,
        },
        query: {
          location: 'Chicago',
          priceRange: '$$,$$$ ',
        },
      });

      await venueSearchHandler(req, res);

      expect(res._getStatusCode()).toBe(200);

      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(true);

      // All returned venues should be in specified price ranges
      responseData.venues.forEach((venue: any) => {
        expect(['$$', '$$$']).toContain(venue.priceRange);
      });
    });

    it('handles search with no results', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        headers: {
          Authorization: `Bearer ${testUserId}`,
        },
        query: {
          location: 'NonexistentCity',
          capacity: '99999',
        },
      });

      await venueSearchHandler(req, res);

      expect(res._getStatusCode()).toBe(200);

      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(true);
      expect(responseData.venues).toHaveLength(0);
      expect(responseData.message).toBe(
        'No venues found matching your criteria',
      );
    });

    it('handles invalid search parameters', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        headers: {
          Authorization: `Bearer ${testUserId}`,
        },
        query: {
          minCapacity: 'invalid-number',
          maxCapacity: 'also-invalid',
        },
      });

      await venueSearchHandler(req, res);

      expect(res._getStatusCode()).toBe(400);

      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(false);
      expect(responseData.errors).toContain('Invalid capacity parameters');
    });
  });

  describe('Rate Limiting', () => {
    it('enforces rate limits on setup creation', async () => {
      const requests = [];

      // Make multiple rapid requests
      for (let i = 0; i < 6; i++) {
        const { req, res } = createMocks({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${testUserId}`,
          },
          body: {
            partner1Name: `John ${i}`,
            partner2Name: `Jane ${i}`,
            weddingDate: '2025-06-15',
            contactEmail: `test${i}@example.com`,
            organizationId: testOrganizationId,
          },
        });

        requests.push(handler(req, res));
      }

      await Promise.all(requests);

      // Some requests should be rate limited (429)
      const statusCodes = requests.map((r) => r.res._getStatusCode());
      expect(statusCodes).toContain(429);
    });
  });

  describe('Bulk Operations', () => {
    it('handles bulk setup creation', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${testUserId}`,
        },
        body: {
          bulk: true,
          setups: [
            {
              partner1Name: 'John 1',
              partner2Name: 'Jane 1',
              weddingDate: '2025-06-15',
              contactEmail: 'couple1@example.com',
              organizationId: testOrganizationId,
            },
            {
              partner1Name: 'John 2',
              partner2Name: 'Jane 2',
              weddingDate: '2025-07-15',
              contactEmail: 'couple2@example.com',
              organizationId: testOrganizationId,
            },
          ],
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(201);

      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(true);
      expect(responseData.created).toBe(2);
      expect(responseData.failed).toBe(0);
      expect(responseData.data).toHaveLength(2);
    });

    it('handles partial failures in bulk operations', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${testUserId}`,
        },
        body: {
          bulk: true,
          setups: [
            {
              partner1Name: 'John Valid',
              partner2Name: 'Jane Valid',
              weddingDate: '2025-06-15',
              contactEmail: 'valid@example.com',
              organizationId: testOrganizationId,
            },
            {
              partner1Name: '', // Invalid - missing name
              partner2Name: 'Jane Invalid',
              weddingDate: '2020-01-01', // Invalid - past date
              contactEmail: 'invalid-email',
              organizationId: testOrganizationId,
            },
          ],
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(207); // Multi-status

      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(true);
      expect(responseData.created).toBe(1);
      expect(responseData.failed).toBe(1);
      expect(responseData.errors).toHaveLength(1);
    });
  });

  describe('Integration Features', () => {
    it('integrates with external calendar services', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${testUserId}`,
        },
        body: {
          partner1Name: 'John Doe',
          partner2Name: 'Jane Smith',
          weddingDate: '2025-06-15',
          contactEmail: 'john.jane@example.com',
          organizationId: testOrganizationId,
          integrations: {
            googleCalendar: {
              enabled: true,
              calendarId: 'primary',
            },
          },
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(201);

      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(true);
      expect(responseData.data.integrations.googleCalendar.eventCreated).toBe(
        true,
      );
    });

    it('handles webhook notifications', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${testUserId}`,
        },
        body: {
          partner1Name: 'John Doe',
          partner2Name: 'Jane Smith',
          weddingDate: '2025-06-15',
          contactEmail: 'john.jane@example.com',
          organizationId: testOrganizationId,
          webhooks: {
            onCreated: 'https://example.com/webhook/setup-created',
            onCompleted: 'https://example.com/webhook/setup-completed',
          },
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(201);

      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(true);
      expect(responseData.data.webhooks.sent).toBe(true);
    });
  });
});
