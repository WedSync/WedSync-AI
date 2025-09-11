/**
 * Unit tests for EnhancedOpenAIService
 * Testing OpenAI integration with circuit breaker patterns and caching
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EnhancedOpenAIService } from '@/lib/services/EnhancedOpenAIService';
import { CircuitBreaker } from '@/lib/utils/circuit-breaker';

// Mock dependencies
vi.mock('openai');
vi.mock('@/lib/utils/circuit-breaker');
vi.mock('crypto');

// Mock OpenAI
const mockOpenAI = {
  chat: {
    completions: {
      create: vi.fn(),
    },
  },
};

// Mock circuit breaker
const mockCircuitBreaker = {
  execute: vi.fn(),
  getStats: vi.fn(),
  reset: vi.fn(),
};

vi.mock('openai', () => {
  return vi.fn().mockImplementation(() => mockOpenAI);
});

vi.mock('@/lib/utils/circuit-breaker', () => ({
  CircuitBreaker: vi.fn(),
  createOpenAICircuitBreaker: vi.fn(() => mockCircuitBreaker),
}));

vi.mock('crypto', () => ({
  randomUUID: vi.fn(() => 'test-uuid-123'),
  createHash: vi.fn(() => ({
    update: vi.fn().mockReturnThis(),
    digest: vi.fn(() => 'test-hash-abc'),
  })),
}));

describe('EnhancedOpenAIService', () => {
  let service: EnhancedOpenAIService;

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset environment
    process.env.OPENAI_API_KEY = 'test-api-key';

    // Mock circuit breaker stats
    mockCircuitBreaker.getStats.mockReturnValue({
      state: 'CLOSED',
      uptime: 95,
      failures: 2,
      successes: 48,
      requests: 50,
      lastFailureTime: Date.now() - 10000,
      lastSuccessTime: Date.now() - 1000,
    });

    service = new EnhancedOpenAIService();
  });

  afterEach(() => {
    vi.clearTimers();
  });

  describe('Constructor', () => {
    it('should throw error if OpenAI API key is missing', () => {
      delete process.env.OPENAI_API_KEY;

      expect(() => new EnhancedOpenAIService()).toThrow(
        'OpenAI API key is required',
      );
    });

    it('should initialize with correct configuration', () => {
      expect(mockOpenAI).toHaveBeenCalledWith({
        apiKey: 'test-api-key',
        timeout: 30000,
        maxRetries: 0,
      });

      expect(mockCircuitBreaker.getStats).toHaveBeenCalled();
    });
  });

  describe('generateMenu', () => {
    const mockRequest = {
      requirements: [
        {
          guest_name: 'John Doe',
          dietary_categories: { name: 'Vegetarian' },
          severity_level: 3,
          specific_notes: 'No eggs',
        },
      ],
      weddingContext: {
        weddingDate: '2024-06-15',
        venueType: 'Garden',
        guest_count: 100,
      },
      supplierContext: {
        business_name: 'Elite Catering',
        specialties: ['Italian', 'Mediterranean'],
      },
      guestCount: 100,
      budgetPerPerson: 50,
      menuStyle: 'Buffet',
      mealType: 'Dinner',
      culturalRequirements: ['Italian'],
      seasonalPreferences: ['Summer'],
    };

    const mockOpenAIResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              courses: [
                {
                  name: 'Appetizers',
                  dishes: [
                    {
                      name: 'Bruschetta',
                      ingredients: ['tomatoes', 'basil', 'bread'],
                      allergens: ['gluten'],
                      dietary_tags: ['vegetarian'],
                    },
                  ],
                },
              ],
              total_cost_per_person: 45,
              compliance_analysis: {
                compliant: true,
                violations: [],
              },
            }),
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: 500,
        completion_tokens: 300,
        total_tokens: 800,
      },
      model: 'gpt-4',
    };

    beforeEach(() => {
      mockCircuitBreaker.execute.mockImplementation(async (fn) => fn());
      mockOpenAI.chat.completions.create.mockResolvedValue(mockOpenAIResponse);
    });

    it('should generate menu successfully', async () => {
      const result = await service.generateMenu(mockRequest);

      expect(result).toEqual({
        data: expect.objectContaining({
          courses: expect.any(Array),
          total_cost_per_person: 45,
          compliance_analysis: expect.any(Object),
        }),
        usage: {
          promptTokens: 500,
          completionTokens: 300,
          totalTokens: 800,
        },
        model: 'gpt-4',
        processingTime: expect.any(Number),
        requestId: 'test-uuid-123',
        cached: false,
      });

      expect(mockCircuitBreaker.execute).toHaveBeenCalled();
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4',
        messages: expect.arrayContaining([
          { role: 'system', content: expect.stringContaining('master chef') },
          {
            role: 'user',
            content: expect.stringContaining('Generate a wedding menu'),
          },
        ]),
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 4000,
      });
    });

    it('should return cached result when available', async () => {
      // First call to populate cache
      await service.generateMenu(mockRequest);

      // Second call should return cached result
      const cachedResult = await service.generateMenu(mockRequest);

      expect(cachedResult.cached).toBe(true);
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(1);
    });

    it('should use custom options when provided', async () => {
      const options = {
        model: 'gpt-3.5-turbo',
        temperature: 0.5,
        maxTokens: 2000,
      };

      await service.generateMenu(mockRequest, options);

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-3.5-turbo',
          temperature: 0.5,
          max_tokens: 2000,
        }),
      );
    });

    it('should handle empty OpenAI response', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: null } }],
      });

      await expect(service.generateMenu(mockRequest)).rejects.toThrow(
        'Empty response from OpenAI',
      );
    });

    it('should handle invalid JSON response', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: { content: 'invalid json {' },
            finish_reason: 'stop',
          },
        ],
        usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
        model: 'gpt-4',
      });

      await expect(service.generateMenu(mockRequest)).rejects.toThrow(
        'Failed to parse OpenAI response',
      );
    });

    it('should handle invalid menu structure', async () => {
      const invalidMenuResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({ invalid: 'structure' }),
            },
            finish_reason: 'stop',
          },
        ],
        usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
        model: 'gpt-4',
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(invalidMenuResponse);

      await expect(service.generateMenu(mockRequest)).rejects.toThrow(
        'Invalid menu structure from OpenAI',
      );
    });

    it('should handle circuit breaker errors', async () => {
      const circuitBreakerError = new Error('Circuit breaker is OPEN');
      mockCircuitBreaker.execute.mockRejectedValue(circuitBreakerError);

      await expect(service.generateMenu(mockRequest)).rejects.toThrow(
        'OpenAI service temporarily unavailable',
      );
    });

    it('should handle rate limit errors', async () => {
      const rateLimitError = new Error('rate limit exceeded');
      mockCircuitBreaker.execute.mockRejectedValue(rateLimitError);

      await expect(service.generateMenu(mockRequest)).rejects.toThrow(
        'OpenAI rate limit exceeded',
      );
    });
  });

  describe('analyzeAllergens', () => {
    const mockRequest = {
      ingredients: ['wheat flour', 'eggs', 'milk', 'nuts'],
      context: 'Wedding cake preparation',
    };

    const mockAllergenResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              allergens_detected: ['gluten', 'eggs', 'dairy', 'nuts'],
              cross_contamination_risks: [
                {
                  risk: 'high',
                  reason: 'Shared equipment with nut processing',
                },
              ],
              recommendations: [
                'Use dedicated gluten-free equipment',
                'Prepare in separate area from nuts',
              ],
            }),
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: 200,
        completion_tokens: 150,
        total_tokens: 350,
      },
      model: 'gpt-3.5-turbo',
    };

    beforeEach(() => {
      mockCircuitBreaker.execute.mockImplementation(async (fn) => fn());
      mockOpenAI.chat.completions.create.mockResolvedValue(
        mockAllergenResponse,
      );
    });

    it('should analyze allergens successfully', async () => {
      const result = await service.analyzeAllergens(mockRequest);

      expect(result).toEqual({
        data: expect.objectContaining({
          allergens_detected: expect.any(Array),
          cross_contamination_risks: expect.any(Array),
          recommendations: expect.any(Array),
        }),
        usage: {
          promptTokens: 200,
          completionTokens: 150,
          totalTokens: 350,
        },
        model: 'gpt-3.5-turbo',
        processingTime: expect.any(Number),
        requestId: 'test-uuid-123',
        cached: false,
      });

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-3.5-turbo',
        messages: expect.arrayContaining([
          {
            role: 'system',
            content: expect.stringContaining('food safety expert'),
          },
          {
            role: 'user',
            content: expect.stringContaining('wheat flour, eggs, milk, nuts'),
          },
        ]),
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: 1500,
      });
    });

    it('should include context in analysis', async () => {
      await service.analyzeAllergens(mockRequest);

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            {
              role: 'user',
              content: expect.stringContaining('Wedding cake preparation'),
            },
          ]),
        }),
      );
    });

    it('should work without context', async () => {
      const requestWithoutContext = {
        ingredients: ['wheat flour', 'eggs'],
      };

      await service.analyzeAllergens(requestWithoutContext);

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            {
              role: 'user',
              content: expect.not.stringContaining('Context:'),
            },
          ]),
        }),
      );
    });
  });

  describe('generateCompletion', () => {
    const mockCompletionResponse = {
      choices: [
        {
          message: {
            content: 'This is a test completion response',
          },
        },
      ],
      usage: {
        prompt_tokens: 100,
        completion_tokens: 50,
        total_tokens: 150,
      },
      model: 'gpt-3.5-turbo',
    };

    beforeEach(() => {
      mockCircuitBreaker.execute.mockImplementation(async (fn) => fn());
      mockOpenAI.chat.completions.create.mockResolvedValue(
        mockCompletionResponse,
      );
    });

    it('should generate completion successfully', async () => {
      const result = await service.generateCompletion('Test prompt');

      expect(result).toEqual({
        data: 'This is a test completion response',
        usage: {
          promptTokens: 100,
          completionTokens: 50,
          totalTokens: 150,
        },
        model: 'gpt-3.5-turbo',
        processingTime: expect.any(Number),
        requestId: 'test-uuid-123',
        cached: false,
      });
    });

    it('should include system prompt when provided', async () => {
      await service.generateCompletion('Test prompt', 'Test system prompt');

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            { role: 'system', content: 'Test system prompt' },
            { role: 'user', content: 'Test prompt' },
          ],
        }),
      );
    });

    it('should work without system prompt', async () => {
      await service.generateCompletion('Test prompt');

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [{ role: 'user', content: 'Test prompt' }],
        }),
      );
    });
  });

  describe('getHealthStatus', () => {
    it('should return comprehensive health status', () => {
      const status = service.getHealthStatus();

      expect(status).toEqual({
        circuitBreaker: {
          state: 'CLOSED',
          uptime: 95,
          failures: 2,
          successes: 48,
          requests: 50,
          lastFailureTime: expect.any(Number),
          lastSuccessTime: expect.any(Number),
        },
        cache: {
          size: 0,
          maxSize: 1000,
          hitRate: 0,
        },
        isHealthy: true,
      });
    });

    it('should report unhealthy when circuit breaker is open', () => {
      mockCircuitBreaker.getStats.mockReturnValue({
        state: 'OPEN',
        uptime: 85,
        failures: 10,
        successes: 40,
        requests: 50,
        lastFailureTime: Date.now() - 1000,
        lastSuccessTime: Date.now() - 10000,
      });

      const status = service.getHealthStatus();

      expect(status.isHealthy).toBe(false);
    });

    it('should report unhealthy when uptime is low', () => {
      mockCircuitBreaker.getStats.mockReturnValue({
        state: 'CLOSED',
        uptime: 85, // Below 90 threshold
        failures: 8,
        successes: 42,
        requests: 50,
        lastFailureTime: Date.now() - 10000,
        lastSuccessTime: Date.now() - 1000,
      });

      const status = service.getHealthStatus();

      expect(status.isHealthy).toBe(false);
    });
  });

  describe('calculateCost', () => {
    it('should calculate cost for GPT-4', () => {
      const usage = { promptTokens: 1000, completionTokens: 500 };
      const cost = service.calculateCost(usage, 'gpt-4');

      // (1000/1000 * 0.00003) + (500/1000 * 0.00006) = 0.00003 + 0.00003 = 0.00006
      expect(cost).toBe(0.00006);
    });

    it('should calculate cost for GPT-3.5-turbo', () => {
      const usage = { promptTokens: 1000, completionTokens: 500 };
      const cost = service.calculateCost(usage, 'gpt-3.5-turbo');

      // (1000/1000 * 0.0000015) + (500/1000 * 0.000002) = 0.0000015 + 0.000001 = 0.0000025
      expect(cost).toBe(0.0000025);
    });

    it('should default to GPT-4 rates for unknown models', () => {
      const usage = { promptTokens: 1000, completionTokens: 500 };
      const cost = service.calculateCost(usage, 'unknown-model');

      expect(cost).toBe(0.00006); // Same as GPT-4
    });
  });

  describe('resetCircuitBreaker', () => {
    it('should reset circuit breaker', () => {
      service.resetCircuitBreaker();

      expect(mockCircuitBreaker.reset).toHaveBeenCalled();
    });
  });

  describe('clearCache', () => {
    it('should clear request cache', () => {
      service.clearCache();

      // Cache should be empty after clearing
      const status = service.getHealthStatus();
      expect(status.cache.size).toBe(0);
    });
  });

  describe('Cache Management', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should cleanup expired cache entries', async () => {
      const mockRequest = {
        requirements: [],
        weddingContext: {},
        supplierContext: {},
        guestCount: 50,
        budgetPerPerson: 40,
        menuStyle: 'Plated',
        mealType: 'Lunch',
      };

      mockCircuitBreaker.execute.mockImplementation(async (fn) => fn());
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: { content: JSON.stringify({ courses: [] }) },
            finish_reason: 'stop',
          },
        ],
        usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
        model: 'gpt-4',
      });

      // Generate menu to populate cache
      await service.generateMenu(mockRequest);

      // Fast forward time beyond cache timeout (30 minutes)
      vi.advanceTimersByTime(31 * 60 * 1000);

      // Trigger cleanup (normally happens every 5 minutes)
      vi.advanceTimersByTime(5 * 60 * 1000);

      // Cache should be cleaned up
      const status = service.getHealthStatus();
      expect(status.cache.size).toBe(0);
    });
  });

  describe('Error Enhancement', () => {
    it('should enhance rate limit errors', async () => {
      const rateLimitError = new Error('rate limit exceeded');
      mockCircuitBreaker.execute.mockRejectedValue(rateLimitError);

      await expect(service.generateMenu({} as any)).rejects.toThrow(
        'OpenAI rate limit exceeded. Please try again later. (test-uuid-123)',
      );
    });

    it('should enhance timeout errors', async () => {
      const timeoutError = new Error('timeout occurred');
      mockCircuitBreaker.execute.mockRejectedValue(timeoutError);

      await expect(service.generateMenu({} as any)).rejects.toThrow(
        'OpenAI request timeout. Please try again. (test-uuid-123)',
      );
    });

    it('should enhance circuit breaker errors', async () => {
      const cbError = new Error('Circuit breaker is OPEN');
      mockCircuitBreaker.execute.mockRejectedValue(cbError);

      await expect(service.generateMenu({} as any)).rejects.toThrow(
        'OpenAI service temporarily unavailable. Please try again in a few minutes. (test-uuid-123)',
      );
    });

    it('should enhance generic errors', async () => {
      const genericError = new Error('Something went wrong');
      mockCircuitBreaker.execute.mockRejectedValue(genericError);

      await expect(service.generateMenu({} as any)).rejects.toThrow(
        'generateMenu failed (test-uuid-123): Something went wrong',
      );
    });
  });
});
