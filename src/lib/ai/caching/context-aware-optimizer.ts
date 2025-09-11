/**
 * WS-241: AI Caching Strategy System - Context-Aware Response Optimization
 * Team D: AI/ML Engineering Implementation
 *
 * Smart response ranking and caching with wedding-specific context optimization
 */

import {
  WeddingContext,
  WeddingEntityExtraction,
  QualityAssessment,
  CacheOptimizationDecision,
} from './types';

export class ContextAwareResponseOptimizer {
  private responseQualityModel: any;
  private contextSimilarityModel: any;
  private weddingKnowledgeGraph: Map<string, any>;
  private budgetContextMap: Map<string, any>;
  private culturalContextMap: Map<string, any>;

  constructor() {
    this.weddingKnowledgeGraph = new Map();
    this.budgetContextMap = new Map();
    this.culturalContextMap = new Map();
    this.initializeOptimizer();
  }

  private async initializeOptimizer(): Promise<void> {
    try {
      console.log('Initializing Context-Aware Response Optimizer...');

      // Load ML models
      this.responseQualityModel = await this.loadResponseQualityModel();
      this.contextSimilarityModel = await this.loadContextSimilarityModel();

      // Load wedding industry knowledge
      await this.loadWeddingKnowledgeGraph();
      await this.loadBudgetContextMap();
      await this.loadCulturalContextMap();

      console.log('Context-Aware Response Optimizer initialized successfully');
    } catch (error) {
      console.error(
        'Failed to initialize Context-Aware Response Optimizer:',
        error,
      );
      throw error;
    }
  }

  /**
   * Optimize AI response with wedding-specific context and enhancements
   */
  async optimizeAiResponse(
    query: string,
    baseResponse: string,
    context: WeddingContext,
  ): Promise<string> {
    try {
      // Extract wedding-specific entities from query and context
      const weddingEntities = await this.extractWeddingEntities(query, context);

      // Enhance response with wedding industry context
      const industryEnhanced = await this.enhanceWithWeddingContext(
        baseResponse,
        weddingEntities,
        context,
      );

      // Add location-specific recommendations and considerations
      const locationEnhanced = await this.addLocationContext(
        industryEnhanced,
        context.location,
      );

      // Incorporate seasonal considerations and timing
      const seasonalEnhanced = await this.addSeasonalContext(
        locationEnhanced,
        context.wedding_date,
        context.season,
      );

      // Apply budget-appropriate suggestions and alternatives
      const budgetEnhanced = await this.applyBudgetContext(
        seasonalEnhanced,
        context.budget_range,
        weddingEntities,
      );

      // Add cultural sensitivity and customizations
      const culturalEnhanced = await this.applyCulturalContext(
        budgetEnhanced,
        context.cultural_preferences,
      );

      // Final quality optimization and refinement
      const finalOptimized = await this.finalQualityOptimization(
        culturalEnhanced,
        query,
        context,
      );

      return finalOptimized;
    } catch (error) {
      console.error('Error optimizing AI response:', error);
      return baseResponse; // Return original on error
    }
  }

  /**
   * Calculate how cacheable a response is across different contexts
   */
  async calculateResponseCachability(
    query: string,
    response: string,
    context: WeddingContext,
  ): Promise<{
    overall_cachability: number;
    context_sensitivity: number;
    temporal_stability: number;
    cache_scope: string;
    recommended_ttl: number;
    cache_decision: CacheOptimizationDecision;
  }> {
    try {
      // Analyze response generalizability across similar contexts
      const generalizabilityScore = await this.analyzeResponseGeneralizability(
        response,
        context,
      );

      // Measure context sensitivity (lower = more cacheable)
      const contextSensitivity = await this.measureContextSensitivity(
        query,
        response,
        context,
      );

      // Evaluate temporal stability (how long response stays relevant)
      const temporalStability = await this.assessTemporalStability(
        response,
        context.wedding_date,
        context.current_planning_stage,
      );

      // Determine optimal cache scope
      const cacheScope = await this.determineCacheScope(
        query,
        response,
        context,
        generalizabilityScore,
      );

      // Calculate recommended TTL based on content analysis
      const recommendedTtl = await this.recommendTtl(
        response,
        context,
        temporalStability,
      );

      // Overall cachability score
      const overallCachability = this.calculateOverallCachability(
        generalizabilityScore,
        contextSensitivity,
        temporalStability,
      );

      // Make cache decision
      const cacheDecision = await this.makeCacheDecision(
        overallCachability,
        contextSensitivity,
        temporalStability,
        context,
      );

      return {
        overall_cachability: overallCachability,
        context_sensitivity: contextSensitivity,
        temporal_stability: temporalStability,
        cache_scope: cacheScope,
        recommended_ttl: recommendedTtl,
        cache_decision: cacheDecision,
      };
    } catch (error) {
      console.error('Error calculating response cachability:', error);
      return {
        overall_cachability: 0.0,
        context_sensitivity: 1.0,
        temporal_stability: 0.0,
        cache_scope: 'none',
        recommended_ttl: 0,
        cache_decision: {
          should_cache: false,
          cache_duration: 0,
          priority_level: 'low',
          eviction_weight: 1.0,
          preload_recommendation: false,
          context_scope: 'specific',
        },
      };
    }
  }

