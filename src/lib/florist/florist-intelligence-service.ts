// FloristIntelligenceService - Advanced AI-powered florist recommendation system
// WS-253 Team B Implementation
import { OpenAI } from 'openai';
import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';

export interface FlowerSearchCriteria {
  colors?: string[];
  wedding_date?: Date;
  style?: string;
  season?: string;
  budget_range?: { min: number; max: number };
  exclude_allergens?: string[];
  sustainability_minimum?: number;
  wedding_uses?: string[];
  region?: string;
  limit?: number;
}

export interface FlowerSearchResults {
  flowers: FlowerResult[];
  search_metadata: {
    total_results: number;
    avg_seasonal_score: number;
    avg_sustainability_score: number;
    search_criteria: FlowerSearchCriteria;
    generated_at: string;
  };
}

export interface FlowerResult {
  id: string;
  common_name: string;
  scientific_name: string;
  color_variants: any[];
  seasonal_score: number;
  availability_score: number;
  price_estimate: {
    per_stem: number;
    currency: string;
    last_updated: string;
  };
  sustainability: {
    score: number;
    carbon_footprint: number;
    certifications: string[];
  };
  allergen_info: {
    pollen: string;
    fragrance: string;
    contact_safe: boolean;
  };
  wedding_suitability: {
    bouquet: boolean;
    centerpiece: boolean;
    ceremony: boolean;
    boutonniere: boolean;
  };
  color_match_score?: number;
  matched_color?: any;
  color_compatibility?: string;
  composite_score: number;
  ranking_factors: {
    seasonal: number;
    color_match?: number;
    sustainability?: number;
    availability?: number;
    price_fit?: number;
  };
}

