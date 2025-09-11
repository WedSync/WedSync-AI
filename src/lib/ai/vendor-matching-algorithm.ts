import {
  Vendor,
  VendorCriteria,
  VendorOptimization,
  VendorMatch,
  VendorRecommendation,
  MatchReasoning,
  AlternativeVendor,
  CoupleProfile,
  PersonalityProfile,
  StylePreference,
  VendorAIConfig,
  CompatibilityScore,
  WeddingCrisis,
  OptimizationError,
} from './types';

interface VendorSearchRequest {
  budget: number;
  location: string;
  weddingDate: Date;
  preferences: StylePreference[];
  requirements: string[];
  couplePersonality: PersonalityProfile;
  weddingStyle: string;
  mustHaveFeatures: string[];
  dealBreakers: string[];
  priorityFactors?: string[];
}

interface VendorScore {
  vendor: Vendor;
  overallScore: number;
  componentScores: {
    styleMatch: number;
    personalityMatch: number;
    budgetFit: number;
    locationConvenience: number;
    availabilityMatch: number;
    portfolioQuality: number;
    reviewSentiment: number;
    experienceLevel: number;
    communicationStyle: number;
    valueForMoney: number;
  };
  reasoning: string[];
  confidenceLevel: number;
}

interface EmergencyVendorRequest {
  crisisType: string;
  location: string;
  date: Date;
  budget: number;
  requirements: string[];
  timeToWedding: number;
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
}

export class VendorMatchingAlgorithm {
  private config: VendorAIConfig;
  private vendorDatabase: Map<string, Vendor[]> = new Map();
  private personalityCompatibilityMatrix: Map<string, any> = new Map();
  private styleCompatibilityMatrix: Map<string, any> = new Map();
  private locationData: Map<string, any> = new Map();

  constructor(config: VendorAIConfig) {
    this.config = config;
    this.initializeCompatibilityMatrices();
    this.loadLocationData();
  }

  async findOptimalVendors(
    request: VendorSearchRequest,
  ): Promise<VendorOptimization> {
    try {
      // Validate the request
      this.validateVendorRequest(request);

      // Get available vendors based on basic criteria
      const availableVendors = await this.getAvailableVendors(request);

      // Score all available vendors
      const scoredVendors = await this.scoreVendors(availableVendors, request);

      // Apply filtering based on must-haves and deal-breakers
      const filteredVendors = this.applyFilters(scoredVendors, request);

      // Generate vendor matches with detailed reasoning
      const vendorMatches = this.generateVendorMatches(
        filteredVendors,
        request,
      );

      // Calculate optimization metrics
      const optimizationMetrics = this.calculateOptimizationMetrics(
        vendorMatches,
        request,
      );

      // Generate recommendations
      const recommendations = this.generateVendorRecommendations(
        vendorMatches,
        request,
      );

      // Find alternative vendors
      const alternatives = this.findAlternativeVendors(vendorMatches, request);

      return {
        matches: vendorMatches,
        totalSavings: optimizationMetrics.totalSavings,
        qualityScore: optimizationMetrics.qualityScore,
        compatibilityScore: optimizationMetrics.compatibilityScore,
        recommendations,
        alternatives,
      };
    } catch (error) {
      console.error('Vendor matching failed:', error);
      throw new OptimizationError(`Vendor matching failed: ${error.message}`);
    }
  }

  async findEmergencyAlternatives(
    request: EmergencyVendorRequest,
  ): Promise<Vendor[]> {
    try {
      // Get vendors with immediate availability
      const emergencyVendors = await this.getEmergencyVendors(request);

      // Score vendors for emergency suitability
      const scoredEmergencyVendors = this.scoreEmergencyVendors(
        emergencyVendors,
        request,
      );

      // Sort by emergency suitability score
      const sortedVendors = scoredEmergencyVendors.sort(
        (a, b) => b.emergencyScore - a.emergencyScore,
      );

      // Return top emergency alternatives
      return sortedVendors.slice(0, 10).map((sv) => sv.vendor);
    } catch (error) {
      console.error('Emergency vendor search failed:', error);
      return [];
    }
  }

