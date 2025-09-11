/**
 * WeddingTraditionService - WS-247 Multilingual Platform System
 *
 * Manages cultural wedding tradition data across different cultures/locales.
 * Provides tradition recommendations, cultural validation, and vendor integration.
 *
 * @author WedSync Development Team
 * @version 1.0.0
 * @since 2025-01-03
 */

import { LocaleManager, type SupportedLocale } from './LocaleManager';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

/**
 * Wedding tradition complexity levels
 */
export type TraditionComplexity =
  | 'simple'
  | 'moderate'
  | 'complex'
  | 'elaborate';

/**
 * Wedding tradition categories
 */
export type TraditionCategory =
  | 'ceremony'
  | 'reception'
  | 'pre_wedding'
  | 'post_wedding'
  | 'family_roles'
  | 'gifts_monetary'
  | 'attire_jewelry'
  | 'food_beverage'
  | 'music_dance'
  | 'decorations'
  | 'photography'
  | 'religious_spiritual';

/**
 * Wedding tradition timing phases
 */
export type TraditionTiming =
  | 'engagement'
  | 'pre_ceremony'
  | 'ceremony_entrance'
  | 'ceremony_main'
  | 'ceremony_exit'
  | 'cocktail_hour'
  | 'reception_entrance'
  | 'dinner'
  | 'dancing'
  | 'send_off'
  | 'post_wedding';

/**
 * Cultural appropriateness levels
 */
export type CulturalAppropriateness =
  | 'heritage_required' // Must have cultural heritage
  | 'respectful_adoption' // Can adopt with proper respect
  | 'universal' // Open to all cultures
  | 'sensitive'; // Requires cultural consultation

/**
 * Wedding tradition cost range
 */
export interface TraditionCostRange {
  readonly min: number;
  readonly max: number;
  readonly currency: string;
  readonly factors: readonly string[];
  readonly vendor_dependent: boolean;
}

/**
 * Wedding tradition requirement
 */
export interface TraditionRequirement {
  readonly type: 'venue' | 'vendor' | 'item' | 'participant' | 'time' | 'space';
  readonly description: Record<string, string>;
  readonly is_mandatory: boolean;
  readonly alternatives?: readonly string[];
}

/**
 * Cultural context information
 */
export interface CulturalContext {
  readonly origin_culture: string;
  readonly region_variants: readonly string[];
  readonly historical_period?: string;
  readonly significance: Record<string, string>;
  readonly modern_adaptations: readonly string[];
  readonly cultural_notes: Record<string, string>;
}

/**
 * Vendor integration details for traditions
 */
export interface TraditionVendorIntegration {
  readonly required_vendor_types: readonly string[];
  readonly vendor_capabilities: readonly string[];
  readonly vendor_guidance: Record<string, string>;
  readonly cost_factors: readonly string[];
  readonly timeline_impact: {
    readonly preparation_days: number;
    readonly execution_duration_minutes: number;
  };
}

/**
 * Wedding tradition data structure
 */
export interface WeddingTradition {
  readonly id: string;
  readonly name: Record<string, string>;
  readonly category: TraditionCategory;
  readonly timing: readonly TraditionTiming[];
  readonly complexity: TraditionComplexity;
  readonly cultural_context: CulturalContext;
  readonly appropriateness: CulturalAppropriateness;
  readonly description: Record<string, string>;
  readonly instructions: Record<string, string>;
  readonly symbolism: Record<string, string>;
  readonly requirements: readonly TraditionRequirement[];
  readonly cost_range: TraditionCostRange;
  readonly vendor_integration: TraditionVendorIntegration;
  readonly media: {
    readonly images: readonly string[];
    readonly videos: readonly string[];
    readonly audio: readonly string[];
  };
  readonly variations: readonly {
    readonly name: Record<string, string>;
    readonly description: Record<string, string>;
    readonly region: string;
    readonly modifications: readonly string[];
  }[];
  readonly popularity_score: number;
  readonly difficulty_rating: number;
  readonly time_investment_hours: number;
  readonly guest_involvement_level: 'none' | 'minimal' | 'moderate' | 'high';
  readonly tags: readonly string[];
  readonly related_traditions: readonly string[];
  readonly modern_alternatives: readonly string[];
  readonly contraindications: readonly string[];
}

