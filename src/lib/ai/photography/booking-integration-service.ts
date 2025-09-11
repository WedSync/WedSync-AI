/**
 * WS-130: Photography Booking Integration Service
 * Integrates AI photography features with the booking system
 */

import {
  photographerMatcher,
  PhotographerMatchingService,
} from '@/lib/ml/photographer-matching-algorithm';
import { moodBoardService } from './mood-board-service';
import { colorHarmonyAnalyzer } from './color-harmony-analyzer';
import { supabase } from '@/lib/supabase/client';
import type { MoodBoardPhoto } from '@/components/photography/AIMoodBoardGenerator';

export interface BookingIntegrationData {
  clientId: string;
  photographerId: string;
  bookingId: string;
  weddingDetails: {
    date: string;
    venue: string;
    theme: string;
    guestCount: number;
    duration: number;
  };
  stylePreferences: {
    moodBoard?: MoodBoardPhoto[];
    inspirationImages: string[];
    preferredStyles: string[];
    colorPalette: string[];
  };
}

export interface PhotographerRecommendation {
  photographer: any;
  matchScore: number;
  reasons: string[];
  portfolioSamples: string[];
  estimatedCost: {
    basePrice: number;
    totalEstimate: number;
  };
  availabilityStatus: 'available' | 'limited' | 'unavailable';
}

export interface BookingOptimization {
  recommendedPhotographers: PhotographerRecommendation[];
  styleAnalysis: {
    dominantTheme: string;
    colorHarmony: number;
    consistencyScore: number;
  };
  pricingInsights: {
    marketAverage: number;
    recommendedBudget: number;
    valueOpportunities: string[];
  };
  timelineRecommendations: {
    idealBookingWindow: string;
    seasonalFactors: string[];
    availabilityTrends: string[];
  };
}

/**
 * Photography Booking Integration Service
 * Connects AI photography analysis with booking workflows
 */
export class BookingIntegrationService {
  private photographerMatchingService: PhotographerMatchingService;

  constructor() {
    this.photographerMatchingService = new PhotographerMatchingService();
  }

  /**
   * Get AI-powered photographer recommendations based on client preferences
   */
  async getPhotographerRecommendations(
    integrationData: BookingIntegrationData,
  ): Promise<PhotographerRecommendation[]> {
    try {
      console.log(
        `Getting photographer recommendations for client ${integrationData.clientId}`,
      );

      // Analyze client's style preferences
      const styleAnalysis =
        await this.analyzeClientStylePreferences(integrationData);

      // Create matching criteria
      const matchingCriteria = this.buildMatchingCriteria(
        integrationData,
        styleAnalysis,
      );

      // Find matching photographers
      const matchingResults =
        await this.photographerMatchingService.findMatchingPhotographers(
          matchingCriteria,
        );

      // Convert to booking recommendations
      const recommendations = await Promise.all(
        matchingResults.topMatches.map((match) =>
          this.convertToBookingRecommendation(match, integrationData),
        ),
      );

      // Sort by match score and availability
      return recommendations.sort((a, b) => {
        if (
          a.availabilityStatus === 'available' &&
          b.availabilityStatus !== 'available'
        )
          return -1;
        if (
          b.availabilityStatus === 'available' &&
          a.availabilityStatus !== 'available'
        )
          return 1;
        return b.matchScore - a.matchScore;
      });
    } catch (error) {
      console.error('Error getting photographer recommendations:', error);
      throw new Error(`Failed to get recommendations: ${error}`);
    }
  }

  /**
   * Optimize booking based on AI insights
   */
  async optimizeBooking(
    integrationData: BookingIntegrationData,
  ): Promise<BookingOptimization> {
    try {
      // Get photographer recommendations
      const recommendations =
        await this.getPhotographerRecommendations(integrationData);

      // Analyze style preferences
      const styleAnalysis = await this.analyzeBookingStyle(integrationData);

      // Get pricing insights
      const pricingInsights = await this.analyzePricingMarket(integrationData);

      // Generate timeline recommendations
      const timelineRecommendations =
        await this.getTimelineRecommendations(integrationData);

      return {
        recommendedPhotographers: recommendations.slice(0, 5),
        styleAnalysis,
        pricingInsights,
        timelineRecommendations,
      };
    } catch (error) {
      console.error('Error optimizing booking:', error);
      throw new Error(`Failed to optimize booking: ${error}`);
    }
  }

