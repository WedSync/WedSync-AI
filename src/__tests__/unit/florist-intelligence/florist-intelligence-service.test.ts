import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FloristIntelligenceService } from '@/lib/services/florist-intelligence/florist-intelligence-service';
import { OpenAIFloristClient } from '@/lib/integrations/openai-florist-client';
import { ColorTheoryService } from '@/lib/integrations/color-theory-service';

// Mock external dependencies
vi.mock('@/lib/supabase/client');
vi.mock('openai');
vi.mock('@/lib/cache/redis');

describe('FloristIntelligenceService', () => {
  let floristService: FloristIntelligenceService;
  let mockSupabase: any;
  let mockOpenAI: any;

  beforeEach(() => {
    floristService = new FloristIntelligenceService();
    mockSupabase = vi.mocked(require('@/lib/supabase/client').supabase);
    mockOpenAI = vi.mocked(require('openai').OpenAI);

    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('searchFlowersWithIntelligence', () => {
    it('should return flowers matching color criteria', async () => {
      // Arrange
      const mockFlowers = [
        {
          id: '123',
          common_name: 'Rose',
          scientific_name: 'Rosa rubiginosa',
          sustainability_score: 0.8,
          flower_color_matches: [{ color_hex: '#FF69B4', match_accuracy: 0.9 }],
          flower_sustainability_data: [],
          flower_allergen_data: [],
        },
      ];

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: mockFlowers,
          error: null,
        }),
      });

      const searchCriteria = {
        colors: ['#FF69B4'],
        sustainability_minimum: 0.5,
        limit: 20,
      };

      // Act
      const results = await floristService.searchFlowersWithIntelligence(
        searchCriteria,
        'user-123',
      );

      // Assert
      expect(results).toBeDefined();
      expect(results.flowers).toHaveLength(1);
      expect(results.flowers[0].common_name).toBe('Rose');
      expect(results.flowers[0].color_match_score).toBeGreaterThan(0.5);
      expect(results.search_metadata.total_results).toBe(1);
    });

    it('should apply seasonal scoring correctly', async () => {
      // Arrange
      const mockFlowers = [
        {
          id: '123',
          common_name: 'Spring Tulip',
          seasonality: { peak: [3, 4, 5], available: [2, 6], scarce: [12, 1] },
          flower_color_matches: [],
          flower_sustainability_data: [],
          flower_allergen_data: [],
        },
      ];

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: mockFlowers,
          error: null,
        }),
      });

      const springWeddingDate = new Date('2024-04-15');
      const winterWeddingDate = new Date('2024-12-15');

      // Act - Spring wedding (peak season)
      const springResults = await floristService.searchFlowersWithIntelligence(
        {
          wedding_date: springWeddingDate,
        },
        'user-123',
      );

      // Act - Winter wedding (scarce season)
      const winterResults = await floristService.searchFlowersWithIntelligence(
        {
          wedding_date: winterWeddingDate,
        },
        'user-123',
      );

      // Assert
      expect(springResults.flowers[0].seasonal_score).toBe(1.0); // Peak season
      expect(winterResults.flowers[0].seasonal_score).toBe(0.3); // Scarce season
      expect(springResults.flowers[0].price_multiplier).toBe(1.0);
      expect(winterResults.flowers[0].price_multiplier).toBe(1.5);
    });

    it('should filter out high-allergen flowers when specified', async () => {
      // Arrange
      const mockFlowers = [
        {
          id: '123',
          common_name: 'Safe Flower',
          flower_color_matches: [],
          flower_sustainability_data: [],
          flower_allergen_data: [
            { allergen_type: 'pollen', severity_level: 'low' },
          ],
        },
        {
          id: '456',
          common_name: 'High Pollen Flower',
          flower_color_matches: [],
          flower_sustainability_data: [],
          flower_allergen_data: [
            { allergen_type: 'pollen', severity_level: 'severe' },
          ],
        },
      ];

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: mockFlowers,
          error: null,
        }),
      });

      // Act
      const results = await floristService.searchFlowersWithIntelligence(
        {
          exclude_allergens: ['pollen'],
        },
        'user-123',
      );

      // Assert
      expect(results.flowers).toHaveLength(1);
      expect(results.flowers[0].common_name).toBe('Safe Flower');
    });

    it('should handle rate limiting correctly', async () => {
      // Arrange
      const rateLimitError = new Error('Rate limit exceeded');
      const mockRateLimit = vi.fn().mockRejectedValue(rateLimitError);

      // Mock rate limiter to throw error
      vi.doMock('@/lib/rate-limit', () => ({
        rateLimit: { check: mockRateLimit },
      }));

      // Act & Assert
      await expect(
        floristService.searchFlowersWithIntelligence({}, 'user-123'),
      ).rejects.toThrow('Rate limit exceeded');
    });

    it('should calculate color similarity accurately', async () => {
      // Test color similarity calculation using LAB color space
      const color1 = '#FF69B4'; // Hot pink
      const color2 = '#FF1493'; // Deep pink
      const color3 = '#00FF00'; // Green (very different)

      const similarity1 = floristService['calculateColorSimilarity'](
        color1,
        color2,
      );
      const similarity2 = floristService['calculateColorSimilarity'](
        color1,
        color3,
      );

      // Pink colors should be more similar than pink and green
      expect(similarity1).toBeGreaterThan(similarity2);
      expect(similarity1).toBeGreaterThan(0.7); // Similar colors
      expect(similarity2).toBeLessThan(0.3); // Different colors
    });
  });

  describe('generateColorPalette', () => {
    it('should generate valid color palette via OpenAI', async () => {
      // Arrange
      const mockOpenAIResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                primary_colors: [
                  {
                    hex: '#FF69B4',
                    name: 'Hot Pink',
                    description: 'Romantic main color',
                  },
                ],
                accent_colors: [
                  {
                    hex: '#32CD32',
                    name: 'Lime Green',
                    description: 'Fresh accent',
                  },
                ],
                neutral_colors: [
                  {
                    hex: '#FFFFFF',
                    name: 'White',
                    description: 'Classic balance',
                  },
                ],
                palette_name: 'Romantic Spring',
                style_reasoning: 'Perfect for romantic weddings',
                seasonal_appropriateness: 'Ideal for spring celebrations',
              }),
            },
          },
        ],
      };

      mockOpenAI.prototype.chat = {
        completions: {
          create: vi.fn().mockResolvedValue(mockOpenAIResponse),
        },
      };

      // Act
      const result = await floristService.generateColorPalette(
        ['#FF69B4'],
        'romantic',
        'spring',
        'user-123',
      );

      // Assert
      expect(result.primary_palette.primary_colors).toHaveLength(1);
      expect(result.primary_palette.accent_colors).toHaveLength(1);
      expect(result.primary_palette.neutral_colors).toHaveLength(1);
      expect(result.primary_palette.palette_name).toBe('Romantic Spring');
      expect(result.flower_matches).toBeDefined();
      expect(result.seasonal_analysis).toBeDefined();
    });

    it('should handle OpenAI API failures gracefully', async () => {
      // Arrange
      mockOpenAI.prototype.chat = {
        completions: {
          create: vi.fn().mockRejectedValue(new Error('OpenAI API Error')),
        },
      };

      // Act & Assert
      await expect(
        floristService.generateColorPalette(
          ['#FF69B4'],
          'romantic',
          'spring',
          'user-123',
        ),
      ).rejects.toThrow('Failed to generate color palette');
    });

    it('should validate generated palette format', async () => {
      // Arrange - Invalid OpenAI response missing required fields
      const mockInvalidResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                primary_colors: [{ hex: '#FF69B4' }], // Missing name and description
                // Missing accent_colors, neutral_colors, etc.
              }),
            },
          },
        ],
      };

      mockOpenAI.prototype.chat = {
        completions: {
          create: vi.fn().mockResolvedValue(mockInvalidResponse),
        },
      };

      // Act & Assert
      await expect(
        floristService.generateColorPalette(
          ['#FF69B4'],
          'romantic',
          'spring',
          'user-123',
        ),
      ).rejects.toThrow('Invalid response format from AI service');
    });
  });

  describe('analyzeSustainability', () => {
    it('should calculate carbon footprint correctly', async () => {
      // Arrange
      const mockFlowerData = {
        data: {
          id: '123',
          common_name: 'Rose',
          sustainability_score: 0.8,
          flower_sustainability_data: [
            {
              carbon_footprint_per_stem: 0.5,
              average_transport_distance_km: 50,
              certifications: ['organic'],
            },
          ],
          flower_pricing: [
            {
              base_price_per_stem: 2.5,
            },
          ],
        },
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(mockFlowerData),
          }),
        }),
      });

      const flowerSelections = [{ flower_id: '123', quantity: 100 }];

      const weddingLocation = {
        lat: 40.7128,
        lng: -74.006,
        region: 'US',
      };

      // Act
      const result = await floristService.analyzeSustainability(
        flowerSelections,
        weddingLocation,
        'user-123',
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.analysis.total_carbon_footprint).toBe(50); // 0.5 * 100
      expect(result.analysis.local_percentage).toBe(100); // 50km is local
      expect(result.analysis.certifications.organic).toBe(100);
      expect(result.analysis.detailed_breakdown).toHaveLength(1);
      expect(result.analysis.recommendations).toBeDefined();
    });

    it('should identify sustainability issues correctly', async () => {
      // Arrange - High carbon footprint flower
      const mockHighCarbonFlower = {
        data: {
          id: '456',
          common_name: 'Imported Exotic',
          sustainability_score: 0.2,
          flower_sustainability_data: [
            {
              carbon_footprint_per_stem: 2.0, // High carbon
              average_transport_distance_km: 5000, // Long distance
              pesticide_usage_score: 0.9, // High pesticides
              certifications: [],
            },
          ],
          flower_pricing: [{ base_price_per_stem: 5.0 }],
        },
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(mockHighCarbonFlower),
          }),
        }),
      });

      // Act
      const result = await floristService.analyzeSustainability(
        [{ flower_id: '456', quantity: 50 }],
        { lat: 40.7128, lng: -74.006, region: 'US' },
        'user-123',
      );

      // Assert
      const breakdown = result.analysis.detailed_breakdown[0];
      expect(breakdown.issues).toContain('High carbon footprint');
      expect(breakdown.issues).toContain('Long transportation distance');
      expect(breakdown.issues).toContain('High pesticide usage');
      expect(breakdown.is_local).toBe(false);
      expect(breakdown.is_organic).toBe(false);
    });
  });
});

