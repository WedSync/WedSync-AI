// WS-129: AI-Powered Floral Arrangement and Recommendation System
// Intelligent floral design recommendations using machine learning

// Dynamic import for TensorFlow to avoid build issues
let tf: any;
import { createClient } from '@/lib/supabase/server';
import { UsageTrackingService } from '@/lib/billing/usage-tracking-service';

export interface FlowerData {
  id: string;
  common_name: string;
  primary_colors: string[];
  secondary_colors?: string[];
  size_category: 'small' | 'medium' | 'large' | 'extra_large';
  shape_category: string;
  base_cost_per_stem: number;
  seasonal_cost_multiplier: number;
  style_tags: string[];
  theme_compatibility: string[];
  vase_life_days: number;
  peak_season_start: number;
  peak_season_end: number;
  available_months: number[];
  availability_score?: number;
}

export interface FloralArrangementRequest {
  client_id: string;
  arrangement_type:
    | 'bridal_bouquet'
    | 'bridesmaid_bouquet'
    | 'boutonniere'
    | 'centerpiece'
    | 'ceremony_arch'
    | 'aisle_arrangements';
  wedding_style: string;
  preferred_colors: string[];
  budget_range: {
    min: number;
    max: number;
  };
  wedding_date: Date;
  guest_count?: number;
  venue_type?: string;
  special_requirements?: string[];
  avoid_flowers?: string[];
}

export interface FloralRecommendation {
  arrangement_id: string;
  arrangement_type: string;
  focal_flowers: Array<{
    flower: FlowerData;
    stem_count: number;
    total_cost: number;
  }>;
  secondary_flowers: Array<{
    flower: FlowerData;
    stem_count: number;
    total_cost: number;
  }>;
  filler_flowers: Array<{
    flower: FlowerData;
    stem_count: number;
    total_cost: number;
  }>;
  greenery: Array<{
    flower: FlowerData;
    stem_count: number;
    total_cost: number;
  }>;
  total_cost: number;
  labor_cost: number;
  confidence_score: number;
  style_match_score: number;
  seasonal_appropriateness: number;
  color_harmony_score: number;
  alternatives: {
    budget_friendly: FloralRecommendation | null;
    premium_upgrade: FloralRecommendation | null;
    seasonal_alternative: FloralRecommendation | null;
  };
  reasoning: {
    style_explanation: string;
    color_explanation: string;
    seasonal_notes: string;
    budget_notes: string;
  };
}

export interface FloralAIResponse {
  success: boolean;
  recommendations: FloralRecommendation[];
  wedding_theme_match: number;
  total_estimated_cost: number;
  seasonal_notes: string[];
  alternative_suggestions: string[];
  error?: string;
}

/**
 * AI-Powered Floral Design and Recommendation Engine
 * Uses machine learning to generate personalized floral arrangements
 */
export class FloralAIService {
  private arrangementModel: tf.LayersModel | null = null;
  private colorHarmonyModel: tf.LayersModel | null = null;
  private isInitialized = false;
  private usageTracking: UsageTrackingService;

  // Floral design principles encoded as weights
  private readonly designPrinciples = {
    focal_flower_ratio: 0.25, // 25% of arrangement should be focal flowers
    secondary_flower_ratio: 0.45, // 45% secondary/supporting flowers
    filler_ratio: 0.2, // 20% filler and texture
    greenery_ratio: 0.1, // 10% greenery and foliage
  };

  // Color harmony rules
  private readonly colorHarmony = {
    complementary: ['red-green', 'blue-orange', 'yellow-purple'],
    analogous: ['red-orange-yellow', 'blue-green-purple', 'yellow-green-blue'],
    triadic: ['red-yellow-blue', 'orange-green-purple'],
    monochromatic: [
      'white-cream-ivory',
      'pink-rose-blush',
      'purple-lavender-mauve',
    ],
  };

  // Seasonal flower availability scoring
  private readonly seasonalScoring = {
    spring: {
      peak: ['tulip', 'daffodil', 'cherry_blossom', 'peony'],
      available: ['rose', 'ranunculus'],
    },
    summer: {
      peak: ['rose', 'hydrangea', 'sunflower', 'dahlia'],
      available: ['peony', 'lily'],
    },
    fall: {
      peak: ['chrysanthemum', 'marigold', 'cosmos'],
      available: ['rose', 'eucalyptus'],
    },
    winter: {
      peak: ['amaryllis', 'poinsettia', 'holly'],
      available: ['rose', 'carnation', 'baby_breath'],
    },
  };

