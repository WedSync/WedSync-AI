import {
  describe,
  it,
  expect,
  jest,
  beforeEach,
  afterEach,
} from '@jest/globals';
import { AITicketClassifier } from '@/lib/support/ai-classifier';
import { createClient } from '@supabase/supabase-js';

// Mock Supabase client
jest.mock('@supabase/supabase-js');
const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        order: jest.fn(() => ({
          limit: jest.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
    })),
    insert: jest.fn(() => Promise.resolve({ data: {}, error: null })),
  })),
};

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

describe('AITicketClassifier', () => {
  let classifier: AITicketClassifier;
  let mockOpenAI: any;

  beforeEach(() => {
    (createClient as jest.Mock).mockReturnValue(mockSupabase);
    classifier = new AITicketClassifier();
    mockOpenAI = require('openai').default();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Wedding Emergency Detection', () => {
    it('should detect wedding day emergencies correctly', async () => {
      const emergencyTexts = [
        "My wedding is TODAY and the photographer hasn't shown up!",
        'URGENT: Reception venue locked and ceremony starts in 1 hour',
        "Wedding emergency - flowers for tomorrow's wedding are wrong color",
        'Live wedding happening now - need immediate help with music',
        "This weekend is my wedding and I can't access my timeline",
      ];

      for (const text of emergencyTexts) {
        const result = await classifier.classifyTicket({
          title: 'Emergency',
          description: text,
          customer_tier: 'professional',
        });

        expect(result.is_wedding_emergency).toBe(true);
        expect(result.priority).toBe('wedding_emergency');
        expect(result.confidence_score).toBeGreaterThan(0.8);
      }
    });

    it('should not flag non-emergencies as wedding emergencies', async () => {
      const nonEmergencyTexts = [
        'Planning my wedding for next year',
        'Question about payment plans for my 2025 wedding',
        'Can I change my venue booking for next month?',
        'General inquiry about services',
        'Wedding planning tips request',
      ];

      for (const text of nonEmergencyTexts) {
        const result = await classifier.classifyTicket({
          title: 'Question',
          description: text,
          customer_tier: 'starter',
        });

        expect(result.is_wedding_emergency).toBe(false);
        expect(result.priority).not.toBe('wedding_emergency');
      }
    });
  });

  describe('Category Classification', () => {
    it('should correctly classify technical support tickets', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                category: 'technical_support',
                subcategory: 'login_issues',
                priority: 'high',
                confidence: 0.9,
                reasoning: 'User cannot access their account',
              }),
            },
          },
        ],
      });

      const result = await classifier.classifyTicket({
        title: "Can't log into my account",
        description:
          "I've tried multiple times to log in but keep getting errors",
        customer_tier: 'professional',
      });

      expect(result.category).toBe('technical_support');
      expect(result.subcategory).toBe('login_issues');
      expect(result.priority).toBe('high');
      expect(result.confidence_score).toBe(0.9);
    });

    it('should handle billing inquiries correctly', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                category: 'billing_payments',
                subcategory: 'subscription_changes',
                priority: 'medium',
                confidence: 0.85,
                reasoning: 'Customer wants to upgrade subscription',
              }),
            },
          },
        ],
      });

      const result = await classifier.classifyTicket({
        title: 'Want to upgrade to Professional plan',
        description: "I'm currently on Starter and need more features",
        customer_tier: 'starter',
      });

      expect(result.category).toBe('billing_payments');
      expect(result.subcategory).toBe('subscription_changes');
      expect(result.priority).toBe('medium');
    });
  });

  describe('Priority Assignment', () => {
    it('should assign higher priority to Enterprise customers', async () => {
      const standardTicket = {
        title: 'Feature request',
        description: 'Would like to see reporting feature',
        customer_tier: 'enterprise' as const,
      };

      const result = await classifier.classifyTicket(standardTicket);

      // Enterprise customers should get elevated priority
      expect(['high', 'urgent', 'wedding_emergency']).toContain(
        result.priority,
      );
    });

    it('should assign appropriate priority to Free customers', async () => {
      const standardTicket = {
        title: 'Question about features',
        description: 'What features are available in paid plans?',
        customer_tier: 'free' as const,
      };

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                category: 'general_inquiry',
                subcategory: 'product_information',
                priority: 'low',
                confidence: 0.8,
                reasoning: 'General product inquiry',
              }),
            },
          },
        ],
      });

      const result = await classifier.classifyTicket(standardTicket);

      expect(['low', 'medium']).toContain(result.priority);
    });
  });

  describe('Pattern Matching', () => {
    it('should detect refund requests', async () => {
      const refundTexts = [
        'I want to cancel and get a refund',
        'Can I get my money back?',
        'Request for refund of last payment',
        'Refund please - service not working',
      ];

      for (const text of refundTexts) {
        const result = await classifier.classifyTicket({
          title: 'Refund',
          description: text,
          customer_tier: 'professional',
        });

        expect(result.category).toBe('billing_payments');
        expect(result.subcategory).toBe('refunds');
      }
    });

    it('should detect integration issues', async () => {
      const integrationTexts = [
        'Tave integration not working',
        "Can't sync with HoneyBook",
        'Google Calendar sync failed',
        'Integration with my CRM is broken',
      ];

      for (const text of integrationTexts) {
        const result = await classifier.classifyTicket({
          title: 'Integration Problem',
          description: text,
          customer_tier: 'scale',
        });

        expect(result.category).toBe('integrations');
      }
    });
  });

  describe('Confidence Scoring', () => {
    it('should provide high confidence for clear patterns', async () => {
      const result = await classifier.classifyTicket({
        title: 'WEDDING EMERGENCY - ceremony starts in 30 minutes',
        description:
          "My wedding is happening RIGHT NOW and I can't access my timeline. Help!",
        customer_tier: 'professional',
      });

      expect(result.confidence_score).toBeGreaterThan(0.9);
      expect(result.is_wedding_emergency).toBe(true);
    });

    it('should provide lower confidence for ambiguous requests', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                category: 'general_inquiry',
                subcategory: 'other',
                priority: 'low',
                confidence: 0.6,
                reasoning: 'Unclear request',
              }),
            },
          },
        ],
      });

      const result = await classifier.classifyTicket({
        title: 'Question',
        description: 'I have a question',
        customer_tier: 'free',
      });

      expect(result.confidence_score).toBeLessThan(0.7);
    });
  });

  describe('Learning and Improvement', () => {
    it('should store classification results for learning', async () => {
      const mockInsert = jest.fn(() =>
        Promise.resolve({ data: {}, error: null }),
      );
      mockSupabase.from = jest.fn(() => ({
        insert: mockInsert,
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => ({
              limit: jest.fn(() => Promise.resolve({ data: [], error: null })),
            })),
          })),
        })),
      }));

      await classifier.classifyTicket({
        title: 'Test ticket',
        description: 'Test description',
        customer_tier: 'professional',
      });

      expect(mockInsert).toHaveBeenCalled();
      const insertedData = mockInsert.mock.calls[0][0];
      expect(insertedData).toHaveProperty('classification_data');
      expect(insertedData).toHaveProperty('confidence_score');
    });

    it('should learn from historical similar tickets', async () => {
      // Mock historical data
      mockSupabase.from = jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => ({
              limit: jest.fn(() =>
                Promise.resolve({
                  data: [
                    {
                      classification_data: {
                        category: 'technical_support',
                        subcategory: 'login_issues',
                      },
                      confidence_score: 0.95,
                    },
                  ],
                  error: null,
                }),
              ),
            })),
          })),
        })),
        insert: jest.fn(() => Promise.resolve({ data: {}, error: null })),
      }));

      const result = await classifier.classifyTicket({
        title: 'Login problem',
        description: 'Cannot login to account',
        customer_tier: 'professional',
      });

      // Should benefit from historical learning
      expect(result.confidence_score).toBeGreaterThan(0.8);
    });
  });

  describe('Error Handling', () => {
    it('should handle OpenAI API failures gracefully', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValue(
        new Error('API Error'),
      );

      const result = await classifier.classifyTicket({
        title: 'Test ticket',
        description: 'Test description',
        customer_tier: 'professional',
      });

      // Should fallback to pattern matching
      expect(result).toBeDefined();
      expect(result.category).toBeDefined();
      expect(result.priority).toBeDefined();
    });

    it('should handle malformed OpenAI responses', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: 'Invalid JSON response',
            },
          },
        ],
      });

      const result = await classifier.classifyTicket({
        title: 'Test ticket',
        description: 'Test description',
        customer_tier: 'professional',
      });

      // Should fallback gracefully
      expect(result).toBeDefined();
      expect(result.confidence_score).toBeLessThan(0.5); // Lower confidence for fallback
    });
  });

  describe('Performance', () => {
    it('should classify tickets within acceptable time limits', async () => {
      const startTime = Date.now();

      await classifier.classifyTicket({
        title: 'Performance test',
        description: 'Testing classification speed',
        customer_tier: 'professional',
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within 5 seconds
      expect(duration).toBeLessThan(5000);
    });

    it('should handle bulk classification efficiently', async () => {
      const tickets = Array.from({ length: 10 }, (_, i) => ({
        title: `Test ticket ${i}`,
        description: `Test description ${i}`,
        customer_tier: 'professional' as const,
      }));

      const startTime = Date.now();

      const results = await Promise.all(
        tickets.map((ticket) => classifier.classifyTicket(ticket)),
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(results).toHaveLength(10);
      expect(results.every((r) => r.category && r.priority)).toBe(true);

      // Should process 10 tickets in under 30 seconds
      expect(duration).toBeLessThan(30000);
    });
  });
});
