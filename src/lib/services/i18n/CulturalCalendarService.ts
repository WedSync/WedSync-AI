/**
 * Cultural Calendar Service - WS-247 Multilingual Platform System
 * Manages cultural calendar integration, auspicious dates, and cultural holidays for wedding planning
 *
 * Features:
 * - Cultural calendar system integration (Gregorian, Lunar, Islamic, Jewish, etc.)
 * - Auspicious date recommendations for weddings
 * - Cultural holiday and restriction management
 * - Multi-cultural date compatibility checking
 * - Seasonal cultural preferences
 * - Vendor availability integration
 */

import { createClient } from '@/lib/supabase/client';
import {
  format,
  addDays,
  startOfMonth,
  endOfMonth,
  isAfter,
  isBefore,
  parseISO,
} from 'date-fns';

// Cultural Calendar Types
export interface CulturalCalendarDate {
  id: string;
  date: string; // ISO date string
  locale: string;
  calendar_system: CalendarSystem;
  significance: DateSignificance;
  name: string;
  description: string;
  cultural_context: string[];
  recommendation_score: number; // 0-100
  restrictions?: DateRestriction[];
  alternatives?: string[]; // Alternative dates if restricted
  vendor_availability?: VendorAvailability;
  created_at: string;
  updated_at: string;
}

export type CalendarSystem =
  | 'gregorian'
  | 'lunar'
  | 'islamic'
  | 'jewish'
  | 'chinese'
  | 'hindu'
  | 'buddhist'
  | 'persian'
  | 'ethiopian'
  | 'coptic';

export type DateSignificance =
  | 'highly_auspicious'
  | 'auspicious'
  | 'neutral'
  | 'cautionary'
  | 'restricted'
  | 'forbidden';

export interface DateRestriction {
  type: 'religious' | 'cultural' | 'seasonal' | 'practical';
  severity: 'warning' | 'strong_discouraged' | 'forbidden';
  reason: string;
  cultural_context: string[];
  alternatives_suggested: boolean;
}

export interface VendorAvailability {
  photography: AvailabilityStatus;
  venue: AvailabilityStatus;
  catering: AvailabilityStatus;
  flowers: AvailabilityStatus;
  music: AvailabilityStatus;
  overall_score: number;
}

export type AvailabilityStatus = 'high' | 'medium' | 'low' | 'unavailable';

export interface CulturalHoliday {
  id: string;
  name: string;
  date: string;
  locale: string;
  type: 'religious' | 'national' | 'cultural' | 'seasonal';
  impact_on_weddings: 'positive' | 'neutral' | 'negative' | 'forbidden';
  description: string;
  traditions: string[];
  vendor_impact: {
    availability_impact: number; // -100 to 100
    pricing_impact: number; // -100 to 100
    cultural_significance: number; // 0-100
  };
}

export interface DateRecommendationRequest {
  couple_locales: string[];
  preferred_months: number[]; // 1-12
  venue_location: {
    latitude: number;
    longitude: number;
    timezone: string;
  };
  guest_cultural_backgrounds: string[];
  budget_tier: 'budget' | 'mid_range' | 'luxury' | 'ultra_luxury';
  ceremony_type: 'religious' | 'civil' | 'spiritual' | 'cultural_fusion';
  exclude_restrictions?: string[]; // Types of restrictions to ignore
}

export interface DateRecommendation {
  date: string;
  overall_score: number;
  cultural_scores: {
    [locale: string]: number;
  };
  significance: DateSignificance;
  reasons: string[];
  cultural_benefits: string[];
  potential_concerns: string[];
  vendor_availability: VendorAvailability;
  estimated_cost_impact: number; // Percentage change from baseline
  alternative_dates: string[];
}

/**
 * Cultural Calendar Service Implementation
 */
class CulturalCalendarServiceClass {
  private supabase = createClient();
  private cache = new Map<string, any>();
  private cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours

