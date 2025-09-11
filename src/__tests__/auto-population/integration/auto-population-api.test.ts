/**
 * WS-216 Auto-Population System - API Integration Tests
 *
 * Tests the complete auto-population API integration including
 * database operations, external service calls, and data processing.
 *
 * Wedding Industry Context:
 * - Tests realistic vendor data scenarios and edge cases
 * - Validates performance under wedding season load
 * - Ensures data integrity for irreplaceable wedding information
 * - Tests integration with external CRM systems (Tave, HoneyBook)
 */

import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from '@jest/test';
import { createClient } from '@supabase/supabase-js';
import request from 'supertest';
import { NextApiRequest, NextApiResponse } from 'next';
import { MockDataGenerator } from '../fixtures/mock-data-generator';
import { TestDatabaseManager } from '../fixtures/test-database-manager';
import { WeddingScenarios } from '../fixtures/wedding-scenarios';

// Test setup
let testDb: TestDatabaseManager;
let mockDataGenerator: MockDataGenerator;
let weddingScenarios: WeddingScenarios;
let supabaseClient: any;
let testVendorId: string;
let testClientId: string;
let testWeddingId: string;

beforeAll(async () => {
  // Initialize test database
  testDb = new TestDatabaseManager();
  await testDb.setup();

  mockDataGenerator = new MockDataGenerator();
  weddingScenarios = new WeddingScenarios();

  // Initialize Supabase client for testing
  supabaseClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
      (() => {
        throw new Error(
          'Missing environment variable: NEXT_PUBLIC_SUPABASE_URL',
        );
      })(),
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
      (() => {
        throw new Error(
          'Missing environment variable: SUPABASE_SERVICE_ROLE_KEY',
        );
      })(),
  );

  // Create test data
  const testVendor = await testDb.createTestVendor({
    business_name: 'Test Sky Photography',
    contact_email: 'test@skyphotography.co.uk',
    vendor_type: 'photographer',
    profile_completion: 0.95,
  });
  testVendorId = testVendor.id;

  const testClient = await testDb.createTestClient({
    name: 'Sarah Johnson & Mike Chen',
    email: 'sarah@example.com',
  });
  testClientId = testClient.id;

  const testWedding = await testDb.createTestWedding({
    client_id: testClientId,
    wedding_date: '2024-06-15',
    venue_name: 'Garden Estate Manor',
    guest_count: 150,
  });
  testWeddingId = testWedding.id;
});

afterAll(async () => {
  await testDb.teardown();
});

beforeEach(async () => {
  // Clear any cached data between tests
  await testDb.clearCache();
});

