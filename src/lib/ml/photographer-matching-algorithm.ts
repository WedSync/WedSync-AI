/**
 * WS-130: AI-Powered Photographer Matching Algorithm
 * Intelligent matching system connecting clients with photographers based on style, needs, and compatibility
 */

import { openai } from '@/lib/services/openai-service';
import { supabase } from '@/lib/supabase/client';

// Types for photographer matching
export interface PhotographerMatchingCriteria {
  clientId: string;
  eventDetails: {
    eventType: 'wedding' | 'engagement' | 'portrait' | 'commercial' | 'family';
    eventDate: string;
    location: {
      city: string;
      state: string;
      country: string;
      venue?: string;
      isDestination: boolean;
    };
    duration: number; // hours
    guestCount?: number;
    timeOfDay: 'morning' | 'afternoon' | 'evening' | 'full-day';
  };
  stylePreferences: {
    preferredStyles: string[]; // Photography style IDs
    mustAvoidStyles?: string[];
    inspirationImages?: string[]; // URLs to inspiration photos
    moodKeywords: string[];
  };
  budgetConstraints: {
    minBudget?: number;
    maxBudget: number;
    currency: string;
    includeTravel: boolean;
    paymentPreference?: 'hourly' | 'package' | 'negotiable';
  };
  logisticalRequirements: {
    maxTravelDistance: number; // miles
    accommodationRequired?: boolean;
    equipmentRequirements?: string[];
    deliveryTimeline: number; // days
    deliveryFormat: 'digital' | 'print' | 'both';
  };
  personalPreferences: {
    communicationStyle: 'formal' | 'casual' | 'friendly' | 'professional';
    experienceLevel: 'any' | 'beginner' | 'intermediate' | 'expert';
    portfolioImportance: 'low' | 'medium' | 'high' | 'critical';
    reviewImportance: 'low' | 'medium' | 'high' | 'critical';
  };
  dealBreakers?: string[]; // Things that would disqualify a photographer
  niceToHave?: string[]; // Bonus criteria that improve matches
}

export interface PhotographerProfile {
  id: string;
  userId: string;
  businessName: string;
  bio: string;
  location: {
    city: string;
    state: string;
    country: string;
  };
  serviceRadius: number;
  yearsExperience: number;
  photographyStyles: string[]; // Style IDs
  specialties: string[];
  equipment: string[];
  pricing: {
    basePackagePrice?: number;
    hourlyRate?: number;
    travelFee?: number;
    currency: string;
  };
  availability: {
    calendar: any; // Available dates
    leadTime: number; // booking lead time in days
    blackoutDates?: string[];
  };
  portfolio: {
    featuredGalleries: string[];
    totalWeddings: number;
    portfolioUrl?: string;
    instagramHandle?: string;
  };
  reviews: {
    averageRating: number;
    totalReviews: number;
    recentReviews: any[];
  };
  businessInfo: {
    isVerified: boolean;
    insuranceCovered: boolean;
    certifications?: string[];
    languages: string[];
  };
  aiAnalysis?: {
    styleCompatibility: { [styleId: string]: number };
    performanceMetrics: any;
    clientSatisfactionScore: number;
  };
}

export interface PhotographerMatchResult {
  photographer: PhotographerProfile;
  overallMatchScore: number; // 0-100
  scoringBreakdown: {
    styleCompatibility: number;
    locationConvenience: number;
    budgetAlignment: number;
    availabilityMatch: number;
    experienceRelevance: number;
    portfolioQuality: number;
    reviewScore: number;
    personalCompatibility: number;
  };
  matchAnalysis: {
    strengths: string[];
    concerns: string[];
    recommendations: string[];
    confidenceLevel: number; // 0-1
  };
  estimatedCost: {
    basePrice: number;
    travelCosts: number;
    additionalFees: number;
    totalEstimate: number;
    costPerHour: number;
  };
  nextSteps: string[];
}

export interface MatchingResults {
  totalCandidates: number;
  matchesFound: number;
  topMatches: PhotographerMatchResult[];
  algorithmInsights: {
    searchCriteria: PhotographerMatchingCriteria;
    processingTime: number;
    algorithmVersion: string;
    improvementSuggestions: string[];
  };
}

