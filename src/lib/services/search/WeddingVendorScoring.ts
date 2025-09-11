/**
 * WS-248: Advanced Search System - Wedding Vendor Scoring
 *
 * WeddingVendorScoring: Wedding-specific relevance algorithms with
 * industry expertise, seasonal factors, and vendor specialization.
 *
 * Team B - Round 1 - Advanced Search Backend Focus
 */

// =====================================================================================
// TYPES & INTERFACES
// =====================================================================================

interface WeddingContext {
  searchQuery: string;
  searchType: string;
  userContext?: {
    userId: string;
    searchHistory?: string[];
    preferences?: any;
  };
  filters?: {
    vendorTypes?: string[];
    priceRange?: { min: number; max: number };
    availability?: { startDate: string; endDate: string };
    rating?: number;
    verified?: boolean;
    featured?: boolean;
    tags?: string[];
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
    contact: {
      email: string;
      phone: string;
      website?: string;
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

interface WeddingVendorFactors {
  weddingExpertiseScore: number;
  seasonalRelevanceScore: number;
  portfolioQualityScore: number;
  clientTestimonialScore: number;
  weddingSpecializationScore: number;
  packageValueScore: number;
  availabilityScore: number;
  industryRecognitionScore: number;
  responsivenesScore: number;
  weddingExperienceScore: number;
}

// =====================================================================================
// WEDDING VENDOR SCORING SERVICE
// =====================================================================================

export class WeddingVendorScoring {
  private supabase: any;
  private weddingSeasons: Record<string, number>;
  private vendorTypeWeights: Record<string, Record<string, number>>;

  constructor(supabase: any) {
    this.supabase = supabase;
    this.weddingSeasons = this.initializeWeddingSeasons();
    this.vendorTypeWeights = this.initializeVendorTypeWeights();
  }

  // =====================================================================================
  // MAIN SCORING METHOD
  // =====================================================================================

  async scoreWeddingVendors(
    results: SearchResult[],
    context: WeddingContext,
  ): Promise<SearchResult[]> {
    try {
      console.log(
        `Applying wedding-specific scoring to ${results.length} vendors`,
      );

      // Get additional vendor data needed for wedding scoring
      const enhancedResults = await this.enhanceResultsWithWeddingData(results);

      // Calculate wedding-specific factors for each vendor
      const scoredResults = await Promise.all(
        enhancedResults.map(async (result) => {
          const factors = await this.calculateWeddingFactors(result, context);
          const weddingScore = this.calculateWeddingSpecificScore(
            factors,
            result,
            context,
          );

          // Combine with existing score (weighted average)
          const combinedScore =
            result.searchMetadata.score * 0.6 + weddingScore * 0.4;

          return {
            ...result,
            searchMetadata: {
              ...result.searchMetadata,
              score: combinedScore,
              weddingFactors: factors,
              weddingScore: weddingScore,
            },
          };
        }),
      );

      // Apply wedding industry boost patterns
      const boostedResults = this.applyWeddingIndustryBoosts(
        scoredResults,
        context,
      );

      console.log(
        `Wedding scoring completed. Average boost: ${this.calculateAverageBoost(results, boostedResults)}`,
      );

      return boostedResults;
    } catch (error) {
      console.error('Wedding vendor scoring error:', error);
      return results;
    }
  }

  // =====================================================================================
  // WEDDING FACTOR CALCULATIONS
  // =====================================================================================

  private async calculateWeddingFactors(
    result: SearchResult,
    context: WeddingContext,
  ): Promise<WeddingVendorFactors> {
    const factors: WeddingVendorFactors = {
      weddingExpertiseScore: await this.calculateWeddingExpertise(
        result,
        context,
      ),
      seasonalRelevanceScore: this.calculateSeasonalRelevance(result, context),
      portfolioQualityScore: await this.calculatePortfolioQuality(result),
      clientTestimonialScore: await this.calculateClientTestimonials(result),
      weddingSpecializationScore: this.calculateWeddingSpecialization(
        result,
        context,
      ),
      packageValueScore: this.calculatePackageValue(result, context),
      availabilityScore: await this.calculateWeddingAvailability(
        result,
        context,
      ),
      industryRecognitionScore: await this.calculateIndustryRecognition(result),
      responsivenesScore: await this.calculateResponsiveness(result),
      weddingExperienceScore: await this.calculateWeddingExperience(result),
    };

    return factors;
  }

  // =====================================================================================
  // INDIVIDUAL FACTOR CALCULATIONS
  // =====================================================================================

  private async calculateWeddingExpertise(
    result: SearchResult,
    context: WeddingContext,
  ): Promise<number> {
    try {
      // Check for wedding-specific keywords in profile
      const weddingKeywords = [
        'wedding',
        'bride',
        'groom',
        'ceremony',
        'reception',
        'bridal',
        'marriage',
        'matrimony',
        'nuptial',
        'engagement',
        'honeymoon',
      ];

      const profileText = [
        result.vendor.name,
        result.description,
        ...result.services.map((s) => s.name),
      ]
        .join(' ')
        .toLowerCase();

      let keywordScore = 0;
      weddingKeywords.forEach((keyword) => {
        if (profileText.includes(keyword)) {
          keywordScore += 0.1;
        }
      });

      // Check for wedding-specific certifications or memberships
      const { data: certifications } = await this.supabase
        .from('supplier_certifications')
        .select('certification_name, certification_type')
        .eq('supplier_id', result.vendor.id)
        .in('certification_type', ['wedding_industry', 'bridal_association']);

      const certificationScore = Math.min(
        (certifications?.length || 0) * 0.2,
        0.4,
      );

      // Check wedding portfolio percentage
      const { data: portfolioStats } = await this.supabase
        .from('supplier_portfolio_stats')
        .select('total_projects, wedding_projects')
        .eq('supplier_id', result.vendor.id)
        .single();

      const weddingPortfolioRatio = portfolioStats
        ? (portfolioStats.wedding_projects || 0) /
          (portfolioStats.total_projects || 1)
        : 0.5;

      const portfolioScore = weddingPortfolioRatio * 0.4;

      return Math.min(keywordScore + certificationScore + portfolioScore, 1.0);
    } catch (error) {
      console.error('Wedding expertise calculation error:', error);
      return 0.5;
    }
  }

  private calculateSeasonalRelevance(
    result: SearchResult,
    context: WeddingContext,
  ): number {
    try {
      const currentMonth = new Date().getMonth() + 1; // 1-12
      const peakWeddingMonths = [5, 6, 9, 10]; // May, June, September, October

      // Check if vendor specializes in current season
      const isCurrentlyRelevant = peakWeddingMonths.includes(currentMonth);
      const baseSeasonalScore = isCurrentlyRelevant ? 0.8 : 0.6;

      // Check for seasonal specializations
      const description = result.description.toLowerCase();
      const seasonalTerms = {
        spring: ['spring', 'garden', 'bloom', 'outdoor'],
        summer: ['summer', 'beach', 'outdoor', 'garden'],
        fall: ['fall', 'autumn', 'harvest', 'rustic'],
        winter: ['winter', 'holiday', 'christmas', 'cozy'],
      };

      let seasonalBonus = 0;
      Object.entries(seasonalTerms).forEach(([season, terms]) => {
        if (terms.some((term) => description.includes(term))) {
          seasonalBonus += 0.1;
        }
      });

      // Check availability during peak months if specified
      if (context.filters?.availability) {
        const startMonth =
          new Date(context.filters.availability.startDate).getMonth() + 1;
        if (peakWeddingMonths.includes(startMonth)) {
          seasonalBonus += 0.2;
        }
      }

      return Math.min(baseSeasonalScore + seasonalBonus, 1.0);
    } catch (error) {
      console.error('Seasonal relevance calculation error:', error);
      return 0.6;
    }
  }

  private async calculatePortfolioQuality(
    result: SearchResult,
  ): Promise<number> {
    try {
      const { data: portfolioStats } = await this.supabase
        .from('supplier_portfolios')
        .select('image_url, title, description, view_count, like_count')
        .eq('supplier_id', result.vendor.id)
        .order('view_count', { ascending: false })
        .limit(20);

      if (!portfolioStats || portfolioStats.length === 0) {
        return 0.3; // Low score for no portfolio
      }

      // Quality factors
      const portfolioSize = Math.min(portfolioStats.length / 20, 1.0);
      const avgViews =
        portfolioStats.reduce((sum, item) => sum + (item.view_count || 0), 0) /
        portfolioStats.length;
      const avgLikes =
        portfolioStats.reduce((sum, item) => sum + (item.like_count || 0), 0) /
        portfolioStats.length;

      const engagementScore =
        Math.min(Math.log10(avgViews + 1) / 4, 0.4) +
        Math.min(Math.log10(avgLikes + 1) / 3, 0.3);

      // Check for complete descriptions
      const descriptionQuality =
        portfolioStats.filter(
          (item) => item.description && item.description.length > 50,
        ).length / portfolioStats.length;

      return (
        portfolioSize * 0.4 + engagementScore * 0.4 + descriptionQuality * 0.2
      );
    } catch (error) {
      console.error('Portfolio quality calculation error:', error);
      return 0.5;
    }
  }

  private async calculateClientTestimonials(
    result: SearchResult,
  ): Promise<number> {
    try {
      const { data: testimonials } = await this.supabase
        .from('supplier_reviews')
        .select('rating, review_text, reviewer_name, wedding_date')
        .eq('supplier_id', result.vendor.id)
        .not('wedding_date', 'is', null) // Wedding-specific reviews
        .gte('rating', 4)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!testimonials || testimonials.length === 0) {
        return 0.2;
      }

      // Quality factors
      const weddingReviewRatio =
        testimonials.length / Math.max(result.vendor.reviewCount, 1);
      const avgRating =
        testimonials.reduce((sum, review) => sum + review.rating, 0) /
        testimonials.length;

      // Check for detailed testimonials
      const detailedReviews = testimonials.filter(
        (review) => review.review_text && review.review_text.length > 100,
      ).length;

      const detailScore = detailedReviews / testimonials.length;

      // Recent testimonials boost
      const recentReviews = testimonials.filter((review) => {
        const reviewDate = new Date(review.wedding_date);
        const sixMonthsAgo = new Date(
          Date.now() - 6 * 30 * 24 * 60 * 60 * 1000,
        );
        return reviewDate >= sixMonthsAgo;
      }).length;

      const recencyScore = Math.min(recentReviews / 5, 0.3);

      return Math.min(
        weddingReviewRatio * 0.3 +
          (avgRating / 5) * 0.4 +
          detailScore * 0.2 +
          recencyScore * 0.1,
        1.0,
      );
    } catch (error) {
      console.error('Client testimonials calculation error:', error);
      return 0.5;
    }
  }

  private calculateWeddingSpecialization(
    result: SearchResult,
    context: WeddingContext,
  ): number {
    try {
      const vendorType = result.vendor.type.toLowerCase();
      const query = context.searchQuery.toLowerCase();

      // Wedding specialization keywords by vendor type
      const specializationKeywords = {
        photographer: [
          'bridal',
          'engagement',
          'ceremony',
          'reception',
          'wedding day',
          'matrimony',
        ],
        venue: [
          'wedding venue',
          'reception hall',
          'bridal suite',
          'ceremony space',
        ],
        catering: [
          'wedding catering',
          'bridal luncheon',
          'rehearsal dinner',
          'wedding cake',
        ],
        florist: [
          'bridal bouquet',
          'wedding flowers',
          'ceremony decor',
          'reception centerpieces',
        ],
        dj: [
          'wedding reception',
          'ceremony music',
          'first dance',
          'wedding playlist',
        ],
        videographer: [
          'wedding film',
          'ceremony video',
          'bridal preparation',
          'wedding story',
        ],
      };

      const typeKeywords = specializationKeywords[vendorType] || [];
      const description = result.description.toLowerCase();
      const serviceName = result.services
        .map((s) => s.name.toLowerCase())
        .join(' ');

      let specializationScore = 0;

      // Check description for specialization terms
      typeKeywords.forEach((keyword) => {
        if (description.includes(keyword)) specializationScore += 0.15;
        if (serviceName.includes(keyword)) specializationScore += 0.1;
      });

      // Query match bonus
      if (typeKeywords.some((keyword) => query.includes(keyword))) {
        specializationScore += 0.2;
      }

      // Wedding-only vendors get bonus
      if (
        description.includes('wedding only') ||
        description.includes('exclusively wedding')
      ) {
        specializationScore += 0.3;
      }

      return Math.min(specializationScore, 1.0);
    } catch (error) {
      console.error('Wedding specialization calculation error:', error);
      return 0.5;
    }
  }

  private calculatePackageValue(
    result: SearchResult,
    context: WeddingContext,
  ): number {
    try {
      if (result.services.length === 0) {
        return 0.5;
      }

      // Check for comprehensive wedding packages
      const packages = result.services.filter(
        (service) =>
          service.name.toLowerCase().includes('package') ||
          service.name.toLowerCase().includes('bundle'),
      );

      const packageScore = Math.min(packages.length * 0.2, 0.4);

      // Price competitiveness within budget range
      let priceScore = 0.5;
      if (context.filters?.priceRange) {
        const avgServicePrice =
          result.services.reduce(
            (sum, service) =>
              sum + (service.priceRange.min + service.priceRange.max) / 2,
            0,
          ) / result.services.length;

        const budgetMid =
          (context.filters.priceRange.min + context.filters.priceRange.max) / 2;
        const priceRatio = avgServicePrice / budgetMid;

        // Sweet spot is around 80-90% of budget
        if (priceRatio >= 0.7 && priceRatio <= 0.9) {
          priceScore = 1.0;
        } else if (priceRatio >= 0.5 && priceRatio <= 1.1) {
          priceScore = 0.8;
        } else {
          priceScore = 0.4;
        }
      }

      // All-inclusive service bonus
      const serviceCategories = new Set(
        result.services.map((s) => s.category.toLowerCase()),
      );
      const comprehensiveServiceBonus = Math.min(
        serviceCategories.size * 0.05,
        0.2,
      );

      return Math.min(
        packageScore + priceScore * 0.6 + comprehensiveServiceBonus,
        1.0,
      );
    } catch (error) {
      console.error('Package value calculation error:', error);
      return 0.5;
    }
  }

  private async calculateWeddingAvailability(
    result: SearchResult,
    context: WeddingContext,
  ): Promise<number> {
    try {
      if (!context.filters?.availability) {
        return 0.7; // Neutral score when no dates specified
      }

      const { startDate, endDate } = context.filters.availability;

      // Check actual availability calendar
      const { data: availability } = await this.supabase
        .from('supplier_availability')
        .select('available_date, booking_status')
        .eq('supplier_id', result.vendor.id)
        .gte('available_date', startDate)
        .lte('available_date', endDate);

      if (!availability) {
        return 0.5; // Unknown availability
      }

      const availableDays = availability.filter(
        (day) => day.booking_status === 'available',
      ).length;

      const totalDays = availability.length || 1;
      const availabilityRatio = availableDays / totalDays;

      // Bonus for immediate availability
      const startDateObj = new Date(startDate);
      const today = new Date();
      const daysUntilWedding =
        (startDateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);

      let urgencyBonus = 0;
      if (daysUntilWedding < 30 && availabilityRatio > 0.8) {
        urgencyBonus = 0.2; // High availability for urgent bookings
      } else if (daysUntilWedding < 90 && availabilityRatio > 0.5) {
        urgencyBonus = 0.1;
      }

      return Math.min(availabilityRatio + urgencyBonus, 1.0);
    } catch (error) {
      console.error('Wedding availability calculation error:', error);
      return 0.5;
    }
  }

  private async calculateIndustryRecognition(
    result: SearchResult,
  ): Promise<number> {
    try {
      const { data: awards } = await this.supabase
        .from('supplier_awards')
        .select('award_name, award_type, year_received')
        .eq('supplier_id', result.vendor.id)
        .in('award_type', [
          'wedding_industry',
          'photography',
          'venue',
          'catering',
        ])
        .order('year_received', { ascending: false });

      if (!awards || awards.length === 0) {
        return 0.3;
      }

      // Recent awards are more valuable
      const currentYear = new Date().getFullYear();
      let recognitionScore = 0;

      awards.forEach((award) => {
        const yearsDiff = currentYear - award.year_received;
        if (yearsDiff <= 2)
          recognitionScore += 0.3; // Very recent
        else if (yearsDiff <= 5)
          recognitionScore += 0.2; // Recent
        else recognitionScore += 0.1; // Older awards
      });

      // Industry-specific recognition bonus
      const weddingSpecificAwards = awards.filter(
        (award) =>
          award.award_name.toLowerCase().includes('wedding') ||
          award.award_name.toLowerCase().includes('bridal'),
      ).length;

      const specializationBonus = Math.min(weddingSpecificAwards * 0.15, 0.3);

      return Math.min(recognitionScore + specializationBonus, 1.0);
    } catch (error) {
      console.error('Industry recognition calculation error:', error);
      return 0.3;
    }
  }

  private async calculateResponsiveness(result: SearchResult): Promise<number> {
    try {
      const { data: responseStats } = await this.supabase
        .from('supplier_response_stats')
        .select('avg_response_time_hours, response_rate')
        .eq('supplier_id', result.vendor.id)
        .single();

      if (!responseStats) {
        return 0.5; // No data available
      }

      // Response time scoring (wedding planning requires quick responses)
      let timeScore = 0.5;
      const avgHours = responseStats.avg_response_time_hours || 24;

      if (avgHours <= 2)
        timeScore = 1.0; // Excellent (within 2 hours)
      else if (avgHours <= 6)
        timeScore = 0.8; // Good (within 6 hours)
      else if (avgHours <= 12)
        timeScore = 0.6; // Fair (within 12 hours)
      else if (avgHours <= 24)
        timeScore = 0.4; // Poor (within 24 hours)
      else timeScore = 0.2; // Very poor (over 24 hours)

      // Response rate scoring
      const responseRate = responseStats.response_rate || 0.5;
      const rateScore = responseRate; // Direct mapping

      return timeScore * 0.6 + rateScore * 0.4;
    } catch (error) {
      console.error('Responsiveness calculation error:', error);
      return 0.5;
    }
  }

  private async calculateWeddingExperience(
    result: SearchResult,
  ): Promise<number> {
    try {
      const { data: experienceData } = await this.supabase
        .from('supplier_experience_stats')
        .select('years_in_business, weddings_completed, specialization_years')
        .eq('supplier_id', result.vendor.id)
        .single();

      if (!experienceData) {
        return 0.4; // New or unverified vendors
      }

      // Years in business (wedding industry values experience)
      const yearsScore = Math.min(
        (experienceData.years_in_business || 0) / 15, // Cap at 15 years for full score
        1.0,
      );

      // Number of weddings completed
      const weddingsCompleted = experienceData.weddings_completed || 0;
      const weddingCountScore = Math.min(
        Math.log10(weddingsCompleted + 1) / 3, // Logarithmic scale
        1.0,
      );

      // Wedding specialization years
      const specializationScore = Math.min(
        (experienceData.specialization_years || 0) / 10,
        1.0,
      );

      return (
        yearsScore * 0.4 + weddingCountScore * 0.4 + specializationScore * 0.2
      );
    } catch (error) {
      console.error('Wedding experience calculation error:', error);
      return 0.4;
    }
  }

  // =====================================================================================
  // SCORING COMBINATION AND BOOSTS
  // =====================================================================================

  private calculateWeddingSpecificScore(
    factors: WeddingVendorFactors,
    result: SearchResult,
    context: WeddingContext,
  ): number {
    // Wedding-specific weights (optimized for wedding industry)
    const weights = this.getWeddingWeights(result.vendor.type, context);

    const weightedScore =
      factors.weddingExpertiseScore * weights.expertise +
      factors.seasonalRelevanceScore * weights.seasonal +
      factors.portfolioQualityScore * weights.portfolio +
      factors.clientTestimonialScore * weights.testimonials +
      factors.weddingSpecializationScore * weights.specialization +
      factors.packageValueScore * weights.value +
      factors.availabilityScore * weights.availability +
      factors.industryRecognitionScore * weights.recognition +
      factors.responsivenesScore * weights.responsiveness +
      factors.weddingExperienceScore * weights.experience;

    const totalWeight = Object.values(weights).reduce(
      (sum, weight) => sum + weight,
      0,
    );

    return Math.min(Math.max(weightedScore / totalWeight, 0), 1.0);
  }

  private applyWeddingIndustryBoosts(
    results: SearchResult[],
    context: WeddingContext,
  ): SearchResult[] {
    // Apply wedding industry specific boosts
    return results.map((result) => {
      let boostFactor = 1.0;

      // Peak wedding season boost
      const currentMonth = new Date().getMonth() + 1;
      if ([5, 6, 9, 10].includes(currentMonth)) {
        boostFactor += 0.05;
      }

      // High-demand vendor type boost
      const highDemandTypes = ['photographer', 'venue', 'catering'];
      if (highDemandTypes.includes(result.vendor.type.toLowerCase())) {
        boostFactor += 0.03;
      }

      // Verified wedding professional boost
      if (result.vendor.verified) {
        boostFactor += 0.08;
      }

      // Premium location boost for destination weddings
      const premiumLocations = [
        'napa',
        'hawaii',
        'charleston',
        "martha's vineyard",
      ];
      const location = result.vendor.location.city.toLowerCase();
      if (premiumLocations.some((premium) => location.includes(premium))) {
        boostFactor += 0.06;
      }

      return {
        ...result,
        searchMetadata: {
          ...result.searchMetadata,
          score: Math.min(result.searchMetadata.score * boostFactor, 1.0),
          weddingBoostFactor: boostFactor,
        },
      };
    });
  }

  // =====================================================================================
  // CONFIGURATION AND UTILITIES
  // =====================================================================================

  private initializeWeddingSeasons(): Record<string, number> {
    return {
      spring: 0.9, // March-May
      summer: 1.0, // June-August (peak)
      fall: 1.0, // September-November (peak)
      winter: 0.6, // December-February
    };
  }

  private initializeVendorTypeWeights(): Record<
    string,
    Record<string, number>
  > {
    return {
      photographer: {
        portfolio: 0.25,
        testimonials: 0.2,
        expertise: 0.15,
        specialization: 0.15,
        experience: 0.15,
        responsiveness: 0.1,
      },
      venue: {
        availability: 0.25,
        expertise: 0.2,
        testimonials: 0.15,
        value: 0.15,
        recognition: 0.15,
        seasonal: 0.1,
      },
      catering: {
        testimonials: 0.25,
        specialization: 0.2,
        expertise: 0.15,
        value: 0.15,
        experience: 0.15,
        portfolio: 0.1,
      },
    };
  }

  private getWeddingWeights(
    vendorType: string,
    context: WeddingContext,
  ): Record<string, number> {
    const baseWeights = {
      expertise: 0.15,
      seasonal: 0.08,
      portfolio: 0.12,
      testimonials: 0.15,
      specialization: 0.15,
      value: 0.1,
      availability: 0.1,
      recognition: 0.05,
      responsiveness: 0.05,
      experience: 0.05,
    };

    // Adjust weights based on vendor type
    const typeWeights = this.vendorTypeWeights[vendorType.toLowerCase()] || {};

    Object.keys(baseWeights).forEach((key) => {
      if (typeWeights[key]) {
        baseWeights[key] = typeWeights[key];
      }
    });

    return baseWeights;
  }

  private async enhanceResultsWithWeddingData(
    results: SearchResult[],
  ): Promise<SearchResult[]> {
    // Pre-fetch common wedding-specific data to avoid N+1 queries
    const vendorIds = results.map((r) => r.vendor.id);

    try {
      // Batch fetch wedding statistics
      const { data: weddingStats } = await this.supabase
        .from('supplier_wedding_stats')
        .select(
          'supplier_id, weddings_completed, avg_wedding_budget, specialization_tags',
        )
        .in('supplier_id', vendorIds);

      const statsMap = new Map(
        weddingStats?.map((stat) => [stat.supplier_id, stat]) || [],
      );

      // Enhanced results with wedding data
      return results.map((result) => ({
        ...result,
        weddingData: statsMap.get(result.vendor.id) || {},
      }));
    } catch (error) {
      console.error('Wedding data enhancement error:', error);
      return results;
    }
  }

  private calculateAverageBoost(
    original: SearchResult[],
    boosted: SearchResult[],
  ): number {
    if (original.length !== boosted.length || original.length === 0) return 0;

    const totalBoost = original.reduce((sum, originalResult, index) => {
      const boostedResult = boosted[index];
      const boost =
        boostedResult.searchMetadata.score -
        originalResult.searchMetadata.score;
      return sum + boost;
    }, 0);

    return totalBoost / original.length;
  }

  // =====================================================================================
  // WEDDING INDUSTRY INSIGHTS
  // =====================================================================================

  async generateWeddingInsights(
    results: SearchResult[],
    context: WeddingContext,
  ): Promise<any[]> {
    const insights = [];

    try {
      // Seasonal availability insights
      if (context.filters?.availability) {
        const seasonalInsight = await this.analyzeSeasonalAvailability(
          results,
          context,
        );
        if (seasonalInsight) insights.push(seasonalInsight);
      }

      // Budget optimization insights
      const budgetInsight = this.analyzeBudgetOptimization(results, context);
      if (budgetInsight) insights.push(budgetInsight);

      // Vendor mix recommendations
      const mixInsight = this.analyzeVendorMix(results);
      if (mixInsight) insights.push(mixInsight);

      return insights;
    } catch (error) {
      console.error('Wedding insights generation error:', error);
      return [];
    }
  }

  private async analyzeSeasonalAvailability(
    results: SearchResult[],
    context: WeddingContext,
  ): Promise<any | null> {
    if (!context.filters?.availability) return null;

    const weddingMonth =
      new Date(context.filters.availability.startDate).getMonth() + 1;
    const isPeakSeason = [5, 6, 9, 10].includes(weddingMonth);

    if (isPeakSeason) {
      const availableCount = results.filter(
        (r) => r.searchMetadata.weddingFactors?.availabilityScore > 0.7,
      ).length;

      if (availableCount < results.length * 0.3) {
        return {
          type: 'seasonal_warning',
          message: `Peak wedding season detected. Limited availability for ${new Date(context.filters.availability.startDate).toLocaleDateString()}.`,
          recommendation:
            'Consider booking soon or exploring nearby dates for better vendor availability.',
        };
      }
    }

    return null;
  }

  private analyzeBudgetOptimization(
    results: SearchResult[],
    context: WeddingContext,
  ): any | null {
    if (!context.filters?.priceRange) return null;

    const budgetRange = context.filters.priceRange;
    const budgetMid = (budgetRange.min + budgetRange.max) / 2;

    const affordableVendors = results.filter((result) => {
      if (result.services.length === 0) return false;
      const avgPrice =
        result.services.reduce(
          (sum, service) =>
            sum + (service.priceRange.min + service.priceRange.max) / 2,
          0,
        ) / result.services.length;
      return avgPrice <= budgetMid;
    }).length;

    if (affordableVendors < results.length * 0.4) {
      return {
        type: 'budget_insight',
        message: `Many vendors exceed your budget range of $${budgetRange.min}-$${budgetRange.max}.`,
        recommendation:
          'Consider adjusting your budget or exploring package deals for better value.',
      };
    }

    return null;
  }

  private analyzeVendorMix(results: SearchResult[]): any | null {
    const vendorTypes = results.reduce(
      (types, result) => {
        const type = result.vendor.type;
        types[type] = (types[type] || 0) + 1;
        return types;
      },
      {} as Record<string, number>,
    );

    const essentialTypes = ['photographer', 'venue', 'catering'];
    const missingEssentials = essentialTypes.filter(
      (type) => !vendorTypes[type],
    );

    if (missingEssentials.length > 0) {
      return {
        type: 'vendor_mix_recommendation',
        message: `Consider also searching for: ${missingEssentials.join(', ')}`,
        recommendation:
          'Complete wedding vendor lineup typically includes photographer, venue, and catering services.',
      };
    }

    return null;
  }
}
