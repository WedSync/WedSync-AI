/**
 * Email Template Generation API Integration Tests - WS-206
 *
 * Comprehensive integration tests for AI email template generation endpoint
 * Tests authentication, validation, security, and business logic
 *
 * Team B - Backend Implementation - 2025-01-20
 */

import {
  describe,
  it,
  expect,
  jest,
  beforeEach,
  afterEach,
} from '@jest/globals';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/ai/email-templates/generate/route';

// Mock dependencies
jest.mock('next-auth/next');
jest.mock('@/lib/supabase/server');
jest.mock('@/lib/ai/email-template-generator');

describe('/api/ai/email-templates/generate', () => {
  let mockGetServerSession: jest.MockedFunction<any>;
  let mockCreateClient: jest.MockedFunction<any>;
  let mockEmailTemplateGenerator: jest.MockedFunction<any>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock next-auth
    mockGetServerSession = jest.mocked(
      require('next-auth/next').getServerSession,
    );

    // Mock Supabase
    mockCreateClient = jest.mocked(
      require('@/lib/supabase/server').createClient,
    );
    const mockSupabaseClient = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
    };
    mockCreateClient.mockResolvedValue(mockSupabaseClient);

    // Mock EmailTemplateGenerator
    mockEmailTemplateGenerator = jest.mocked(
      require('@/lib/ai/email-template-generator').emailTemplateGenerator,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ====================================================================
  // AUTHENTICATION TESTS
  // ====================================================================

  describe('Authentication', () => {
    it('should reject requests without authentication', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest(
        'http://localhost:3000/api/ai/email-templates/generate',
        {
          method: 'POST',
          body: JSON.stringify({
            vendorType: 'photographer',
            stage: 'inquiry',
            tone: 'friendly',
            templateName: 'Test Template',
          }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('UNAUTHORIZED');
      expect(data.message).toContain('Authentication required');
    });

    it('should accept requests with valid authentication', async () => {
      // Mock authenticated session
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-123' },
      });

      // Mock user profile
      const mockSupabaseClient = await mockCreateClient();
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { supplier_id: 'supplier-123', organization_id: 'org-123' },
              error: null,
            }),
          }),
        }),
      });

      // Mock successful template generation
      mockEmailTemplateGenerator.generateTemplates.mockResolvedValue({
        success: true,
        templates: [
          {
            id: 'template-1',
            templateName: 'Test Template',
            subject: 'Test Subject',
            body: 'Test Body',
            mergeTagsUsed: ['{{client_name}}'],
            aiMetadata: {
              model: 'gpt-4',
              tokensUsed: { prompt: 100, completion: 100, total: 200 },
              generationTimeMs: 2500,
            },
          },
        ],
        mainTemplate: {
          id: 'template-1',
          templateName: 'Test Template',
          subject: 'Test Subject',
          body: 'Test Body',
          mergeTagsUsed: ['{{client_name}}'],
          aiMetadata: {
            model: 'gpt-4',
            tokensUsed: { prompt: 100, completion: 100, total: 200 },
            generationTimeMs: 2500,
          },
        },
        variants: [],
        totalTokensUsed: 200,
        totalGenerationTime: 2500,
      });

      const request = new NextRequest(
        'http://localhost:3000/api/ai/email-templates/generate',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vendorType: 'photographer',
            stage: 'inquiry',
            tone: 'friendly',
            templateName: 'Test Template',
          }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.templates).toBeDefined();
    });

    it('should reject users without supplier association', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-123' },
      });

      const mockSupabaseClient = await mockCreateClient();
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'No profile found' },
            }),
          }),
        }),
      });

      const request = new NextRequest(
        'http://localhost:3000/api/ai/email-templates/generate',
        {
          method: 'POST',
          body: JSON.stringify({
            vendorType: 'photographer',
            stage: 'inquiry',
            tone: 'friendly',
            templateName: 'Test Template',
          }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('FORBIDDEN');
      expect(data.message).toContain('wedding vendor account');
    });
  });

  // ====================================================================
  // INPUT VALIDATION TESTS
  // ====================================================================

  describe('Input Validation', () => {
    beforeEach(() => {
      // Mock authenticated user with supplier
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-123' },
      });

      const mockSupabaseClient = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  supplier_id: 'supplier-123',
                  organization_id: 'org-123',
                },
                error: null,
              }),
            }),
          }),
          insert: jest.fn().mockResolvedValue({ data: null, error: null }),
        }),
      };
      mockCreateClient.mockResolvedValue(mockSupabaseClient);
    });

    it('should validate required fields', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/ai/email-templates/generate',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            // Missing required fields
            vendorType: 'photographer',
          }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('VALIDATION_ERROR');
    });

    it('should reject invalid vendor types', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/ai/email-templates/generate',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vendorType: 'invalid-vendor',
            stage: 'inquiry',
            tone: 'friendly',
            templateName: 'Test Template',
          }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('VALIDATION_ERROR');
    });

    it('should reject invalid email stages', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/ai/email-templates/generate',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vendorType: 'photographer',
            stage: 'invalid-stage',
            tone: 'friendly',
            templateName: 'Test Template',
          }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('VALIDATION_ERROR');
    });

    it('should reject template names that are too short', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/ai/email-templates/generate',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vendorType: 'photographer',
            stage: 'inquiry',
            tone: 'friendly',
            templateName: 'ab', // Too short
          }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('VALIDATION_ERROR');
    });

    it('should reject too many variants', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/ai/email-templates/generate',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vendorType: 'photographer',
            stage: 'inquiry',
            tone: 'friendly',
            templateName: 'Test Template',
            variantCount: 10, // Too many
          }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('VALIDATION_ERROR');
    });

    it('should sanitize malicious input', async () => {
      mockEmailTemplateGenerator.generateTemplates.mockImplementation(
        (request) => {
          // Check that XSS attempts are sanitized
          expect(request.templateName).not.toContain('<script>');
          expect(request.customPrompt).not.toContain('<script>');

          return Promise.resolve({
            success: true,
            templates: [],
            mainTemplate: {} as any,
            variants: [],
            totalTokensUsed: 0,
            totalGenerationTime: 1000,
          });
        },
      );

      const request = new NextRequest(
        'http://localhost:3000/api/ai/email-templates/generate',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vendorType: 'photographer',
            stage: 'inquiry',
            tone: 'friendly',
            templateName: 'Clean Template Name',
            customPrompt: 'Make it friendly without any scripts',
          }),
        },
      );

      const response = await POST(request);
      expect(response.status).toBe(200);
    });
  });

  // ====================================================================
  // RATE LIMITING TESTS
  // ====================================================================

  describe('Rate Limiting', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-123' },
      });

      const mockSupabaseClient = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  supplier_id: 'supplier-123',
                  organization_id: 'org-123',
                },
                error: null,
              }),
            }),
          }),
          insert: jest.fn().mockResolvedValue({ data: null, error: null }),
        }),
      };
      mockCreateClient.mockResolvedValue(mockSupabaseClient);
    });

    it('should enforce rate limits', async () => {
      const validRequestBody = {
        vendorType: 'photographer',
        stage: 'inquiry',
        tone: 'friendly',
        templateName: 'Rate Limit Test',
      };

      // Mock successful generation for first few requests
      mockEmailTemplateGenerator.generateTemplates.mockResolvedValue({
        success: true,
        templates: [
          {
            id: 'test',
            templateName: 'Test',
            subject: 'Test',
            body: 'Test',
            mergeTagsUsed: [],
            aiMetadata: {
              model: 'gpt-4',
              tokensUsed: { total: 100 },
              generationTimeMs: 1000,
            },
          },
        ],
        mainTemplate: {
          id: 'test',
          templateName: 'Test',
          subject: 'Test',
          body: 'Test',
          mergeTagsUsed: [],
          aiMetadata: {
            model: 'gpt-4',
            tokensUsed: { total: 100 },
            generationTimeMs: 1000,
          },
        },
        variants: [],
        totalTokensUsed: 100,
        totalGenerationTime: 1000,
      });

      // Make multiple requests rapidly
      const requests = Array.from(
        { length: 12 },
        (_, i) =>
          new NextRequest(
            'http://localhost:3000/api/ai/email-templates/generate',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(validRequestBody),
            },
          ),
      );

      const responses = await Promise.all(requests.map((req) => POST(req)));

      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter((r) => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);

      const rateLimitedData = await rateLimitedResponses[0].json();
      expect(rateLimitedData.error).toBe('RATE_LIMITED');
      expect(rateLimitedData.resetTime).toBeDefined();
    });

    it('should include rate limit headers', async () => {
      mockEmailTemplateGenerator.generateTemplates.mockResolvedValue({
        success: true,
        templates: [
          {
            id: 'test',
            templateName: 'Test',
            subject: 'Test',
            body: 'Test',
            mergeTagsUsed: [],
            aiMetadata: {
              model: 'gpt-4',
              tokensUsed: { total: 100 },
              generationTimeMs: 1000,
            },
          },
        ],
        mainTemplate: {
          id: 'test',
          templateName: 'Test',
          subject: 'Test',
          body: 'Test',
          mergeTagsUsed: [],
          aiMetadata: {
            model: 'gpt-4',
            tokensUsed: { total: 100 },
            generationTimeMs: 1000,
          },
        },
        variants: [],
        totalTokensUsed: 100,
        totalGenerationTime: 1000,
      });

      const request = new NextRequest(
        'http://localhost:3000/api/ai/email-templates/generate',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vendorType: 'photographer',
            stage: 'inquiry',
            tone: 'friendly',
            templateName: 'Header Test',
          }),
        },
      );

      const response = await POST(request);

      expect(response.headers.get('X-RateLimit-Limit')).toBe('10');
      expect(response.headers.get('X-RateLimit-Remaining')).toBeDefined();
      expect(response.headers.get('X-RateLimit-Reset')).toBeDefined();
    });
  });

  // ====================================================================
  // SUCCESS SCENARIOS
  // ====================================================================

  describe('Successful Generation', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-123' },
      });

      const mockSupabaseClient = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  supplier_id: 'supplier-123',
                  organization_id: 'org-123',
                },
                error: null,
              }),
            }),
          }),
          insert: jest.fn().mockResolvedValue({ data: null, error: null }),
        }),
      };
      mockCreateClient.mockResolvedValue(mockSupabaseClient);
    });

    it('should generate templates successfully', async () => {
      const mockGenerationResult = {
        success: true,
        templates: [
          {
            id: 'template-main',
            templateName: 'Wedding Photography Inquiry',
            subject: 'Thank you for your photography inquiry!',
            body: 'Dear {{client_name}}, thank you for considering us for your wedding photography...',
            mergeTagsUsed: ['{{client_name}}', '{{wedding_date}}'],
            aiMetadata: {
              model: 'gpt-4',
              tokensUsed: { prompt: 150, completion: 200, total: 350 },
              generationTimeMs: 2500,
            },
          },
          {
            id: 'template-variant-b',
            templateName: 'Wedding Photography Inquiry',
            subject: 'Excited about your wedding photography!',
            body: 'Hi {{client_name}}! We would love to capture your special day...',
            mergeTagsUsed: ['{{client_name}}', '{{wedding_date}}'],
            variant: { label: 'B', performanceScore: 0 },
            aiMetadata: {
              model: 'gpt-4',
              tokensUsed: { prompt: 140, completion: 190, total: 330 },
              generationTimeMs: 2300,
            },
          },
        ],
        mainTemplate: {
          id: 'template-main',
          templateName: 'Wedding Photography Inquiry',
          subject: 'Thank you for your photography inquiry!',
          body: 'Dear {{client_name}}, thank you for considering us...',
          mergeTagsUsed: ['{{client_name}}', '{{wedding_date}}'],
          aiMetadata: {
            model: 'gpt-4',
            tokensUsed: { prompt: 150, completion: 200, total: 350 },
            generationTimeMs: 2500,
          },
        },
        variants: [
          {
            id: 'template-variant-b',
            templateName: 'Wedding Photography Inquiry',
            subject: 'Excited about your wedding photography!',
            body: 'Hi {{client_name}}! We would love to capture...',
            mergeTagsUsed: ['{{client_name}}', '{{wedding_date}}'],
            variant: { label: 'B', performanceScore: 0 },
            aiMetadata: {
              model: 'gpt-4',
              tokensUsed: { prompt: 140, completion: 190, total: 330 },
              generationTimeMs: 2300,
            },
          },
        ],
        totalTokensUsed: 680,
        totalGenerationTime: 4800,
      };

      mockEmailTemplateGenerator.generateTemplates.mockResolvedValue(
        mockGenerationResult,
      );

      const request = new NextRequest(
        'http://localhost:3000/api/ai/email-templates/generate',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vendorType: 'photographer',
            stage: 'inquiry',
            tone: 'friendly',
            templateName: 'Wedding Photography Inquiry',
            variantCount: 2,
            context: {
              businessName: 'Dreamscape Photography',
              specialization: 'Romantic wedding photography',
              location: 'Napa Valley, CA',
            },
          }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.templates).toHaveLength(2);
      expect(data.data.mainTemplate.subject).toContain('Thank you');
      expect(data.data.variants).toHaveLength(1);
      expect(data.data.performance.totalTokensUsed).toBe(680);
      expect(data.data.performance.estimatedCost).toBeGreaterThan(0);
      expect(data.timestamp).toBeDefined();
      expect(data.requestId).toBeDefined();
    });

    it('should handle context data properly', async () => {
      mockEmailTemplateGenerator.generateTemplates.mockImplementation(
        (request) => {
          expect(request.context?.businessName).toBe('Elite Wedding Venue');
          expect(request.context?.keyServices).toContain('Full bar service');
          expect(request.context?.location).toBe('Tuscany, Italy');

          return Promise.resolve({
            success: true,
            templates: [
              {
                id: 'test',
                templateName: 'Test',
                subject: 'Test',
                body: 'Test',
                mergeTagsUsed: [],
                aiMetadata: {
                  model: 'gpt-4',
                  tokensUsed: { total: 100 },
                  generationTimeMs: 1000,
                },
              },
            ],
            mainTemplate: {
              id: 'test',
              templateName: 'Test',
              subject: 'Test',
              body: 'Test',
              mergeTagsUsed: [],
              aiMetadata: {
                model: 'gpt-4',
                tokensUsed: { total: 100 },
                generationTimeMs: 1000,
              },
            },
            variants: [],
            totalTokensUsed: 100,
            totalGenerationTime: 1000,
          });
        },
      );

      const request = new NextRequest(
        'http://localhost:3000/api/ai/email-templates/generate',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vendorType: 'venue',
            stage: 'booking',
            tone: 'formal',
            templateName: 'Venue Booking Confirmation',
            context: {
              businessName: 'Elite Wedding Venue',
              keyServices: [
                'Event coordination',
                'Full bar service',
                'Catering kitchen',
              ],
              location: 'Tuscany, Italy',
              uniqueSellingPoints: [
                'Historic villa',
                'Panoramic vineyard views',
              ],
            },
          }),
        },
      );

      const response = await POST(request);
      expect(response.status).toBe(200);
    });
  });

  // ====================================================================
  // ERROR HANDLING TESTS
  // ====================================================================

  describe('Error Handling', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-123' },
      });

      const mockSupabaseClient = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  supplier_id: 'supplier-123',
                  organization_id: 'org-123',
                },
                error: null,
              }),
            }),
          }),
          insert: jest.fn().mockResolvedValue({ data: null, error: null }),
        }),
      };
      mockCreateClient.mockResolvedValue(mockSupabaseClient);
    });

    it('should handle AI generation failures', async () => {
      mockEmailTemplateGenerator.generateTemplates.mockResolvedValue({
        success: false,
        error: 'OpenAI API rate limit exceeded',
        templates: [],
        mainTemplate: {} as any,
        variants: [],
        totalTokensUsed: 0,
        totalGenerationTime: 1000,
      });

      const request = new NextRequest(
        'http://localhost:3000/api/ai/email-templates/generate',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vendorType: 'photographer',
            stage: 'inquiry',
            tone: 'friendly',
            templateName: 'Test Template',
          }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('GENERATION_FAILED');
      expect(data.message).toContain('Failed to generate');
    });

    it('should handle unexpected errors gracefully', async () => {
      mockEmailTemplateGenerator.generateTemplates.mockRejectedValue(
        new Error('Unexpected error occurred'),
      );

      const request = new NextRequest(
        'http://localhost:3000/api/ai/email-templates/generate',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vendorType: 'photographer',
            stage: 'inquiry',
            tone: 'friendly',
            templateName: 'Test Template',
          }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('INTERNAL_ERROR');
      expect(data.requestId).toBeDefined();
    });

    it('should handle malformed JSON requests', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/ai/email-templates/generate',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: 'invalid json {',
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('INVALID_JSON');
    });
  });

  // ====================================================================
  // AUDIT LOGGING TESTS
  // ====================================================================

  describe('Audit Logging', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-123' },
      });

      const mockSupabaseClient = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  supplier_id: 'supplier-123',
                  organization_id: 'org-123',
                },
                error: null,
              }),
            }),
          }),
          insert: jest.fn().mockResolvedValue({ data: null, error: null }),
        }),
      };
      mockCreateClient.mockResolvedValue(mockSupabaseClient);
    });

    it('should log successful generation requests', async () => {
      mockEmailTemplateGenerator.generateTemplates.mockResolvedValue({
        success: true,
        templates: [
          {
            id: 'test',
            templateName: 'Test',
            subject: 'Test',
            body: 'Test',
            mergeTagsUsed: [],
            aiMetadata: {
              model: 'gpt-4',
              tokensUsed: { total: 200 },
              generationTimeMs: 1000,
            },
          },
        ],
        mainTemplate: {
          id: 'test',
          templateName: 'Test',
          subject: 'Test',
          body: 'Test',
          mergeTagsUsed: [],
          aiMetadata: {
            model: 'gpt-4',
            tokensUsed: { total: 200 },
            generationTimeMs: 1000,
          },
        },
        variants: [],
        totalTokensUsed: 200,
        totalGenerationTime: 1000,
      });

      const mockSupabaseClient = await mockCreateClient();
      const mockInsert = jest
        .fn()
        .mockResolvedValue({ data: null, error: null });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'ai_generation_requests') {
          return { insert: mockInsert };
        }
        return mockSupabaseClient.from();
      });

      const request = new NextRequest(
        'http://localhost:3000/api/ai/email-templates/generate',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vendorType: 'photographer',
            stage: 'inquiry',
            tone: 'friendly',
            templateName: 'Test Template',
          }),
        },
      );

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          supplier_id: 'supplier-123',
          user_id: 'user-123',
          request_type: 'generate_template',
          vendor_type: 'photographer',
          stage: 'inquiry',
          tone: 'friendly',
          status: 'completed',
        }),
      );
    });

    it('should log failed generation requests', async () => {
      mockEmailTemplateGenerator.generateTemplates.mockResolvedValue({
        success: false,
        error: 'Generation failed',
        templates: [],
        mainTemplate: {} as any,
        variants: [],
        totalTokensUsed: 0,
        totalGenerationTime: 500,
      });

      const mockSupabaseClient = await mockCreateClient();
      const mockInsert = jest
        .fn()
        .mockResolvedValue({ data: null, error: null });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'ai_generation_requests') {
          return { insert: mockInsert };
        }
        return mockSupabaseClient.from();
      });

      const request = new NextRequest(
        'http://localhost:3000/api/ai/email-templates/generate',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vendorType: 'photographer',
            stage: 'inquiry',
            tone: 'friendly',
            templateName: 'Test Template',
          }),
        },
      );

      await POST(request);

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'failed',
          error_message: 'Generation failed',
        }),
      );
    });
  });
});