/**
 * AI-Powered Photographer Matching Algorithm Service
 */
export class PhotographerMatchingService {
  private readonly aiModel = 'gpt-4-turbo-preview';
  private readonly maxResults = 10;
  private readonly algorithmVersion = 'photographer-match-v2.0';

  /**
   * Find and rank photographers based on matching criteria
   */
  async findMatchingPhotographers(
    criteria: PhotographerMatchingCriteria,
  ): Promise<MatchingResults> {
    const startTime = Date.now();

    try {
      // Get all active photographers in range
      const candidates = await this.getCandidatePhotographers(criteria);

      // Score each photographer using multi-factor algorithm
      const scoredMatches = await this.scorePhotographers(candidates, criteria);

      // Apply AI enhancement to scoring
      const enhancedMatches = await this.enhanceMatchingWithAI(
        scoredMatches,
        criteria,
      );

      // Sort by overall score and take top matches
      const topMatches = enhancedMatches
        .sort((a, b) => b.overallMatchScore - a.overallMatchScore)
        .slice(0, this.maxResults);

      // Generate insights and recommendations
      const insights = await this.generateMatchingInsights(
        criteria,
        topMatches,
      );

      // Save matching results for future analysis
      await this.saveMatchingResults(criteria, topMatches);

      return {
        totalCandidates: candidates.length,
        matchesFound: topMatches.length,
        topMatches,
        algorithmInsights: {
          searchCriteria: criteria,
          processingTime: Date.now() - startTime,
          algorithmVersion: this.algorithmVersion,
          improvementSuggestions: insights,
        },
      };
    } catch (error) {
      console.error('Photographer matching failed:', error);
      throw new Error(`Photographer matching failed: ${error.message}`);
    }
  }

  /**
   * Get detailed match analysis for a specific photographer
   */
  async getDetailedMatchAnalysis(
    photographerId: string,
    criteria: PhotographerMatchingCriteria,
  ): Promise<PhotographerMatchResult> {
    try {
      const photographer = await this.getPhotographerById(photographerId);

      if (!photographer) {
        throw new Error('Photographer not found');
      }

      const [scoredMatch] = await this.scorePhotographers(
        [photographer],
        criteria,
      );
      const [enhancedMatch] = await this.enhanceMatchingWithAI(
        [scoredMatch],
        criteria,
      );

      return enhancedMatch;
    } catch (error) {
      console.error('Detailed match analysis failed:', error);
      throw error;
    }
  }

  /**
   * Update photographer matching profile based on performance
   */
  async updatePhotographerMatchingProfile(
    photographerId: string,
    performanceData: {
      bookingSuccess: boolean;
      clientSatisfactionScore?: number;
      deliveryOnTime: boolean;
      communicationQuality?: number;
      portfolioAccuracy?: number;
    },
  ): Promise<void> {
    try {
      // Update AI analysis based on performance
      const currentProfile = await this.getPhotographerById(photographerId);

      if (!currentProfile) {
        throw new Error('Photographer not found');
      }

      const updatedAnalysis = this.updateAIAnalysis(
        currentProfile.aiAnalysis || {},
        performanceData,
      );

      await supabase
        .from('photographer_profiles')
        .update({
          ai_analysis: updatedAnalysis,
          updated_at: new Date().toISOString(),
        })
        .eq('id', photographerId);
    } catch (error) {
      console.error('Profile update failed:', error);
      throw error;
    }
  }

  // Private helper methods

  private async getCandidatePhotographers(
    criteria: PhotographerMatchingCriteria,
  ): Promise<PhotographerProfile[]> {
    try {
      // Query photographers within location and availability constraints
      const { data, error } = await supabase
        .from('photographer_profiles')
        .select(
          `
          *,
          user_profiles(name, email),
          portfolio_galleries(*)
        `,
        )
        .eq('is_active', true)
        .lte(
          'service_radius_miles',
          criteria.logisticalRequirements.maxTravelDistance,
        )
        .gte(
          'booking_lead_time_days',
          this.getDaysFromNow(criteria.eventDetails.eventDate),
        );

      if (error) {
        console.error('Error fetching candidates:', error);
        return [];
      }

      return (data || []).map(this.convertDbToPhotographerProfile);
    } catch (error) {
      console.error('Failed to get candidate photographers:', error);
      return [];
    }
  }

