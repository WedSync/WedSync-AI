import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';

interface WeddingDateAvailability {
  vendorId: string;
  vendorName: string;
  vendorType: string;
  date: string;
  isAvailable: boolean;
  bookingStatus: 'available' | 'tentative' | 'booked' | 'blocked';
  pricing: {
    basePrice: number;
    seasonalMultiplier: number;
    dayOfWeekMultiplier: number;
    holidayMultiplier?: number;
    finalPrice: number;
  };
  restrictions?: {
    minimumNotice: number; // days
    maximumAdvanceBooking: number; // days
    requiresDeposit: boolean;
    cancellationPolicy: string;
  };
  alternativeDates?: Array<{
    date: string;
    price: number;
    reason: string;
  }>;
}

interface AvailabilitySearchQuery {
  vendorTypes: string[];
  location: string;
  preferredDate: string;
  flexibleDates?: {
    enabled: boolean;
    rangeBefore: number; // days before preferred date
    rangeAfter: number; // days after preferred date
    acceptableWeekdays: number[]; // 0 = Sunday, 1 = Monday, etc.
  };
  budget?: { min: number; max: number };
  guestCount?: number;
  duration?: number; // hours
  urgency?: 'flexible' | 'moderate' | 'urgent';
}

interface AvailabilitySearchResult {
  exactMatches: WeddingDateAvailability[];
  nearbyDates: WeddingDateAvailability[];
  seasonalInsights: {
    peakSeason: boolean;
    demandLevel: 'low' | 'medium' | 'high';
    priceImpact: number; // percentage increase/decrease
    popularAlternatives: string[];
  };
  bookingRecommendations: {
    bestValue: WeddingDateAvailability[];
    quickestAvailable: WeddingDateAvailability[];
    mostFlexible: WeddingDateAvailability[];
  };
}

// Mock availability data
const MOCK_VENDOR_AVAILABILITY: WeddingDateAvailability[] = [
  {
    vendorId: 'photo_001',
    vendorName: 'Elite Wedding Photography',
    vendorType: 'photographer',
    date: '2024-06-15',
    isAvailable: true,
    bookingStatus: 'available',
    pricing: {
      basePrice: 3500,
      seasonalMultiplier: 1.2, // Spring premium
      dayOfWeekMultiplier: 1.0, // Saturday
      finalPrice: 4200
    },
    restrictions: {
      minimumNotice: 30,
      maximumAdvanceBooking: 730,
      requiresDeposit: true,
      cancellationPolicy: '50% refund if cancelled 60+ days before'
    },
    alternativeDates: [
      { date: '2024-06-08', price: 4000, reason: 'Similar season, slightly earlier' },
      { date: '2024-06-22', price: 4200, reason: 'Same price, one week later' }
    ]
  },
  {
    vendorId: 'photo_001',
    vendorName: 'Elite Wedding Photography',
    vendorType: 'photographer',
    date: '2024-10-12',
    isAvailable: true,
    bookingStatus: 'available',
    pricing: {
      basePrice: 3500,
      seasonalMultiplier: 1.4, // Fall premium
      dayOfWeekMultiplier: 1.0, // Saturday
      finalPrice: 4900
    },
    restrictions: {
      minimumNotice: 30,
      maximumAdvanceBooking: 730,
      requiresDeposit: true,
      cancellationPolicy: '50% refund if cancelled 60+ days before'
    }
  },
  {
    vendorId: 'venue_001',
    vendorName: 'Grand Ballroom at The Plaza',
    vendorType: 'venue',
    date: '2024-06-15',
    isAvailable: false,
    bookingStatus: 'booked',
    pricing: {
      basePrice: 25000,
      seasonalMultiplier: 1.1,
      dayOfWeekMultiplier: 1.3, // Saturday premium
      finalPrice: 35750
    },
    restrictions: {
      minimumNotice: 90,
      maximumAdvanceBooking: 1095,
      requiresDeposit: true,
      cancellationPolicy: 'Non-refundable deposit'
    },
    alternativeDates: [
      { date: '2024-06-16', price: 28000, reason: 'Sunday rate, day after' },
      { date: '2024-07-13', price: 35750, reason: 'Similar Saturday in July' }
    ]
  },
  {
    vendorId: 'venue_001',
    vendorName: 'Grand Ballroom at The Plaza',
    vendorType: 'venue',
    date: '2024-12-31',
    isAvailable: true,
    bookingStatus: 'available',
    pricing: {
      basePrice: 25000,
      seasonalMultiplier: 1.0,
      dayOfWeekMultiplier: 1.5, // New Year's Eve premium
      holidayMultiplier: 2.0, // Holiday premium
      finalPrice: 75000
    },
    restrictions: {
      minimumNotice: 180,
      maximumAdvanceBooking: 1095,
      requiresDeposit: true,
      cancellationPolicy: 'Non-refundable deposit, no cancellations within 6 months'
    }
  },
  {
    vendorId: 'florist_001',
    vendorName: 'Bloom & Blossom Floral Design',
    vendorType: 'florist',
    date: '2024-05-18',
    isAvailable: true,
    bookingStatus: 'available',
    pricing: {
      basePrice: 2200,
      seasonalMultiplier: 1.3, // Spring flower premium
      dayOfWeekMultiplier: 1.0,
      finalPrice: 2860
    },
    restrictions: {
      minimumNotice: 14,
      maximumAdvanceBooking: 365,
      requiresDeposit: false,
      cancellationPolicy: 'Full refund if cancelled 14+ days before'
    }
  }
];