  /**
   * Create mood board from client preferences and photographer portfolio
   */
  async createIntegratedMoodBoard(
    clientPreferences: BookingIntegrationData['stylePreferences'],
    photographerId: string,
  ): Promise<MoodBoardPhoto[]> {
    try {
      // Get photographer's portfolio samples
      const photographerPortfolio =
        await this.getPhotographerPortfolio(photographerId);

      // Combine client inspiration with photographer work
      const combinedPhotos: MoodBoardPhoto[] = [];

      // Add client inspiration images
      clientPreferences.inspirationImages.forEach((url, index) => {
        combinedPhotos.push({
          id: `client_inspiration_${index}`,
          url,
          position: { x: 0, y: 0 },
          size: { width: 200, height: 200 },
          rotation: 0,
          metadata: { tags: ['client_inspiration'] },
        });
      });

      // Add photographer portfolio samples
      photographerPortfolio.slice(0, 6).forEach((url, index) => {
        combinedPhotos.push({
          id: `photographer_work_${index}`,
          url,
          position: { x: 0, y: 0 },
          size: { width: 200, height: 200 },
          rotation: 0,
          metadata: {
            photographer: photographerId,
            tags: ['photographer_work'],
          },
        });
      });

      // Auto-arrange with AI
      const arrangedPhotos = await moodBoardService.autoArrangePhotos(
        combinedPhotos,
        'collage',
      );

      return arrangedPhotos;
    } catch (error) {
      console.error('Error creating integrated mood board:', error);
      return [];
    }
  }

  /**
   * Track booking conversion and update AI models
   */
  async trackBookingConversion(
    integrationData: BookingIntegrationData,
    selectedPhotographerId: string,
    conversionData: {
      converted: boolean;
      rejectionReason?: string;
      finalPrice?: number;
      satisfaction?: number;
    },
  ): Promise<void> {
    try {
      // Update photographer matching algorithm with feedback
      await this.photographerMatchingService.updatePhotographerMatchingProfile(
        selectedPhotographerId,
        {
          bookingSuccess: conversionData.converted,
          clientSatisfactionScore: conversionData.satisfaction,
          deliveryOnTime: true, // Would be tracked later
          communicationQuality: conversionData.satisfaction,
        },
      );

      // Store booking analytics
      await this.storeBookingAnalytics(
        integrationData,
        selectedPhotographerId,
        conversionData,
      );

      // Update client preference learning
      if (conversionData.converted) {
        await this.photographerMatchingService.learnClientPreferences(
          integrationData.clientId,
          [selectedPhotographerId],
          [
            {
              photographerId: selectedPhotographerId,
              rating: conversionData.satisfaction || 5,
              notes: 'Successful booking conversion',
            },
          ],
        );
      }
    } catch (error) {
      console.error('Error tracking booking conversion:', error);
    }
  }

  /**
   * Generate booking insights for photographers
   */
  async generatePhotographerInsights(photographerId: string): Promise<{
    performanceMetrics: any;
    improvementSuggestions: string[];
    marketPosition: any;
  }> {
    try {
      // Get photographer's booking history
      const bookingHistory =
        await this.getPhotographerBookingHistory(photographerId);

      // Analyze performance metrics
      const performanceMetrics =
        this.calculatePerformanceMetrics(bookingHistory);

      // Generate improvement suggestions
      const improvementSuggestions = await this.generateImprovementSuggestions(
        photographerId,
        performanceMetrics,
      );

      // Analyze market position
      const marketPosition = await this.analyzeMarketPosition(photographerId);

      return {
        performanceMetrics,
        improvementSuggestions,
        marketPosition,
      };
    } catch (error) {
      console.error('Error generating photographer insights:', error);
      throw error;
    }
  }

  // Private helper methods