  /**
   * Extract wedding-specific entities and context from query
   */
  private async extractWeddingEntities(
    query: string,
    context: WeddingContext,
  ): Promise<WeddingEntityExtraction> {
    try {
      const entities: WeddingEntityExtraction = {
        venues: [],
        vendors: [],
        services: [],
        dates: [],
        budget_items: [],
        cultural_elements: [],
        locations: [],
      };

      const queryLower = query.toLowerCase();

      // Extract venue types
      const venueTypes = [
        'church',
        'beach',
        'garden',
        'ballroom',
        'barn',
        'vineyard',
        'hotel',
        'restaurant',
        'courthouse',
        'park',
        'mansion',
        'castle',
      ];
      entities.venues = venueTypes.filter((venue) =>
        queryLower.includes(venue),
      );

      // Extract vendor types
      const vendorTypes = [
        'photographer',
        'videographer',
        'florist',
        'caterer',
        'baker',
        'dj',
        'band',
        'planner',
        'coordinator',
        'officiant',
        'makeup',
        'hair',
        'transportation',
        'decorator',
      ];
      entities.vendors = vendorTypes.filter((vendor) =>
        queryLower.includes(vendor),
      );

      // Extract services
      const services = [
        'photography',
        'videography',
        'flowers',
        'catering',
        'music',
        'decoration',
        'planning',
        'coordination',
        'transportation',
        'accommodation',
        'invitations',
        'favors',
        'lighting',
      ];
      entities.services = services.filter((service) =>
        queryLower.includes(service),
      );

      // Extract budget-related terms
      const budgetItems = [
        'cost',
        'price',
        'budget',
        'expensive',
        'cheap',
        'affordable',
        'premium',
        'luxury',
        'discount',
        'package',
        'deal',
      ];
      entities.budget_items = budgetItems.filter((item) =>
        queryLower.includes(item),
      );

      // Extract cultural elements
      if (context.cultural_preferences) {
        entities.cultural_elements = context.cultural_preferences.filter(
          (element) => queryLower.includes(element.toLowerCase()),
        );
      }

      // Extract location references
      const locationTerms = [
        context.location.city?.toLowerCase(),
        context.location.state?.toLowerCase(),
        'local',
        'nearby',
        'area',
        'region',
      ].filter(Boolean);

      entities.locations = locationTerms.filter((location) =>
        queryLower.includes(location),
      );

      return entities;
    } catch (error) {
      console.error('Error extracting wedding entities:', error);
      return {
        venues: [],
        vendors: [],
        services: [],
        dates: [],
        budget_items: [],
        cultural_elements: [],
        locations: [],
      };
    }
  }

  /**
   * Enhance response with wedding industry context and knowledge
   */
  private async enhanceWithWeddingContext(
    response: string,
    entities: WeddingEntityExtraction,
    context: WeddingContext,
  ): Promise<string> {
    try {
      let enhancedResponse = response;

      // Add industry-specific insights
      const industryInsights = await this.getIndustryInsights(
        entities,
        context,
      );
      if (industryInsights.length > 0) {
        enhancedResponse += `\n\n**Wedding Industry Insights:**\n${industryInsights.join('\n')}`;
      }

      // Add planning stage specific advice
      const stageAdvice = await this.getPlanningStageAdvice(
        context.current_planning_stage,
        entities,
      );
      if (stageAdvice) {
        enhancedResponse += `\n\n**For your current planning stage (${context.current_planning_stage}):**\n${stageAdvice}`;
      }

      // Add guest count considerations
      const guestCountAdvice = await this.getGuestCountConsiderations(
        context.guest_count,
        entities,
      );
      if (guestCountAdvice) {
        enhancedResponse += `\n\n**For ${context.guest_count} guests:**\n${guestCountAdvice}`;
      }

      return enhancedResponse;
    } catch (error) {
      console.error('Error enhancing with wedding context:', error);
      return response;
    }
  }