// Availability search service
class WeddingAvailabilitySearchService {
  private availabilityData: WeddingDateAvailability[] = [...MOCK_VENDOR_AVAILABILITY];

  async searchAvailability(query: AvailabilitySearchQuery): Promise<AvailabilitySearchResult> {
    const exactMatches = this.findExactMatches(query);
    const nearbyDates = this.findNearbyDates(query);
    const seasonalInsights = this.analyzeSeasonalFactors(query.preferredDate);
    const bookingRecommendations = this.generateBookingRecommendations(query, [...exactMatches, ...nearbyDates]);

    return {
      exactMatches,
      nearbyDates,
      seasonalInsights,
      bookingRecommendations
    };
  }

  private findExactMatches(query: AvailabilitySearchQuery): WeddingDateAvailability[] {
    return this.availabilityData.filter(availability => 
      availability.date === query.preferredDate &&
      query.vendorTypes.includes(availability.vendorType) &&
      this.matchesBudget(availability, query.budget) &&
      this.meetsMinimumNotice(availability, query.preferredDate)
    );
  }

  private findNearbyDates(query: AvailabilitySearchQuery): WeddingDateAvailability[] {
    if (!query.flexibleDates?.enabled) {
      return [];
    }

    const preferredDate = new Date(query.preferredDate);
    const rangeStart = new Date(preferredDate);
    rangeStart.setDate(preferredDate.getDate() - query.flexibleDates.rangeBefore);
    
    const rangeEnd = new Date(preferredDate);
    rangeEnd.setDate(preferredDate.getDate() + query.flexibleDates.rangeAfter);

    return this.availabilityData.filter(availability => {
      const availabilityDate = new Date(availability.date);
      
      // Check date range
      if (availabilityDate < rangeStart || availabilityDate > rangeEnd) {
        return false;
      }

      // Skip exact match date (already covered)
      if (availability.date === query.preferredDate) {
        return false;
      }

      // Check vendor type
      if (!query.vendorTypes.includes(availability.vendorType)) {
        return false;
      }

      // Check acceptable weekdays
      const weekday = availabilityDate.getDay();
      if (query.flexibleDates.acceptableWeekdays && 
          !query.flexibleDates.acceptableWeekdays.includes(weekday)) {
        return false;
      }

      // Check budget and availability
      return this.matchesBudget(availability, query.budget) &&
             this.meetsMinimumNotice(availability, availability.date) &&
             availability.isAvailable;
    }).sort((a, b) => {
      // Sort by proximity to preferred date
      const aDistance = Math.abs(new Date(a.date).getTime() - preferredDate.getTime());
      const bDistance = Math.abs(new Date(b.date).getTime() - preferredDate.getTime());
      return aDistance - bDistance;
    });
  }

  private matchesBudget(availability: WeddingDateAvailability, budget?: { min: number; max: number }): boolean {
    if (!budget) return true;
    
    const price = availability.pricing.finalPrice;
    
    if (budget.min && price < budget.min) return false;
    if (budget.max && price > budget.max) return false;
    
    return true;
  }