  private async analyzeClientStylePreferences(data: BookingIntegrationData) {
    const { stylePreferences } = data;

    if (stylePreferences.moodBoard && stylePreferences.moodBoard.length > 0) {
      return await moodBoardService.analyzeBoardCoherence(
        stylePreferences.moodBoard,
      );
    }

    // Analyze inspiration images if no mood board
    const colorAnalyses = await Promise.all(
      stylePreferences.inspirationImages.map(
        async (url, index) =>
          await colorHarmonyAnalyzer.analyzeColorHarmony(
            url,
            `inspiration_${index}`,
          ),
      ),
    );

    return {
      dominantTheme: this.extractDominantTheme(colorAnalyses),
      colorPalette: this.extractColorPalette(colorAnalyses),
      consistencyScore: this.calculateConsistency(colorAnalyses),
    };
  }

  private buildMatchingCriteria(
    data: BookingIntegrationData,
    styleAnalysis: any,
  ) {
    return {
      clientId: data.clientId,
      eventDetails: {
        eventType: 'wedding' as const,
        eventDate: data.weddingDetails.date,
        location: {
          city: 'Unknown',
          state: 'Unknown',
          country: 'US',
          venue: data.weddingDetails.venue,
          isDestination: false,
        },
        duration: data.weddingDetails.duration,
        guestCount: data.weddingDetails.guestCount,
        timeOfDay: this.determineTimeOfDay(data.weddingDetails.date),
      },
      stylePreferences: {
        preferredStyles: data.stylePreferences.preferredStyles,
        inspirationImages: data.stylePreferences.inspirationImages,
        moodKeywords: [
          styleAnalysis.dominantTheme || data.weddingDetails.theme,
        ],
      },
      budgetConstraints: {
        maxBudget: 5000, // Would come from booking data
        currency: 'USD',
        includeTravel: true,
      },
      logisticalRequirements: {
        maxTravelDistance: 100,
        deliveryTimeline: 14,
        deliveryFormat: 'digital' as const,
      },
      personalPreferences: {
        communicationStyle: 'professional' as const,
        experienceLevel: 'any' as const,
        portfolioImportance: 'high' as const,
        reviewImportance: 'high' as const,
      },
    };
  }

  private async convertToBookingRecommendation(
    match: any,
    data: BookingIntegrationData,
  ): Promise<PhotographerRecommendation> {
    const availability = await this.checkPhotographerAvailability(
      match.photographer.id,
      data.weddingDetails.date,
    );

    return {
      photographer: match.photographer,
      matchScore: match.overallMatchScore,
      reasons: match.matchAnalysis.strengths,
      portfolioSamples: await this.getPortfolioSamples(match.photographer.id),
      estimatedCost: match.estimatedCost,
      availabilityStatus: availability,
    };
  }

  private async analyzeBookingStyle(data: BookingIntegrationData) {
    const styleAnalysis = await this.analyzeClientStylePreferences(data);

    return {
      dominantTheme: styleAnalysis.dominantTheme || data.weddingDetails.theme,
      colorHarmony: styleAnalysis.consistencyScore || 0.7,
      consistencyScore: styleAnalysis.consistencyScore || 0.7,
    };
  }

  private async analyzePricingMarket(data: BookingIntegrationData) {
    // Get market data for similar weddings
    const { data: marketData } = await supabase
      .from('booking_analytics')
      .select('final_price, guest_count, venue_type')
      .eq('event_type', 'wedding')
      .gte('guest_count', data.weddingDetails.guestCount * 0.8)
      .lte('guest_count', data.weddingDetails.guestCount * 1.2);

    const prices = marketData?.map((d) => d.final_price).filter(Boolean) || [];
    const marketAverage =
      prices.length > 0
        ? prices.reduce((sum, price) => sum + price, 0) / prices.length
        : 3000;

    return {
      marketAverage,
      recommendedBudget: marketAverage * 1.1, // 10% above average
      valueOpportunities: [
        'Consider off-peak dates for 15-20% savings',
        'Package deals often include engagement sessions',
        'Early booking discounts available from top photographers',
      ],
    };
  }

