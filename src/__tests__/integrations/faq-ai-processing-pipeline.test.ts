import { FAQProcessingPipeline } from '@/lib/ai/faq-processing-pipeline';
import {
  ExtractedFAQ,
  ProcessedFAQ,
  WeddingVendorContext,
} from '@/types/faq-integration';

// Mock OpenAI
jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
    })),
  };
});

describe('FAQProcessingPipeline', () => {
  let pipeline: FAQProcessingPipeline;

  const mockContext: WeddingVendorContext = {
    vendorType: 'photographer',
    specializations: ['wedding', 'portrait'],
    primaryRegions: ['London', 'Manchester'],
    averageWeddingBudget: '10k_25k',
  };

  const mockExtractedFAQs: ExtractedFAQ[] = [
    {
      id: 'faq-1',
      question: 'What is your cancellation policy?',
      answer: 'We require 30 days notice for cancellation with full refund.',
      sourceUrl: 'https://example.com/faq',
      confidence: 0.95,
      metadata: { section: 'policies' },
    },
    {
      id: 'faq-2',
      question: 'What is your cancellation policy?', // Duplicate
      answer: 'Cancellations must be made 30 days in advance for full refund.',
      sourceUrl: 'https://example.com/terms',
      confidence: 0.87,
      metadata: { section: 'terms' },
    },
    {
      id: 'faq-3',
      question: 'How much do you charge for wedding photography?',
      answer: 'Our wedding packages start from £1200 and can go up to £3500.',
      sourceUrl: 'https://example.com/pricing',
      confidence: 0.92,
      metadata: { section: 'pricing' },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    pipeline = new FAQProcessingPipeline();

    // Mock OpenAI responses for different processing stages
    const mockOpenAI = require('openai').default;
    const mockCreate =
      mockOpenAI.prototype.constructor().chat.completions.create;

    mockCreate.mockImplementation((params: any) => {
      const content = params.messages[0].content;

      if (content.includes('categorize')) {
        return Promise.resolve({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  category: 'policies',
                  subcategory: 'cancellation',
                  confidence: 0.9,
                  tags: ['cancellation', 'refund', 'policy'],
                }),
              },
            },
          ],
        });
      }

      if (content.includes('quality assessment')) {
        return Promise.resolve({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  qualityScore: 0.85,
                  completeness: 0.9,
                  clarity: 0.8,
                  accuracy: 0.9,
                  suggestions: ['Consider adding specific timeline details'],
                }),
              },
            },
          ],
        });
      }

      if (content.includes('enhance')) {
        return Promise.resolve({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  enhancedAnswer:
                    'We require 30 days notice for cancellation with full refund. This policy ensures we can accommodate other couples who may be looking for your date.',
                  weddingContext:
                    'This is particularly important during peak wedding season (May-September) when dates book quickly.',
                  improvements: [
                    'Added context about peak season',
                    'Explained rationale',
                  ],
                }),
              },
            },
          ],
        });
      }

      return Promise.resolve({
        choices: [
          {
            message: { content: '{}' },
          },
        ],
      });
    });
  });

  afterEach(() => {
    pipeline.destroy();
  });

  describe('processFAQBatch', () => {
    it('should process FAQs through all stages successfully', async () => {
      const result = await pipeline.processFAQBatch(
        mockExtractedFAQs,
        mockContext,
      );

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      expect(result.every((faq) => faq.processedAt)).toBe(true);
      expect(result.every((faq) => faq.category)).toBe(true);
      expect(result.every((faq) => faq.qualityScore !== undefined)).toBe(true);
    });

    it('should detect and merge duplicate FAQs', async () => {
      const result = await pipeline.processFAQBatch(
        mockExtractedFAQs,
        mockContext,
      );

      // Should have fewer FAQs than input due to duplicate detection
      expect(result.length).toBeLessThan(mockExtractedFAQs.length);

      // Check that duplicates were merged (only one cancellation policy FAQ)
      const cancellationFAQs = result.filter((faq) =>
        faq.question.toLowerCase().includes('cancellation'),
      );
      expect(cancellationFAQs.length).toBe(1);
    });

    it('should categorize FAQs correctly for wedding industry', async () => {
      const result = await pipeline.processFAQBatch(
        mockExtractedFAQs,
        mockContext,
      );

      result.forEach((faq) => {
        expect(faq.category).toBeDefined();
        expect(faq.subcategory).toBeDefined();
        expect([
          'policies',
          'pricing',
          'general',
          'logistics',
          'portfolio',
        ]).toContain(faq.category);
      });
    });

    it('should enhance FAQs with wedding industry context', async () => {
      const result = await pipeline.processFAQBatch(
        mockExtractedFAQs,
        mockContext,
      );

      result.forEach((faq) => {
        expect(faq.enhancedAnswer).toBeDefined();
        expect(faq.enhancedAnswer.length).toBeGreaterThan(faq.answer.length);
        expect(faq.weddingContext).toBeDefined();
      });
    });

    it('should assign quality scores to all FAQs', async () => {
      const result = await pipeline.processFAQBatch(
        mockExtractedFAQs,
        mockContext,
      );

      result.forEach((faq) => {
        expect(faq.qualityScore).toBeDefined();
        expect(faq.qualityScore).toBeGreaterThan(0);
        expect(faq.qualityScore).toBeLessThanOrEqual(1);
        expect(faq.qualityMetrics).toBeDefined();
        expect(faq.qualityMetrics!.completeness).toBeDefined();
        expect(faq.qualityMetrics!.clarity).toBeDefined();
        expect(faq.qualityMetrics!.accuracy).toBeDefined();
      });
    });

    it('should filter out low-quality FAQs', async () => {
      const lowQualityFAQ: ExtractedFAQ = {
        id: 'faq-low',
        question: 'Yes?',
        answer: 'Maybe.',
        sourceUrl: 'https://example.com/bad',
        confidence: 0.3,
        metadata: {},
      };

      const faqsWithLowQuality = [...mockExtractedFAQs, lowQualityFAQ];
      const result = await pipeline.processFAQBatch(
        faqsWithLowQuality,
        mockContext,
      );

      // Low quality FAQ should be filtered out
      expect(result.find((faq) => faq.id === 'faq-low')).toBeUndefined();
    });

    it('should handle processing errors gracefully', async () => {
      const mockOpenAI = require('openai').default;
      const mockCreate =
        mockOpenAI.prototype.constructor().chat.completions.create;

      // Mock AI failure for one stage
      mockCreate.mockRejectedValueOnce(new Error('AI service unavailable'));

      const result = await pipeline.processFAQBatch(
        mockExtractedFAQs,
        mockContext,
      );

      // Should still return results (graceful degradation)
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    it('should track processing metrics', async () => {
      const result = await pipeline.processFAQBatch(
        mockExtractedFAQs,
        mockContext,
      );

      expect(pipeline.getLastProcessingMetrics()).toBeDefined();
      const metrics = pipeline.getLastProcessingMetrics()!;

      expect(metrics.totalProcessingTime).toBeGreaterThan(0);
      expect(metrics.stageMetrics.length).toBe(6); // 6 processing stages
      expect(metrics.aiTokensUsed).toBeGreaterThan(0);
      expect(metrics.successRate).toBeGreaterThan(0);
    });

    it('should adapt processing based on vendor type', async () => {
      const venueContext: WeddingVendorContext = {
        vendorType: 'venue',
        specializations: ['outdoor', 'barn'],
        primaryRegions: ['Cotswolds'],
      };

      const result = await pipeline.processFAQBatch(
        mockExtractedFAQs,
        venueContext,
      );

      result.forEach((faq) => {
        expect(faq.weddingContext).toContain('venue');
      });
    });
  });

  describe('individual processing stages', () => {
    it('should clean content in ContentCleaningStage', async () => {
      const dirtyFAQ: ExtractedFAQ = {
        id: 'dirty-faq',
        question: '  What is your policy???  ',
        answer: '<p>We have a <strong>30-day</strong> cancellation policy.</p>',
        sourceUrl: 'https://example.com',
        confidence: 0.8,
        metadata: {},
      };

      const result = await pipeline.processFAQBatch([dirtyFAQ], mockContext);

      expect(result[0].question.trim()).toBe('What is your policy?');
      expect(result[0].answer).not.toContain('<p>');
      expect(result[0].answer).not.toContain('<strong>');
    });

    it('should detect semantic similarity in DuplicateDetectionStage', async () => {
      const similarFAQs: ExtractedFAQ[] = [
        {
          id: 'faq-1',
          question: 'What is your cancellation policy?',
          answer: 'We require 30 days notice.',
          sourceUrl: 'https://example.com/1',
          confidence: 0.9,
          metadata: {},
        },
        {
          id: 'faq-2',
          question: 'How do I cancel my booking?',
          answer: 'You need to give us 30 days notice to cancel.',
          sourceUrl: 'https://example.com/2',
          confidence: 0.85,
          metadata: {},
        },
      ];

      const result = await pipeline.processFAQBatch(similarFAQs, mockContext);

      // Should merge similar FAQs
      expect(result.length).toBe(1);
      expect(result[0].mergedFrom).toBeDefined();
      expect(result[0].mergedFrom!.length).toBe(1);
    });

    it('should validate final results in FinalValidationStage', async () => {
      const result = await pipeline.processFAQBatch(
        mockExtractedFAQs,
        mockContext,
      );

      result.forEach((faq) => {
        // All required fields should be present
        expect(faq.question).toBeTruthy();
        expect(faq.answer).toBeTruthy();
        expect(faq.category).toBeTruthy();
        expect(faq.qualityScore).toBeGreaterThan(0);
        expect(faq.processedAt).toBeTruthy();

        // Should have wedding-specific enhancements
        expect(faq.weddingContext).toBeTruthy();
        expect(faq.enhancedAnswer).toBeTruthy();
      });
    });
  });

  describe('performance and reliability', () => {
    it('should handle large batches efficiently', async () => {
      const largeBatch = Array(50)
        .fill(null)
        .map((_, index) => ({
          id: `faq-${index}`,
          question: `Question ${index}?`,
          answer: `Answer ${index}.`,
          sourceUrl: `https://example.com/${index}`,
          confidence: 0.8,
          metadata: {},
        }));

      const startTime = Date.now();
      const result = await pipeline.processFAQBatch(largeBatch, mockContext);
      const processingTime = Date.now() - startTime;

      expect(result.length).toBeGreaterThan(0);
      expect(processingTime).toBeLessThan(30000); // Should complete within 30 seconds
    });

    it('should implement timeout protection', async () => {
      const mockOpenAI = require('openai').default;
      const mockCreate =
        mockOpenAI.prototype.constructor().chat.completions.create;

      // Mock slow AI response
      mockCreate.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 35000)),
      );

      const result = await pipeline.processFAQBatch(
        [mockExtractedFAQs[0]],
        mockContext,
      );

      // Should handle timeout gracefully and return partial results
      expect(result).toBeDefined();
    });
  });
});
