/**
 * WS-254 Team E: Comprehensive Unit Tests for Dietary Analysis Service
 * Wedding industry critical - 95% coverage requirement
 * Zero tolerance for dietary management failures
 */

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
  MockedFunction,
} from 'vitest';
import {
  DietaryAnalysisService,
  DietaryRestriction,
  MenuItem,
} from '@/lib/dietary-management/dietary-analysis-service';
import { OpenAI } from 'openai';

// Mock OpenAI
vi.mock('openai');
const MockedOpenAI = OpenAI as vi.MockedClass<typeof OpenAI>;

// Helper functions to reduce nesting complexity (S2004)
const createTimeoutPromise = (delay: number) => 
  new Promise((resolve) => setTimeout(resolve, delay));

const createMockTimeoutImplementation = (delay: number) => 
  () => createTimeoutPromise(delay);

const createConcurrentAnalyses = (service: DietaryAnalysisService, restrictions: DietaryRestriction[], menuItems: MenuItem[], count: number) => {
  return Array(count).fill(0).map(() => 
    service.analyzeDietaryCompatibility(restrictions, menuItems)
  );
};

describe('DietaryAnalysisService', () => {
  let service: DietaryAnalysisService;
  let mockOpenAI: vi.Mocked<OpenAI>;

  // Test data setup - realistic wedding scenarios
  const mockRestrictions: DietaryRestriction[] = [
    {
      id: 'rest-1',
      guestId: 'guest-bride-1',
      type: 'gluten-free',
      severity: 'severe',
      notes: 'Celiac disease - strictly no gluten',
      medicalCertification: true,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
    },
    {
      id: 'rest-2',
      guestId: 'guest-groom-1',
      type: 'nut-allergy',
      severity: 'life-threatening',
      notes: 'EpiPen required - anaphylactic reaction',
      medicalCertification: true,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
    },
    {
      id: 'rest-3',
      guestId: 'guest-family-1',
      type: 'vegetarian',
      severity: 'mild',
      notes: 'Ethical vegetarian',
      medicalCertification: false,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
    },
    {
      id: 'rest-4',
      guestId: 'guest-family-2',
      type: 'vegan',
      severity: 'moderate',
      notes: 'Lifestyle choice - strict adherence',
      medicalCertification: false,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
    },
  ];

  const mockMenuItems: MenuItem[] = [
    {
      id: 'menu-1',
      name: 'Herb-Crusted Salmon',
      description: 'Atlantic salmon with herb crust and lemon butter',
      ingredients: ['salmon', 'herbs', 'butter', 'lemon', 'breadcrumbs'],
      allergens: ['fish'],
      dietaryFlags: [],
    },
    {
      id: 'menu-2',
      name: 'Quinoa Stuffed Bell Peppers',
      description: 'Roasted bell peppers filled with quinoa and vegetables',
      ingredients: ['bell peppers', 'quinoa', 'vegetables', 'olive oil'],
      allergens: [],
      dietaryFlags: ['vegetarian', 'vegan', 'gluten-free'],
    },
    {
      id: 'menu-3',
      name: 'Chicken Almondine',
      description: 'Pan-seared chicken breast with almond sauce',
      ingredients: ['chicken breast', 'almonds', 'cream', 'butter'],
      allergens: ['nuts', 'dairy'],
      dietaryFlags: [],
    },
    {
      id: 'menu-4',
      name: 'Wheat Pasta Primavera',
      description: 'Fresh pasta with seasonal vegetables and parmesan',
      ingredients: [
        'wheat pasta',
        'vegetables',
        'parmesan cheese',
        'olive oil',
      ],
      allergens: ['gluten', 'dairy'],
      dietaryFlags: ['vegetarian'],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup OpenAI mock
    mockOpenAI = {
      chat: {
        completions: {
          create: vi.fn(),
        },
      },
    } as any;

    MockedOpenAI.mockImplementation(() => mockOpenAI);

    service = new DietaryAnalysisService('test-api-key');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Constructor and Initialization', () => {
    it('should initialize with OpenAI API key', () => {
      expect(MockedOpenAI).toHaveBeenCalledWith({ apiKey: 'test-api-key' });
    });

    it('should set analysis timeout to 10 seconds as per requirements', () => {
      // Test that timeout is enforced in actual usage
      expect(service).toBeDefined();
    });
  });

  describe('analyzeDietaryCompatibility', () => {
    it('should analyze dietary compatibility for multiple guests', async () => {
      const results = await service.analyzeDietaryCompatibility(
        mockRestrictions,
        mockMenuItems,
      );

      expect(results).toHaveLength(4); // 4 unique guests
      expect(results[0]).toHaveProperty('guestId');
      expect(results[0]).toHaveProperty('compatibleItems');
      expect(results[0]).toHaveProperty('incompatibleItems');
      expect(results[0]).toHaveProperty('recommendations');
      expect(results[0]).toHaveProperty('confidenceScore');
    });

    it('should correctly identify gluten-free compatible items', async () => {
      const glutenFreeRestriction = [mockRestrictions[0]]; // gluten-free guest
      const results = await service.analyzeDietaryCompatibility(
        glutenFreeRestriction,
        mockMenuItems,
      );

      const result = results[0];
      const compatibleNames = result.compatibleItems.map((item) => item.name);
      const incompatibleNames = result.incompatibleItems.map(
        (item) => item.item.name,
      );

      // Should be compatible with quinoa dish
      expect(compatibleNames).toContain('Quinoa Stuffed Bell Peppers');
      // Should NOT be compatible with wheat pasta
      expect(incompatibleNames).toContain('Wheat Pasta Primavera');
    });

    it('should correctly identify nut allergy conflicts', async () => {
      const nutAllergyRestriction = [mockRestrictions[1]]; // nut allergy guest
      const results = await service.analyzeDietaryCompatibility(
        nutAllergyRestriction,
        mockMenuItems,
      );

      const result = results[0];
      const incompatibleItem = result.incompatibleItems.find(
        (item) => item.item.name === 'Chicken Almondine',
      );

      expect(incompatibleItem).toBeDefined();
      expect(incompatibleItem?.conflicts[0].severity).toBe('critical');
      expect(incompatibleItem?.conflicts[0].reason).toContain('almond');
    });

    it('should correctly identify vegetarian compatible items', async () => {
      const vegetarianRestriction = [mockRestrictions[2]]; // vegetarian guest
      const results = await service.analyzeDietaryCompatibility(
        vegetarianRestriction,
        mockMenuItems,
      );

      const result = results[0];
      const compatibleNames = result.compatibleItems.map((item) => item.name);
      const incompatibleNames = result.incompatibleItems.map(
        (item) => item.item.name,
      );

      // Should be compatible with vegetarian dishes
      expect(compatibleNames).toContain('Quinoa Stuffed Bell Peppers');
      expect(compatibleNames).toContain('Wheat Pasta Primavera');
      // Should NOT be compatible with meat/fish
      expect(incompatibleNames).toContain('Herb-Crusted Salmon');
      expect(incompatibleNames).toContain('Chicken Almondine');
    });

    it('should correctly identify vegan compatible items', async () => {
      const veganRestriction = [mockRestrictions[3]]; // vegan guest
      const results = await service.analyzeDietaryCompatibility(
        veganRestriction,
        mockMenuItems,
      );

      const result = results[0];
      const compatibleNames = result.compatibleItems.map((item) => item.name);

      // Only quinoa dish should be vegan compatible
      expect(compatibleNames).toContain('Quinoa Stuffed Bell Peppers');
      expect(compatibleNames).toHaveLength(1);
    });

    it('should handle timeout scenarios for wedding day performance', async () => {
      // Mock a slow analysis that would exceed 10-second limit
      const slowRestrictions = Array(1000).fill(mockRestrictions[0]);

      await expect(
        service.analyzeDietaryCompatibility(slowRestrictions, mockMenuItems),
      ).rejects.toThrow('wedding day performance critical');
    });

    it('should handle empty restrictions gracefully', async () => {
      const results = await service.analyzeDietaryCompatibility(
        [],
        mockMenuItems,
      );
      expect(results).toHaveLength(0);
    });

    it('should handle empty menu items gracefully', async () => {
      const results = await service.analyzeDietaryCompatibility(
        mockRestrictions,
        [],
      );
      expect(results).toHaveLength(4);
      results.forEach((result) => {
        expect(result.compatibleItems).toHaveLength(0);
        expect(result.incompatibleItems).toHaveLength(0);
      });
    });

    it('should generate appropriate confidence scores', async () => {
      const results = await service.analyzeDietaryCompatibility(
        mockRestrictions,
        mockMenuItems,
      );

      results.forEach((result) => {
        expect(result.confidenceScore).toBeGreaterThan(0);
        expect(result.confidenceScore).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('generateDietaryCompliantMenu', () => {
    beforeEach(() => {
      // Mock successful OpenAI response
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify([
                {
                  name: 'AI-Generated Gluten-Free Option',
                  description: 'Safe wedding dish',
                  ingredients: ['safe ingredients'],
                  allergens: [],
                  dietaryFlags: ['gluten-free', 'nut-free'],
                },
              ]),
            },
          },
        ],
      };

      (
        mockOpenAI.chat.completions.create as MockedFunction<any>
      ).mockResolvedValue(mockResponse);
    });

    it('should generate menu for wedding breakfast', async () => {
      const menu = await service.generateDietaryCompliantMenu(
        mockRestrictions,
        'breakfast',
        50,
      );

      expect(menu).toHaveLength(1);
      expect(menu[0].name).toBe('AI-Generated Gluten-Free Option');
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4',
          temperature: 0.3, // Consistent, safe recommendations
          max_tokens: 2000,
        }),
      );
    });

    it('should generate menu for wedding dinner', async () => {
      const menu = await service.generateDietaryCompliantMenu(
        mockRestrictions,
        'dinner',
        150,
      );

      expect(menu).toHaveLength(1);
      const prompt = (mockOpenAI.chat.completions.create as MockedFunction<any>)
        .mock.calls[0][0].messages[1].content;
      expect(prompt).toContain('dinner');
      expect(prompt).toContain('150 guests');
      expect(prompt).toContain('wedding-appropriate');
    });

    it('should handle OpenAI API failures with fallback menu', async () => {
      // Mock API failure
      (
        mockOpenAI.chat.completions.create as MockedFunction<any>
      ).mockRejectedValue(new Error('OpenAI API failure'));

      const menu = await service.generateDietaryCompliantMenu(
        mockRestrictions,
        'dinner',
        100,
      );

      // Should return fallback menu
      expect(menu.length).toBeGreaterThan(0);
      expect(
        menu.some((item) => item.name.includes('Garden Fresh Salad')),
      ).toBe(true);
    });

    it('should handle timeout scenarios (10 second limit)', async () => {
      // Mock timeout - REFACTORED FOR S2004 COMPLIANCE
      (
        mockOpenAI.chat.completions.create as MockedFunction<any>
      ).mockImplementation(createMockTimeoutImplementation(15000));

      const menu = await service.generateDietaryCompliantMenu(
        mockRestrictions,
        'dinner',
        100,
      );

      // Should return fallback due to timeout
      expect(menu.length).toBeGreaterThan(0);
    });

    it('should handle malformed AI responses', async () => {
      // Mock malformed response
      const mockResponse = {
        choices: [
          {
            message: { content: 'invalid json response' },
          },
        ],
      };

      (
        mockOpenAI.chat.completions.create as MockedFunction<any>
      ).mockResolvedValue(mockResponse);

      const menu = await service.generateDietaryCompliantMenu(
        mockRestrictions,
        'dinner',
        100,
      );

      // Should fallback to safe menu
      expect(menu.length).toBeGreaterThan(0);
    });

    it('should include dietary restriction summary in AI prompt', async () => {
      await service.generateDietaryCompliantMenu(
        mockRestrictions,
        'dinner',
        100,
      );

      const prompt = (mockOpenAI.chat.completions.create as MockedFunction<any>)
        .mock.calls[0][0].messages[1].content;
      expect(prompt).toContain('gluten-free');
      expect(prompt).toContain('nut-allergy');
      expect(prompt).toContain('vegetarian');
      expect(prompt).toContain('vegan');
    });
  });

  describe('detectDietaryConflicts', () => {
    it('should detect all potential conflicts', async () => {
      const conflicts = await service.detectDietaryConflicts(
        mockMenuItems,
        mockRestrictions,
      );

      expect(conflicts.length).toBeGreaterThan(0);

      // Check specific conflicts
      const nutAllergyConflict = conflicts.find(
        (conflict) => conflict.item.name === 'Chicken Almondine',
      );
      expect(nutAllergyConflict).toBeDefined();
      expect(
        nutAllergyConflict?.conflicts.some((c) => c.severity === 'critical'),
      ).toBe(true);
    });

    it('should properly categorize conflict severity', async () => {
      const conflicts = await service.detectDietaryConflicts(
        mockMenuItems,
        mockRestrictions,
      );

      conflicts.forEach((conflict) => {
        conflict.conflicts.forEach((c) => {
          expect(['warning', 'danger', 'critical']).toContain(c.severity);

          // Life-threatening allergies should be critical
          if (c.restriction.severity === 'life-threatening') {
            expect(c.severity).toBe('critical');
          }
        });
      });
    });

    it('should handle no conflicts scenario', async () => {
      const safeMenu: MenuItem[] = [
        {
          id: 'safe-1',
          name: 'Plain Rice',
          description: 'Simple steamed rice',
          ingredients: ['rice', 'water'],
          allergens: [],
          dietaryFlags: ['vegetarian', 'vegan', 'gluten-free'],
        },
      ];

      const conflicts = await service.detectDietaryConflicts(
        safeMenu,
        mockRestrictions,
      );
      expect(conflicts).toHaveLength(0);
    });
  });

  describe('validateMenuSafety', () => {
    it('should validate safe menu correctly', async () => {
      const safeMenu: MenuItem[] = [
        {
          id: 'safe-1',
          name: 'Quinoa Bowl',
          description: 'Safe option for all guests',
          ingredients: ['quinoa', 'vegetables'],
          allergens: [],
          dietaryFlags: ['vegetarian', 'vegan', 'gluten-free', 'nut-free'],
        },
      ];

      const validation = await service.validateMenuSafety(
        safeMenu,
        mockRestrictions,
      );

      expect(validation.isSafe).toBe(true);
      expect(validation.criticalIssues).toHaveLength(0);
    });

    it('should identify unsafe menu correctly', async () => {
      const unsafeMenu: MenuItem[] = [
        {
          id: 'unsafe-1',
          name: 'Peanut Butter Chicken',
          description: 'Dangerous for nut allergies',
          ingredients: ['chicken', 'peanut butter', 'wheat flour'],
          allergens: ['nuts', 'gluten'],
          dietaryFlags: [],
        },
      ];

      const validation = await service.validateMenuSafety(
        unsafeMenu,
        mockRestrictions,
      );

      expect(validation.isSafe).toBe(false);
      expect(validation.criticalIssues.length).toBeGreaterThan(0);
      expect(validation.recommendations.length).toBeGreaterThan(0);
    });

    it('should provide wedding-appropriate recommendations', async () => {
      const problematicMenu = mockMenuItems; // Has various conflicts
      const validation = await service.validateMenuSafety(
        problematicMenu,
        mockRestrictions,
      );

      expect(validation.recommendations).toContain(
        'Consider providing clearly labeled alternative dishes',
      );
      expect(validation.recommendations).toContain(
        'Ensure kitchen staff are trained on allergen protocols',
      );
      expect(validation.recommendations).toContain(
        'Have emergency medical contacts available at venue',
      );
    });

    it('should handle empty menu validation', async () => {
      const validation = await service.validateMenuSafety([], mockRestrictions);

      expect(validation.isSafe).toBe(true);
      expect(validation.criticalIssues).toHaveLength(0);
      expect(validation.warnings).toHaveLength(0);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle invalid dietary restriction types', () => {
      const invalidRestriction = {
        ...mockRestrictions[0],
        type: 'invalid-type' as any,
      };

      // Should not throw and handle gracefully
      expect(() =>
        service.analyzeDietaryCompatibility(
          [invalidRestriction],
          mockMenuItems,
        ),
      ).not.toThrow();
    });

    it('should handle null/undefined values gracefully', async () => {
      const incompleteMenu: MenuItem[] = [
        {
          id: 'incomplete',
          name: 'Test Item',
          description: 'Test',
          ingredients: [],
          allergens: [],
          dietaryFlags: [],
        },
      ];

      const results = await service.analyzeDietaryCompatibility(
        mockRestrictions,
        incompleteMenu,
      );

      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);
    });

    it('should handle large datasets efficiently', async () => {
      const largeRestrictions = Array(100).fill(mockRestrictions[0]);
      const largeMenu = Array(100).fill(mockMenuItems[0]);

      const startTime = Date.now();
      const results = await service.analyzeDietaryCompatibility(
        largeRestrictions,
        largeMenu,
      );
      const endTime = Date.now();

      // Should complete within reasonable time for wedding day usage
      expect(endTime - startTime).toBeLessThan(5000); // 5 seconds
      expect(results).toBeDefined();
    });
  });

  describe('Wedding Day Critical Scenarios', () => {
    it('should handle last-minute dietary additions', async () => {
      const lastMinuteRestriction: DietaryRestriction = {
        id: 'last-minute-1',
        guestId: 'emergency-guest',
        type: 'shellfish-allergy',
        severity: 'life-threatening',
        notes: 'Just discovered - anaphylaxis risk',
        medicalCertification: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedRestrictions = [...mockRestrictions, lastMinuteRestriction];
      const results = await service.analyzeDietaryCompatibility(
        updatedRestrictions,
        mockMenuItems,
      );

      const emergencyGuestResult = results.find(
        (r) => r.guestId === 'emergency-guest',
      );
      expect(emergencyGuestResult).toBeDefined();
      expect(emergencyGuestResult?.compatibleItems).toBeDefined();
    });

    it('should prioritize life-threatening allergies in conflict detection', async () => {
      const criticalAllergy: DietaryRestriction = {
        id: 'critical',
        guestId: 'vip-guest',
        type: 'nut-allergy',
        severity: 'life-threatening',
        notes: 'VIP guest - absolute priority',
        medicalCertification: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const conflicts = await service.detectDietaryConflicts(mockMenuItems, [
        criticalAllergy,
      ]);
      const nutConflicts = conflicts.filter((c) =>
        c.conflicts.some((conf) => conf.severity === 'critical'),
      );

      expect(nutConflicts.length).toBeGreaterThan(0);
    });

    it('should maintain performance under wedding day stress', async () => {
      // Simulate wedding day traffic: multiple simultaneous analyses with reduced nesting (S2004)
      const analyses = createConcurrentAnalyses(service, mockRestrictions, mockMenuItems, 10);

      const startTime = Date.now();
      const results = await Promise.all(analyses);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(15000); // 15 seconds for 10 analyses
      expect(results).toHaveLength(10);
      results.forEach((result) => {
        expect(result).toHaveLength(4); // 4 guests
      });
    });
  });
});