  private async getTimelineRecommendations(data: BookingIntegrationData) {
    const eventDate = new Date(data.weddingDetails.date);
    const now = new Date();
    const monthsUntilWedding = Math.floor(
      (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30),
    );

    const recommendations = {
      idealBookingWindow:
        monthsUntilWedding > 12
          ? 'Perfect timing - book 12+ months ahead'
          : monthsUntilWedding > 6
            ? 'Good timing - book 6+ months ahead'
            : 'Limited time - book immediately',
      seasonalFactors: this.getSeasonalFactors(eventDate),
      availabilityTrends: [
        'Peak season (May-September) books fastest',
        'Saturday evenings are most competitive',
        'Consider Friday or Sunday for more options',
      ],
    };

    return recommendations;
  }

  private async getPhotographerPortfolio(
    photographerId: string,
  ): Promise<string[]> {
    const { data } = await supabase
      .from('photographer_portfolios')
      .select('image_url')
      .eq('photographer_id', photographerId)
      .limit(10);

    return data?.map((item) => item.image_url) || [];
  }

  private async storeBookingAnalytics(
    data: BookingIntegrationData,
    photographerId: string,
    conversionData: any,
  ) {
    await supabase.from('booking_analytics').insert({
      client_id: data.clientId,
      photographer_id: photographerId,
      booking_id: data.bookingId,
      event_type: 'wedding',
      guest_count: data.weddingDetails.guestCount,
      venue_type: data.weddingDetails.venue,
      wedding_theme: data.weddingDetails.theme,
      converted: conversionData.converted,
      final_price: conversionData.finalPrice,
      satisfaction_score: conversionData.satisfaction,
      rejection_reason: conversionData.rejectionReason,
      created_at: new Date().toISOString(),
    });
  }

  private async checkPhotographerAvailability(
    photographerId: string,
    eventDate: string,
  ): Promise<'available' | 'limited' | 'unavailable'> {
    // Check photographer's calendar
    const { data } = await supabase
      .from('photographer_availability')
      .select('*')
      .eq('photographer_id', photographerId)
      .eq('date', eventDate);

    if (!data || data.length === 0) return 'available';

    const availability = data[0];
    if (availability.status === 'booked') return 'unavailable';
    if (availability.status === 'tentative') return 'limited';

    return 'available';
  }

  private async getPortfolioSamples(photographerId: string): Promise<string[]> {
    const { data } = await supabase
      .from('photographer_portfolios')
      .select('image_url')
      .eq('photographer_id', photographerId)
      .eq('featured', true)
      .limit(3);

    return data?.map((item) => item.image_url) || [];
  }

  private async getPhotographerBookingHistory(photographerId: string) {
    const { data } = await supabase
      .from('booking_analytics')
      .select('*')
      .eq('photographer_id', photographerId)
      .order('created_at', { ascending: false })
      .limit(50);

    return data || [];
  }

  private calculatePerformanceMetrics(bookingHistory: any[]) {
    const totalInquiries = bookingHistory.length;
    const conversions = bookingHistory.filter((b) => b.converted).length;
    const conversionRate =
      totalInquiries > 0 ? conversions / totalInquiries : 0;

    const satisfactionScores = bookingHistory
      .filter((b) => b.satisfaction_score)
      .map((b) => b.satisfaction_score);

    const averageSatisfaction =
      satisfactionScores.length > 0
        ? satisfactionScores.reduce((sum, score) => sum + score, 0) /
          satisfactionScores.length
        : 0;

    return {
      totalInquiries,
      conversions,
      conversionRate,
      averageSatisfaction,
      totalRevenue: bookingHistory
        .filter((b) => b.final_price)
        .reduce((sum, b) => sum + b.final_price, 0),
    };
  }

  private async generateImprovementSuggestions(
    photographerId: string,
    metrics: any,
  ): Promise<string[]> {
    const suggestions: string[] = [];

    if (metrics.conversionRate < 0.3) {
      suggestions.push('Improve portfolio with more diverse wedding styles');
      suggestions.push(
        'Consider offering package deals to increase conversion',
      );
    }

    if (metrics.averageSatisfaction < 4.0) {
      suggestions.push(
        'Focus on client communication and expectation management',
      );
      suggestions.push(
        'Consider offering additional services like engagement sessions',
      );
    }

    if (metrics.totalInquiries < 10) {
      suggestions.push(
        'Optimize your profile and portfolio for better discoverability',
      );
      suggestions.push(
        'Consider expanding your service area or marketing efforts',
      );
    }

    return suggestions;
  }

