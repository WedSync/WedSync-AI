/**
 * API Integration Test Suite
 * WS-192 Team B - Backend/API Focus
 * 
 * Comprehensive testing of all API endpoints with authentication, authorization,
 * and wedding industry business logic validation
 */

// Jest globals are available without import
import request from 'supertest';
import { createTestContext, TestContext } from './setup';
import { SupplierFactory, CoupleFactory } from '../factories';
import { DataValidator } from './helpers/data-validation';

// Mock Next.js app for API testing
// In a real implementation, this would import the actual Next.js app
const app = 'http://localhost:3000'; // Placeholder

describe('WS-192 API Integration Test Suite', () => {
  let testContext: TestContext;
  let apiRequest: request.SuperTest<request.Test>;
  let authToken: string;

  beforeEach(async () => {
    testContext = await createTestContext('api-integration');
    apiRequest = request(app);
    
    // Setup authentication for protected endpoints
    authToken = await setupAuthentication();
  });

  afterEach(async () => {
    await testContext.cleanup();
  });

  describe('Authentication & Authorization', () => {
    test('should authenticate user with valid credentials', async () => {
      const response = await apiRequest
        .post('/api/auth/signin')
        .send({
          email: `photographer-${testContext.testId}@test.com`,
          password: 'testpassword123'
        })
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('session');
      expect(response.body.user.email).toContain(testContext.testId);
    });

    test('should reject invalid credentials', async () => {
      const response = await apiRequest
        .post('/api/auth/signin')
        .send({
          email: 'invalid@test.com',
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body.error).toMatch(/invalid.*credentials/i);
    });

    test('should require authentication for protected endpoints', async () => {
      // Test without authorization header
      await apiRequest
        .get('/api/forms')
        .expect(401);

      // Test with valid authorization
      await apiRequest
        .get('/api/forms')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });

    test('should enforce organization-level access control', async () => {
      // Create data in different organization
      const otherOrgData = await createDataInDifferentOrganization();
      
      // Try to access other organization's data
      const response = await apiRequest
        .get(`/api/forms/${otherOrgData.formId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(response.body.error).toMatch(/access.*denied/i);
    });
  });

  describe('Forms API', () => {
    test('should create a new booking form with valid data', async () => {
      const formData = {
        name: 'Photography Booking Form',
        description: 'Book our wedding photography services',
        configuration: {
          fields: [
            { type: 'text', name: 'first_name', label: 'First Name', required: true },
            { type: 'text', name: 'last_name', label: 'Last Name', required: true },
            { type: 'email', name: 'email', label: 'Email', required: true },
            { type: 'date', name: 'wedding_date', label: 'Wedding Date', required: true }
          ]
        }
      };

      const response = await apiRequest
        .post('/api/forms')
        .set('Authorization', `Bearer ${authToken}`)
        .send(formData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(formData.name);
      expect(response.body.organization_id).toBe(testContext.organizationId);
      expect(response.body.configuration.fields).toHaveLength(4);
    });

    test('should validate form configuration schema', async () => {
      const invalidFormData = {
        name: 'Invalid Form',
        configuration: {
          fields: [
            { type: 'invalid_type', name: 'bad_field' } // Missing required properties
          ]
        }
      };

      const response = await apiRequest
        .post('/api/forms')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidFormData)
        .expect(400);

      expect(response.body.error).toMatch(/validation.*failed/i);
      expect(response.body.details).toContain('required');
    });

    test('should retrieve forms with pagination', async () => {
      // Create multiple forms
      await createMultipleForms(5);

      const response = await apiRequest
        .get('/api/forms?page=1&limit=3')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(3);
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination.total).toBeGreaterThanOrEqual(5);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(3);
    });

    test('should update form configuration', async () => {
      const form = await createTestForm();
      
      const updateData = {
        name: 'Updated Form Name',
        configuration: {
          ...form.configuration,
          fields: [
            ...form.configuration.fields,
            { type: 'number', name: 'guest_count', label: 'Guest Count', required: true }
          ]
        }
      };

      const response = await apiRequest
        .put(`/api/forms/${form.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.name).toBe(updateData.name);
      expect(response.body.configuration.fields).toHaveLength(form.configuration.fields.length + 1);
    });

    test('should delete form and cascade to submissions', async () => {
      const form = await createTestForm();
      const submission = await createTestSubmission(form.id);

      // Delete form
      await apiRequest
        .delete(`/api/forms/${form.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);

      // Verify form is deleted
      await apiRequest
        .get(`/api/forms/${form.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      // Verify submissions are also deleted (cascading)
      const submissionCheck = await testContext.database.query(
        'SELECT * FROM submissions WHERE form_id = $1',
        [form.id]
      );
      expect(submissionCheck.rows).toHaveLength(0);
    });
  });

  describe('Submissions API', () => {
    test('should accept form submission with valid data', async () => {
      const form = await createTestForm();
      const submissionData = {
        first_name: 'John',
        last_name: 'Smith',
        email: `couple-${testContext.testId}@test.com`,
        wedding_date: '2025-06-15',
        guest_count: 150,
        message: 'We are excited to work with you!'
      };

      const response = await apiRequest
        .post(`/api/forms/${form.id}/submit`)
        .send(submissionData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.form_id).toBe(form.id);
      expect(response.body.data).toMatchObject(submissionData);
      expect(response.body.status).toBe('submitted');
    });

    test('should validate required fields in submission', async () => {
      const form = await createTestForm();
      const invalidSubmission = {
        first_name: 'John',
        // Missing required last_name, email, wedding_date
      };

      const response = await apiRequest
        .post(`/api/forms/${form.id}/submit`)
        .send(invalidSubmission)
        .expect(400);

      expect(response.body.error).toMatch(/validation.*failed/i);
      expect(response.body.missing_fields).toContain('last_name');
      expect(response.body.missing_fields).toContain('email');
      expect(response.body.missing_fields).toContain('wedding_date');
    });

    test('should validate email format in submissions', async () => {
      const form = await createTestForm();
      const invalidSubmission = {
        first_name: 'John',
        last_name: 'Smith',
        email: 'invalid-email-format',
        wedding_date: '2025-06-15'
      };

      const response = await apiRequest
        .post(`/api/forms/${form.id}/submit`)
        .send(invalidSubmission)
        .expect(400);

      expect(response.body.error).toMatch(/invalid.*email/i);
    });

    test('should validate wedding date is in future', async () => {
      const form = await createTestForm();
      const invalidSubmission = {
        first_name: 'John',
        last_name: 'Smith',
        email: `test-${testContext.testId}@test.com`,
        wedding_date: '2020-01-01' // Past date
      };

      const response = await apiRequest
        .post(`/api/forms/${form.id}/submit`)
        .send(invalidSubmission)
        .expect(400);

      expect(response.body.error).toMatch(/wedding.*date.*future/i);
    });

    test('should retrieve submissions with filtering and sorting', async () => {
      const form = await createTestForm();
      await createMultipleSubmissions(form.id, 10);

      // Test filtering by status
      const filteredResponse = await apiRequest
        .get(`/api/forms/${form.id}/submissions?status=submitted&limit=5`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(filteredResponse.body.data).toHaveLength(5);
      filteredResponse.body.data.forEach((submission: any) => {
        expect(submission.status).toBe('submitted');
      });

      // Test sorting by date
      const sortedResponse = await apiRequest
        .get(`/api/forms/${form.id}/submissions?sort=created_at&order=desc`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(sortedResponse.body.data[0].created_at).toBeDefined();
    });
  });

  describe('Clients API', () => {
    test('should create client from form submission', async () => {
      const form = await createTestForm();
      const submissionData = {
        first_name: 'Jane',
        last_name: 'Doe',
        email: `client-${testContext.testId}@test.com`,
        wedding_date: '2025-08-20',
        guest_count: 120
      };

      // Submit form
      const submissionResponse = await apiRequest
        .post(`/api/forms/${form.id}/submit`)
        .send(submissionData)
        .expect(201);

      // Convert submission to client
      const clientResponse = await apiRequest
        .post(`/api/submissions/${submissionResponse.body.id}/convert-to-client`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      expect(clientResponse.body).toHaveProperty('id');
      expect(clientResponse.body.first_name).toBe(submissionData.first_name);
      expect(clientResponse.body.email).toBe(submissionData.email);
      expect(clientResponse.body.wedding_date).toBe(submissionData.wedding_date);
      expect(clientResponse.body.organization_id).toBe(testContext.organizationId);
    });

    test('should update client information', async () => {
      const client = await createTestClient();
      
      const updateData = {
        wedding_date: '2025-07-10',
        guest_count: 180,
        venue: 'Updated Venue Name'
      };

      const response = await apiRequest
        .put(`/api/clients/${client.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.wedding_date).toBe(updateData.wedding_date);
      expect(response.body.guest_count).toBe(updateData.guest_count);
      expect(response.body.venue).toBe(updateData.venue);
    });

    test('should retrieve client with related data', async () => {
      const client = await createTestClient();
      const form = await createTestForm();
      await createTestSubmission(form.id, {
        first_name: client.first_name,
        last_name: client.last_name,
        email: client.email
      });

      const response = await apiRequest
        .get(`/api/clients/${client.id}?include=submissions,forms`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('submissions');
      expect(response.body).toHaveProperty('forms');
      expect(response.body.submissions).toBeInstanceOf(Array);
    });
  });

  describe('Journey Automation API', () => {
    test('should create customer journey with steps', async () => {
      const journeyData = {
        name: 'Wedding Photography Journey',
        description: 'Automated follow-up for wedding photography clients',
        trigger_conditions: {
          type: 'form_submission',
          form_id: 'test-form-id'
        },
        steps: [
          {
            id: 'step1',
            name: 'Welcome Email',
            type: 'email',
            delay_hours: 0,
            content: {
              subject: 'Thank you for your inquiry!',
              body: 'We are excited to potentially be part of your special day.'
            }
          },
          {
            id: 'step2',
            name: 'Follow-up Call',
            type: 'task',
            delay_hours: 24,
            content: {
              body: 'Schedule consultation call with couple'
            }
          }
        ]
      };

      const response = await apiRequest
        .post('/api/journeys')
        .set('Authorization', `Bearer ${authToken}`)
        .send(journeyData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(journeyData.name);
      expect(response.body.steps).toHaveLength(2);
      expect(response.body.organization_id).toBe(testContext.organizationId);
    });

    test('should trigger journey on form submission', async () => {
      const form = await createTestForm();
      const journey = await createTestJourney(form.id);
      
      // Submit form (should trigger journey)
      const submissionResponse = await apiRequest
        .post(`/api/forms/${form.id}/submit`)
        .send({
          first_name: 'John',
          last_name: 'Smith',
          email: `test-${testContext.testId}@test.com`,
          wedding_date: '2025-06-15'
        })
        .expect(201);

      // Check that journey was triggered
      const journeyExecutionResponse = await apiRequest
        .get(`/api/journeys/${journey.id}/executions`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(journeyExecutionResponse.body.data).toHaveLength(1);
      expect(journeyExecutionResponse.body.data[0].trigger_submission_id).toBe(submissionResponse.body.id);
    });
  });

  describe('Analytics API', () => {
    test('should return form performance metrics', async () => {
      const form = await createTestForm();
      await createMultipleSubmissions(form.id, 20);

      const response = await apiRequest
        .get(`/api/analytics/forms/${form.id}/performance`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('total_submissions');
      expect(response.body).toHaveProperty('conversion_rate');
      expect(response.body).toHaveProperty('submission_trend');
      expect(response.body.total_submissions).toBe(20);
    });

    test('should return client acquisition metrics', async () => {
      await createMultipleClients(15);

      const response = await apiRequest
        .get('/api/analytics/clients/acquisition')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('total_clients');
      expect(response.body).toHaveProperty('new_clients_this_month');
      expect(response.body).toHaveProperty('client_sources');
      expect(response.body.total_clients).toBe(15);
    });
  });

  describe('Error Handling', () => {
    test('should handle database connection errors gracefully', async () => {
      // Mock database error by using invalid query
      const response = await apiRequest
        .get('/api/forms?invalid_param=true')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);

      expect(response.body.error).toMatch(/server.*error/i);
      expect(response.body).toHaveProperty('request_id');
    });

    test('should handle rate limiting', async () => {
      // Make multiple rapid requests to test rate limiting
      const requests = Array.from({ length: 10 }, () =>
        apiRequest
          .post('/api/forms/test-form-id/submit')
          .send({ test: 'data' })
      );

      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    test('should validate content-type for JSON endpoints', async () => {
      const response = await apiRequest
        .post('/api/forms')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'text/plain')
        .send('invalid data')
        .expect(415);

      expect(response.body.error).toMatch(/content.*type/i);
    });
  });

  describe('Wedding Industry Business Logic', () => {
    test('should enforce wedding date constraints', async () => {
      const client = await createTestClient();
      
      // Try to update with past date
      const response = await apiRequest
        .put(`/api/clients/${client.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          wedding_date: '2020-01-01' // Past date
        })
        .expect(400);

      expect(response.body.error).toMatch(/wedding.*date.*past/i);
    });

    test('should validate guest count ranges', async () => {
      const form = await createTestForm();
      
      // Test negative guest count
      const negativeResponse = await apiRequest
        .post(`/api/forms/${form.id}/submit`)
        .send({
          first_name: 'Test',
          last_name: 'User',
          email: `test-${testContext.testId}@test.com`,
          wedding_date: '2025-06-15',
          guest_count: -10
        })
        .expect(400);

      expect(negativeResponse.body.error).toMatch(/guest.*count.*positive/i);

      // Test unreasonably high guest count
      const highResponse = await apiRequest
        .post(`/api/forms/${form.id}/submit`)
        .send({
          first_name: 'Test',
          last_name: 'User',
          email: `test-${testContext.testId}@test.com`,
          wedding_date: '2025-06-15',
          guest_count: 10000
        })
        .expect(400);

      expect(highResponse.body.error).toMatch(/guest.*count.*reasonable/i);
    });

    test('should validate budget constraints', async () => {
      const client = await createTestClient();
      
      // Try to update with negative budget
      const response = await apiRequest
        .put(`/api/clients/${client.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          budget: -1000
        })
        .expect(400);

      expect(response.body.error).toMatch(/budget.*positive/i);
    });
  });

  // Helper functions for test setup and data creation
  async function setupAuthentication(): Promise<string> {
    // Create test user and return auth token
    const user = await SupplierFactory.createPhotographer({
      organizationId: testContext.organizationId,
      testId: testContext.testId,
      realisticData: false,
      includeOptionalFields: false,
      generateIds: true
    });

    // Mock authentication token
    return `test-token-${testContext.testId}`;
  }

  async function createTestForm(): Promise<any> {
    return await testContext.database.query(
      `INSERT INTO forms (
        id, organization_id, name, description, configuration, status, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, 'Test Form', 'Test Description',
        $2, 'active', NOW(), NOW()
      ) RETURNING *`,
      [
        testContext.organizationId,
        JSON.stringify({
          fields: [
            { type: 'text', name: 'first_name', label: 'First Name', required: true },
            { type: 'text', name: 'last_name', label: 'Last Name', required: true },
            { type: 'email', name: 'email', label: 'Email', required: true },
            { type: 'date', name: 'wedding_date', label: 'Wedding Date', required: true }
          ]
        })
      ]
    ).then(result => result.rows[0]);
  }

  async function createTestSubmission(formId: string, data?: any): Promise<any> {
    const submissionData = data || {
      first_name: 'John',
      last_name: 'Smith',
      email: `test-${testContext.testId}@test.com`,
      wedding_date: '2025-06-15'
    };

    return await testContext.database.query(
      `INSERT INTO submissions (
        id, form_id, data, status, submitted_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, 'submitted', NOW(), NOW(), NOW()
      ) RETURNING *`,
      [formId, JSON.stringify(submissionData)]
    ).then(result => result.rows[0]);
  }

  async function createTestClient(): Promise<any> {
    const client = await CoupleFactory.createCouple({
      organizationId: testContext.organizationId,
      testId: testContext.testId,
      realisticData: false,
      includeOptionalFields: false,
      generateIds: true
    });

    return await testContext.database.query(
      `INSERT INTO clients (
        id, organization_id, first_name, last_name, email, 
        wedding_date, guest_count, budget, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW(), NOW()
      ) RETURNING *`,
      [
        testContext.organizationId,
        client.first_name,
        client.last_name,
        client.email,
        client.wedding_date,
        client.guest_count,
        client.budget
      ]
    ).then(result => result.rows[0]);
  }

  async function createTestJourney(formId: string): Promise<any> {
    return await testContext.database.query(
      `INSERT INTO journeys (
        id, organization_id, name, description, trigger_conditions, 
        steps, status, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, 'Test Journey', 'Test Journey Description',
        $2, $3, 'active', NOW(), NOW()
      ) RETURNING *`,
      [
        testContext.organizationId,
        JSON.stringify({ type: 'form_submission', form_id: formId }),
        JSON.stringify([
          { id: 'step1', name: 'Welcome Email', type: 'email', delay_hours: 0 }
        ])
      ]
    ).then(result => result.rows[0]);
  }

  async function createMultipleForms(count: number): Promise<any[]> {
    const forms = [];
    for (let i = 0; i < count; i++) {
      const form = await createTestForm();
      forms.push(form);
    }
    return forms;
  }

  async function createMultipleSubmissions(formId: string, count: number): Promise<any[]> {
    const submissions = [];
    for (let i = 0; i < count; i++) {
      const submission = await createTestSubmission(formId, {
        first_name: `Test${i}`,
        last_name: `User${i}`,
        email: `test${i}-${testContext.testId}@test.com`,
        wedding_date: '2025-06-15'
      });
      submissions.push(submission);
    }
    return submissions;
  }

  async function createMultipleClients(count: number): Promise<any[]> {
    const clients = [];
    for (let i = 0; i < count; i++) {
      const client = await createTestClient();
      clients.push(client);
    }
    return clients;
  }

  async function createDataInDifferentOrganization(): Promise<any> {
    // Create different organization for testing access control
    const orgResult = await testContext.database.query(
      `INSERT INTO organizations (
        id, name, slug, business_type, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), 'Other Test Org', 'other-test-org', 'photographer', NOW(), NOW()
      ) RETURNING id`
    );

    const otherOrgId = orgResult.rows[0].id;

    // Create form in different organization
    const formResult = await testContext.database.query(
      `INSERT INTO forms (
        id, organization_id, name, description, configuration, status, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, 'Other Org Form', 'Test Description',
        '{"fields":[]}', 'active', NOW(), NOW()
      ) RETURNING id`,
      [otherOrgId]
    );

    return {
      organizationId: otherOrgId,
      formId: formResult.rows[0].id
    };
  }
});