  private initializeCompatibilityMatrices(): void {
    // Personality compatibility matrix (Big Five traits)
    this.personalityCompatibilityMatrix.set('photographer', {
      extraversionMatch: { low: 0.6, medium: 0.8, high: 0.9 },
      conscientiousnessMatch: { low: 0.4, medium: 0.7, high: 0.95 },
      creativityMatch: { low: 0.5, medium: 0.8, high: 1.0 },
      communicationStyle: {
        'detail-oriented': { conscientiousness: 0.9, openness: 0.7 },
        creative: { openness: 0.95, extraversion: 0.8 },
        professional: { conscientiousness: 0.9, agreeableness: 0.8 },
      },
    });

    this.personalityCompatibilityMatrix.set('venue_coordinator', {
      extraversionMatch: { low: 0.7, medium: 0.9, high: 0.95 },
      conscientiousnessMatch: { low: 0.3, medium: 0.8, high: 1.0 },
      organizationalSkills: { low: 0.4, medium: 0.8, high: 0.95 },
      communicationStyle: {
        organized: { conscientiousness: 0.95, extraversion: 0.8 },
        flexible: { openness: 0.8, agreeableness: 0.9 },
        'detail-focused': { conscientiousness: 0.9, neuroticism: -0.7 },
      },
    });

    // Style compatibility matrix
    this.styleCompatibilityMatrix.set('modern', {
      compatibleStyles: ['contemporary', 'minimalist', 'industrial', 'urban'],
      neutralStyles: ['classic', 'elegant'],
      conflictingStyles: ['rustic', 'vintage', 'bohemian'],
      keyElements: [
        'clean lines',
        'neutral colors',
        'geometric shapes',
        'technology integration',
      ],
    });

    this.styleCompatibilityMatrix.set('rustic', {
      compatibleStyles: ['country', 'barn', 'natural', 'outdoor'],
      neutralStyles: ['bohemian', 'vintage'],
      conflictingStyles: ['modern', 'formal', 'glamorous'],
      keyElements: [
        'natural materials',
        'warm colors',
        'handmade details',
        'outdoor elements',
      ],
    });

    this.styleCompatibilityMatrix.set('elegant', {
      compatibleStyles: ['classic', 'formal', 'traditional', 'sophisticated'],
      neutralStyles: ['modern', 'romantic'],
      conflictingStyles: ['casual', 'rustic', 'bohemian'],
      keyElements: [
        'fine materials',
        'formal arrangements',
        'refined details',
        'timeless appeal',
      ],
    });
  }

  private loadLocationData(): void {
    // UK regions with wedding vendor density and travel considerations
    this.locationData.set('london', {
      vendorDensity: 'very_high',
      avgTravelRadius: 25, // miles
      premiumMultiplier: 1.4,
      popularVenues: ['historic_venues', 'modern_spaces', 'hotels'],
      seasonalFactors: { summer: 1.3, winter: 0.9 },
      transportLinks: 'excellent',
    });

    this.locationData.set('birmingham', {
      vendorDensity: 'high',
      avgTravelRadius: 30,
      premiumMultiplier: 1.1,
      popularVenues: ['country_houses', 'hotels', 'industrial_venues'],
      seasonalFactors: { summer: 1.2, winter: 0.95 },
      transportLinks: 'good',
    });

    this.locationData.set('manchester', {
      vendorDensity: 'high',
      avgTravelRadius: 35,
      premiumMultiplier: 1.05,
      popularVenues: ['modern_venues', 'converted_spaces', 'hotels'],
      seasonalFactors: { summer: 1.15, winter: 1.0 },
      transportLinks: 'good',
    });

    this.locationData.set('countryside', {
      vendorDensity: 'medium',
      avgTravelRadius: 50,
      premiumMultiplier: 0.9,
      popularVenues: ['country_estates', 'barns', 'outdoor_spaces'],
      seasonalFactors: { summer: 1.4, winter: 0.7 },
      transportLinks: 'limited',
    });
  }

  private validateVendorRequest(request: VendorSearchRequest): void {
    if (!request.budget || request.budget <= 0) {
      throw new OptimizationError(
        'Valid budget is required for vendor matching',
      );
    }

    if (!request.location || request.location.trim().length === 0) {
      throw new OptimizationError('Location is required for vendor matching');
    }

    if (!request.weddingDate || request.weddingDate < new Date()) {
      throw new OptimizationError('Valid future wedding date is required');
    }

    if (!request.preferences || request.preferences.length === 0) {
      console.warn('No style preferences provided - will use generic matching');
    }
  }

  private async getAvailableVendors(
    request: VendorSearchRequest,
  ): Promise<Vendor[]> {
    // In a real implementation, this would query a database
    // For now, we'll generate mock vendors based on the request

    const mockVendors = this.generateMockVendors(request);

    // Filter by basic availability and location
    const availableVendors = mockVendors.filter((vendor) => {
      // Check availability
      const isAvailable = vendor.availability.some((date) =>
        this.isSameDay(date, request.weddingDate),
      );

      // Check location proximity
      const locationMatch = this.isLocationMatch(
        vendor.location,
        request.location,
      );

      // Check basic budget fit (within 150% of budget)
      const budgetFit = vendor.pricing.basePrice <= request.budget * 1.5;

      return isAvailable && locationMatch && budgetFit;
    });

    return availableVendors;
  }

