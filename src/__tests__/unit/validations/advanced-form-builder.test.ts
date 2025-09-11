/**
 * WS-342: Advanced Form Builder Engine - Unit Tests for Validation Schemas
 * Team B - Backend Implementation Round 1
 *
 * Tests all Zod validation schemas for:
 * - Advanced form builder schemas
 * - Conditional logic validation
 * - Wedding industry specific validation
 * - Security and XSS protection
 * - Performance validation
 */

import { describe, test, expect } from '@jest/globals';
import { z } from 'zod';
import {
  advancedFormSchema,
  advancedFieldSchema,
  advancedFormSubmissionSchema,
  secureFileUploadSchema,
  formAnalyticsSchema,
  webhookDeliverySchema,
  advancedFieldTypes,
  logicOperators,
  logicActions,
  conditionalLogicRuleSchema,
} from '@/lib/validations/advanced-form-builder';

describe('WS-342 Advanced Form Builder - Validation Schema Unit Tests', () => {
  describe('Advanced Field Types', () => {
    test('should validate all supported field types', () => {
      const validFieldTypes = [
        'text',
        'email',
        'tel',
        'number',
        'textarea',
        'select',
        'radio',
        'checkbox',
        'date',
        'time',
        'datetime-local',
        'file',
        'signature',
        'heading',
        'paragraph',
        'divider',
        // Advanced types
        'multi-select',
        'rating',
        'slider',
        'color',
        'url',
        'password',
        'rich-text',
        'address',
        'payment',
        'table',
        'repeater',
        'image-upload',
        'video-upload',
        'audio-upload',
        'document-upload',
        'calendar-booking',
        'location-picker',
        'guest-list',
        'seating-chart',
        'budget-calculator',
        'timeline-builder',
        'vendor-selector',
      ];

      validFieldTypes.forEach((fieldType) => {
        const result = advancedFieldTypes.safeParse(fieldType);
        expect(result.success).toBe(true);
      });
    });

    test('should reject invalid field types', () => {
      const invalidTypes = ['invalid-type', 'script', 'iframe', 'embed'];

      invalidTypes.forEach((fieldType) => {
        const result = advancedFieldTypes.safeParse(fieldType);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Advanced Field Schema', () => {
    test('should validate complete advanced field with all properties', () => {
      const validField = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        type: 'text',
        label: 'Wedding Date',
        placeholder: 'Select your wedding date',
        helperText: 'Choose a date at least 6 months in advance',
        required: true,
        order: 1,
        validation: {
          required: true,
          minLength: 1,
          maxLength: 50,
          pattern: '^[a-zA-Z0-9\\s]+$',
          errorMessage: 'Please enter a valid date',
          dateRange: {
            min: '2024-01-01',
            max: '2026-12-31',
          },
          crossFieldValidation: [
            {
              fieldId: '550e8400-e29b-41d4-a716-446655440001',
              operator: 'date_after',
              value: 'today',
            },
          ],
        },
        conditionalLogic: [
          {
            id: '550e8400-e29b-41d4-a716-446655440010',
            name: 'Show venue fields',
            description: 'Show venue-related fields when date is selected',
            conditions: [
              {
                id: '550e8400-e29b-41d4-a716-446655440011',
                sourceField: '550e8400-e29b-41d4-a716-446655440000',
                operator: 'is_not_empty',
                value: null,
                logicalOperator: 'AND',
              },
            ],
            actions: [
              {
                id: '550e8400-e29b-41d4-a716-446655440012',
                type: 'show_field',
                targetField: '550e8400-e29b-41d4-a716-446655440002',
                delay: 300,
                animation: 'fade',
              },
            ],
            priority: 50,
            isActive: true,
          },
        ],
        styling: {
          width: 'full',
          height: 'medium',
          cssClass: 'wedding-date-field',
          customCSS: '.wedding-date-field { border: 2px solid gold; }',
        },
        accessibility: {
          ariaLabel: 'Wedding date selection',
          ariaDescription: 'Select the date for your wedding ceremony',
          tabIndex: 1,
          role: 'datepicker',
        },
        weddingContext: {
          category: 'venue',
          priority: 'critical',
          phase: 'planning',
        },
        options: [
          {
            id: '550e8400-e29b-41d4-a716-446655440020',
            label: 'Option 1',
            value: 'value1',
          },
        ],
        width: 'full',
        defaultValue: '2024-06-15',
      };

      const result = advancedFieldSchema.safeParse(validField);

      if (!result.success) {
        console.error('Validation errors:', result.error.errors);
      }

      expect(result.success).toBe(true);
      expect(result.data?.weddingContext?.priority).toBe('critical');
      expect(result.data?.validation?.crossFieldValidation).toHaveLength(1);
    });

    test('should validate wedding industry specific field configurations', () => {
      const weddingSpecificFields = [
        {
          id: '550e8400-e29b-41d4-a716-446655440000',
          type: 'guest-list',
          label: 'Wedding Guest List',
          required: true,
          order: 1,
          weddingContext: {
            category: 'guest',
            priority: 'critical',
            phase: 'planning',
          },
          validation: {
            required: true,
            minFiles: 1,
            maxFiles: 1,
            allowedFileTypes: ['text/csv', 'application/vnd.ms-excel'],
          },
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          type: 'seating-chart',
          label: 'Reception Seating Chart',
          required: false,
          order: 2,
          weddingContext: {
            category: 'venue',
            priority: 'important',
            phase: 'confirmation',
          },
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440002',
          type: 'budget-calculator',
          label: 'Wedding Budget Breakdown',
          required: true,
          order: 3,
          weddingContext: {
            category: 'budget',
            priority: 'critical',
            phase: 'planning',
          },
          validation: {
            numberRange: {
              min: 1000,
              max: 1000000,
              step: 100,
            },
          },
        },
      ];

      weddingSpecificFields.forEach((field) => {
        const result = advancedFieldSchema.safeParse(field);
        expect(result.success).toBe(true);
        expect(result.data?.weddingContext).toBeDefined();
      });
    });

    test('should reject fields with invalid wedding context', () => {
      const invalidField = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        type: 'text',
        label: 'Test Field',
        required: false,
        order: 1,
        weddingContext: {
          category: 'invalid-category', // Invalid
          priority: 'ultra-critical', // Invalid
          phase: 'post-wedding', // Invalid
        },
      };

      const result = advancedFieldSchema.safeParse(invalidField);
      expect(result.success).toBe(false);
      expect(
        result.error?.errors.some((e) => e.path.includes('category')),
      ).toBe(true);
    });
  });

  describe('Conditional Logic Validation', () => {
    test('should validate all supported logic operators', () => {
      const validOperators = [
        'equals',
        'not_equals',
        'contains',
        'not_contains',
        'greater_than',
        'less_than',
        'greater_or_equal',
        'less_or_equal',
        'is_empty',
        'is_not_empty',
        'starts_with',
        'ends_with',
        'regex_match',
        'in_list',
        'not_in_list',
        'date_before',
        'date_after',
      ];

      validOperators.forEach((operator) => {
        const result = logicOperators.safeParse(operator);
        expect(result.success).toBe(true);
      });
    });

    test('should validate all supported logic actions', () => {
      const validActions = [
        'show_field',
        'hide_field',
        'enable_field',
        'disable_field',
        'make_required',
        'make_optional',
        'set_value',
        'clear_value',
        'show_section',
        'hide_section',
        'jump_to_step',
        'calculate_value',
        'trigger_webhook',
        'send_email',
        'update_database',
      ];

      validActions.forEach((action) => {
        const result = logicActions.safeParse(action);
        expect(result.success).toBe(true);
      });
    });

    test('should validate complex conditional logic rule', () => {
      const complexRule = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Outdoor Wedding Logic',
        description: 'Show weather-related fields for outdoor weddings',
        conditions: [
          {
            id: '550e8400-e29b-41d4-a716-446655440001',
            sourceField: '550e8400-e29b-41d4-a716-446655440010',
            operator: 'equals',
            value: 'outdoor',
            logicalOperator: 'AND',
          },
          {
            id: '550e8400-e29b-41d4-a716-446655440002',
            sourceField: '550e8400-e29b-41d4-a716-446655440011',
            operator: 'date_before',
            value: '2024-10-31',
            logicalOperator: 'AND',
          },
        ],
        actions: [
          {
            id: '550e8400-e29b-41d4-a716-446655440003',
            type: 'show_field',
            targetField: '550e8400-e29b-41d4-a716-446655440020',
            delay: 200,
            animation: 'fade',
          },
          {
            id: '550e8400-e29b-41d4-a716-446655440004',
            type: 'make_required',
            targetField: '550e8400-e29b-41d4-a716-446655440020',
          },
          {
            id: '550e8400-e29b-41d4-a716-446655440005',
            type: 'calculate_value',
            targetField: '550e8400-e29b-41d4-a716-446655440021',
            value: 'base_price * 1.2', // Weather contingency surcharge
          },
        ],
        priority: 75,
        isActive: true,
      };

      const result = conditionalLogicRuleSchema.safeParse(complexRule);

      if (!result.success) {
        console.error(
          'Conditional logic validation errors:',
          result.error.errors,
        );
      }

      expect(result.success).toBe(true);
      expect(result.data?.conditions).toHaveLength(2);
      expect(result.data?.actions).toHaveLength(3);
    });

    test('should reject invalid conditional logic configurations', () => {
      const invalidRule = {
        id: 'invalid-uuid', // Invalid UUID
        name: '', // Empty name
        conditions: [], // Empty conditions array
        actions: [], // Empty actions array
        priority: 150, // Out of range (1-100)
      };

      const result = conditionalLogicRuleSchema.safeParse(invalidRule);
      expect(result.success).toBe(false);
      expect(result.error?.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: ['id'] }),
          expect.objectContaining({ path: ['name'] }),
          expect.objectContaining({ path: ['conditions'] }),
          expect.objectContaining({ path: ['actions'] }),
          expect.objectContaining({ path: ['priority'] }),
        ]),
      );
    });
  });

  describe('Advanced Form Schema', () => {
    test('should validate complete advanced form with multi-step configuration', () => {
      const advancedForm = {
        title: 'Wedding Photography Questionnaire',
        description:
          'Comprehensive form to capture all wedding photography requirements',
        steps: [
          {
            id: '550e8400-e29b-41d4-a716-446655440100',
            title: 'Basic Wedding Information',
            description: 'Tell us about your wedding day',
            order: 1,
            sections: [
              {
                id: '550e8400-e29b-41d4-a716-446655440110',
                title: 'Wedding Details',
                description: 'Basic wedding information',
                fields: [
                  {
                    id: '550e8400-e29b-41d4-a716-446655440111',
                    type: 'date',
                    label: 'Wedding Date',
                    required: true,
                    order: 1,
                  },
                ],
                order: 1,
              },
            ],
            navigation: {
              allowPrevious: false,
              allowNext: true,
              requireCompletion: true,
              customNextButton: 'Continue to Photography Details',
            },
          },
          {
            id: '550e8400-e29b-41d4-a716-446655440200',
            title: 'Photography Requirements',
            description: 'Specific photography needs',
            order: 2,
            sections: [
              {
                id: '550e8400-e29b-41d4-a716-446655440210',
                title: 'Photo Preferences',
                description: 'Your photography style preferences',
                fields: [
                  {
                    id: '550e8400-e29b-41d4-a716-446655440211',
                    type: 'multi-select',
                    label: 'Photography Styles',
                    required: true,
                    order: 1,
                    options: [
                      { id: '1', label: 'Traditional', value: 'traditional' },
                      {
                        id: '2',
                        label: 'Photojournalistic',
                        value: 'photojournalistic',
                      },
                      { id: '3', label: 'Fine Art', value: 'fine-art' },
                    ],
                  },
                ],
                order: 1,
              },
            ],
          },
        ],
        settings: {
          name: 'Wedding Photography Questionnaire',
          description: 'Complete photography requirements form',
          submitButtonText: 'Submit Photography Requirements',
          successMessage: 'Thank you! We will review your requirements.',
          notificationEmail: 'photographer@example.com',
          autoSave: true,
          requireLogin: false,
          allowMultipleSubmissions: false,
          collectEmail: true,
          isMultiStep: true,
          progressIndicator: 'steps',
          saveProgress: true,
          conditionalLogicEnabled: true,
          realTimeValidation: true,
          autoSaveInterval: 30,
          honeypotProtection: true,
          rateLimitSubmissions: 5,
          requireCaptcha: false,
          weddingSettings: {
            requireWeddingDate: true,
            requireVenueInfo: true,
            guestEstimateRequired: true,
            budgetTrackingEnabled: false,
            timelineIntegration: true,
          },
          gdprCompliance: {
            enabled: true,
            consentText:
              'I consent to processing of my personal data for wedding planning purposes',
            dataRetentionDays: 1095,
            allowDataExport: true,
            allowDataDeletion: true,
          },
        },
        conditionalLogic: [
          {
            id: '550e8400-e29b-41d4-a716-446655440300',
            name: 'Show additional options',
            description: 'Show extra fields based on selections',
            conditions: [
              {
                id: '550e8400-e29b-41d4-a716-446655440301',
                sourceField: '550e8400-e29b-41d4-a716-446655440211',
                operator: 'contains',
                value: 'fine-art',
                logicalOperator: 'AND',
              },
            ],
            actions: [
              {
                id: '550e8400-e29b-41d4-a716-446655440302',
                type: 'show_section',
                targetSection: '550e8400-e29b-41d4-a716-446655440220',
              },
            ],
            priority: 50,
            isActive: true,
          },
        ],
        isPublished: false,
        slug: 'wedding-photography-questionnaire',
        metadata: {
          version: '2.1.0',
          tags: ['photography', 'wedding', 'client-intake'],
          category: 'client-intake',
          estimatedCompletionTime: 15,
          difficulty: 'intermediate',
        },
      };

      const result = advancedFormSchema.safeParse(advancedForm);

      if (!result.success) {
        console.error('Advanced form validation errors:', result.error.errors);
      }

      expect(result.success).toBe(true);
      expect(result.data?.steps).toHaveLength(2);
      expect(result.data?.settings.weddingSettings?.requireWeddingDate).toBe(
        true,
      );
      expect(result.data?.metadata?.estimatedCompletionTime).toBe(15);
    });

    test('should enforce form must have either sections or steps', () => {
      const invalidForm = {
        title: 'Test Form',
        // Missing both sections and steps
        settings: {
          name: 'Test Form',
          submitButtonText: 'Submit',
        },
        isPublished: false,
        slug: 'test-form',
      };

      const result = advancedFormSchema.safeParse(invalidForm);
      expect(result.success).toBe(false);
      expect(
        result.error?.errors.some((e) =>
          e.message.includes('sections or steps'),
        ),
      ).toBe(true);
    });
  });

  describe('Advanced Form Submission Schema', () => {
    test('should validate comprehensive form submission with wedding context', () => {
      const submission = {
        formId: '550e8400-e29b-41d4-a716-446655440000',
        stepId: '550e8400-e29b-41d4-a716-446655440100',
        data: {
          '550e8400-e29b-41d4-a716-446655440001': '2024-06-15',
          '550e8400-e29b-41d4-a716-446655440002': 'outdoor',
          '550e8400-e29b-41d4-a716-446655440003': [
            'traditional',
            'photojournalistic',
          ],
          '550e8400-e29b-41d4-a716-446655440004': 150,
          '550e8400-e29b-41d4-a716-446655440005': 25000.5,
        },
        metadata: {
          userAgent:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          ipAddress: '192.168.1.100',
          timestamp: '2024-01-01T10:00:00.000Z',
          sessionId: '550e8400-e29b-41d4-a716-446655440010',
          startTime: '2024-01-01T09:45:00.000Z',
          completionTime: '2024-01-01T10:00:00.000Z',
          timeSpentSeconds: 900,
          pageViews: 3,
          fieldsVisited: [
            '550e8400-e29b-41d4-a716-446655440001',
            '550e8400-e29b-41d4-a716-446655440002',
            '550e8400-e29b-41d4-a716-446655440003',
          ],
          validationErrors: 0,
          deviceInfo: {
            type: 'desktop',
            os: 'Windows',
            browser: 'Chrome',
            screenResolution: '1920x1080',
          },
          location: {
            country: 'US',
            timezone: 'America/New_York',
          },
        },
        weddingContext: {
          weddingDate: '2024-06-15',
          venue: 'Central Park Conservatory Garden',
          guestCount: 150,
          budget: 35000,
          weddingType: 'destination',
        },
      };

      const result = advancedFormSubmissionSchema.safeParse(submission);

      if (!result.success) {
        console.error('Submission validation errors:', result.error.errors);
      }

      expect(result.success).toBe(true);
      expect(result.data?.weddingContext?.weddingType).toBe('destination');
      expect(result.data?.metadata?.timeSpentSeconds).toBe(900);
    });

    test('should validate submission data limits', () => {
      // Test maximum field limit
      const manyFields: Record<string, any> = {};
      for (let i = 0; i < 501; i++) {
        // Over the 500 limit
        manyFields[
          `550e8400-e29b-41d4-a716-44665544${i.toString().padStart(4, '0')}`
        ] = `value-${i}`;
      }

      const oversizedSubmission = {
        formId: '550e8400-e29b-41d4-a716-446655440000',
        data: manyFields,
        metadata: {
          timestamp: '2024-01-01T10:00:00.000Z',
          completionTime: '2024-01-01T10:00:00.000Z',
        },
      };

      const result =
        advancedFormSubmissionSchema.safeParse(oversizedSubmission);
      expect(result.success).toBe(false);
      expect(
        result.error?.errors.some((e) => e.message.includes('Too many fields')),
      ).toBe(true);
    });
  });

  describe('Security File Upload Schema', () => {
    test('should validate secure file uploads with virus scanning', () => {
      const secureUpload = {
        file: {
          name: 'wedding-contract.pdf',
          size: 2 * 1024 * 1024, // 2MB
          type: 'application/pdf',
          lastModified: 1640995200000,
        },
        fieldId: '550e8400-e29b-41d4-a716-446655440000',
        formId: '550e8400-e29b-41d4-a716-446655440001',
        scanForViruses: true,
        quarantineIfSuspicious: true,
        allowExecutables: false,
        encryptFile: true,
      };

      const result = secureFileUploadSchema.safeParse(secureUpload);
      expect(result.success).toBe(true);
      expect(result.data?.scanForViruses).toBe(true);
    });

    test('should reject files with invalid names or sizes', () => {
      const invalidUploads = [
        {
          file: {
            name: 'invalid<script>.exe', // Invalid characters
            size: 1024,
            type: 'application/pdf',
          },
          fieldId: '550e8400-e29b-41d4-a716-446655440000',
          formId: '550e8400-e29b-41d4-a716-446655440001',
        },
        {
          file: {
            name: 'too-large-file.pdf',
            size: 200 * 1024 * 1024, // 200MB - over 100MB limit
            type: 'application/pdf',
          },
          fieldId: '550e8400-e29b-41d4-a716-446655440000',
          formId: '550e8400-e29b-41d4-a716-446655440001',
        },
        {
          file: {
            name: 'malicious-file.exe',
            size: 1024,
            type: 'application/x-executable', // Invalid type
          },
          fieldId: '550e8400-e29b-41d4-a716-446655440000',
          formId: '550e8400-e29b-41d4-a716-446655440001',
        },
      ];

      invalidUploads.forEach((upload, index) => {
        const result = secureFileUploadSchema.safeParse(upload);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Performance and Analytics Validation', () => {
    test('should validate form analytics data structure', () => {
      const analyticsData = {
        formId: '550e8400-e29b-41d4-a716-446655440000',
        period: 'week',
        metrics: {
          views: 1250,
          starts: 980,
          completions: 756,
          conversionRate: 77.1,
          averageCompletionTime: 847.5,
          dropoffRate: 22.9,
          fieldAnalytics: [
            {
              fieldId: '550e8400-e29b-41d4-a716-446655440001',
              interactions: 980,
              completionRate: 95.8,
              averageTime: 45.2,
              errorRate: 2.1,
            },
            {
              fieldId: '550e8400-e29b-41d4-a716-446655440002',
              interactions: 940,
              completionRate: 89.4,
              averageTime: 78.6,
              errorRate: 8.9,
            },
          ],
        },
      };

      const result = formAnalyticsSchema.safeParse(analyticsData);
      expect(result.success).toBe(true);
      expect(result.data?.metrics.conversionRate).toBe(77.1);
    });

    test('should validate webhook delivery configuration', () => {
      const webhookConfig = {
        formId: '550e8400-e29b-41d4-a716-446655440000',
        submissionId: '550e8400-e29b-41d4-a716-446655440001',
        webhookUrl: 'https://api.example.com/webhook/forms',
        payload: {
          formTitle: 'Wedding Photography Form',
          submissionData: { weddingDate: '2024-06-15' },
          clientEmail: 'client@example.com',
        },
        headers: {
          Authorization: 'Bearer token123',
          'Content-Type': 'application/json',
        },
        retryCount: 0,
        maxRetries: 3,
        status: 'pending',
      };

      const result = webhookDeliverySchema.safeParse(webhookConfig);
      expect(result.success).toBe(true);
      expect(result.data?.maxRetries).toBe(3);
    });
  });

  describe('XSS Protection and Security', () => {
    test('should handle potential XSS in field labels and descriptions', () => {
      // The actual XSS sanitization happens in the API layer,
      // but we can test that the schema accepts string inputs
      const fieldWithPotentialXSS = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        type: 'text',
        label: 'Name <script>alert("xss")</script>',
        helperText: 'Enter your <img src="x" onerror="alert(1)"> name',
        required: true,
        order: 1,
      };

      // Schema should accept the string (sanitization happens at API level)
      const result = advancedFieldSchema.safeParse(fieldWithPotentialXSS);
      expect(result.success).toBe(true);
    });

    test('should validate field length limits to prevent DoS attacks', () => {
      const oversizedField = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        type: 'text',
        label: 'A'.repeat(201), // Over 200 char limit
        helperText: 'B'.repeat(501), // Over 500 char limit
        required: true,
        order: 1,
      };

      const result = advancedFieldSchema.safeParse(oversizedField);
      expect(result.success).toBe(false);
    });
  });

  describe('Wedding Industry Edge Cases', () => {
    test('should validate special wedding date constraints', () => {
      const weddingDateField = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        type: 'date',
        label: 'Wedding Date',
        required: true,
        order: 1,
        validation: {
          required: true,
          dateRange: {
            min: '2024-01-01',
            max: '2026-12-31',
          },
          crossFieldValidation: [
            {
              fieldId: '550e8400-e29b-41d4-a716-446655440001', // Engagement date field
              operator: 'date_after',
              value: 'engagement_date',
            },
          ],
        },
        weddingContext: {
          category: 'venue',
          priority: 'critical',
          phase: 'planning',
        },
      };

      const result = advancedFieldSchema.safeParse(weddingDateField);
      expect(result.success).toBe(true);
      expect(result.data?.validation?.crossFieldValidation?.[0].operator).toBe(
        'date_after',
      );
    });

    test('should validate guest count constraints', () => {
      const guestCountField = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        type: 'number',
        label: 'Expected Guest Count',
        required: true,
        order: 1,
        validation: {
          required: true,
          numberRange: {
            min: 1,
            max: 1000,
            step: 1,
          },
        },
        weddingContext: {
          category: 'guest',
          priority: 'critical',
          phase: 'planning',
        },
      };

      const result = advancedFieldSchema.safeParse(guestCountField);
      expect(result.success).toBe(true);
      expect(result.data?.validation?.numberRange?.max).toBe(1000);
    });
  });
});