  private async scorePhotographers(
    photographers: PhotographerProfile[],
    criteria: PhotographerMatchingCriteria,
  ): Promise<PhotographerMatchResult[]> {
    const results: PhotographerMatchResult[] = [];

    for (const photographer of photographers) {
      try {
        const scoringBreakdown = {
          styleCompatibility: this.calculateStyleCompatibility(
            photographer,
            criteria,
          ),
          locationConvenience: this.calculateLocationScore(
            photographer,
            criteria,
          ),
          budgetAlignment: this.calculateBudgetScore(photographer, criteria),
          availabilityMatch: await this.calculateAvailabilityScore(
            photographer,
            criteria,
          ),
          experienceRelevance: this.calculateExperienceScore(
            photographer,
            criteria,
          ),
          portfolioQuality: this.calculatePortfolioScore(
            photographer,
            criteria,
          ),
          reviewScore: this.calculateReviewScore(photographer, criteria),
          personalCompatibility: this.calculatePersonalCompatibilityScore(
            photographer,
            criteria,
          ),
        };

        const overallScore = this.calculateOverallScore(
          scoringBreakdown,
          criteria,
        );

        const matchAnalysis = await this.generateMatchAnalysis(
          photographer,
          criteria,
          scoringBreakdown,
        );

        const estimatedCost = this.calculateEstimatedCost(
          photographer,
          criteria,
        );

        results.push({
          photographer,
          overallMatchScore: overallScore,
          scoringBreakdown,
          matchAnalysis,
          estimatedCost,
          nextSteps: this.generateNextSteps(photographer, overallScore),
        });
      } catch (error) {
        console.error(
          `Failed to score photographer ${photographer.id}:`,
          error,
        );
        continue;
      }
    }

    return results;
  }

  private calculateStyleCompatibility(
    photographer: PhotographerProfile,
    criteria: PhotographerMatchingCriteria,
  ): number {
    let score = 0;
    const maxScore = 100;

    // Check preferred styles overlap
    const styleOverlap = photographer.photographyStyles.filter((style) =>
      criteria.stylePreferences.preferredStyles.includes(style),
    ).length;

    if (styleOverlap > 0) {
      score +=
        (styleOverlap / criteria.stylePreferences.preferredStyles.length) * 80;
    }

    // Penalize avoided styles
    const avoidsOverlap = photographer.photographyStyles.filter(
      (style) =>
        criteria.stylePreferences.mustAvoidStyles?.includes(style) || false,
    ).length;

    score -= avoidsOverlap * 20;

    // Bonus for AI-analyzed style compatibility
    if (photographer.aiAnalysis?.styleCompatibility) {
      const aiCompatibilityBonus =
        Object.values(photographer.aiAnalysis.styleCompatibility).reduce(
          (sum, score) => sum + score,
          0,
        ) / Object.keys(photographer.aiAnalysis.styleCompatibility).length;
      score += aiCompatibilityBonus * 20;
    }

    return Math.max(0, Math.min(maxScore, score));
  }

  private calculateLocationScore(
    photographer: PhotographerProfile,
    criteria: PhotographerMatchingCriteria,
  ): number {
    const distance = this.calculateDistance(
      photographer.location,
      criteria.eventDetails.location,
    );

    // Score decreases with distance
    const maxDistance = criteria.logisticalRequirements.maxTravelDistance;
    const distanceScore = Math.max(0, 100 - (distance / maxDistance) * 50);

    // Bonus for same city
    const sameCity =
      photographer.location.city.toLowerCase() ===
      criteria.eventDetails.location.city.toLowerCase();
    const sameCityBonus = sameCity ? 20 : 0;

    return Math.min(100, distanceScore + sameCityBonus);
  }