  private generateMockVendors(request: VendorSearchRequest): Vendor[] {
    const vendors: Vendor[] = [];
    const vendorTypes = [
      'photographer',
      'videographer',
      'florist',
      'caterer',
      'venue',
      'dj',
    ];

    vendorTypes.forEach((type) => {
      // Generate 5-10 vendors per type
      for (let i = 1; i <= 8; i++) {
        vendors.push({
          id: `${type}_${i}`,
          name: `${this.capitalizeFirst(type)} ${i}`,
          type,
          location: this.generateRandomLocation(request.location),
          rating: 3.5 + Math.random() * 1.5,
          reviewCount: Math.floor(Math.random() * 200) + 20,
          verified: Math.random() > 0.2, // 80% verified
          availability: this.generateAvailabilityDates(request.weddingDate),
          pricing: this.generatePricingStructure(type, request.budget),
          portfolio: this.generatePortfolio(type),
          specialties: this.generateSpecialties(type, request.weddingStyle),
          workingStyle: this.generateWorkingStyle(),
          personalityMatch: Math.random(), // Will be calculated properly
          responseTime: Math.floor(Math.random() * 48) + 2, // 2-48 hours
          cancellationPolicy: this.generateCancellationPolicy(),
        });
      }
    });

    return vendors;
  }

  private async scoreVendors(
    vendors: Vendor[],
    request: VendorSearchRequest,
  ): Promise<VendorScore[]> {
    return Promise.all(
      vendors.map(async (vendor) => {
        const componentScores = {
          styleMatch: this.calculateStyleMatch(vendor, request),
          personalityMatch: this.calculatePersonalityMatch(vendor, request),
          budgetFit: this.calculateBudgetFit(vendor, request),
          locationConvenience: this.calculateLocationConvenience(
            vendor,
            request,
          ),
          availabilityMatch: this.calculateAvailabilityMatch(vendor, request),
          portfolioQuality: this.calculatePortfolioQuality(vendor),
          reviewSentiment: this.calculateReviewSentiment(vendor),
          experienceLevel: this.calculateExperienceLevel(vendor),
          communicationStyle: this.calculateCommunicationStyleMatch(
            vendor,
            request,
          ),
          valueForMoney: this.calculateValueForMoney(vendor, request),
        };

        // Calculate weighted overall score
        const weights = this.getVendorScoringWeights(request);
        const overallScore = Object.entries(componentScores).reduce(
          (sum, [key, score]) => sum + score * (weights[key] || 0.1),
          0,
        );

        const reasoning = this.generateScoringReasoning(
          vendor,
          componentScores,
          request,
        );
        const confidenceLevel = this.calculateConfidenceLevel(
          componentScores,
          vendor,
        );

        return {
          vendor,
          overallScore,
          componentScores,
          reasoning,
          confidenceLevel,
        };
      }),
    );
  }

  private calculateStyleMatch(
    vendor: Vendor,
    request: VendorSearchRequest,
  ): number {
    const requestStyleLower = request.weddingStyle.toLowerCase();
    const styleMatrix = this.styleCompatibilityMatrix.get(requestStyleLower);

    if (!styleMatrix) return 0.5; // Neutral if unknown style

    let styleScore = 0.5; // Start neutral

    // Check vendor specialties against style compatibility
    vendor.specialties.forEach((specialty) => {
      const specialtyLower = specialty.toLowerCase();

      if (
        styleMatrix.compatibleStyles.some(
          (style: string) =>
            specialtyLower.includes(style) || style.includes(specialtyLower),
        )
      ) {
        styleScore += 0.2;
      }

      if (
        styleMatrix.conflictingStyles.some(
          (style: string) =>
            specialtyLower.includes(style) || style.includes(specialtyLower),
        )
      ) {
        styleScore -= 0.15;
      }
    });

    // Check against specific style preferences
    request.preferences.forEach((preference) => {
      const matchingSpecialty = vendor.specialties.find((specialty) =>
        specialty.toLowerCase().includes(preference.style.toLowerCase()),
      );

      if (matchingSpecialty) {
        styleScore += (preference.importance / 10) * 0.3;
      }
    });

    return Math.max(0, Math.min(1, styleScore));
  }