  /**
   * Add location-specific context and recommendations
   */
  private async addLocationContext(
    response: string,
    location: WeddingContext['location'],
  ): Promise<string> {
    try {
      let locationEnhanced = response;

      // Get location-specific vendors and venues
      const localRecommendations = await this.getLocalRecommendations(location);
      if (localRecommendations.length > 0) {
        locationEnhanced += `\n\n**In ${location.city}, ${location.state}:**\n${localRecommendations.join('\n')}`;
      }

      // Add local regulations and considerations
      const localConsiderations = await this.getLocalConsiderations(location);
      if (localConsiderations.length > 0) {
        locationEnhanced += `\n\n**Local Considerations:**\n${localConsiderations.join('\n')}`;
      }

      return locationEnhanced;
    } catch (error) {
      console.error('Error adding location context:', error);
      return response;
    }
  }

  /**
   * Add seasonal context and timing considerations
   */
  private async addSeasonalContext(
    response: string,
    weddingDate: Date,
    season: string,
  ): Promise<string> {
    try {
      let seasonalEnhanced = response;

      // Add seasonal considerations
      const seasonalAdvice = await this.getSeasonalAdvice(season, weddingDate);
      if (seasonalAdvice.length > 0) {
        seasonalEnhanced += `\n\n**${season.charAt(0).toUpperCase() + season.slice(1)} Wedding Tips:**\n${seasonalAdvice.join('\n')}`;
      }

      // Add timing considerations
      const timingAdvice = await this.getTimingAdvice(weddingDate);
      if (timingAdvice) {
        seasonalEnhanced += `\n\n**Timeline Considerations:**\n${timingAdvice}`;
      }

      return seasonalEnhanced;
    } catch (error) {
      console.error('Error adding seasonal context:', error);
      return response;
    }
  }

  /**
   * Apply budget-appropriate context and alternatives
   */
  private async applyBudgetContext(
    response: string,
    budgetRange: string,
    entities: WeddingEntityExtraction,
  ): Promise<string> {
    try {
      let budgetEnhanced = response;

      // Get budget-appropriate suggestions
      const budgetSuggestions = await this.getBudgetSuggestions(
        budgetRange,
        entities,
      );
      if (budgetSuggestions.length > 0) {
        budgetEnhanced += `\n\n**For your ${budgetRange} budget:**\n${budgetSuggestions.join('\n')}`;
      }

      // Add cost-saving tips if appropriate
      if (budgetRange === 'low' || budgetRange === 'medium') {
        const costSavingTips = await this.getCostSavingTips(entities);
        if (costSavingTips.length > 0) {
          budgetEnhanced += `\n\n**Money-Saving Tips:**\n${costSavingTips.join('\n')}`;
        }
      }

      return budgetEnhanced;
    } catch (error) {
      console.error('Error applying budget context:', error);
      return response;
    }
  }

  /**
   * Apply cultural context and sensitivity
   */
  private async applyCulturalContext(
    response: string,
    culturalPreferences: string[],
  ): Promise<string> {
    try {
      if (!culturalPreferences || culturalPreferences.length === 0) {
        return response;
      }

      let culturalEnhanced = response;

      // Add cultural considerations
      const culturalAdvice = await this.getCulturalAdvice(culturalPreferences);
      if (culturalAdvice.length > 0) {
        culturalEnhanced += `\n\n**Cultural Considerations:**\n${culturalAdvice.join('\n')}`;
      }

      // Add traditional elements if relevant
      const traditionalElements =
        await this.getTraditionalElements(culturalPreferences);
      if (traditionalElements.length > 0) {
        culturalEnhanced += `\n\n**Traditional Elements to Consider:**\n${traditionalElements.join('\n')}`;
      }

      return culturalEnhanced;
    } catch (error) {
      console.error('Error applying cultural context:', error);
      return response;
    }
  }