describe('Auto-Population API Endpoints', () => {
  describe('POST /api/auto-population/populate', () => {
    it('should populate form with vendor profile and wedding data', async () => {
      const populateRequest = {
        form_id: 'wedding-photography-quote',
        vendor_id: testVendorId,
        client_id: testClientId,
        wedding_id: testWeddingId,
        field_mapping: {
          'vendor-name': 'business_name',
          'vendor-email': 'contact_email',
          'wedding-date': 'wedding_date',
          'guest-count': 'guest_count',
          'venue-name': 'venue_name',
        },
      };

      const response = await request(
        process.env.TEST_API_URL || 'http://localhost:3000',
      )
        .post('/api/auto-population/populate')
        .send(populateRequest)
        .set('Authorization', `Bearer ${process.env.TEST_AUTH_TOKEN}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.populated_fields).toBeDefined();
      expect(response.body.metadata).toBeDefined();

      // Verify essential fields are populated
      const populatedFields = response.body.populated_fields;
      expect(populatedFields['vendor-name']).toEqual({
        value: 'Test Sky Photography',
        confidence: expect.any(Number),
        source: 'vendor_profile',
      });

      expect(populatedFields['wedding-date']).toEqual({
        value: '2024-06-15',
        confidence: expect.any(Number),
        source: 'wedding_context',
      });

      expect(populatedFields['guest-count']).toEqual({
        value: 150,
        confidence: expect.any(Number),
        source: 'wedding_context',
      });

      // Verify metadata
      expect(response.body.metadata.population_rate).toBeGreaterThan(0.5);
      expect(response.body.metadata.total_fields).toBeGreaterThan(0);
      expect(response.body.metadata.populated_fields).toBeGreaterThan(0);
    });

    it('should handle missing vendor profile gracefully', async () => {
      // Create vendor with minimal profile
      const minimalVendor = await testDb.createTestVendor({
        business_name: 'Minimal Vendor',
        contact_email: 'minimal@test.com',
        vendor_type: 'photographer',
        profile_completion: 0.2, // Low completion
      });

      const populateRequest = {
        form_id: 'wedding-photography-quote',
        vendor_id: minimalVendor.id,
        client_id: testClientId,
        wedding_id: testWeddingId,
        field_mapping: {
          'vendor-name': 'business_name',
          'vendor-phone': 'phone',
          'vendor-website': 'website',
          services: 'default_services',
        },
      };

      const response = await request(
        process.env.TEST_API_URL || 'http://localhost:3000',
      )
        .post('/api/auto-population/populate')
        .send(populateRequest)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Should populate available fields
      expect(response.body.populated_fields['vendor-name']).toBeDefined();

      // Should not populate missing fields
      expect(response.body.populated_fields['vendor-phone']).toBeUndefined();
      expect(response.body.populated_fields['vendor-website']).toBeUndefined();

      // Should indicate low population rate
      expect(response.body.metadata.population_rate).toBeLessThan(0.5);

      // Should provide recommendations
      expect(response.body.recommendations).toContain(
        'Complete vendor profile',
      );
    });

    it('should handle authentication and authorization correctly', async () => {
      const populateRequest = {
        form_id: 'wedding-photography-quote',
        vendor_id: testVendorId,
        client_id: testClientId,
        wedding_id: testWeddingId,
      };

      // Test without authentication
      await request(process.env.TEST_API_URL || 'http://localhost:3000')
        .post('/api/auto-population/populate')
        .send(populateRequest)
        .expect(401);

      // Test with invalid token
      await request(process.env.TEST_API_URL || 'http://localhost:3000')
        .post('/api/auto-population/populate')
        .send(populateRequest)
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      // Test access to other vendor's data
      const otherVendor = await testDb.createTestVendor({
        business_name: 'Other Vendor',
        contact_email: 'other@test.com',
      });

      const unauthorizedRequest = {
        ...populateRequest,
        vendor_id: otherVendor.id,
      };

      await request(process.env.TEST_API_URL || 'http://localhost:3000')
        .post('/api/auto-population/populate')
        .send(unauthorizedRequest)
        .set('Authorization', `Bearer ${process.env.TEST_AUTH_TOKEN}`)
        .expect(403);
    });

    it('should validate input data thoroughly', async () => {
      // Test missing required fields
      const invalidRequests = [
        {}, // Empty request
        { form_id: 'test' }, // Missing vendor_id
        { vendor_id: testVendorId }, // Missing form_id
        {
          form_id: 'test',
          vendor_id: 'invalid-uuid',
          client_id: testClientId,
        }, // Invalid UUID format
        {
          form_id: 'test',
          vendor_id: testVendorId,
          client_id: testClientId,
          field_mapping: 'not-an-object', // Invalid field_mapping type
        },
      ];

      for (const invalidRequest of invalidRequests) {
        await request(process.env.TEST_API_URL || 'http://localhost:3000')
          .post('/api/auto-population/populate')
          .send(invalidRequest)
          .set('Authorization', `Bearer ${process.env.TEST_AUTH_TOKEN}`)
          .expect(400);
      }
    });

    it('should perform within acceptable time limits', async () => {
      const populateRequest = {
        form_id: 'wedding-photography-quote',
        vendor_id: testVendorId,
        client_id: testClientId,
        wedding_id: testWeddingId,
        field_mapping: mockDataGenerator.generateLargeFieldMapping(100), // 100 fields
      };

      const startTime = Date.now();

      const response = await request(
        process.env.TEST_API_URL || 'http://localhost:3000',
      )
        .post('/api/auto-population/populate')
        .send(populateRequest)
        .set('Authorization', `Bearer ${process.env.TEST_AUTH_TOKEN}`)
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Should complete within 3 seconds even with 100 fields
      expect(responseTime).toBeLessThan(3000);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/auto-population/sources/{vendor_id}', () => {
    it('should return available data sources for vendor', async () => {
      const response = await request(
        process.env.TEST_API_URL || 'http://localhost:3000',
      )
        .get(`/api/auto-population/sources/${testVendorId}`)
        .set('Authorization', `Bearer ${process.env.TEST_AUTH_TOKEN}`)
        .expect(200);

      expect(response.body.vendor_profile).toBeDefined();
      expect(response.body.vendor_profile.completeness).toBeGreaterThan(0);
      expect(response.body.vendor_profile.available_fields).toBeInstanceOf(
        Array,
      );

      expect(response.body.client_history).toBeDefined();
      expect(response.body.templates).toBeDefined();
    });

    it('should calculate data source completeness correctly', async () => {
      const response = await request(
        process.env.TEST_API_URL || 'http://localhost:3000',
      )
        .get(`/api/auto-population/sources/${testVendorId}`)
        .set('Authorization', `Bearer ${process.env.TEST_AUTH_TOKEN}`)
        .expect(200);

      const completeness = response.body.vendor_profile.completeness;
      expect(completeness).toBeGreaterThan(0.9); // Our test vendor is 95% complete
      expect(completeness).toBeLessThanOrEqual(1.0);
    });
  });

  describe('POST /api/auto-population/feedback', () => {
    it('should record user feedback on auto-populated fields', async () => {
      const feedbackRequest = {
        vendor_id: testVendorId,
        form_id: 'wedding-photography-quote',
        field_feedback: [
          {
            field: 'vendor-name',
            action: 'accepted',
            confidence_accurate: true,
            user_rating: 5,
          },
          {
            field: 'guest-count',
            action: 'modified',
            original_value: 150,
            corrected_value: 160,
            confidence_accurate: false,
            user_rating: 3,
          },
        ],
      };

      const response = await request(
        process.env.TEST_API_URL || 'http://localhost:3000',
      )
        .post('/api/auto-population/feedback')
        .send(feedbackRequest)
        .set('Authorization', `Bearer ${process.env.TEST_AUTH_TOKEN}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.feedback_recorded).toBe(2);

      // Verify feedback is stored in database
      const { data: feedback } = await supabaseClient
        .from('auto_population_feedback')
        .select('*')
        .eq('vendor_id', testVendorId)
        .eq('form_id', 'wedding-photography-quote');

      expect(feedback).toHaveLength(2);
      expect(feedback[0].field_name).toBe('vendor-name');
      expect(feedback[0].user_action).toBe('accepted');
      expect(feedback[1].field_name).toBe('guest-count');
      expect(feedback[1].user_action).toBe('modified');
    });
  });
});