  private calculatePersonalityMatch(
    vendor: Vendor,
    request: VendorSearchRequest,
  ): number {
    const couplePersonality = request.couplePersonality;
    const vendorTypeMatrix = this.personalityCompatibilityMatrix.get(
      vendor.type,
    );

    if (!vendorTypeMatrix) return 0.6; // Default reasonable match

    let personalityScore = 0.5;

    // Match extraversion levels
    const extraversionLevel = this.categorizePersonalityTrait(
      couplePersonality.extraversion,
    );
    if (vendorTypeMatrix.extraversionMatch) {
      personalityScore +=
        vendorTypeMatrix.extraversionMatch[extraversionLevel] * 0.2;
    }

    // Match conscientiousness (important for reliability)
    const conscientiousnessLevel = this.categorizePersonalityTrait(
      couplePersonality.conscientiousness,
    );
    if (vendorTypeMatrix.conscientiousnessMatch) {
      personalityScore +=
        vendorTypeMatrix.conscientiousnessMatch[conscientiousnessLevel] * 0.3;
    }

    // Match communication preferences
    if (vendorTypeMatrix.communicationStyle) {
      const vendorCommunicationScore = this.matchCommunicationStyle(
        vendor.workingStyle,
        couplePersonality,
        vendorTypeMatrix.communicationStyle,
      );
      personalityScore += vendorCommunicationScore * 0.25;
    }

    // Adjust for risk tolerance and decision-making style
    if (couplePersonality.riskTolerance === 'low' && vendor.rating > 4.5) {
      personalityScore += 0.1; // Bonus for highly rated vendors
    }

    return Math.max(0, Math.min(1, personalityScore));
  }

  private calculateBudgetFit(
    vendor: Vendor,
    request: VendorSearchRequest,
  ): number {
    const basePrice = vendor.pricing.basePrice;
    const budget = request.budget;

    if (basePrice <= budget * 0.7) {
      return 1.0; // Excellent fit - under 70% of budget
    } else if (basePrice <= budget) {
      return 0.8; // Good fit - within budget
    } else if (basePrice <= budget * 1.2) {
      return 0.6; // Acceptable fit - within 20% over budget
    } else if (basePrice <= budget * 1.5) {
      return 0.3; // Poor fit - significantly over budget
    } else {
      return 0.1; // Very poor fit - way over budget
    }
  }

  private calculateLocationConvenience(
    vendor: Vendor,
    request: VendorSearchRequest,
  ): number {
    // Mock distance calculation (in real implementation, use actual geocoding)
    const distance = this.calculateDistance(vendor.location, request.location);
    const locationData = this.locationData.get(
      request.location.toLowerCase(),
    ) || { avgTravelRadius: 30 };

    if (distance <= locationData.avgTravelRadius * 0.5) {
      return 1.0; // Very convenient
    } else if (distance <= locationData.avgTravelRadius) {
      return 0.8; // Convenient
    } else if (distance <= locationData.avgTravelRadius * 1.5) {
      return 0.6; // Acceptable
    } else if (distance <= locationData.avgTravelRadius * 2) {
      return 0.4; // Inconvenient
    } else {
      return 0.2; // Very inconvenient
    }
  }

  private calculateAvailabilityMatch(
    vendor: Vendor,
    request: VendorSearchRequest,
  ): number {
    // Check if vendor is available on the exact date
    const exactMatch = vendor.availability.some((date) =>
      this.isSameDay(date, request.weddingDate),
    );

    if (exactMatch) {
      return 1.0;
    }

    // Check availability within 2 weeks of the date
    const nearMatch = vendor.availability.some((date) => {
      const diff = Math.abs(date.getTime() - request.weddingDate.getTime());
      return diff <= 14 * 24 * 60 * 60 * 1000; // 14 days in milliseconds
    });

    if (nearMatch) {
      return 0.3; // Some flexibility possible
    }

    return 0.0; // No availability match
  }

  private calculatePortfolioQuality(vendor: Vendor): number {
    // Mock portfolio quality calculation
    // In real implementation, this would analyze actual portfolio images/content

    let qualityScore = 0.5;

    // Factor in portfolio size
    if (vendor.portfolio.length > 20) qualityScore += 0.2;
    else if (vendor.portfolio.length > 10) qualityScore += 0.1;

    // Factor in vendor rating as proxy for quality
    if (vendor.rating > 4.5) qualityScore += 0.3;
    else if (vendor.rating > 4.0) qualityScore += 0.2;
    else if (vendor.rating > 3.5) qualityScore += 0.1;

    // Factor in verification status
    if (vendor.verified) qualityScore += 0.1;

    return Math.max(0, Math.min(1, qualityScore));
  }

  private calculateReviewSentiment(vendor: Vendor): number {
    // Mock review sentiment based on rating and review count
    const ratingScore = (vendor.rating - 1) / 4; // Normalize 1-5 rating to 0-1

    // Boost score for vendors with many reviews (more reliable)
    let sentimentScore = ratingScore;
    if (vendor.reviewCount > 100) sentimentScore += 0.1;
    else if (vendor.reviewCount > 50) sentimentScore += 0.05;

    return Math.max(0, Math.min(1, sentimentScore));
  }

