'use client';

import { useState, useCallback } from 'react';
import { withSecureValidation } from '@/lib/security/withSecureValidation';
import { z } from 'zod';

// Validation schema for color palette generation
const ColorPaletteSchema = z.object({
  baseColors: z
    .array(z.string().regex(/^#[0-9A-F]{6}$/i))
    .min(1)
    .max(3),
  weddingStyle: z.enum([
    'romantic',
    'modern',
    'rustic',
    'classic',
    'bohemian',
    'minimalist',
    'vintage',
    'garden',
  ]),
  season: z.enum(['spring', 'summer', 'fall', 'winter']),
  preferences: z
    .object({
      include_neutrals: z.boolean().optional().default(true),
      accent_count: z.number().min(1).max(3).optional().default(2),
      harmony_type: z
        .enum([
          'complementary',
          'analogous',
          'triadic',
          'monochromatic',
          'split_complementary',
        ])
        .optional()
        .default('complementary'),
    })
    .optional(),
});

type ColorPaletteRequest = z.infer<typeof ColorPaletteSchema>;

interface Color {
  hex: string;
  name: string;
  role?: string;
  harmony_position?: number;
}

interface FlowerMatch {
  flower: {
    common_name: string;
    scientific_name: string;
    id: string;
  };
  color_similarity: number;
  availability_score: number;
  seasonal_appropriateness: number;
}

interface ColorMatch {
  target_color: Color;
  match_count: number;
  matching_flowers: FlowerMatch[];
  avg_similarity: number;
}

interface SeasonalAnalysis {
  overall_fit: number;
  seasonal_fit_score: number;
  color_match_score: number;
  recommendations: string[];
  seasonal_notes: string[];
}

interface GeneratedPalette {
  primary_palette: {
    palette_name: string;
    style_compatibility: number;
    primary_colors: Color[];
    accent_colors?: Color[];
    neutral_colors?: Color[];
    harmony_type: string;
  };
  flower_matches: ColorMatch[];
  seasonal_analysis: SeasonalAnalysis;
  accessibility: {
    contrast_ratios: Array<{
      color1: string;
      color2: string;
      ratio: number;
      wcag_aa: boolean;
      wcag_aaa: boolean;
    }>;
    colorblind_friendly: boolean;
    alternative_indicators: string[];
  };
  metadata: {
    generation_time_ms: number;
    ai_confidence: number;
    style_match_score: number;
    seasonal_match_score: number;
  };
}

interface UseColorPaletteReturn {
  generatedPalette: GeneratedPalette | null;
  isGenerating: boolean;
  error: Error | null;
  generatePalette: (request: ColorPaletteRequest) => Promise<GeneratedPalette>;
  clearPalette: () => void;
}

// Color utility functions
const hexToHsl = (hex: string): [number, number, number] => {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h,
    s,
    l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
      default:
        h = 0;
    }
    h /= 6;
  }

  return [h * 360, s * 100, l * 100];
};

const hslToHex = (h: number, s: number, l: number): string => {
  h = h / 360;
  s = s / 100;
  l = l / 100;

  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return `#${Math.round(r * 255)
    .toString(16)
    .padStart(2, '0')}${Math.round(g * 255)
    .toString(16)
    .padStart(2, '0')}${Math.round(b * 255)
    .toString(16)
    .padStart(2, '0')}`;
};

// Mock color name database
const COLOR_NAMES: { [key: string]: string } = {
  '#FF69B4': 'Hot Pink',
  '#FFB6C1': 'Light Pink',
  '#FFC0CB': 'Pink',
  '#FFFFFF': 'White',
  '#F5F5DC': 'Beige',
  '#FFFACD': 'Lemon Chiffon',
  '#E6E6FA': 'Lavender',
  '#DDA0DD': 'Plum',
  '#98FB98': 'Pale Green',
  '#90EE90': 'Light Green',
  '#87CEEB': 'Sky Blue',
  '#4169E1': 'Royal Blue',
  '#8B4513': 'Saddle Brown',
  '#D2691E': 'Chocolate',
  '#CD853F': 'Peru',
};

const getColorName = (hex: string): string => {
  const upperHex = hex.toUpperCase();
  if (COLOR_NAMES[upperHex]) {
    return COLOR_NAMES[upperHex];
  }

  // Find closest named color
  let closestColor = '#FFFFFF';
  let closestDistance = Infinity;

  const [h1, s1, l1] = hexToHsl(hex);

  Object.keys(COLOR_NAMES).forEach((namedHex) => {
    const [h2, s2, l2] = hexToHsl(namedHex);
    const distance = Math.sqrt(
      Math.pow(h1 - h2, 2) + Math.pow(s1 - s2, 2) + Math.pow(l1 - l2, 2),
    );

    if (distance < closestDistance) {
      closestDistance = distance;
      closestColor = namedHex;
    }
  });

  return COLOR_NAMES[closestColor] || hex.toUpperCase();
};