export class FloristIntelligenceService {
  private openai: OpenAI;
  private supabase;
  private rateLimit: Map<string, { count: number; window: number }> = new Map();

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }

  async searchFlowersWithIntelligence(
    criteria: FlowerSearchCriteria,
    userId?: string,
  ): Promise<FlowerSearchResults> {
    try {
      // Rate limiting
      if (userId) {
        await this.checkRateLimit(userId, 'flower_search', 100, 3600000); // 100 per hour
      }

      // Step 1: Get base flower data from database
      let query = this.supabase.from('flower_varieties').select(`
          *,
          flower_color_matches(*),
          flower_sustainability_data(*),
          flower_allergen_data(*)
        `);

      // Apply basic filters
      if (criteria.wedding_uses?.length) {
        criteria.wedding_uses.forEach((use) => {
          query = query.filter('wedding_uses', 'cs', `{"${use}": true}`);
        });
      }

      const { data: flowers, error } = await query;
      if (error) throw error;

      if (!flowers || flowers.length === 0) {
        return {
          flowers: [],
          search_metadata: {
            total_results: 0,
            avg_seasonal_score: 0,
            avg_sustainability_score: 0,
            search_criteria: criteria,
            generated_at: new Date().toISOString(),
          },
        };
      }

      // Step 2: Apply AI-powered seasonal scoring
      const seasonallyScored = await this.applySeasonalIntelligence(
        flowers,
        criteria,
      );

      // Step 3: Apply color matching if specified
      const colorMatched = criteria.colors?.length
        ? await this.applyColorMatching(seasonallyScored, criteria.colors)
        : seasonallyScored;

      // Step 4: Apply sustainability filtering
      const sustainabilityFiltered = criteria.sustainability_minimum
        ? colorMatched.filter(
            (f) =>
              (f.sustainability_score || 0) >= criteria.sustainability_minimum!,
          )
        : colorMatched;

      // Step 5: Apply allergen filtering
      const allergenSafe = criteria.exclude_allergens?.length
        ? this.applyAllergenFiltering(
            sustainabilityFiltered,
            criteria.exclude_allergens,
          )
        : sustainabilityFiltered;

      // Step 6: Get pricing data and availability
      const withPricing = await this.enhanceWithPricingData(
        allergenSafe,
        criteria,
      );

      // Step 7: Rank and return results
      const rankedResults = this.rankFlowerResults(withPricing, criteria);

      // Audit logging (GDPR-compliant)
      if (userId) {
        await this.auditLog('flower_search', {
          userId: this.hashUserId(userId),
          searchCriteria: this.sanitizeForLogging(criteria),
          resultCount: rankedResults.flowers.length,
          timestamp: new Date().toISOString(),
        });
      }

      return rankedResults;
    } catch (error) {
      console.error('Flower search failed:', error);
      throw new Error(
        `Failed to search flowers with intelligence: ${error.message}`,
      );
    }
  }

  private async applySeasonalIntelligence(
    flowers: any[],
    criteria: FlowerSearchCriteria,
  ): Promise<any[]> {
    const weddingMonth =
      criteria.wedding_date?.getMonth() + 1 || new Date().getMonth() + 1;

    return flowers.map((flower) => {
      const seasonality = flower.seasonality || {};
      let seasonalScore = 0.5; // Base score

      // Peak season bonus
      if (seasonality.peak?.includes(weddingMonth)) {
        seasonalScore = 1.0;
      }
      // Available season
      else if (seasonality.available?.includes(weddingMonth)) {
        seasonalScore = 0.8;
      }
      // Scarce season penalty
      else if (seasonality.scarce?.includes(weddingMonth)) {
        seasonalScore = 0.3;
      }

      return {
        ...flower,
        seasonal_score: seasonalScore,
        price_multiplier: this.calculatePriceMultiplier(seasonalScore),
        seasonal_notes: this.getSeasonalNotes(flower, weddingMonth),
      };
    });
  }

  private async applyColorMatching(
    flowers: any[],
    targetColors: string[],
  ): Promise<any[]> {
    const flowersWithColorScores = await Promise.all(
      flowers.map(async (flower) => {
        const colorMatches = flower.flower_color_matches || [];
        let bestColorMatch = 0;
        let matchedColor = null;

        // Find best color match for this flower
        for (const targetColor of targetColors) {
          for (const flowerColor of colorMatches) {
            const similarity = this.calculateColorSimilarity(
              targetColor,
              flowerColor.color_hex,
            );
            if (similarity > bestColorMatch) {
              bestColorMatch = similarity;
              matchedColor = flowerColor;
            }
          }
        }

        return {
          ...flower,
          color_match_score: bestColorMatch,
          matched_color: matchedColor,
          color_compatibility:
            bestColorMatch > 0.7
              ? 'excellent'
              : bestColorMatch > 0.5
                ? 'good'
                : bestColorMatch > 0.3
                  ? 'fair'
                  : 'poor',
        };
      }),
    );

    // Filter out flowers with very poor color matches unless no good matches found
    const goodMatches = flowersWithColorScores.filter(
      (f) => f.color_match_score > 0.3,
    );
    return goodMatches.length > 0
      ? goodMatches
      : flowersWithColorScores.slice(0, 10);
  }

  private calculateColorSimilarity(color1: string, color2: string): number {
    // Convert hex colors to LAB space for perceptual similarity
    const lab1 = this.hexToLab(color1);
    const lab2 = this.hexToLab(color2);

    // Calculate Delta E (perceptual color difference)
    const deltaE = Math.sqrt(
      Math.pow(lab1.L - lab2.L, 2) +
        Math.pow(lab1.a - lab2.a, 2) +
        Math.pow(lab1.b - lab2.b, 2),
    );

    // Convert to similarity score (0-1, where 1 is identical)
    return Math.max(0, 1 - deltaE / 100);
  }

  private hexToLab(hex: string): { L: number; a: number; b: number } {
    // Convert hex to RGB
    const rgb = this.hexToRgb(hex);

    // Convert RGB to XYZ (D65 illuminant)
    let r = rgb.r / 255;
    let g = rgb.g / 255;
    let b = rgb.b / 255;

    // Gamma correction
    r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
    g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
    b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

    // Convert to XYZ
    const x = (r * 0.4124 + g * 0.3576 + b * 0.1805) * 100;
    const y = (r * 0.2126 + g * 0.7152 + b * 0.0722) * 100;
    const z = (r * 0.0193 + g * 0.1192 + b * 0.9505) * 100;

    // Convert XYZ to LAB
    const xn = 95.047; // D65 illuminant
    const yn = 100.0;
    const zn = 108.883;

    let fx =
      x / xn > 0.008856
        ? Math.pow(x / xn, 1 / 3)
        : ((903.3 * x) / xn + 16) / 116;
    let fy =
      y / yn > 0.008856
        ? Math.pow(y / yn, 1 / 3)
        : ((903.3 * y) / yn + 16) / 116;
    let fz =
      z / zn > 0.008856
        ? Math.pow(z / zn, 1 / 3)
        : ((903.3 * z) / zn + 16) / 116;

    const L = 116 * fy - 16;
    const a = 500 * (fx - fy);
    const bVal = 200 * (fy - fz);

    return { L, a, b: bVal };
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 0, g: 0, b: 0 };
  }

  private applyAllergenFiltering(
    flowers: any[],
    excludeAllergens: string[],
  ): any[] {
    return flowers.filter((flower) => {
      const allergenData = flower.flower_allergen_data || [];

      for (const exclusion of excludeAllergens) {
        const allergenInfo = allergenData.find(
          (a: any) => a.allergen_type === exclusion,
        );
        if (
          allergenInfo &&
          ['high', 'severe'].includes(allergenInfo.severity_level)
        ) {
          return false; // Exclude this flower
        }
      }

      return true;
    });
  }

  private async enhanceWithPricingData(
    flowers: any[],
    criteria: FlowerSearchCriteria,
  ): Promise<any[]> {
    const month =
      criteria.wedding_date?.getMonth() + 1 || new Date().getMonth() + 1;
    const region = criteria.region || 'US';

    return await Promise.all(
      flowers.map(async (flower) => {
        // Get current pricing for this flower
        const { data: pricing } = await this.supabase
          .from('flower_pricing')
          .select('*')
          .eq('flower_id', flower.id)
          .eq('region', region)
          .eq('month', month)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const basePrice = pricing?.base_price_per_stem || 2.5; // Default fallback
        const adjustedPrice = basePrice * (flower.price_multiplier || 1.0);

        return {
          ...flower,
          current_pricing: {
            base_price: basePrice,
            adjusted_price: adjustedPrice,
            currency: 'USD',
            availability_score: pricing?.availability_score || 0.5,
            last_updated: pricing?.updated_at,
          },
        };
      }),
    );
  }

  private rankFlowerResults(
    flowers: any[],
    criteria: FlowerSearchCriteria,
  ): FlowerSearchResults {
    // Calculate composite score for each flower
    const scored = flowers.map((flower) => {
      let score = 0;
      let weights = 0;

      // Seasonal appropriateness (30% weight)
      score += flower.seasonal_score * 0.3;
      weights += 0.3;

      // Color matching (25% weight if colors specified)
      if (criteria.colors?.length) {
        score += (flower.color_match_score || 0) * 0.25;
        weights += 0.25;
      }

      // Sustainability (20% weight if specified)
      if (criteria.sustainability_minimum) {
        score += (flower.sustainability_score || 0) * 0.2;
        weights += 0.2;
      }

      // Availability (15% weight)
      score += (flower.current_pricing?.availability_score || 0.5) * 0.15;
      weights += 0.15;

      // Price appropriateness (10% weight if budget specified)
      if (criteria.budget_range) {
        const priceScore = this.calculatePriceScore(
          flower.current_pricing?.adjusted_price,
          criteria.budget_range,
        );
        score += priceScore * 0.1;
        weights += 0.1;
      }

      return {
        ...flower,
        composite_score: weights > 0 ? score / weights : score,
        ranking_factors: {
          seasonal: flower.seasonal_score,
          color_match: flower.color_match_score || null,
          sustainability: flower.sustainability_score || null,
          availability: flower.current_pricing?.availability_score || null,
          price_fit: criteria.budget_range
            ? this.calculatePriceScore(
                flower.current_pricing?.adjusted_price,
                criteria.budget_range,
              )
            : null,
        },
      };
    });

    // Sort by composite score
    scored.sort((a, b) => b.composite_score - a.composite_score);

    return {
      flowers: scored.slice(0, criteria.limit || 20),
      search_metadata: {
        total_results: scored.length,
        avg_seasonal_score:
          scored.reduce((sum, f) => sum + f.seasonal_score, 0) / scored.length,
        avg_sustainability_score:
          scored.reduce((sum, f) => sum + (f.sustainability_score || 0), 0) /
          scored.length,
        search_criteria: criteria,
        generated_at: new Date().toISOString(),
      },
    };
  }

  // AI Color Palette Generation
  async generateColorPalette(
    baseColors: string[],
    style: string,
    season: string,
    userId?: string,
  ): Promise<any> {
    try {
      // Rate limiting
      if (userId) {
        await this.checkRateLimit(
          userId,
          'color_palette_generation',
          10,
          3600000,
        ); // 10 per hour
      }

      // Input validation and sanitization
      const validColors = baseColors.filter((color) =>
        /^#[0-9A-F]{6}$/i.test(color),
      );
      const validStyle = [
        'romantic',
        'modern',
        'rustic',
        'classic',
        'bohemian',
      ].includes(style)
        ? style
        : 'classic';
      const validSeason = ['spring', 'summer', 'fall', 'winter'].includes(
        season,
      )
        ? season
        : 'spring';

      if (validColors.length === 0) {
        throw new Error('At least one valid hex color is required');
      }

      const prompt = this.buildColorPalettePrompt(
        validColors,
        validStyle,
        validSeason,
      );

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content:
              'You are a professional wedding color consultant with expertise in color theory, floral design, and seasonal appropriateness. Create sophisticated, harmonious color palettes that work beautifully for weddings. Always respond with valid JSON only.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 800,
      });

      const paletteText = response.choices[0]?.message?.content;
      if (!paletteText) {
        throw new Error('No color palette received from AI');
      }

      const aiPalette = JSON.parse(paletteText);

      // Find matching flowers for the generated palette
      const flowerMatches = await this.findMatchingFlowers(aiPalette);

      // Analyze seasonal appropriateness
      const seasonalAnalysis = await this.analyzeSeasonalFit(
        flowerMatches,
        validSeason,
      );

      // Generate alternatives if seasonal fit is poor
      const alternatives =
        seasonalAnalysis.overall_fit < 0.6
          ? await this.generateAlternativePalettes(
              validColors,
              validStyle,
              validSeason,
            )
          : [];

      const result = {
        primary_palette: aiPalette,
        flower_matches: flowerMatches,
        seasonal_analysis: seasonalAnalysis,
        alternatives: alternatives,
        generated_at: new Date().toISOString(),
      };

      // Audit logging
      if (userId) {
        await this.auditLog('color_palette_generation', {
          userId: this.hashUserId(userId),
          baseColors: validColors,
          style: validStyle,
          season: validSeason,
          seasonalFit: seasonalAnalysis.overall_fit,
          timestamp: new Date().toISOString(),
        });
      }

      return result;
    } catch (error) {
      console.error('Color palette generation failed:', error);
      throw new Error(`Failed to generate color palette: ${error.message}`);
    }
  }

  private buildColorPalettePrompt(
    colors: string[],
    style: string,
    season: string,
  ): string {
    return `Create a sophisticated wedding color palette based on these requirements:

Base Colors: ${colors.join(', ')}
Wedding Style: ${style}
Season: ${season}

Generate a complete color palette including:

1. PRIMARY COLORS (2-3 colors):
   - Main wedding colors that will be most prominent
   - Should include or build upon the provided base colors

2. ACCENT COLORS (2-3 colors):
   - Supporting colors that complement the primary palette
   - Can be bolder or more dramatic for visual interest

3. NEUTRAL COLORS (1-2 colors):
   - Balancing colors like creams, whites, or soft grays
   - Should ground the palette and provide rest for the eye

Return as JSON with this exact structure:
{
  "primary_colors": [{"hex": "#hexcode", "name": "Color Name", "description": "Why this color works"}],
  "accent_colors": [{"hex": "#hexcode", "name": "Color Name", "description": "Role in palette"}],
  "neutral_colors": [{"hex": "#hexcode", "name": "Color Name", "description": "Balancing purpose"}],
  "palette_name": "Descriptive palette name",
  "style_reasoning": "Why this palette suits the style",
  "seasonal_appropriateness": "How it fits the season"
}`;
  }

  // Sustainability Analysis
  async analyzeSustainability(
    flowerSelections: Array<{ flower_id: string; quantity: number }>,
    weddingLocation: { lat: number; lng: number; region: string },
    userId?: string,
  ): Promise<any> {
    try {
      if (userId) {
        await this.checkRateLimit(
          userId,
          'sustainability_analysis',
          20,
          3600000,
        ); // 20 per hour
      }

      let totalCarbonFootprint = 0;
      let totalCost = 0;
      let localFlowerCount = 0;
      let seasonalFlowerCount = 0;
      let organicFlowerCount = 0;
      const detailedBreakdown = [];

      for (const selection of flowerSelections) {
        // Get flower data with sustainability info
        const { data: flower, error } = await this.supabase
          .from('flower_varieties')
          .select(
            `
            *,
            flower_sustainability_data(*),
            flower_pricing(*)
          `,
          )
          .eq('id', selection.flower_id)
          .single();

        if (error || !flower) continue;

        const sustainabilityData = flower.flower_sustainability_data?.[0];
        const pricingData = flower.flower_pricing?.[0];

        const carbonPerStem =
          sustainabilityData?.carbon_footprint_per_stem || 0.5; // Default estimate
        const selectionCarbon = carbonPerStem * selection.quantity;
        totalCarbonFootprint += selectionCarbon;

        const costPerStem = pricingData?.base_price_per_stem || 2.5;
        totalCost += costPerStem * selection.quantity;

        // Check if local (within 100km)
        const isLocal =
          sustainabilityData?.average_transport_distance_km <= 100;
        if (isLocal) localFlowerCount += selection.quantity;

        // Check if organic
        const isOrganic =
          sustainabilityData?.certifications?.includes('organic') || false;
        if (isOrganic) organicFlowerCount += selection.quantity;

        detailedBreakdown.push({
          flower: {
            id: flower.id,
            common_name: flower.common_name,
            scientific_name: flower.scientific_name,
          },
          quantity: selection.quantity,
          sustainability_score: flower.sustainability_score || 0.5,
          carbon_footprint: selectionCarbon,
          distance_km: sustainabilityData?.average_transport_distance_km || 500,
          is_local: isLocal,
          is_organic: isOrganic,
          certifications: sustainabilityData?.certifications || [],
          issues: this.identifySustainabilityIssues(flower, sustainabilityData),
        });
      }

      const totalQuantity = flowerSelections.reduce(
        (sum, s) => sum + s.quantity,
        0,
      );
      const localPercentage =
        totalQuantity > 0 ? (localFlowerCount / totalQuantity) * 100 : 0;
      const organicPercentage =
        totalQuantity > 0 ? (organicFlowerCount / totalQuantity) * 100 : 0;

      const overallScore = this.calculateOverallSustainabilityScore(
        localPercentage,
        organicPercentage,
        totalCarbonFootprint / totalQuantity,
      );

      const recommendations =
        await this.generateSustainabilityRecommendations(detailedBreakdown);

      const result = {
        analysis: {
          overall_score: overallScore,
          total_carbon_footprint: totalCarbonFootprint,
          local_percentage: localPercentage,
          seasonal_percentage: 75, // TODO: Calculate based on wedding date
          certifications: {
            organic: organicPercentage,
            fair_trade: 0, // TODO: Calculate from data
            carbon_neutral: 0, // TODO: Calculate from data
          },
          detailed_breakdown: detailedBreakdown,
          recommendations,
        },
      };

      // Audit logging
      if (userId) {
        await this.auditLog('sustainability_analysis', {
          userId: this.hashUserId(userId),
          totalFlowers: totalQuantity,
          totalCarbonFootprint,
          overallScore,
          timestamp: new Date().toISOString(),
        });
      }

      return { success: true, ...result };
    } catch (error) {
      console.error('Sustainability analysis failed:', error);
      throw new Error(`Failed to analyze sustainability: ${error.message}`);
    }
  }

  // Utility methods
  private async findMatchingFlowers(palette: any): Promise<any[]> {
    const allColors = [
      ...(palette.primary_colors || []),
      ...(palette.accent_colors || []),
      ...(palette.neutral_colors || []),
    ];

    const flowerMatches = [];

    for (const color of allColors) {
      try {
        const { data: matchingFlowers, error } = await this.supabase
          .from('flower_color_matches')
          .select(
            `
            *,
            flower_varieties (
              id,
              common_name,
              scientific_name,
              seasonality,
              sustainability_score,
              wedding_uses,
              allergen_info
            )
          `,
          )
          .gte('match_accuracy', 0.6);

        if (error) throw error;

        const scoredMatches = (matchingFlowers || [])
          .map((match) => ({
            ...match,
            color_similarity: this.calculateColorSimilarity(
              color.hex,
              match.color_hex,
            ),
            flower: match.flower_varieties,
          }))
          .filter((match) => match.color_similarity > 0.5)
          .sort((a, b) => b.color_similarity - a.color_similarity)
          .slice(0, 5);

        flowerMatches.push({
          target_color: color,
          matching_flowers: scoredMatches,
          match_count: scoredMatches.length,
        });
      } catch (error) {
        console.error(`Error finding flowers for color ${color.hex}:`, error);
        flowerMatches.push({
          target_color: color,
          matching_flowers: [],
          match_count: 0,
          error: error.message,
        });
      }
    }

    return flowerMatches;
  }

  private async analyzeSeasonalFit(
    flowerMatches: any[],
    season: string,
  ): Promise<any> {
    const seasonNum = this.getSeasonMonths(season);
    let totalFlowers = 0;
    let seasonallyAppropriate = 0;
    let wellMatched = 0;

    for (const colorMatch of flowerMatches) {
      for (const flower of colorMatch.matching_flowers) {
        totalFlowers++;

        if (flower.color_similarity > 0.7) {
          wellMatched++;
        }

        // Check if flower is in season
        const flowerSeasonality = flower.flower?.seasonality || {};
        const isInSeason = seasonNum.some(
          (month) =>
            flowerSeasonality.peak?.includes(month) ||
            flowerSeasonality.available?.includes(month),
        );

        if (isInSeason) {
          seasonallyAppropriate++;
        }
      }
    }

    const seasonalFitScore =
      totalFlowers > 0 ? seasonallyAppropriate / totalFlowers : 0;
    const colorMatchScore = totalFlowers > 0 ? wellMatched / totalFlowers : 0;
    const overallFit = (seasonalFitScore + colorMatchScore) / 2;

    return {
      overall_fit: overallFit,
      seasonal_fit_score: seasonalFitScore,
      color_match_score: colorMatchScore,
      total_flowers_analyzed: totalFlowers,
      seasonally_appropriate_count: seasonallyAppropriate,
      well_matched_count: wellMatched,
      recommendations: this.generateSeasonalRecommendations(
        overallFit,
        seasonalFitScore,
        colorMatchScore,
      ),
      season_analyzed: season,
    };
  }

  private async generateAlternativePalettes(
    baseColors: string[],
    style: string,
    season: string,
  ): Promise<any[]> {
    const alternatives = [];

    for (let i = 0; i < 3; i++) {
      try {
        const altPrompt = `Create an alternative wedding color palette (variation ${i + 1}) that improves on the seasonal flower availability:

Base Colors: ${baseColors.join(', ')}
Style: ${style}
Season: ${season}

Focus on colors that are easier to achieve with ${season} flowers while maintaining the overall aesthetic. Make this palette distinctly different from previous variations while staying true to the style and base colors.

Use the same JSON structure as before.`;

        const response = await this.openai.chat.completions.create({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content:
                'Create alternative wedding color palettes optimized for seasonal flower availability.',
            },
            {
              role: 'user',
              content: altPrompt,
            },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.8,
          max_tokens: 600,
        });

        const altPaletteText = response.choices[0]?.message?.content;
        if (altPaletteText) {
          const altPalette = JSON.parse(altPaletteText);
          const altFlowerMatches = await this.findMatchingFlowers(altPalette);
          const altSeasonalAnalysis = await this.analyzeSeasonalFit(
            altFlowerMatches,
            season,
          );

          alternatives.push({
            palette: altPalette,
            flower_matches: altFlowerMatches,
            seasonal_analysis: altSeasonalAnalysis,
            variation_number: i + 1,
          });
        }
      } catch (error) {
        console.error(`Error generating alternative palette ${i + 1}:`, error);
      }
    }

    return alternatives;
  }

  // Security and utility helper methods
  private async checkRateLimit(
    userId: string,
    action: string,
    limit: number,
    windowMs: number,
  ): Promise<void> {
    const key = `${userId}:${action}`;
    const now = Date.now();
    const entry = this.rateLimit.get(key);

    if (!entry || now - entry.window > windowMs) {
      this.rateLimit.set(key, { count: 1, window: now });
      return;
    }

    if (entry.count >= limit) {
      throw new Error(`Rate limit exceeded for ${action}. Try again later.`);
    }

    entry.count++;
  }

  private sanitizePromptInput(input: any): string {
    const dangerous = [
      'ignore previous instructions',
      'system:',
      'assistant:',
      'user:',
      '\\n\\nHuman:',
      '\\n\\nAssistant:',
      '<|im_start|>',
      '<|im_end|>',
      'OVERRIDE SECURITY',
    ];

    let sanitized = JSON.stringify(input);
    dangerous.forEach((phrase) => {
      sanitized = sanitized.replace(new RegExp(phrase, 'gi'), '[FILTERED]');
    });

    return sanitized.slice(0, 2000);
  }

  private hashUserId(userId: string): string {
    return crypto
      .createHash('sha256')
      .update(userId)
      .digest('hex')
      .substring(0, 16);
  }

  private sanitizeForLogging(data: any): any {
    const sanitized = { ...data };
    delete sanitized.userId;
    delete sanitized.personalInfo;
    return sanitized;
  }

  private async auditLog(action: string, data: any): Promise<void> {
    // Simple audit logging - in production this would go to a proper audit system
    console.log(`AUDIT: ${action}`, data);
  }

  private calculatePriceScore(
    price: number,
    budget: { min: number; max: number },
  ): number {
    if (!price) return 0.5;

    if (price >= budget.min && price <= budget.max) {
      return 1.0; // Perfect fit
    } else if (price < budget.min) {
      return 0.8; // Below budget (good but maybe quality concern)
    } else {
      const overageRatio = price / budget.max;
      return Math.max(0, 1 - (overageRatio - 1) * 2); // Penalty for being over budget
    }
  }

  private calculatePriceMultiplier(seasonalScore: number): number {
    if (seasonalScore >= 0.8) return 1.0; // In season, normal price
    if (seasonalScore >= 0.5) return 1.2; // Moderate season, slight premium
    return 1.5; // Out of season, significant premium
  }

  private getSeasonalNotes(flower: any, month: number): string[] {
    const notes = [];
    const seasonality = flower.seasonality || {};

    if (seasonality.peak?.includes(month)) {
      notes.push('Peak season - best quality and availability');
    } else if (seasonality.available?.includes(month)) {
      notes.push('Available but not peak season');
    } else if (seasonality.scarce?.includes(month)) {
      notes.push('Out of season - limited availability and higher prices');
    } else {
      notes.push('Seasonal data unavailable');
    }

    return notes;
  }

  private getSeasonMonths(season: string): number[] {
    switch (season.toLowerCase()) {
      case 'spring':
        return [3, 4, 5];
      case 'summer':
        return [6, 7, 8];
      case 'fall':
      case 'autumn':
        return [9, 10, 11];
      case 'winter':
        return [12, 1, 2];
      default:
        return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    }
  }

  private generateSeasonalRecommendations(
    overallFit: number,
    seasonalFit: number,
    colorFit: number,
  ): string[] {
    const recommendations = [];

    if (overallFit >= 0.8) {
      recommendations.push(
        'Excellent palette - great flower availability and color matches',
      );
    } else if (overallFit >= 0.6) {
      recommendations.push('Good palette with minor adjustments possible');
    } else {
      recommendations.push(
        'Consider palette modifications for better flower availability',
      );
    }

    if (seasonalFit < 0.5) {
      recommendations.push(
        'Many flowers in this palette may be out of season - expect higher costs',
      );
      recommendations.push(
        'Consider seasonal alternatives or adjust wedding date for optimal flower availability',
      );
    }

    if (colorFit < 0.6) {
      recommendations.push(
        'Some colors may be difficult to match perfectly in flowers',
      );
      recommendations.push(
        'Consider silk flowers or dyed options for exact color matching',
      );
    }

    return recommendations;
  }

  private identifySustainabilityIssues(
    flower: any,
    sustainabilityData: any,
  ): string[] {
    const issues = [];

    if ((sustainabilityData?.carbon_footprint_per_stem || 0.5) > 1.0) {
      issues.push('High carbon footprint');
    }

    if ((sustainabilityData?.average_transport_distance_km || 500) > 1000) {
      issues.push('Long transportation distance');
    }

    if ((sustainabilityData?.pesticide_usage_score || 0.5) > 0.7) {
      issues.push('High pesticide usage');
    }

    if ((sustainabilityData?.labor_conditions_score || 0.8) < 0.5) {
      issues.push('Poor labor conditions');
    }

    return issues;
  }

  private calculateOverallSustainabilityScore(
    localPercentage: number,
    organicPercentage: number,
    avgCarbonPerStem: number,
  ): number {
    // Weighted scoring: local 40%, organic 30%, carbon footprint 30%
    const localScore = localPercentage / 100;
    const organicScore = organicPercentage / 100;
    const carbonScore = Math.max(0, 1 - avgCarbonPerStem / 2.0); // 2.0 kg is very high

    return localScore * 0.4 + organicScore * 0.3 + carbonScore * 0.3;
  }

  private async generateSustainabilityRecommendations(
    breakdown: any[],
  ): Promise<any[]> {
    const recommendations = [];

    // Identify high-impact flowers
    const highCarbonFlowers = breakdown
      .filter((item) => item.carbon_footprint / item.quantity > 1.0)
      .sort(
        (a, b) =>
          b.carbon_footprint / b.quantity - a.carbon_footprint / a.quantity,
      );

    if (highCarbonFlowers.length > 0) {
      // Find local alternatives for high-carbon flowers
      for (const highCarbonItem of highCarbonFlowers.slice(0, 3)) {
        const { data: alternatives } = await this.supabase
          .from('flower_varieties')
          .select(
            `
            *,
            flower_sustainability_data!inner(*)
          `,
          )
          .filter(
            'flower_sustainability_data.average_transport_distance_km',
            'lt',
            200,
          )
          .filter('wedding_uses', 'cs', highCarbonItem.flower.wedding_uses)
          .limit(3);

        if (alternatives && alternatives.length > 0) {
          recommendations.push({
            type: 'substitution',
            description: `Replace ${highCarbonItem.flower.common_name} with local alternatives like ${alternatives[0].common_name}`,
            impact: {
              carbon_reduction:
                (highCarbonItem.carbon_footprint / highCarbonItem.quantity) *
                0.6,
              cost_change: -0.15, // Usually 15% savings
              sustainability_improvement: 0.3,
            },
            alternatives: alternatives.slice(0, 2),
          });
        }
      }
    }

    return recommendations;
  }
}