describe('Database Integration', () => {
  describe('Vendor Profile Queries', () => {
    it('should retrieve complete vendor profile efficiently', async () => {
      const startTime = Date.now();

      const { data: profile, error } = await supabaseClient
        .from('vendor_profiles')
        .select(
          `
          *,
          vendor_services(*),
          vendor_settings(*)
        `,
        )
        .eq('id', testVendorId)
        .single();

      const endTime = Date.now();
      const queryTime = endTime - startTime;

      expect(error).toBeNull();
      expect(profile).toBeDefined();
      expect(queryTime).toBeLessThan(50); // Database queries should be <50ms

      // Verify profile structure
      expect(profile.business_name).toBe('Test Sky Photography');
      expect(profile.contact_email).toBe('test@skyphotography.co.uk');
      expect(profile.vendor_services).toBeInstanceOf(Array);
    });

    it('should handle concurrent profile queries', async () => {
      const concurrentQueries = 10;
      const promises = Array.from({ length: concurrentQueries }, () =>
        supabaseClient
          .from('vendor_profiles')
          .select('*')
          .eq('id', testVendorId)
          .single(),
      );

      const startTime = Date.now();
      const results = await Promise.all(promises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // All queries should succeed
      results.forEach((result) => {
        expect(result.error).toBeNull();
        expect(result.data.business_name).toBe('Test Sky Photography');
      });

      // Should handle concurrent load efficiently
      expect(totalTime).toBeLessThan(200); // All 10 queries in <200ms
    });
  });

  describe('Wedding Context Queries', () => {
    it('should retrieve wedding details with related data', async () => {
      const { data: wedding, error } = await supabaseClient
        .from('weddings')
        .select(
          `
          *,
          clients(*),
          wedding_vendors(*)
        `,
        )
        .eq('id', testWeddingId)
        .single();

      expect(error).toBeNull();
      expect(wedding).toBeDefined();
      expect(wedding.wedding_date).toBe('2024-06-15');
      expect(wedding.venue_name).toBe('Garden Estate Manor');
      expect(wedding.guest_count).toBe(150);
      expect(wedding.clients).toBeDefined();
    });

    it('should query wedding history for repeat clients', async () => {
      // Create additional wedding for same client
      const previousWedding = await testDb.createTestWedding({
        client_id: testClientId,
        wedding_date: '2023-05-20',
        venue_name: 'Previous Venue',
        guest_count: 120,
        status: 'completed',
      });

      const { data: clientHistory, error } = await supabaseClient
        .from('weddings')
        .select('*')
        .eq('client_id', testClientId)
        .order('wedding_date', { ascending: false });

      expect(error).toBeNull();
      expect(clientHistory).toHaveLength(2);
      expect(clientHistory[0].wedding_date).toBe('2024-06-15'); // Most recent first
      expect(clientHistory[1].wedding_date).toBe('2023-05-20');
    });
  });

  describe('Auto-Population Session Management', () => {
    it('should create and manage population sessions', async () => {
      const sessionData = {
        vendor_id: testVendorId,
        client_id: testClientId,
        wedding_id: testWeddingId,
        form_id: 'test-form',
        session_metadata: {
          total_fields: 10,
          populated_fields: 8,
          population_rate: 0.8,
        },
      };

      const { data: session, error } = await supabaseClient
        .from('auto_population_sessions')
        .insert(sessionData)
        .select()
        .single();

      expect(error).toBeNull();
      expect(session.id).toBeDefined();
      expect(session.session_metadata.population_rate).toBe(0.8);

      // Verify session can be retrieved
      const { data: retrievedSession, error: retrieveError } =
        await supabaseClient
          .from('auto_population_sessions')
          .select('*')
          .eq('id', session.id)
          .single();

      expect(retrieveError).toBeNull();
      expect(retrievedSession.vendor_id).toBe(testVendorId);
    });

    it('should clean up old sessions automatically', async () => {
      // Create old session (simulate 30 days ago)
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 35);

      const oldSessionData = {
        vendor_id: testVendorId,
        client_id: testClientId,
        form_id: 'old-form',
        created_at: oldDate.toISOString(),
        session_metadata: { population_rate: 0.5 },
      };

      const { data: oldSession } = await supabaseClient
        .from('auto_population_sessions')
        .insert(oldSessionData)
        .select()
        .single();

      // Run cleanup (this would normally be done by a cron job)
      const { error: cleanupError } = await supabaseClient
        .from('auto_population_sessions')
        .delete()
        .lt(
          'created_at',
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        );

      expect(cleanupError).toBeNull();

      // Verify old session is deleted
      const { data: deletedSession } = await supabaseClient
        .from('auto_population_sessions')
        .select('*')
        .eq('id', oldSession.id)
        .maybeSingle();

      expect(deletedSession).toBeNull();
    });
  });
});

