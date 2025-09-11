/**
 * Wedding Context Analyzer Tests
 * WS-242: AI PDF Analysis System - Wedding Intelligence Testing
 */

import { WeddingContextAnalyzer } from '@/lib/services/weddingContextAnalyzer';

// Mock OpenAI
jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn()
      }
    }
  }))
}));

describe('WeddingContextAnalyzer', () => {
  let analyzer: WeddingContextAnalyzer;
  let mockOpenAI: any;

  beforeEach(() => {
    jest.clearAllMocks();
    analyzer = new (WeddingContextAnalyzer as any)();
    mockOpenAI = (analyzer as any).openai;
  });

  describe('analyzeWeddingContext', () => {
    const sampleWeddingText = `
      Bride: Emily Johnson
      Groom: James Smith
      Wedding Date: 15th June 2024
      Venue: Ashridge House, Hertfordshire
      Guest Count: 120
      Photography Package: Full Day Coverage
      Budget: £8,500
      Contact: emily@example.com
      Phone: 07123 456789
    `;

    it('should extract wedding fields with high confidence', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              extractedFields: [
                { fieldName: 'bride_name', value: 'Emily Johnson', confidence: 0.95, fieldType: 'client_name' },
                { fieldName: 'groom_name', value: 'James Smith', confidence: 0.95, fieldType: 'client_name' },
                { fieldName: 'wedding_date', value: '2024-06-15', confidence: 0.98, fieldType: 'wedding_date' },
                { fieldName: 'venue_name', value: 'Ashridge House', confidence: 0.92, fieldType: 'venue_name' },
                { fieldName: 'guest_count', value: '120', confidence: 0.90, fieldType: 'guest_count' },
                { fieldName: 'budget', value: '8500', confidence: 0.88, fieldType: 'budget' },
                { fieldName: 'email', value: 'emily@example.com', confidence: 0.99, fieldType: 'email' },
                { fieldName: 'phone', value: '07123 456789', confidence: 0.96, fieldType: 'phone' }
              ],
              isWeddingRelated: true,
              confidence: 0.94,
              weddingType: 'traditional',
              industryContext: {
                primaryService: 'photography',
                documentType: 'booking_form',
                urgency: 'normal'
              }
            })
          }
        }],
        usage: {
          prompt_tokens: 150,
          completion_tokens: 200,
          total_tokens: 350
        }
      });

      const result = await analyzer.analyzeWeddingContext(sampleWeddingText, {
        maxCost: 500,
        priorityFields: ['client_name', 'wedding_date', 'email']
      });

      expect(result).toEqual({
        isWeddingRelated: true,
        extractedFields: expect.arrayContaining([
          expect.objectContaining({
            fieldName: 'bride_name',
            extractedValue: 'Emily Johnson',
            confidence: 0.95
          })
        ]),
        confidence: 0.94,
        cost: expect.any(Number),
        processingTime: expect.any(Number),
        weddingContext: expect.objectContaining({
          weddingType: 'traditional',
          industryContext: expect.any(Object)
        })
      });

      expect(result.extractedFields).toHaveLength(8);
      expect(result.cost).toBeLessThan(500); // Should be under cost limit
    });

    it('should use pattern matching before AI when possible', async () => {
      const simpleText = 'Email: test@wedding.com';

      const result = await analyzer.analyzeWeddingContext(simpleText);

      // Should match email pattern without calling OpenAI
      expect(mockOpenAI.chat.completions.create).not.toHaveBeenCalled();
      expect(result.extractedFields).toContainEqual(
        expect.objectContaining({
          fieldName: 'email',
          extractedValue: 'test@wedding.com'
        })
      );
    });

    it('should respect cost limits', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: '{"extractedFields": [], "isWeddingRelated": true}' } }],
        usage: { prompt_tokens: 2000, completion_tokens: 1000, total_tokens: 3000 }
      });

      await expect(
        analyzer.analyzeWeddingContext(sampleWeddingText, { maxCost: 100 })
      ).rejects.toThrow('Cost limit would be exceeded');
    });

    it('should handle AI service failures gracefully', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValue(
        new Error('OpenAI service unavailable')
      );

      await expect(
        analyzer.analyzeWeddingContext(sampleWeddingText)
      ).rejects.toThrow('Failed to analyze wedding context');
    });

    it('should detect non-wedding documents', async () => {
      const nonWeddingText = 'Invoice for office supplies. Amount: £500. Due date: 30 days.';

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              extractedFields: [],
              isWeddingRelated: false,
              confidence: 0.15
            })
          }
        }],
        usage: { prompt_tokens: 50, completion_tokens: 30, total_tokens: 80 }
      });

      const result = await analyzer.analyzeWeddingContext(nonWeddingText);

      expect(result.isWeddingRelated).toBe(false);
      expect(result.confidence).toBeLessThan(0.5);
    });
  });

  describe('isWeddingRelatedText', () => {
    it('should identify wedding-related keywords', () => {
      const weddingTexts = [
        'bride and groom names',
        'wedding ceremony venue',
        'marriage reception details',
        'honeymoon package booking'
      ];

      weddingTexts.forEach(text => {
        expect(analyzer.isWeddingRelatedText(text)).toBe(true);
      });
    });

    it('should reject non-wedding content', () => {
      const nonWeddingTexts = [
        'office lease agreement',
        'car insurance policy',
        'medical appointment form'
      ];

      nonWeddingTexts.forEach(text => {
        expect(analyzer.isWeddingRelatedText(text)).toBe(false);
      });
    });

    it('should handle edge cases', () => {
      expect(analyzer.isWeddingRelatedText('')).toBe(false);
      expect(analyzer.isWeddingRelatedText('   ')).toBe(false);
      expect(analyzer.isWeddingRelatedText('a')).toBe(false);
    });
  });

  describe('extractWeddingFields', () => {
    it('should extract fields using regex patterns', () => {
      const text = `
        Client: John & Jane Doe
        Email: john.doe@example.com
        Mobile: 07123 456789
        Wedding Date: 25/12/2024
        Venue: The Grand Hotel
        Guests: 150
        Budget: £12,000
      `;

      const fields = analyzer.extractWeddingFields(text);

      expect(fields).toContainEqual(
        expect.objectContaining({
          fieldType: 'email',
          extractedValue: 'john.doe@example.com'
        })
      );

      expect(fields).toContainEqual(
        expect.objectContaining({
          fieldType: 'phone',
          extractedValue: expect.stringContaining('07123')
        })
      );

      expect(fields).toContainEqual(
        expect.objectContaining({
          fieldType: 'wedding_date',
          extractedValue: expect.stringMatching(/25.*12.*2024/)
        })
      );
    });

    it('should handle multiple formats for the same field type', () => {
      const multiFormatText = `
        Phone: 07123 456789
        Telephone: +44 7987 654321
        Mobile: 0789 123 4567
      `;

      const fields = analyzer.extractWeddingFields(multiFormatText);
      const phoneFields = fields.filter(f => f.fieldType === 'phone');

      expect(phoneFields.length).toBeGreaterThan(1);
    });

    it('should assign appropriate confidence scores', () => {
      const text = 'Email: clear@example.com';
      const fields = analyzer.extractWeddingFields(text);
      
      const emailField = fields.find(f => f.fieldType === 'email');
      expect(emailField?.confidence).toBeGreaterThan(0.8);
    });
  });

  describe('optimizeAIUsage', () => {
    it('should prefer pattern matching over AI when patterns exist', async () => {
      const textWithClearPatterns = `
        Bride: Sarah Connor
        Email: sarah@example.com
        Phone: 07123 456789
      `;

      await analyzer.analyzeWeddingContext(textWithClearPatterns);

      // Should extract patterns first, only use AI for remaining fields
      const aiCallCount = mockOpenAI.chat.completions.create.mock.calls.length;
      expect(aiCallCount).toBeLessThanOrEqual(1);
    });

    it('should cache similar requests', async () => {
      const text = 'Wedding at The Manor House';
      
      await analyzer.analyzeWeddingContext(text);
      await analyzer.analyzeWeddingContext(text); // Second identical request

      // Second call should use cache, not make another AI request
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('calculateCost', () => {
    it('should calculate cost based on token usage', () => {
      const cost = (analyzer as any).calculateCost(1000, 500);
      
      expect(cost).toBeGreaterThan(0);
      expect(cost).toBeLessThan(1000); // Should be reasonable cost
    });

    it('should handle zero token usage', () => {
      const cost = (analyzer as any).calculateCost(0, 0);
      expect(cost).toBe(0);
    });
  });

  describe('validateExtractedFields', () => {
    it('should validate email format', () => {
      const validEmail = { fieldType: 'email', extractedValue: 'test@example.com' };
      const invalidEmail = { fieldType: 'email', extractedValue: 'not-an-email' };

      expect((analyzer as any).validateExtractedFields([validEmail])).toHaveLength(1);
      expect((analyzer as any).validateExtractedFields([invalidEmail])).toHaveLength(0);
    });

    it('should validate UK phone numbers', () => {
      const validPhone = { fieldType: 'phone', extractedValue: '07123 456789' };
      const invalidPhone = { fieldType: 'phone', extractedValue: '123' };

      expect((analyzer as any).validateExtractedFields([validPhone])).toHaveLength(1);
      expect((analyzer as any).validateExtractedFields([invalidPhone])).toHaveLength(0);
    });

    it('should validate date formats', () => {
      const validDate = { fieldType: 'wedding_date', extractedValue: '25/12/2024' };
      const invalidDate = { fieldType: 'wedding_date', extractedValue: 'next Tuesday' };

      expect((analyzer as any).validateExtractedFields([validDate])).toHaveLength(1);
      expect((analyzer as any).validateExtractedFields([invalidDate])).toHaveLength(0);
    });

    it('should validate budget amounts', () => {
      const validBudget = { fieldType: 'budget', extractedValue: '£5,000' };
      const invalidBudget = { fieldType: 'budget', extractedValue: 'expensive' };

      expect((analyzer as any).validateExtractedFields([validBudget])).toHaveLength(1);
      expect((analyzer as any).validateExtractedFields([invalidBudget])).toHaveLength(0);
    });
  });

  describe('enhanceWithWeddingIntelligence', () => {
    it('should add wedding-specific context to extracted fields', () => {
      const fields = [
        { fieldName: 'client_name', extractedValue: 'John Smith', fieldType: 'client_name' },
        { fieldName: 'wedding_date', extractedValue: '2024-06-15', fieldType: 'wedding_date' }
      ];

      const enhanced = (analyzer as any).enhanceWithWeddingIntelligence(fields);

      expect(enhanced).toContainEqual(
        expect.objectContaining({
          fieldName: 'client_name',
          weddingContext: expect.objectContaining({
            importance: 'critical',
            tips: expect.arrayContaining([expect.stringContaining('spelling')])
          })
        })
      );
    });

    it('should identify field relationships', () => {
      const fields = [
        { fieldName: 'bride_name', extractedValue: 'Jane Doe', fieldType: 'client_name' },
        { fieldName: 'groom_name', extractedValue: 'John Smith', fieldType: 'client_name' }
      ];

      const enhanced = (analyzer as any).enhanceWithWeddingIntelligence(fields);
      
      const brideField = enhanced.find((f: any) => f.fieldName === 'bride_name');
      expect(brideField?.weddingContext?.relatedFields).toContain('groom_name');
    });
  });
});