  // Cultural calendar data - In production, this would come from external APIs
  private culturalCalendarSystems = new Map<string, CalendarSystem[]>([
    ['en-US', ['gregorian']],
    ['en-GB', ['gregorian']],
    ['zh-CN', ['gregorian', 'chinese', 'lunar']],
    ['zh-TW', ['gregorian', 'chinese', 'lunar']],
    ['ja-JP', ['gregorian', 'lunar', 'buddhist']],
    ['ko-KR', ['gregorian', 'lunar']],
    ['hi-IN', ['gregorian', 'hindu', 'lunar']],
    ['ar-SA', ['gregorian', 'islamic']],
    ['ar-EG', ['gregorian', 'islamic', 'coptic']],
    ['he-IL', ['gregorian', 'jewish']],
    ['fa-IR', ['gregorian', 'persian', 'islamic']],
    ['th-TH', ['gregorian', 'buddhist']],
    ['am-ET', ['gregorian', 'ethiopian']],
    ['es-ES', ['gregorian']],
    ['fr-FR', ['gregorian']],
    ['de-DE', ['gregorian']],
    ['it-IT', ['gregorian']],
    ['ru-RU', ['gregorian']],
    ['pt-BR', ['gregorian']],
    ['tr-TR', ['gregorian', 'islamic']],
  ]);

  /**
   * Get cultural calendar recommendations for wedding dates
   */
  async getWeddingDateRecommendations(
    request: DateRecommendationRequest,
    startDate: Date = new Date(),
    monthsAhead: number = 18,
  ): Promise<DateRecommendation[]> {
    try {
      const cacheKey = `recommendations_${JSON.stringify(request)}_${startDate.toISOString()}_${monthsAhead}`;

      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheExpiry) {
          return cached.data;
        }
      }

      const endDate = addDays(startDate, monthsAhead * 30);
      const recommendations: DateRecommendation[] = [];

      // Get cultural dates for all relevant locales
      const allCulturalDates = await this.getCulturalDatesInRange(
        request.couple_locales.concat(request.guest_cultural_backgrounds),
        startDate,
        endDate,
      );

      // Get cultural holidays that might impact planning
      const culturalHolidays = await this.getCulturalHolidaysInRange(
        request.couple_locales.concat(request.guest_cultural_backgrounds),
        startDate,
        endDate,
      );

      // Analyze each potential date
      const potentialDates = this.generatePotentialWeddingDates(
        startDate,
        endDate,
        request.preferred_months,
      );

      for (const date of potentialDates) {
        const recommendation = await this.analyzeDateForWedding(
          date,
          request,
          allCulturalDates,
          culturalHolidays,
        );

        if (recommendation.overall_score >= 30) {
          // Only include reasonable options
          recommendations.push(recommendation);
        }
      }

      // Sort by overall score descending
      recommendations.sort((a, b) => b.overall_score - a.overall_score);

      // Cache results
      this.cache.set(cacheKey, {
        data: recommendations.slice(0, 50), // Top 50 recommendations
        timestamp: Date.now(),
      });

