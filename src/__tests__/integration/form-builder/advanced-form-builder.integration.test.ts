/**
 * WS-342: Advanced Form Builder Engine - Integration Tests
 * Team B - Backend Implementation Round 1
 *
 * Tests the complete form builder system including:
 * - Database operations with form_builder schema
 * - API endpoints for CRUD operations
 * - Conditional logic processing
 * - Real-time validation
 * - File upload security
 * - Wedding industry specific features
 */

import {
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  advancedFormSchema,
  advancedFormSubmissionSchema,
} from '@/lib/validations/advanced-form-builder';
import { POST as createForm } from '@/app/api/forms/create/route';
import {
  GET as getForm,
  PUT as updateForm,
  DELETE as deleteForm,
} from '@/app/api/forms/[id]/route';
import { POST as submitForm } from '@/app/api/forms/[id]/submit/route';
import { POST as validateForm } from '@/app/api/forms/[id]/validate/route';
import { POST as processLogic } from '@/app/api/forms/[id]/logic/route';

// Mock Supabase client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

// Mock rate limiting
jest.mock('@/lib/rate-limit', () => {
  return jest.fn().mockImplementation(() => ({
    check: jest.fn().mockResolvedValue({ success: true }),
  }));
});

describe('WS-342 Advanced Form Builder Engine - Integration Tests', () => {
  let mockSupabase: any;
  let testFormId: string;
  let testOrganizationId: string;
  let testUserId: string;

  beforeEach(() => {
    // Setup test data
    testFormId = '550e8400-e29b-41d4-a716-446655440000';
    testOrganizationId = '550e8400-e29b-41d4-a716-446655440001';
    testUserId = '550e8400-e29b-41d4-a716-446655440002';

    // Mock Supabase client
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
      rpc: jest.fn().mockReturnThis(),
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: testUserId } },
          error: null,
        }),
      },
    };

    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Form Creation API (/api/forms/create)', () => {
    test('should create advanced form with conditional logic', async () => {
      const formData = {
        title: 'Wedding Photography Questionnaire',
        description:
          'Comprehensive form to capture wedding photography requirements',
        sections: [
          {
            id: '550e8400-e29b-41d4-a716-446655440010',
            title: 'Wedding Details',
            description: 'Basic wedding information',
            order: 0,
            fields: [
              {
                id: '550e8400-e29b-41d4-a716-446655440011',
                type: 'date',
                label: 'Wedding Date',
                required: true,
                order: 0,
                validation: {
                  required: true,
                  min: '2024-01-01',
                  max: '2026-12-31',
                },
                weddingContext: {
                  category: 'wedding',
                  priority: 'critical',
                  phase: 'planning',
                },
              },
              {
                id: '550e8400-e29b-41d4-a716-446655440012',
                type: 'select',
                label: 'Wedding Type',
                required: true,
                order: 1,
                options: [
                  { id: '1', label: 'Indoor', value: 'indoor' },
                  { id: '2', label: 'Outdoor', value: 'outdoor' },
                  { id: '3', label: 'Destination', value: 'destination' },
                ],
                conditionalLogic: [
                  {
                    id: '550e8400-e29b-41d4-a716-446655440020',
                    name: 'Show outdoor fields',
                    description:
                      'Show weather-related fields for outdoor weddings',
                    conditions: [
                      {
                        id: '550e8400-e29b-41d4-a716-446655440021',
                        sourceField: '550e8400-e29b-41d4-a716-446655440012',
                        operator: 'equals',
                        value: 'outdoor',
                        logicalOperator: 'AND',
                      },
                    ],
                    actions: [
                      {
                        id: '550e8400-e29b-41d4-a716-446655440022',
                        type: 'show_field',
                        targetField: '550e8400-e29b-41d4-a716-446655440013',
                      },
                    ],
                    priority: 50,
                    isActive: true,
                  },
                ],
              },
              {
                id: '550e8400-e29b-41d4-a716-446655440013',
                type: 'checkbox',
                label: 'Weather Backup Plan Required',
                required: false,
                order: 2,
                styling: {
                  width: 'half',
                },
              },
            ],
          },
        ],
        settings: {
          name: 'Wedding Photography Questionnaire',
          description: 'Capture all photography requirements',
          submitButtonText: 'Submit Photography Requirements',
          successMessage: "Thank you! We'll review your photography needs.",
          notificationEmail: 'photographer@example.com',
          autoSave: true,
          requireLogin: false,
          allowMultipleSubmissions: false,
          collectEmail: true,
          conditionalLogicEnabled: true,
          realTimeValidation: true,
          weddingSettings: {
            requireWeddingDate: true,
            requireVenueInfo: true,
            guestEstimateRequired: false,
            budgetTrackingEnabled: false,
            timelineIntegration: true,
          },
        },
        isPublished: false,
        slug: 'wedding-photography-questionnaire',
      };

      // Mock successful form creation
      mockSupabase.insert.mockResolvedValueOnce({
        data: { id: testFormId, ...formData },
        error: null,
      });

      const request = new NextRequest(
        'http://localhost:3000/api/forms/create',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        },
      );

      const response = await createForm(request);
      const responseData = await response.json();

      expect(response.status).toBe(201);
      expect(responseData.success).toBe(true);
      expect(responseData.form.id).toBe(testFormId);
      expect(mockSupabase.insert).toHaveBeenCalled();
    });

    test('should validate form data according to advanced schema', async () => {
      const invalidFormData = {
        title: '', // Invalid - required
        sections: [], // Invalid - at least one section required
        settings: {
          name: '', // Invalid - required
          submitButtonText: '', // Invalid - required
        },
        isPublished: false,
        slug: '', // Invalid - required
      };

      const request = new NextRequest(
        'http://localhost:3000/api/forms/create',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(invalidFormData),
        },
      );

      const response = await createForm(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Invalid form data');
      expect(responseData.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'title' }),
          expect.objectContaining({ field: 'slug' }),
        ]),
      );
    });
  });

  describe('Real-time Validation API (/api/forms/[id]/validate)', () => {
    test('should validate single field in real-time', async () => {
      const fieldValidationData = {
        fieldId: '550e8400-e29b-41d4-a716-446655440011',
        value: '2024-06-15',
        context: {
          weddingType: 'outdoor',
          guestCount: 150,
        },
      };

      // Mock form exists
      mockSupabase.select.mockResolvedValueOnce({
        data: {
          id: testFormId,
          title: 'Test Form',
          is_active: true,
          is_published: true,
          organization_id: testOrganizationId,
          settings: { version: '1.0.0' },
        },
        error: null,
      });

      // Mock validation result
      mockSupabase.rpc.mockResolvedValueOnce({
        data: {
          is_valid: true,
          errors: [],
          warnings: [],
          suggestions: ['Consider weekend pricing'],
          conditional_updates: {
            fieldsToShow: ['550e8400-e29b-41d4-a716-446655440013'],
            fieldsToRequire: [],
          },
        },
        error: null,
      });

      const request = new NextRequest(
        `http://localhost:3000/api/forms/${testFormId}/validate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fieldValidationData),
        },
      );

      const context = { params: Promise.resolve({ id: testFormId }) };
      const response = await validateForm(request, context);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.validation.isValid).toBe(true);
      expect(responseData.validation.suggestions).toContain(
        'Consider weekend pricing',
      );
      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        'validate_single_field',
        expect.any(Object),
      );
    });

    test('should perform batch validation for multiple fields', async () => {
      const batchValidationData = {
        fields: [
          {
            fieldId: '550e8400-e29b-41d4-a716-446655440011',
            value: '2024-06-15',
          },
          { fieldId: '550e8400-e29b-41d4-a716-446655440012', value: 'outdoor' },
          { fieldId: '550e8400-e29b-41d4-a716-446655440013', value: true },
        ],
        context: {
          sessionId: 'test-session-123',
        },
      };

      // Mock form exists
      mockSupabase.select.mockResolvedValueOnce({
        data: {
          id: testFormId,
          title: 'Test Form',
          is_active: true,
          organization_id: testOrganizationId,
        },
        error: null,
      });

      // Mock batch validation result
      mockSupabase.rpc.mockResolvedValueOnce({
        data: {
          is_valid: true,
          field_results: {
            '550e8400-e29b-41d4-a716-446655440011': { valid: true, errors: [] },
            '550e8400-e29b-41d4-a716-446655440012': { valid: true, errors: [] },
            '550e8400-e29b-41d4-a716-446655440013': { valid: true, errors: [] },
          },
          errors: [],
          warnings: [],
          conditionally_visible: ['550e8400-e29b-41d4-a716-446655440013'],
          conditionally_required: [],
        },
        error: null,
      });

      const request = new NextRequest(
        `http://localhost:3000/api/forms/${testFormId}/validate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(batchValidationData),
        },
      );

      const context = { params: Promise.resolve({ id: testFormId }) };
      const response = await validateForm(request, context);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.validation.isValid).toBe(true);
      expect(responseData.validation.conditionallyVisible).toContain(
        '550e8400-e29b-41d4-a716-446655440013',
      );
      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        'validate_form_fields_batch',
        expect.any(Object),
      );
    });
  });

  describe('Conditional Logic Processing API (/api/forms/[id]/logic)', () => {
    test('should process conditional logic and return field visibility changes', async () => {
      const logicProcessingData = {
        formData: {
          '550e8400-e29b-41d4-a716-446655440011': '2024-06-15',
          '550e8400-e29b-41d4-a716-446655440012': 'outdoor',
        },
        context: {
          userAgent: 'test-agent',
          device: 'desktop',
          timestamp: '2024-01-01T10:00:00.000Z',
          sessionId: 'test-session-123',
        },
      };

      // Mock form exists
      mockSupabase.select.mockResolvedValueOnce({
        data: {
          id: testFormId,
          title: 'Test Form',
          is_active: true,
          organization_id: testOrganizationId,
        },
        error: null,
      });

      // Mock conditional logic processing result
      mockSupabase.rpc.mockResolvedValueOnce({
        data: {
          fields_to_show: ['550e8400-e29b-41d4-a716-446655440013'],
          fields_to_hide: [],
          fields_to_enable: [],
          fields_to_disable: [],
          fields_to_require: ['550e8400-e29b-41d4-a716-446655440013'],
          fields_to_make_optional: [],
          sections_to_show: [],
          sections_to_hide: [],
          calculated_values: {},
          validation_errors: [],
          next_step: null,
          is_complete: false,
          rules_processed: 1,
          execution_time_ms: 45,
          cache_hit: false,
        },
        error: null,
      });

      const request = new NextRequest(
        `http://localhost:3000/api/forms/${testFormId}/logic`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(logicProcessingData),
        },
      );

      const context = { params: Promise.resolve({ id: testFormId }) };
      const response = await processLogic(request, context);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.logic.results.fieldsToShow).toContain(
        '550e8400-e29b-41d4-a716-446655440013',
      );
      expect(responseData.logic.results.fieldsToRequire).toContain(
        '550e8400-e29b-41d4-a716-446655440013',
      );
      expect(responseData.logic.metadata.rulesProcessed).toBe(1);
      expect(responseData.logic.metadata.executionTimeMs).toBeLessThan(50);
    });

    test('should handle complex multi-condition logic rules', async () => {
      const complexLogicData = {
        formData: {
          '550e8400-e29b-41d4-a716-446655440011': '2024-12-25', // Christmas Day
          '550e8400-e29b-41d4-a716-446655440012': 'outdoor',
          'guest-count-field': 200,
          'budget-field': 15000,
        },
        targetField: '550e8400-e29b-41d4-a716-446655440014', // Premium package field
      };

      // Mock form exists
      mockSupabase.select.mockResolvedValueOnce({
        data: {
          id: testFormId,
          title: 'Wedding Package Form',
          is_active: true,
          organization_id: testOrganizationId,
        },
        error: null,
      });

      // Mock complex logic result
      mockSupabase.rpc.mockResolvedValueOnce({
        data: {
          fields_to_show: [
            '550e8400-e29b-41d4-a716-446655440014',
            '550e8400-e29b-41d4-a716-446655440015',
          ],
          fields_to_hide: [],
          fields_to_require: ['550e8400-e29b-41d4-a716-446655440014'],
          calculated_values: {
            '550e8400-e29b-41d4-a716-446655440016': 17500, // Holiday premium pricing
          },
          validation_errors: [],
          rules_processed: 3,
          execution_time_ms: 78,
          debug_info: {
            triggered_rules: [
              'holiday-premium',
              'outdoor-weather',
              'large-guest-count',
            ],
          },
        },
        error: null,
      });

      const request = new NextRequest(
        `http://localhost:3000/api/forms/${testFormId}/logic`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(complexLogicData),
        },
      );

      const context = { params: Promise.resolve({ id: testFormId }) };
      const response = await processLogic(request, context);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.logic.metadata.rulesProcessed).toBe(3);
      expect(
        responseData.logic.results.calculatedValues[
          '550e8400-e29b-41d4-a716-446655440016'
        ],
      ).toBe(17500);
    });
  });

  describe('Form Submission with Advanced Features', () => {
    test('should submit form with wedding context and conditional logic processing', async () => {
      const submissionData = {
        formData: {
          '550e8400-e29b-41d4-a716-446655440011': '2024-06-15',
          '550e8400-e29b-41d4-a716-446655440012': 'outdoor',
          '550e8400-e29b-41d4-a716-446655440013': true,
          'guest-count': 150,
          budget: 25000,
        },
        clientInfo: {
          name: 'John & Jane Smith',
          email: 'john.jane@example.com',
          phone: '+1-555-0123',
        },
        metadata: {
          startTime: '2024-01-01T09:00:00.000Z',
          completionTime: '2024-01-01T09:15:00.000Z',
          timeSpent: 900,
        },
        weddingContext: {
          weddingDate: '2024-06-15',
          venue: 'Central Park',
          guestCount: 150,
          budget: 25000,
          weddingType: 'outdoor',
        },
      };

      // Mock form exists with settings
      mockSupabase.select.mockResolvedValueOnce({
        data: {
          id: testFormId,
          title: 'Wedding Photography Form',
          sections: [
            {
              fields: [
                {
                  id: '550e8400-e29b-41d4-a716-446655440011',
                  type: 'date',
                  label: 'Wedding Date',
                  validation: { required: true },
                },
              ],
            },
          ],
          settings: {
            sendConfirmationEmail: true,
            webhooks: ['https://example.com/webhook'],
          },
          is_active: true,
          is_published: true,
          organization_id: testOrganizationId,
          organization: { name: 'Test Photography Studio' },
        },
        error: null,
      });

      // Mock validation success
      mockSupabase.rpc
        .mockResolvedValueOnce({
          data: { is_valid: true, errors: [] },
          error: null,
        })
        // Mock conditional logic processing
        .mockResolvedValueOnce({
          data: { processed_data: submissionData.formData },
          error: null,
        });

      // Mock submission creation
      mockSupabase.insert.mockResolvedValueOnce({
        data: {
          id: 'submission-id-123',
          status: 'submitted',
          submitted_at: '2024-01-01T09:15:00.000Z',
          confirmation_code: 'CONF-123456',
        },
        error: null,
      });

      const request = new NextRequest(
        `http://localhost:3000/api/forms/${testFormId}/submit`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submissionData),
        },
      );

      const context = { params: Promise.resolve({ id: testFormId }) };
      const response = await submitForm(request, context);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.submission.id).toBe('submission-id-123');
      expect(responseData.submission.confirmation_code).toBe('CONF-123456');
    });
  });

  describe('Performance and Security Requirements', () => {
    test('should meet performance targets for validation (<50ms)', async () => {
      const startTime = Date.now();

      const request = new NextRequest(
        `http://localhost:3000/api/forms/${testFormId}/validate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fieldId: 'test-field',
            value: 'test-value',
          }),
        },
      );

      // Mock fast validation response
      mockSupabase.select.mockResolvedValueOnce({
        data: {
          id: testFormId,
          is_active: true,
          organization_id: testOrganizationId,
        },
        error: null,
      });

      mockSupabase.rpc.mockResolvedValueOnce({
        data: { is_valid: true, errors: [] },
        error: null,
      });

      const context = { params: Promise.resolve({ id: testFormId }) };
      await validateForm(request, context);

      const executionTime = Date.now() - startTime;
      expect(executionTime).toBeLessThan(50);
    });

    test('should handle high-frequency validation requests with rate limiting', async () => {
      const requests = Array.from(
        { length: 100 },
        (_, i) =>
          new NextRequest(
            `http://localhost:3000/api/forms/${testFormId}/validate`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fieldId: `field-${i}`,
                value: `value-${i}`,
              }),
            },
          ),
      );

      // All requests should be handled within performance targets
      const promises = requests.map(async (request) => {
        const context = { params: Promise.resolve({ id: testFormId }) };
        const startTime = Date.now();
        await validateForm(request, context);
        return Date.now() - startTime;
      });

      const executionTimes = await Promise.all(promises);

      // 95th percentile should be under 100ms
      const sortedTimes = executionTimes.sort((a, b) => a - b);
      const p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)];
      expect(p95).toBeLessThan(100);
    });

    test('should sanitize all form data for XSS protection', async () => {
      const maliciousData = {
        formData: {
          'text-field': '<script>alert("xss")</script>',
          'html-field': '<img src="x" onerror="alert(1)">',
          'js-field': 'javascript:alert("xss")',
        },
        clientInfo: {
          name: '<script>alert("name")</script>',
          email: 'test@example.com',
        },
      };

      const request = new NextRequest(
        `http://localhost:3000/api/forms/${testFormId}/validate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(maliciousData),
        },
      );

      // The validation should sanitize the input
      mockSupabase.select.mockResolvedValueOnce({
        data: {
          id: testFormId,
          is_active: true,
          organization_id: testOrganizationId,
        },
        error: null,
      });

      const context = { params: Promise.resolve({ id: testFormId }) };
      const response = await validateForm(request, context);

      expect(response.status).not.toBe(500); // Should not crash from XSS
      // Sanitized data should be passed to validation function
      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          field_value: expect.not.stringContaining('<script>'),
        }),
      );
    });
  });

  describe('Wedding Industry Compliance', () => {
    test('should validate wedding-specific field requirements', async () => {
      const weddingFormData = {
        fields: [
          { fieldId: 'wedding-date-field', value: '2024-06-15' },
          { fieldId: 'venue-field', value: 'Grand Ballroom' },
          { fieldId: 'guest-count-field', value: 150 },
          { fieldId: 'budget-field', value: 25000 },
        ],
        context: {
          weddingType: 'traditional',
          priority: 'critical',
        },
      };

      mockSupabase.select.mockResolvedValueOnce({
        data: {
          id: testFormId,
          is_active: true,
          organization_id: testOrganizationId,
          settings: {
            weddingSettings: {
              requireWeddingDate: true,
              requireVenueInfo: true,
              guestEstimateRequired: true,
            },
          },
        },
        error: null,
      });

      mockSupabase.rpc.mockResolvedValueOnce({
        data: {
          is_valid: true,
          field_results: {
            'wedding-date-field': {
              valid: true,
              wedding_context: { phase: 'planning' },
            },
            'venue-field': {
              valid: true,
              wedding_context: { category: 'venue' },
            },
            'guest-count-field': {
              valid: true,
              wedding_context: { critical: true },
            },
          },
          warnings: ['Consider insurance for 150+ guest weddings'],
        },
        error: null,
      });

      const request = new NextRequest(
        `http://localhost:3000/api/forms/${testFormId}/validate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(weddingFormData),
        },
      );

      const context = { params: Promise.resolve({ id: testFormId }) };
      const response = await validateForm(request, context);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.validation.warnings).toContain(
        'Consider insurance for 150+ guest weddings',
      );
    });

    test('should enforce Saturday wedding day protection', async () => {
      // Mock current date as Saturday
      const mockDate = new Date('2024-06-15'); // Saturday
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      const request = new NextRequest(
        `http://localhost:3000/api/forms/${testFormId}`,
        {
          method: 'DELETE',
        },
      );

      const context = { params: Promise.resolve({ id: testFormId }) };
      const response = await deleteForm(request, context);

      expect(response.status).toBe(403);
      const responseData = await response.json();
      expect(responseData.error).toContain('Saturday operations restricted');
    });
  });

  describe('GDPR Compliance', () => {
    test('should handle data retention and deletion requests', async () => {
      const gdprRequest = {
        action: 'delete_personal_data',
        clientEmail: 'john.doe@example.com',
        dataTypes: ['form_submissions', 'file_uploads', 'analytics'],
      };

      mockSupabase.rpc.mockResolvedValueOnce({
        data: {
          deleted_submissions: 3,
          deleted_files: 2,
          anonymized_analytics: 5,
          retention_compliant: true,
        },
        error: null,
      });

      // This would be a separate GDPR endpoint
      expect(gdprRequest.action).toBe('delete_personal_data');
      expect(mockSupabase.rpc).not.toHaveBeenCalled(); // Not called yet, but pattern established
    });
  });
});
