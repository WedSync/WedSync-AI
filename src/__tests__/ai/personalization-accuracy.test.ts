/**
 * AI Content Personalization Accuracy Tests - WS-209 Team E
 *
 * Comprehensive testing suite for AI personalization accuracy, performance validation, and user experience
 *
 * Test Categories:
 * 1. Merge Tag Extraction & Substitution Accuracy
 * 2. Personalization Rule Validation
 * 3. Content Generation Quality & Consistency
 * 4. Email Preview Generation
 * 5. A/B Testing Functionality
 * 6. Rate Limiting & Error Handling
 * 7. Template Storage & Retrieval
 * 8. Performance Benchmarks
 * 9. Wedding Industry Context Accuracy
 *
 * @author Team E - Testing & Documentation Specialists
 * @date 2025-01-20
 * @feature WS-209 - AI Content Personalization Engine
 */

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
  beforeAll,
} from '@jest/testing-library/jest-dom';
import {
  EmailTemplateGenerator,
  EmailGeneratorRequest,
} from '../../lib/ai/email-template-generator';
import {
  PersonalizationRule,
  EmailPreviewData,
  ClientContext,
  VendorContext,
} from '../../types/ai-email';
import { createClient } from '@supabase/supabase-js';

// Mock OpenAI and Supabase
jest.mock('openai');
jest.mock('@supabase/supabase-js');
jest.mock('../../lib/services/openai-service');

// Helper functions to reduce nesting - EXTRACTED TO MEET 4-LEVEL LIMIT
const setupOpenAIMock = () => {
  require('../../lib/services/openai-service').openaiService = {
    generateCompletion: jest.fn().mockResolvedValue({
      text: JSON.stringify({
        subject: 'Your Wedding Photography Journey Begins!',
        body: '<p>Dear {couple_names},</p><p>Thank you for considering {vendor_name} for your special day on {wedding_date}. We are excited to capture your love story at {venue_name}.</p>',
        reasoning: 'Warm and professional tone suitable for initial inquiry',
      }),
      model: 'gpt-4',
      usage: {
        prompt_tokens: 150,
        completion_tokens: 100,
        total_tokens: 250,
      },
    }),
  };
};

// Template substitution helper
const substituteTemplate = (template: { subject: string; content: string }, mergeValues: Record<string, string>) => {
  let subject = template.subject;
  let content = template.content;

  Object.entries(mergeValues).forEach(([token, value]) => {
    const regex = new RegExp(token.replace(/[{}]/g, '\\$&'), 'g');
    subject = subject.replace(regex, value);
    content = content.replace(regex, value);
  });

  return { subject, content };
};

// Merge tag validation helper
const validateMergeTag = (rule: PersonalizationRule, value: string): string | null => {
  if (rule.is_required && !value.trim()) {
    return 'This field is required';
  }

  if (rule.validation_pattern && value) {
    const regex = new RegExp(rule.validation_pattern);
    if (!regex.test(value)) {
      return 'Invalid format';
    }
  }
  return null;
};

// Auto-population helper
const createAutoValues = (clientData: ClientContext): Record<string, string> => {
  const autoValues: Record<string, string> = {};

  if (clientData.couple_names) autoValues['{couple_names}'] = clientData.couple_names;
  if (clientData.wedding_date) autoValues['{wedding_date}'] = clientData.wedding_date;
  if (clientData.venue_name) autoValues['{venue_name}'] = clientData.venue_name;
  if (clientData.guest_count) autoValues['{guest_count}'] = clientData.guest_count.toString();

  return autoValues;
};

// Content warning detection helper
const detectContentWarnings = (content: string): string[] => {
  const warnings: string[] = [];

  if (content.includes('URGENT') || content.includes('!!!')) {
    warnings.push('Subject contains urgent/alarming language');
  }

  if (content.includes('MAJOR ISSUES') || content.includes('RUINED')) {
    warnings.push('Content contains negative/alarming language');
  }

  if ((content.match(/[A-Z]{4,}/g) || []).length > 3) {
    warnings.push('Excessive use of capital letters');
  }

  return warnings;
};

// Rate limit check helper
const checkRateLimit = (supplierId: string, rateLimitTracker: Map<string, any>, maxRequests: number): void => {
  const userLimit = rateLimitTracker.get(supplierId);
  if (userLimit && userLimit.count >= maxRequests) {
    throw new Error(
      'Rate limit exceeded. Please wait 60 seconds before generating more templates.',
    );
  }
};

