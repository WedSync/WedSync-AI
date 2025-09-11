/**
 * EmailTemplateGenerator Test Suite - WS-206
 *
 * Comprehensive unit tests for AI email template generation service
 * Tests OpenAI integration, security, rate limiting, and business logic
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
import {
  EmailTemplateGenerator,
  EmailGeneratorRequestSchema,
  EmailGenerationError,
  RateLimitError,
  VendorTypes,
  EmailStages,
  EmailTones,
} from '@/lib/ai/email-template-generator';

// Mock dependencies
jest.mock('openai');
jest.mock('@supabase/supabase-js');
jest.mock('@/lib/services/openai-service');

describe('EmailTemplateGenerator', () => {
  let generator: EmailTemplateGenerator;
  let mockOpenAIService: jest.Mocked<any>;
  let mockSupabase: jest.Mocked<any>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock OpenAI service
    mockOpenAIService = {
      generateCompletion: jest.fn(),
    };

    // Mock Supabase
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      rpc: jest.fn().mockReturnThis(),
    };

    generator = new EmailTemplateGenerator();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ====================================================================
  // SCHEMA VALIDATION TESTS
  // ====================================================================

  describe('EmailGeneratorRequestSchema', () => {
    it('should validate valid request', () => {
      const validRequest = {
        supplierId: '123e4567-e89b-12d3-a456-426614174000',
        vendorType: 'photographer' as const,
        stage: 'inquiry' as const,
        tone: 'friendly' as const,
        templateName: 'Wedding Inquiry Response',
        variantCount: 3,
      };

      expect(() =>
        EmailGeneratorRequestSchema.parse(validRequest),
      ).not.toThrow();
    });

    it('should reject invalid vendor type', () => {
      const invalidRequest = {
        supplierId: '123e4567-e89b-12d3-a456-426614174000',
        vendorType: 'invalid-vendor',
        stage: 'inquiry' as const,
        tone: 'friendly' as const,
        templateName: 'Test Template',
      };

      expect(() => EmailGeneratorRequestSchema.parse(invalidRequest)).toThrow();
    });

    it('should reject invalid UUID', () => {
      const invalidRequest = {
        supplierId: 'invalid-uuid',
        vendorType: 'photographer' as const,
        stage: 'inquiry' as const,
        tone: 'friendly' as const,
        templateName: 'Test Template',
      };

      expect(() => EmailGeneratorRequestSchema.parse(invalidRequest)).toThrow();
    });

    it('should reject too short template name', () => {
      const invalidRequest = {
        supplierId: '123e4567-e89b-12d3-a456-426614174000',
        vendorType: 'photographer' as const,
        stage: 'inquiry' as const,
        tone: 'friendly' as const,
        templateName: 'ab', // Too short
      };

      expect(() => EmailGeneratorRequestSchema.parse(invalidRequest)).toThrow();
    });

    it('should reject too many variants', () => {
      const invalidRequest = {
        supplierId: '123e4567-e89b-12d3-a456-426614174000',
        vendorType: 'photographer' as const,
        stage: 'inquiry' as const,
        tone: 'friendly' as const,
        templateName: 'Test Template',
        variantCount: 15, // Too many
      };

      expect(() => EmailGeneratorRequestSchema.parse(invalidRequest)).toThrow();
    });
  });

  // ====================================================================
  // TEMPLATE GENERATION TESTS
  // ====================================================================

  describe('generateTemplates', () => {
    const validRequest = {
      supplierId: '123e4567-e89b-12d3-a456-426614174000',
      vendorType: 'photographer' as const,
      stage: 'inquiry' as const,
      tone: 'friendly' as const,
      templateName: 'Wedding Inquiry Response',
      variantCount: 3,
    };

    beforeEach(() => {
      // Mock successful OpenAI response
      mockOpenAIService.generateCompletion.mockResolvedValue({
        text: JSON.stringify({
          subject: 'Thank you for your wedding photography inquiry!',
          body: 'Dear {{client_name}},\n\nThank you for considering us for your special day on {{wedding_date}}...',
          reasoning: 'Professional yet warm response',
        }),
        model: 'gpt-4',
        usage: {
          prompt_tokens: 150,
          completion_tokens: 200,
          total_tokens: 350,
        },
      });

      // Mock successful database operations
      mockSupabase.from.mockReturnValue({
        insert: jest
          .fn()
          .mockResolvedValue({ data: { id: 'template-id' }, error: null }),
        select: jest.fn().mockReturnValue({
          single: jest
            .fn()
            .mockResolvedValue({ data: { id: 'template-id' }, error: null }),
        }),
      });
    });

    it('should generate templates successfully', async () => {
      const result = await generator.generateTemplates(validRequest);

      expect(result.success).toBe(true);
      expect(result.templates).toHaveLength(3); // Main + 2 variants
      expect(result.mainTemplate.subject).toContain('Thank you');
      expect(result.variants).toHaveLength(2);
      expect(result.totalTokensUsed).toBeGreaterThan(0);
    });

    it('should handle OpenAI API errors gracefully', async () => {
      mockOpenAIService.generateCompletion.mockRejectedValue(
        new Error('OpenAI API rate limit exceeded'),
      );

      const result = await generator.generateTemplates(validRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('OpenAI API rate limit exceeded');
      expect(result.templates).toHaveLength(0);
    });

    it('should extract merge tags correctly', async () => {
      mockOpenAIService.generateCompletion.mockResolvedValue({
        text: JSON.stringify({
          subject: 'Hello {{client_name}}!',
          body: 'Your wedding on {{wedding_date}} at {{venue_name}} will be amazing!',
        }),
        model: 'gpt-4',
        usage: {
          prompt_tokens: 100,
          completion_tokens: 100,
          total_tokens: 200,
        },
      });

      const result = await generator.generateTemplates(validRequest);

      expect(result.success).toBe(true);
      expect(result.mainTemplate.mergeTagsUsed).toContain('{{client_name}}');
      expect(result.mainTemplate.mergeTagsUsed).toContain('{{wedding_date}}');
      expect(result.mainTemplate.mergeTagsUsed).toContain('{{venue_name}}');
    });

    it('should apply rate limiting', async () => {
      // Simulate rate limit exceeded
      const rateLimitedGenerator = new EmailTemplateGenerator();

      // Make multiple rapid requests to trigger rate limit
      const promises = Array.from({ length: 15 }, () =>
        rateLimitedGenerator.generateTemplates(validRequest),
      );

      const results = await Promise.all(promises);
      const rateLimitedResults = results.filter(
        (r) => !r.success && r.error?.includes('rate limit'),
      );

      expect(rateLimitedResults.length).toBeGreaterThan(0);
    });

    it('should validate input and reject malicious content', async () => {
      const maliciousRequest = {
        ...validRequest,
        templateName: '<script>alert("xss")</script>',
      };

      expect(() =>
        EmailGeneratorRequestSchema.parse(maliciousRequest),
      ).toThrow(); // Should be caught by Zod validation
    });
  });

  // ====================================================================
  // VENDOR-SPECIFIC PROMPT TESTS
  // ====================================================================

  describe('Vendor-specific prompts', () => {
    it('should generate photographer-specific prompts', async () => {
      const photographerRequest = {
        supplierId: '123e4567-e89b-12d3-a456-426614174000',
        vendorType: 'photographer' as const,
        stage: 'inquiry' as const,
        tone: 'professional' as const,
        templateName: 'Photography Inquiry',
      };

      mockOpenAIService.generateCompletion.mockImplementation(
        (userPrompt, options) => {
          // Verify system prompt contains photographer-specific content
          expect(options.system_prompt).toContain('wedding photography');
          expect(options.system_prompt).toContain('lighting');
          expect(options.system_prompt).toContain('poses');

          return Promise.resolve({
            text: JSON.stringify({
              subject: 'Your Wedding Photography Inquiry',
              body: 'Thank you for your photography inquiry...',
            }),
            model: 'gpt-4',
            usage: {
              prompt_tokens: 100,
              completion_tokens: 100,
              total_tokens: 200,
            },
          });
        },
      );

      await generator.generateTemplates(photographerRequest);

      expect(mockOpenAIService.generateCompletion).toHaveBeenCalled();
    });

    it('should generate venue-specific prompts', async () => {
      const venueRequest = {
        supplierId: '123e4567-e89b-12d3-a456-426614174000',
        vendorType: 'venue' as const,
        stage: 'booking' as const,
        tone: 'formal' as const,
        templateName: 'Venue Booking Confirmation',
      };

      mockOpenAIService.generateCompletion.mockImplementation(
        (userPrompt, options) => {
          expect(options.system_prompt).toContain('wedding venues');
          expect(options.system_prompt).toContain('capacity');
          expect(options.system_prompt).toContain('catering restrictions');

          return Promise.resolve({
            text: JSON.stringify({
              subject: 'Venue Booking Confirmation',
              body: 'Your venue booking is confirmed...',
            }),
            model: 'gpt-4',
            usage: {
              prompt_tokens: 100,
              completion_tokens: 100,
              total_tokens: 200,
            },
          });
        },
      );

      await generator.generateTemplates(venueRequest);

      expect(mockOpenAIService.generateCompletion).toHaveBeenCalled();
    });
  });

  // ====================================================================
  // STAGE-SPECIFIC TESTS
  // ====================================================================

  describe('Stage-specific content', () => {
    it('should generate inquiry-specific content', async () => {
      const inquiryRequest = {
        supplierId: '123e4567-e89b-12d3-a456-426614174000',
        vendorType: 'florist' as const,
        stage: 'inquiry' as const,
        tone: 'warm' as const,
        templateName: 'Floral Inquiry Response',
      };

      mockOpenAIService.generateCompletion.mockImplementation(
        (userPrompt, options) => {
          expect(options.system_prompt).toContain('Initial response');
          expect(options.system_prompt).toContain('first impression');

          return Promise.resolve({
            text: JSON.stringify({
              subject: 'Thank you for your floral inquiry',
              body: 'We would love to discuss your wedding florals...',
            }),
            model: 'gpt-4',
            usage: {
              prompt_tokens: 100,
              completion_tokens: 100,
              total_tokens: 200,
            },
          });
        },
      );

      await generator.generateTemplates(inquiryRequest);
      expect(mockOpenAIService.generateCompletion).toHaveBeenCalled();
    });

    it('should generate final-stage content', async () => {
      const finalRequest = {
        supplierId: '123e4567-e89b-12d3-a456-426614174000',
        vendorType: 'caterer' as const,
        stage: 'final' as const,
        tone: 'professional' as const,
        templateName: 'Final Catering Details',
      };

      mockOpenAIService.generateCompletion.mockImplementation(
        (userPrompt, options) => {
          expect(options.system_prompt).toContain('Final details');
          expect(options.system_prompt).toContain('reassurance');

          return Promise.resolve({
            text: JSON.stringify({
              subject: 'Final catering arrangements for your wedding',
              body: 'Everything is set for your special day...',
            }),
            model: 'gpt-4',
            usage: {
              prompt_tokens: 100,
              completion_tokens: 100,
              total_tokens: 200,
            },
          });
        },
      );

      await generator.generateTemplates(finalRequest);
      expect(mockOpenAIService.generateCompletion).toHaveBeenCalled();
    });
  });

  // ====================================================================
  // TONE-SPECIFIC TESTS
  // ====================================================================

  describe('Tone adjustments', () => {
    it('should generate formal tone content', async () => {
      const formalRequest = {
        supplierId: '123e4567-e89b-12d3-a456-426614174000',
        vendorType: 'coordinator' as const,
        stage: 'planning' as const,
        tone: 'formal' as const,
        templateName: 'Planning Update',
      };

      mockOpenAIService.generateCompletion.mockImplementation(
        (userPrompt, options) => {
          expect(options.system_prompt).toContain(
            'Professional, respectful, and traditional',
          );
          expect(options.system_prompt).toContain('proper titles');

          return Promise.resolve({
            text: JSON.stringify({
              subject: 'Wedding Planning Update',
              body: 'Dear Mr. and Mrs. Smith, We are writing to update you...',
            }),
            model: 'gpt-4',
            usage: {
              prompt_tokens: 100,
              completion_tokens: 100,
              total_tokens: 200,
            },
          });
        },
      );

      await generator.generateTemplates(formalRequest);
      expect(mockOpenAIService.generateCompletion).toHaveBeenCalled();
    });

    it('should generate enthusiastic tone content', async () => {
      const enthusiasticRequest = {
        supplierId: '123e4567-e89b-12d3-a456-426614174000',
        vendorType: 'dj' as const,
        stage: 'booking' as const,
        tone: 'enthusiastic' as const,
        templateName: 'DJ Booking Confirmation',
      };

      mockOpenAIService.generateCompletion.mockImplementation(
        (userPrompt, options) => {
          expect(options.system_prompt).toContain(
            'Excited, energetic, and passionate',
          );
          expect(options.system_prompt).toContain('genuine excitement');

          return Promise.resolve({
            text: JSON.stringify({
              subject: "YES! We're officially your wedding DJ!",
              body: 'We are absolutely thrilled to be part of your special day!',
            }),
            model: 'gpt-4',
            usage: {
              prompt_tokens: 100,
              completion_tokens: 100,
              total_tokens: 200,
            },
          });
        },
      );

      await generator.generateTemplates(enthusiasticRequest);
      expect(mockOpenAIService.generateCompletion).toHaveBeenCalled();
    });
  });

  // ====================================================================
  // CONTEXT AND PERSONALIZATION TESTS
  // ====================================================================

  describe('Context integration', () => {
    it('should incorporate business context', async () => {
      const contextRequest = {
        supplierId: '123e4567-e89b-12d3-a456-426614174000',
        vendorType: 'baker' as const,
        stage: 'inquiry' as const,
        tone: 'friendly' as const,
        templateName: 'Custom Cake Inquiry',
        context: {
          businessName: 'Sweet Dreams Bakery',
          specialization: 'Custom wedding cakes and desserts',
          keyServices: ['Wedding cakes', 'Cupcake towers', 'Dessert tables'],
          uniqueSellingPoints: ['Organic ingredients', 'Gluten-free options'],
          location: 'Portland, Oregon',
        },
      };

      mockOpenAIService.generateCompletion.mockImplementation((userPrompt) => {
        expect(userPrompt).toContain('Sweet Dreams Bakery');
        expect(userPrompt).toContain('Custom wedding cakes');
        expect(userPrompt).toContain('Portland, Oregon');

        return Promise.resolve({
          text: JSON.stringify({
            subject: 'Sweet Dreams Bakery - Your Wedding Cake Inquiry',
            body: 'Thank you for considering Sweet Dreams Bakery for your wedding cake...',
          }),
          model: 'gpt-4',
          usage: {
            prompt_tokens: 150,
            completion_tokens: 150,
            total_tokens: 300,
          },
        });
      });

      await generator.generateTemplates(contextRequest);
      expect(mockOpenAIService.generateCompletion).toHaveBeenCalled();
    });
  });

  // ====================================================================
  // ERROR HANDLING TESTS
  // ====================================================================

  describe('Error handling', () => {
    it('should handle malformed JSON responses', async () => {
      mockOpenAIService.generateCompletion.mockResolvedValue({
        text: 'This is not JSON format',
        model: 'gpt-4',
        usage: {
          prompt_tokens: 100,
          completion_tokens: 100,
          total_tokens: 200,
        },
      });

      const result = await generator.generateTemplates({
        supplierId: '123e4567-e89b-12d3-a456-426614174000',
        vendorType: 'photographer' as const,
        stage: 'inquiry' as const,
        tone: 'friendly' as const,
        templateName: 'Test Template',
      });

      expect(result.success).toBe(true); // Should handle gracefully
      expect(result.mainTemplate.subject).toBe('Your Wedding Inquiry'); // Default fallback
    });

    it('should handle database connection errors', async () => {
      mockOpenAIService.generateCompletion.mockResolvedValue({
        text: JSON.stringify({
          subject: 'Test Subject',
          body: 'Test Body',
        }),
        model: 'gpt-4',
        usage: {
          prompt_tokens: 100,
          completion_tokens: 100,
          total_tokens: 200,
        },
      });

      // Mock database error
      mockSupabase.from.mockReturnValue({
        insert: jest
          .fn()
          .mockRejectedValue(new Error('Database connection failed')),
      });

      const result = await generator.generateTemplates({
        supplierId: '123e4567-e89b-12d3-a456-426614174000',
        vendorType: 'photographer' as const,
        stage: 'inquiry' as const,
        tone: 'friendly' as const,
        templateName: 'Test Template',
      });

      // Should still succeed even if database storage fails
      expect(result.success).toBe(true);
    });
  });

  // ====================================================================
  // PERFORMANCE TESTS
  // ====================================================================

  describe('Performance', () => {
    it('should complete generation within reasonable time', async () => {
      mockOpenAIService.generateCompletion.mockResolvedValue({
        text: JSON.stringify({
          subject: 'Quick Response',
          body: 'Fast generation',
        }),
        model: 'gpt-4',
        usage: { prompt_tokens: 50, completion_tokens: 50, total_tokens: 100 },
      });

      const startTime = Date.now();

      const result = await generator.generateTemplates({
        supplierId: '123e4567-e89b-12d3-a456-426614174000',
        vendorType: 'photographer' as const,
        stage: 'inquiry' as const,
        tone: 'friendly' as const,
        templateName: 'Speed Test',
        variantCount: 1,
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    });
  });

  // ====================================================================
  // TEMPLATE LIBRARY TESTS
  // ====================================================================

  describe('getTemplateLibrary', () => {
    it('should retrieve template library successfully', async () => {
      const mockTemplates = [
        {
          id: 'template-1',
          template_name: 'Inquiry Response',
          subject: 'Thank you for your inquiry',
          body: 'We appreciate your interest...',
          merge_tags: ['{{client_name}}', '{{wedding_date}}'],
          ai_generated: true,
          ai_model: 'gpt-4',
          ai_generation_time_ms: 2500,
          ai_tokens_used: { total: 250 },
          email_template_variants: [],
        },
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              range: jest.fn().mockResolvedValue({
                data: mockTemplates,
                error: null,
              }),
            }),
          }),
        }),
      });

      const result = await generator.getTemplateLibrary('supplier-id');

      expect(result).toHaveLength(1);
      expect(result[0].templateName).toBe('Inquiry Response');
      expect(result[0].mergeTagsUsed).toContain('{{client_name}}');
    });

    it('should handle empty library gracefully', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              range: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        }),
      });

      const result = await generator.getTemplateLibrary('supplier-id');

      expect(result).toHaveLength(0);
    });
  });
});

// ====================================================================
// INTEGRATION TESTS
// ====================================================================

describe('EmailTemplateGenerator Integration', () => {
  it('should work end-to-end with real-like data', async () => {
    const generator = new EmailTemplateGenerator();

    // Mock realistic OpenAI response
    const mockOpenAIService = jest.mocked(
      require('@/lib/services/openai-service').openaiService,
    );
    mockOpenAIService.generateCompletion.mockResolvedValue({
      text: JSON.stringify({
        subject: "Your Beach Wedding Photography Inquiry - Let's Create Magic!",
        body: `Dear {{client_name}},

Thank you so much for reaching out about photography for your wedding on {{wedding_date}}! 

Beach weddings are absolutely magical, and I specialize in capturing those breathtaking golden hour moments when the sun sets over the ocean. Your celebration at {{venue_name}} sounds like it will be absolutely stunning.

I would love to discuss your vision and how we can document your special day in a way that reflects your unique love story. 

Here's what I include in my wedding packages:
- Full day coverage (up to 10 hours)
- Professional editing and color grading
- Online gallery for easy sharing
- Print release for your convenience

I have several availability options for {{wedding_date}} and would be happy to send over my portfolio and pricing information.

When would be a good time for a quick call to discuss your needs?

Looking forward to potentially being part of your special day!

Warm regards,
{{vendor_name}}
{{contact_phone}}
{{contact_email}}`,
        reasoning: 'Beach wedding specific, warm tone, clear next steps',
      }),
      model: 'gpt-4',
      usage: {
        prompt_tokens: 250,
        completion_tokens: 180,
        total_tokens: 430,
      },
    });

    const request = {
      supplierId: '123e4567-e89b-12d3-a456-426614174000',
      vendorType: 'photographer' as const,
      stage: 'inquiry' as const,
      tone: 'warm' as const,
      templateName: 'Beach Wedding Photography Inquiry Response',
      context: {
        businessName: 'Coastal Captures Photography',
        specialization: 'Beach and destination wedding photography',
        location: 'San Diego, California',
        keyServices: [
          'Full day coverage',
          'Drone photography',
          'Engagement sessions',
        ],
      },
      variantCount: 2,
    };

    const result = await generator.generateTemplates(request);

    expect(result.success).toBe(true);
    expect(result.mainTemplate.subject).toContain('Beach Wedding');
    expect(result.mainTemplate.body).toContain('{{client_name}}');
    expect(result.mainTemplate.body).toContain('{{wedding_date}}');
    expect(result.mainTemplate.mergeTagsUsed).toContain('{{client_name}}');
    expect(result.variants).toHaveLength(1);
    expect(result.totalTokensUsed).toBeGreaterThan(400);
  });
});