      return recommendations.slice(0, 20); // Return top 20
    } catch (error) {
      console.error('Error getting wedding date recommendations:', error);
      throw new Error('Failed to get cultural calendar recommendations');
    }
  }

  /**
   * Get cultural significance of a specific date
   */
  async getDateCulturalSignificance(
    date: Date,
    locales: string[],
  ): Promise<{
    overall_significance: DateSignificance;
    cultural_details: Array<{
      locale: string;
      significance: DateSignificance;
      reasons: string[];
      calendar_system: CalendarSystem;
      cultural_context: string[];
    }>;
    recommendations: string[];
    concerns: string[];
  }> {
    try {
      const cultural_details = [];
      let overall_scores: number[] = [];
      let all_recommendations: string[] = [];
      let all_concerns: string[] = [];

      for (const locale of locales) {
        const calendarSystems = this.culturalCalendarSystems.get(locale) || [
          'gregorian',
        ];

        for (const calendarSystem of calendarSystems) {
          const analysis = await this.analyzeDateInCulturalContext(
            date,
            locale,
            calendarSystem,
          );

          cultural_details.push(analysis);
          overall_scores.push(this.getNumericScore(analysis.significance));
          all_recommendations.push(
            ...analysis.reasons.filter((r) => r.includes('auspicious')),
          );
          all_concerns.push(
            ...analysis.reasons.filter(
              (r) => r.includes('caution') || r.includes('avoid'),
            ),
          );
        }
      }

      // Calculate overall significance
      const avgScore =
        overall_scores.reduce((sum, score) => sum + score, 0) /
        overall_scores.length;
      const overall_significance = this.getSignificanceFromScore(avgScore);

      return {
        overall_significance,
        cultural_details,
        recommendations: [...new Set(all_recommendations)].slice(0, 5),
        concerns: [...new Set(all_concerns)].slice(0, 5),
      };
    } catch (error) {
      console.error('Error analyzing date cultural significance:', error);
      throw new Error('Failed to analyze cultural significance');
    }
  }

  /**
   * Get cultural holidays in date range
   */
  async getCulturalHolidaysInRange(
    locales: string[],
    startDate: Date,
    endDate: Date,
  ): Promise<CulturalHoliday[]> {
    try {
      const holidays: CulturalHoliday[] = [];

      // In a real implementation, this would query external calendar APIs
      // For now, we'll return some common holidays
      const commonHolidays = await this.getCommonCulturalHolidays(
        locales,
        startDate,
        endDate,
      );
      holidays.push(...commonHolidays);

      return holidays;
    } catch (error) {
      console.error('Error getting cultural holidays:', error);
      return [];
    }
  }

  /**
   * Get vendor availability impact for cultural dates
   */
  async getVendorAvailabilityForDate(
    date: Date,
    location: { latitude: number; longitude: number; timezone: string },
    locales: string[],
  ): Promise<VendorAvailability> {
    try {
      // This would integrate with vendor management system
      // For now, simulate based on cultural and seasonal factors

      const dayOfWeek = date.getDay();
      const month = date.getMonth() + 1;
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isPeakSeason = [5, 6, 9, 10].includes(month); // May, June, Sept, Oct

      let baseAvailability: AvailabilityStatus = isWeekend ? 'high' : 'medium';
      let overallScore = isWeekend ? 85 : 60;

      // Adjust for peak season
      if (isPeakSeason) {
        overallScore -= 15;
        if (overallScore < 40) baseAvailability = 'low';
      }

      // Check for cultural holidays that might affect availability
      const holidays = await this.getCulturalHolidaysInRange(
        locales,
        date,
        date,
      );
      for (const holiday of holidays) {
        overallScore += holiday.vendor_impact.availability_impact;
      }

      // Ensure score stays in bounds
      overallScore = Math.max(0, Math.min(100, overallScore));

      if (overallScore >= 70) baseAvailability = 'high';
      else if (overallScore >= 40) baseAvailability = 'medium';
      else baseAvailability = 'low';

      return {
        photography: baseAvailability,
        venue: baseAvailability,
        catering: baseAvailability,
        flowers: baseAvailability,
        music: baseAvailability,
        overall_score: overallScore,
      };
    } catch (error) {
      console.error('Error getting vendor availability:', error);
      return {
        photography: 'medium',
        venue: 'medium',
        catering: 'medium',
        flowers: 'medium',
        music: 'medium',
        overall_score: 50,
      };
    }
  }

  /**
   * Check date compatibility across multiple cultures
   */
  async checkMultiCulturalCompatibility(
    date: Date,
    primaryCulture: string,
    guestCultures: string[],
  ): Promise<{
    compatibility_score: number; // 0-100
    cultural_conflicts: Array<{
      culture: string;
      issue: string;
      severity: 'low' | 'medium' | 'high';
      suggestion: string;
    }>;
    harmonious_aspects: string[];
    recommendations: string[];
  }> {
    try {
      const allCultures = [primaryCulture, ...guestCultures];
      const culturalAnalyses = await Promise.all(
        allCultures.map((culture) =>
          this.getDateCulturalSignificance(date, [culture]),
        ),
      );

      let compatibility_score = 100;
      const cultural_conflicts = [];
      const harmonious_aspects = [];
      const recommendations = [];

      // Check for conflicts between cultures
      for (let i = 0; i < culturalAnalyses.length; i++) {
        const analysis = culturalAnalyses[i];
        const culture = allCultures[i];

        if (analysis.concerns.length > 0) {
          for (const concern of analysis.concerns) {
            cultural_conflicts.push({
              culture,
              issue: concern,
              severity:
                analysis.overall_significance === 'forbidden'
                  ? 'high'
                  : analysis.overall_significance === 'restricted'
                    ? 'medium'
                    : 'low',
              suggestion: `Consider alternative dates or cultural accommodation for ${culture}`,
            });

            compatibility_score -=
              analysis.overall_significance === 'forbidden'
                ? 30
                : analysis.overall_significance === 'restricted'
                  ? 15
                  : 5;
          }
        }

        if (analysis.recommendations.length > 0) {
          harmonious_aspects.push(`${culture}: ${analysis.recommendations[0]}`);
        }
      }

      // Generate recommendations for multi-cultural harmony
      if (cultural_conflicts.length === 0) {
        recommendations.push(
          'This date appears culturally harmonious for all guests',
        );
      } else {
        recommendations.push(
          'Consider incorporating traditions from multiple cultures in your ceremony',
        );
        if (cultural_conflicts.some((c) => c.severity === 'high')) {
          recommendations.push(
            'Strong recommendation to choose an alternative date due to cultural restrictions',
          );
        }
      }

      compatibility_score = Math.max(0, Math.min(100, compatibility_score));

      return {
        compatibility_score,
        cultural_conflicts,
        harmonious_aspects,
        recommendations,
      };
    } catch (error) {
      console.error('Error checking multi-cultural compatibility:', error);
      throw new Error('Failed to check cultural compatibility');
    }
  }

  /**
   * Private helper methods
   */

  private async getCulturalDatesInRange(
    locales: string[],
    startDate: Date,
    endDate: Date,
  ): Promise<CulturalCalendarDate[]> {
    // In production, this would query the database
    // For now, return mock data for testing
    return [];
  }

  private generatePotentialWeddingDates(
    startDate: Date,
    endDate: Date,
    preferredMonths: number[],
  ): Date[] {
    const dates: Date[] = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      const month = current.getMonth() + 1;
      const dayOfWeek = current.getDay();

      // Focus on weekends and preferred months
      if (
        (preferredMonths.length === 0 || preferredMonths.includes(month)) &&
        (dayOfWeek === 0 || dayOfWeek === 6)
      ) {
        dates.push(new Date(current));
      }

      current.setDate(current.getDate() + 1);
    }

    return dates.slice(0, 100); // Limit to prevent excessive processing
  }

  private async analyzeDateForWedding(
    date: Date,
    request: DateRecommendationRequest,
    culturalDates: CulturalCalendarDate[],
    culturalHolidays: CulturalHoliday[],
  ): Promise<DateRecommendation> {
    const cultural_scores: { [locale: string]: number } = {};
    const reasons: string[] = [];
    const cultural_benefits: string[] = [];
    const potential_concerns: string[] = [];

    let overall_score = 50; // Base score

    // Analyze cultural significance for each locale
    for (const locale of request.couple_locales) {
      const significance = await this.getDateCulturalSignificance(date, [
        locale,
      ]);
      const score = this.getNumericScore(significance.overall_significance);
      cultural_scores[locale] = score;
      overall_score += (score - 50) * 0.3; // Weight cultural significance

      cultural_benefits.push(...significance.recommendations);
      potential_concerns.push(...significance.concerns);
      reasons.push(
        `${locale}: ${significance.overall_significance.replace('_', ' ')}`,
      );
    }

    // Check vendor availability
    const vendor_availability = await this.getVendorAvailabilityForDate(
      date,
      request.venue_location,
      request.couple_locales,
    );
    overall_score += (vendor_availability.overall_score - 50) * 0.2;

    // Weekend bonus
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 6) {
      // Saturday
      overall_score += 15;
      reasons.push('Popular Saturday wedding date');
    } else if (dayOfWeek === 0) {
      // Sunday
      overall_score += 5;
      reasons.push('Sunday wedding - potentially lower costs');
    }

    // Season and month considerations
    const month = date.getMonth() + 1;
    if ([5, 6, 9, 10].includes(month)) {
      overall_score += 10;
      reasons.push('Peak wedding season - beautiful weather');
    }

    // Holiday impact
    const nearbyHolidays = culturalHolidays.filter((h) => {
      const holidayDate = parseISO(h.date);
      const diffDays = Math.abs(
        (date.getTime() - holidayDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      return diffDays <= 3;
    });

    for (const holiday of nearbyHolidays) {
      if (holiday.impact_on_weddings === 'positive') {
        overall_score += 10;
        cultural_benefits.push(`Near ${holiday.name} - ${holiday.description}`);
      } else if (holiday.impact_on_weddings === 'negative') {
        overall_score -= 10;
        potential_concerns.push(
          `Near ${holiday.name} - may affect availability`,
        );
      } else if (holiday.impact_on_weddings === 'forbidden') {
        overall_score -= 30;
        potential_concerns.push(
          `${holiday.name} - culturally inappropriate for weddings`,
        );
      }
    }

    overall_score = Math.max(0, Math.min(100, overall_score));

    return {
      date: format(date, 'yyyy-MM-dd'),
      overall_score,
      cultural_scores,
      significance: this.getSignificanceFromScore(overall_score),
      reasons: reasons.slice(0, 5),
      cultural_benefits: [...new Set(cultural_benefits)].slice(0, 3),
      potential_concerns: [...new Set(potential_concerns)].slice(0, 3),
      vendor_availability,
      estimated_cost_impact: this.calculateCostImpact(
        date,
        vendor_availability,
      ),
      alternative_dates: [], // Could be populated with nearby good dates
    };
  }

  private async analyzeDateInCulturalContext(
    date: Date,
    locale: string,
    calendarSystem: CalendarSystem,
  ) {
    // This would use actual cultural calendar APIs
    // For now, return basic analysis
    const dayOfWeek = date.getDay();
    const month = date.getMonth() + 1;

    let significance: DateSignificance = 'neutral';
    const reasons: string[] = [];
    const cultural_context: string[] = [locale, calendarSystem];

    // Basic cultural rules (would be much more sophisticated in production)
    if (locale.startsWith('zh-') && calendarSystem === 'chinese') {
      // Chinese cultural considerations
      if ([4, 5, 9, 10].includes(month)) {
        significance = 'auspicious';
        reasons.push('Good season for celebrations in Chinese culture');
      }
    } else if (locale.startsWith('hi-') && calendarSystem === 'hindu') {
      // Hindu cultural considerations
      if ([10, 11, 2, 4].includes(month)) {
        significance = 'auspicious';
        reasons.push('Auspicious months in Hindu calendar');
      }
    } else if (locale.startsWith('ja-') && dayOfWeek === 6) {
      // Japanese Saturday preference
      significance = 'auspicious';
      reasons.push('Saturday is traditionally good for celebrations');
    }

    // Weekend considerations for most Western cultures
    if (
      (locale.startsWith('en-') ||
        locale.startsWith('es-') ||
        locale.startsWith('fr-')) &&
      dayOfWeek === 6
    ) {
      significance = 'auspicious';
      reasons.push('Weekend celebration is traditional');
    }

    return {
      significance,
      reasons,
      calendar_system: calendarSystem,
      cultural_context,
    };
  }

  private getNumericScore(significance: DateSignificance): number {
    const scoreMap = {
      forbidden: 0,
      restricted: 20,
      cautionary: 35,
      neutral: 50,
      auspicious: 75,
      highly_auspicious: 95,
    };
    return scoreMap[significance] || 50;
  }

  private getSignificanceFromScore(score: number): DateSignificance {
    if (score >= 90) return 'highly_auspicious';
    if (score >= 70) return 'auspicious';
    if (score >= 40) return 'neutral';
    if (score >= 25) return 'cautionary';
    if (score >= 10) return 'restricted';
    return 'forbidden';
  }

  private async getCommonCulturalHolidays(
    locales: string[],
    startDate: Date,
    endDate: Date,
  ): Promise<CulturalHoliday[]> {
    // In production, this would use holiday APIs
    // Return some common holidays for testing
    const holidays: CulturalHoliday[] = [];

    const year = startDate.getFullYear();

    // Add major holidays that might affect wedding planning
    if (locales.some((l) => l.startsWith('en-') || l.startsWith('es-'))) {
      holidays.push({
        id: `christmas-${year}`,
        name: 'Christmas',
        date: `${year}-12-25`,
        locale: 'en-US',
        type: 'religious',
        impact_on_weddings: 'negative',
        description: 'Major Christian holiday - many vendors unavailable',
        traditions: ['family gatherings', 'gift exchange'],
        vendor_impact: {
          availability_impact: -40,
          pricing_impact: 20,
          cultural_significance: 95,
        },
      });
    }

    return holidays;
  }

  private calculateCostImpact(
    date: Date,
    vendorAvailability: VendorAvailability,
  ): number {
    let impact = 0;

    // Peak season pricing
    const month = date.getMonth() + 1;
    if ([5, 6, 9, 10].includes(month)) {
      impact += 20; // 20% higher in peak season
    }

    // Weekend premium
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 6) {
      impact += 15; // Saturday premium
    } else if (dayOfWeek === 0) {
      impact -= 10; // Sunday discount
    } else {
      impact -= 25; // Weekday discount
    }

    // Vendor availability impact
    if (vendorAvailability.overall_score < 40) {
      impact += 30; // High demand = higher prices
    } else if (vendorAvailability.overall_score > 80) {
      impact -= 10; // Good availability = competitive prices
    }

    return Math.round(impact);
  }

  /**
   * Clear service cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get service statistics
   */
  getServiceStats() {
    return {
      cache_size: this.cache.size,
      supported_locales: Array.from(this.culturalCalendarSystems.keys()),
      supported_calendar_systems: Array.from(
        new Set(Array.from(this.culturalCalendarSystems.values()).flat()),
      ),
      service_version: '1.0.0',
      last_updated: new Date().toISOString(),
    };
  }
}

// Export singleton instance
export const CulturalCalendarService = new CulturalCalendarServiceClass();
export default CulturalCalendarService;
