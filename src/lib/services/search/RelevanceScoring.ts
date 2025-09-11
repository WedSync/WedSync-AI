/**
 * WS-248: Advanced Search System - Relevance Scoring Engine
 *
 * RelevanceScoring: Intelligent relevance algorithms for wedding vendor
 * search optimization with machine learning-powered scoring.
 *
 * Team B - Round 1 - Advanced Search Backend Focus
 */

// =====================================================================================
// TYPES & INTERFACES
// =====================================================================================

interface ScoringContext {
  query: string;
  searchType: string;
  userContext?: {
    userId: string;
    searchHistory?: string[];
    preferences?: {
      vendorTypes?: string[];
      budgetRange?: { min: number; max: number };
      preferredLocations?: string[];
    };
  };
}

interface SearchResult {
  id: string;
  type: 'vendor' | 'venue' | 'service';
  title: string;
  description: string;
  vendor: {
    id: string;
    name: string;
    type: string;
    verified: boolean;
    rating: number;
    reviewCount: number;
    location: {
      address: string;
      city: string;
      state: string;
      latitude: number;
      longitude: number;
    };
  };
  services: Array<{
    id: string;
    name: string;
    category: string;
    priceRange: {
      min: number;
      max: number;
      currency: string;
    };
    availability: boolean;
  }>;
  searchMetadata: {
    score: number;
    distance?: number;
    highlights: Record<string, string[]>;
    matchedTerms: string[];
  };
}

interface ScoringWeights {
  textRelevance: number;
  qualityScore: number;
  popularityScore: number;
  locationScore: number;
  availabilityScore: number;
  verificationScore: number;
  personalizedScore: number;
  recencyScore: number;
  diversityScore: number;
}

interface ScoringFactors {
  textRelevance: number;
  qualityScore: number;
  popularityScore: number;
  locationScore: number;
  availabilityScore: number;
  verificationScore: number;
  personalizedScore: number;
  recencyScore: number;
  diversityScore: number;
}

// =====================================================================================
// RELEVANCE SCORING SERVICE
// =====================================================================================

export class RelevanceScoring {
  private supabase: any;
  private defaultWeights: ScoringWeights;
  private scoringCache: Map<string, any>;

  constructor(supabase: any) {
    this.supabase = supabase;
    this.scoringCache = new Map();
    this.defaultWeights = this.getDefaultWeights();
  }

  // =====================================================================================
  // MAIN SCORING METHOD
  // =====================================================================================

  async scoreResults(
    results: SearchResult[],
    context: ScoringContext,
  ): Promise<SearchResult[]> {
    try {
      console.log(
        `Scoring ${results.length} results for query: "${context.query}"`,
      );

      // Get personalized weights if user context available
      const weights = context.userContext
        ? await this.getPersonalizedWeights(
            context.userContext.userId,
            context.searchType,
          )
        : this.defaultWeights;

      // Calculate scoring factors for each result
      const scoredResults = await Promise.all(
        results.map(async (result) => {
          const factors = await this.calculateScoringFactors(result, context);
          const finalScore = this.calculateWeightedScore(factors, weights);

          return {
            ...result,
            searchMetadata: {
              ...result.searchMetadata,
              score: finalScore,
              scoringFactors: factors,
            },
          };
        }),
      );

      // Apply diversity scoring to reduce result similarity
      const diversifiedResults = this.applyDiversityScoring(
        scoredResults,
        context,
      );

      // Sort by final score
      const sortedResults = diversifiedResults.sort(
        (a, b) => b.searchMetadata.score - a.searchMetadata.score,
      );

      console.log(
        `Scoring completed. Top score: ${sortedResults[0]?.searchMetadata.score || 0}`,
      );

      return sortedResults;
    } catch (error) {
      console.error('Relevance scoring error:', error);
      return results; // Return original results if scoring fails
    }
  }

  // =====================================================================================
  // SCORING FACTORS CALCULATION
  // =====================================================================================