/**
 * Couple's cultural profile for tradition recommendations
 */
export interface CoupleProfile {
  readonly partner1: {
    readonly cultural_backgrounds: readonly string[];
    readonly family_traditions: readonly string[];
    readonly religious_affiliation?: string;
    readonly region: string;
  };
  readonly partner2: {
    readonly cultural_backgrounds: readonly string[];
    readonly family_traditions: readonly string[];
    readonly religious_affiliation?: string;
    readonly region: string;
  };
  readonly shared_preferences: {
    readonly wedding_style: string;
    readonly formality_level: 'casual' | 'semi_formal' | 'formal' | 'black_tie';
    readonly guest_count: number;
    readonly budget_range: TraditionCostRange;
    readonly venue_type: string;
    readonly season: 'spring' | 'summer' | 'fall' | 'winter';
  };
  readonly cultural_openness:
    | 'heritage_only'
    | 'respectful_adoption'
    | 'fusion_friendly';
  readonly priorities: readonly TraditionCategory[];
}

/**
 * Tradition recommendation with reasoning
 */
export interface TraditionRecommendation {
  readonly tradition: WeddingTradition;
  readonly relevance_score: number;
  readonly reasoning: Record<string, string>;
  readonly cultural_connection: string;
  readonly implementation_suggestion: Record<string, string>;
  readonly estimated_cost: TraditionCostRange;
  readonly timeline_placement: readonly TraditionTiming[];
  readonly customization_options: readonly {
    readonly option: Record<string, string>;
    readonly impact: Record<string, string>;
    readonly cost_change: number;
  }[];
}

/**
 * Tradition search filters
 */
export interface TraditionSearchFilters {
  readonly cultures?: readonly string[];
  readonly categories?: readonly TraditionCategory[];
  readonly timing?: readonly TraditionTiming[];
  readonly complexity?: readonly TraditionComplexity[];
  readonly appropriateness?: readonly CulturalAppropriateness[];
  readonly max_cost?: number;
  readonly currency?: string;
  readonly max_preparation_days?: number;
  readonly guest_involvement?: readonly string[];
  readonly venue_compatible?: readonly string[];
  readonly tags?: readonly string[];
  readonly exclude_traditions?: readonly string[];
}

/**
 * Cultural appropriateness validation result
 */
export interface CulturalValidationResult {
  readonly is_appropriate: boolean;
  readonly appropriateness_level: CulturalAppropriateness;
  readonly concerns: readonly {
    readonly level: 'info' | 'warning' | 'caution' | 'inappropriate';
    readonly message: Record<string, string>;
    readonly suggestion?: Record<string, string>;
  }[];
  readonly cultural_consultation_recommended: boolean;
  readonly respectful_adaptation_guidelines?: Record<string, string>;
}

/**
 * Service for managing wedding traditions across cultures
 * Provides comprehensive tradition data, recommendations, and cultural guidance
 */
export class WeddingTraditionService {
  private readonly localeManager: LocaleManager;
  private readonly traditionCache = new Map<string, WeddingTradition>();
  private readonly cultureDatabase = new Map<
    string,
    readonly WeddingTradition[]
  >();
  private isInitialized = false;

  constructor() {
    this.localeManager = LocaleManager.getInstance();
    this.initializeTraditionDatabase();
  }