  private async analyzeMarketPosition(photographerId: string) {
    // Compare with market averages
    const { data: marketData } = await supabase
      .from('booking_analytics')
      .select('final_price, satisfaction_score, converted')
      .neq('photographer_id', photographerId);

    const photographerData =
      await this.getPhotographerBookingHistory(photographerId);

    const marketConversionRate =
      marketData && marketData.length > 0
        ? marketData.filter((d) => d.converted).length / marketData.length
        : 0.25;

    const photographerConversionRate =
      photographerData.length > 0
        ? photographerData.filter((d) => d.converted).length /
          photographerData.length
        : 0;

    return {
      conversionRateVsMarket: photographerConversionRate - marketConversionRate,
      marketPosition:
        photographerConversionRate > marketConversionRate
          ? 'above_average'
          : 'below_average',
      recommendedActions:
        photographerConversionRate < marketConversionRate
          ? ['Focus on portfolio improvement', 'Enhance client communication']
          : ['Maintain current quality', 'Consider premium pricing'],
    };
  }

  // Utility methods

  private extractDominantTheme(analyses: any[]): string {
    const themes: { [key: string]: number } = {};

    analyses.forEach((analysis) => {
      analysis.theme_matches?.forEach((match: any) => {
        themes[match.theme] =
          (themes[match.theme] || 0) + match.compatibility_score;
      });
    });

    return Object.keys(themes).reduce(
      (a, b) => (themes[a] > themes[b] ? a : b),
      'romantic',
    );
  }

  private extractColorPalette(analyses: any[]): string[] {
    const colors = new Set<string>();

    analyses.forEach((analysis) => {
      analysis.dominant_colors?.forEach((color: any) => {
        colors.add(color.hex);
      });
    });

    return Array.from(colors).slice(0, 8);
  }

  private calculateConsistency(analyses: any[]): number {
    if (analyses.length < 2) return 1;

    // Calculate theme consistency
    const themes = analyses.map((a) => a.theme_matches?.[0]?.theme || 'mixed');
    const uniqueThemes = new Set(themes);

    return 1 - (uniqueThemes.size - 1) / analyses.length;
  }

  private determineTimeOfDay(
    eventDate: string,
  ): 'morning' | 'afternoon' | 'evening' | 'full-day' {
    // Default logic - could be enhanced with actual time parsing
    return 'evening';
  }

  private getSeasonalFactors(eventDate: Date): string[] {
    const month = eventDate.getMonth();

    if (month >= 4 && month <= 8) {
      // May-September
      return [
        'Peak wedding season',
        'Higher demand for photographers',
        'Book 12+ months ahead',
      ];
    } else if (month >= 9 && month <= 11) {
      // October-December
      return [
        'Popular fall season',
        'Good availability',
        'Beautiful natural lighting',
      ];
    } else {
      // January-April
      return [
        'Off-peak season',
        'Better pricing available',
        'More photographer availability',
      ];
    }
  }
}

// Export singleton instance
export const bookingIntegrationService = new BookingIntegrationService();

// Export convenience methods
export const getPhotographerRecommendations = (data: BookingIntegrationData) =>
  bookingIntegrationService.getPhotographerRecommendations(data);

export const optimizeBooking = (data: BookingIntegrationData) =>
  bookingIntegrationService.optimizeBooking(data);

export const createIntegratedMoodBoard = (
  preferences: BookingIntegrationData['stylePreferences'],
  photographerId: string,
) =>
  bookingIntegrationService.createIntegratedMoodBoard(
    preferences,
    photographerId,
  );

export const trackBookingConversion = (
  data: BookingIntegrationData,
  photographerId: string,
  conversionData: any,
) =>
  bookingIntegrationService.trackBookingConversion(
    data,
    photographerId,
    conversionData,
  );