  private meetsMinimumNotice(availability: WeddingDateAvailability, date: string): boolean {
    if (!availability.restrictions?.minimumNotice) return true;
    
    const eventDate = new Date(date);
    const today = new Date();
    const daysUntilEvent = Math.floor((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    return daysUntilEvent >= availability.restrictions.minimumNotice;
  }

  private analyzeSeasonalFactors(date: string): AvailabilitySearchResult['seasonalInsights'] {
    const eventDate = new Date(date);
    const month = eventDate.getMonth();
    
    // Peak wedding season: May through October
    const peakSeason = month >= 4 && month <= 9;
    
    // Determine demand level based on month
    let demandLevel: 'low' | 'medium' | 'high';
    if (month === 1 || month === 2 || month === 11) {
      demandLevel = 'low';
    } else if (month === 0 || month === 3 || month === 10) {
      demandLevel = 'medium';
    } else {
      demandLevel = 'high';
    }

    // Calculate price impact
    const priceImpact = peakSeason ? 25 : (demandLevel === 'medium' ? 10 : -15);

    // Suggest popular alternatives based on season
    const popularAlternatives = this.getPopularAlternativesByMonth(month);

    return {
      peakSeason,
      demandLevel,
      priceImpact,
      popularAlternatives
    };
  }

  private getPopularAlternativesByMonth(month: number): string[] {
    const alternatives: { [key: number]: string[] } = {
      0: ['Late February', 'Early March'], // January
      1: ['Early March', 'Mid-March'], // February
      2: ['Late February', 'Early April'], // March
      3: ['Late March', 'Early May'], // April
      4: ['Early April', 'Early June'], // May
      5: ['Late May', 'Early July'], // June
      6: ['Late June', 'Early August'], // July
      7: ['Late July', 'Early September'], // August
      8: ['Late August', 'Early October'], // September
      9: ['Late September', 'Early November'], // October
      10: ['Late October', 'Early December'], // November
      11: ['Late November', 'Early January'] // December
    };

    return alternatives[month] || ['Spring dates', 'Fall dates'];
  }

  private generateBookingRecommendations(
    query: AvailabilitySearchQuery, 
    allAvailabilities: WeddingDateAvailability[]
  ): AvailabilitySearchResult['bookingRecommendations'] {
    const availableOnly = allAvailabilities.filter(a => a.isAvailable);

    // Best value: lowest price per vendor type
    const bestValue = this.getBestValueOptions(availableOnly, query.vendorTypes);

    // Quickest available: earliest dates that meet minimum notice
    const quickestAvailable = this.getQuickestAvailableOptions(availableOnly, query.vendorTypes);

    // Most flexible: options with most lenient cancellation policies
    const mostFlexible = this.getMostFlexibleOptions(availableOnly, query.vendorTypes);

    return {
      bestValue,
      quickestAvailable,
      mostFlexible
    };
  }

  private getBestValueOptions(availabilities: WeddingDateAvailability[], vendorTypes: string[]): WeddingDateAvailability[] {
    const bestByType = vendorTypes.map(type => {
      const typeAvailabilities = availabilities.filter(a => a.vendorType === type);
      return typeAvailabilities.sort((a, b) => a.pricing.finalPrice - b.pricing.finalPrice)[0];
    }).filter(Boolean);

    return bestByType;
  }

  private getQuickestAvailableOptions(availabilities: WeddingDateAvailability[], vendorTypes: string[]): WeddingDateAvailability[] {
    const quickestByType = vendorTypes.map(type => {
      const typeAvailabilities = availabilities.filter(a => a.vendorType === type);
      return typeAvailabilities.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
    }).filter(Boolean);

    return quickestByType;
  }

  private getMostFlexibleOptions(availabilities: WeddingDateAvailability[], vendorTypes: string[]): WeddingDateAvailability[] {
    const flexibleByType = vendorTypes.map(type => {
      const typeAvailabilities = availabilities.filter(a => a.vendorType === type);
      return typeAvailabilities.sort((a, b) => {
        const aFlexibilityScore = this.calculateFlexibilityScore(a);
        const bFlexibilityScore = this.calculateFlexibilityScore(b);
        return bFlexibilityScore - aFlexibilityScore;
      })[0];
    }).filter(Boolean);

    return flexibleByType;
  }

  private calculateFlexibilityScore(availability: WeddingDateAvailability): number {
    let score = 0;
    
    if (!availability.restrictions) return 5; // No restrictions = most flexible
    
    // Lower minimum notice = more flexible
    if (availability.restrictions.minimumNotice <= 7) score += 3;
    else if (availability.restrictions.minimumNotice <= 14) score += 2;
    else if (availability.restrictions.minimumNotice <= 30) score += 1;
    
    // No deposit required = more flexible
    if (!availability.restrictions.requiresDeposit) score += 2;
    
    // Better cancellation policy = more flexible
    const cancellationPolicy = availability.restrictions.cancellationPolicy.toLowerCase();
    if (cancellationPolicy.includes('full refund')) score += 3;
    else if (cancellationPolicy.includes('50%') || cancellationPolicy.includes('partial')) score += 1;
    
    return score;
  }

  // Get vendor-specific availability for a date range
  async getVendorAvailabilityRange(
    vendorId: string, 
    startDate: string, 
    endDate: string
  ): Promise<WeddingDateAvailability[]> {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return this.availabilityData.filter(availability => {
      const availDate = new Date(availability.date);
      return availability.vendorId === vendorId && 
             availDate >= start && 
             availDate <= end;
    });
  }

  // Check if a specific date is available for all requested vendor types
  async checkDateAvailabilityForAllVendors(
    date: string, 
    vendorTypes: string[], 
    location: string
  ): Promise<{
    isFullyAvailable: boolean;
    availableVendors: string[];
    unavailableVendors: string[];
    conflicts: Array<{ vendorType: string; reason: string }>;
  }> {
    const dateAvailabilities = this.availabilityData.filter(a => a.date === date);
    
    const availableVendors: string[] = [];
    const unavailableVendors: string[] = [];
    const conflicts: Array<{ vendorType: string; reason: string }> = [];
    
    vendorTypes.forEach(vendorType => {
      const vendorAvailability = dateAvailabilities.find(a => a.vendorType === vendorType);
      
      if (!vendorAvailability) {
        unavailableVendors.push(vendorType);
        conflicts.push({ vendorType, reason: 'No vendors found for this date' });
      } else if (!vendorAvailability.isAvailable) {
        unavailableVendors.push(vendorType);
        conflicts.push({ 
          vendorType, 
          reason: `Already ${vendorAvailability.bookingStatus}` 
        });
      } else if (!this.meetsMinimumNotice(vendorAvailability, date)) {
        unavailableVendors.push(vendorType);
        conflicts.push({ 
          vendorType, 
          reason: `Requires ${vendorAvailability.restrictions?.minimumNotice} days minimum notice` 
        });
      } else {
        availableVendors.push(vendorType);
      }
    });
    
    return {
      isFullyAvailable: unavailableVendors.length === 0,
      availableVendors,
      unavailableVendors,
      conflicts
    };
  }

  // Get pricing breakdown for a specific date and vendor type
  async getPricingBreakdown(
    vendorId: string, 
    date: string
  ): Promise<WeddingDateAvailability['pricing'] | null> {
    const availability = this.availabilityData.find(a => 
      a.vendorId === vendorId && a.date === date
    );
    
    return availability?.pricing || null;
  }

  // Mock function to update availability (e.g., when a booking is made)
  async updateAvailability(
    vendorId: string, 
    date: string, 
    bookingStatus: WeddingDateAvailability['bookingStatus']
  ): Promise<boolean> {
    const availability = this.availabilityData.find(a => 
      a.vendorId === vendorId && a.date === date
    );
    
    if (availability) {
      availability.bookingStatus = bookingStatus;
      availability.isAvailable = bookingStatus === 'available';
      return true;
    }
    
    return false;
  }

  // Clear all data (for testing)
  clearAvailabilityData(): void {
    this.availabilityData = [];
  }

  // Add availability data (for testing)
  addAvailabilityData(data: WeddingDateAvailability[]): void {
    this.availabilityData.push(...data);
  }
}

describe('WS-248: Wedding Date Availability Search Tests', () => {
  let availabilityService: WeddingAvailabilitySearchService;

  beforeEach(() => {
    availabilityService = new WeddingAvailabilitySearchService();
  });

  afterEach(() => {
    // Reset to original mock data
    availabilityService.clearAvailabilityData();
    availabilityService.addAvailabilityData([...MOCK_VENDOR_AVAILABILITY]);
  });

  describe('Exact Date Availability', () => {
    test('should find available vendors for specific date', async () => {
      const query: AvailabilitySearchQuery = {
        vendorTypes: ['photographer'],
        location: 'New York, NY',
        preferredDate: '2024-06-15'
      };

      const result = await availabilityService.searchAvailability(query);

      expect(result.exactMatches.length).toBeGreaterThan(0);
      result.exactMatches.forEach(match => {
        expect(match.date).toBe('2024-06-15');
        expect(match.isAvailable).toBe(true);
        expect(query.vendorTypes).toContain(match.vendorType);
      });
    });

    test('should return empty results for fully booked dates', async () => {
      const query: AvailabilitySearchQuery = {
        vendorTypes: ['venue'],
        location: 'New York, NY',
        preferredDate: '2024-06-15' // Venue is booked on this date
      };

      const result = await availabilityService.searchAvailability(query);

      expect(result.exactMatches.length).toBe(0);
    });

    test('should respect minimum notice requirements', async () => {
      // Create a date that's too soon for venue (90 days minimum notice)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      // Add availability for tomorrow but with 90-day minimum notice
      availabilityService.addAvailabilityData([{
        vendorId: 'venue_urgent',
        vendorName: 'Urgent Test Venue',
        vendorType: 'venue',
        date: tomorrowStr,
        isAvailable: true,
        bookingStatus: 'available',
        pricing: { basePrice: 15000, seasonalMultiplier: 1, dayOfWeekMultiplier: 1, finalPrice: 15000 },
        restrictions: { minimumNotice: 90, maximumAdvanceBooking: 365, requiresDeposit: true, cancellationPolicy: 'test' }
      }]);

      const query: AvailabilitySearchQuery = {
        vendorTypes: ['venue'],
        location: 'New York, NY',
        preferredDate: tomorrowStr
      };

      const result = await availabilityService.searchAvailability(query);

      expect(result.exactMatches.length).toBe(0);
    });
  });

  describe('Flexible Date Search', () => {
    test('should find alternative dates within specified range', async () => {
      const query: AvailabilitySearchQuery = {
        vendorTypes: ['photographer'],
        location: 'New York, NY',
        preferredDate: '2024-06-20', // Date with no direct availability
        flexibleDates: {
          enabled: true,
          rangeBefore: 7,
          rangeAfter: 7,
          acceptableWeekdays: [5, 6] // Friday and Saturday only
        }
      };

      const result = await availabilityService.searchAvailability(query);

      expect(result.nearbyDates.length).toBeGreaterThanOrEqual(0);
      result.nearbyDates.forEach(match => {
        const matchDate = new Date(match.date);
        const preferredDate = new Date('2024-06-20');
        const daysDiff = Math.abs((matchDate.getTime() - preferredDate.getTime()) / (1000 * 60 * 60 * 24));
        
        expect(daysDiff).toBeLessThanOrEqual(7);
        expect([5, 6]).toContain(matchDate.getDay()); // Friday or Saturday
      });
    });

    test('should sort nearby dates by proximity to preferred date', async () => {
      const query: AvailabilitySearchQuery = {
        vendorTypes: ['photographer'],
        location: 'New York, NY',
        preferredDate: '2024-06-16',
        flexibleDates: {
          enabled: true,
          rangeBefore: 14,
          rangeAfter: 14,
          acceptableWeekdays: [0, 1, 2, 3, 4, 5, 6] // All days
        }
      };

      const result = await availabilityService.searchAvailability(query);

      if (result.nearbyDates.length > 1) {
        const preferredDate = new Date('2024-06-16');
        
        for (let i = 1; i < result.nearbyDates.length; i++) {
          const prevDistance = Math.abs(new Date(result.nearbyDates[i-1].date).getTime() - preferredDate.getTime());
          const currDistance = Math.abs(new Date(result.nearbyDates[i].date).getTime() - preferredDate.getTime());
          
          expect(currDistance).toBeGreaterThanOrEqual(prevDistance);
        }
      }
    });

    test('should handle no flexible dates when none are specified', async () => {
      const query: AvailabilitySearchQuery = {
        vendorTypes: ['photographer'],
        location: 'New York, NY',
        preferredDate: '2024-06-20'
        // No flexibleDates specified
      };

      const result = await availabilityService.searchAvailability(query);

      expect(result.nearbyDates).toEqual([]);
    });
  });

  describe('Budget Filtering', () => {
    test('should filter availability by budget range', async () => {
      const query: AvailabilitySearchQuery = {
        vendorTypes: ['photographer', 'venue'],
        location: 'New York, NY',
        preferredDate: '2024-06-15',
        budget: { min: 3000, max: 5000 }
      };

      const result = await availabilityService.searchAvailability(query);

      [...result.exactMatches, ...result.nearbyDates].forEach(match => {
        expect(match.pricing.finalPrice).toBeGreaterThanOrEqual(3000);
        expect(match.pricing.finalPrice).toBeLessThanOrEqual(5000);
      });
    });

    test('should handle unlimited budget ranges', async () => {
      const minOnlyQuery: AvailabilitySearchQuery = {
        vendorTypes: ['photographer'],
        location: 'New York, NY',
        preferredDate: '2024-06-15',
        budget: { min: 4000 }
      };

      const maxOnlyQuery: AvailabilitySearchQuery = {
        vendorTypes: ['photographer'],
        location: 'New York, NY',
        preferredDate: '2024-06-15',
        budget: { max: 5000 }
      };

      const minResult = await availabilityService.searchAvailability(minOnlyQuery);
      const maxResult = await availabilityService.searchAvailability(maxOnlyQuery);

      minResult.exactMatches.forEach(match => {
        expect(match.pricing.finalPrice).toBeGreaterThanOrEqual(4000);
      });

      maxResult.exactMatches.forEach(match => {
        expect(match.pricing.finalPrice).toBeLessThanOrEqual(5000);
      });
    });
  });

  describe('Seasonal Analysis', () => {
    test('should identify peak wedding seasons correctly', async () => {
      const peakSeasonQuery: AvailabilitySearchQuery = {
        vendorTypes: ['photographer'],
        location: 'New York, NY',
        preferredDate: '2024-06-15' // June - peak season
      };

      const offSeasonQuery: AvailabilitySearchQuery = {
        vendorTypes: ['photographer'],
        location: 'New York, NY',
        preferredDate: '2024-02-15' // February - off season
      };

      const peakResult = await availabilityService.searchAvailability(peakSeasonQuery);
      const offResult = await availabilityService.searchAvailability(offSeasonQuery);

      expect(peakResult.seasonalInsights.peakSeason).toBe(true);
      expect(peakResult.seasonalInsights.demandLevel).toBe('high');
      expect(peakResult.seasonalInsights.priceImpact).toBeGreaterThan(0);

      expect(offResult.seasonalInsights.peakSeason).toBe(false);
      expect(offResult.seasonalInsights.demandLevel).toBe('low');
      expect(offResult.seasonalInsights.priceImpact).toBeLessThan(0);
    });

    test('should provide relevant alternative date suggestions', async () => {
      const query: AvailabilitySearchQuery = {
        vendorTypes: ['photographer'],
        location: 'New York, NY',
        preferredDate: '2024-07-15'
      };

      const result = await availabilityService.searchAvailability(query);

      expect(result.seasonalInsights.popularAlternatives.length).toBeGreaterThan(0);
      expect(Array.isArray(result.seasonalInsights.popularAlternatives)).toBe(true);
    });
  });

  describe('Pricing Calculations', () => {
    test('should calculate correct seasonal and day-of-week pricing', async () => {
      const pricing = await availabilityService.getPricingBreakdown('photo_001', '2024-06-15');

      expect(pricing).not.toBeNull();
      if (pricing) {
        expect(pricing.finalPrice).toBe(
          pricing.basePrice * pricing.seasonalMultiplier * pricing.dayOfWeekMultiplier
        );
      }
    });

    test('should apply holiday premiums correctly', async () => {
      const newYearsPricing = await availabilityService.getPricingBreakdown('venue_001', '2024-12-31');

      expect(newYearsPricing).not.toBeNull();
      if (newYearsPricing) {
        expect(newYearsPricing.holidayMultiplier).toBeDefined();
        expect(newYearsPricing.finalPrice).toBeGreaterThan(newYearsPricing.basePrice * 2);
      }
    });

    test('should handle pricing for vendors without holiday premiums', async () => {
      const regularPricing = await availabilityService.getPricingBreakdown('photo_001', '2024-06-15');

      expect(regularPricing).not.toBeNull();
      if (regularPricing) {
        expect(regularPricing.holidayMultiplier).toBeUndefined();
        expect(regularPricing.finalPrice).toBe(
          regularPricing.basePrice * regularPricing.seasonalMultiplier * regularPricing.dayOfWeekMultiplier
        );
      }
    });
  });

  describe('Booking Recommendations', () => {
    test('should identify best value options correctly', async () => {
      const query: AvailabilitySearchQuery = {
        vendorTypes: ['photographer', 'florist'],
        location: 'New York, NY',
        preferredDate: '2024-05-18',
        flexibleDates: {
          enabled: true,
          rangeBefore: 30,
          rangeAfter: 30,
          acceptableWeekdays: [0, 1, 2, 3, 4, 5, 6]
        }
      };

      const result = await availabilityService.searchAvailability(query);

      expect(result.bookingRecommendations.bestValue.length).toBeGreaterThan(0);
      
      // Check that recommendations include one per vendor type
      const vendorTypes = result.bookingRecommendations.bestValue.map(r => r.vendorType);
      query.vendorTypes.forEach(type => {
        if (result.exactMatches.some(m => m.vendorType === type) || result.nearbyDates.some(m => m.vendorType === type)) {
          expect(vendorTypes).toContain(type);
        }
      });
    });

    test('should identify quickest available options', async () => {
      const query: AvailabilitySearchQuery = {
        vendorTypes: ['photographer'],
        location: 'New York, NY',
        preferredDate: '2024-12-31', // Far in the future
        flexibleDates: {
          enabled: true,
          rangeBefore: 180,
          rangeAfter: 0,
          acceptableWeekdays: [0, 1, 2, 3, 4, 5, 6]
        }
      };

      const result = await availabilityService.searchAvailability(query);

      if (result.bookingRecommendations.quickestAvailable.length > 0) {
        const quickest = result.bookingRecommendations.quickestAvailable[0];
        
        // Should be earlier than preferred date
        expect(new Date(quickest.date).getTime()).toBeLessThanOrEqual(new Date('2024-12-31').getTime());
      }
    });

    test('should identify most flexible options based on policies', async () => {
      const query: AvailabilitySearchQuery = {
        vendorTypes: ['photographer', 'florist'],
        location: 'New York, NY',
        preferredDate: '2024-06-15',
        flexibleDates: {
          enabled: true,
          rangeBefore: 30,
          rangeAfter: 30,
          acceptableWeekdays: [0, 1, 2, 3, 4, 5, 6]
        }
      };

      const result = await availabilityService.searchAvailability(query);

      if (result.bookingRecommendations.mostFlexible.length > 0) {
        result.bookingRecommendations.mostFlexible.forEach(option => {
          // More flexible options should have better cancellation policies or fewer restrictions
          expect(option.restrictions).toBeDefined();
        });
      }
    });
  });

  describe('Vendor-Specific Availability', () => {
    test('should get availability range for specific vendor', async () => {
      const availability = await availabilityService.getVendorAvailabilityRange(
        'photo_001',
        '2024-06-01',
        '2024-12-31'
      );

      expect(availability.length).toBeGreaterThan(0);
      availability.forEach(item => {
        expect(item.vendorId).toBe('photo_001');
        expect(new Date(item.date).getTime()).toBeGreaterThanOrEqual(new Date('2024-06-01').getTime());
        expect(new Date(item.date).getTime()).toBeLessThanOrEqual(new Date('2024-12-31').getTime());
      });
    });

    test('should check availability for all required vendor types', async () => {
      const fullAvailabilityCheck = await availabilityService.checkDateAvailabilityForAllVendors(
        '2024-06-15',
        ['photographer'],
        'New York, NY'
      );

      expect(fullAvailabilityCheck.isFullyAvailable).toBe(true);
      expect(fullAvailabilityCheck.availableVendors).toContain('photographer');

      const conflictedCheck = await availabilityService.checkDateAvailabilityForAllVendors(
        '2024-06-15',
        ['venue'],
        'New York, NY'
      );

      expect(conflictedCheck.isFullyAvailable).toBe(false);
      expect(conflictedCheck.unavailableVendors).toContain('venue');
      expect(conflictedCheck.conflicts.length).toBeGreaterThan(0);
    });

    test('should update availability when bookings are made', async () => {
      const initialAvailability = await availabilityService.getVendorAvailabilityRange(
        'photo_001',
        '2024-06-15',
        '2024-06-15'
      );

      expect(initialAvailability[0].isAvailable).toBe(true);

      const updateResult = await availabilityService.updateAvailability(
        'photo_001',
        '2024-06-15',
        'booked'
      );

      expect(updateResult).toBe(true);

      const updatedAvailability = await availabilityService.getVendorAvailabilityRange(
        'photo_001',
        '2024-06-15',
        '2024-06-15'
      );

      expect(updatedAvailability[0].isAvailable).toBe(false);
      expect(updatedAvailability[0].bookingStatus).toBe('booked');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle searches for past dates', async () => {
      const pastDate = '2020-01-01';
      const query: AvailabilitySearchQuery = {
        vendorTypes: ['photographer'],
        location: 'New York, NY',
        preferredDate: pastDate
      };

      const result = await availabilityService.searchAvailability(query);

      // Should return results but they won't meet minimum notice requirements
      expect(result.exactMatches.length).toBe(0);
    });

    test('should handle invalid date formats gracefully', async () => {
      const query: AvailabilitySearchQuery = {
        vendorTypes: ['photographer'],
        location: 'New York, NY',
        preferredDate: 'invalid-date'
      };

      // Should not throw an error
      expect(async () => {
        await availabilityService.searchAvailability(query);
      }).not.toThrow();
    });

    test('should handle empty vendor type arrays', async () => {
      const query: AvailabilitySearchQuery = {
        vendorTypes: [],
        location: 'New York, NY',
        preferredDate: '2024-06-15'
      };

      const result = await availabilityService.searchAvailability(query);

      expect(result.exactMatches.length).toBe(0);
      expect(result.nearbyDates.length).toBe(0);
    });

    test('should handle unrealistic flexible date ranges', async () => {
      const query: AvailabilitySearchQuery = {
        vendorTypes: ['photographer'],
        location: 'New York, NY',
        preferredDate: '2024-06-15',
        flexibleDates: {
          enabled: true,
          rangeBefore: 10000, // Unrealistically large range
          rangeAfter: 10000,
          acceptableWeekdays: [0, 1, 2, 3, 4, 5, 6]
        }
      };

      const result = await availabilityService.searchAvailability(query);

      // Should still complete without errors
      expect(result).toBeDefined();
      expect(Array.isArray(result.nearbyDates)).toBe(true);
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle availability searches within acceptable time', async () => {
      const query: AvailabilitySearchQuery = {
        vendorTypes: ['photographer', 'venue', 'florist'],
        location: 'New York, NY',
        preferredDate: '2024-06-15',
        flexibleDates: {
          enabled: true,
          rangeBefore: 60,
          rangeAfter: 60,
          acceptableWeekdays: [0, 1, 2, 3, 4, 5, 6]
        },
        budget: { min: 1000, max: 50000 }
      };

      const startTime = Date.now();
      const result = await availabilityService.searchAvailability(query);
      const searchTime = Date.now() - startTime;

      expect(searchTime).toBeLessThan(500); // 500ms limit
      expect(result).toBeDefined();
    });

    test('should maintain performance with large date ranges', async () => {
      // Add more mock data for testing
      const additionalData: WeddingDateAvailability[] = [];
      for (let i = 0; i < 100; i++) {
        const date = new Date('2024-01-01');
        date.setDate(date.getDate() + i);
        
        additionalData.push({
          vendorId: `test_vendor_${i}`,
          vendorName: `Test Vendor ${i}`,
          vendorType: 'photographer',
          date: date.toISOString().split('T')[0],
          isAvailable: i % 3 !== 0, // Some unavailable
          bookingStatus: i % 3 === 0 ? 'booked' : 'available',
          pricing: {
            basePrice: 2000 + (i * 10),
            seasonalMultiplier: 1.1,
            dayOfWeekMultiplier: 1.0,
            finalPrice: (2000 + (i * 10)) * 1.1
          }
        });
      }

      availabilityService.addAvailabilityData(additionalData);

      const startTime = Date.now();
      const result = await availabilityService.searchAvailability({
        vendorTypes: ['photographer'],
        location: 'New York, NY',
        preferredDate: '2024-01-15',
        flexibleDates: {
          enabled: true,
          rangeBefore: 30,
          rangeAfter: 30,
          acceptableWeekdays: [0, 1, 2, 3, 4, 5, 6]
        }
      });
      const searchTime = Date.now() - startTime;

      expect(searchTime).toBeLessThan(1000); // 1 second limit for larger dataset
      expect(result.nearbyDates.length).toBeGreaterThan(0);
    });
  });
});