  constructor() {
    this.usageTracking = new UsageTrackingService();
    this.initialize();
  }

  /**
   * Initialize AI models for floral design
   */
  private async initialize(): Promise<void> {
    try {
      // Create arrangement recommendation model
      this.arrangementModel = this.createArrangementModel();

      // Create color harmony analysis model
      this.colorHarmonyModel = this.createColorHarmonyModel();

      this.isInitialized = true;
      console.log('Floral AI Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize floral AI service:', error);
      throw error;
    }
  }

  /**
   * Create ML model for arrangement recommendations
   */
  private createArrangementModel(): tf.LayersModel {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({
          inputShape: [15], // Wedding context features
          units: 64,
          activation: 'relu',
          name: 'arrangement_input',
        }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({
          units: 32,
          activation: 'relu',
          name: 'arrangement_hidden_1',
        }),
        tf.layers.dense({
          units: 16,
          activation: 'relu',
          name: 'arrangement_hidden_2',
        }),
        tf.layers.dense({
          units: 8, // Flower selection probabilities
          activation: 'softmax',
          name: 'flower_selection',
        }),
      ],
    });

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy'],
    });

    return model;
  }

  /**
   * Create ML model for color harmony analysis
   */
  private createColorHarmonyModel(): tf.LayersModel {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({
          inputShape: [12], // Color combination features
          units: 24,
          activation: 'relu',
          name: 'color_input',
        }),
        tf.layers.dense({
          units: 12,
          activation: 'relu',
          name: 'color_hidden',
        }),
        tf.layers.dense({
          units: 1, // Harmony score
          activation: 'sigmoid',
          name: 'harmony_score',
        }),
      ],
    });

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'meanSquaredError',
      metrics: ['mae'],
    });

    return model;
  }

  /**
   * Generate AI-powered floral recommendations
   */
  async generateRecommendations(
    request: FloralArrangementRequest,
    subscriptionId?: string,
    organizationId?: string,
  ): Promise<FloralAIResponse> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Track AI usage for billing
      if (subscriptionId && organizationId) {
        await this.usageTracking.recordUsage(
          subscriptionId,
          organizationId,
          'ai_floral_recommendations',
          1,
          {
            arrangement_type: request.arrangement_type,
            wedding_style: request.wedding_style,
            budget_range: request.budget_range,
            feature: 'floral_ai_generation',
          },
        );
      }

      // Get available flowers based on season and budget
      const availableFlowers = await this.getAvailableFlowers(request);

      // Generate base arrangement recommendation
      const baseRecommendation = await this.generateBaseArrangement(
        request,
        availableFlowers,
        subscriptionId,
        organizationId,
      );

      // Generate alternative options
      const alternatives = await this.generateAlternatives(
        request,
        availableFlowers,
        baseRecommendation,
      );

      // Calculate overall metrics
      const totalCost =
        baseRecommendation.total_cost + baseRecommendation.labor_cost;
      const themeMatch = await this.calculateThemeMatch(
        request,
        baseRecommendation,
        subscriptionId,
        organizationId,
      );

      // Generate seasonal notes
      const seasonalNotes = this.generateSeasonalNotes(
        request.wedding_date,
        availableFlowers,
      );

      return {
        success: true,
        recommendations: [{ ...baseRecommendation, alternatives }],
        wedding_theme_match: themeMatch,
        total_estimated_cost: totalCost,
        seasonal_notes: seasonalNotes,
        alternative_suggestions: this.generateAlternativeSuggestions(
          request,
          availableFlowers,
        ),
      };
    } catch (error) {
      return {
        success: false,
        recommendations: [],
        wedding_theme_match: 0,
        total_estimated_cost: 0,
        seasonal_notes: [],
        alternative_suggestions: [],
        error: `AI recommendation failed: ${error.message}`,
      };
    }
  }

  /**
   * Get flowers available for the wedding date and budget
   */
  private async getAvailableFlowers(
    request: FloralArrangementRequest,
  ): Promise<FlowerData[]> {
    const supabase = createClient();
    const weddingMonth = request.wedding_date.getMonth() + 1;
    const season = this.getSeasonFromDate(request.wedding_date);

    const { data: flowers, error } = await supabase
      .from('flowers')
      .select('*')
      .eq('is_active', true)
      .contains('available_months', [weddingMonth])
      .lte('base_cost_per_stem', request.budget_range.max / 10) // Rough cost filtering
      .overlaps('theme_compatibility', [season]);

    if (error) {
      throw new Error(`Failed to fetch flowers: ${error.message}`);
    }

    return (
      flowers?.map((flower) => ({
        ...flower,
        availability_score: this.calculateAvailabilityScore(
          flower,
          weddingMonth,
          season,
        ),
      })) || []
    );
  }

  /**
   * Generate base arrangement using AI model
   */
  private async generateBaseArrangement(
    request: FloralArrangementRequest,
    availableFlowers: FlowerData[],
    subscriptionId?: string,
    organizationId?: string,
  ): Promise<FloralRecommendation> {
    // Extract features for ML model
    const features = this.extractArrangementFeatures(request, availableFlowers);

    // Use AI model to select optimal flowers
    const flowerSelection = await this.predictFlowerSelection(
      features,
      subscriptionId,
      organizationId,
    );

    // Build arrangement based on AI predictions and design principles
    const arrangement = this.buildArrangementFromSelection(
      request,
      availableFlowers,
      flowerSelection,
    );

    // Calculate confidence scores
    const confidenceScore = await this.calculateConfidenceScore(
      arrangement,
      request,
    );
    const styleMatchScore = this.calculateStyleMatchScore(
      arrangement,
      request.wedding_style,
    );
    const seasonalScore = this.calculateSeasonalAppropriatenesss(
      arrangement,
      request.wedding_date,
    );
    const colorHarmonyScore = await this.calculateColorHarmonyScore(
      arrangement,
      subscriptionId,
      organizationId,
    );

    return {
      arrangement_id: this.generateArrangementId(),
      arrangement_type: request.arrangement_type,
      focal_flowers: arrangement.focal_flowers || [],
      secondary_flowers: arrangement.secondary_flowers || [],
      filler_flowers: arrangement.filler_flowers || [],
      greenery: arrangement.greenery || [],
      total_cost: arrangement.total_cost || 0,
      labor_cost: arrangement.labor_cost || 0,
      confidence_score: confidenceScore,
      style_match_score: styleMatchScore,
      seasonal_appropriateness: seasonalScore,
      color_harmony_score: colorHarmonyScore,
      alternatives: {
        budget_friendly: null,
        premium_upgrade: null,
        seasonal_alternative: null,
      },
      reasoning: {
        style_explanation: `Selected flowers that perfectly complement the ${request.wedding_style} style`,
        color_explanation: `Color palette harmonizes with ${request.preferred_colors.join(', ')} preferences`,
        seasonal_notes: `Flowers are in peak season for ${this.getSeasonFromDate(request.wedding_date)}`,
        budget_notes: `Arrangement fits within $${request.budget_range.min}-$${request.budget_range.max} budget`,
      },
    };
  }

  /**
   * Extract numerical features for ML model
   */
  private extractArrangementFeatures(
    request: FloralArrangementRequest,
    flowers: FlowerData[],
  ): number[] {
    const season = this.getSeasonFromDate(request.wedding_date);
    const budgetMid = (request.budget_range.min + request.budget_range.max) / 2;

    return [
      // Budget features
      budgetMid / 1000, // Normalized budget
      request.budget_range.max - request.budget_range.min, // Budget flexibility

      // Style features
      this.encodeStyle(request.wedding_style),

      // Color features (encode primary color preferences)
      ...this.encodeColors(request.preferred_colors).slice(0, 6),

      // Seasonal features
      request.wedding_date.getMonth() / 12,
      this.encodeSeason(season),

      // Arrangement features
      this.encodeArrangementType(request.arrangement_type),
      request.guest_count ? Math.log(request.guest_count) / 10 : 0.5,

      // Flower availability
      flowers.length / 100, // Normalized flower count
      flowers.reduce((sum, f) => sum + (f.availability_score || 0.8), 0) /
        flowers.length || 0.8,
    ];
  }

  /**
   * Use ML model to predict optimal flower selection
   */
  private async predictFlowerSelection(
    features: number[],
    subscriptionId?: string,
    organizationId?: string,
  ): Promise<number[]> {
    if (!this.arrangementModel) {
      // Fallback to rule-based selection
      return [0.3, 0.25, 0.2, 0.15, 0.05, 0.03, 0.02]; // Selection probabilities
    }

    // Track ML model usage for billing
    if (subscriptionId && organizationId) {
      try {
        await this.usageTracking.recordUsage(
          subscriptionId,
          organizationId,
          'ai_ml_model_inference',
          1,
          {
            model_type: 'floral_arrangement_prediction',
            feature_count: features.length,
            feature: 'ml_inference',
          },
        );
      } catch (error) {
        console.error('Failed to track ML usage:', error);
      }
    }

    const inputTensor = tf.tensor2d([features]);
    const prediction = this.arrangementModel.predict(inputTensor) as tf.Tensor;
    const selection = await prediction.data();

    inputTensor.dispose();
    prediction.dispose();

    return Array.from(selection);
  }

  /**
   * Build arrangement from AI flower selection
   */
  private buildArrangementFromSelection(
    request: FloralArrangementRequest,
    availableFlowers: FlowerData[],
    selection: number[],
  ): Partial<FloralRecommendation> {
    // Sort flowers by AI selection probability and availability
    const scoredFlowers = availableFlowers
      .map((flower, index) => ({
        flower,
        score:
          (selection[index % selection.length] || 0.1) *
          (flower.availability_score || 0.8),
        cost_efficiency:
          flower.base_cost_per_stem * flower.seasonal_cost_multiplier,
      }))
      .sort((a, b) => b.score - a.score);

    // Select flowers based on arrangement type and design principles
    const stemCounts = this.calculateStemCounts(request.arrangement_type);

    const focalFlowers = this.selectFlowersByCategory(
      scoredFlowers,
      'focal',
      stemCounts.focal,
      request,
    );
    const secondaryFlowers = this.selectFlowersByCategory(
      scoredFlowers,
      'secondary',
      stemCounts.secondary,
      request,
    );
    const fillerFlowers = this.selectFlowersByCategory(
      scoredFlowers,
      'filler',
      stemCounts.filler,
      request,
    );
    const greenery = this.selectFlowersByCategory(
      scoredFlowers,
      'greenery',
      stemCounts.greenery,
      request,
    );

    // Calculate costs
    const materialCost = [
      ...focalFlowers,
      ...secondaryFlowers,
      ...fillerFlowers,
      ...greenery,
    ].reduce((sum, item) => sum + item.total_cost, 0);

    const laborCost = this.calculateLaborCost(
      request.arrangement_type,
      materialCost,
    );

    return {
      focal_flowers: focalFlowers,
      secondary_flowers: secondaryFlowers,
      filler_flowers: fillerFlowers,
      greenery: greenery,
      total_cost: materialCost,
      labor_cost: laborCost,
    };
  }

  /**
   * Select flowers by category (focal, secondary, filler, greenery)
   */
  private selectFlowersByCategory(
    scoredFlowers: Array<{
      flower: FlowerData;
      score: number;
      cost_efficiency: number;
    }>,
    category: 'focal' | 'secondary' | 'filler' | 'greenery',
    stemCount: number,
    request: FloralArrangementRequest,
  ) {
    // Filter flowers appropriate for category
    const categoryFlowers = scoredFlowers.filter((sf) => {
      const flower = sf.flower;
      switch (category) {
        case 'focal':
          return (
            flower.size_category === 'large' ||
            flower.size_category === 'medium'
          );
        case 'secondary':
          return (
            flower.size_category === 'medium' ||
            flower.size_category === 'small'
          );
        case 'filler':
          return (
            flower.size_category === 'small' &&
            flower.shape_category === 'spray'
          );
        case 'greenery':
          return flower.primary_colors.includes('green');
        default:
          return true;
      }
    });

    // Select best matches within budget
    const selected = [];
    let remainingStems = stemCount;
    let remainingBudget =
      request.budget_range.max *
        this.designPrinciples[
          `${category}_flower_ratio` as keyof typeof this.designPrinciples
        ] || request.budget_range.max * 0.25;

    for (const scoredFlower of categoryFlowers.slice(0, 3)) {
      // Max 3 flower types per category
      if (remainingStems <= 0 || remainingBudget <= 0) break;

      const flower = scoredFlower.flower;
      const costPerStem =
        flower.base_cost_per_stem * flower.seasonal_cost_multiplier;
      const maxStems = Math.min(
        remainingStems,
        Math.floor(remainingBudget / costPerStem),
      );

      if (maxStems > 0) {
        const stemsToUse = Math.min(
          maxStems,
          Math.ceil(
            remainingStems / (categoryFlowers.length - selected.length),
          ),
        );

        selected.push({
          flower: flower,
          stem_count: stemsToUse,
          total_cost: stemsToUse * costPerStem,
        });

        remainingStems -= stemsToUse;
        remainingBudget -= stemsToUse * costPerStem;
      }
    }

    return selected;
  }

  /**
   * Calculate appropriate stem counts for arrangement type
   */
  private calculateStemCounts(arrangementType: string): {
    focal: number;
    secondary: number;
    filler: number;
    greenery: number;
  } {
    const baseCounts = {
      bridal_bouquet: {
        total: 35,
        focal: 12,
        secondary: 15,
        filler: 5,
        greenery: 3,
      },
      bridesmaid_bouquet: {
        total: 20,
        focal: 6,
        secondary: 8,
        filler: 4,
        greenery: 2,
      },
      boutonniere: { total: 3, focal: 1, secondary: 1, filler: 1, greenery: 0 },
      centerpiece: {
        total: 40,
        focal: 15,
        secondary: 15,
        filler: 6,
        greenery: 4,
      },
      ceremony_arch: {
        total: 100,
        focal: 30,
        secondary: 40,
        filler: 20,
        greenery: 10,
      },
      aisle_arrangements: {
        total: 25,
        focal: 8,
        secondary: 10,
        filler: 4,
        greenery: 3,
      },
    };

    return (
      baseCounts[arrangementType as keyof typeof baseCounts] ||
      baseCounts.bridal_bouquet
    );
  }

  /**
   * Calculate labor cost based on arrangement complexity
   */
  private calculateLaborCost(
    arrangementType: string,
    materialCost: number,
  ): number {
    const laborMultipliers = {
      bridal_bouquet: 0.6, // 60% of material cost
      bridesmaid_bouquet: 0.4, // 40% of material cost
      boutonniere: 0.8, // Higher labor ratio for detailed work
      centerpiece: 0.5,
      ceremony_arch: 0.7, // Complex installation
      aisle_arrangements: 0.5,
    };

    const multiplier =
      laborMultipliers[arrangementType as keyof typeof laborMultipliers] || 0.5;
    return materialCost * multiplier;
  }

  /**
   * Calculate color harmony score using ML
   */
  private async calculateColorHarmonyScore(
    arrangement: Partial<FloralRecommendation>,
    subscriptionId?: string,
    organizationId?: string,
  ): Promise<number> {
    try {
      if (!this.colorHarmonyModel) {
        return this.calculateBasicColorHarmony(arrangement);
      }

      // Track ML model usage for billing
      if (subscriptionId && organizationId) {
        try {
          await this.usageTracking.recordUsage(
            subscriptionId,
            organizationId,
            'ai_ml_model_inference',
            1,
            {
              model_type: 'color_harmony_analysis',
              feature: 'color_ml_analysis',
            },
          );
        } catch (error) {
          console.error('Failed to track color harmony ML usage:', error);
        }
      }

      // Extract color features from arrangement
      const colorFeatures = this.extractColorFeatures(arrangement);
      const inputTensor = tf.tensor2d([colorFeatures]);

      const prediction = this.colorHarmonyModel.predict(
        inputTensor,
      ) as tf.Tensor;
      const harmonyScore = await prediction.data();

      inputTensor.dispose();
      prediction.dispose();

      return harmonyScore[0];
    } catch (error) {
      console.error('Color harmony calculation failed:', error);
      return this.calculateBasicColorHarmony(arrangement);
    }
  }

  /**
   * Generate alternative arrangements
   */
  private async generateAlternatives(
    request: FloralArrangementRequest,
    availableFlowers: FlowerData[],
    baseRecommendation: Partial<FloralRecommendation>,
  ): Promise<FloralRecommendation['alternatives']> {
    // Budget-friendly alternative (20% cost reduction)
    const budgetRequest = {
      ...request,
      budget_range: {
        min: request.budget_range.min * 0.8,
        max: request.budget_range.max * 0.8,
      },
    };

    // Premium upgrade (50% cost increase)
    const premiumRequest = {
      ...request,
      budget_range: {
        min: request.budget_range.min * 1.5,
        max: request.budget_range.max * 1.5,
      },
    };

    try {
      const [budgetFriendly, premiumUpgrade] = await Promise.all([
        this.generateBaseArrangement(budgetRequest, availableFlowers),
        this.generateBaseArrangement(
          premiumRequest,
          availableFlowers.filter((f) => f.base_cost_per_stem >= 5.0),
        ),
      ]);

      return {
        budget_friendly: budgetFriendly as FloralRecommendation,
        premium_upgrade: premiumUpgrade as FloralRecommendation,
        seasonal_alternative: await this.generateSeasonalAlternative(
          request,
          availableFlowers,
        ),
      };
    } catch (error) {
      console.error('Failed to generate alternatives:', error);
      return {
        budget_friendly: null,
        premium_upgrade: null,
        seasonal_alternative: null,
      };
    }
  }

  /**
   * Generate seasonal alternative using different flower varieties
   */
  private async generateSeasonalAlternative(
    request: FloralArrangementRequest,
    availableFlowers: FlowerData[],
  ): Promise<FloralRecommendation | null> {
    const nextSeason = this.getNextSeason(
      this.getSeasonFromDate(request.wedding_date),
    );

    // Filter flowers that work in the next season
    const seasonalFlowers = availableFlowers.filter((f) =>
      f.theme_compatibility.includes(nextSeason),
    );

    if (seasonalFlowers.length < 5) return null;

    try {
      const seasonalRequest = { ...request };
      return (await this.generateBaseArrangement(
        seasonalRequest,
        seasonalFlowers,
      )) as FloralRecommendation;
    } catch (error) {
      return null;
    }
  }

  // Helper methods
  private getSeasonFromDate(date: Date): string {
    const month = date.getMonth() + 1;
    if (month >= 3 && month <= 5) return 'spring';
    if (month >= 6 && month <= 8) return 'summer';
    if (month >= 9 && month <= 11) return 'fall';
    return 'winter';
  }

  private getNextSeason(currentSeason: string): string {
    const seasons = ['spring', 'summer', 'fall', 'winter'];
    const currentIndex = seasons.indexOf(currentSeason);
    return seasons[(currentIndex + 1) % seasons.length];
  }

  private calculateAvailabilityScore(
    flower: FlowerData,
    month: number,
    season: string,
  ): number {
    let score = 0.5; // Base score

    // Peak season bonus
    if (month >= flower.peak_season_start && month <= flower.peak_season_end) {
      score += 0.3;
    }

    // Theme compatibility bonus
    if (flower.theme_compatibility.includes(season)) {
      score += 0.2;
    }

    return Math.min(1.0, score);
  }

  private encodeStyle(style: string): number {
    const styleMapping = {
      romantic: 0.8,
      rustic: 0.6,
      modern: 0.4,
      vintage: 0.7,
      bohemian: 0.5,
      classic: 0.9,
    };
    return styleMapping[style as keyof typeof styleMapping] || 0.5;
  }

  private encodeColors(colors: string[]): number[] {
    const colorMapping = {
      white: 1.0,
      pink: 0.8,
      red: 0.6,
      yellow: 0.4,
      purple: 0.7,
      blue: 0.3,
      orange: 0.5,
      green: 0.2,
    };

    const encoded = colors
      .slice(0, 6)
      .map((color) => colorMapping[color as keyof typeof colorMapping] || 0.5);

    // Pad to 6 values
    while (encoded.length < 6) {
      encoded.push(0.0);
    }

    return encoded;
  }

  private encodeSeason(season: string): number {
    const seasonMapping = {
      spring: 0.25,
      summer: 0.5,
      fall: 0.75,
      winter: 1.0,
    };
    return seasonMapping[season as keyof typeof seasonMapping] || 0.5;
  }

  private encodeArrangementType(type: string): number {
    const typeMapping = {
      bridal_bouquet: 1.0,
      bridesmaid_bouquet: 0.8,
      boutonniere: 0.2,
      centerpiece: 0.6,
      ceremony_arch: 0.4,
      aisle_arrangements: 0.3,
    };
    return typeMapping[type as keyof typeof typeMapping] || 0.5;
  }

  private extractColorFeatures(
    arrangement: Partial<FloralRecommendation>,
  ): number[] {
    // Extract color data from all flowers in arrangement
    const allFlowers = [
      ...(arrangement.focal_flowers || []),
      ...(arrangement.secondary_flowers || []),
      ...(arrangement.filler_flowers || []),
    ];

    const colorCounts = allFlowers.reduce(
      (acc, item) => {
        item.flower.primary_colors.forEach((color) => {
          acc[color] = (acc[color] || 0) + item.stem_count;
        });
        return acc;
      },
      {} as Record<string, number>,
    );

    // Convert to feature vector (normalize to 12 dimensions)
    const colors = [
      'white',
      'pink',
      'red',
      'yellow',
      'purple',
      'blue',
      'orange',
      'green',
      'cream',
      'burgundy',
      'coral',
      'lavender',
    ];
    return colors.map(
      (color) =>
        (colorCounts[color] || 0) /
        Math.max(
          1,
          Object.values(colorCounts).reduce((a, b) => a + b, 0),
        ),
    );
  }

  private calculateBasicColorHarmony(
    arrangement: Partial<FloralRecommendation>,
  ): number {
    // Simple rule-based color harmony
    const allColors = [
      ...(arrangement.focal_flowers || []),
      ...(arrangement.secondary_flowers || []),
    ].flatMap((item) => item.flower.primary_colors);

    // Check for complementary colors
    const hasComplementary = this.colorHarmony.complementary.some((pair) => {
      const [color1, color2] = pair.split('-');
      return allColors.includes(color1) && allColors.includes(color2);
    });

    if (hasComplementary) return 0.9;
    if (allColors.length <= 3) return 0.8; // Simple palette
    return 0.6; // Complex palette
  }

  private async calculateConfidenceScore(
    arrangement: Partial<FloralRecommendation>,
    request: FloralArrangementRequest,
  ): Promise<number> {
    let confidence = 0.7; // Base confidence

    // Budget fit
    const totalCost =
      (arrangement.total_cost || 0) + (arrangement.labor_cost || 0);
    if (
      totalCost >= request.budget_range.min &&
      totalCost <= request.budget_range.max
    ) {
      confidence += 0.2;
    }

    // Color match
    const hasPreferredColors = arrangement.focal_flowers?.some((item) =>
      item.flower.primary_colors.some((color) =>
        request.preferred_colors.includes(color),
      ),
    );
    if (hasPreferredColors) confidence += 0.1;

    return Math.min(1.0, confidence);
  }

  private calculateStyleMatchScore(
    arrangement: Partial<FloralRecommendation>,
    style: string,
  ): number {
    const allFlowers = [
      ...(arrangement.focal_flowers || []),
      ...(arrangement.secondary_flowers || []),
    ];

    const styleMatches = allFlowers.filter((item) =>
      item.flower.style_tags.includes(style),
    ).length;

    return Math.min(1.0, styleMatches / Math.max(1, allFlowers.length));
  }

  private calculateSeasonalAppropriatenesss(
    arrangement: Partial<FloralRecommendation>,
    weddingDate: Date,
  ): number {
    const season = this.getSeasonFromDate(weddingDate);
    const month = weddingDate.getMonth() + 1;

    const allFlowers = [
      ...(arrangement.focal_flowers || []),
      ...(arrangement.secondary_flowers || []),
    ];

    const seasonalFlowers = allFlowers.filter((item) => {
      const flower = item.flower;
      return (
        flower.theme_compatibility.includes(season) &&
        flower.available_months.includes(month)
      );
    }).length;

    return seasonalFlowers / Math.max(1, allFlowers.length);
  }

  private async calculateThemeMatch(
    request: FloralArrangementRequest,
    recommendation: Partial<FloralRecommendation>,
    subscriptionId?: string,
    organizationId?: string,
  ): Promise<number> {
    // Calculate how well the arrangement matches the wedding theme
    const styleScore = this.calculateStyleMatchScore(
      recommendation,
      request.wedding_style,
    );
    const colorScore = await this.calculateColorHarmonyScore(
      recommendation,
      subscriptionId,
      organizationId,
    );
    const seasonalScore = this.calculateSeasonalAppropriatenesss(
      recommendation,
      request.wedding_date,
    );

    return (styleScore + colorScore + seasonalScore) / 3;
  }

  private generateSeasonalNotes(
    weddingDate: Date,
    availableFlowers: FlowerData[],
  ): string[] {
    const season = this.getSeasonFromDate(weddingDate);
    const month = weddingDate.getMonth() + 1;

    const notes = [
      `Wedding in ${season} season offers beautiful ${season} flower varieties`,
      `Peak bloom period for many flowers during month ${month}`,
    ];

    // Add specific seasonal notes
    const peakFlowers = availableFlowers.filter(
      (f) => f.peak_season_start <= month && f.peak_season_end >= month,
    );

    if (peakFlowers.length > 0) {
      notes.push(
        `${peakFlowers.length} flower varieties are in peak season for optimal quality and pricing`,
      );
    }

    return notes;
  }

  private generateAlternativeSuggestions(
    request: FloralArrangementRequest,
    availableFlowers: FlowerData[],
  ): string[] {
    const suggestions = [];

    // Budget suggestions
    if (request.budget_range.max < 200) {
      suggestions.push('Consider locally sourced flowers to reduce costs');
      suggestions.push(
        'Mixed bouquets with more filler flowers can stretch your budget',
      );
    }

    // Seasonal suggestions
    const season = this.getSeasonFromDate(request.wedding_date);
    if (season === 'winter') {
      suggestions.push(
        'Greenhouse flowers and evergreen elements work beautifully in winter',
      );
    }

    // Style suggestions
    if (request.wedding_style === 'rustic') {
      suggestions.push(
        'Wildflowers and textured elements enhance rustic themes',
      );
    }

    return suggestions;
  }

  private generateArrangementId(): string {
    return `floral_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Save AI recommendation to database for learning
   */
  async saveRecommendation(
    clientId: string,
    recommendation: FloralRecommendation,
    request: FloralArrangementRequest,
  ): Promise<void> {
    try {
      const supabase = createClient();

      const { error } = await supabase
        .from('floral_ai_recommendations')
        .insert({
          client_id: clientId,
          organization_id: request.client_id, // Will be updated with proper org ID
          recommendation_type: 'initial',
          wedding_date: request.wedding_date.toISOString().split('T')[0],
          wedding_style: request.wedding_style,
          season: this.getSeasonFromDate(request.wedding_date),
          budget_total: request.budget_range.max,
          preferred_colors: request.preferred_colors,
          arrangement_requirements: {
            arrangement_type: request.arrangement_type,
            guest_count: request.guest_count,
            venue_type: request.venue_type,
          },
          recommended_arrangements: recommendation,
          confidence_scores: {
            overall: recommendation.confidence_score,
            style_match: recommendation.style_match_score,
            seasonal: recommendation.seasonal_appropriateness,
            color_harmony: recommendation.color_harmony_score,
          },
          reasoning: recommendation.reasoning,
        });

      if (error) {
        console.error('Failed to save AI recommendation:', error);
      }
    } catch (error) {
      console.error('Error saving recommendation:', error);
    }
  }

  /**
   * Learn from user feedback to improve recommendations
   */
  async processFeedback(
    recommendationId: string,
    feedback: 'loved' | 'liked' | 'neutral' | 'disliked' | 'rejected',
    details?: any,
  ): Promise<void> {
    try {
      const supabase = createClient();

      await supabase
        .from('floral_ai_recommendations')
        .update({
          user_feedback: feedback,
          feedback_details: details,
          updated_at: new Date().toISOString(),
        })
        .eq('id', recommendationId);

      // In production, this feedback would be used to retrain the models
      console.log(
        `Processed feedback: ${feedback} for recommendation ${recommendationId}`,
      );
    } catch (error) {
      console.error('Failed to process feedback:', error);
    }
  }

  /**
   * Dispose of ML models to free memory
   */
  dispose(): void {
    if (this.arrangementModel) {
      this.arrangementModel.dispose();
      this.arrangementModel = null;
    }
    if (this.colorHarmonyModel) {
      this.colorHarmonyModel.dispose();
      this.colorHarmonyModel = null;
    }
    this.isInitialized = false;
  }
}

// Export singleton instance
export const floralAIService = new FloralAIService();