  /**
   * Final quality optimization pass
   */
  private async finalQualityOptimization(
    response: string,
    query: string,
    context: WeddingContext,
  ): Promise<string> {
    try {
      // Remove redundancy and improve flow
      let optimized = await this.removeRedundancy(response);

      // Ensure response directly addresses the query
      optimized = await this.ensureQueryAlignment(optimized, query);

      // Add helpful next steps if appropriate
      const nextSteps = await this.generateNextSteps(query, context);
      if (nextSteps.length > 0) {
        optimized += `\n\n**Next Steps:**\n${nextSteps.map((step, i) => `${i + 1}. ${step}`).join('\n')}`;
      }

      // Final formatting and structure
      optimized = await this.formatResponse(optimized);

      return optimized;
    } catch (error) {
      console.error('Error in final quality optimization:', error);
      return response;
    }
  }

  // Analysis methods for cachability
  private async analyzeResponseGeneralizability(
    response: string,
    context: WeddingContext,
  ): Promise<number> {
    // Analyze how generalizable the response is across contexts
    let generalizability = 0.5; // Base score

    // Responses with specific names/dates are less generalizable
    if (this.containsSpecificReferences(response)) {
      generalizability -= 0.3;
    }

    // Generic advice is more generalizable
    if (this.containsGenericAdvice(response)) {
      generalizability += 0.2;
    }

    // Budget/style specific content reduces generalizability
    if (this.containsBudgetSpecificContent(response)) {
      generalizability -= 0.1;
    }

    return Math.max(0.0, Math.min(1.0, generalizability));
  }

  private async measureContextSensitivity(
    query: string,
    response: string,
    context: WeddingContext,
  ): Promise<number> {
    let sensitivity = 0.3; // Base sensitivity

    // Location-specific content increases sensitivity
    if (this.containsLocationSpecificContent(response)) {
      sensitivity += 0.3;
    }

    // Date-specific content increases sensitivity
    if (this.containsDateSpecificContent(response)) {
      sensitivity += 0.2;
    }

    // Cultural content increases sensitivity
    if (this.containsCulturalContent(response)) {
      sensitivity += 0.1;
    }

    return Math.max(0.0, Math.min(1.0, sensitivity));
  }

  private async assessTemporalStability(
    response: string,
    weddingDate: Date,
    planningStage: string,
  ): Promise<number> {
    let stability = 0.7; // Base stability

    // Planning stage specific content has lower stability
    const stageSpecificPenalty = {
      early: 0.0,
      venue_selection: -0.1,
      vendor_booking: -0.2,
      final_details: -0.3,
      wedding_week: -0.4,
    };

    stability +=
      stageSpecificPenalty[
        planningStage as keyof typeof stageSpecificPenalty
      ] || 0;

    // Time-sensitive content reduces stability
    if (this.containsTimeSensitiveContent(response)) {
      stability -= 0.2;
    }

    return Math.max(0.0, Math.min(1.0, stability));
  }

  private async determineCacheScope(
    query: string,
    response: string,
    context: WeddingContext,
    generalizability: number,
  ): Promise<string> {
    if (generalizability > 0.8) return 'broad';
    if (generalizability > 0.5) return 'similar';
    return 'specific';
  }

  private async recommendTtl(
    response: string,
    context: WeddingContext,
    temporalStability: number,
  ): Promise<number> {
    // Base TTL in seconds
    let baseTtl = 24 * 60 * 60; // 24 hours

    // Adjust based on temporal stability
    baseTtl = baseTtl * temporalStability;

    // Planning stage adjustments
    const stageMultipliers = {
      early: 7, // 7 days
      venue_selection: 3, // 3 days
      vendor_booking: 2, // 2 days
      final_details: 1, // 1 day
      wedding_week: 0.5, // 12 hours
    };

    const multiplier =
      stageMultipliers[
        context.current_planning_stage as keyof typeof stageMultipliers
      ] || 1;

    return Math.floor(baseTtl * multiplier);
  }

  private calculateOverallCachability(
    generalizability: number,
    contextSensitivity: number,
    temporalStability: number,
  ): number {
    return (
      0.4 * generalizability +
      0.3 * (1.0 - contextSensitivity) + // Lower sensitivity = higher cachability
      0.3 * temporalStability
    );
  }