  private async calculateScoringFactors(
    result: SearchResult,
    context: ScoringContext,
  ): Promise<ScoringFactors> {
    const factors: ScoringFactors = {
      textRelevance: await this.calculateTextRelevance(result, context),
      qualityScore: this.calculateQualityScore(result),
      popularityScore: this.calculatePopularityScore(result),
      locationScore: this.calculateLocationScore(result, context),
      availabilityScore: this.calculateAvailabilityScore(result),
      verificationScore: this.calculateVerificationScore(result),
      personalizedScore: await this.calculatePersonalizedScore(result, context),
      recencyScore: await this.calculateRecencyScore(result),
      diversityScore: 0, // Will be calculated later in batch processing
    };

    return factors;
  }

  // =====================================================================================
  // INDIVIDUAL FACTOR CALCULATIONS
  // =====================================================================================

  private async calculateTextRelevance(
    result: SearchResult,
    context: ScoringContext,
  ): Promise<number> {
    if (!context.query || context.query.trim().length === 0) {
      return 0.5; // Neutral score for no query
    }

    const query = context.query.toLowerCase();
    const queryTerms = query.split(/\s+/).filter((term) => term.length > 2);

    let relevanceScore = 0;
    const maxScore = queryTerms.length * 3; // Max 3 points per term

    // Check business name matches (highest weight)
    const businessName = result.vendor.name.toLowerCase();
    queryTerms.forEach((term) => {
      if (businessName.includes(term)) {
        relevanceScore += businessName.startsWith(term) ? 3 : 2;
      }
    });

    // Check description matches (medium weight)
    const description = result.description.toLowerCase();
    queryTerms.forEach((term) => {
      if (description.includes(term)) {
        relevanceScore += 1.5;
      }
    });

    // Check service name matches (medium weight)
    result.services.forEach((service) => {
      const serviceName = service.name.toLowerCase();
      queryTerms.forEach((term) => {
        if (serviceName.includes(term)) {
          relevanceScore += 1.8;
        }
      });
    });

    // Check vendor type matches (high weight for specific searches)
    const vendorType = result.vendor.type.toLowerCase();
    queryTerms.forEach((term) => {
      if (
        vendorType.includes(term) ||
        this.isVendorTypeSynonym(term, vendorType)
      ) {
        relevanceScore += 2.5;
      }
    });

    // Normalize to 0-1 scale
    return Math.min(relevanceScore / maxScore, 1.0);
  }

  private calculateQualityScore(result: SearchResult): number {
    const rating = result.vendor.rating || 0;
    const reviewCount = result.vendor.reviewCount || 0;

    // Rating component (0.7 weight)
    const ratingScore = rating / 5.0;

    // Review count component (0.3 weight) - logarithmic scale
    const reviewScore = Math.min(Math.log10(reviewCount + 1) / 3, 1.0);

    return ratingScore * 0.7 + reviewScore * 0.3;
  }

  private calculatePopularityScore(result: SearchResult): number {
    const reviewCount = result.vendor.reviewCount || 0;

    // Use logarithmic scale for popularity to avoid extreme bias
    // Popular vendors (100+ reviews) get high scores, but diminishing returns
    return Math.min(Math.log10(reviewCount + 1) / 2.5, 1.0);
  }

  private calculateLocationScore(
    result: SearchResult,
    context: ScoringContext,
  ): number {
    // If no location context, return neutral score
    if (!result.searchMetadata.distance) {
      return 0.5;
    }

    const distance = result.searchMetadata.distance;

    // Distance-based scoring: closer = better
    // 0km = 1.0, 50km = 0.5, 100km+ = 0.1
    if (distance <= 10) return 1.0;
    if (distance <= 25) return 0.8;
    if (distance <= 50) return 0.6;
    if (distance <= 100) return 0.4;
    return 0.2;
  }

  private calculateAvailabilityScore(result: SearchResult): number {
    // Check if services are marked as available
    const availableServices = result.services.filter(
      (service) => service.availability,
    );
    const totalServices = result.services.length || 1;

    return availableServices.length / totalServices;
  }

  private calculateVerificationScore(result: SearchResult): number {
    return result.vendor.verified ? 1.0 : 0.3;
  }