  private calculateExperienceLevel(vendor: Vendor): number {
    // Mock experience calculation based on review count and rating
    let experienceScore = 0.3; // Base score

    // Factor in review count as proxy for experience
    if (vendor.reviewCount > 200) experienceScore += 0.4;
    else if (vendor.reviewCount > 100) experienceScore += 0.3;
    else if (vendor.reviewCount > 50) experienceScore += 0.2;
    else if (vendor.reviewCount > 20) experienceScore += 0.1;

    // Factor in consistent high rating
    if (vendor.rating > 4.5 && vendor.reviewCount > 50) experienceScore += 0.2;

    // Factor in verification
    if (vendor.verified) experienceScore += 0.1;

    return Math.max(0, Math.min(1, experienceScore));
  }

  private calculateCommunicationStyleMatch(
    vendor: Vendor,
    request: VendorSearchRequest,
  ): number {
    // Mock communication style matching
    // In real implementation, this would analyze past communication patterns

    let communicationScore = 0.5;

    // Fast response time is generally good
    if (vendor.responseTime <= 4) communicationScore += 0.3;
    else if (vendor.responseTime <= 12) communicationScore += 0.2;
    else if (vendor.responseTime <= 24) communicationScore += 0.1;

    // Match working style with couple preferences
    const coupleStyle = request.couplePersonality.planningStyle;
    const vendorStyles = vendor.workingStyle;

    if (coupleStyle === 'detailed' && vendorStyles.includes('organized')) {
      communicationScore += 0.2;
    }
    if (coupleStyle === 'flexible' && vendorStyles.includes('adaptable')) {
      communicationScore += 0.2;
    }

    return Math.max(0, Math.min(1, communicationScore));
  }

  private calculateValueForMoney(
    vendor: Vendor,
    request: VendorSearchRequest,
  ): number {
    // Calculate value based on price vs. quality/rating
    const priceRatio = vendor.pricing.basePrice / request.budget;
    const qualityRatio = vendor.rating / 5;

    // Good value is high quality at reasonable price
    let valueScore = qualityRatio / Math.max(priceRatio, 0.1);

    // Normalize to 0-1 scale
    valueScore = Math.min(valueScore, 1);

    // Bonus for packages and discounts
    if (vendor.pricing.packages.length > 2) valueScore += 0.1;
    if (vendor.pricing.discounts.length > 0) valueScore += 0.1;

    return Math.max(0, Math.min(1, valueScore));
  }

  private applyFilters(
    scoredVendors: VendorScore[],
    request: VendorSearchRequest,
  ): VendorScore[] {
    return scoredVendors.filter((sv) => {
      // Apply must-have filters
      if (request.mustHaveFeatures.length > 0) {
        const hasMustHaves = request.mustHaveFeatures.every(
          (feature) =>
            sv.vendor.specialties.some((specialty) =>
              specialty.toLowerCase().includes(feature.toLowerCase()),
            ) ||
            sv.vendor.workingStyle.some((style) =>
              style.toLowerCase().includes(feature.toLowerCase()),
            ),
        );
        if (!hasMustHaves) return false;
      }

      // Apply deal-breaker filters
      if (request.dealBreakers.length > 0) {
        const hasDealbreakerss = request.dealBreakers.some(
          (breaker) =>
            sv.vendor.specialties.some((specialty) =>
              specialty.toLowerCase().includes(breaker.toLowerCase()),
            ) ||
            sv.vendor.workingStyle.some((style) =>
              style.toLowerCase().includes(breaker.toLowerCase()),
            ),
        );
        if (hasDealbreakerss) return false;
      }

      // Filter by minimum score threshold
      return sv.overallScore > 0.3;
    });
  }

  private generateVendorMatches(
    scoredVendors: VendorScore[],
    request: VendorSearchRequest,
  ): VendorMatch[] {
    // Sort by overall score and take top matches
    const sortedVendors = scoredVendors.sort(
      (a, b) => b.overallScore - a.overallScore,
    );
    const topVendors = sortedVendors.slice(0, 15); // Top 15 vendors

    return topVendors.map((sv) => {
      const reasoning: MatchReasoning = {
        styleMatch: sv.componentScores.styleMatch,
        personalityMatch: sv.componentScores.personalityMatch,
        budgetFit: sv.componentScores.budgetFit,
        locationConvenience: sv.componentScores.locationConvenience,
        experienceLevel: sv.componentScores.experienceLevel,
        portfolioAlignment: sv.componentScores.portfolioQuality,
        communicationStyle: sv.componentScores.communicationStyle,
      };

      const potentialSavings = Math.max(
        0,
        request.budget - sv.vendor.pricing.basePrice,
      );
      const riskFactors = this.identifyVendorRisks(
        sv.vendor,
        sv.componentScores,
      );

      return {
        vendor: sv.vendor,
        compatibilityScore: sv.overallScore,
        costEfficiency: sv.componentScores.valueForMoney,
        qualityScore:
          (sv.componentScores.portfolioQuality +
            sv.componentScores.reviewSentiment) /
          2,
        availabilityMatch: sv.componentScores.availabilityMatch,
        explanations: sv.reasoning,
        reasoning,
        potentialSavings,
        riskFactors,
      };
    });
  }