  private async makeCacheDecision(
    overallCachability: number,
    contextSensitivity: number,
    temporalStability: number,
    context: WeddingContext,
  ): Promise<CacheOptimizationDecision> {
    const shouldCache = overallCachability > 0.6;

    // Calculate cache duration based on stability and context
    const baseDuration = temporalStability * 86400; // Max 24 hours
    const cacheDuration = shouldCache ? Math.max(3600, baseDuration) : 0; // Min 1 hour

    // Determine priority level
    let priorityLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (overallCachability > 0.9) priorityLevel = 'critical';
    else if (overallCachability > 0.8) priorityLevel = 'high';
    else if (overallCachability > 0.7) priorityLevel = 'medium';

    // Calculate eviction weight (higher = more likely to evict)
    const evictionWeight = 1.0 - overallCachability;

    // Preload recommendation for high-value content
    const preloadRecommendation =
      overallCachability > 0.8 && temporalStability > 0.7;

    // Context scope
    const contextScope: 'specific' | 'similar' | 'broad' =
      contextSensitivity < 0.3
        ? 'broad'
        : contextSensitivity < 0.6
          ? 'similar'
          : 'specific';

    return {
      should_cache: shouldCache,
      cache_duration: cacheDuration,
      priority_level: priorityLevel,
      eviction_weight: evictionWeight,
      preload_recommendation: preloadRecommendation,
      context_scope: contextScope,
    };
  }

  // Helper methods for content analysis
  private containsSpecificReferences(response: string): boolean {
    const specificPatterns = [
      /\b\d{4}-\d{2}-\d{2}\b/, // Dates
      /\$\d+/, // Specific prices
      /\b[A-Z][a-z]+ \d+, \d{4}\b/, // Formatted dates
      /\b\d+ [A-Za-z]+ Street\b/, // Addresses
    ];

    return specificPatterns.some((pattern) => pattern.test(response));
  }

  private containsGenericAdvice(response: string): boolean {
    const genericPatterns = [
      /generally/i,
      /typically/i,
      /usually/i,
      /most couples/i,
      /consider/i,
      /important to/i,
    ];

    return genericPatterns.some((pattern) => pattern.test(response));
  }

  private containsBudgetSpecificContent(response: string): boolean {
    return /\$(low|medium|high|luxury|budget|expensive|affordable)/i.test(
      response,
    );
  }

  private containsLocationSpecificContent(response: string): boolean {
    return /\b(in|near|around) [A-Z][a-z]+/i.test(response);
  }

  private containsDateSpecificContent(response: string): boolean {
    return /\b(next week|this month|in \d+ days)/i.test(response);
  }

  private containsCulturalContent(response: string): boolean {
    return /\b(traditional|cultural|religious|custom|ceremony)/i.test(response);
  }

  private containsTimeSensitiveContent(response: string): boolean {
    return /\b(now|today|this week|currently|recent)/i.test(response);
  }

  // Mock data methods - replace with actual implementations
  private async loadResponseQualityModel(): Promise<any> {
    return {}; // Mock model
  }

  private async loadContextSimilarityModel(): Promise<any> {
    return {}; // Mock model
  }

  private async loadWeddingKnowledgeGraph(): Promise<void> {
    // Load wedding industry knowledge base
  }

  private async loadBudgetContextMap(): Promise<void> {
    // Load budget-specific context mappings
  }

  private async loadCulturalContextMap(): Promise<void> {
    // Load cultural context mappings
  }

  private async getIndustryInsights(
    entities: WeddingEntityExtraction,
    context: WeddingContext,
  ): Promise<string[]> {
    return [
      'Consider booking vendors 9-12 months in advance for popular dates.',
    ];
  }

  private async getPlanningStageAdvice(
    stage: string,
    entities: WeddingEntityExtraction,
  ): Promise<string> {
    const stageAdvice = {
      early:
        'Focus on setting your budget and date before diving into vendor selection.',
      venue_selection:
        'Visit venues in person and ask about all included services and restrictions.',
      vendor_booking:
        'Check vendor availability for your date before falling in love with their work.',
      final_details:
        'Create detailed timelines and confirm all vendor arrival times.',
      wedding_week:
        'Delegate tasks to your wedding party and trust your vendors.',
    };

    return stageAdvice[stage as keyof typeof stageAdvice] || '';
  }

  private async getGuestCountConsiderations(
    guestCount: number,
    entities: WeddingEntityExtraction,
  ): Promise<string> {
    if (guestCount < 50)
      return 'Intimate weddings allow for more personalized touches and higher per-guest budgets.';
    if (guestCount < 150)
      return 'Medium-sized weddings offer flexibility in venue selection and catering options.';
    return 'Large weddings require careful logistics planning and may need multiple vendors for some services.';
  }

