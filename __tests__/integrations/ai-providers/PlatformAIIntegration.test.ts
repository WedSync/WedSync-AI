/**
 * PlatformAIIntegration Test Suite  
 * Tests for WedSync's OpenAI integration with tier-based quota management
 * 
 * WS-239 Team C - Integration Focus
 */

import { PlatformAIIntegrationService, PlatformAIRequest } from '../../../src/lib/integrations/ai-providers/PlatformAIIntegration';
import OpenAI from 'openai';

// Mock OpenAI and Supabase
jest.mock('openai');
jest.mock('@supabase/supabase-js');
jest.mock('../../../src/lib/utils/logger');

const mockOpenAI = {
  chat: {
    completions: {
      create: jest.fn()
    }
  },
  embeddings: {
    create: jest.fn()
  }
};

const mockSupabase = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({ data: null, error: null }),
  upsert: jest.fn().mockResolvedValue({ error: null }),
  rpc: jest.fn().mockResolvedValue({ error: null })
};

(OpenAI as jest.Mock).mockImplementation(() => mockOpenAI);

describe('PlatformAIIntegrationService', () => {
  let platformAI: PlatformAIIntegrationService;

  const mockPlatformRequest: PlatformAIRequest = {
    id: 'req-123',
    supplierId: 'supplier-123',
    supplierTier: 'professional',
    requestType: 'email_template',
    payload: {
      templateType: 'welcome',
      vendorType: 'photographer',
      context: {
        vendorName: 'Test Photography',
        clientName: 'Jane & John Doe',
        weddingDate: '2025-06-15'
      },
      tone: 'professional'
    },
    priority: 'medium',
    weddingDate: new Date('2025-06-15'),
    isWeddingDay: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock responses
    mockOpenAI.chat.completions.create.mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify({
            subject: 'Welcome to Test Photography',
            body: 'Dear Jane & John,\n\nWelcome to Test Photography...'
          })
        }
      }],
      usage: {
        prompt_tokens: 150,
        completion_tokens: 200,
        total_tokens: 350
      },
      model: 'gpt-4'
    });

    mockOpenAI.embeddings.create.mockResolvedValue({
      data: [{
        embedding: new Array(1536).fill(0.1)
      }],
      usage: {
        prompt_tokens: 50,
        total_tokens: 50
      }
    });

    mockSupabase.single.mockResolvedValue({
      data: {
        id: 'supplier-123',
        subscription_tier: 'professional',
        subscription_status: 'active',
        ai_quota_used: 50000,
        ai_quota_reset_date: '2025-02-01'
      },
      error: null
    });

    // Initialize service
    platformAI = new PlatformAIIntegrationService();
    (platformAI as any).supabase = mockSupabase;
  });

  describe('executePlatformRequest', () => {
    it('should successfully execute email template request', async () => {
      const response = await platformAI.executePlatformRequest(mockPlatformRequest);

      expect(response.success).toBe(true);
      expect(response.data).toEqual({
        subject: 'Welcome to Test Photography',
        body: 'Dear Jane & John,\n\nWelcome to Test Photography...'
      });
      expect(response.usage).toEqual({
        prompt_tokens: 150,
        completion_tokens: 200,
        total_tokens: 350
      });
      expect(response.cost).toBeGreaterThan(0);
      expect(response.processingTime).toBeGreaterThan(0);
    });

    it('should handle image analysis requests', async () => {
      const imageRequest: PlatformAIRequest = {
        ...mockPlatformRequest,
        requestType: 'image_analysis',
        payload: {
          imageBase64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
        }
      };

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              primary_category: 'ceremony',
              confidence: 0.95,
              quality_score: 8,
              tags: [{ tag: 'bride', confidence: 0.9 }]
            })
          }
        }],
        usage: { prompt_tokens: 200, completion_tokens: 150, total_tokens: 350 },
        model: 'gpt-4-vision-preview'
      });

      const response = await platformAI.executePlatformRequest(imageRequest);

      expect(response.success).toBe(true);
      expect(response.data.primary_category).toBe('ceremony');
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4-vision-preview',
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.arrayContaining([
                expect.objectContaining({ type: 'text' }),
                expect.objectContaining({ type: 'image_url' })
              ])
            })
          ])
        })
      );
    });

    it('should handle text completion requests', async () => {
      const textRequest: PlatformAIRequest = {
        ...mockPlatformRequest,
        requestType: 'text_completion',
        payload: {
          messages: [
            { role: 'user', content: 'Generate wedding venue description' }
          ],
          max_tokens: 500
        }
      };

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: 'A beautiful wedding venue with stunning gardens...'
          }
        }],
        usage: { prompt_tokens: 100, completion_tokens: 250, total_tokens: 350 },
        model: 'gpt-4'
      });

      const response = await platformAI.executePlatformRequest(textRequest);

      expect(response.success).toBe(true);
      expect(response.data).toBe('A beautiful wedding venue with stunning gardens...');
    });

    it('should handle embedding requests', async () => {
      const embeddingRequest: PlatformAIRequest = {
        ...mockPlatformRequest,
        requestType: 'embedding',
        payload: {
          text: 'Wedding photography services'
        }
      };

      const response = await platformAI.executePlatformRequest(embeddingRequest);

      expect(response.success).toBe(true);
      expect(response.data).toHaveLength(1536);
      expect(mockOpenAI.embeddings.create).toHaveBeenCalledWith({
        model: 'text-embedding-3-small',
        input: 'Wedding photography services'
      });
    });

    it('should validate supplier access before processing', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'supplier-123',
          subscription_tier: 'professional',
          subscription_status: 'inactive',
          ai_quota_used: 50000,
          ai_quota_reset_date: '2025-02-01'
        },
        error: null
      });

      const response = await platformAI.executePlatformRequest(mockPlatformRequest);

      expect(response.success).toBe(false);
      expect(response.error).toContain('Subscription not active');
    });

    it('should enforce tier limits', async () => {
      const starterRequest: PlatformAIRequest = {
        ...mockPlatformRequest,
        supplierTier: 'starter'
      };

      // Mock estimate to exceed starter tier limit
      (platformAI as any).estimateTokenUsage = jest.fn().mockResolvedValue(3000);

      const response = await platformAI.executePlatformRequest(starterRequest);

      expect(response.success).toBe(false);
      expect(response.error).toContain('exceeds tier limit');
    });

    it('should apply seasonal multiplier during wedding season', async () => {
      // Mock current date to be in wedding season
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-06-15'));

      const response = await platformAI.executePlatformRequest(mockPlatformRequest);

      expect(response.success).toBe(true);
      expect(response.metadata?.seasonal_multiplier).toBe(1.5);

      jest.useRealTimers();
    });

    it('should handle OpenAI API errors gracefully', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValue(
        new Error('OpenAI API rate limit exceeded')
      );

      const response = await platformAI.executePlatformRequest(mockPlatformRequest);

      expect(response.success).toBe(false);
      expect(response.error).toContain('OpenAI API rate limit exceeded');
      expect(response.cost).toBe(0);
    });
  });

  describe('validatePlatformAccess', () => {
    it('should validate supplier with active subscription and available quota', async () => {
      const result = await platformAI.validatePlatformAccess('supplier-123', 'professional');

      expect(result.valid).toBe(true);
      expect(result.quotaRemaining).toBeGreaterThan(0);
      expect(mockSupabase.select).toHaveBeenCalledWith(
        'subscription_tier, subscription_status, ai_quota_used, ai_quota_reset_date'
      );
    });

    it('should reject supplier with inactive subscription', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          subscription_status: 'cancelled',
          subscription_tier: 'professional'
        },
        error: null
      });

      const result = await platformAI.validatePlatformAccess('supplier-123');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Subscription not active');
    });

    it('should reject supplier with exceeded quota', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          subscription_status: 'active',
          subscription_tier: 'starter',
          ai_quota_used: 50000, // Exceeds starter quota
          ai_quota_reset_date: '2025-02-01'
        },
        error: null
      });

      const result = await platformAI.validatePlatformAccess('supplier-123');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Monthly AI quota exceeded');
      expect(result.quotaRemaining).toBe(0);
    });

    it('should handle database errors', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: new Error('Database connection failed')
      });

      const result = await platformAI.validatePlatformAccess('supplier-123');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Supplier not found or access denied');
    });
  });

  describe('trackPlatformUsage', () => {
    it('should track usage metrics for supplier', async () => {
      const usageMetrics = {
        supplierId: 'supplier-123',
        tier: 'professional',
        tokensUsed: 350,
        requestsCount: 1,
        totalCost: 0.0105,
        periodStart: new Date('2025-01-01'),
        periodEnd: new Date('2025-01-31'),
        lastUpdated: new Date()
      };

      await platformAI.trackPlatformUsage('supplier-123', usageMetrics);

      expect(mockSupabase.upsert).toHaveBeenCalledWith({
        supplier_id: 'supplier-123',
        tier: 'professional',
        tokens_used: 350,
        requests_count: 1,
        total_cost: 0.0105,
        period_start: usageMetrics.periodStart.toISOString(),
        period_end: usageMetrics.periodEnd.toISOString(),
        last_updated: expect.any(String)
      });
    });

    it('should handle tracking failures gracefully', async () => {
      mockSupabase.upsert.mockResolvedValue({
        error: new Error('Database write failed')
      });

      const usageMetrics = {
        supplierId: 'supplier-123',
        tier: 'professional',
        tokensUsed: 350,
        requestsCount: 1,
        totalCost: 0.0105,
        periodStart: new Date('2025-01-01'),
        periodEnd: new Date('2025-01-31'),
        lastUpdated: new Date()
      };

      await expect(
        platformAI.trackPlatformUsage('supplier-123', usageMetrics)
      ).rejects.toThrow('Database write failed');
    });
  });

  describe('cost calculation', () => {
    it('should calculate GPT-4 costs correctly', async () => {
      const usage = {
        prompt_tokens: 1000,
        completion_tokens: 500,
        total_tokens: 1500
      };

      const cost = (platformAI as any).calculateCost('gpt-4', usage);

      // GPT-4: $0.03/1K input + $0.06/1K output = $0.03 + $0.03 = $0.06
      expect(cost).toBeCloseTo(0.06, 3);
    });

    it('should calculate GPT-3.5-turbo costs correctly', async () => {
      const usage = {
        prompt_tokens: 1000,
        completion_tokens: 500,
        total_tokens: 1500
      };

      const cost = (platformAI as any).calculateCost('gpt-3.5-turbo', usage);

      // GPT-3.5: $0.001/1K input + $0.002/1K output = $0.001 + $0.001 = $0.002
      expect(cost).toBeCloseTo(0.002, 4);
    });

    it('should handle unknown models gracefully', async () => {
      const cost = (platformAI as any).calculateCost('unknown-model', { total_tokens: 1000 });
      expect(cost).toBe(0);
    });
  });

  describe('rate limiting', () => {
    it('should enforce tier-based rate limits', async () => {
      // Create multiple rapid requests for starter tier
      const starterRequest: PlatformAIRequest = {
        ...mockPlatformRequest,
        supplierTier: 'starter'
      };

      // First 10 requests should succeed (starter limit)
      const requests = Array.from({ length: 12 }, () => 
        platformAI.executePlatformRequest(starterRequest)
      );

      const responses = await Promise.allSettled(requests);

      // Some requests should fail due to rate limiting
      const failures = responses.filter(r => r.status === 'rejected').length;
      expect(failures).toBeGreaterThan(0);
    });

    it('should allow higher rate limits for enterprise tier', async () => {
      const enterpriseRequest: PlatformAIRequest = {
        ...mockPlatformRequest,
        supplierTier: 'enterprise'
      };

      // Enterprise tier should handle more concurrent requests
      const requests = Array.from({ length: 20 }, () => 
        platformAI.executePlatformRequest(enterpriseRequest)
      );

      const responses = await Promise.allSettled(requests);
      const successes = responses.filter(r => r.status === 'fulfilled').length;

      // Enterprise should handle more requests successfully
      expect(successes).toBeGreaterThanOrEqual(15);
    });
  });

  describe('wedding content generation', () => {
    it('should generate wedding-specific content', async () => {
      const weddingContentRequest: PlatformAIRequest = {
        ...mockPlatformRequest,
        requestType: 'wedding_content',
        payload: {
          prompt: 'Generate wedding venue description for outdoor garden venue',
          max_tokens: 500,
          temperature: 0.8
        }
      };

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: 'Nestled in a beautiful garden setting, this outdoor venue offers...'
          }
        }],
        usage: { prompt_tokens: 100, completion_tokens: 200, total_tokens: 300 },
        model: 'gpt-4'
      });

      const response = await platformAI.executePlatformRequest(weddingContentRequest);

      expect(response.success).toBe(true);
      expect(response.data).toContain('garden setting');
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'system',
              content: expect.stringContaining('wedding industry content expert')
            })
          ])
        })
      );
    });
  });

  describe('token estimation', () => {
    it('should estimate token usage for different request types', async () => {
      const emailTokens = await (platformAI as any).estimateTokenUsage({
        ...mockPlatformRequest,
        requestType: 'email_template'
      });

      const imageTokens = await (platformAI as any).estimateTokenUsage({
        ...mockPlatformRequest,
        requestType: 'image_analysis'
      });

      expect(emailTokens).toBeGreaterThan(0);
      expect(imageTokens).toBeGreaterThan(emailTokens); // Image analysis typically uses more tokens
    });

    it('should apply seasonal multiplier to estimates', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-06-15')); // Peak season

      const tokens = await (platformAI as any).estimateTokenUsage(mockPlatformRequest);

      expect(tokens).toBeGreaterThan(800); // Should be base estimate * 1.5 multiplier

      jest.useRealTimers();
    });
  });

  describe('error recovery', () => {
    it('should retry on transient errors', async () => {
      mockOpenAI.chat.completions.create
        .mockRejectedValueOnce(new Error('Temporary network error'))
        .mockResolvedValue({
          choices: [{ message: { content: '{"subject":"Test","body":"Test"}' } }],
          usage: { total_tokens: 100 },
          model: 'gpt-4'
        });

      const response = await platformAI.executePlatformRequest(mockPlatformRequest);

      expect(response.success).toBe(true);
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(2);
    });
  });
});

// Integration tests
describe('PlatformAIIntegrationService Integration', () => {
  let platformAI: PlatformAIIntegrationService;

  beforeEach(() => {
    platformAI = new PlatformAIIntegrationService();
  });

  it('should handle complete email template workflow', async () => {
    const request: PlatformAIRequest = {
      id: 'integration-test-1',
      supplierId: 'test-supplier',
      supplierTier: 'professional',
      requestType: 'email_template',
      payload: {
        templateType: 'booking_confirmation',
        vendorType: 'venue',
        context: {
          vendorName: 'Grand Ballroom',
          clientName: 'Sarah & Mike',
          weddingDate: '2025-08-20',
          venueName: 'Grand Ballroom',
          packageDetails: 'Premium wedding package'
        },
        tone: 'formal',
        includeSignature: true
      },
      priority: 'high',
      weddingDate: new Date('2025-08-20')
    };

    const response = await platformAI.executePlatformRequest(request);

    expect(response.success).toBe(true);
    expect(response.metadata).toBeDefined();
    expect(response.usage?.total_tokens).toBeGreaterThan(0);
    expect(response.cost).toBeGreaterThan(0);
  });
});