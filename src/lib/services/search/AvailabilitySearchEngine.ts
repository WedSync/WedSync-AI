/**
 * AvailabilitySearchEngine - Advanced availability matching for wedding vendors
 *
 * Handles complex availability matching, date range analysis, and booking optimization
 * for wedding vendors. Includes seasonal considerations, multi-day events, and
 * intelligent conflict resolution.
 *
 * Key Features:
 * - Real-time availability checking with buffer zones
 * - Seasonal pricing and demand analysis
 * - Multi-day wedding event coordination
 * - Travel time and setup considerations
 * - Intelligent overbooking prevention
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

// Availability Types
interface AvailabilityRequest {
  startDate: string;
  endDate?: string;
  vendorTypes?: string[];
  location?: {
    lat: number;
    lng: number;
    radius?: number;
  };
  eventType?: 'ceremony' | 'reception' | 'full_day' | 'engagement';
  urgency?: 'immediate' | 'flexible' | 'planning';
  budgetRange?: {
    min: number;
    max: number;
  };
}

interface AvailabilityResult {
  vendorId: string;
  availabilityScore: number;
  conflicts: Conflict[];
  alternativeDates: Date[];
  pricingFactors: PricingFactor[];
  bookingRecommendation: BookingRecommendation;
  seasonalConsiderations: SeasonalFactor[];
}

interface Conflict {
  type: 'hard' | 'soft' | 'travel';
  date: string;
  description: string;
  severity: number;
  resolution?: string;
}

interface PricingFactor {
  factor: string;
  multiplier: number;
  impact: 'positive' | 'negative' | 'neutral';
  description: string;
}

interface BookingRecommendation {
  urgency: 'book_immediately' | 'book_soon' | 'flexible' | 'wait';
  reasoning: string;
  alternativeVendors: string[];
  priceExpectation: 'lower' | 'market' | 'premium';
}

interface SeasonalFactor {
  season: 'peak' | 'shoulder' | 'off';
  demandLevel: number;
  priceImpact: number;
  availabilityImpact: number;
  recommendations: string[];
}

interface BookingWindow {
  start: Date;
  end: Date;
  type: 'ceremony' | 'reception' | 'setup' | 'breakdown' | 'travel';
  bufferMinutes: number;
}

export class AvailabilitySearchEngine {
  private supabase;

  constructor() {
    this.supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }

  /**
   * Main availability search method
   * Analyzes vendor availability with sophisticated conflict detection
   */
  async searchAvailability(
    request: AvailabilityRequest,
  ): Promise<AvailabilityResult[]> {
    console.log('🔍 Starting availability search:', request);

    try {
      // Get available vendors in the area
      const vendors = await this.findVendorsInArea(request);

      // Analyze availability for each vendor
      const availabilityPromises = vendors.map((vendor) =>
        this.analyzeVendorAvailability(vendor, request),
      );

      const results = await Promise.all(availabilityPromises);

      // Sort by availability score and apply intelligent ranking
      const rankedResults = this.rankByAvailability(results, request);

      console.log(`✅ Found ${rankedResults.length} available vendors`);
      return rankedResults;
    } catch (error) {
      console.error('❌ Availability search failed:', error);
      throw new Error(
        `Availability search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Find vendors in the specified area
   */
  private async findVendorsInArea(request: AvailabilityRequest) {
    const query = this.supabase
      .from('vendors')
      .select(
        `
        id,
        business_name,
        vendor_type,
        location,
        base_price,
        service_area,
        booking_settings,
        availability_calendar
      `,
      )
      .eq('status', 'active');

    // Filter by vendor types if specified
    if (request.vendorTypes?.length) {
      query.in('vendor_type', request.vendorTypes);
    }

    const { data: vendors, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch vendors: ${error.message}`);
    }

    return vendors || [];
  }

  /**
   * Analyze availability for a specific vendor
   */
  private async analyzeVendorAvailability(
    vendor: any,
    request: AvailabilityRequest,
  ): Promise<AvailabilityResult> {
    // Get vendor's existing bookings
    const existingBookings = await this.getVendorBookings(
      vendor.id,
      request.startDate,
      request.endDate,
    );

    // Calculate booking windows with setup/breakdown time
    const requiredWindows = this.calculateBookingWindows(request, vendor);

    // Detect conflicts
    const conflicts = this.detectConflicts(existingBookings, requiredWindows);

    // Calculate availability score
    const availabilityScore = this.calculateAvailabilityScore(
      conflicts,
      vendor,
      request,
    );

    // Generate alternative dates if conflicts exist
    const alternativeDates =
      conflicts.length > 0
        ? await this.generateAlternativeDates(vendor, request)
        : [];

    // Analyze pricing factors
    const pricingFactors = this.analyzePricingFactors(vendor, request);

    // Generate booking recommendation
    const bookingRecommendation = this.generateBookingRecommendation(
      availabilityScore,
      conflicts,
      pricingFactors,
      vendor,
    );

    // Analyze seasonal considerations
    const seasonalConsiderations = this.analyzeSeasonalFactors(
      request.startDate,
    );

    return {
      vendorId: vendor.id,
      availabilityScore,
      conflicts,
      alternativeDates,
      pricingFactors,
      bookingRecommendation,
      seasonalConsiderations,
    };
  }

  /**
   * Get vendor's existing bookings for date range
   */
  private async getVendorBookings(
    vendorId: string,
    startDate: string,
    endDate?: string,
  ) {
    const endDateQuery = endDate || startDate;

    const { data: bookings, error } = await this.supabase
      .from('vendor_bookings')
      .select('*')
      .eq('vendor_id', vendorId)
      .gte('event_date', startDate)
      .lte('event_date', endDateQuery)
      .eq('status', 'confirmed');

    if (error) {
      console.warn('Failed to fetch vendor bookings:', error);
      return [];
    }

    return bookings || [];
  }

  /**
   * Calculate required booking windows with setup/breakdown time
   */
  private calculateBookingWindows(
    request: AvailabilityRequest,
    vendor: any,
  ): BookingWindow[] {
    const startDate = new Date(request.startDate);
    const endDate = request.endDate ? new Date(request.endDate) : startDate;

    const windows: BookingWindow[] = [];

    // Setup time based on vendor type
    const setupTimes = {
      photographer: 60, // 1 hour setup
      videographer: 90, // 1.5 hours setup
      florist: 180, // 3 hours setup
      caterer: 240, // 4 hours setup
      band: 120, // 2 hours setup
      dj: 60, // 1 hour setup
      venue: 0, // No additional setup
      default: 90, // 1.5 hours default
    };

    const setupMinutes =
      setupTimes[vendor.vendor_type as keyof typeof setupTimes] ||
      setupTimes.default;

    // Main event window
    windows.push({
      start: new Date(startDate.getTime() - setupMinutes * 60000),
      end: new Date(endDate.getTime() + 60 * 60000), // 1 hour breakdown
      type: request.eventType || 'full_day',
      bufferMinutes: 30,
    });

    // Travel time buffer for non-venue vendors
    if (vendor.vendor_type !== 'venue' && request.location) {
      const travelBuffer = this.calculateTravelTime(
        vendor.location,
        request.location,
      );
      windows[0].start = new Date(
        windows[0].start.getTime() - travelBuffer * 60000,
      );
    }

    return windows;
  }

  /**
   * Calculate travel time between locations
   */
  private calculateTravelTime(vendorLocation: any, eventLocation: any): number {
    // Simplified travel time calculation (would use Google Maps API in production)
    const distance = this.calculateDistance(
      vendorLocation.lat,
      vendorLocation.lng,
      eventLocation.lat,
      eventLocation.lng,
    );

    // Assume 30 mph average with city driving
    const travelTimeMinutes = (distance / 30) * 60;

    // Add buffer based on distance
    const buffer = distance > 20 ? 30 : 15; // Extra buffer for long distances

    return Math.ceil(travelTimeMinutes + buffer);
  }

  /**
   * Calculate distance between two coordinates
   */
  private calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const R = 3959; // Earth's radius in miles
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Detect conflicts with existing bookings
   */
  private detectConflicts(
    existingBookings: any[],
    requiredWindows: BookingWindow[],
  ): Conflict[] {
    const conflicts: Conflict[] = [];

    for (const window of requiredWindows) {
      for (const booking of existingBookings) {
        const bookingStart = new Date(booking.event_date);
        const bookingEnd = new Date(booking.event_end || booking.event_date);

        // Check for overlap
        if (
          this.windowsOverlap(window, { start: bookingStart, end: bookingEnd })
        ) {
          const conflictType = this.determineConflictType(window, booking);

          conflicts.push({
            type: conflictType,
            date: booking.event_date,
            description: `Conflict with existing ${booking.event_type} booking`,
            severity: this.calculateConflictSeverity(
              conflictType,
              window,
              booking,
            ),
            resolution: this.suggestConflictResolution(
              conflictType,
              window,
              booking,
            ),
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Check if two time windows overlap
   */
  private windowsOverlap(
    window1: { start: Date; end: Date },
    window2: { start: Date; end: Date },
  ): boolean {
    return window1.start < window2.end && window1.end > window2.start;
  }

  /**
   * Determine the type of conflict
   */
  private determineConflictType(
    window: BookingWindow,
    booking: any,
  ): 'hard' | 'soft' | 'travel' {
    // Hard conflict: direct overlap with event time
    if (window.type === 'ceremony' || window.type === 'reception') {
      return 'hard';
    }

    // Travel conflict: insufficient travel time
    if (window.type === 'travel') {
      return 'travel';
    }

    // Soft conflict: setup/breakdown overlap (potentially resolvable)
    return 'soft';
  }

  /**
   * Calculate conflict severity (0-10 scale)
   */
  private calculateConflictSeverity(
    type: string,
    window: BookingWindow,
    booking: any,
  ): number {
    const baseScores = {
      hard: 10, // Impossible to resolve
      travel: 7, // Difficult but potentially resolvable
      soft: 4, // Often resolvable with adjustments
    };

    let severity = baseScores[type as keyof typeof baseScores] || 5;

    // Adjust based on booking type importance
    if (booking.event_type === 'wedding') {
      severity = Math.min(10, severity + 2);
    }

    return severity;
  }

  /**
   * Suggest resolution for conflicts
   */
  private suggestConflictResolution(
    type: string,
    window: BookingWindow,
    booking: any,
  ): string {
    switch (type) {
      case 'hard':
        return 'Choose alternative date or different vendor';
      case 'travel':
        return 'Allow additional travel time or hire local assistant';
      case 'soft':
        return 'Adjust setup/breakdown schedule with venue coordination';
      default:
        return 'Contact vendor to discuss scheduling options';
    }
  }

  /**
   * Calculate overall availability score
   */
  private calculateAvailabilityScore(
    conflicts: Conflict[],
    vendor: any,
    request: AvailabilityRequest,
  ): number {
    let score = 100;

    // Deduct points for conflicts
    for (const conflict of conflicts) {
      score -= conflict.severity * 5;
    }

    // Bonus for perfect availability
    if (conflicts.length === 0) {
      score += 20;
    }

    // Adjust for vendor reliability
    if (vendor.reliability_score) {
      score = score * (vendor.reliability_score / 100);
    }

    // Adjust for response time
    if (vendor.avg_response_time_hours <= 2) {
      score += 10;
    } else if (vendor.avg_response_time_hours > 24) {
      score -= 10;
    }

    // Seasonal adjustment
    const seasonalFactor = this.getSeasonalAvailabilityFactor(
      request.startDate,
    );
    score = score * seasonalFactor;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Get seasonal availability factor
   */
  private getSeasonalAvailabilityFactor(dateString: string): number {
    const date = new Date(dateString);
    const month = date.getMonth() + 1;

    // Wedding season peaks
    if ([5, 6, 7, 8, 9, 10].includes(month)) {
      // May-October
      return 0.8; // Reduced availability during peak season
    } else if ([11, 12, 1, 2].includes(month)) {
      // Nov-Feb
      return 1.2; // Better availability during off-season
    } else {
      return 1.0; // Shoulder season
    }
  }

  /**
   * Generate alternative dates when conflicts exist
   */
  private async generateAlternativeDates(
    vendor: any,
    request: AvailabilityRequest,
  ): Promise<Date[]> {
    const alternatives: Date[] = [];
    const requestDate = new Date(request.startDate);

    // Check dates within 30 days before and after
    for (let i = -30; i <= 30; i++) {
      if (i === 0) continue; // Skip original date

      const alternativeDate = new Date(requestDate);
      alternativeDate.setDate(requestDate.getDate() + i);

      // Skip if not a weekend for weddings
      if (
        request.eventType !== 'engagement' &&
        alternativeDate.getDay() !== 0 &&
        alternativeDate.getDay() !== 6
      ) {
        continue;
      }

      // Check if this date is available
      const bookings = await this.getVendorBookings(
        vendor.id,
        alternativeDate.toISOString().split('T')[0],
      );

      if (bookings.length === 0) {
        alternatives.push(alternativeDate);

        if (alternatives.length >= 5) break; // Limit to 5 alternatives
      }
    }

    return alternatives.sort((a, b) => {
      // Prefer dates closer to original
      const diffA = Math.abs(a.getTime() - requestDate.getTime());
      const diffB = Math.abs(b.getTime() - requestDate.getTime());
      return diffA - diffB;
    });
  }

  /**
   * Analyze pricing factors affecting availability
   */
  private analyzePricingFactors(
    vendor: any,
    request: AvailabilityRequest,
  ): PricingFactor[] {
    const factors: PricingFactor[] = [];
    const requestDate = new Date(request.startDate);
    const month = requestDate.getMonth() + 1;

    // Seasonal pricing
    if ([6, 7, 8, 9].includes(month)) {
      factors.push({
        factor: 'Peak Season',
        multiplier: 1.3,
        impact: 'negative',
        description: 'Summer wedding season premium (30% increase)',
      });
    } else if ([12, 1, 2].includes(month)) {
      factors.push({
        factor: 'Off Season Discount',
        multiplier: 0.8,
        impact: 'positive',
        description: 'Winter wedding discount (20% reduction)',
      });
    }

    // Day of week pricing
    const dayOfWeek = requestDate.getDay();
    if (dayOfWeek === 6) {
      // Saturday
      factors.push({
        factor: 'Saturday Premium',
        multiplier: 1.2,
        impact: 'negative',
        description: 'Premium for most popular wedding day',
      });
    } else if (dayOfWeek === 0) {
      // Sunday
      factors.push({
        factor: 'Sunday Discount',
        multiplier: 0.9,
        impact: 'positive',
        description: 'Discount for Sunday weddings',
      });
    } else {
      factors.push({
        factor: 'Weekday Discount',
        multiplier: 0.7,
        impact: 'positive',
        description: 'Significant discount for weekday weddings',
      });
    }

    // Urgency pricing
    const daysToEvent =
      (requestDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    if (daysToEvent < 30) {
      factors.push({
        factor: 'Rush Order Premium',
        multiplier: 1.25,
        impact: 'negative',
        description: 'Premium for bookings less than 30 days out',
      });
    } else if (daysToEvent > 365) {
      factors.push({
        factor: 'Early Bird Discount',
        multiplier: 0.9,
        impact: 'positive',
        description: 'Discount for bookings over a year in advance',
      });
    }

    return factors;
  }

  /**
   * Generate booking recommendation
   */
  private generateBookingRecommendation(
    availabilityScore: number,
    conflicts: Conflict[],
    pricingFactors: PricingFactor[],
    vendor: any,
  ): BookingRecommendation {
    if (availabilityScore >= 80 && conflicts.length === 0) {
      return {
        urgency: 'book_immediately',
        reasoning:
          'Perfect availability with no conflicts. This vendor may book quickly.',
        alternativeVendors: [],
        priceExpectation: 'market',
      };
    }

    if (
      availabilityScore >= 60 &&
      conflicts.filter((c) => c.type === 'hard').length === 0
    ) {
      return {
        urgency: 'book_soon',
        reasoning:
          'Good availability with minor conflicts that can likely be resolved.',
        alternativeVendors: [],
        priceExpectation: this.determinePriceExpectation(pricingFactors),
      };
    }

    if (availabilityScore >= 40) {
      return {
        urgency: 'flexible',
        reasoning:
          'Limited availability. Consider alternative dates or backup vendors.',
        alternativeVendors: await this.getSimilarVendors(vendor),
        priceExpectation: this.determinePriceExpectation(pricingFactors),
      };
    }

    return {
      urgency: 'wait',
      reasoning:
        'Poor availability with major conflicts. Recommend finding alternative vendors.',
      alternativeVendors: await this.getSimilarVendors(vendor),
      priceExpectation: 'lower',
    };
  }

  /**
   * Determine price expectation based on factors
   */
  private determinePriceExpectation(
    factors: PricingFactor[],
  ): 'lower' | 'market' | 'premium' {
    const totalMultiplier = factors.reduce(
      (acc, factor) => acc * factor.multiplier,
      1,
    );

    if (totalMultiplier > 1.15) return 'premium';
    if (totalMultiplier < 0.85) return 'lower';
    return 'market';
  }

  /**
   * Get similar vendors as alternatives
   */
  private async getSimilarVendors(vendor: any): Promise<string[]> {
    const { data: similarVendors } = await this.supabase
      .from('vendors')
      .select('id')
      .eq('vendor_type', vendor.vendor_type)
      .neq('id', vendor.id)
      .eq('status', 'active')
      .limit(3);

    return similarVendors?.map((v) => v.id) || [];
  }

  /**
   * Analyze seasonal factors
   */
  private analyzeSeasonalFactors(dateString: string): SeasonalFactor[] {
    const date = new Date(dateString);
    const month = date.getMonth() + 1;

    if ([6, 7, 8, 9].includes(month)) {
      return [
        {
          season: 'peak',
          demandLevel: 9,
          priceImpact: 1.3,
          availabilityImpact: 0.7,
          recommendations: [
            'Book 12-18 months in advance',
            'Consider weekday weddings for better availability',
            'Be flexible with vendor choices',
            'Expect premium pricing',
          ],
        },
      ];
    }

    if ([12, 1, 2, 3].includes(month)) {
      return [
        {
          season: 'off',
          demandLevel: 3,
          priceImpact: 0.8,
          availabilityImpact: 1.3,
          recommendations: [
            'Excellent vendor availability',
            'Significant cost savings available',
            'Weather considerations for outdoor events',
            'Holiday conflicts in December',
          ],
        },
      ];
    }

    return [
      {
        season: 'shoulder',
        demandLevel: 6,
        priceImpact: 1.0,
        availabilityImpact: 1.0,
        recommendations: [
          'Good balance of availability and pricing',
          'Book 6-9 months in advance',
          'Weather generally favorable',
          'Moderate competition for vendors',
        ],
      },
    ];
  }

  /**
   * Rank results by availability with intelligent sorting
   */
  private rankByAvailability(
    results: AvailabilityResult[],
    request: AvailabilityRequest,
  ): AvailabilityResult[] {
    return results.sort((a, b) => {
      // Primary sort: availability score
      if (a.availabilityScore !== b.availabilityScore) {
        return b.availabilityScore - a.availabilityScore;
      }

      // Secondary sort: fewer conflicts
      if (a.conflicts.length !== b.conflicts.length) {
        return a.conflicts.length - b.conflicts.length;
      }

      // Tertiary sort: urgency of booking recommendation
      const urgencyOrder = {
        book_immediately: 0,
        book_soon: 1,
        flexible: 2,
        wait: 3,
      };
      const aUrgency = urgencyOrder[a.bookingRecommendation.urgency];
      const bUrgency = urgencyOrder[b.bookingRecommendation.urgency];

      return aUrgency - bUrgency;
    });
  }

  /**
   * Batch availability check for multiple vendors
   */
  async batchAvailabilityCheck(
    vendorIds: string[],
    request: AvailabilityRequest,
  ): Promise<Map<string, AvailabilityResult>> {
    const results = new Map<string, AvailabilityResult>();

    // Process in chunks to avoid overwhelming the database
    const chunkSize = 10;
    for (let i = 0; i < vendorIds.length; i += chunkSize) {
      const chunk = vendorIds.slice(i, i + chunkSize);

      const chunkPromises = chunk.map(async (vendorId) => {
        try {
          const { data: vendor } = await this.supabase
            .from('vendors')
            .select('*')
            .eq('id', vendorId)
            .single();

          if (vendor) {
            const availability = await this.analyzeVendorAvailability(
              vendor,
              request,
            );
            results.set(vendorId, availability);
          }
        } catch (error) {
          console.error(
            `Failed to check availability for vendor ${vendorId}:`,
            error,
          );
        }
      });

      await Promise.all(chunkPromises);
    }

    return results;
  }
}
