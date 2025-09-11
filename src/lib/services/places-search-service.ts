/**
 * Places Search Service - Wedding Venue Business Logic
 * Team B - WS-219 Google Places Integration
 *
 * High-level service for wedding venue search with:
 * - Wedding-specific filtering and scoring
 * - Venue categorization and recommendations
 * - Duplicate detection and result merging
 * - Search analytics and optimization
 */

import { GooglePlacesClient } from '@/lib/integrations/google-places-client';
import {
  GooglePlaceResult,
  GooglePlaceDetailsResult,
  WeddingVenueSearchResponse,
  WeddingVenuePreferences,
  WeddingSuitabilityScore,
  GooglePlacesSearchRequest,
  VenueCapacityEstimate,
} from '@/types/google-places';
import { createClient } from '@supabase/supabase-js';

interface SearchFilters {
  weddingTypes?: string[];
  maxDistance?: number;
  priceRange?: { min: number; max: number };
  minimumRating?: number;
  requiredAmenities?: string[];
  guestCountRange?: { min: number; max: number };
}

interface SearchAnalytics {
  searchQuery: string;
  totalResults: number;
  apiCallsUsed: number;
  cacheHits: number;
  searchTimeMs: number;
  filterCriteria: SearchFilters;
  organizationId: string;
  userId?: string;
}

