/**
 * WS-207 FAQ Extraction AI - AI FAQ Processor Unit Tests
 * Team E - Round 1 - Wedding-Specific Categorization Testing
 *
 * CRITICAL: >90% test coverage for AI FAQ categorization and processing
 * Tests wedding-specific scenarios for photographers, venues, planners
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FAQProcessor } from '@/lib/ai/faq-processor';
import { FAQItem } from '@/types/faq';
import { OpenAI } from 'openai';

// Mock OpenAI
vi.mock('openai', () => ({
  OpenAI: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: vi.fn(),
      },
    },
  })),
}));

// Mock logger
vi.mock('@/lib/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('FAQProcessor', () => {
  let processor: FAQProcessor;
  let mockOpenAI: any;

  beforeEach(() => {
    mockOpenAI = new OpenAI();
    processor = new FAQProcessor({
      openaiApiKey: 'test-key',
      model: 'gpt-4',
      maxTokens: 1000,
      temperature: 0.3,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Constructor and Configuration', () => {
    it('should initialize with default configuration', () => {
      const defaultProcessor = new FAQProcessor();
      expect(defaultProcessor).toBeDefined();
    });

    it('should accept custom configuration', () => {
      const customProcessor = new FAQProcessor({
        model: 'gpt-3.5-turbo',
        maxTokens: 2000,
        temperature: 0.5,
      });
      expect(customProcessor).toBeDefined();
    });
  });

  describe('Wedding Photography FAQ Categorization', () => {
    it('should correctly categorize pricing FAQs', async () => {
      const mockFAQs: Partial<FAQItem>[] = [
        {
          question: 'What are your wedding photography packages?',
          answer:
            'We offer three packages: Essential ($2,500), Premium ($3,500), and Luxury ($5,000). All include online gallery and edited photos.',
        },
        {
          question: 'Do you require a deposit?',
          answer:
            'Yes, we require a 50% deposit to secure your date. The remaining balance is due 2 weeks before the wedding.',
        },
        {
          question: 'What is included in your engagement session?',
          answer:
            'Engagement sessions include 1 hour of photography, 50+ edited photos, and access to our styling guide.',
        },
      ];

      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                categories: [
                  {
                    faq_index: 0,
                    category: 'pricing',
                    confidence: 0.95,
                    subcategory: 'packages',
                  },
                  {
                    faq_index: 1,
                    category: 'booking',
                    confidence: 0.92,
                    subcategory: 'deposits',
                  },
                  {
                    faq_index: 2,
                    category: 'services',
                    confidence: 0.88,
                    subcategory: 'engagement',
                  },
                ],
              }),
            },
          },
        ],
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const categorized = await processor.categorizeFAQs(mockFAQs, {
        vendorType: 'photographer',
        businessType: 'wedding_photographer',
      });

      expect(categorized).toHaveLength(3);
      expect(categorized[0].ai_suggested_category).toBe('pricing');
      expect(categorized[0].ai_confidence_score).toBe(0.95);
      expect(categorized[0].ai_subcategory).toBe('packages');

      expect(categorized[1].ai_suggested_category).toBe('booking');
      expect(categorized[1].ai_confidence_score).toBe(0.92);
      expect(categorized[1].ai_subcategory).toBe('deposits');

      expect(categorized[2].ai_suggested_category).toBe('services');
      expect(categorized[2].ai_confidence_score).toBe(0.88);
      expect(categorized[2].ai_subcategory).toBe('engagement');
    });

    it('should handle photography technical FAQs', async () => {
      const mockFAQs: Partial<FAQItem>[] = [
        {
          question: 'What equipment do you use?',
          answer:
            'I use Canon R5 cameras with professional lenses, multiple flashes, and backup equipment for every wedding.',
        },
        {
          question: 'How do you handle low light situations?',
          answer:
            'I specialize in low light photography using fast lenses and professional lighting techniques. No flash during ceremony.',
        },
      ];

      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                categories: [
                  {
                    faq_index: 0,
                    category: 'technical',
                    confidence: 0.91,
                    subcategory: 'equipment',
                  },
                  {
                    faq_index: 1,
                    category: 'technical',
                    confidence: 0.89,
                    subcategory: 'lighting',
                  },
                ],
              }),
            },
          },
        ],
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const categorized = await processor.categorizeFAQs(mockFAQs, {
        vendorType: 'photographer',
        businessType: 'wedding_photographer',
      });

      expect(categorized[0].ai_suggested_category).toBe('technical');
      expect(categorized[0].ai_subcategory).toBe('equipment');
      expect(categorized[1].ai_suggested_category).toBe('technical');
      expect(categorized[1].ai_subcategory).toBe('lighting');
    });

    it('should categorize photography logistics FAQs', async () => {
      const mockFAQs: Partial<FAQItem>[] = [
        {
          question: 'How long does it take to receive our photos?',
          answer:
            'You will receive a sneak peek within 48 hours and your complete gallery within 6-8 weeks.',
        },
        {
          question: 'Do you travel for weddings?',
          answer:
            'Yes! I travel anywhere for weddings. Travel fees apply for locations over 50 miles from Chicago.',
        },
      ];

      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                categories: [
                  {
                    faq_index: 0,
                    category: 'logistics',
                    confidence: 0.93,
                    subcategory: 'delivery',
                  },
                  {
                    faq_index: 1,
                    category: 'logistics',
                    confidence: 0.87,
                    subcategory: 'travel',
                  },
                ],
              }),
            },
          },
        ],
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const categorized = await processor.categorizeFAQs(mockFAQs, {
        vendorType: 'photographer',
      });

      expect(categorized[0].ai_suggested_category).toBe('logistics');
      expect(categorized[0].ai_subcategory).toBe('delivery');
      expect(categorized[1].ai_suggested_category).toBe('logistics');
      expect(categorized[1].ai_subcategory).toBe('travel');
    });
  });

  describe('Wedding Venue FAQ Categorization', () => {
    it('should correctly categorize venue rental and capacity FAQs', async () => {
      const mockFAQs: Partial<FAQItem>[] = [
        {
          question: 'What is your venue rental fee?',
          answer:
            'Our venue rental is $3,500 for 8 hours, including tables, chairs, and basic lighting. Additional hours are $400 each.',
        },
        {
          question: 'What is the maximum capacity for your venue?',
          answer:
            'Our main ballroom accommodates 200 guests for dinner and dancing, or 250 for cocktail style reception.',
        },
        {
          question: 'Do you allow outside catering?',
          answer:
            'We have a list of preferred caterers, but you may use outside catering with a $500 fee and proof of insurance.',
        },
      ];

      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                categories: [
                  {
                    faq_index: 0,
                    category: 'pricing',
                    confidence: 0.94,
                    subcategory: 'rental_fees',
                  },
                  {
                    faq_index: 1,
                    category: 'capacity',
                    confidence: 0.96,
                    subcategory: 'guest_limits',
                  },
                  {
                    faq_index: 2,
                    category: 'policies',
                    confidence: 0.89,
                    subcategory: 'catering',
                  },
                ],
              }),
            },
          },
        ],
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const categorized = await processor.categorizeFAQs(mockFAQs, {
        vendorType: 'venue',
        businessType: 'wedding_venue',
      });

      expect(categorized[0].ai_suggested_category).toBe('pricing');
      expect(categorized[0].ai_subcategory).toBe('rental_fees');
      expect(categorized[1].ai_suggested_category).toBe('capacity');
      expect(categorized[1].ai_subcategory).toBe('guest_limits');
      expect(categorized[2].ai_suggested_category).toBe('policies');
      expect(categorized[2].ai_subcategory).toBe('catering');
    });

    it('should categorize venue amenities and policies', async () => {
      const mockFAQs: Partial<FAQItem>[] = [
        {
          question: 'What amenities are included with the venue?',
          answer:
            'Included: tables, chairs, linens, sound system, bridal suite, grooms room, parking, and on-site coordinator.',
        },
        {
          question: 'What is your cancellation policy?',
          answer:
            'Cancellations 12+ months: 75% refund. 6-12 months: 50% refund. Less than 6 months: 25% refund.',
        },
      ];

      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                categories: [
                  {
                    faq_index: 0,
                    category: 'amenities',
                    confidence: 0.92,
                    subcategory: 'included_items',
                  },
                  {
                    faq_index: 1,
                    category: 'policies',
                    confidence: 0.95,
                    subcategory: 'cancellation',
                  },
                ],
              }),
            },
          },
        ],
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const categorized = await processor.categorizeFAQs(mockFAQs, {
        vendorType: 'venue',
      });

      expect(categorized[0].ai_suggested_category).toBe('amenities');
      expect(categorized[1].ai_suggested_category).toBe('policies');
      expect(categorized[1].ai_subcategory).toBe('cancellation');
    });
  });

  describe('Wedding Planner FAQ Categorization', () => {
    it('should categorize planner service levels and pricing', async () => {
      const mockFAQs: Partial<FAQItem>[] = [
        {
          question: 'What does your full planning service include?',
          answer:
            'Full planning includes venue selection, vendor coordination, timeline creation, budget management, and day-of coordination. Investment starts at $4,500.',
        },
        {
          question: 'Do you offer day-of coordination only?',
          answer:
            'Yes! Day-of coordination includes timeline creation, vendor management, and 10 hours of coordination on your wedding day for $1,200.',
        },
        {
          question: 'How many meetings are included?',
          answer:
            'Full planning includes unlimited meetings. Day-of coordination includes 2 planning meetings and unlimited email/phone support.',
        },
      ];

      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                categories: [
                  {
                    faq_index: 0,
                    category: 'services',
                    confidence: 0.93,
                    subcategory: 'full_planning',
                  },
                  {
                    faq_index: 1,
                    category: 'services',
                    confidence: 0.91,
                    subcategory: 'day_of_coordination',
                  },
                  {
                    faq_index: 2,
                    category: 'logistics',
                    confidence: 0.87,
                    subcategory: 'meetings',
                  },
                ],
              }),
            },
          },
        ],
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const categorized = await processor.categorizeFAQs(mockFAQs, {
        vendorType: 'planner',
        businessType: 'wedding_planner',
      });

      expect(categorized[0].ai_suggested_category).toBe('services');
      expect(categorized[0].ai_subcategory).toBe('full_planning');
      expect(categorized[1].ai_suggested_category).toBe('services');
      expect(categorized[1].ai_subcategory).toBe('day_of_coordination');
      expect(categorized[2].ai_suggested_category).toBe('logistics');
      expect(categorized[2].ai_subcategory).toBe('meetings');
    });
  });

  describe('Duplicate Detection', () => {
    it('should detect duplicate FAQs with high similarity', async () => {
      const mockFAQs: Partial<FAQItem>[] = [
        {
          question: 'What is your pricing for wedding photography?',
          answer:
            'Our packages start at $2,500 for wedding photography services with 8 hours of coverage.',
        },
        {
          question: 'How much do you charge for wedding photos?',
          answer:
            'We offer wedding photography packages starting from $2,500 including 8 hours of shooting.',
        },
        {
          question: 'What are your rates for wedding shoots?',
          answer:
            'Wedding photography pricing begins at $2,500 for our basic package with 8 hour coverage.',
        },
      ];

      const duplicates = await processor.detectDuplicates(mockFAQs);

      expect(duplicates).toHaveLength(1);
      expect(duplicates[0].duplicates).toHaveLength(3);
      expect(duplicates[0].similarity_score).toBeGreaterThan(0.85);
      expect(duplicates[0].primary_faq_index).toBe(0);
      expect(duplicates[0].duplicate_indices).toEqual([1, 2]);
    });

    it('should not flag dissimilar FAQs as duplicates', async () => {
      const mockFAQs: Partial<FAQItem>[] = [
        {
          question: 'What is your pricing for wedding photography?',
          answer:
            'Our packages start at $2,500 for wedding photography services.',
        },
        {
          question: 'What equipment do you use?',
          answer:
            'I use Canon R5 cameras with professional lenses and lighting equipment.',
        },
        {
          question: 'How do you handle rain on wedding day?',
          answer:
            'We always have backup plans including covered locations and umbrellas for photos.',
        },
      ];

      const duplicates = await processor.detectDuplicates(mockFAQs);

      expect(duplicates).toHaveLength(0);
    });

    it('should handle edge case of single FAQ', async () => {
      const mockFAQs: Partial<FAQItem>[] = [
        {
          question: 'What is your pricing?',
          answer: 'Our pricing starts at $2,500.',
        },
      ];

      const duplicates = await processor.detectDuplicates(mockFAQs);

      expect(duplicates).toHaveLength(0);
    });
  });

  describe('Confidence Score Validation', () => {
    it('should flag low confidence categorizations for manual review', async () => {
      const mockFAQs: Partial<FAQItem>[] = [
        {
          question: 'Some unclear question about stuff?',
          answer:
            'This is a very ambiguous answer that could fit multiple categories or none at all.',
        },
      ];

      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                categories: [
                  {
                    faq_index: 0,
                    category: 'other',
                    confidence: 0.45,
                    subcategory: 'unclear',
                  },
                ],
              }),
            },
          },
        ],
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const categorized = await processor.categorizeFAQs(mockFAQs, {
        vendorType: 'photographer',
      });

      expect(categorized[0].ai_confidence_score).toBe(0.45);
      expect(categorized[0].requires_manual_review).toBe(true);
      expect(categorized[0].ai_suggested_category).toBe('other');
    });

    it('should accept high confidence categorizations automatically', async () => {
      const mockFAQs: Partial<FAQItem>[] = [
        {
          question: 'What are your wedding photography package prices?',
          answer:
            'Our wedding photography packages are: Basic $2,500, Premium $3,500, Luxury $5,000.',
        },
      ];

      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                categories: [
                  {
                    faq_index: 0,
                    category: 'pricing',
                    confidence: 0.97,
                    subcategory: 'packages',
                  },
                ],
              }),
            },
          },
        ],
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const categorized = await processor.categorizeFAQs(mockFAQs, {
        vendorType: 'photographer',
      });

      expect(categorized[0].ai_confidence_score).toBe(0.97);
      expect(categorized[0].requires_manual_review).toBe(false);
      expect(categorized[0].ai_suggested_category).toBe('pricing');
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed AI responses gracefully', async () => {
      const mockFAQs: Partial<FAQItem>[] = [
        {
          question: 'Test question?',
          answer: 'Test answer',
        },
      ];

      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Invalid JSON response',
            },
          },
        ],
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      await expect(
        processor.categorizeFAQs(mockFAQs, { vendorType: 'photographer' }),
      ).rejects.toThrow(/Failed to parse AI response/);
    });

    it('should handle OpenAI API errors', async () => {
      const mockFAQs: Partial<FAQItem>[] = [
        {
          question: 'Test question?',
          answer: 'Test answer',
        },
      ];

      const apiError = new Error('API rate limit exceeded');
      apiError.name = 'RateLimitError';
      mockOpenAI.chat.completions.create.mockRejectedValue(apiError);

      await expect(
        processor.categorizeFAQs(mockFAQs, { vendorType: 'photographer' }),
      ).rejects.toThrow('API rate limit exceeded');
    });

    it('should handle empty FAQ arrays', async () => {
      const mockFAQs: Partial<FAQItem>[] = [];

      const categorized = await processor.categorizeFAQs(mockFAQs, {
        vendorType: 'photographer',
      });

      expect(categorized).toHaveLength(0);
      expect(mockOpenAI.chat.completions.create).not.toHaveBeenCalled();
    });

    it('should handle missing question or answer fields', async () => {
      const mockFAQs: Partial<FAQItem>[] = [
        {
          question: 'Valid question?',
          // Missing answer
        },
        {
          // Missing question
          answer: 'Valid answer',
        },
        {
          question: 'Complete FAQ?',
          answer: 'Complete answer',
        },
      ];

      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                categories: [
                  {
                    faq_index: 2,
                    category: 'other',
                    confidence: 0.85,
                    subcategory: 'general',
                  },
                ],
              }),
            },
          },
        ],
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const categorized = await processor.categorizeFAQs(mockFAQs, {
        vendorType: 'photographer',
      });

      // Should only process the complete FAQ
      expect(categorized).toHaveLength(1);
      expect(categorized[0].question).toBe('Complete FAQ?');
    });
  });

  describe('Category Quality Assessment', () => {
    it('should assess content quality for wedding vendor FAQs', async () => {
      const mockFAQs: Partial<FAQItem>[] = [
        {
          question:
            'What are your wedding photography packages and what do they include?',
          answer:
            'We offer three comprehensive packages: Essential ($2,500) includes 8 hours of coverage, online gallery, and 500+ edited photos. Premium ($3,500) adds engagement session and second shooter. Luxury ($5,000) includes everything plus bridal prep coverage and premium album.',
        },
        {
          question: 'Price?',
          answer: '$2500',
        },
      ];

      const qualityAssessment = await processor.assessContentQuality(mockFAQs);

      expect(qualityAssessment).toHaveLength(2);

      // First FAQ should have high quality score
      expect(qualityAssessment[0].quality_score).toBeGreaterThan(0.8);
      expect(qualityAssessment[0].completeness).toBe('complete');
      expect(qualityAssessment[0].clarity).toBe('clear');

      // Second FAQ should have low quality score
      expect(qualityAssessment[1].quality_score).toBeLessThan(0.4);
      expect(qualityAssessment[1].completeness).toBe('incomplete');
      expect(qualityAssessment[1].clarity).toBe('unclear');
    });

    it('should identify FAQs needing improvement', async () => {
      const mockFAQs: Partial<FAQItem>[] = [
        {
          question: 'Availability?',
          answer: 'Maybe',
        },
        {
          question:
            'What is your pricing structure for wedding photography services?',
          answer:
            'Our wedding photography pricing varies based on coverage hours, package inclusions, and seasonal demand. Please contact us for detailed pricing information tailored to your specific needs and wedding date.',
        },
      ];

      const qualityAssessment = await processor.assessContentQuality(mockFAQs);

      expect(qualityAssessment[0].needs_improvement).toBe(true);
      expect(qualityAssessment[0].improvement_suggestions).toContain(
        'expand answer',
      );

      expect(qualityAssessment[1].needs_improvement).toBe(false);
      expect(qualityAssessment[1].quality_score).toBeGreaterThan(0.7);
    });
  });

  describe('Wedding Vendor Context Recognition', () => {
    it('should adjust categorization based on vendor type context', async () => {
      const sameFAQ: Partial<FAQItem>[] = [
        {
          question: 'What equipment do you provide?',
          answer:
            'We provide professional sound systems, microphones, and lighting equipment.',
        },
      ];

      // Test as DJ
      const djResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                categories: [
                  {
                    faq_index: 0,
                    category: 'services',
                    confidence: 0.91,
                    subcategory: 'audio_equipment',
                  },
                ],
              }),
            },
          },
        ],
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(djResponse);

      const djCategorized = await processor.categorizeFAQs(sameFAQ, {
        vendorType: 'dj',
        businessType: 'wedding_dj',
      });

      expect(djCategorized[0].ai_subcategory).toBe('audio_equipment');

      // Test as venue
      const venueResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                categories: [
                  {
                    faq_index: 0,
                    category: 'amenities',
                    confidence: 0.89,
                    subcategory: 'included_equipment',
                  },
                ],
              }),
            },
          },
        ],
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(venueResponse);

      const venueCategorized = await processor.categorizeFAQs(sameFAQ, {
        vendorType: 'venue',
        businessType: 'wedding_venue',
      });

      expect(venueCategorized[0].ai_subcategory).toBe('included_equipment');
    });

    it('should recognize wedding-specific terminology', async () => {
      const weddingFAQs: Partial<FAQItem>[] = [
        {
          question: 'Do you attend the rehearsal dinner?',
          answer:
            'Rehearsal dinner coverage is available as an add-on service for $400.',
        },
        {
          question: 'What about getting ready photos?',
          answer:
            'Bridal prep and getting ready photos are included in our Premium and Luxury packages.',
        },
      ];

      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                categories: [
                  {
                    faq_index: 0,
                    category: 'services',
                    confidence: 0.92,
                    subcategory: 'rehearsal_dinner',
                  },
                  {
                    faq_index: 1,
                    category: 'services',
                    confidence: 0.94,
                    subcategory: 'bridal_prep',
                  },
                ],
              }),
            },
          },
        ],
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const categorized = await processor.categorizeFAQs(weddingFAQs, {
        vendorType: 'photographer',
      });

      expect(categorized[0].ai_subcategory).toBe('rehearsal_dinner');
      expect(categorized[1].ai_subcategory).toBe('bridal_prep');
    });
  });

  describe('Batch Processing', () => {
    it('should handle large batches of FAQs efficiently', async () => {
      const largeBatch = Array.from({ length: 50 }, (_, i) => ({
        question: `Wedding question ${i + 1}?`,
        answer: `Wedding answer ${i + 1} with sufficient detail for testing purposes.`,
      }));

      const mockCategories = largeBatch.map((_, index) => ({
        faq_index: index,
        category: 'services',
        confidence: 0.85,
        subcategory: 'general',
      }));

      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({ categories: mockCategories }),
            },
          },
        ],
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const startTime = Date.now();
      const categorized = await processor.categorizeFAQs(largeBatch, {
        vendorType: 'photographer',
      });
      const endTime = Date.now();

      expect(categorized).toHaveLength(50);
      expect(endTime - startTime).toBeLessThan(10000); // Should complete within 10 seconds
    });

    it('should batch API requests for efficiency', async () => {
      const batchSize = 20;
      const faqs = Array.from({ length: batchSize }, (_, i) => ({
        question: `FAQ ${i + 1}?`,
        answer: `Answer ${i + 1}`,
      }));

      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                categories: faqs.map((_, index) => ({
                  faq_index: index,
                  category: 'other',
                  confidence: 0.8,
                })),
              }),
            },
          },
        ],
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      await processor.categorizeFAQs(faqs, { vendorType: 'photographer' });

      // Should make only one API call for the batch
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(1);
    });
  });
});