// Generate harmonious colors based on color theory
const generateHarmoniousColors = (
  baseHex: string,
  harmonyType: string,
  count: number,
): Color[] => {
  const [h, s, l] = hexToHsl(baseHex);
  const colors: Color[] = [];

  switch (harmonyType) {
    case 'complementary':
      colors.push({
        hex: hslToHex((h + 180) % 360, s, l),
        name: getColorName(hslToHex((h + 180) % 360, s, l)),
        harmony_position: 180,
      });
      break;

    case 'analogous':
      for (let i = 1; i <= count; i++) {
        const newH = (h + 30 * i) % 360;
        const hex = hslToHex(newH, s * 0.8, l);
        colors.push({
          hex,
          name: getColorName(hex),
          harmony_position: 30 * i,
        });
      }
      break;

    case 'triadic':
      colors.push({
        hex: hslToHex((h + 120) % 360, s, l),
        name: getColorName(hslToHex((h + 120) % 360, s, l)),
        harmony_position: 120,
      });
      colors.push({
        hex: hslToHex((h + 240) % 360, s, l),
        name: getColorName(hslToHex((h + 240) % 360, s, l)),
        harmony_position: 240,
      });
      break;

    case 'split_complementary':
      colors.push({
        hex: hslToHex((h + 150) % 360, s, l),
        name: getColorName(hslToHex((h + 150) % 360, s, l)),
        harmony_position: 150,
      });
      colors.push({
        hex: hslToHex((h + 210) % 360, s, l),
        name: getColorName(hslToHex((h + 210) % 360, s, l)),
        harmony_position: 210,
      });
      break;

    case 'monochromatic':
      for (let i = 1; i <= count; i++) {
        const newL = Math.max(10, Math.min(90, l + 15 * i - 30));
        const hex = hslToHex(h, s, newL);
        colors.push({
          hex,
          name: getColorName(hex),
          harmony_position: 0,
        });
      }
      break;
  }

  return colors.slice(0, count);
};

// Generate neutral colors
const generateNeutrals = (): Color[] => [
  { hex: '#FFFFFF', name: 'Pure White', role: 'neutral' },
  { hex: '#F8F8FF', name: 'Ghost White', role: 'neutral' },
  { hex: '#F5F5DC', name: 'Beige', role: 'neutral' },
  { hex: '#D3D3D3', name: 'Light Gray', role: 'neutral' },
  { hex: '#A9A9A9', name: 'Dark Gray', role: 'neutral' },
];

// Mock flower database for matching
const MOCK_FLOWER_MATCHES: FlowerMatch[] = [
  {
    flower: {
      common_name: 'Garden Rose',
      scientific_name: 'Rosa × damascena',
      id: '1',
    },
    color_similarity: 0.92,
    availability_score: 0.88,
    seasonal_appropriateness: 0.85,
  },
  {
    flower: {
      common_name: 'Peony',
      scientific_name: 'Paeonia lactiflora',
      id: '2',
    },
    color_similarity: 0.87,
    availability_score: 0.65,
    seasonal_appropriateness: 0.72,
  },
  {
    flower: {
      common_name: 'Sweet Pea',
      scientific_name: 'Lathyrus odoratus',
      id: '3',
    },
    color_similarity: 0.83,
    availability_score: 0.78,
    seasonal_appropriateness: 0.91,
  },
  {
    flower: {
      common_name: 'Ranunculus',
      scientific_name: 'Ranunculus asiaticus',
      id: '4',
    },
    color_similarity: 0.89,
    availability_score: 0.82,
    seasonal_appropriateness: 0.77,
  },
];