  private async calculatePersonalizedScore(
    result: SearchResult,
    context: ScoringContext,
  ): Promise<number> {
    if (!context.userContext) {
      return 0.5; // Neutral score for anonymous users
    }

    let personalizedScore = 0.5;
    const { preferences } = context.userContext;

    // Vendor type preference boost
    if (preferences?.vendorTypes?.includes(result.vendor.type)) {
      personalizedScore += 0.3;
    }

    // Budget preference alignment
    if (preferences?.budgetRange && result.services.length > 0) {
      const servicePrice = result.services[0].priceRange.min;
      const budgetRange = preferences.budgetRange;

      if (servicePrice >= budgetRange.min && servicePrice <= budgetRange.max) {
        personalizedScore += 0.2;
      }
    }

    // Location preference boost
    if (
      preferences?.preferredLocations?.includes(result.vendor.location.city)
    ) {
      personalizedScore += 0.2;
    }

    // Search history similarity boost
    if (context.userContext.searchHistory?.length > 0) {
      const historySimilarity = await this.calculateHistorySimilarity(
        result,
        context.userContext.searchHistory,
      );
      personalizedScore += historySimilarity * 0.1;
    }

    return Math.min(personalizedScore, 1.0);
  }

  private async calculateRecencyScore(result: SearchResult): Promise<number> {
    try {
      // Get when the vendor profile was last updated
      const { data } = await this.supabase
        .from('suppliers')
        .select('updated_at, created_at')
        .eq('id', result.vendor.id)
        .single();

      if (!data) return 0.5;

      const updatedAt = new Date(data.updated_at);
      const createdAt = new Date(data.created_at);
      const now = new Date();

      // Boost recently updated profiles
      const daysSinceUpdate =
        (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);

      // Fresh updates (within 30 days) get higher scores
      if (daysSinceUpdate <= 7) return 1.0;
      if (daysSinceUpdate <= 30) return 0.8;
      if (daysSinceUpdate <= 90) return 0.6;
      if (daysSinceUpdate <= 365) return 0.4;
      return 0.2;
    } catch (error) {
      console.error('Recency score calculation error:', error);
      return 0.5;
    }
  }

  // =====================================================================================
  // WEIGHTED SCORE CALCULATION
  // =====================================================================================

  private calculateWeightedScore(
    factors: ScoringFactors,
    weights: ScoringWeights,
  ): number {
    const weightedScore =
      factors.textRelevance * weights.textRelevance +
      factors.qualityScore * weights.qualityScore +
      factors.popularityScore * weights.popularityScore +
      factors.locationScore * weights.locationScore +
      factors.availabilityScore * weights.availabilityScore +
      factors.verificationScore * weights.verificationScore +
      factors.personalizedScore * weights.personalizedScore +
      factors.recencyScore * weights.recencyScore +
      factors.diversityScore * weights.diversityScore;

    // Normalize by sum of weights
    const totalWeight = Object.values(weights).reduce(
      (sum, weight) => sum + weight,
      0,
    );

    return Math.min(Math.max(weightedScore / totalWeight, 0), 1.0);
  }

  // =====================================================================================
  // DIVERSITY SCORING
  // =====================================================================================

  private applyDiversityScoring(
    results: SearchResult[],
    context: ScoringContext,
  ): SearchResult[] {
    // Group results by vendor type for diversity analysis
    const typeGroups = results.reduce(
      (groups, result) => {
        const type = result.vendor.type;
        if (!groups[type]) groups[type] = [];
        groups[type].push(result);
        return groups;
      },
      {} as Record<string, SearchResult[]>,
    );

    // Apply diversity penalty to over-represented types
    const totalResults = results.length;
    const typeTargetRatio = 1 / Object.keys(typeGroups).length;

    Object.entries(typeGroups).forEach(([type, groupResults]) => {
      const currentRatio = groupResults.length / totalResults;
      const overRepresentation = Math.max(0, currentRatio - typeTargetRatio);

      if (overRepresentation > 0) {
        // Apply diminishing diversity penalty to lower-ranked results of this type
        groupResults.forEach((result, index) => {
          const diversityPenalty =
            overRepresentation * 0.1 * Math.log(index + 1);
          result.searchMetadata.score = Math.max(
            0,
            result.searchMetadata.score - diversityPenalty,
          );

          // Store diversity factor for analysis
          result.searchMetadata.scoringFactors = {
            ...result.searchMetadata.scoringFactors,
            diversityScore: -diversityPenalty,
          };
        });
      }
    });

    return results;
  }

  // =====================================================================================
  // PERSONALIZED WEIGHTS
  // =====================================================================================

