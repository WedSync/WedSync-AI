/**
 * AI Classifier Tests
 * WS-235: Support Operations Ticket Management System
 * 
 * Tests for the AI-powered ticket classification service
 */

import { AITicketClassifier } from '@/lib/support/ai-classifier';
import type { ClassificationRequest, TicketClassification } from '@/lib/support/ai-classifier';

// Mock OpenAI
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{
            message: {
              content: JSON.stringify({
                category: 'billing',
                type: 'billing',
                priority: 'high',
                vendorType: 'photographer',
                tags: ['payment', 'urgent'],
                confidence: 0.85,
                reasoning: 'Payment failure detected',
                isWeddingEmergency: false,
                urgencyScore: 7,
                suggestedTemplate: 'payment_failure_help'
              })
            }
          }]
        })
      }
    }
  }));
});

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        order: jest.fn(() => ({
          data: [],
          error: null
        }))
      }))
    })),
    rpc: jest.fn(() => ({
      data: null,
      error: null
    }))
  }
}));

describe('AITicketClassifier', () => {
  let classifier: AITicketClassifier;

  beforeEach(() => {
    classifier = new AITicketClassifier();
    jest.clearAllMocks();
  });

  describe('classify', () => {
    const mockRequest: ClassificationRequest = {
      subject: 'Payment failed for my wedding photography package',
      description: 'My credit card was declined when trying to upgrade to professional plan',
      userType: 'supplier',
      userTier: 'professional',
      accountAge: 30,
      previousTicketCount: 2
    };

    it('should classify ticket using pattern matching for known patterns', async () => {
      const mockRequestEmergency: ClassificationRequest = {
        subject: 'URGENT: Wedding ceremony today - photos not syncing!',
        description: 'My couples wedding is in 2 hours and the photo gallery is not working',
        userType: 'supplier',
        userTier: 'professional',
        accountAge: 365,
        previousTicketCount: 1
      };

      const result = await classifier.classify(mockRequestEmergency);

      expect(result).toBeDefined();
      expect(result.isWeddingEmergency).toBe(true);
      expect(result.priority).toBe('critical');
      expect(result.method).toBe('pattern_match');
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should fall back to AI classification when patterns dont match', async () => {
      const result = await classifier.classify(mockRequest);

      expect(result).toBeDefined();
      expect(result.category).toBe('billing');
      expect(result.type).toBe('billing');
      expect(result.priority).toBe('high');
      expect(result.method).toBe('ai_classification');
      expect(result.confidence).toBeGreaterThanOrEqual(0.75);
    });

    it('should handle data loss scenarios with critical priority', async () => {
      const dataLossRequest: ClassificationRequest = {
        subject: 'All my client data disappeared',
        description: 'I lost all my wedding client information, 50 couples are affected',
        userType: 'supplier',
        userTier: 'scale',
        accountAge: 180
      };

      const result = await classifier.classify(dataLossRequest);

      expect(result).toBeDefined();
      expect(result.priority).toBe('critical');
      expect(result.category).toBe('data_loss');
      expect(result.tags).toContain('data_loss');
    });

    it('should adjust priority based on user tier', async () => {
      const enterpriseRequest: ClassificationRequest = {
        ...mockRequest,
        userTier: 'enterprise'
      };

      const freeRequest: ClassificationRequest = {
        ...mockRequest,
        userTier: 'free'
      };

      const enterpriseResult = await classifier.classify(enterpriseRequest);
      const freeResult = await classifier.classify(freeRequest);

      // Enterprise users should get higher priority treatment
      expect(enterpriseResult.urgencyScore).toBeGreaterThanOrEqual(freeResult.urgencyScore);
    });

    it('should detect wedding emergency keywords correctly', async () => {
      const emergencyKeywords = [
        'wedding today',
        'ceremony in 1 hour',
        'urgent wedding emergency',
        'bride is panicking',
        'reception tonight'
      ];

      for (const keyword of emergencyKeywords) {
        const request: ClassificationRequest = {
          subject: `Help needed: ${keyword}`,
          description: 'Need immediate assistance',
          userType: 'supplier',
          userTier: 'professional'
        };

        const result = await classifier.classify(request);
        expect(result.isWeddingEmergency).toBe(true);
        expect(result.urgencyScore).toBeGreaterThanOrEqual(8);
      }
    });

    it('should identify vendor types correctly', async () => {
      const vendorTests = [
        { text: 'photographer portfolio upload', expected: 'photographer' },
        { text: 'DJ music playlist sync', expected: 'dj' },
        { text: 'venue booking calendar', expected: 'venue' },
        { text: 'florist inventory management', expected: 'florist' }
      ];

      for (const test of vendorTests) {
        const request: ClassificationRequest = {
          subject: test.text,
          description: `Issue with ${test.text}`,
          userType: 'supplier',
          userTier: 'professional'
        };

        const result = await classifier.classify(request);
        expect(result.vendorType).toBe(test.expected);
      }
    });

    it('should provide fallback classification when AI fails', async () => {
      // Mock AI failure
      const OpenAI = require('openai');
      const mockOpenAI = new OpenAI();
      mockOpenAI.chat.completions.create.mockRejectedValueOnce(new Error('API Error'));

      const result = await classifier.classify(mockRequest);

      expect(result).toBeDefined();
      expect(result.method).toBe('fallback');
      expect(result.category).toBeDefined();
      expect(result.type).toBeDefined();
      expect(result.priority).toBeDefined();
    });

    it('should handle missing required fields gracefully', async () => {
      const minimalRequest: ClassificationRequest = {
        subject: 'Help',
        description: 'Need help',
        userType: 'supplier',
        userTier: 'free'
      };

      const result = await classifier.classify(minimalRequest);

      expect(result).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.method).toBeDefined();
    });

    it('should calculate appropriate urgency scores', async () => {
      const testCases = [
        {
          request: {
            subject: 'Wedding emergency - ceremony in 1 hour!',
            description: 'Critical issue',
            userType: 'supplier' as const,
            userTier: 'enterprise' as const,
            urgencyKeywords: ['urgent', 'emergency', 'asap']
          },
          expectedUrgency: { min: 9, max: 10 }
        },
        {
          request: {
            subject: 'General question about features',
            description: 'Non-urgent inquiry',
            userType: 'supplier' as const,
            userTier: 'free' as const
          },
          expectedUrgency: { min: 1, max: 4 }
        }
      ];

      for (const testCase of testCases) {
        const result = await classifier.classify(testCase.request);
        expect(result.urgencyScore).toBeGreaterThanOrEqual(testCase.expectedUrgency.min);
        expect(result.urgencyScore).toBeLessThanOrEqual(testCase.expectedUrgency.max);
      }
    });

    it('should suggest appropriate templates based on classification', async () => {
      const templateTests = [
        {
          request: {
            subject: 'Payment failed urgent help needed',
            description: 'Credit card declined',
            userType: 'supplier' as const,
            userTier: 'professional' as const
          },
          expectedTemplate: 'payment_failure_help'
        },
        {
          request: {
            subject: 'Wedding emergency today',
            description: 'Ceremony in 2 hours',
            userType: 'supplier' as const,
            userTier: 'professional' as const
          },
          expectedTemplate: 'wedding_day_emergency'
        }
      ];

      for (const test of templateTests) {
        const result = await classifier.classify(test.request);
        if (result.suggestedTemplate) {
          expect(result.suggestedTemplate).toContain(test.expectedTemplate.split('_')[0]);
        }
      }
    });
  });

  describe('pattern matching', () => {
    it('should load and use built-in patterns', async () => {
      const builtinPatternTests = [
        'wedding ceremony today urgent help',
        'all data missing disappeared lost',
        'payment card declined failed billing',
        'form not saving submit error',
        'cannot login access locked out',
        'security breach unauthorized access'
      ];

      for (const testText of builtinPatternTests) {
        const request: ClassificationRequest = {
          subject: testText,
          description: testText,
          userType: 'supplier',
          userTier: 'professional'
        };

        const result = await classifier.classify(request);
        expect(result).toBeDefined();
        expect(result.confidence).toBeGreaterThan(0.5);
      }
    });
  });

  describe('error handling', () => {
    it('should return emergency fallback when everything fails', async () => {
      // Mock all methods to fail
      const OpenAI = require('openai');
      const mockOpenAI = new OpenAI();
      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('Complete failure'));

      const result = await classifier.classify({
        subject: 'Test subject',
        description: 'Test description',
        userType: 'supplier',
        userTier: 'free'
      });

      expect(result).toBeDefined();
      expect(result.method).toBe('fallback');
      expect(result.category).toBeDefined();
      expect(result.priority).toBeDefined();
    });
  });

  describe('wedding industry specifics', () => {
    it('should recognize wedding industry terminology', async () => {
      const weddingTerms = [
        'bride and groom',
        'ceremony and reception', 
        'wedding photographer',
        'venue booking',
        'guest RSVP',
        'wedding planner',
        'bouquet and flowers',
        'wedding dress',
        'marriage celebration'
      ];

      for (const term of weddingTerms) {
        const request: ClassificationRequest = {
          subject: `Issue with ${term}`,
          description: `Problem related to ${term}`,
          userType: 'supplier',
          userTier: 'professional'
        };

        const result = await classifier.classify(request);
        expect(result.tags.some(tag => 
          tag.includes('wedding') || 
          tag.includes('ceremony') || 
          tag.includes('vendor')
        )).toBe(true);
      }
    });

    it('should prioritize Saturday wedding issues', async () => {
      const saturdayRequest: ClassificationRequest = {
        subject: 'Issue with Saturday wedding',
        description: 'Problem occurring on wedding day Saturday',
        userType: 'supplier',
        userTier: 'professional'
      };

      const result = await classifier.classify(saturdayRequest);
      expect(result.urgencyScore).toBeGreaterThanOrEqual(7);
      expect(result.tags).toContain('time_sensitive');
    });
  });
});