  private calculateOptimizationMetrics(
    matches: VendorMatch[],
    request: VendorSearchRequest,
  ): any {
    const totalSavings = matches.reduce(
      (sum, match) => sum + match.potentialSavings,
      0,
    );
    const avgQuality =
      matches.reduce((sum, match) => sum + match.qualityScore, 0) /
      matches.length;
    const avgCompatibility =
      matches.reduce((sum, match) => sum + match.compatibilityScore, 0) /
      matches.length;

    return {
      totalSavings,
      qualityScore: avgQuality,
      compatibilityScore: avgCompatibility,
    };
  }

  private generateVendorRecommendations(
    matches: VendorMatch[],
    request: VendorSearchRequest,
  ): VendorRecommendation[] {
    const recommendations: VendorRecommendation[] = [];

    // Top recommendation
    if (matches.length > 0) {
      const topMatch = matches[0];
      recommendations.push({
        vendorId: topMatch.vendor.id,
        action: 'hire',
        reasoning: `Top match with ${(topMatch.compatibilityScore * 100).toFixed(0)}% compatibility`,
        confidence: topMatch.compatibilityScore,
        alternatives: matches.slice(1, 4).map((m) => m.vendor.id),
        negotiationTips: this.generateNegotiationTips(topMatch.vendor),
      });
    }

    // High-value recommendations
    const highValueMatches = matches
      .filter((m) => m.costEfficiency > 0.8)
      .slice(0, 3);
    highValueMatches.forEach((match) => {
      recommendations.push({
        vendorId: match.vendor.id,
        action: 'consider',
        reasoning: `Excellent value for money with high quality`,
        confidence: match.costEfficiency,
        alternatives: [],
        negotiationTips: this.generateNegotiationTips(match.vendor),
      });
    });

    return recommendations;
  }

  private findAlternativeVendors(
    matches: VendorMatch[],
    request: VendorSearchRequest,
  ): AlternativeVendor[] {
    // Find vendors that didn't make the top matches but have specific strengths
    return matches.slice(10).map((match) => ({
      vendor: match.vendor,
      reason: this.getAlternativeReason(match),
      confidence: match.compatibilityScore,
      costImpact: match.vendor.pricing.basePrice - request.budget,
      availabilityMatch: match.availabilityMatch,
    }));
  }

  // Emergency vendor methods

  private async getEmergencyVendors(
    request: EmergencyVendorRequest,
  ): Promise<any[]> {
    // Mock emergency vendor search
    const mockEmergencyVendors = this.generateMockVendors({
      budget: request.budget,
      location: request.location,
      weddingDate: request.date,
      preferences: [],
      requirements: request.requirements,
      couplePersonality: {} as PersonalityProfile,
      weddingStyle: 'any',
      mustHaveFeatures: request.requirements,
      dealBreakers: [],
    });

    // Filter for emergency availability and add emergency scoring
    return mockEmergencyVendors
      .filter((vendor) => vendor.verified && vendor.rating > 3.5)
      .map((vendor) => ({
        vendor,
        emergencyScore: this.calculateEmergencyScore(vendor, request),
      }));
  }

  private scoreEmergencyVendors(
    vendors: any[],
    request: EmergencyVendorRequest,
  ): any[] {
    return vendors.map((vendorData) => ({
      ...vendorData,
      emergencyScore: this.calculateEmergencyScore(vendorData.vendor, request),
    }));
  }

  private calculateEmergencyScore(
    vendor: Vendor,
    request: EmergencyVendorRequest,
  ): number {
    let score = 0;

    // Immediate availability (most important)
    if (vendor.responseTime <= 2) score += 0.4;
    else if (vendor.responseTime <= 6) score += 0.3;
    else if (vendor.responseTime <= 12) score += 0.2;

    // Location proximity
    const distance = this.calculateDistance(vendor.location, request.location);
    if (distance <= 10) score += 0.3;
    else if (distance <= 25) score += 0.2;
    else if (distance <= 50) score += 0.1;

    // Reliability (rating and reviews)
    if (vendor.rating > 4.5) score += 0.2;
    else if (vendor.rating > 4.0) score += 0.15;
    else if (vendor.rating > 3.5) score += 0.1;

    // Experience with crisis situations (mock)
    if (
      vendor.specialties.includes('emergency') ||
      vendor.specialties.includes('last-minute')
    ) {
      score += 0.1;
    }

    return Math.min(score, 1);
  }

  // Helper methods