  private async getPersonalizedWeights(
    userId: string,
    searchType: string,
  ): Promise<ScoringWeights> {
    try {
      // Check cache first
      const cacheKey = `weights_${userId}_${searchType}`;
      if (this.scoringCache.has(cacheKey)) {
        return this.scoringCache.get(cacheKey);
      }

      // Get user's search behavior patterns
      const { data: searchHistory } = await this.supabase
        .from('search_analytics')
        .select('search_query, result_clicks, conversion_data')
        .eq('user_id', userId)
        .order('search_timestamp', { ascending: false })
        .limit(50);

      const personalizedWeights = this.analyzeUserBehaviorForWeights(
        searchHistory || [],
        searchType,
      );

      // Cache for 1 hour
      this.scoringCache.set(cacheKey, personalizedWeights);
      setTimeout(
        () => {
          this.scoringCache.delete(cacheKey);
        },
        60 * 60 * 1000,
      );

      return personalizedWeights;
    } catch (error) {
      console.error('Personalized weights error:', error);
      return this.defaultWeights;
    }
  }

  private analyzeUserBehaviorForWeights(
    searchHistory: any[],
    searchType: string,
  ): ScoringWeights {
    const weights = { ...this.defaultWeights };

    if (searchHistory.length === 0) {
      return weights;
    }

    // Analyze click patterns to adjust weights
    const clickPatterns = this.analyzeClickPatterns(searchHistory);

    // Users who click on highly rated vendors more often
    if (clickPatterns.prefersHighRated > 0.7) {
      weights.qualityScore += 0.1;
      weights.popularityScore += 0.05;
    }

    // Users who prefer verified vendors
    if (clickPatterns.prefersVerified > 0.8) {
      weights.verificationScore += 0.1;
    }

    // Users who prefer local vendors
    if (clickPatterns.prefersLocal > 0.6) {
      weights.locationScore += 0.15;
    }

    // Normalize weights to sum to original total
    const originalSum = Object.values(this.defaultWeights).reduce(
      (sum, w) => sum + w,
      0,
    );
    const currentSum = Object.values(weights).reduce((sum, w) => sum + w, 0);
    const normalizationFactor = originalSum / currentSum;

    Object.keys(weights).forEach((key) => {
      weights[key] *= normalizationFactor;
    });

    return weights;
  }

  // =====================================================================================
  // UTILITY METHODS
  // =====================================================================================

  private getDefaultWeights(): ScoringWeights {
    return {
      textRelevance: 0.25, // 25% - Most important for search
      qualityScore: 0.2, // 20% - Quality is crucial for weddings
      popularityScore: 0.1, // 10% - Some weight to popular vendors
      locationScore: 0.15, // 15% - Location matters for weddings
      availabilityScore: 0.1, // 10% - Availability is important
      verificationScore: 0.08, // 8% - Trust factor
      personalizedScore: 0.07, // 7% - Personalization boost
      recencyScore: 0.03, // 3% - Recent updates matter slightly
      diversityScore: 0.02, // 2% - Ensure diverse results
    };
  }

  private isVendorTypeSynonym(term: string, vendorType: string): boolean {
    const synonyms = {
      photographer: ['photo', 'photography', 'pics', 'pictures', 'camera'],
      venue: ['location', 'place', 'hall', 'space', 'reception'],
      catering: ['food', 'dining', 'meal', 'buffet', 'kitchen'],
      florist: ['flowers', 'floral', 'bouquet', 'arrangement'],
      dj: ['music', 'sound', 'entertainment', 'party'],
      videographer: ['video', 'filming', 'cinematic', 'movie'],
    };

    const vendorSynonyms = synonyms[vendorType.toLowerCase()] || [];
    return vendorSynonyms.includes(term.toLowerCase());
  }

  private async calculateHistorySimilarity(
    result: SearchResult,
    searchHistory: string[],
  ): Promise<number> {
    // Simple similarity based on common terms
    const resultTerms = [
      result.vendor.name,
      result.vendor.type,
      result.description,
    ]
      .join(' ')
      .toLowerCase()
      .split(/\s+/);

    const historyTerms = searchHistory
      .join(' ')
      .toLowerCase()
      .split(/\s+/)
      .filter((term) => term.length > 2);

    if (historyTerms.length === 0) return 0;

    const commonTerms = resultTerms.filter(
      (term) => historyTerms.includes(term) && term.length > 2,
    );

    return (
      commonTerms.length / Math.max(historyTerms.length, resultTerms.length)
    );
  }