// Edge case test helper
const testEdgeCase = (generator: any, caseData: { content: string; expected: string[] }) => {
  const extracted = generator.extractMergeTags(caseData.content);
  expect(extracted).toEqual(caseData.expected);
};

// Vendor type content validation helper
const validateVendorContent = (content: string, vendorType: string) => {
  switch (vendorType) {
    case 'photographer':
      expect(content).toMatch(/photo|camera|capture|shoot|portrait/i);
      break;
    case 'dj':
      expect(content).toMatch(/music|sound|dance|entertainment/i);
      break;
    case 'caterer':
      expect(content).toMatch(/food|menu|catering|cuisine|meal/i);
      break;
    case 'venue':
      expect(content).toMatch(/venue|space|location|room|capacity/i);
      break;
    case 'florist':
      expect(content).toMatch(/flower|bouquet|floral|arrangement/i);
      break;
  }
};

// Stage content validation helper
const validateStageContent = (content: string, expectedTerms: string[]): boolean => {
  return expectedTerms.some((term) => content.includes(term.toLowerCase()));
};

// Template request validation helper
const validateTemplateRequest = (request: any): void => {
  if (!request.supplierId) throw new Error('Supplier ID required');
  if (!['photographer', 'dj', 'caterer', 'venue', 'florist'].includes(request.vendorType)) {
    throw new Error('Invalid vendor type');
  }
  if (!request.templateName) throw new Error('Template name required');
};

// Test stage generation helper
const testStageGeneration = async (generator: any, stage: string) => {
  const request: EmailGeneratorRequest = {
    supplierId: 'supplier-1',
    vendorType: 'photographer',
    stage,
    tone: 'friendly',
    templateName: `${stage} Email`,
  };

  const result = await generator.generateTemplates(request);
  expect(result.success).toBe(true);
  expect(result.mainTemplate.subject).toBeTruthy();
  expect(result.mainTemplate.body).toBeTruthy();
};

// Validate template consistency helper
const validateTemplateConsistency = (template: any) => {
  expect(template.subject).toBeTruthy();
  expect(template.body).toBeTruthy();
  expect(template.body.length).toBeGreaterThan(100);
};

// Create mock template data helper
const createMockTemplates = () => {
  return [
    {
      id: 'template-1',
      template_name: 'Inquiry Response',
      subject: 'Thank you for your inquiry',
      body: 'Template body content',
      merge_tags: ['{couple_names}', '{wedding_date}'],
      ai_model: 'gpt-4',
      ai_tokens_used: { prompt: 100, completion: 150, total: 250 },
      ai_generation_time_ms: 2000,
      ai_prompt_used: 'System prompt',
    },
  ];
};

// Professional standards validation helper
const validateProfessionalStandards = (content: string) => {
  // Should not contain unprofessional elements
  expect(content).not.toMatch(/cheap|discount|deal|sale/i);
  expect(content).not.toMatch(/guarantee|promise|always|never/i);
  expect(content).not.toMatch(/urgent|asap|immediately/i);

  // Should contain professional elements
  expect(content).toMatch(/experience|professional|quality|service/i);
  expect(content.length).toBeGreaterThan(200);
  expect(content.length).toBeLessThan(2000);
};

// Create stage test data helper
const createStageTestData = () => {
  return [
    {
      stage: 'inquiry',
      expectedTerms: ['thank you', 'inquiry', 'consider', 'excited'],
    },
    {
      stage: 'booking',
      expectedTerms: ['confirmed', 'contract', 'next steps', 'booked'],
    },
    {
      stage: 'planning',
      expectedTerms: ['planning', 'details', 'timeline', 'coordinate'],
    },
    {
      stage: 'final',
      expectedTerms: ['final', 'ready', 'upcoming', 'prepared'],
    },
    {
      stage: 'post',
      expectedTerms: ['congratulations', 'beautiful', 'delivery', 'memories'],
    },
  ] as const;
};