  private async getLocalRecommendations(location: any): Promise<string[]> {
    return [
      `Check with local wedding planners for vendor recommendations in ${location.city}.`,
    ];
  }

  private async getLocalConsiderations(location: any): Promise<string[]> {
    return ['Review local noise ordinances for outdoor receptions.'];
  }

  private async getSeasonalAdvice(
    season: string,
    date: Date,
  ): Promise<string[]> {
    const seasonalTips = {
      spring: ['Consider allergy-friendly flowers for outdoor ceremonies.'],
      summer: ['Plan for heat with plenty of shade and hydration stations.'],
      fall: ['Have indoor backup plans for potential weather changes.'],
      winter: ['Provide warm blankets for outdoor photos and ceremonies.'],
    };

    return seasonalTips[season as keyof typeof seasonalTips] || [];
  }

  private async getTimingAdvice(date: Date): Promise<string> {
    const daysUntil = Math.ceil(
      (date.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );

    if (daysUntil < 30)
      return 'Focus on finalizing details and confirming vendor timelines.';
    if (daysUntil < 90)
      return 'Complete vendor bookings and send save-the-dates.';
    if (daysUntil < 180)
      return 'Lock in major vendors and start dress shopping.';
    return 'You have plenty of time to plan - start with venue and date selection.';
  }

  private async getBudgetSuggestions(
    budgetRange: string,
    entities: WeddingEntityExtraction,
  ): Promise<string[]> {
    const suggestions = {
      low: [
        'Consider off-season dates and weekday ceremonies for better rates.',
      ],
      medium: ['Allocate 40-50% of budget to venue and catering.'],
      high: [
        'Consider upgrading photography and flowers for lasting memories.',
      ],
      luxury: [
        'Invest in unique experiences like custom entertainment or destination elements.',
      ],
    };

    return suggestions[budgetRange as keyof typeof suggestions] || [];
  }

  private async getCostSavingTips(
    entities: WeddingEntityExtraction,
  ): Promise<string[]> {
    return [
      'Book vendors as a package for potential discounts.',
      'Consider seasonal flowers for lower costs.',
      'DIY favors and decorations can save significantly.',
    ];
  }

  private async getCulturalAdvice(preferences: string[]): Promise<string[]> {
    return preferences.map(
      (pref) =>
        `Incorporate ${pref} traditions that are meaningful to your families.`,
    );
  }

  private async getTraditionalElements(
    preferences: string[],
  ): Promise<string[]> {
    return preferences.map(
      (pref) =>
        `Traditional ${pref} elements like [specific customs] can add meaningful touches.`,
    );
  }

  private async removeRedundancy(response: string): Promise<string> {
    // Basic redundancy removal - could be enhanced with NLP
    const sentences = response.split('\n');
    const uniqueSentences = [...new Set(sentences)];
    return uniqueSentences.join('\n');
  }

  private async ensureQueryAlignment(
    response: string,
    query: string,
  ): Promise<string> {
    // Ensure response directly addresses the query
    if (!response.toLowerCase().includes(query.toLowerCase().split(' ')[0])) {
      return `To answer your question: ${response}`;
    }
    return response;
  }

  private async generateNextSteps(
    query: string,
    context: WeddingContext,
  ): Promise<string[]> {
    const stageSteps = {
      early: [
        'Set your wedding date and budget',
        'Create your guest list',
        'Start researching venues',
      ],
      venue_selection: [
        'Visit your top 3 venue choices',
        'Compare packages and pricing',
        'Book your preferred venue',
      ],
      vendor_booking: [
        'Research and interview key vendors',
        'Check references and portfolios',
        'Book vendors 6-9 months in advance',
      ],
      final_details: [
        'Confirm all vendor details and timelines',
        'Send final guest count to caterer',
        'Prepare wedding day emergency kit',
      ],
      wedding_week: [
        'Confirm all vendor arrival times',
        'Delegate day-of responsibilities',
        'Relax and enjoy your special day',
      ],
    };

    return (
      stageSteps[context.current_planning_stage as keyof typeof stageSteps] ||
      []
    );
  }

  private async formatResponse(response: string): Promise<string> {
    // Basic formatting improvements
    return response
      .replace(/\n{3,}/g, '\n\n') // Remove excessive line breaks
      .replace(/\s{2,}/g, ' ') // Remove excessive spaces
      .trim();
  }
}