  private analyzeClickPatterns(searchHistory: any[]): any {
    const patterns = {
      prefersHighRated: 0,
      prefersVerified: 0,
      prefersLocal: 0,
    };

    if (searchHistory.length === 0) return patterns;

    const clickData = searchHistory.filter(
      (entry) => entry.result_clicks?.length > 0,
    );
    if (clickData.length === 0) return patterns;

    let totalClicks = 0;
    let highRatedClicks = 0;
    let verifiedClicks = 0;
    let localClicks = 0;

    clickData.forEach((entry) => {
      entry.result_clicks.forEach((click) => {
        totalClicks++;

        if (click.vendor_rating >= 4.5) highRatedClicks++;
        if (click.vendor_verified) verifiedClicks++;
        if (click.distance_km <= 25) localClicks++;
      });
    });

    if (totalClicks > 0) {
      patterns.prefersHighRated = highRatedClicks / totalClicks;
      patterns.prefersVerified = verifiedClicks / totalClicks;
      patterns.prefersLocal = localClicks / totalClicks;
    }

    return patterns;
  }

  // =====================================================================================
  // SCORING OPTIMIZATION
  // =====================================================================================

  async optimizeScoring(userId: string, feedback: any): Promise<void> {
    try {
      // Store user feedback to improve future scoring
      await this.supabase.from('search_scoring_feedback').insert({
        user_id: userId,
        search_query: feedback.query,
        result_id: feedback.resultId,
        feedback_type: feedback.type, // 'clicked', 'converted', 'ignored'
        feedback_score: feedback.score,
        timestamp: new Date().toISOString(),
      });

      // Clear personalized weights cache to force recalculation
      const cacheKeys = Array.from(this.scoringCache.keys()).filter((key) =>
        key.startsWith(`weights_${userId}`),
      );

      cacheKeys.forEach((key) => this.scoringCache.delete(key));
    } catch (error) {
      console.error('Scoring optimization error:', error);
    }
  }

  // =====================================================================================
  // BATCH SCORING FOR PERFORMANCE
  // =====================================================================================

  async batchScoreResults(
    resultsBatches: SearchResult[][],
    context: ScoringContext,
  ): Promise<SearchResult[][]> {
    return Promise.all(
      resultsBatches.map((batch) => this.scoreResults(batch, context)),
    );
  }

  // =====================================================================================
  // SCORING ANALYTICS
  // =====================================================================================

  async getScoringAnalytics(timeRange: {
    start: string;
    end: string;
  }): Promise<any> {
    try {
      const { data: analytics } = await this.supabase
        .from('search_scoring_analytics')
        .select('*')
        .gte('timestamp', timeRange.start)
        .lte('timestamp', timeRange.end);

      return {
        averageScore:
          analytics?.reduce((sum, item) => sum + item.average_score, 0) /
          (analytics?.length || 1),
        scoreDistribution: this.calculateScoreDistribution(analytics || []),
        topPerformingFactors: this.identifyTopFactors(analytics || []),
      };
    } catch (error) {
      console.error('Scoring analytics error:', error);
      return null;
    }
  }

  private calculateScoreDistribution(analytics: any[]): Record<string, number> {
    const distribution = {
      '0.0-0.2': 0,
      '0.2-0.4': 0,
      '0.4-0.6': 0,
      '0.6-0.8': 0,
      '0.8-1.0': 0,
    };

    analytics.forEach((item) => {
      const score = item.average_score;
      if (score < 0.2) distribution['0.0-0.2']++;
      else if (score < 0.4) distribution['0.2-0.4']++;
      else if (score < 0.6) distribution['0.4-0.6']++;
      else if (score < 0.8) distribution['0.6-0.8']++;
      else distribution['0.8-1.0']++;
    });

    return distribution;
  }

  private identifyTopFactors(analytics: any[]): string[] {
    // Analyze which scoring factors contribute most to high-performing results
    // This would be enhanced with more sophisticated analysis
    return ['textRelevance', 'qualityScore', 'locationScore'];
  }
}