describe('ColorTheoryService', () => {
  let colorService: ColorTheoryService;

  beforeEach(() => {
    colorService = new ColorTheoryService();
  });

  describe('analyzeColor', () => {
    it('should convert hex to LAB color space correctly', async () => {
      // Act
      const analysis = await colorService.analyzeColor('#FF69B4');

      // Assert
      expect(analysis.hex).toBe('#FF69B4');
      expect(analysis.rgb).toEqual({ r: 255, g: 105, b: 180 });
      expect(analysis.lab.L).toBeGreaterThan(0);
      expect(analysis.lab.a).toBeGreaterThan(0);
      expect(analysis.lab.b).toBeLessThan(0); // Pink should have negative b
      expect(analysis.color_temperature).toBe('warm');
    });

    it('should calculate accessibility metrics correctly', async () => {
      // Test white color
      const whiteAnalysis = await colorService.analyzeColor('#FFFFFF');
      expect(whiteAnalysis.accessibility.contrast_black).toBeGreaterThan(20);
      expect(whiteAnalysis.accessibility.wcag_aa_small).toBe(true);

      // Test dark color
      const darkAnalysis = await colorService.analyzeColor('#000000');
      expect(darkAnalysis.accessibility.contrast_white).toBeGreaterThan(20);
      expect(darkAnalysis.accessibility.wcag_aa_small).toBe(true);
    });

    it('should identify color temperature correctly', async () => {
      const redAnalysis = await colorService.analyzeColor('#FF0000');
      expect(redAnalysis.color_temperature).toBe('warm');

      const blueAnalysis = await colorService.analyzeColor('#0000FF');
      expect(blueAnalysis.color_temperature).toBe('cool');

      const grayAnalysis = await colorService.analyzeColor('#808080');
      expect(grayAnalysis.color_temperature).toBe('neutral');
    });
  });

  describe('analyzeColorHarmony', () => {
    it('should detect complementary color harmony', async () => {
      const colors = ['#FF0000', '#00FF00']; // Red and Green (complementary)

      const harmony = await colorService.analyzeColorHarmony(colors);

      expect(harmony.harmony_type).toBe('complementary');
      expect(harmony.harmony_score).toBeGreaterThan(0.8);
      expect(harmony.complementary_colors).toHaveLength(1);
    });

    it('should generate color harmony variations', async () => {
      const colors = ['#FF69B4'];

      const harmony = await colorService.analyzeColorHarmony(colors);

      expect(harmony.complementary_colors).toHaveLength(1);
      expect(harmony.analogous_colors).toHaveLength(2);
      expect(harmony.triadic_colors).toHaveLength(2);
      expect(harmony.split_complementary).toHaveLength(2);
    });

    it('should analyze color accessibility in combinations', async () => {
      const colors = ['#FFFFFF', '#000000']; // High contrast

      const harmony = await colorService.analyzeColorHarmony(colors);

      expect(harmony.color_accessibility.overall_contrast).toBeGreaterThan(15);
      expect(harmony.color_accessibility.readable_combinations).toHaveLength(1);
      expect(harmony.color_accessibility.warnings).toHaveLength(0);
    });
  });

  describe('findSimilarColors', () => {
    it('should find similar colors in database', async () => {
      const targetColor = '#FF69B4';
      const colorDatabase = ['#FF1493', '#FF6347', '#00FF00', '#0000FF'];

      const similar = await colorService.findSimilarColors(
        targetColor,
        colorDatabase,
      );

      expect(similar).toHaveLength(4);
      expect(similar[0].color).toBe('#FF1493'); // Most similar (pink)
      expect(similar[0].similarity).toBeGreaterThan(0.8);
      expect(similar[similar.length - 1].similarity).toBeLessThan(0.5); // Least similar
    });
  });
});