export function useColorPalette(): UseColorPaletteReturn {
  const [generatedPalette, setGeneratedPalette] =
    useState<GeneratedPalette | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const generatePalette = useCallback(
    withSecureValidation(
      ColorPaletteSchema,
      async (
        validatedRequest: ColorPaletteRequest,
      ): Promise<GeneratedPalette> => {
        const startTime = Date.now();

        try {
          // Simulate AI processing time
          await new Promise((resolve) => setTimeout(resolve, 2500));

          const {
            baseColors,
            weddingStyle,
            season,
            preferences = {},
          } = validatedRequest;
          const {
            include_neutrals = true,
            accent_count = 2,
            harmony_type = 'complementary',
          } = preferences;

          // Generate primary colors from base colors
          const primaryColors: Color[] = baseColors.map((hex, index) => ({
            hex,
            name: getColorName(hex),
            role: index === 0 ? 'primary' : 'secondary',
          }));

          // Generate accent colors using color harmony
          const accentColors: Color[] = [];
          baseColors.forEach((baseColor) => {
            const harmonious = generateHarmoniousColors(
              baseColor,
              harmony_type,
              accent_count,
            );
            accentColors.push(...harmonious);
          });

          // Remove duplicates and limit to requested count
          const uniqueAccents = accentColors
            .filter(
              (color, index, self) =>
                index === self.findIndex((c) => c.hex === color.hex),
            )
            .slice(0, accent_count);

          // Generate neutral colors if requested
          const neutralColors = include_neutrals
            ? generateNeutrals().slice(0, 5)
            : [];

          // Generate flower matches for each color
          const flowerMatches: ColorMatch[] = [
            ...primaryColors,
            ...uniqueAccents,
          ].map((color) => {
            const matches = MOCK_FLOWER_MATCHES.map((flower) => ({
              ...flower,
              color_similarity: Math.random() * 0.3 + 0.7, // Mock similarity based on color
            })).sort((a, b) => b.color_similarity - a.color_similarity);

            return {
              target_color: color,
              match_count: matches.length,
              matching_flowers: matches,
              avg_similarity:
                matches.reduce((sum, m) => sum + m.color_similarity, 0) /
                matches.length,
            };
          });

          // Generate seasonal analysis
          const seasonalFitScore = Math.random() * 0.3 + 0.6;
          const colorMatchScore = Math.random() * 0.4 + 0.6;
          const overallFit = (seasonalFitScore + colorMatchScore) / 2;

          const seasonalAnalysis: SeasonalAnalysis = {
            overall_fit: overallFit,
            seasonal_fit_score: seasonalFitScore,
            color_match_score: colorMatchScore,
            recommendations: [
              `This ${weddingStyle} palette works beautifully in ${season}`,
              'Consider adding more neutral tones for balance',
              'The color harmony creates visual interest without being overwhelming',
            ],
            seasonal_notes: [
              `${season} weddings benefit from these color temperatures`,
              'Flower availability is good for this color range',
            ],
          };

          // Generate accessibility analysis
          const contrastRatios = primaryColors
            .map((color1) =>
              neutralColors.slice(0, 2).map((color2) => {
                const ratio = Math.random() * 10 + 1; // Mock contrast ratio
                return {
                  color1: color1.hex,
                  color2: color2.hex,
                  ratio,
                  wcag_aa: ratio >= 4.5,
                  wcag_aaa: ratio >= 7,
                };
              }),
            )
            .flat();

          // Generate palette name
          const styleAdjectives = {
            romantic: 'Romantic',
            modern: 'Contemporary',
            rustic: 'Natural',
            classic: 'Timeless',
            bohemian: 'Bohemian',
            minimalist: 'Minimal',
            vintage: 'Vintage',
            garden: 'Garden',
          };

          const seasonColors = {
            spring: 'Bloom',
            summer: 'Radiance',
            fall: 'Harvest',
            winter: 'Frost',
          };

          const paletteName = `${styleAdjectives[weddingStyle]} ${seasonColors[season]}`;

          const palette: GeneratedPalette = {
            primary_palette: {
              palette_name: paletteName,
              style_compatibility: Math.random() * 0.2 + 0.8,
              primary_colors: primaryColors,
              accent_colors: uniqueAccents,
              neutral_colors: neutralColors,
              harmony_type,
            },
            flower_matches: flowerMatches,
            seasonal_analysis: seasonalAnalysis,
            accessibility: {
              contrast_ratios: contrastRatios,
              colorblind_friendly: Math.random() > 0.3,
              alternative_indicators: [
                'Pattern variations',
                'Texture differences',
                'Size variations',
              ],
            },
            metadata: {
              generation_time_ms: Date.now() - startTime,
              ai_confidence: Math.random() * 0.2 + 0.8,
              style_match_score: Math.random() * 0.3 + 0.7,
              seasonal_match_score: seasonalFitScore,
            },
          };

          return palette;
        } catch (err) {
          throw new Error(
            `Palette generation failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
          );
        }
      },
    ),
    [],
  );

  const wrappedGeneratePalette = useCallback(
    async (request: ColorPaletteRequest): Promise<GeneratedPalette> => {
      setIsGenerating(true);
      setError(null);

      try {
        // Create a mock request object for validation
        const mockRequest = new Request('https://example.com', {
          method: 'POST',
          body: JSON.stringify(request),
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const palette = await generatePalette(request, mockRequest);
        setGeneratedPalette(palette);
        return palette;
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error('Palette generation failed');
        setError(error);
        throw error;
      } finally {
        setIsGenerating(false);
      }
    },
    [generatePalette],
  );

  const clearPalette = useCallback(() => {
    setGeneratedPalette(null);
    setError(null);
  }, []);

  return {
    generatedPalette,
    isGenerating,
    error,
    generatePalette: wrappedGeneratePalette,
    clearPalette,
  };
}