  private getVendorScoringWeights(request: VendorSearchRequest): {
    [key: string]: number;
  } {
    const weights = {
      styleMatch: 0.15,
      personalityMatch: this.config.personalityWeighting,
      budgetFit: 0.2,
      locationConvenience: 0.1,
      availabilityMatch: 0.15,
      portfolioQuality: 0.1,
      reviewSentiment: 0.1,
      experienceLevel: 0.08,
      communicationStyle: 0.07,
      valueForMoney: 0.05,
    };

    // Adjust weights based on priority factors
    if (request.priorityFactors) {
      request.priorityFactors.forEach((factor) => {
        if (weights[factor]) {
          weights[factor] *= 1.5; // Increase weight by 50%
        }
      });
    }

    // Normalize weights
    const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
    Object.keys(weights).forEach((key) => {
      weights[key] /= totalWeight;
    });

    return weights;
  }

  private generateScoringReasoning(
    vendor: Vendor,
    scores: any,
    request: VendorSearchRequest,
  ): string[] {
    const reasoning = [];

    if (scores.styleMatch > 0.8) {
      reasoning.push(
        `Excellent style match for ${request.weddingStyle} wedding`,
      );
    } else if (scores.styleMatch < 0.4) {
      reasoning.push(
        `Limited style compatibility with ${request.weddingStyle} theme`,
      );
    }

    if (scores.budgetFit > 0.8) {
      reasoning.push(`Well within budget at £${vendor.pricing.basePrice}`);
    } else if (scores.budgetFit < 0.5) {
      reasoning.push(`Above ideal budget range`);
    }

    if (scores.personalityMatch > 0.8) {
      reasoning.push(`Strong personality and communication match`);
    }

    if (scores.locationConvenience > 0.8) {
      reasoning.push(`Conveniently located for your wedding`);
    } else if (scores.locationConvenience < 0.4) {
      reasoning.push(`May require additional travel considerations`);
    }

    if (vendor.rating > 4.5 && vendor.reviewCount > 50) {
      reasoning.push(`Highly rated with extensive positive reviews`);
    }

    return reasoning;
  }

  private calculateConfidenceLevel(scores: any, vendor: Vendor): number {
    // Confidence based on data quality and vendor verification
    let confidence = 0.5;

    if (vendor.verified) confidence += 0.2;
    if (vendor.reviewCount > 50) confidence += 0.15;
    if (vendor.portfolio.length > 10) confidence += 0.1;
    if (vendor.responseTime < 12) confidence += 0.05;

    return Math.min(confidence, 1);
  }

  private identifyVendorRisks(vendor: Vendor, scores: any): string[] {
    const risks = [];

    if (scores.availabilityMatch < 0.9) {
      risks.push('Limited availability - book quickly');
    }

    if (scores.budgetFit < 0.6) {
      risks.push('Above budget - negotiate or consider alternatives');
    }

    if (vendor.reviewCount < 20) {
      risks.push('Limited review history - request additional references');
    }

    if (scores.locationConvenience < 0.5) {
      risks.push('Travel distance may affect logistics and costs');
    }

    if (vendor.cancellationPolicy.includes('non-refundable')) {
      risks.push('Strict cancellation policy');
    }

    return risks;
  }

  private generateNegotiationTips(vendor: Vendor): string[] {
    const tips = [];

    if (vendor.pricing.packages.length > 1) {
      tips.push('Ask about customizing package inclusions');
    }

    if (vendor.pricing.discounts.length > 0) {
      tips.push('Inquire about available discounts and promotions');
    }

    tips.push('Discuss payment schedule options');
    tips.push('Request to see additional portfolio samples');

    if (vendor.responseTime > 24) {
      tips.push('Be patient with response times - may indicate high demand');
    }

    return tips;
  }

  private getAlternativeReason(match: VendorMatch): string {
    if (match.costEfficiency > 0.8) return 'Excellent value for money';
    if (match.qualityScore > 0.9) return 'Premium quality option';
    if (match.reasoning.locationConvenience > 0.9)
      return 'Most convenient location';
    if (match.reasoning.personalityMatch > 0.9)
      return 'Perfect personality match';
    return 'Strong overall compatibility';
  }

  // Utility methods

  private categorizePersonalityTrait(value: number): 'low' | 'medium' | 'high' {
    if (value < 0.33) return 'low';
    if (value < 0.66) return 'medium';
    return 'high';
  }

  private matchCommunicationStyle(
    vendorStyle: string[],
    couplePersonality: PersonalityProfile,
    matrix: any,
  ): number {
    let score = 0;
    vendorStyle.forEach((style) => {
      if (matrix[style]) {
        Object.entries(matrix[style]).forEach(
          ([trait, weight]: [string, any]) => {
            const traitValue = (couplePersonality as any)[trait];
            if (typeof traitValue === 'number') {
              score += traitValue * weight * 0.1;
            }
          },
        );
      }
    });
    return Math.max(0, Math.min(score, 1));
  }