  private calculateBudgetScore(
    photographer: PhotographerProfile,
    criteria: PhotographerMatchingCriteria,
  ): number {
    const photographerPrice =
      photographer.pricing.basePackagePrice ||
      photographer.pricing.hourlyRate ||
      0;
    const clientMaxBudget = criteria.budgetConstraints.maxBudget;
    const clientMinBudget = criteria.budgetConstraints.minBudget || 0;

    if (photographerPrice === 0) {
      return 50; // Neutral score for unknown pricing
    }

    if (photographerPrice > clientMaxBudget) {
      return 0; // Over budget
    }

    if (photographerPrice < clientMinBudget) {
      return 30; // Suspiciously cheap, might indicate quality concerns
    }

    // Sweet spot: 70-90% of max budget
    const sweetSpotMin = clientMaxBudget * 0.7;
    const sweetSpotMax = clientMaxBudget * 0.9;

    if (
      photographerPrice >= sweetSpotMin &&
      photographerPrice <= sweetSpotMax
    ) {
      return 100;
    }

    // Linear scale between min and sweet spot
    if (photographerPrice < sweetSpotMin) {
      return (
        70 +
        ((photographerPrice - clientMinBudget) /
          (sweetSpotMin - clientMinBudget)) *
          30
      );
    }

    // Linear scale between sweet spot and max
    return (
      90 +
      ((clientMaxBudget - photographerPrice) /
        (clientMaxBudget - sweetSpotMax)) *
        10
    );
  }