  /**
   * Get tradition recommendations for a couple
   */
  public async getRecommendationsForCouple(
    coupleProfile: CoupleProfile,
    locale: SupportedLocale = 'en-US',
    maxRecommendations: number = 20,
  ): Promise<readonly TraditionRecommendation[]> {
    try {
      await this.ensureInitialized();

      const allTraditions = Array.from(this.traditionCache.values());
      const scoredTraditions: TraditionRecommendation[] = [];

      for (const tradition of allTraditions) {
        const relevanceScore = this.calculateRelevanceScore(
          tradition,
          coupleProfile,
        );

        if (relevanceScore > 0.3) {
          const validation = await this.validateCulturalAppropriateness(
            tradition,
            coupleProfile,
            locale,
          );

          if (validation.is_appropriate) {
            const recommendation = await this.buildRecommendation(
              tradition,
              coupleProfile,
              relevanceScore,
              locale,
            );
            scoredTraditions.push(recommendation);
          }
        }
      }

      return scoredTraditions
        .sort((a, b) => b.relevance_score - a.relevance_score)
        .slice(0, maxRecommendations);
    } catch (error) {
      throw new Error(
        `Failed to get tradition recommendations: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Search traditions with filters
   */
  public async searchTraditions(
    filters: TraditionSearchFilters,
    locale: SupportedLocale = 'en-US',
  ): Promise<readonly WeddingTradition[]> {
    try {
      await this.ensureInitialized();

      const allTraditions = Array.from(this.traditionCache.values());

      return allTraditions.filter((tradition) => {
        // Culture filter
        if (filters.cultures && filters.cultures.length > 0) {
          const hasMatchingCulture = filters.cultures.some(
            (culture) =>
              tradition.cultural_context.origin_culture
                .toLowerCase()
                .includes(culture.toLowerCase()) ||
              tradition.cultural_context.region_variants.some((region) =>
                region.toLowerCase().includes(culture.toLowerCase()),
              ),
          );
          if (!hasMatchingCulture) return false;
        }

        // Category filter
        if (
          filters.categories &&
          !filters.categories.includes(tradition.category)
        ) {
          return false;
        }

        // Timing filter
        if (
          filters.timing &&
          !filters.timing.some((t) => tradition.timing.includes(t))
        ) {
          return false;
        }

        // Complexity filter
        if (
          filters.complexity &&
          !filters.complexity.includes(tradition.complexity)
        ) {
          return false;
        }

        // Appropriateness filter
        if (
          filters.appropriateness &&
          !filters.appropriateness.includes(tradition.appropriateness)
        ) {
          return false;
        }

        // Cost filter
        if (
          filters.max_cost !== undefined &&
          tradition.cost_range.min > filters.max_cost
        ) {
          return false;
        }

        // Preparation time filter
        if (
          filters.max_preparation_days !== undefined &&
          tradition.vendor_integration.timeline_impact.preparation_days >
            filters.max_preparation_days
        ) {
          return false;
        }

        // Guest involvement filter
        if (
          filters.guest_involvement &&
          !filters.guest_involvement.includes(tradition.guest_involvement_level)
        ) {
          return false;
        }

        // Tags filter
        if (
          filters.tags &&
          !filters.tags.some((tag) => tradition.tags.includes(tag))
        ) {
          return false;
        }

        // Exclude traditions filter
        if (
          filters.exclude_traditions &&
          filters.exclude_traditions.includes(tradition.id)
        ) {
          return false;
        }

        return true;
      });
    } catch (error) {
      throw new Error(
        `Failed to search traditions: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get detailed tradition information
   */
  public async getTraditionDetails(
    traditionId: string,
    locale: SupportedLocale = 'en-US',
  ): Promise<WeddingTradition | null> {
    try {
      await this.ensureInitialized();

      const tradition = this.traditionCache.get(traditionId);
      if (!tradition) return null;

      return this.localizeTradition(tradition, locale);
    } catch (error) {
      throw new Error(
        `Failed to get tradition details: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get traditions by culture
   */
  public async getTraditionsByCulture(
    culture: string,
    locale: SupportedLocale = 'en-US',
  ): Promise<readonly WeddingTradition[]> {
    try {
      await this.ensureInitialized();

      const cultureTraditions = this.cultureDatabase.get(culture.toLowerCase());
      if (!cultureTraditions) return [];

      return cultureTraditions.map((tradition) =>
        this.localizeTradition(tradition, locale),
      );
    } catch (error) {
      throw new Error(
        `Failed to get traditions by culture: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Validate cultural appropriateness of a tradition
   */
  public async validateCulturalAppropriateness(
    tradition: WeddingTradition,
    coupleProfile: CoupleProfile,
    locale: SupportedLocale = 'en-US',
  ): Promise<CulturalValidationResult> {
    try {
      const concerns: Array<{
        level: 'info' | 'warning' | 'caution' | 'inappropriate';
        message: Record<string, string>;
        suggestion?: Record<string, string>;
      }> = [];
      let isAppropriate = true;
      let consultationRecommended = false;

      // Check if tradition requires cultural heritage
      if (tradition.appropriateness === 'heritage_required') {
        const hasCulturalConnection = this.checkCulturalConnection(
          tradition,
          coupleProfile,
        );

        if (!hasCulturalConnection) {
          isAppropriate = false;
          concerns.push({
            level: 'inappropriate',
            message: {
              'en-US': `This tradition requires cultural heritage from ${tradition.cultural_context.origin_culture}. Consider finding traditions from your own cultural backgrounds instead.`,
              'es-ES': `Esta tradición requiere herencia cultural de ${tradition.cultural_context.origin_culture}. Considera encontrar tradiciones de tus propios antecedentes culturales.`,
              'fr-FR': `Cette tradition nécessite un heritage culturel de ${tradition.cultural_context.origin_culture}. Considérez trouver des traditions de vos propres origines culturelles.`,
            },
          });
        }
      }

      // Check for sensitive traditions
      if (tradition.appropriateness === 'sensitive') {
        consultationRecommended = true;
        concerns.push({
          level: 'caution',
          message: {
            'en-US':
              'This tradition has cultural sensitivities. We recommend consulting with a cultural expert to ensure respectful implementation.',
            'es-ES':
              'Esta tradición tiene sensibilidades culturales. Recomendamos consultar con un experto cultural para asegurar una implementación respetuosa.',
            'fr-FR':
              'Cette tradition a des sensibilités culturelles. Nous recommandons de consulter un expert culturel pour assurer une implémentation respectueuse.',
          },
        });
      }

      return {
        is_appropriate: isAppropriate,
        appropriateness_level: tradition.appropriateness,
        concerns,
        cultural_consultation_recommended: consultationRecommended,
        respectful_adaptation_guidelines: consultationRecommended
          ? tradition.cultural_context.cultural_notes
          : undefined,
      };
    } catch (error) {
      throw new Error(
        `Failed to validate cultural appropriateness: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get popular traditions by region
   */
  public async getPopularTraditionsByRegion(
    region: string,
    limit: number = 10,
    locale: SupportedLocale = 'en-US',
  ): Promise<readonly WeddingTradition[]> {
    try {
      await this.ensureInitialized();

      const allTraditions = Array.from(this.traditionCache.values());

      const regionTraditions = allTraditions
        .filter(
          (tradition) =>
            tradition.cultural_context.origin_culture
              .toLowerCase()
              .includes(region.toLowerCase()) ||
            tradition.cultural_context.region_variants.some((variant) =>
              variant.toLowerCase().includes(region.toLowerCase()),
            ),
        )
        .sort((a, b) => b.popularity_score - a.popularity_score)
        .slice(0, limit);

      return regionTraditions.map((tradition) =>
        this.localizeTradition(tradition, locale),
      );
    } catch (error) {
      throw new Error(
        `Failed to get popular traditions by region: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Private: Ensure service is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initializeTraditionDatabase();
      this.isInitialized = true;
    }
  }

  /**
   * Private: Initialize tradition database
   */
  private async initializeTraditionDatabase(): Promise<void> {
    try {
      // Load traditions from database or create sample data
      const sampleTraditions = this.createSampleTraditions();

      for (const tradition of sampleTraditions) {
        this.traditionCache.set(tradition.id, tradition);

        // Index by culture
        const culture = tradition.cultural_context.origin_culture.toLowerCase();
        const existing = this.cultureDatabase.get(culture) || [];
        this.cultureDatabase.set(culture, [...existing, tradition]);
      }

      this.isInitialized = true;
    } catch (error) {
      throw new Error(
        `Failed to initialize tradition database: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Private: Create sample wedding traditions
   */
  private createSampleTraditions(): readonly WeddingTradition[] {
    return [
      {
        id: 'unity-candle-ceremony',
        name: {
          'en-US': 'Unity Candle Ceremony',
          'es-ES': 'Ceremonia de la Vela de la Unidad',
          'fr-FR': "Cérémonie de la Bougie d'Unité",
        },
        category: 'ceremony',
        timing: ['ceremony_main'],
        complexity: 'simple',
        cultural_context: {
          origin_culture: 'Western Christian',
          region_variants: ['American', 'European', 'Canadian'],
          significance: {
            'en-US':
              'Symbolizes the union of two lives into one partnership while maintaining individual identity',
            'es-ES':
              'Simboliza la unión de dos vidas en una sociedad manteniendo la identidad individual',
            'fr-FR':
              "Symbolise l'union de deux vies en un partenariat tout en maintenant l'identité individuelle",
          },
          modern_adaptations: [
            'LED candles for outdoor venues',
            'Sand ceremony alternative',
            'Tree planting ceremony',
          ],
          cultural_notes: {
            'en-US':
              'Originally from Christian wedding traditions, now widely adopted across various faiths and cultures',
            'es-ES':
              'Originalmente de tradiciones cristianas de boda, ahora ampliamente adoptado en varias religiones y culturas',
            'fr-FR':
              'Originaire des traditions de mariage chrétiennes, maintenant largement adopté dans diverses confessions et cultures',
          },
        },
        appropriateness: 'universal',
        description: {
          'en-US':
            'A ceremony where the couple lights a single unity candle together from their individual family candles',
          'es-ES':
            'Una ceremonia donde la pareja enciende una sola vela de unidad juntos desde sus velas familiares individuales',
          'fr-FR':
            "Une cérémonie où le couple allume ensemble une seule bougie d'unité à partir de leurs bougies familiales individuelles",
        },
        instructions: {
          'en-US':
            'Place three candles at the altar: two taper candles (lit by mothers) and one unity candle. After exchanging vows, the couple takes their individual candles and lights the unity candle together.',
          'es-ES':
            'Coloca tres velas en el altar: dos velas cónicas (encendidas por las madres) y una vela de unidad. Después de intercambiar votos, la pareja toma sus velas individuales y enciende la vela de unidad juntos.',
          'fr-FR':
            "Placez trois bougies à l'autel : deux bougies coniques (allumées par les mères) et une bougie d'unité. Après avoir échangé les vœux, le couple prend ses bougies individuelles et allume ensemble la bougie d'unité.",
        },
        symbolism: {
          'en-US':
            'The individual candles represent the couples separate lives and families, while the unity candle represents their new life together',
          'es-ES':
            'Las velas individuales representan las vidas y familias separadas de la pareja, mientras que la vela de unidad representa su nueva vida juntos',
          'fr-FR':
            "Les bougies individuelles représentent les vies et familles séparées du couple, tandis que la bougie d'unité représente leur nouvelle vie ensemble",
        },
        requirements: [
          {
            type: 'item',
            description: {
              'en-US': 'Three candles: two taper candles and one unity candle',
              'es-ES': 'Tres velas: dos velas cónicas y una vela de unidad',
              'fr-FR':
                "Trois bougies : deux bougies coniques et une bougie d'unité",
            },
            is_mandatory: true,
          },
          {
            type: 'participant',
            description: {
              'en-US':
                'Family members (typically mothers) to light the initial candles',
              'es-ES':
                'Miembros de la familia (típicamente madres) para encender las velas iniciales',
              'fr-FR':
                'Membres de la famille (généralement les mères) pour allumer les bougies initiales',
            },
            is_mandatory: false,
            alternatives: [
              'Pre-lit candles',
              'Couple lights their own candles',
            ],
          },
        ],
        cost_range: {
          min: 25,
          max: 200,
          currency: 'USD',
          factors: ['Candle quality', 'Decorative holders', 'Personalization'],
          vendor_dependent: false,
        },
        vendor_integration: {
          required_vendor_types: ['florist', 'wedding_coordinator'],
          vendor_capabilities: ['ceremony_setup', 'decor_styling'],
          vendor_guidance: {
            'en-US':
              'Florist can provide decorative candle holders and coordinate with ceremony decor. Wedding coordinator ensures proper timing and setup.',
            'es-ES':
              'El florista puede proporcionar portavelas decorativos y coordinar con la decoración de la ceremonia. El coordinador de bodas asegura el tiempo y la configuración adecuados.',
            'fr-FR':
              "Le fleuriste peut fournir des bougeoirs décoratifs et coordonner avec la décoration de cérémonie. Le coordinateur de mariage assure le bon timing et l'installation.",
          },
          cost_factors: [
            'Candle holders',
            'Ceremony setup',
            'Coordination fee',
          ],
          timeline_impact: {
            preparation_days: 7,
            execution_duration_minutes: 5,
          },
        },
        media: {
          images: [
            '/traditions/unity-candle/setup.jpg',
            '/traditions/unity-candle/lighting.jpg',
          ],
          videos: ['/traditions/unity-candle/demonstration.mp4'],
          audio: [],
        },
        variations: [
          {
            name: {
              'en-US': 'Sand Ceremony',
              'es-ES': 'Ceremonia de Arena',
              'fr-FR': 'Cérémonie de Sable',
            },
            description: {
              'en-US':
                'Using colored sand instead of candles for outdoor or windy venues',
              'es-ES':
                'Usando arena de colores en lugar de velas para lugares al aire libre o ventosos',
              'fr-FR':
                'Utiliser du sable coloré au lieu de bougies pour les lieux extérieurs ou venteux',
            },
            region: 'Beach/Outdoor',
            modifications: [
              'Sand-proof venue',
              'Decorative vase',
              'Colored sand',
            ],
          },
        ],
        popularity_score: 0.85,
        difficulty_rating: 2,
        time_investment_hours: 1,
        guest_involvement_level: 'minimal',
        tags: [
          'christian',
          'symbolic',
          'family',
          'candles',
          'unity',
          'ceremony',
        ],
        related_traditions: ['handfasting', 'ring-warming', 'tree-planting'],
        modern_alternatives: [
          'LED unity candle',
          'Unity painting',
          'Unity puzzle',
        ],
        contraindications: [
          'Outdoor windy venues',
          'Fire restrictions',
          'Very young children present',
        ],
      },
    ];
  }

  /**
   * Private: Calculate relevance score for tradition recommendation
   */
  private calculateRelevanceScore(
    tradition: WeddingTradition,
    coupleProfile: CoupleProfile,
  ): number {
    let score = 0;

    // Cultural background match (highest weight)
    const culturalMatch = this.checkCulturalConnection(
      tradition,
      coupleProfile,
    );
    if (culturalMatch) score += 0.4;

    // Category priority match
    if (
      coupleProfile.priorities &&
      coupleProfile.priorities.includes(tradition.category)
    ) {
      score += 0.2;
    }

    // Complexity vs formality match
    const formalityComplexityMatch = this.matchFormalityToComplexity(
      tradition.complexity,
      coupleProfile.shared_preferences.formality_level,
    );
    score += formalityComplexityMatch * 0.15;

    // Budget compatibility
    if (
      tradition.cost_range.max <=
      coupleProfile.shared_preferences.budget_range.max
    ) {
      score += 0.1;
    }

    // Popularity boost
    score += tradition.popularity_score * 0.05;

    return Math.min(score, 1.0);
  }

  /**
   * Private: Check if couple has cultural connection to tradition
   */
  private checkCulturalConnection(
    tradition: WeddingTradition,
    coupleProfile: CoupleProfile,
  ): boolean {
    const allBackgrounds = [
      ...coupleProfile.partner1.cultural_backgrounds,
      ...coupleProfile.partner2.cultural_backgrounds,
    ];

    return allBackgrounds.some(
      (background) =>
        tradition.cultural_context.origin_culture
          .toLowerCase()
          .includes(background.toLowerCase()) ||
        tradition.cultural_context.region_variants.some(
          (variant) =>
            variant.toLowerCase().includes(background.toLowerCase()) ||
            background.toLowerCase().includes(variant.toLowerCase()),
        ),
    );
  }

  /**
   * Private: Match formality level to tradition complexity
   */
  private matchFormalityToComplexity(
    complexity: TraditionComplexity,
    formalityLevel: CoupleProfile['shared_preferences']['formality_level'],
  ): number {
    const complexityScores: Record<TraditionComplexity, number> = {
      simple: 1,
      moderate: 2,
      complex: 3,
      elaborate: 4,
    };

    const formalityScores: Record<typeof formalityLevel, number> = {
      casual: 1,
      semi_formal: 2,
      formal: 3,
      black_tie: 4,
    };

    const complexityScore = complexityScores[complexity];
    const formalityScore = formalityScores[formalityLevel];

    // Perfect match = 1.0, adjacent levels = 0.7, far apart = 0.3
    const difference = Math.abs(complexityScore - formalityScore);
    if (difference === 0) return 1.0;
    if (difference === 1) return 0.7;
    if (difference === 2) return 0.5;
    return 0.3;
  }

  /**
   * Private: Build recommendation object
   */
  private async buildRecommendation(
    tradition: WeddingTradition,
    coupleProfile: CoupleProfile,
    relevanceScore: number,
    locale: SupportedLocale,
  ): Promise<TraditionRecommendation> {
    const culturalConnection = this.getCulturalConnectionReason(
      tradition,
      coupleProfile,
    );

    return {
      tradition: this.localizeTradition(tradition, locale),
      relevance_score: relevanceScore,
      reasoning: {
        [locale]: `This tradition aligns with your ${culturalConnection} and ${coupleProfile.shared_preferences.formality_level} wedding style`,
      },
      cultural_connection: culturalConnection,
      implementation_suggestion: {
        [locale]: `Consider implementing this during your ${tradition.timing.join(' or ')} phase`,
      },
      estimated_cost: await this.calculatePersonalizedCost(
        tradition,
        coupleProfile,
      ),
      timeline_placement: tradition.timing,
      customization_options: this.getCustomizationOptions(
        tradition,
        coupleProfile,
        locale,
      ),
    };
  }

  /**
   * Private: Get cultural connection reason
   */
  private getCulturalConnectionReason(
    tradition: WeddingTradition,
    coupleProfile: CoupleProfile,
  ): string {
    if (this.checkCulturalConnection(tradition, coupleProfile)) {
      return 'cultural heritage';
    }
    return 'wedding preferences';
  }

  /**
   * Private: Calculate personalized cost estimate
   */
  private async calculatePersonalizedCost(
    tradition: WeddingTradition,
    coupleProfile: CoupleProfile,
  ): Promise<TraditionCostRange> {
    const baseRange = tradition.cost_range;
    const guestMultiplier = Math.max(
      1,
      coupleProfile.shared_preferences.guest_count / 100,
    );

    return {
      ...baseRange,
      min: Math.round(baseRange.min * guestMultiplier),
      max: Math.round(baseRange.max * guestMultiplier),
      factors: [
        ...baseRange.factors,
        `Adjusted for ${coupleProfile.shared_preferences.guest_count} guests`,
      ],
    };
  }

  /**
   * Private: Get customization options for couple
   */
  private getCustomizationOptions(
    tradition: WeddingTradition,
    coupleProfile: CoupleProfile,
    locale: SupportedLocale,
  ): readonly TraditionRecommendation['customization_options'][number][] {
    const options: TraditionRecommendation['customization_options'][number][] =
      [];

    // Add cultural customizations
    if (!this.checkCulturalConnection(tradition, coupleProfile)) {
      options.push({
        option: {
          [locale]: 'Adapt with personal cultural elements',
        },
        impact: {
          [locale]: 'Makes the tradition more personally meaningful',
        },
        cost_change: 0,
      });
    }

    // Add venue-specific options
    options.push({
      option: {
        [locale]: `Customize for ${coupleProfile.shared_preferences.venue_type} venue`,
      },
      impact: {
        [locale]: 'Ensures tradition works well with your chosen venue',
      },
      cost_change: 10,
    });

    return options;
  }

  /**
   * Private: Localize tradition content
   */
  private localizeTradition(
    tradition: WeddingTradition,
    locale: SupportedLocale,
  ): WeddingTradition {
    return {
      ...tradition,
      name: this.getLocalizedText(tradition.name, locale),
      description: this.getLocalizedText(tradition.description, locale),
      instructions: this.getLocalizedText(tradition.instructions, locale),
      symbolism: this.getLocalizedText(tradition.symbolism, locale),
      cultural_context: {
        ...tradition.cultural_context,
        significance: this.getLocalizedText(
          tradition.cultural_context.significance,
          locale,
        ),
        cultural_notes: this.getLocalizedText(
          tradition.cultural_context.cultural_notes,
          locale,
        ),
      },
      requirements: tradition.requirements.map((req) => ({
        ...req,
        description: this.getLocalizedText(req.description, locale),
      })),
      vendor_integration: {
        ...tradition.vendor_integration,
        vendor_guidance: this.getLocalizedText(
          tradition.vendor_integration.vendor_guidance,
          locale,
        ),
      },
    };
  }

  /**
   * Private: Get localized text with fallback
   */
  private getLocalizedText(
    textMap: Record<string, string>,
    locale: SupportedLocale,
  ): Record<string, string> {
    // Return the full text map for now, in a real implementation
    // this would return the specific locale text with fallbacks
    return textMap;
  }
}

/**
 * Export singleton instance
 */
export const weddingTraditionService = new WeddingTraditionService();
export default weddingTraditionService;