  private isSameDay(date1: Date, date2: Date): boolean {
    return date1.toDateString() === date2.toDateString();
  }

  private isLocationMatch(
    vendorLocation: string,
    requestLocation: string,
  ): boolean {
    // Simple location matching - in real implementation would use geocoding
    const vendorLower = vendorLocation.toLowerCase();
    const requestLower = requestLocation.toLowerCase();

    return (
      vendorLower.includes(requestLower) ||
      requestLower.includes(vendorLower) ||
      this.calculateDistance(vendorLocation, requestLocation) <= 50
    );
  }

  private calculateDistance(location1: string, location2: string): number {
    // Mock distance calculation - in real implementation would use actual geocoding
    if (location1.toLowerCase() === location2.toLowerCase()) return 0;

    // Random distance between 5-100 miles
    return Math.floor(Math.random() * 95) + 5;
  }

  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  private generateRandomLocation(baseLocation: string): string {
    const variations = ['Central', 'North', 'South', 'East', 'West'];
    const random = variations[Math.floor(Math.random() * variations.length)];
    return `${random} ${baseLocation}`;
  }

  private generateAvailabilityDates(weddingDate: Date): Date[] {
    const dates = [];
    const baseDate = new Date(weddingDate);

    // Generate some available dates around the wedding date
    for (let i = -30; i <= 30; i += 7) {
      // Weekly slots
      if (Math.random() > 0.3) {
        // 70% chance of availability
        dates.push(new Date(baseDate.getTime() + i * 24 * 60 * 60 * 1000));
      }
    }

    return dates;
  }

  private generatePricingStructure(type: string, budget: number): any {
    const basePrices: { [key: string]: number } = {
      photographer: budget * 0.15,
      videographer: budget * 0.12,
      florist: budget * 0.08,
      caterer: budget * 0.35,
      venue: budget * 0.25,
      dj: budget * 0.05,
    };

    const basePrice = basePrices[type] || budget * 0.1;

    return {
      basePrice: basePrice + (Math.random() - 0.5) * basePrice * 0.4, // ±20% variation
      packages: [
        {
          name: 'Basic',
          price: basePrice * 0.8,
          description: 'Basic package',
          includes: ['Standard service'],
          duration: 4,
        },
        {
          name: 'Premium',
          price: basePrice,
          description: 'Premium package',
          includes: ['Enhanced service', 'Extras'],
          duration: 6,
        },
        {
          name: 'Luxury',
          price: basePrice * 1.3,
          description: 'Luxury package',
          includes: ['Premium service', 'All extras'],
          duration: 8,
        },
      ],
      additionalServices: [],
      discounts:
        Math.random() > 0.7
          ? [
              {
                type: 'early_booking' as const,
                amount: 0.1,
                description: '10% early booking discount',
                conditions: [],
              },
            ]
          : [],
      paymentTerms: 'Standard terms',
    };
  }

  private generatePortfolio(type: string): string[] {
    const portfolioSize = Math.floor(Math.random() * 20) + 5;
    return Array.from(
      { length: portfolioSize },
      (_, i) => `${type}_portfolio_${i + 1}`,
    );
  }

  private generateSpecialties(type: string, weddingStyle: string): string[] {
    const typeSpecialties: { [key: string]: string[] } = {
      photographer: [
        'portrait',
        'candid',
        'artistic',
        'traditional',
        'modern',
        'documentary',
      ],
      videographer: [
        'cinematic',
        'documentary',
        'highlight reels',
        'full ceremony',
      ],
      florist: [
        'bridal bouquets',
        'ceremony arrangements',
        'reception centerpieces',
      ],
      caterer: [
        'fine dining',
        'buffet service',
        'dietary restrictions',
        'cocktail service',
      ],
      venue: ['indoor ceremonies', 'outdoor receptions', 'intimate gatherings'],
      dj: ['wedding music', 'ceremony sound', 'dance music', 'announcements'],
    };

    const baseSpecialties = typeSpecialties[type] || [];
    const randomSpecialties = baseSpecialties.filter(() => Math.random() > 0.4);

    // Add wedding style as specialty sometimes
    if (Math.random() > 0.5) {
      randomSpecialties.push(weddingStyle);
    }

    return randomSpecialties;
  }

  private generateWorkingStyle(): string[] {
    const styles = [
      'professional',
      'creative',
      'organized',
      'flexible',
      'detail-oriented',
      'collaborative',
    ];
    return styles.filter(() => Math.random() > 0.5);
  }

  private generateCancellationPolicy(): string {
    const policies = [
      'Flexible cancellation up to 30 days',
      'Standard cancellation terms',
      'Non-refundable deposit required',
      '48-hour cancellation notice required',
    ];
    return policies[Math.floor(Math.random() * policies.length)];
  }
}

export { VendorMatchingAlgorithm };