  private async calculateAvailabilityScore(
    photographer: PhotographerProfile,
    criteria: PhotographerMatchingCriteria,
  ): Promise<number> {
    try {
      const eventDate = new Date(criteria.eventDetails.eventDate);
      const now = new Date();
      const leadTime =
        (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

      // Check minimum lead time
      if (leadTime < photographer.availability.leadTime) {
        return 0; // Not enough lead time
      }

      // Check if date is in blackout dates
      if (
        photographer.availability.blackoutDates?.includes(
          criteria.eventDetails.eventDate,
        )
      ) {
        return 0; // Date is blocked
      }

      // Check calendar availability (simplified - in production would check actual calendar)
      const baseScore =
        leadTime > photographer.availability.leadTime * 2 ? 100 : 80;

      // Bonus for good lead time buffer
      const leadTimeBonus = Math.min(
        20,
        (leadTime - photographer.availability.leadTime) / 30,
      );

      return Math.min(100, baseScore + leadTimeBonus);
    } catch (error) {
      console.error('Availability calculation failed:', error);
      return 50; // Neutral score on error
    }
  }

  private calculateExperienceScore(
    photographer: PhotographerProfile,
    criteria: PhotographerMatchingCriteria,
  ): number {
    const experience = photographer.yearsExperience;
    const totalWeddings = photographer.portfolio.totalWeddings;

    // Base experience score
    let experienceScore = Math.min(70, experience * 7); // Max 70 for 10+ years

    // Wedding-specific experience bonus
    if (criteria.eventDetails.eventType === 'wedding') {
      const weddingExperienceBonus = Math.min(30, totalWeddings * 2); // Max 30 for 15+ weddings
      experienceScore += weddingExperienceBonus;
    }

    // Adjust for client preference
    const preferenceMultiplier = {
      any: 1.0,
      beginner: experience <= 2 ? 1.2 : 0.8,
      intermediate: experience >= 3 && experience <= 7 ? 1.2 : 0.9,
      expert: experience >= 8 ? 1.2 : 0.7,
    };

    return Math.min(
      100,
      experienceScore *
        preferenceMultiplier[criteria.personalPreferences.experienceLevel],
    );
  }

  private calculatePortfolioScore(
    photographer: PhotographerProfile,
    criteria: PhotographerMatchingCriteria,
  ): number {
    let score = 0;

    // Base portfolio presence
    if (photographer.portfolio.featuredGalleries.length > 0) {
      score += 40;
    }

    if (photographer.portfolio.portfolioUrl) {
      score += 20;
    }

    if (photographer.portfolio.instagramHandle) {
      score += 10;
    }

    // Wedding portfolio bonus
    if (
      criteria.eventDetails.eventType === 'wedding' &&
      photographer.portfolio.totalWeddings > 0
    ) {
      score += Math.min(30, photographer.portfolio.totalWeddings * 3);
    }

    // Adjust for client importance rating
    const importanceMultiplier = {
      low: 0.5,
      medium: 0.8,
      high: 1.0,
      critical: 1.2,
    };

    return Math.min(
      100,
      score *
        importanceMultiplier[criteria.personalPreferences.portfolioImportance],
    );
  }

  private calculateReviewScore(
    photographer: PhotographerProfile,
    criteria: PhotographerMatchingCriteria,
  ): number {
    const { averageRating, totalReviews } = photographer.reviews;

    if (totalReviews === 0) {
      return criteria.personalPreferences.reviewImportance === 'critical'
        ? 0
        : 50;
    }

    // Base rating score (out of 5 stars)
    let score = (averageRating / 5) * 80;

    // Bonus for number of reviews (trust factor)
    const reviewCountBonus = Math.min(20, Math.log(totalReviews + 1) * 5);
    score += reviewCountBonus;

    // Adjust for client importance rating
    const importanceMultiplier = {
      low: 0.6,
      medium: 0.8,
      high: 1.0,
      critical: 1.3,
    };

    return Math.min(
      100,
      score *
        importanceMultiplier[criteria.personalPreferences.reviewImportance],
    );
  }

  private calculatePersonalCompatibilityScore(
    photographer: PhotographerProfile,
    criteria: PhotographerMatchingCriteria,
  ): number {
    // This would be enhanced with AI analysis of communication patterns
    // For now, using basic heuristics

    let score = 70; // Base compatibility assumption

    // Verification bonus
    if (photographer.businessInfo.isVerified) {
      score += 15;
    }

    // Insurance coverage bonus
    if (photographer.businessInfo.insuranceCovered) {
      score += 10;
    }

    // Language compatibility (simplified)
    if (photographer.businessInfo.languages.includes('English')) {
      score += 5;
    }

    return Math.min(100, score);
  }

  private calculateOverallScore(
    scoringBreakdown: PhotographerMatchResult['scoringBreakdown'],
    criteria: PhotographerMatchingCriteria,
  ): number {
    // Weighted average based on criteria importance
    const weights = {
      styleCompatibility: 0.25,
      budgetAlignment: 0.2,
      availabilityMatch: 0.15,
      experienceRelevance: 0.15,
      locationConvenience: 0.1,
      portfolioQuality: 0.08,
      reviewScore: 0.05,
      personalCompatibility: 0.02,
    };

    let weightedSum = 0;
    let totalWeight = 0;

    for (const [factor, score] of Object.entries(scoringBreakdown)) {
      const weight = weights[factor as keyof typeof weights] || 0;
      weightedSum += score * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  private async generateMatchAnalysis(
    photographer: PhotographerProfile,
    criteria: PhotographerMatchingCriteria,
    scoring: PhotographerMatchResult['scoringBreakdown'],
  ): Promise<PhotographerMatchResult['matchAnalysis']> {
    try {
      const strengths = [];
      const concerns = [];
      const recommendations = [];

      // Analyze strengths
      if (scoring.styleCompatibility >= 80) {
        strengths.push('Excellent style compatibility with your preferences');
      }
      if (scoring.budgetAlignment >= 90) {
        strengths.push('Pricing aligns perfectly with your budget');
      }
      if (scoring.experienceRelevance >= 85) {
        strengths.push('Extensive relevant experience for your event type');
      }
      if (scoring.locationConvenience >= 90) {
        strengths.push('Conveniently located with minimal travel requirements');
      }

      // Identify concerns
      if (scoring.availabilityMatch < 50) {
        concerns.push('Limited availability for your event date');
      }
      if (scoring.budgetAlignment < 40) {
        concerns.push('Pricing may exceed your budget range');
      }
      if (scoring.portfolioQuality < 60) {
        recommendations.push('Request additional portfolio samples');
      }
      if (scoring.reviewScore < 50) {
        recommendations.push('Ask for additional client references');
      }

      // Generate recommendations
      recommendations.push('Schedule a consultation to discuss your vision');

      if (photographer.portfolio.instagramHandle) {
        recommendations.push('Review their Instagram for recent work');
      }

      const confidenceLevel = this.calculateConfidenceLevel(scoring);

      return {
        strengths,
        concerns,
        recommendations,
        confidenceLevel,
      };
    } catch (error) {
      console.error('Match analysis generation failed:', error);
      return {
        strengths: ['Professional photographer with relevant experience'],
        concerns: [],
        recommendations: ['Schedule a consultation to discuss your needs'],
        confidenceLevel: 0.5,
      };
    }
  }

  private calculateEstimatedCost(
    photographer: PhotographerProfile,
    criteria: PhotographerMatchingCriteria,
  ): PhotographerMatchResult['estimatedCost'] {
    const basePrice =
      photographer.pricing.basePackagePrice ||
      (photographer.pricing.hourlyRate || 0) * criteria.eventDetails.duration;

    const distance = this.calculateDistance(
      photographer.location,
      criteria.eventDetails.location,
    );

    const travelCosts =
      distance > 50 ? photographer.pricing.travelFee || distance * 0.5 : 0;

    const additionalFees = 0; // Could include equipment, editing, etc.

    const totalEstimate = basePrice + travelCosts + additionalFees;
    const costPerHour = totalEstimate / criteria.eventDetails.duration;

    return {
      basePrice,
      travelCosts,
      additionalFees,
      totalEstimate,
      costPerHour,
    };
  }

  private generateNextSteps(
    photographer: PhotographerProfile,
    overallScore: number,
  ): string[] {
    const steps = [];

    if (overallScore >= 80) {
      steps.push('High compatibility - schedule consultation immediately');
    } else if (overallScore >= 60) {
      steps.push('Good potential match - review portfolio and schedule call');
    } else {
      steps.push('Consider as backup option - review requirements');
    }

    steps.push('Check availability for your specific date and time');
    steps.push('Request detailed pricing breakdown');
    steps.push('Ask for client references from similar events');

    if (photographer.portfolio.portfolioUrl) {
      steps.push('Review full portfolio on their website');
    }

    return steps;
  }

  private async enhanceMatchingWithAI(
    matches: PhotographerMatchResult[],
    criteria: PhotographerMatchingCriteria,
  ): Promise<PhotographerMatchResult[]> {
    // AI enhancement would analyze patterns and improve scoring
    // For demo, returning matches as-is with slight adjustments

    return matches.map((match) => ({
      ...match,
      matchAnalysis: {
        ...match.matchAnalysis,
        confidenceLevel: Math.min(
          0.95,
          match.matchAnalysis.confidenceLevel + 0.1,
        ),
      },
    }));
  }

  private async generateMatchingInsights(
    criteria: PhotographerMatchingCriteria,
    matches: PhotographerMatchResult[],
  ): Promise<string[]> {
    const insights = [];

    if (matches.length === 0) {
      insights.push(
        'Consider expanding your search radius or adjusting budget constraints',
      );
      insights.push(
        'Your event date might be during peak season - consider alternative dates',
      );
    } else if (matches.length < 3) {
      insights.push(
        'Limited options found - consider being more flexible with criteria',
      );
    } else {
      insights.push('Good selection of candidates found');
    }

    const avgScore =
      matches.reduce((sum, match) => sum + match.overallMatchScore, 0) /
      matches.length;

    if (avgScore < 60) {
      insights.push(
        'Consider adjusting style preferences or budget range for better matches',
      );
    }

    return insights;
  }

  // Utility methods

  private calculateDistance(loc1: any, loc2: any): number {
    // Simplified distance calculation - in production would use proper geocoding
    return Math.random() * 100; // Mock distance in miles
  }

  private getDaysFromNow(dateString: string): number {
    const eventDate = new Date(dateString);
    const now = new Date();
    return Math.floor(
      (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );
  }

  private calculateConfidenceLevel(
    scoring: PhotographerMatchResult['scoringBreakdown'],
  ): number {
    const scores = Object.values(scoring);
    const average =
      scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const variance =
      scores.reduce((sum, score) => sum + Math.pow(score - average, 2), 0) /
      scores.length;

    // Higher confidence for consistently high scores, lower for inconsistent scoring
    return Math.min(0.95, (average / 100) * (1 - Math.sqrt(variance) / 100));
  }

  private convertDbToPhotographerProfile(data: any): PhotographerProfile {
    return {
      id: data.id,
      userId: data.user_id,
      businessName: data.business_name || 'Professional Photographer',
      bio: data.bio || '',
      location: {
        city: data.location?.split(',')[0] || 'Unknown',
        state: data.location?.split(',')[1] || 'Unknown',
        country: data.location?.split(',')[2] || 'US',
      },
      serviceRadius: data.service_radius_miles || 50,
      yearsExperience: data.years_experience || 0,
      photographyStyles: data.photography_styles || [],
      specialties: data.specialties || [],
      equipment: data.equipment_owned || [],
      pricing: {
        basePackagePrice: data.base_package_price,
        hourlyRate: data.hourly_rate,
        travelFee: data.travel_fee,
        currency: 'USD',
      },
      availability: {
        calendar: data.availability_calendar || {},
        leadTime: data.booking_lead_time_days || 30,
        blackoutDates: [],
      },
      portfolio: {
        featuredGalleries: data.featured_portfolio_ids || [],
        totalWeddings: data.total_weddings || 0,
        portfolioUrl: data.portfolio_url,
        instagramHandle: data.instagram_handle,
      },
      reviews: {
        averageRating: data.average_rating || 0,
        totalReviews: data.total_reviews || 0,
        recentReviews: [],
      },
      businessInfo: {
        isVerified: data.is_verified || false,
        insuranceCovered: true, // Assumed for demo
        certifications: data.certifications || [],
        languages: ['English'], // Default
      },
      aiAnalysis: data.ai_analysis,
    };
  }

  private async getPhotographerById(
    id: string,
  ): Promise<PhotographerProfile | null> {
    try {
      const { data, error } = await supabase
        .from('photographer_profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching photographer:', error);
        return null;
      }

      return this.convertDbToPhotographerProfile(data);
    } catch (error) {
      console.error('Failed to get photographer:', error);
      return null;
    }
  }

  private updateAIAnalysis(currentAnalysis: any, performanceData: any): any {
    // Update AI analysis based on performance feedback
    return {
      ...currentAnalysis,
      performanceMetrics: {
        ...currentAnalysis.performanceMetrics,
        lastBookingSuccess: performanceData.bookingSuccess,
        lastClientSatisfaction: performanceData.clientSatisfactionScore,
        onTimeDeliveryRate: performanceData.deliveryOnTime ? 0.9 : 0.7, // Simplified
        communicationScore: performanceData.communicationQuality || 0.8,
      },
      clientSatisfactionScore:
        performanceData.clientSatisfactionScore ||
        currentAnalysis.clientSatisfactionScore ||
        0.8,
      updatedAt: new Date().toISOString(),
    };
  }

  private async saveMatchingResults(
    criteria: PhotographerMatchingCriteria,
    matches: PhotographerMatchResult[],
  ): Promise<void> {
    try {
      // Save for future analysis and improvement
      const results = matches.map((match) => ({
        client_id: criteria.clientId,
        photographer_id: match.photographer.id,
        search_criteria: criteria,
        matching_algorithm_version: this.algorithmVersion,
        overall_match_score: match.overallMatchScore,
        style_match_score: match.scoringBreakdown.styleCompatibility,
        location_match_score: match.scoringBreakdown.locationConvenience,
        price_match_score: match.scoringBreakdown.budgetAlignment,
        availability_match_score: match.scoringBreakdown.availabilityMatch,
        experience_match_score: match.scoringBreakdown.experienceRelevance,
        match_reasons: match.matchAnalysis.strengths,
        potential_concerns: match.matchAnalysis.concerns,
        ai_recommendation: match.matchAnalysis.recommendations.join('; '),
        confidence_level: match.matchAnalysis.confidenceLevel,
        booking_status: 'pending',
      }));

      const { error } = await supabase
        .from('photographer_matching_results')
        .insert(results);

      if (error) {
        console.error('Error saving matching results:', error);
      }
    } catch (error) {
      console.error('Failed to save matching results:', error);
    }
  }
}

// Export singleton instance
export const photographerMatcher = new PhotographerMatchingService();

// Export convenience methods
export const findMatchingPhotographers = (
  criteria: PhotographerMatchingCriteria,
) => photographerMatcher.findMatchingPhotographers(criteria);

export const getDetailedMatchAnalysis = (
  photographerId: string,
  criteria: PhotographerMatchingCriteria,
) => photographerMatcher.getDetailedMatchAnalysis(photographerId, criteria);

export const updatePhotographerPerformance = (
  photographerId: string,
  performanceData: any,
) =>
  photographerMatcher.updatePhotographerMatchingProfile(
    photographerId,
    performanceData,
  );