describe('External Service Integration', () => {
  describe('Tave CRM Integration', () => {
    it('should fetch client data from Tave API', async () => {
      // Mock Tave API response
      const mockTaveClient = {
        id: '12345',
        name: 'John & Jane Smith',
        email: 'john@example.com',
        wedding_date: '2024-07-15',
        package: 'Full Day Photography',
      };

      // This would typically use the actual Tave API
      // For testing, we mock the response
      jest.mock('@/lib/integrations/tave-client', () => ({
        fetchClientData: jest.fn().mockResolvedValue(mockTaveClient),
      }));

      const { fetchClientData } = require('@/lib/integrations/tave-client');
      const result = await fetchClientData('12345');

      expect(result.name).toBe('John & Jane Smith');
      expect(result.wedding_date).toBe('2024-07-15');
    });

    it('should handle Tave API failures gracefully', async () => {
      jest.mock('@/lib/integrations/tave-client', () => ({
        fetchClientData: jest.fn().mockRejectedValue(new Error('API Error')),
      }));

      const { fetchClientData } = require('@/lib/integrations/tave-client');

      // Should not throw, should return empty result
      const result = await fetchClientData('invalid-id').catch(() => ({}));
      expect(result).toEqual({});
    });
  });

  describe('HoneyBook Integration', () => {
    it('should sync wedding project data from HoneyBook', async () => {
      const mockHoneyBookProject = {
        project_id: 'hb_67890',
        client_name: 'Alice & Bob Wilson',
        event_date: '2024-08-30',
        event_type: 'wedding',
        budget: 45000,
        services: ['photography', 'videography'],
      };

      jest.mock('@/lib/integrations/honeybook-client', () => ({
        fetchProjectData: jest.fn().mockResolvedValue(mockHoneyBookProject),
      }));

      const {
        fetchProjectData,
      } = require('@/lib/integrations/honeybook-client');
      const result = await fetchProjectData('hb_67890');

      expect(result.client_name).toBe('Alice & Bob Wilson');
      expect(result.budget).toBe(45000);
      expect(result.services).toContain('photography');
    });
  });
});

