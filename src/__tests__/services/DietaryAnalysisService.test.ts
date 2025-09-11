/**
 * WS-254: Comprehensive Unit Tests for DietaryAnalysisService
 * 90%+ coverage target for all service methods
 * Team B Backend Implementation
 */

import { DietaryAnalysisService } from '@/lib/services/DietaryAnalysisService';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock dependencies
vi.mock('openai');
vi.mock('@supabase/supabase-js');

// Mock implementations
const mockOpenAI = {
  chat: {
    completions: {
      create: vi.fn(),
    },
  },
};

const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(),
        order: vi.fn(() => ({
          limit: vi.fn(),
        })),
      })),
      gte: vi.fn(() => ({
        single: vi.fn(),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(),
      })),
      upsert: vi.fn(),
    })),
  })),
  auth: {
    getUser: vi.fn(),
  },
  raw: vi.fn(),
};

// Mock environment variables
const originalEnv = process.env;
beforeAll(() => {
  process.env = {
    ...originalEnv,
    OPENAI_API_KEY: 'test-openai-key',
    NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
  };
});

afterAll(() => {
  process.env = originalEnv;
});

describe('DietaryAnalysisService', () => {
  let service: DietaryAnalysisService;
  let mockCreateClient: vi.Mock;

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset OpenAI mock
    mockOpenAI.chat.completions.create.mockReset();

    // Mock Supabase createClient
    mockCreateClient = vi.fn(() => mockSupabase);
    vi.doMock('@supabase/supabase-js', () => ({
      createClient: mockCreateClient,
    }));

    // Mock OpenAI constructor
    vi.doMock('openai', () => {
      return vi.fn(() => mockOpenAI);
    });

    service = new DietaryAnalysisService();
  });

  describe('Constructor', () => {
    it('should initialize with proper configuration', () => {
      expect(service).toBeInstanceOf(DietaryAnalysisService);
      expect(mockCreateClient).toHaveBeenCalledWith(
        'https://test.supabase.co',
        'test-service-role-key',
      );
    });

    it('should throw error if OpenAI API key is missing', () => {
      delete process.env.OPENAI_API_KEY;
      expect(() => new DietaryAnalysisService()).toThrow(
        'OpenAI API key not configured',
      );
      process.env.OPENAI_API_KEY = 'test-openai-key'; // Restore
    });

    it('should throw error if Supabase configuration is missing', () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      expect(() => new DietaryAnalysisService()).toThrow(
        'Supabase configuration missing',
      );
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'; // Restore
    });
  });

  describe('generateCompliantMenu', () => {
    const validParams = {
      weddingId: '123e4567-e89b-12d3-a456-426614174000',
      guestCount: 50,
      dietaryRequirements: {
        allergies: ['nuts'],
        diets: ['vegetarian'],
        medical: [],
        preferences: [],
      },
      menuStyle: 'formal' as const,
      budgetPerPerson: 75,
      mealType: 'dinner' as const,
    };

    beforeEach(() => {
      // Mock successful database calls
      mockSupabase.from.mockImplementation((table: string) => {
        const mockQuery = {
          select: vi.fn(() => mockQuery),
          eq: vi.fn(() => mockQuery),
          single: vi.fn(),
          insert: vi.fn(() => mockQuery),
          gte: vi.fn(() => mockQuery),
          order: vi.fn(() => mockQuery),
          limit: vi.fn(),
        };

        switch (table) {
          case 'guest_dietary_requirements':
            mockQuery.single.mockResolvedValue({
              data: [
                {
                  id: '1',
                  guest_name: 'John Doe',
                  dietary_categories: {
                    name: 'Nuts',
                    category_type: 'allergy',
                    severity_level: 5,
                    common_triggers: ['peanut', 'tree nuts'],
                  },
                  severity_level: 5,
                  specific_notes: 'Severe peanut allergy',
                },
              ],
              error: null,
            });
            break;
          case 'weddings':
            mockQuery.single.mockResolvedValue({
              data: {
                id: validParams.weddingId,
                wedding_date: '2024-06-15',
                venue_type: 'outdoor',
                guest_count: 50,
              },
              error: null,
            });
            break;
          case 'user_profiles':
            mockQuery.single.mockResolvedValue({
              data: {
                business_name: 'Test Catering',
                specialties: ['Italian', 'Vegetarian'],
                service_areas: ['London'],
              },
              error: null,
            });
            break;
          case 'wedding_menus':
            mockQuery.single.mockResolvedValue({
              data: { id: 'menu-123' },
              error: null,
            });
            break;
          case 'dietary_ai_analysis':
            mockQuery.single.mockResolvedValue({ data: null, error: null });
            break;
        }

        return mockQuery;
      });

      // Mock successful OpenAI response
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                name: 'Wedding Menu',
                courses: [
                  {
                    name: 'Appetizers',
                    dishes: [
                      {
                        name: 'Bruschetta',
                        ingredients: ['tomatoes', 'basil', 'bread'],
                        allergens: [],
                        dietaryTags: ['vegetarian'],
                      },
                    ],
                  },
                ],
                totalCost: 3750,
                costPerPerson: 75,
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
      });
    });

    it('should generate menu successfully with valid parameters', async () => {
      const result = await service.generateCompliantMenu(
        validParams.weddingId,
        'user-123',
        validParams,
      );

      expect(result).toHaveProperty('menuId');
      expect(result).toHaveProperty('menu');
      expect(result.menu).toHaveProperty('courses');
      expect(result.menu.courses).toHaveLength(1);
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4',
          response_format: { type: 'json_object' },
        }),
      );
    });

    it('should handle rate limiting', async () => {
      // Mock rate limit exceeded
      const rateLimitError = new Error(
        'Rate limit exceeded for MENU_GENERATION. Try again later.',
      );
      service['checkRateLimit'] = vi.fn().mockRejectedValue(rateLimitError);

      await expect(
        service.generateCompliantMenu(
          validParams.weddingId,
          'user-123',
          validParams,
        ),
      ).rejects.toThrow('Rate limit exceeded');
    });

    it('should validate menu parameters', async () => {
      const invalidParams = {
        ...validParams,
        guestCount: -5, // Invalid guest count
      };

      await expect(
        service.generateCompliantMenu(
          validParams.weddingId,
          'user-123',
          invalidParams,
        ),
      ).rejects.toThrow('Guest count must be between 1 and 1000');
    });

    it('should handle OpenAI service errors', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValue(
        new Error('OpenAI API error'),
      );

      await expect(
        service.generateCompliantMenu(
          validParams.weddingId,
          'user-123',
          validParams,
        ),
      ).rejects.toThrow('generateCompliantMenu failed');
    });

    it('should handle invalid JSON response from OpenAI', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: { content: 'invalid json' },
            finish_reason: 'stop',
          },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        model: 'gpt-4',
      });

      await expect(
        service.generateCompliantMenu(
          validParams.weddingId,
          'user-123',
          validParams,
        ),
      ).rejects.toThrow();
    });

    it('should use cached results when available', async () => {
      // Mock cache hit
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'dietary_ai_analysis') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                gte: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: 'cache-123',
                      ai_response: {
                        menuId: 'menu-456',
                        name: 'Cached Menu',
                        courses: [],
                      },
                    },
                    error: null,
                  }),
                })),
              })),
            })),
          };
        }
        return mockSupabase.from(table);
      });

      const result = await service.generateCompliantMenu(
        validParams.weddingId,
        'user-123',
        validParams,
      );

      expect(result.menuId).toBe('menu-456');
      expect(mockOpenAI.chat.completions.create).not.toHaveBeenCalled();
    });

    it('should validate budget parameters', async () => {
      const invalidBudgetParams = {
        ...validParams,
        budgetPerPerson: 1000, // Too high
      };

      await expect(
        service.generateCompliantMenu(
          validParams.weddingId,
          'user-123',
          invalidBudgetParams,
        ),
      ).rejects.toThrow('Budget per person must be between £15 and £500');
    });

    it('should validate menu style', async () => {
      const invalidStyleParams = {
        ...validParams,
        menuStyle: 'invalid-style' as any,
      };

      await expect(
        service.generateCompliantMenu(
          validParams.weddingId,
          'user-123',
          invalidStyleParams,
        ),
      ).rejects.toThrow('Invalid menu style');
    });

    it('should validate meal type', async () => {
      const invalidMealParams = {
        ...validParams,
        mealType: 'invalid-meal' as any,
      };

      await expect(
        service.generateCompliantMenu(
          validParams.weddingId,
          'user-123',
          invalidMealParams,
        ),
      ).rejects.toThrow('Invalid meal type');
    });
  });

  describe('analyzeIngredientAllergens', () => {
    const testIngredients = ['peanuts', 'milk', 'wheat flour'];

    beforeEach(() => {
      // Mock database response for dietary categories
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'dietary_categories') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({
                data: [
                  {
                    name: 'Nuts',
                    common_triggers: ['peanut', 'tree nuts'],
                    severity_level: 5,
                    cross_contamination_risk: true,
                  },
                  {
                    name: 'Dairy',
                    common_triggers: ['milk', 'cheese'],
                    severity_level: 3,
                    cross_contamination_risk: false,
                  },
                ],
                error: null,
              }),
            })),
          };
        }
        if (table === 'dietary_ai_analysis') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                gte: vi.fn(() => ({
                  single: vi
                    .fn()
                    .mockResolvedValue({ data: null, error: null }),
                })),
              })),
            })),
          };
        }
        return mockSupabase.from(table);
      });

      // Mock AI analysis
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                allergens: ['nuts', 'dairy'],
                details: [
                  {
                    ingredient: 'peanuts',
                    allergenType: 'Nuts',
                    severity: 5,
                    crossContaminationRisk: true,
                  },
                ],
                confidence: 0.95,
              }),
            },
            finish_reason: 'stop',
          },
        ],
        usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
        model: 'gpt-3.5-turbo',
      });
    });

    it('should analyze ingredients for allergens successfully', async () => {
      const result = await service.analyzeIngredientAllergens(
        testIngredients,
        'user-123',
      );

      expect(result).toHaveProperty('allergens');
      expect(result).toHaveProperty('details');
      expect(result).toHaveProperty('confidence');
      expect(result.allergens).toContain('nuts');
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    it('should work without userId', async () => {
      const result = await service.analyzeIngredientAllergens(testIngredients);

      expect(result).toHaveProperty('allergens');
      expect(result).toHaveProperty('details');
    });

    it('should handle empty ingredients list', async () => {
      const result = await service.analyzeIngredientAllergens([]);

      expect(result.allergens).toEqual([]);
      expect(result.details).toEqual([]);
    });

    it('should combine database and AI analysis results', async () => {
      const result = await service.analyzeIngredientAllergens(
        testIngredients,
        'user-123',
      );

      // Should include both database-detected and AI-detected allergens
      expect(result.allergens.length).toBeGreaterThan(0);
    });

    it('should handle rate limiting for allergen analysis', async () => {
      const rateLimitError = new Error(
        'Rate limit exceeded for ALLERGEN_ANALYSIS. Try again later.',
      );
      service['checkRateLimit'] = vi.fn().mockRejectedValue(rateLimitError);

      await expect(
        service.analyzeIngredientAllergens(testIngredients, 'user-123'),
      ).rejects.toThrow('Rate limit exceeded');
    });
  });

  describe('calculatePortionsAndCosts', () => {
    const testMenuId = '123e4567-e89b-12d3-a456-426614174000';
    const testGuestCount = 100;

    beforeEach(() => {
      // Mock wedding menu data
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'wedding_menus') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: testMenuId,
                    menu_structure: {
                      'course-1': {
                        dishes: ['dish-1', 'dish-2'],
                      },
                    },
                    dietary_requirements_summary: {},
                  },
                  error: null,
                }),
              })),
            })),
          };
        }
        if (table === 'menu_items') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'dish-1',
                    name: 'Test Dish',
                    base_cost_per_serving: 12.5,
                    preparation_time_minutes: 30,
                  },
                  error: null,
                }),
              })),
            })),
          };
        }
        return mockSupabase.from(table);
      });
    });

    it('should calculate portions and costs successfully', async () => {
      const result = await service.calculatePortionsAndCosts(
        testMenuId,
        testGuestCount,
      );

      expect(result).toHaveProperty('menuId', testMenuId);
      expect(result).toHaveProperty('baseGuestCount', testGuestCount);
      expect(result).toHaveProperty('adjustedPortions');
      expect(result).toHaveProperty('totalCost');
      expect(result).toHaveProperty('costPerPerson');
      expect(result.adjustedPortions).toBeGreaterThan(testGuestCount); // Should include buffers
    });

    it('should handle custom options', async () => {
      const options = {
        wasteBuffer: 0.15,
        dietaryBuffer: 0.08,
        servingStyle: 'buffet',
        specialRequests: ['extra portions for kids'],
      };

      const result = await service.calculatePortionsAndCosts(
        testMenuId,
        testGuestCount,
        options,
      );

      expect(result.wasteBuffer).toBe(0.15);
      expect(result.dietaryBuffer).toBe(0.08);
    });

    it('should handle menu not found error', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'wedding_menus') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: new Error('Menu not found'),
                }),
              })),
            })),
          };
        }
        return mockSupabase.from(table);
      });

      await expect(
        service.calculatePortionsAndCosts(testMenuId, testGuestCount),
      ).rejects.toThrow('Menu not found');
    });

    it('should calculate correct adjusted portions with buffers', async () => {
      const wasteBuffer = 0.1;
      const dietaryBuffer = 0.05;
      const expectedAdjusted = Math.ceil(
        testGuestCount * (1 + wasteBuffer + dietaryBuffer),
      );

      const result = await service.calculatePortionsAndCosts(
        testMenuId,
        testGuestCount,
        {
          wasteBuffer,
          dietaryBuffer,
        },
      );

      expect(result.adjustedPortions).toBe(expectedAdjusted);
    });
  });

  describe('Private helper methods', () => {
    describe('checkRateLimit', () => {
      it('should allow requests within limits', async () => {
        // This tests the private method indirectly through public methods
        const testIngredients = ['test ingredient'];

        // Should not throw for first request
        await expect(
          service.analyzeIngredientAllergens(testIngredients, 'user-123'),
        ).resolves.toBeDefined();
      });

      it('should enforce rate limits', async () => {
        const testIngredients = ['test ingredient'];
        const userId = 'user-rate-limit';

        // Mock the rate limit map to simulate exceeded limit
        const rateLimitMap = new Map();
        rateLimitMap.set(`${userId}:ALLERGEN_ANALYSIS`, {
          count: 51, // Over the limit
          resetTime: Date.now() + 60000,
        });

        service['rateLimitMap'] = rateLimitMap;

        await expect(
          service.analyzeIngredientAllergens(testIngredients, userId),
        ).rejects.toThrow('Rate limit exceeded');
      });
    });

    describe('validateMenuParams', () => {
      it('should pass valid parameters', () => {
        const validParams = {
          weddingId: '123e4567-e89b-12d3-a456-426614174000',
          guestCount: 50,
          budgetPerPerson: 75,
          menuStyle: 'formal',
          mealType: 'dinner',
        };

        expect(() => service['validateMenuParams'](validParams)).not.toThrow();
      });

      it('should reject invalid guest count', () => {
        const invalidParams = {
          weddingId: '123e4567-e89b-12d3-a456-426614174000',
          guestCount: 0,
          budgetPerPerson: 75,
          menuStyle: 'formal',
          mealType: 'dinner',
        };

        expect(() => service['validateMenuParams'](invalidParams)).toThrow(
          'Guest count must be between 1 and 1000',
        );
      });

      it('should reject invalid budget', () => {
        const invalidParams = {
          weddingId: '123e4567-e89b-12d3-a456-426614174000',
          guestCount: 50,
          budgetPerPerson: 10,
          menuStyle: 'formal',
          mealType: 'dinner',
        };

        expect(() => service['validateMenuParams'](invalidParams)).toThrow(
          'Budget per person must be between £15 and £500',
        );
      });
    });

    describe('generateCacheKey', () => {
      it('should generate consistent cache keys', () => {
        const params1 = { weddingId: '123', guestCount: 50 };
        const params2 = { guestCount: 50, weddingId: '123' }; // Different order

        const key1 = service['generateCacheKey']('test', params1);
        const key2 = service['generateCacheKey']('test', params2);

        expect(key1).toBe(key2); // Should be same regardless of property order
        expect(key1).toMatch(/^[a-f0-9]{64}$/); // Should be SHA-256 hash
      });

      it('should generate different keys for different data', () => {
        const params1 = { weddingId: '123', guestCount: 50 };
        const params2 = { weddingId: '456', guestCount: 50 };

        const key1 = service['generateCacheKey']('test', params1);
        const key2 = service['generateCacheKey']('test', params2);

        expect(key1).not.toBe(key2);
      });
    });

    describe('calculateApiCost', () => {
      it('should calculate costs correctly', () => {
        const usage = {
          prompt_tokens: 1000,
          completion_tokens: 500,
          total_tokens: 1500,
        };

        const cost = service['calculateApiCost'](usage);

        expect(cost).toBeGreaterThan(0);
        expect(typeof cost).toBe('number');
      });

      it('should handle missing usage data', () => {
        const cost = service['calculateApiCost'](null);
        expect(cost).toBe(0);
      });
    });

    describe('handleServiceError', () => {
      it('should handle rate limit errors', () => {
        const error = new Error('rate limit exceeded');
        const enhanced = service['handleServiceError'](error, 'testOperation');

        expect(enhanced.message).toContain('Rate limit exceeded');
      });

      it('should handle OpenAI errors', () => {
        const error = new Error('OpenAI service error');
        const enhanced = service['handleServiceError'](error, 'testOperation');

        expect(enhanced.message).toContain(
          'AI service temporarily unavailable',
        );
      });

      it('should handle database errors', () => {
        const error = new Error('database connection failed');
        const enhanced = service['handleServiceError'](error, 'testOperation');

        expect(enhanced.message).toContain('Database error');
      });

      it('should handle generic errors', () => {
        const error = new Error('unknown error');
        const enhanced = service['handleServiceError'](error, 'testOperation');

        expect(enhanced.message).toContain('testOperation failed');
      });
    });
  });

  describe('Error handling edge cases', () => {
    it('should handle Supabase connection errors', () => {
      mockCreateClient.mockImplementation(() => {
        throw new Error('Failed to connect to Supabase');
      });

      expect(() => new DietaryAnalysisService()).toThrow();
    });

    it('should handle malformed dietary requirements data', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'guest_dietary_requirements') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({
                data: [{ invalid: 'data' }], // Malformed data
                error: null,
              }),
            })),
          };
        }
        return mockSupabase.from(table);
      });

      // Should handle gracefully without crashing
      const validParams = {
        weddingId: '123e4567-e89b-12d3-a456-426614174000',
        guestCount: 50,
        dietaryRequirements: {
          allergies: [],
          diets: [],
          medical: [],
          preferences: [],
        },
        menuStyle: 'formal' as const,
        budgetPerPerson: 75,
        mealType: 'dinner' as const,
      };

      await expect(
        service.generateCompliantMenu(
          validParams.weddingId,
          'user-123',
          validParams,
        ),
      ).resolves.toBeDefined();
    });

    it('should handle OpenAI timeout errors', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValue(
        new Error('Request timeout'),
      );

      const validParams = {
        weddingId: '123e4567-e89b-12d3-a456-426614174000',
        guestCount: 50,
        dietaryRequirements: {
          allergies: [],
          diets: [],
          medical: [],
          preferences: [],
        },
        menuStyle: 'formal' as const,
        budgetPerPerson: 75,
        mealType: 'dinner' as const,
      };

      await expect(
        service.generateCompliantMenu(
          validParams.weddingId,
          'user-123',
          validParams,
        ),
      ).rejects.toThrow();
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complex dietary requirements scenario', async () => {
      // Mock complex dietary requirements
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'guest_dietary_requirements') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: '1',
                    guest_name: 'Alice',
                    dietary_categories: {
                      name: 'Nuts',
                      category_type: 'allergy',
                      severity_level: 5,
                    },
                    severity_level: 5,
                  },
                  {
                    id: '2',
                    guest_name: 'Bob',
                    dietary_categories: {
                      name: 'Vegan',
                      category_type: 'diet',
                      severity_level: 3,
                    },
                    severity_level: 3,
                  },
                  {
                    id: '3',
                    guest_name: 'Carol',
                    dietary_categories: {
                      name: 'Celiac',
                      category_type: 'medical',
                      severity_level: 5,
                    },
                    severity_level: 5,
                  },
                ],
                error: null,
              }),
            })),
          };
        }
        return mockSupabase.from(table);
      });

      const complexParams = {
        weddingId: '123e4567-e89b-12d3-a456-426614174000',
        guestCount: 50,
        dietaryRequirements: {
          allergies: ['nuts'],
          diets: ['vegan'],
          medical: ['celiac'],
          preferences: [],
        },
        menuStyle: 'formal' as const,
        budgetPerPerson: 75,
        mealType: 'dinner' as const,
      };

      const result = await service.generateCompliantMenu(
        complexParams.weddingId,
        'user-123',
        complexParams,
      );

      expect(result).toHaveProperty('menuId');
      expect(result).toHaveProperty('conflicts');
      expect(result).toHaveProperty('complianceScore');
    });

    it('should handle large guest count scenario', async () => {
      const largeWeddingParams = {
        weddingId: '123e4567-e89b-12d3-a456-426614174000',
        guestCount: 500,
        dietaryRequirements: {
          allergies: [],
          diets: [],
          medical: [],
          preferences: [],
        },
        menuStyle: 'buffet' as const,
        budgetPerPerson: 45,
        mealType: 'dinner' as const,
      };

      const result = await service.calculatePortionsAndCosts(
        '123e4567-e89b-12d3-a456-426614174000',
        500,
      );

      expect(result.baseGuestCount).toBe(500);
      expect(result.adjustedPortions).toBeGreaterThan(500);
      expect(result.totalCost).toBeGreaterThan(0);
    });
  });
});

// Additional test utilities for mocking
export const createMockDietaryRequirement = (overrides = {}) => ({
  id: '123e4567-e89b-12d3-a456-426614174000',
  guest_name: 'Test Guest',
  dietary_categories: {
    name: 'Test Allergy',
    category_type: 'allergy',
    severity_level: 3,
    common_triggers: ['test'],
  },
  severity_level: 3,
  specific_notes: 'Test notes',
  ...overrides,
});

export const createMockMenuParams = (overrides = {}) => ({
  weddingId: '123e4567-e89b-12d3-a456-426614174000',
  guestCount: 50,
  dietaryRequirements: {
    allergies: [],
    diets: [],
    medical: [],
    preferences: [],
  },
  menuStyle: 'formal' as const,
  budgetPerPerson: 75,
  mealType: 'dinner' as const,
  ...overrides,
});
