/**
 * Unit tests for /api/catering/menu/validate route
 * Testing menu validation endpoint with comprehensive validation levels
 */

import { POST } from '@/app/api/catering/menu/validate/route';
import { withSecureValidation } from '@/lib/security/withSecureValidation';
import { DietaryAnalysisService } from '@/lib/services/DietaryAnalysisService';
import { NextRequest, NextResponse } from 'next/server';

// Mock dependencies
jest.mock('@/lib/security/withSecureValidation');
jest.mock('@/lib/services/DietaryAnalysisService');

const mockWithSecureValidation = withSecureValidation as jest.MockedFunction<
  typeof withSecureValidation
>;
const mockDietaryAnalysisService = DietaryAnalysisService as jest.MockedClass<
  typeof DietaryAnalysisService
>;

// Helper function to create authentication error response
const createAuthErrorResponse = () => {
  return NextResponse.json(
    { error: 'Authentication required' },
    { status: 401 }
  );
};

// Helper function to create mock auth error handler
const createAuthErrorHandler = () => {
  return async () => createAuthErrorResponse();
};

describe('/api/catering/menu/validate', () => {
  let mockRequest: NextRequest;
  let mockService: jest.Mocked<DietaryAnalysisService>;

  const mockMenu = {
    courses: [
      {
        name: 'Appetizers',
        dishes: [
          {
            name: 'Bruschetta',
            ingredients: ['tomatoes', 'basil', 'bread', 'olive oil'],
            allergens: ['gluten'],
            dietary_tags: ['vegetarian'],
            cost_per_serving: 3.5,
            preparation_time: 15,
          },
          {
            name: 'Caesar Salad',
            ingredients: ['lettuce', 'parmesan', 'croutons', 'dressing'],
            allergens: ['gluten', 'dairy'],
            dietary_tags: ['vegetarian'],
            cost_per_serving: 4.0,
            preparation_time: 10,
          },
        ],
      },
    ],
  };

  const mockRequirements = [
    {
      id: 'req_1',
      guest_name: 'John Doe',
      dietary_categories: { name: 'Vegetarian' },
      severity_level: 3,
      specific_notes: 'No eggs, but dairy is okay',
      emergency_contact: 'jane@doe.com',
    },
    {
      id: 'req_2',
      guest_name: 'Jane Smith',
      dietary_categories: { name: 'Gluten-Free' },
      severity_level: 4,
      specific_notes: 'Severe celiac disease',
      emergency_contact: 'john@smith.com',
    },
  ];

  const mockValidRequestBody = {
    menuData: mockMenu,
    requirements: mockRequirements,
    validationLevel: 'comprehensive' as const,
    generateAlternatives: true,
  };

  const mockValidationResult = {
    isCompliant: false,
    overallRiskLevel: 'medium',
    violations: [
      {
        guest_name: 'Jane Smith',
        requirement: 'Gluten-Free',
        severity: 4,
        violations: [
          {
            dish_name: 'Bruschetta',
            issue: 'Contains gluten',
            ingredients: ['bread'],
            risk_level: 'high',
            alternatives_available: true,
          },
          {
            dish_name: 'Caesar Salad',
            issue: 'Contains gluten',
            ingredients: ['croutons'],
            risk_level: 'high',
            alternatives_available: true,
          },
        ],
      },
    ],
    compliance_by_guest: {
      'John Doe': { compliant: true, violations: [] },
      'Jane Smith': { compliant: false, violations: 2 },
    },
    recommendations: [
      'Replace bread with gluten-free alternative for Bruschetta',
      'Use gluten-free croutons for Caesar Salad',
      'Consider separate preparation area for gluten-free items',
    ],
    alternatives_generated: 2,
    validation_timestamp: '2024-01-15T10:00:00Z',
  };

  // Helper functions to reduce nesting
  const createMockContext = (body = mockValidRequestBody, params = {}) => ({
    body,
    user: {
      id: 'user_123',
      email: 'user@test.com',
      role: 'authenticated',
    },
    request: mockRequest,
    params,
  });

  const createSecureValidationMock = () => (request, handler, options) => {
    return async (params) => {
      const context = createMockContext(mockValidRequestBody, params);
      return handler(context);
    };
  };

  const createAuthErrorResponse = () => {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 },
    );
  };

  const createAuthErrorHandler = () => (request, handler, options) => {
    return async () => createAuthErrorResponse();
  };

  // Helper to create expected response objects - EXTRACTED TO REDUCE NESTING
  const createExpectedErrorResponse = (error: string, message: string) => ({
    success: false,
    error,
    message,
  });

  const createExpectedValidationErrorResponse = (details: string[]) => ({
    success: false,
    error: 'Validation failed',
    details,
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock request
    mockRequest = {
      json: jest.fn().mockResolvedValue(mockValidRequestBody),
      nextUrl: { pathname: '/api/catering/menu/validate' },
      method: 'POST',
    } as unknown as NextRequest;

    // Mock service instance
    mockService = {
      validateMenuCompliance: jest.fn().mockResolvedValue(mockValidationResult),
      generateCompliantMenu: jest.fn(),
      analyzeIngredientAllergens: jest.fn(),
      calculatePortionsAndCosts: jest.fn(),
    } as unknown as jest.Mocked<DietaryAnalysisService>;

    mockDietaryAnalysisService.mockImplementation(() => mockService);

    // Mock withSecureValidation using extracted helper (reduced nesting)
    mockWithSecureValidation.mockImplementation(createSecureValidationMock());
  });

  describe('Successful Menu Validation', () => {
    it('should validate menu successfully with comprehensive validation', async () => {
      const response = await POST(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData).toEqual({
        success: true,
        data: {
          validation: mockValidationResult,
          requestId: expect.any(String),
          processingTime: expect.any(Number),
          validationLevel: 'comprehensive',
        },
        message: expect.stringContaining('violations found'),
      });

      expect(mockService.validateMenuCompliance).toHaveBeenCalledWith(
        mockMenu,
        mockRequirements,
        {
          validationLevel: 'comprehensive',
          generateAlternatives: true,
          checkCrossContamination: true,
          validateCosts: true,
          includeRecommendations: true,
        },
      );
    });

    it('should handle basic validation level', async () => {
      const basicRequest = {
        ...mockValidRequestBody,
        validationLevel: 'basic' as const,
      };

      mockRequest.json = jest.fn().mockResolvedValue(basicRequest);

      const response = await POST(mockRequest);

      expect(response.status).toBe(200);
      expect(mockService.validateMenuCompliance).toHaveBeenCalledWith(
        mockMenu,
        mockRequirements,
        expect.objectContaining({
          validationLevel: 'basic',
          checkCrossContamination: false,
          validateCosts: false,
          includeRecommendations: false,
        }),
      );
    });

    it('should handle strict validation level', async () => {
      const strictRequest = {
        ...mockValidRequestBody,
        validationLevel: 'strict' as const,
      };

      mockRequest.json = jest.fn().mockResolvedValue(strictRequest);

      const response = await POST(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(mockService.validateMenuCompliance).toHaveBeenCalledWith(
        mockMenu,
        mockRequirements,
        expect.objectContaining({
          validationLevel: 'strict',
          checkCrossContamination: true,
          validateCosts: true,
          includeRecommendations: true,
          strictMode: true,
        }),
      );
    });

    it('should return compliant validation result', async () => {
      const compliantResult = {
        ...mockValidationResult,
        isCompliant: true,
        violations: [],
        overallRiskLevel: 'low',
      };

      mockService.validateMenuCompliance.mockResolvedValue(compliantResult);

      const response = await POST(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.message).toBe(
        'Menu is fully compliant with all dietary requirements',
      );
      expect(responseData.data.validation.isCompliant).toBe(true);
    });

    it('should handle validation without alternatives generation', async () => {
      const noAlternativesRequest = {
        ...mockValidRequestBody,
        generateAlternatives: false,
      };

      mockRequest.json = jest.fn().mockResolvedValue(noAlternativesRequest);

      const response = await POST(mockRequest);

      expect(response.status).toBe(200);
      expect(mockService.validateMenuCompliance).toHaveBeenCalledWith(
        mockMenu,
        mockRequirements,
        expect.objectContaining({
          generateAlternatives: false,
        }),
      );
    });
  });

  describe('Request Validation', () => {
    it('should reject request without menu data', async () => {
      const invalidRequest = { ...mockValidRequestBody };
      delete invalidRequest.menuData;

      mockRequest.json = jest.fn().mockResolvedValue(invalidRequest);

      const response = await POST(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData).toEqual(
        createExpectedValidationErrorResponse([
          expect.stringContaining('Menu data is required'),
        ])
      );
    });

    it('should reject request with invalid validation level', async () => {
      const invalidRequest = {
        ...mockValidRequestBody,
        validationLevel: 'invalid_level',
      };

      mockRequest.json = jest.fn().mockResolvedValue(invalidRequest);

      const response = await POST(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.details).toContain(
        expect.stringContaining('validationLevel'),
      );
    });

    it('should reject request with malformed menu structure', async () => {
      const invalidRequest = {
        ...mockValidRequestBody,
        menuData: {
          // Missing required courses array
          invalid: 'structure',
        },
      };

      mockRequest.json = jest.fn().mockResolvedValue(invalidRequest);

      const response = await POST(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.details).toContain(
        expect.stringContaining('courses'),
      );
    });

    it('should validate dietary requirements format', async () => {
      const invalidRequest = {
        ...mockValidRequestBody,
        requirements: [
          {
            // Missing required fields
            guest_name: 'John Doe',
          },
        ],
      };

      mockRequest.json = jest.fn().mockResolvedValue(invalidRequest);

      const response = await POST(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.details.length).toBeGreaterThan(0);
    });

    it('should validate dish structure in menu', async () => {
      const invalidMenuRequest = {
        ...mockValidRequestBody,
        menuData: {
          courses: [
            {
              name: 'Appetizers',
              dishes: [
                {
                  name: 'Bruschetta',
                  // Missing required ingredients array
                  allergens: ['gluten'],
                },
              ],
            },
          ],
        },
      };

      mockRequest.json = jest.fn().mockResolvedValue(invalidMenuRequest);

      const response = await POST(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.details).toContain(
        expect.stringContaining('ingredients'),
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      const serviceError = new Error('Menu validation service unavailable');
      mockService.validateMenuCompliance.mockRejectedValue(serviceError);

      const response = await POST(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData).toEqual({
        success: false,
        error: 'Menu validation failed',
        message: 'Unable to validate menu at this time. Please try again.',
        requestId: expect.any(String),
      });
    });

    it('should handle complex dietary conflicts', async () => {
      const complexError = new Error('Complex dietary conflicts detected');
      complexError.name = 'DietaryConflictError';
      mockService.validateMenuCompliance.mockRejectedValue(complexError);

      const response = await POST(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(422);
      expect(responseData).toEqual({
        success: false,
        error: 'Dietary conflicts detected',
        message:
          'Menu contains complex dietary conflicts that cannot be automatically resolved.',
        requestId: expect.any(String),
      });
    });

    it('should handle rate limiting errors', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      rateLimitError.name = 'RateLimitError';
      mockService.validateMenuCompliance.mockRejectedValue(rateLimitError);

      const response = await POST(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(429);
      expect(responseData).toEqual({
        success: false,
        error: 'Rate limit exceeded',
        message:
          'Too many validation requests. Please wait before trying again.',
        requestId: expect.any(String),
        retryAfter: expect.any(Number),
      });
    });

    it('should handle malformed JSON requests', async () => {
      mockRequest.json = jest.fn().mockRejectedValue(new Error('Invalid JSON'));

      const response = await POST(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData).toEqual(
        createExpectedErrorResponse('Invalid request format', 'Request body must be valid JSON')
      );
    });
  });

  describe('Security Integration', () => {
    it('should call withSecureValidation with correct options', () => {
      POST(mockRequest);

      expect(mockWithSecureValidation).toHaveBeenCalledWith(
        mockRequest,
        expect.any(Function),
        {
          requireAuth: true,
          rateLimit: {
            requests: 10,
            window: '1m',
          },
          validateBody: true,
          logSensitiveData: false,
        },
      );
    });

    it('should handle authentication errors', async () => {
      // Use extracted helper to reduce nesting
      mockWithSecureValidation.mockImplementation(createAuthErrorHandler());

      const response = await POST(mockRequest);

      expect(response.status).toBe(401);
    });
  });

  describe('Response Formatting', () => {
    it('should include proper headers', async () => {
      const response = await POST(mockRequest);

      expect(response.headers.get('content-type')).toContain(
        'application/json',
      );
      expect(response.headers.get('x-request-id')).toBeTruthy();
    });

    it('should include processing metrics', async () => {
      const response = await POST(mockRequest);
      const responseData = await response.json();

      expect(responseData.data).toHaveProperty('processingTime');
      expect(responseData.data).toHaveProperty('requestId');
      expect(responseData.data).toHaveProperty('validationLevel');
      expect(typeof responseData.data.processingTime).toBe('number');
    });

    it('should format violation messages correctly', async () => {
      const response = await POST(mockRequest);
      const responseData = await response.json();

      expect(responseData.message).toMatch(/\d+ violations found/);
      expect(responseData.data.validation.violations).toHaveLength(1);
      expect(responseData.data.validation.violations[0]).toHaveProperty(
        'guest_name',
      );
      expect(responseData.data.validation.violations[0]).toHaveProperty(
        'violations',
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty requirements array', async () => {
      const emptyRequirementsRequest = {
        ...mockValidRequestBody,
        requirements: [],
      };

      mockRequest.json = jest.fn().mockResolvedValue(emptyRequirementsRequest);

      const response = await POST(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
    });

    it('should handle menu with no courses', async () => {
      const noCoursesRequest = {
        ...mockValidRequestBody,
        menuData: {
          courses: [],
        },
      };

      mockRequest.json = jest.fn().mockResolvedValue(noCoursesRequest);

      const response = await POST(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.details).toContain(
        expect.stringContaining('At least one course is required'),
      );
    });

    it('should handle complex allergen combinations', async () => {
      const complexAllergenMenu = {
        courses: [
          {
            name: 'Main Course',
            dishes: [
              {
                name: 'Complex Dish',
                ingredients: ['flour', 'eggs', 'milk', 'nuts', 'shellfish'],
                allergens: ['gluten', 'eggs', 'dairy', 'nuts', 'shellfish'],
                dietary_tags: [],
              },
            ],
          },
        ],
      };

      const complexRequest = {
        ...mockValidRequestBody,
        menuData: complexAllergenMenu,
      };

      mockRequest.json = jest.fn().mockResolvedValue(complexRequest);

      const response = await POST(mockRequest);

      expect(response.status).toBe(200);
    });

    it('should handle high severity dietary requirements', async () => {
      const highSeverityRequirements = [
        {
          id: 'req_1',
          guest_name: 'Critical Case',
          dietary_categories: { name: 'Severe Allergy' },
          severity_level: 5,
          specific_notes: 'Life-threatening allergy',
          emergency_contact: 'emergency@contact.com',
        },
      ];

      const highSeverityRequest = {
        ...mockValidRequestBody,
        requirements: highSeverityRequirements,
      };

      mockRequest.json = jest.fn().mockResolvedValue(highSeverityRequest);

      const response = await POST(mockRequest);

      expect(response.status).toBe(200);
    });
  });

  describe('Performance Monitoring', () => {
    it('should track validation processing time', async () => {
      const startTime = Date.now();
      const response = await POST(mockRequest);
      const endTime = Date.now();

      const responseData = await response.json();
      const processingTime = responseData.data.processingTime;

      expect(processingTime).toBeGreaterThan(0);
      expect(processingTime).toBeLessThan(endTime - startTime + 100);
    });

    it('should handle large menu validation efficiently', async () => {
      const largeMenu = {
        courses: Array.from({ length: 10 }, (_, i) => ({
          name: `Course ${i + 1}`,
          dishes: Array.from({ length: 10 }, (_, j) => ({
            name: `Dish ${j + 1}`,
            ingredients: ['ingredient1', 'ingredient2', 'ingredient3'],
            allergens: ['gluten'],
            dietary_tags: ['vegetarian'],
          })),
        })),
      };

      const largeMenuRequest = {
        ...mockValidRequestBody,
        menuData: largeMenu,
      };

      mockRequest.json = jest.fn().mockResolvedValue(largeMenuRequest);

      const startTime = Date.now();
      const response = await POST(mockRequest);
      const endTime = Date.now();

      expect(response.status).toBe(200);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});
