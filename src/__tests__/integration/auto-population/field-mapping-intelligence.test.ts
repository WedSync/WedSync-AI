/**
 * Field Mapping Intelligence Integration Tests
 * WS-216 Auto-Population System - Team C Integration Infrastructure
 */

import {
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals';
import { FieldMappingIntelligence } from '@/lib/integrations/field-mapping-intelligence';

// Mock OpenAI
jest.mock('@/lib/integrations/openai-service', () => ({
  openai: {
    chat: {
      completions: {
        create: jest.fn(),
      },
    },
  },
}));

// Mock Supabase
jest.mock('@supabase/supabase-js');
const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(),
        limit: jest.fn(),
      })),
      ilike: jest.fn(() => ({
        limit: jest.fn().mockResolvedValue({ data: [] }),
      })),
    })),
    insert: jest.fn().mockResolvedValue({ data: {} }),
    upsert: jest.fn().mockResolvedValue({ data: {} }),
  })),
};

const { createClient } = require('@supabase/supabase-js');
createClient.mockReturnValue(mockSupabase);

describe('FieldMappingIntelligence Integration Tests', () => {
  let fieldMapping: FieldMappingIntelligence;

  beforeEach(() => {
    jest.clearAllMocks();
    fieldMapping = new FieldMappingIntelligence();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Field Analysis', () => {
    test('should analyze wedding-specific fields correctly', async () => {
      const field = {
        id: 'field1',
        name: 'bride_name',
        title: 'Bride Name',
        type: 'text',
        required: true,
        formTitle: 'Wedding Information Form',
      };

      // Mock OpenAI response
      const { openai } = require('@/lib/integrations/openai-service');
      openai.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                type: 'bride_name',
                confidence: 0.9,
                weddingRelevance: 0.95,
                explanation: 'Field clearly indicates bride name collection',
              }),
            },
          },
        ],
      });

      const analysis = await fieldMapping.analyzeField(field);

      expect(analysis.semanticType).toBe('bride_name');
      expect(analysis.confidence).toBeGreaterThan(0.8);
      expect(analysis.weddingRelevance).toBeGreaterThan(0.9);
      expect(analysis.context).toBe('wedding');
    });

    test('should identify guest count fields with high confidence', async () => {
      const field = {
        id: 'guest_count',
        name: 'number_of_guests',
        title: 'Number of Expected Guests',
        type: 'number',
        required: true,
        formTitle: 'Wedding Planning Form',
      };

      openai.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                type: 'guest_count',
                confidence: 0.95,
                weddingRelevance: 0.9,
                explanation: 'Clear guest count field for wedding planning',
              }),
            },
          },
        ],
      });

      const analysis = await fieldMapping.analyzeField(field);

      expect(analysis.semanticType).toBe('guest_count');
      expect(analysis.confidence).toBeGreaterThan(0.9);
      expect(analysis.patterns).toContain('guestCount');
    });

    test('should handle contact fields appropriately', async () => {
      const field = {
        id: 'email',
        name: 'contact_email',
        title: 'Email Address',
        type: 'email',
        required: true,
      };

      openai.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                type: 'contact_email',
                confidence: 0.85,
                weddingRelevance: 0.7,
                explanation: 'Standard contact email field',
              }),
            },
          },
        ],
      });

      const analysis = await fieldMapping.analyzeField(field);

      expect(analysis.semanticType).toBe('contact_email');
      expect(analysis.context).toBe('general');
    });

    test('should handle OpenAI API failures gracefully', async () => {
      const field = {
        id: 'test_field',
        name: 'test',
        title: 'Test Field',
        type: 'text',
      };

      // Mock API failure
      openai.chat.completions.create.mockRejectedValue(new Error('API Error'));

      const analysis = await fieldMapping.analyzeField(field);

      // Should return default analysis
      expect(analysis.semanticType).toBe('text');
      expect(analysis.confidence).toBeGreaterThan(0);
    });
  });

  describe('Mapping Suggestions', () => {
    test('should suggest mappings for wedding date fields', async () => {
      const field = {
        id: 'wedding_date',
        name: 'ceremony_date',
        title: 'Wedding Date',
        type: 'date',
        required: true,
      };

      const availableTargets = [
        {
          name: 'wedding_date',
          type: 'date',
          category: 'wedding' as const,
          description: 'Date of the wedding ceremony',
          synonyms: ['event_date', 'ceremony_date', 'big_day'],
          patterns: ['^(wedding|event|ceremony)[-_\\s]?date$'],
        },
        {
          name: 'contact_email',
          type: 'email',
          category: 'contact' as const,
          description: 'Primary email address',
          synonyms: ['email'],
          patterns: ['^email$'],
        },
      ];

      // Mock OpenAI response
      openai.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                type: 'wedding_date',
                confidence: 0.95,
                weddingRelevance: 0.98,
                explanation: 'Perfect match for wedding date',
              }),
            },
          },
        ],
      });

      const suggestions = await fieldMapping.suggestMapping(
        field,
        availableTargets,
      );

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].targetField).toBe('wedding_date');
      expect(suggestions[0].confidence).toBeGreaterThan(0.9);
      expect(suggestions[0].reasoning).toContain('text similarity');
    });

    test('should rank suggestions by confidence', async () => {
      const field = {
        id: 'name',
        name: 'full_name',
        title: 'Full Name',
        type: 'text',
        required: true,
      };

      const availableTargets = [
        {
          name: 'bride_name',
          type: 'text',
          category: 'personal' as const,
          description: 'Name of the bride',
          synonyms: ['bride', 'primary_name'],
          patterns: ['^bride[-_\\s]?name$'],
        },
        {
          name: 'groom_name',
          type: 'text',
          category: 'personal' as const,
          description: 'Name of the groom',
          synonyms: ['groom', 'secondary_name'],
          patterns: ['^groom[-_\\s]?name$'],
        },
        {
          name: 'contact_email',
          type: 'email',
          category: 'contact' as const,
          description: 'Email address',
          synonyms: ['email'],
          patterns: ['^email$'],
        },
      ];

      openai.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                type: 'name',
                confidence: 0.8,
                weddingRelevance: 0.7,
                explanation: 'General name field',
              }),
            },
          },
        ],
      });

      const suggestions = await fieldMapping.suggestMapping(
        field,
        availableTargets,
      );

      // Should return max 3 suggestions, sorted by confidence
      expect(suggestions.length).toBeLessThanOrEqual(3);

      if (suggestions.length > 1) {
        expect(suggestions[0].confidence).toBeGreaterThanOrEqual(
          suggestions[1].confidence,
        );
      }
    });

    test('should suggest appropriate transformations', async () => {
      const field = {
        id: 'phone',
        name: 'phone_number',
        title: 'Phone Number',
        type: 'text', // Text input but needs phone formatting
        required: true,
      };

      const availableTargets = [
        {
          name: 'contact_phone',
          type: 'phone',
          category: 'contact' as const,
          description: 'Primary phone number',
          synonyms: ['phone', 'mobile'],
          patterns: ['^phone$'],
        },
      ];

      openai.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                type: 'contact_phone',
                confidence: 0.9,
                weddingRelevance: 0.6,
                explanation: 'Phone number field',
              }),
            },
          },
        ],
      });

      const suggestions = await fieldMapping.suggestMapping(
        field,
        availableTargets,
      );

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].transformations).toBeDefined();
      expect(suggestions[0].transformations.length).toBeGreaterThan(0);
      expect(suggestions[0].transformations[0].type).toBe('format_phone');
    });

    test('should handle fields with no good matches', async () => {
      const field = {
        id: 'obscure_field',
        name: 'random_data',
        title: 'Random Data Field',
        type: 'text',
      };

      const availableTargets = [
        {
          name: 'wedding_date',
          type: 'date',
          category: 'wedding' as const,
          description: 'Wedding date',
          synonyms: ['date'],
          patterns: ['^date$'],
        },
      ];

      openai.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                type: 'text',
                confidence: 0.3,
                weddingRelevance: 0.1,
                explanation: 'Generic text field',
              }),
            },
          },
        ],
      });

      const suggestions = await fieldMapping.suggestMapping(
        field,
        availableTargets,
      );

      // Should return empty or very low confidence suggestions
      expect(suggestions.length).toBeLessThanOrEqual(1);
      if (suggestions.length > 0) {
        expect(suggestions[0].confidence).toBeLessThan(0.5);
      }
    });
  });

  describe('Learning and Training', () => {
    test('should accept feedback and update training data', async () => {
      const feedback = {
        sourceField: 'bride_first_name',
        suggestedField: 'groom_name',
        actualField: 'bride_name',
        accepted: false,
        confidence: 0.7,
        reason: 'Wrong partner - this is bride name not groom',
        organizationId: 'org-123',
        platformType: 'typeform',
      };

      await expect(
        fieldMapping.recordFeedback(feedback),
      ).resolves.not.toThrow();

      // Verify feedback was stored
      expect(mockSupabase.from).toHaveBeenCalledWith('field_mapping_feedback');
    });

    test('should improve accuracy over time with feedback', async () => {
      const trainingData = [
        {
          sourceField: 'guest_total',
          suggestedField: 'guest_count',
          actualField: 'guest_count',
          accepted: true,
          confidence: 0.8,
          organizationId: 'org-123',
          platformType: 'typeform',
        },
        {
          sourceField: 'number_of_attendees',
          suggestedField: 'guest_count',
          actualField: 'guest_count',
          accepted: true,
          confidence: 0.9,
          organizationId: 'org-456',
          platformType: 'jotform',
        },
      ];

      await expect(
        fieldMapping.trainModel(trainingData),
      ).resolves.not.toThrow();

      // Verify training data was processed
      expect(mockSupabase.from).toHaveBeenCalledWith('mapping_training_data');
    });

    test('should calculate mapping accuracy correctly', async () => {
      // Mock feedback data
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          data: [
            { platform_type: 'typeform', accepted: true },
            { platform_type: 'typeform', accepted: true },
            { platform_type: 'typeform', accepted: false },
            { platform_type: 'jotform', accepted: true },
          ],
        }),
      });

      const accuracy = await fieldMapping.getMappingAccuracy();

      expect(accuracy.overall).toBe(0.75); // 3/4 accepted
      expect(accuracy.byPlatform.typeform).toBeCloseTo(0.67); // 2/3 for typeform
      expect(accuracy.byPlatform.jotform).toBe(1); // 1/1 for jotform
    });
  });

  describe('Pattern Recognition', () => {
    test('should recognize wedding date patterns', async () => {
      const fields = [
        { name: 'wedding_date', title: 'Wedding Date' },
        { name: 'ceremony_date', title: 'Ceremony Date' },
        { name: 'event_date', title: 'Event Date' },
        { name: 'big_day_date', title: 'Big Day Date' },
      ];

      for (const field of fields) {
        const testField = { ...field, type: 'date', required: true };

        openai.chat.completions.create.mockResolvedValue({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  type: 'wedding_date',
                  confidence: 0.9,
                  weddingRelevance: 0.95,
                }),
              },
            },
          ],
        });

        const analysis = await fieldMapping.analyzeField(testField);
        expect(analysis.patterns).toContain('weddingDate');
      }
    });

    test('should recognize guest count patterns', async () => {
      const fields = [
        { name: 'guest_count', title: 'Guest Count' },
        { name: 'number_of_guests', title: 'Number of Guests' },
        { name: 'attendee_total', title: 'Total Attendees' },
        { name: 'head_count', title: 'Head Count' },
        { name: 'party_size', title: 'Party Size' },
      ];

      for (const field of fields) {
        const testField = { ...field, type: 'number', required: true };

        openai.chat.completions.create.mockResolvedValue({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  type: 'guest_count',
                  confidence: 0.85,
                  weddingRelevance: 0.9,
                }),
              },
            },
          ],
        });

        const analysis = await fieldMapping.analyzeField(testField);
        expect(analysis.patterns).toContain('guestCount');
      }
    });

    test('should recognize partner name patterns', async () => {
      const fields = [
        { name: 'bride_name', title: 'Bride Name' },
        { name: 'groom_name', title: 'Groom Name' },
        { name: 'partner1_name', title: 'Partner 1 Name' },
        { name: 'partner2_name', title: 'Partner 2 Name' },
      ];

      for (const field of fields) {
        const testField = { ...field, type: 'text', required: true };

        openai.chat.completions.create.mockResolvedValue({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  type: 'partner_name',
                  confidence: 0.9,
                  weddingRelevance: 0.95,
                }),
              },
            },
          ],
        });

        const analysis = await fieldMapping.analyzeField(testField);
        expect(analysis.patterns).toContain('partnerNames');
      }
    });
  });

  describe('Context Awareness', () => {
    test('should provide higher confidence for wedding context', async () => {
      const weddingField = {
        id: 'venue',
        name: 'venue_name',
        title: 'Venue Name',
        type: 'text',
        formTitle: 'Wedding Planning Form',
      };

      const genericField = {
        id: 'venue',
        name: 'venue_name',
        title: 'Venue Name',
        type: 'text',
        formTitle: 'Event Planning Form',
      };

      openai.chat.completions.create
        .mockResolvedValueOnce({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  type: 'venue_name',
                  confidence: 0.9,
                  weddingRelevance: 0.95,
                }),
              },
            },
          ],
        })
        .mockResolvedValueOnce({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  type: 'venue_name',
                  confidence: 0.8,
                  weddingRelevance: 0.7,
                }),
              },
            },
          ],
        });

      const weddingAnalysis = await fieldMapping.analyzeField(weddingField);
      const genericAnalysis = await fieldMapping.analyzeField(genericField);

      expect(weddingAnalysis.context).toBe('wedding');
      expect(weddingAnalysis.confidence).toBeGreaterThan(
        genericAnalysis.confidence,
      );
    });

    test('should adjust confidence based on field position', async () => {
      const earlyField = {
        id: 'name',
        name: 'client_name',
        title: 'Name',
        type: 'text',
        index: 0, // First field
      };

      const lateField = {
        id: 'name',
        name: 'client_name',
        title: 'Name',
        type: 'text',
        index: 10, // Later field
      };

      openai.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                type: 'name',
                confidence: 0.8,
                weddingRelevance: 0.6,
              }),
            },
          },
        ],
      });

      const earlyAnalysis = await fieldMapping.analyzeField(earlyField);
      const lateAnalysis = await fieldMapping.analyzeField(lateField);

      // Early fields should have slightly higher confidence
      expect(earlyAnalysis.confidence).toBeGreaterThan(lateAnalysis.confidence);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle missing field information gracefully', async () => {
      const incompleteField = {
        id: 'unknown',
        // Missing name and title
        type: 'text',
      };

      openai.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                type: 'text',
                confidence: 0.5,
                weddingRelevance: 0.3,
              }),
            },
          },
        ],
      });

      const analysis = await fieldMapping.analyzeField(incompleteField);

      expect(analysis).toBeDefined();
      expect(analysis.confidence).toBeGreaterThan(0);
      expect(analysis.semanticType).toBeDefined();
    });

    test('should validate mapping suggestions properly', () => {
      const validMapping = {
        targetField: 'wedding_date',
        confidence: 0.8,
        reasoning: 'High pattern match',
        transformations: [],
      };

      const invalidMapping = {
        targetField: 'wedding_date',
        confidence: 0.3, // Below threshold
        reasoning: 'Low confidence match',
        transformations: [],
      };

      expect(fieldMapping.validateMapping(validMapping)).toBe(true);
      expect(fieldMapping.validateMapping(invalidMapping)).toBe(false);
    });

    test('should handle database errors during feedback recording', async () => {
      // Mock database error
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockRejectedValue(new Error('Database error')),
      });

      const feedback = {
        sourceField: 'test_field',
        suggestedField: 'test_target',
        actualField: 'actual_target',
        accepted: true,
        confidence: 0.8,
        organizationId: 'org-123',
        platformType: 'typeform',
      };

      await expect(fieldMapping.recordFeedback(feedback)).rejects.toThrow();
    });
  });

  describe('Performance Tests', () => {
    test('should analyze multiple fields efficiently', async () => {
      const fields = Array.from({ length: 20 }, (_, i) => ({
        id: `field_${i}`,
        name: `field_${i}`,
        title: `Field ${i}`,
        type: 'text',
      }));

      // Mock consistent OpenAI responses
      openai.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                type: 'text',
                confidence: 0.6,
                weddingRelevance: 0.4,
              }),
            },
          },
        ],
      });

      const startTime = Date.now();

      const analyses = await Promise.all(
        fields.map((field) => fieldMapping.analyzeField(field)),
      );

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      expect(analyses).toHaveLength(20);
      expect(totalTime).toBeLessThan(10000); // Should complete within 10 seconds
    });

    test('should generate suggestions efficiently for large target sets', async () => {
      const field = {
        id: 'test_field',
        name: 'test_field',
        title: 'Test Field',
        type: 'text',
      };

      // Create large set of target fields
      const targets = Array.from({ length: 50 }, (_, i) => ({
        name: `target_${i}`,
        type: 'text',
        category: 'general' as const,
        description: `Target field ${i}`,
        synonyms: [`synonym_${i}`],
        patterns: [`pattern_${i}`],
      }));

      openai.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                type: 'text',
                confidence: 0.6,
                weddingRelevance: 0.4,
              }),
            },
          },
        ],
      });

      const startTime = Date.now();

      const suggestions = await fieldMapping.suggestMapping(field, targets);

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(suggestions.length).toBeLessThanOrEqual(3); // Max 3 suggestions
      expect(processingTime).toBeLessThan(3000); // Should complete within 3 seconds
    });
  });
});