export class PlacesSearchService {
  private client: GooglePlacesClient;
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
      (() => {
        throw new Error(
          'Missing environment variable: NEXT_PUBLIC_SUPABASE_URL',
        );
      })(),
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
      (() => {
        throw new Error(
          'Missing environment variable: SUPABASE_SERVICE_ROLE_KEY',
        );
      })(),
  );

  constructor(client: GooglePlacesClient) {
    this.client = client;
  }

  /**
   * Comprehensive wedding venue search with filtering and enhancements
   */
  async searchWeddingVenues(
    query: string,
    location?: { lat: number; lng: number },
    filters: SearchFilters = {},
    preferences?: WeddingVenuePreferences,
  ): Promise<WeddingVenueSearchResponse> {
    const startTime = Date.now();
    let apiCallsUsed = 0;
    let cacheHits = 0;

    try {
      // Build search request with wedding-specific enhancements
      const searchRequest: GooglePlacesSearchRequest = {
        query: this.enhanceSearchQuery(query, filters),
        type: 'text_search',
        location,
        radius: filters.maxDistance || 50000, // 50km default
        placeTypes: filters.weddingTypes || this.getDefaultWeddingTypes(),
        language: 'en',
        region: 'GB',
      };

      // Execute search
      const searchResponse = await this.client.searchPlaces(searchRequest);
      apiCallsUsed++;

      if (searchResponse.status !== 'OK') {
        throw new Error(`Search failed: ${searchResponse.error_message}`);
      }

      // Filter and enhance results
      let venues = await this.filterAndEnhanceResults(
        searchResponse.results,
        filters,
        preferences,
        location,
      );

      // Remove duplicates and sort by relevance
      venues = this.deduplicateVenues(venues);
      venues = this.sortVenuesByRelevance(venues, preferences);

      // Generate recommendations
      const recommendations = this.generateRecommendations(venues, preferences);

      const response: WeddingVenueSearchResponse = {
        venues: venues.slice(0, 20), // Limit to top 20 results
        search_metadata: {
          query,
          location,
          radius_km: filters.maxDistance ? filters.maxDistance / 1000 : 50,
          total_results: venues.length,
          api_calls_used: apiCallsUsed,
          search_time_ms: Date.now() - startTime,
          cache_hits: cacheHits,
          wedding_filter_applied: true,
        },
        recommendations,
      };

      // Log search analytics
      await this.logSearchAnalytics({
        searchQuery: query,
        totalResults: venues.length,
        apiCallsUsed,
        cacheHits,
        searchTimeMs: Date.now() - startTime,
        filterCriteria: filters,
        organizationId: this.client['organizationId'], // Access private property
      });

      return response;
    } catch (error) {
      console.error('Wedding venue search failed:', error);
      throw error;
    }
  }

  /**
   * Search for venues by specific category (ceremony, reception, etc.)
   */
  async searchByCategory(
    category: 'ceremony' | 'reception' | 'accommodation' | 'photo_location',
    location: { lat: number; lng: number },
    radius: number = 25000,
    preferences?: WeddingVenuePreferences,
  ): Promise<WeddingVenueSearchResponse> {
    const categoryMapping = {
      ceremony: [
        'church',
        'place_of_worship',
        'wedding_venue',
        'park',
        'garden',
      ],
      reception: [
        'banquet_hall',
        'restaurant',
        'hotel',
        'wedding_venue',
        'event_venue',
      ],
      accommodation: ['lodging', 'hotel', 'bed_and_breakfast'],
      photo_location: [
        'park',
        'garden',
        'museum',
        'landmark',
        'tourist_attraction',
      ],
    };

    const query = this.getCategorySearchQuery(category);
    const filters: SearchFilters = {
      weddingTypes: categoryMapping[category],
      maxDistance: radius,
    };

    return await this.searchWeddingVenues(
      query,
      location,
      filters,
      preferences,
    );
  }

  /**
   * Get detailed venue information with wedding-specific analysis
   */
  async getVenueDetails(
    placeId: string,
    sessionToken?: string,
  ): Promise<{
    venue: GooglePlaceDetailsResult;
    weddingSuitability: WeddingSuitabilityScore;
    capacityEstimate: VenueCapacityEstimate;
    similarVenues: GooglePlaceResult[];
  }> {
    const startTime = Date.now();

    try {
      // Get detailed place information
      const detailsResponse = await this.client.getPlaceDetails({
        placeId,
        sessionToken,
        fields: [
          'place_id',
          'name',
          'formatted_address',
          'geometry',
          'rating',
          'user_ratings_total',
          'price_level',
          'types',
          'business_status',
          'formatted_phone_number',
          'website',
          'opening_hours',
          'reviews',
          'photos',
          'wheelchair_accessible_entrance',
          'serves_beer',
          'serves_wine',
        ],
      });

      if (detailsResponse.status !== 'OK') {
        throw new Error(
          `Details fetch failed: ${detailsResponse.error_message}`,
        );
      }

      const venue = detailsResponse.result;

      // Calculate wedding suitability score
      const weddingSuitability =
        await this.calculateDetailedWeddingSuitability(venue);

      // Estimate venue capacity
      const capacityEstimate = this.estimateDetailedCapacity(venue);

      // Find similar venues nearby
      const similarVenues = await this.findSimilarVenues(venue);

      // Cache the enhanced venue data
      await this.cacheVenueData(venue, weddingSuitability, capacityEstimate);

      return {
        venue,
        weddingSuitability,
        capacityEstimate,
        similarVenues: similarVenues.slice(0, 5),
      };
    } catch (error) {
      console.error('Venue details fetch failed:', error);
      throw error;
    }
  }

  /**
   * Autocomplete search for venue names with wedding context
   */
  async autocompleteVenues(
    input: string,
    location?: { lat: number; lng: number },
    sessionToken?: string,
  ) {
    try {
      const response = await this.client.autocompleteSearch({
        input,
        sessionToken: sessionToken || this.generateSessionToken(),
        location,
        types: ['establishment'],
        components: { country: 'gb' },
      });

      // Filter predictions to wedding-relevant venues
      const filteredPredictions = response.predictions.filter((prediction) =>
        this.isWeddingRelevant(prediction.types),
      );

      return {
        ...response,
        predictions: filteredPredictions,
      };
    } catch (error) {
      console.error('Autocomplete failed:', error);
      throw error;
    }
  }

  // Private methods for business logic

  private enhanceSearchQuery(
    baseQuery: string,
    filters: SearchFilters,
  ): string {
    let enhancedQuery = baseQuery;

    // Add wedding-specific terms if not already present
    if (
      !baseQuery.toLowerCase().includes('wedding') &&
      !baseQuery.toLowerCase().includes('venue')
    ) {
      enhancedQuery += ' wedding venue';
    }

    // Add location context
    if (filters.weddingTypes?.includes('church')) {
      enhancedQuery += ' church ceremony';
    }
    if (filters.weddingTypes?.includes('hotel')) {
      enhancedQuery += ' hotel reception';
    }

    return enhancedQuery.trim();
  }

  private async filterAndEnhanceResults(
    results: GooglePlaceResult[],
    filters: SearchFilters,
    preferences?: WeddingVenuePreferences,
    userLocation?: { lat: number; lng: number },
  ): Promise<
    Array<GooglePlaceResult & { wedding_amenities: any; distance_km?: number }>
  > {
    const enhanced = await Promise.all(
      results.map(async (place) => {
        // Calculate distance if user location provided
        const distance_km = userLocation
          ? this.calculateDistance(userLocation, place.geometry.location)
          : undefined;

        // Extract wedding amenities
        const wedding_amenities = await this.extractWeddingAmenities(place);

        return {
          ...place,
          wedding_amenities,
          distance_km,
        };
      }),
    );

    // Apply filters
    return enhanced.filter((venue) => {
      // Rating filter
      if (
        filters.minimumRating &&
        (!venue.rating || venue.rating < filters.minimumRating)
      ) {
        return false;
      }

      // Distance filter
      if (
        filters.maxDistance &&
        venue.distance_km &&
        venue.distance_km > filters.maxDistance / 1000
      ) {
        return false;
      }

      // Price range filter
      if (filters.priceRange && venue.price_level !== undefined) {
        if (
          venue.price_level < filters.priceRange.min ||
          venue.price_level > filters.priceRange.max
        ) {
          return false;
        }
      }

      // Guest count capacity filter
      if (filters.guestCountRange && preferences?.guest_count_range) {
        const estimatedCapacity = this.estimateCapacityFromTypes(venue.types);
        if (
          estimatedCapacity &&
          (estimatedCapacity < preferences.guest_count_range.min ||
            estimatedCapacity > preferences.guest_count_range.max * 1.5)
        ) {
          return false;
        }
      }

      // Required amenities filter
      if (filters.requiredAmenities && filters.requiredAmenities.length > 0) {
        const hasRequiredAmenities = filters.requiredAmenities.every(
          (amenity) => this.venueHasAmenity(venue, amenity),
        );
        if (!hasRequiredAmenities) {
          return false;
        }
      }

      return true;
    });
  }

  private async calculateDetailedWeddingSuitability(
    venue: GooglePlaceDetailsResult,
  ): Promise<WeddingSuitabilityScore> {
    let capacityMatch = 5;
    let amenitiesScore = 5;
    let locationAccessibility = 5;
    let pricingFit = 5;
    let reviewsSentiment = 5;
    let weddingExperience = 5;

    // Analyze reviews for wedding mentions
    if (venue.reviews) {
      const weddingMentions = venue.reviews.filter(
        (review) =>
          review.text.toLowerCase().includes('wedding') ||
          review.text.toLowerCase().includes('reception') ||
          review.text.toLowerCase().includes('ceremony'),
      ).length;

      weddingExperience = Math.min(10, 5 + weddingMentions * 0.5);

      // Sentiment analysis (simple keyword-based)
      const positiveKeywords = [
        'beautiful',
        'perfect',
        'amazing',
        'excellent',
        'wonderful',
      ];
      const negativeKeywords = ['terrible', 'awful', 'poor', 'bad', 'horrible'];

      let positiveCount = 0;
      let negativeCount = 0;

      venue.reviews.forEach((review) => {
        const text = review.text.toLowerCase();
        positiveCount += positiveKeywords.filter((word) =>
          text.includes(word),
        ).length;
        negativeCount += negativeKeywords.filter((word) =>
          text.includes(word),
        ).length;
      });

      reviewsSentiment = Math.max(
        1,
        Math.min(10, 5 + (positiveCount - negativeCount) * 0.3),
      );
    }

    // Amenities scoring
    amenitiesScore = this.scoreVenueAmenities(venue);

    // Location accessibility
    if (venue.wheelchair_accessible_entrance) locationAccessibility += 1;

    // Pricing fit based on price level
    if (venue.price_level !== undefined) {
      pricingFit = venue.price_level <= 3 ? 8 : 4;
    }

    const overallScore = Math.round(
      (capacityMatch +
        amenitiesScore +
        locationAccessibility +
        pricingFit +
        reviewsSentiment +
        weddingExperience) /
        6,
    );

    const recommendations: string[] = [];
    const warnings: string[] = [];

    if (weddingExperience < 5) {
      warnings.push('Limited wedding experience mentioned in reviews');
    }
    if (venue.price_level && venue.price_level > 3) {
      warnings.push('Higher price point venue');
    }
    if (!venue.wheelchair_accessible_entrance) {
      warnings.push('Accessibility information not available');
    }

    if (reviewsSentiment > 7) {
      recommendations.push('Highly rated by previous customers');
    }
    if (venue.serves_beer || venue.serves_wine) {
      recommendations.push('Alcohol service available');
    }

    return {
      overall_score: overallScore,
      factors: {
        capacity_match: capacityMatch,
        amenities_score: amenitiesScore,
        location_accessibility: locationAccessibility,
        pricing_fit: pricingFit,
        reviews_sentiment: reviewsSentiment,
        wedding_experience: weddingExperience,
      },
      recommendations,
      warnings,
    };
  }

  private estimateDetailedCapacity(
    venue: GooglePlaceDetailsResult,
  ): VenueCapacityEstimate {
    let capacity = this.estimateCapacityFromTypes(venue.types);
    let confidence: 'high' | 'medium' | 'low' = 'low';
    let source: 'reviews' | 'amenities' | 'size_analysis' | 'manual' =
      'size_analysis';

    // Check reviews for capacity mentions
    if (venue.reviews) {
      const capacityMentions = venue.reviews
        .map((review) => this.extractCapacityFromText(review.text))
        .filter((cap) => cap > 0);

      if (capacityMentions.length > 0) {
        capacity = Math.round(
          capacityMentions.reduce((sum, cap) => sum + cap, 0) /
            capacityMentions.length,
        );
        confidence = capacityMentions.length > 2 ? 'high' : 'medium';
        source = 'reviews';
      }
    }

    return {
      seated_capacity: capacity ? Math.round(capacity * 0.8) : undefined,
      standing_capacity: capacity,
      mixed_capacity: capacity ? Math.round(capacity * 0.9) : undefined,
      confidence_level: confidence,
      source,
    };
  }

  private async findSimilarVenues(
    venue: GooglePlaceDetailsResult,
  ): Promise<GooglePlaceResult[]> {
    if (!venue.geometry?.location) return [];

    try {
      // Search for similar venues nearby
      const searchResponse = await this.client.nearbySearch({
        location: venue.geometry.location,
        radius: 10000, // 10km
        type: venue.types[0] || 'establishment',
        language: 'en',
      });

      return searchResponse.results
        .filter((result) => result.place_id !== venue.place_id)
        .slice(0, 5);
    } catch (error) {
      console.error('Similar venues search failed:', error);
      return [];
    }
  }

  private deduplicateVenues(venues: any[]): any[] {
    const seen = new Set<string>();
    return venues.filter((venue) => {
      const key = `${venue.name}-${venue.formatted_address}`.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  private sortVenuesByRelevance(
    venues: any[],
    preferences?: WeddingVenuePreferences,
  ): any[] {
    return venues.sort((a, b) => {
      let scoreA = (a.wedding_suitability_score || 5) + (a.rating || 0);
      let scoreB = (b.wedding_suitability_score || 5) + (b.rating || 0);

      // Boost venues that match preferences
      if (preferences) {
        if (
          preferences.accessibility_required &&
          a.wedding_amenities.wheelchair_accessible
        ) {
          scoreA += 1;
        }
        if (
          preferences.accessibility_required &&
          b.wedding_amenities.wheelchair_accessible
        ) {
          scoreB += 1;
        }

        if (preferences.parking_required && a.wedding_amenities.has_parking) {
          scoreA += 1;
        }
        if (preferences.parking_required && b.wedding_amenities.has_parking) {
          scoreB += 1;
        }
      }

      return scoreB - scoreA;
    });
  }

  private generateRecommendations(
    venues: any[],
    preferences?: WeddingVenuePreferences,
  ) {
    const ceremony_venues = venues
      .filter((v) =>
        v.types.some((t: string) =>
          ['church', 'place_of_worship', 'park', 'garden'].includes(t),
        ),
      )
      .slice(0, 3)
      .map((v: any) => v.place_id);

    const reception_venues = venues
      .filter((v) =>
        v.types.some((t: string) =>
          ['banquet_hall', 'restaurant', 'hotel', 'event_venue'].includes(t),
        ),
      )
      .slice(0, 3)
      .map((v: any) => v.place_id);

    const alternative_suggestions = venues
      .filter(
        (v) => v.wedding_suitability_score && v.wedding_suitability_score >= 7,
      )
      .slice(0, 5)
      .map((v: any) => v.place_id);

    return {
      ceremony_venues,
      reception_venues,
      alternative_suggestions,
    };
  }

  // Utility methods

  private getDefaultWeddingTypes(): string[] {
    return [
      'wedding_venue',
      'banquet_hall',
      'event_venue',
      'hotel',
      'restaurant',
      'church',
      'place_of_worship',
      'park',
      'garden',
    ];
  }

  private getCategorySearchQuery(category: string): string {
    const queries = {
      ceremony: 'wedding ceremony venues churches',
      reception: 'wedding reception venues banquet halls',
      accommodation: 'wedding guest accommodation hotels',
      photo_location: 'wedding photo locations parks gardens',
    };
    return queries[category as keyof typeof queries] || 'wedding venues';
  }

  private isWeddingRelevant(types: string[]): boolean {
    const relevantTypes = [
      'wedding_venue',
      'banquet_hall',
      'event_venue',
      'hotel',
      'restaurant',
      'church',
      'place_of_worship',
      'park',
      'garden',
      'museum',
      'lodging',
    ];
    return types.some((type) => relevantTypes.includes(type));
  }

  private async extractWeddingAmenities(place: GooglePlaceResult) {
    return {
      has_parking: place.types.includes('parking') || Math.random() > 0.7, // Placeholder logic
      wheelchair_accessible: Math.random() > 0.6,
      outdoor_space:
        place.types.includes('park') ||
        place.types.includes('garden') ||
        place.name.toLowerCase().includes('garden'),
      allows_alcohol: !place.types.includes('church'),
      has_catering:
        place.types.includes('restaurant') ||
        place.types.includes('banquet_hall'),
      bridal_suite:
        place.types.includes('hotel') || place.types.includes('wedding_venue'),
      photography_friendly:
        !place.types.includes('museum') || place.types.includes('park'),
    };
  }

  private estimateCapacityFromTypes(types: string[]): number | undefined {
    const capacityByType: Record<string, number> = {
      wedding_venue: 150,
      banquet_hall: 200,
      hotel: 100,
      restaurant: 80,
      church: 120,
      event_venue: 180,
      park: 250,
    };

    for (const type of types) {
      if (capacityByType[type]) {
        return capacityByType[type];
      }
    }

    return undefined;
  }

  private venueHasAmenity(venue: any, amenity: string): boolean {
    // Simple amenity checking logic
    const amenityMap: Record<string, (venue: any) => boolean> = {
      parking: (v) =>
        v.types.includes('parking') || v.wedding_amenities?.has_parking,
      alcohol: (v) =>
        !v.types.includes('church') && v.wedding_amenities?.allows_alcohol,
      catering: (v) =>
        v.types.includes('restaurant') || v.wedding_amenities?.has_catering,
      outdoor: (v) =>
        v.types.includes('park') || v.wedding_amenities?.outdoor_space,
    };

    return amenityMap[amenity]?.(venue) || false;
  }

  private scoreVenueAmenities(venue: GooglePlaceDetailsResult): number {
    let score = 5;

    if (venue.wheelchair_accessible_entrance) score += 1;
    if (venue.serves_beer || venue.serves_wine) score += 1;
    if (venue.types.includes('parking')) score += 1;
    if (venue.website) score += 0.5;
    if (venue.formatted_phone_number) score += 0.5;

    return Math.min(10, score);
  }

  private extractCapacityFromText(text: string): number {
    const matches = text.match(/(\d+)\s*(guests?|people|persons?)/i);
    return matches ? parseInt(matches[1]) : 0;
  }

  private calculateDistance(
    point1: { lat: number; lng: number },
    point2: { lat: number; lng: number },
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = ((point2.lat - point1.lat) * Math.PI) / 180;
    const dLng = ((point2.lng - point1.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((point1.lat * Math.PI) / 180) *
        Math.cos((point2.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private async cacheVenueData(
    venue: GooglePlaceDetailsResult,
    suitability: WeddingSuitabilityScore,
    capacity: VenueCapacityEstimate,
  ): Promise<void> {
    try {
      await this.supabase.from('google_places_cache').upsert(
        {
          place_id: venue.place_id,
          name: venue.name,
          formatted_address: venue.formatted_address,
          coordinates: venue.geometry?.location
            ? `(${venue.geometry.location.lng},${venue.geometry.location.lat})`
            : null,
          latitude: venue.geometry?.location?.lat || 0,
          longitude: venue.geometry?.location?.lng || 0,
          place_data: venue,
          phone_number: venue.formatted_phone_number,
          website_url: venue.website,
          rating: venue.rating,
          user_ratings_total: venue.user_ratings_total,
          price_level: venue.price_level,
          place_types: venue.types,
          business_status: venue.business_status || 'OPERATIONAL',
          estimated_capacity: capacity.seated_capacity,
          wheelchair_accessible: venue.wheelchair_accessible_entrance,
          allows_alcohol: venue.serves_beer || venue.serves_wine,
          wedding_suitability_score: suitability.overall_score,
          cache_expires_at: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        },
        {
          onConflict: 'place_id',
        },
      );
    } catch (error) {
      console.warn('Venue caching failed:', error);
    }
  }

  private async logSearchAnalytics(analytics: SearchAnalytics): Promise<void> {
    // In a production system, you'd want to log to an analytics service
    console.log('Search Analytics:', analytics);
  }

  private generateSessionToken(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
}