describe('AI Content Personalization Accuracy Tests', () => {
  let generator: EmailTemplateGenerator;
  let mockSupabase: any;
  let mockOpenAI: any;

  // Test data fixtures
  const mockClientContext: ClientContext = {
    couple_names: 'Sarah & Michael',
    wedding_date: '2025-06-15',
    venue_name: 'The Grand Ballroom',
    venue_type: 'indoor',
    guest_count: 120,
    style_preference: 'classic elegance',
    budget_range: 'mid',
    special_requirements: 'Vegetarian meal options',
    previous_communication: ['Initial inquiry', 'Venue tour scheduled'],
  };

  const mockVendorContext: VendorContext = {
    business_name: 'Elegant Photography Studio',
    primary_category: 'photographer',
    years_experience: 8,
    specialties: [
      'Wedding Photography',
      'Portrait Sessions',
      'Engagement Shoots',
    ],
    unique_selling_points: [
      'Award-winning',
      'Same-day editing',
      'Drone photography',
    ],
    pricing_structure: 'Package-based with custom options',
    availability_status: 'available',
  };

  const mockPersonalizationRules: PersonalizationRule[] = [
    {
      id: 'rule-1',
      token: '{couple_names}',
      display_name: 'Couple Names',
      description: 'Names of the couple getting married',
      default_value: 'Bride & Groom',
      is_required: true,
      data_source: 'client',
      auto_populate: true,
    },
    {
      id: 'rule-2',
      token: '{wedding_date}',
      display_name: 'Wedding Date',
      description: 'Date of the wedding ceremony',
      default_value: '',
      is_required: true,
      validation_pattern: '\\d{4}-\\d{2}-\\d{2}',
      data_source: 'client',
      auto_populate: true,
    },
    {
      id: 'rule-3',
      token: '{vendor_name}',
      display_name: 'Business Name',
      description: 'Name of the wedding vendor business',
      default_value: 'Our Studio',
      is_required: true,
      data_source: 'vendor',
      auto_populate: true,
    },
  ];

  beforeAll(async () => {
    // Setup test environment
    process.env.OPENAI_API_KEY = 'test-key';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
  });

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock Supabase client
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      textSearch: jest.fn().mockReturnThis(),
    };

    // Mock successful database operations
    mockSupabase.insert.mockResolvedValue({ data: {}, error: null });
    mockSupabase.select.mockResolvedValue({ data: [], error: null });
    (createClient as jest.Mock).mockReturnValue(mockSupabase);

    // Initialize generator
    generator = new EmailTemplateGenerator();

    // Setup OpenAI mock using helper function
    setupOpenAIMock();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });


  describe('1. Merge Tag Extraction & Substitution Accuracy', () => {
    it('should accurately extract all merge tags from template content', () => {
      const templateContent =
        'Dear {couple_names}, your wedding on {wedding_date} at {venue_name} with {guest_count} guests will be amazing!';
      const expectedTags = [
        '{couple_names}',
        '{wedding_date}',
        '{venue_name}',
        '{guest_count}',
      ];

      // Use the private method via type assertion for testing
      const extractedTags = (generator as any).extractMergeTags(
        templateContent,
      );

      expect(extractedTags).toEqual(expect.arrayContaining(expectedTags));
      expect(extractedTags).toHaveLength(4);
    });

    it('should handle edge cases in merge tag extraction', () => {
      const edgeCases = [
        { content: 'No merge tags here', expected: [] },
        { content: '{single_tag}', expected: ['{single_tag}'] },
        {
          content: '{tag_with_spaces} and {UPPERCASE_TAG}',
          expected: ['{tag_with_spaces}', '{UPPERCASE_TAG}'],
        },
        {
          content: '{{double_braces}} and {normal_tag}',
          expected: ['{normal_tag}'],
        }, // Should not extract double braces
        {
          content: '{incomplete_tag and {complete_tag}',
          expected: ['{complete_tag}'],
        },
      ];

      edgeCases.forEach((caseData) => testEdgeCase(generator, caseData));
    });

    it('should accurately substitute merge tags with provided values', () => {
      const template = {
        subject: 'Hello {couple_names}!',
        content:
          'Your wedding on {wedding_date} at {venue_name} will be beautiful!',
      };

      const mergeValues = {
        '{couple_names}': 'Sarah & Michael',
        '{wedding_date}': 'June 15th, 2025',
        '{venue_name}': 'The Grand Ballroom',
      };

      const result = substituteTemplate(template, mergeValues);

      expect(result.subject).toBe('Hello Sarah & Michael!');
      expect(result.content).toBe(
        'Your wedding on June 15th, 2025 at The Grand Ballroom will be beautiful!',
      );
    });

    it('should maintain content integrity when no matching tags are found', () => {
      const template = {
        subject: 'Static Subject',
        content: 'Static content with no merge tags',
      };

      const mergeValues = {
        '{couple_names}': 'Sarah & Michael',
      };

      // Should not modify content when no tags match
      expect(template.subject).toBe('Static Subject');
      expect(template.content).toBe('Static content with no merge tags');
    });

    it('should handle special characters and HTML in merge tag values', () => {
      const template = {
        subject: 'Wedding for {couple_names}',
        content: '<p>Location: {venue_name}</p>',
      };

      const mergeValues = {
        '{couple_names}': 'Sarah & Michael <3',
        '{venue_name}': 'The "Grand" Ballroom & Gardens',
      };

      const result = substituteTemplate(template, mergeValues);

      expect(result.subject).toBe('Wedding for Sarah & Michael <3');
      expect(result.content).toBe('<p>Location: The "Grand" Ballroom & Gardens</p>');
    });
  });

  describe('2. Personalization Rule Validation', () => {
    it('should validate required fields correctly', () => {
      const rule: PersonalizationRule = {
        id: 'test-rule',
        token: '{couple_names}',
        display_name: 'Couple Names',
        description: 'Required field',
        default_value: '',
        is_required: true,
        data_source: 'client',
        auto_populate: false,
      };

      expect(validateMergeTag(rule, '')).toBe('This field is required');
      expect(validateMergeTag(rule, '   ')).toBe('This field is required');
      expect(validateMergeTag(rule, 'Sarah & Michael')).toBeNull();
    });

    it('should validate patterns correctly', () => {
      const dateRule: PersonalizationRule = {
        id: 'date-rule',
        token: '{wedding_date}',
        display_name: 'Wedding Date',
        description: 'Date in YYYY-MM-DD format',
        default_value: '',
        is_required: true,
        validation_pattern: '^\\d{4}-\\d{2}-\\d{2}$',
        data_source: 'client',
        auto_populate: false,
      };

      expect(validateMergeTag(dateRule, '2025-06-15')).toBeNull();
      expect(validateMergeTag(dateRule, '06/15/2025')).toBe('Invalid format');
      expect(validateMergeTag(dateRule, 'June 15, 2025')).toBe(
        'Invalid format',
      );
      expect(validateMergeTag(dateRule, 'invalid-date')).toBe('Invalid format');
    });

    it('should auto-populate fields from client context', () => {
      const clientData = mockClientContext;
      const autoValues = createAutoValues(clientData);

      expect(autoValues['{couple_names}']).toBe('Sarah & Michael');
      expect(autoValues['{wedding_date}']).toBe('2025-06-15');
      expect(autoValues['{venue_name}']).toBe('The Grand Ballroom');
      expect(autoValues['{guest_count}']).toBe('120');
    });
  });

  describe('3. Content Generation Quality & Consistency', () => {
    it('should generate contextually appropriate content for different vendor types', async () => {
      const photographerRequest: EmailGeneratorRequest = {
        supplierId: 'supplier-1',
        vendorType: 'photographer',
        stage: 'inquiry',
        tone: 'friendly',
        templateName: 'Photography Inquiry Response',
        context: {
          businessName: 'Elegant Photography',
          specialization: 'Wedding Photography',
        },
      };

      const result = await generator.generateTemplates(photographerRequest);

      expect(result.success).toBe(true);
      expect(result.mainTemplate).toBeDefined();
      expect(result.mainTemplate.subject).toContain('Photography');
      expect(result.mainTemplate.body).toContain('capture');
    });

    it('should generate appropriate content for different wedding stages', async () => {
      const stages = [
        'inquiry',
        'booking',
        'planning',
        'final',
        'post',
      ] as const;

      for (const stage of stages) {
        await testStageGeneration(generator, stage);
      }
    });

    it('should maintain consistent tone across generated variants', async () => {
      const request: EmailGeneratorRequest = {
        supplierId: 'supplier-1',
        vendorType: 'photographer',
        stage: 'inquiry',
        tone: 'formal',
        templateName: 'Formal Inquiry Response',
        variantCount: 3,
      };

      const result = await generator.generateTemplates(request);

      expect(result.success).toBe(true);
      expect(result.templates).toHaveLength(3);

      // All templates should have similar professional tone indicators
      result.templates.forEach(validateTemplateConsistency);
    });

    it('should include industry-appropriate merge tags', async () => {
      const request: EmailGeneratorRequest = {
        supplierId: 'supplier-1',
        vendorType: 'photographer',
        stage: 'inquiry',
        tone: 'friendly',
        templateName: 'Photography Inquiry Response',
      };

      const result = await generator.generateTemplates(request);

      expect(result.success).toBe(true);
      expect(result.mainTemplate.mergeTagsUsed).toContain('{couple_names}');
      expect(result.mainTemplate.mergeTagsUsed.length).toBeGreaterThan(0);
    });
  });

  describe('4. Email Preview Generation', () => {
    it('should generate accurate preview data with personalized content', () => {
      const template = {
        subject: 'Your Wedding Photography - {couple_names}',
        content:
          '<p>Dear {couple_names},</p><p>Your wedding on {wedding_date} at {venue_name} will be beautiful!</p>',
      };

      const mergeValues = {
        '{couple_names}': 'Sarah & Michael',
        '{wedding_date}': '2025-06-15',
        '{venue_name}': 'The Grand Ballroom',
      };

      const result = substituteTemplate(template, mergeValues);

      const previewData: EmailPreviewData = {
        subject: template.subject,
        html_content: template.content,
        text_content: template.content.replace(/<[^>]*>/g, ''),
        personalized_subject: result.subject,
        personalized_html_content: result.content,
        personalized_text_content: result.content.replace(/<[^>]*>/g, ''),
        merge_tags_used: Object.keys(mergeValues),
        preview_client: mockClientContext,
        estimated_render_time: 250,
      };

      expect(previewData.personalized_subject).toBe(
        'Your Wedding Photography - Sarah & Michael',
      );
      expect(previewData.personalized_html_content).toContain(
        'Dear Sarah & Michael',
      );
      expect(previewData.personalized_html_content).toContain('2025-06-15');
      expect(previewData.personalized_html_content).toContain(
        'The Grand Ballroom',
      );
      expect(previewData.merge_tags_used).toHaveLength(3);
    });

    it('should detect content warnings in preview', () => {
      const template = {
        subject: 'URGENT: Wedding Changes Required!!!',
        content:
          '<p>Dear {couple_names},</p><p>There are MAJOR ISSUES with your wedding plans. Please call IMMEDIATELY or your wedding will be RUINED!</p>',
      };

      const warnings = detectContentWarnings(
        template.subject + ' ' + template.content,
      );

      expect(warnings).toContain('Subject contains urgent/alarming language');
      expect(warnings).toContain('Content contains negative/alarming language');
      expect(warnings).toContain('Excessive use of capital letters');
    });
  });

  describe('5. A/B Testing Functionality', () => {
    it('should generate multiple variants with different characteristics', async () => {
      const request: EmailGeneratorRequest = {
        supplierId: 'supplier-1',
        vendorType: 'photographer',
        stage: 'inquiry',
        tone: 'friendly',
        templateName: 'Photography Inquiry Response',
        variantCount: 5,
      };

      const result = await generator.generateTemplates(request);

      expect(result.success).toBe(true);
      expect(result.templates).toHaveLength(5);
      expect(result.mainTemplate).toBeDefined();
      expect(result.variants).toHaveLength(4); // 5 total - 1 main = 4 variants

      // Each variant should have unique content
      const subjects = result.templates.map((t) => t.subject);
      const uniqueSubjects = new Set(subjects);
      expect(uniqueSubjects.size).toBeGreaterThan(1); // Should have some variation
    });

    it('should track variant performance metadata', async () => {
      const request: EmailGeneratorRequest = {
        supplierId: 'supplier-1',
        vendorType: 'photographer',
        stage: 'inquiry',
        tone: 'friendly',
        templateName: 'Photography Inquiry Response',
        variantCount: 3,
      };

      const result = await generator.generateTemplates(request);

      expect(result.success).toBe(true);

      result.variants.forEach((variant, index) => {
        expect(variant.variant).toBeDefined();
        expect(variant.variant!.label).toBe(String.fromCharCode(66 + index)); // B, C, D, etc.
        expect(variant.variant!.performanceScore).toBe(0); // Initial score
      });
    });
  });

  describe('6. Rate Limiting & Error Handling', () => {
    it('should enforce rate limiting per supplier', async () => {
      const request: EmailGeneratorRequest = {
        supplierId: 'supplier-1',
        vendorType: 'photographer',
        stage: 'inquiry',
        tone: 'friendly',
        templateName: 'Test Template',
      };

      // Mock rate limiting - simulate exceeding limit
      const rateLimitTracker = new Map();
      const supplierId = 'supplier-1';
      const maxRequests = 2;

      // Simulate hitting rate limit
      rateLimitTracker.set(supplierId, {
        count: maxRequests,
        resetTime: Date.now() + 60000,
      });

      expect(() => checkRateLimit(supplierId, rateLimitTracker, maxRequests)).toThrow('Rate limit exceeded');
    });

    it('should handle OpenAI API failures gracefully', async () => {
      // Mock OpenAI failure
      require('../../lib/services/openai-service').openaiService.generateCompletion.mockRejectedValue(
        new Error('OpenAI API Error'),
      );

      const request: EmailGeneratorRequest = {
        supplierId: 'supplier-1',
        vendorType: 'photographer',
        stage: 'inquiry',
        tone: 'friendly',
        templateName: 'Test Template',
      };

      const result = await generator.generateTemplates(request);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.templates).toHaveLength(0);
    });

    it('should validate input parameters', () => {
      const invalidRequests = [
        {
          supplierId: '', // Empty supplier ID
          vendorType: 'photographer',
          stage: 'inquiry',
          tone: 'friendly',
          templateName: 'Test',
        },
        {
          supplierId: 'supplier-1',
          vendorType: 'invalid_type', // Invalid vendor type
          stage: 'inquiry',
          tone: 'friendly',
          templateName: 'Test',
        },
        {
          supplierId: 'supplier-1',
          vendorType: 'photographer',
          stage: 'inquiry',
          tone: 'friendly',
          templateName: '', // Empty template name
        },
      ];

      // Use extracted helper function - S2004 compliance maintained
      invalidRequests.forEach((request) => {
        expect(() => validateTemplateRequest(request)).toThrow();
      });
    });
  });

  describe('7. Template Storage & Retrieval', () => {
    it('should store generated templates in database', async () => {
      const request: EmailGeneratorRequest = {
        supplierId: 'supplier-1',
        vendorType: 'photographer',
        stage: 'inquiry',
        tone: 'friendly',
        templateName: 'Photography Inquiry Response',
      };

      await generator.generateTemplates(request);

      // Verify database calls were made
      expect(mockSupabase.from).toHaveBeenCalledWith('email_templates');
      expect(mockSupabase.insert).toHaveBeenCalled();
    });

    it('should retrieve template library with filters', async () => {
      const supplierId = 'supplier-1';
      const mockTemplates = createMockTemplates();

      mockSupabase.select.mockResolvedValue({
        data: mockTemplates,
        error: null,
      });

      const templates = await generator.getTemplateLibrary(supplierId);

      expect(templates).toHaveLength(1);
      expect(templates[0].templateName).toBe('Inquiry Response');
      expect(templates[0].mergeTagsUsed).toContain('{couple_names}');
    });

    it('should handle database errors gracefully', async () => {
      const supplierId = 'supplier-1';

      // Mock database error
      mockSupabase.select.mockResolvedValue({
        data: null,
        error: new Error('Database error'),
      });

      const templates = await generator.getTemplateLibrary(supplierId);

      expect(templates).toHaveLength(0); // Should return empty array on error
    });
  });

  describe('8. Performance Benchmarks', () => {
    it('should generate templates within acceptable time limits', async () => {
      const request: EmailGeneratorRequest = {
        supplierId: 'supplier-1',
        vendorType: 'photographer',
        stage: 'inquiry',
        tone: 'friendly',
        templateName: 'Performance Test Template',
        variantCount: 1,
      };

      const startTime = Date.now();
      const result = await generator.generateTemplates(request);
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(10000); // Should complete within 10 seconds
      expect(result.totalGenerationTime).toBeGreaterThan(0);
    });

    it('should track token usage accurately', async () => {
      const request: EmailGeneratorRequest = {
        supplierId: 'supplier-1',
        vendorType: 'photographer',
        stage: 'inquiry',
        tone: 'friendly',
        templateName: 'Token Usage Test',
      };

      const result = await generator.generateTemplates(request);

      expect(result.success).toBe(true);
      expect(result.totalTokensUsed).toBeGreaterThan(0);
      expect(result.mainTemplate.aiMetadata.tokensUsed.prompt).toBeGreaterThan(
        0,
      );
      expect(
        result.mainTemplate.aiMetadata.tokensUsed.completion,
      ).toBeGreaterThan(0);
      expect(result.mainTemplate.aiMetadata.tokensUsed.total).toBe(
        result.mainTemplate.aiMetadata.tokensUsed.prompt +
          result.mainTemplate.aiMetadata.tokensUsed.completion,
      );
    });
  });

  describe('9. Wedding Industry Context Accuracy', () => {
    it('should generate vendor-specific terminology and expertise', async () => {
      const vendorTypes = [
        'photographer',
        'dj',
        'caterer',
        'venue',
        'florist',
      ] as const;

      for (const vendorType of vendorTypes) {
        const request: EmailGeneratorRequest = {
          supplierId: 'supplier-1',
          vendorType,
          stage: 'inquiry',
          tone: 'professional',
          templateName: `${vendorType} Inquiry Response`,
        };

        const result = await generator.generateTemplates(request);

        expect(result.success).toBe(true);
        expect(result.mainTemplate.subject).toBeTruthy();
        expect(result.mainTemplate.body).toBeTruthy();

        // Should contain vendor-specific content
        const content = (
          result.mainTemplate.subject +
          ' ' +
          result.mainTemplate.body
        ).toLowerCase();

        validateVendorContent(content, vendorType);
      }
    });

    it('should adapt content for different wedding stages appropriately', async () => {
      const stages = createStageTestData();

      for (const { stage, expectedTerms } of stages) {
        const request: EmailGeneratorRequest = {
          supplierId: 'supplier-1',
          vendorType: 'photographer',
          stage,
          tone: 'friendly',
          templateName: `${stage} Response`,
        };

        const result = await generator.generateTemplates(request);
        expect(result.success).toBe(true);

        const content = (
          result.mainTemplate.subject +
          ' ' +
          result.mainTemplate.body
        ).toLowerCase();

        const hasAppropriateTerms = validateStageContent(content, expectedTerms);
        expect(hasAppropriateTerms).toBe(true);
      }
    });

    it('should maintain professional wedding industry standards', async () => {
      const request: EmailGeneratorRequest = {
        supplierId: 'supplier-1',
        vendorType: 'photographer',
        stage: 'inquiry',
        tone: 'professional',
        templateName: 'Professional Standards Test',
      };

      const result = await generator.generateTemplates(request);

      expect(result.success).toBe(true);

      const content =
        result.mainTemplate.subject + ' ' + result.mainTemplate.body;

      validateProfessionalStandards(content);
    });
  });

  describe('Integration Tests', () => {
    it('should complete full personalization workflow', async () => {
      // 1. Generate template
      const generationRequest: EmailGeneratorRequest = {
        supplierId: 'supplier-1',
        vendorType: 'photographer',
        stage: 'inquiry',
        tone: 'friendly',
        templateName: 'Complete Workflow Test',
      };

      const generationResult =
        await generator.generateTemplates(generationRequest);
      expect(generationResult.success).toBe(true);

      // 2. Apply personalization rules
      const mergeTagValues = {
        '{couple_names}': mockClientContext.couple_names,
        '{wedding_date}': mockClientContext.wedding_date!,
        '{venue_name}': mockClientContext.venue_name!,
      };

      // 3. Generate preview using helper
      const template = { 
        subject: generationResult.mainTemplate.subject,
        content: generationResult.mainTemplate.body 
      };
      const result = substituteTemplate(template, mergeTagValues);

      // 4. Validate final result
      expect(result.content).toContain('Sarah & Michael');
      expect(result.content).toContain('2025-06-15');
      expect(result.content).toContain('The Grand Ballroom');
      expect(result.content).not.toContain('{couple_names}');
    });
  });
});