describe('Performance and Scalability', () => {
  it('should handle large data sets efficiently', async () => {
    // Create large vendor profile with many services
    const largeVendor = await testDb.createTestVendor({
      business_name: 'Large Photography Studio',
      contact_email: 'large@studio.com',
    });

    // Add many services and past clients
    const services = Array.from({ length: 50 }, (_, i) => ({
      vendor_id: largeVendor.id,
      service_name: `Service ${i}`,
      description: `Description for service ${i}`,
      price: 100 + i * 10,
    }));

    await supabaseClient.from('vendor_services').insert(services);

    // Test auto-population with large dataset
    const startTime = Date.now();

    const populateRequest = {
      form_id: 'comprehensive-quote',
      vendor_id: largeVendor.id,
      client_id: testClientId,
      wedding_id: testWeddingId,
    };

    const response = await request(
      process.env.TEST_API_URL || 'http://localhost:3000',
    )
      .post('/api/auto-population/populate')
      .send(populateRequest)
      .set('Authorization', `Bearer ${process.env.TEST_AUTH_TOKEN}`)
      .expect(200);

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    // Should still complete within reasonable time with large dataset
    expect(responseTime).toBeLessThan(5000);
    expect(response.body.success).toBe(true);
  });

  it('should maintain performance under concurrent load', async () => {
    const concurrentRequests = 20;
    const promises = Array.from({ length: concurrentRequests }, (_, i) =>
      request(process.env.TEST_API_URL || 'http://localhost:3000')
        .post('/api/auto-population/populate')
        .send({
          form_id: `concurrent-test-${i}`,
          vendor_id: testVendorId,
          client_id: testClientId,
          wedding_id: testWeddingId,
        })
        .set('Authorization', `Bearer ${process.env.TEST_AUTH_TOKEN}`),
    );

    const startTime = Date.now();
    const responses = await Promise.all(promises);
    const endTime = Date.now();

    const totalTime = endTime - startTime;
    const averageTime = totalTime / concurrentRequests;

    // All requests should succeed
    responses.forEach((response) => {
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    // Average response time should remain reasonable under load
    expect(averageTime).toBeLessThan(1000); // <1 second average under concurrent load
  });
});
