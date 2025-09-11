/**
 * Google Places API Client - Secure Wedding Venue Integration
 * Team B - WS-219 Google Places Integration
 *
 * Handles all Google Places API interactions with:
 * - Secure API key management
 * - Rate limiting and quota tracking
 * - Intelligent caching
 * - Wedding-specific enhancements
 * - Error handling and retry logic
 */

import { createClient } from '@supabase/supabase-js';
import {
  GooglePlaceResult,
  GooglePlaceDetailsResult,
  GooglePlacesSearchRequest,
  GooglePlaceDetailsRequest,
  GoogleNearbySearchRequest,
  PlacesSearchResponse,
  PlaceDetailsResponse,
  GooglePlacesError,
  GooglePlacesClientConfig,
  RateLimitInfo,
  PlaceAutocompleteRequest,
  PlaceAutocompleteResponse,
} from '@/types/google-places';

const GOOGLE_PLACES_BASE_URL = 'https://maps.googleapis.com/maps/api/place';

export class GooglePlacesClient {
  private apiKey: string;
  private organizationId: string;
  private config: GooglePlacesClientConfig;
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

  // Rate limiting tracking
  private requestCounts: Map<string, number> = new Map();
  private rateLimitResetTimes: Map<string, number> = new Map();

  // Cache for requests within the same session
  private sessionCache: Map<string, any> = new Map();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor(config: GooglePlacesClientConfig) {
    this.apiKey = config.apiKey;
    this.organizationId = config.organization_id;
    this.config = {
      language: 'en',
      region: 'GB',
      quota_limit: 1000,
      rate_limit_per_minute: 100,
      cache_ttl_days: 7,
      retry_attempts: 3,
      retry_delay_ms: 1000,
      ...config,
    };
  }

  /**
   * Static factory method to create authenticated client
   */
  static async create(organizationId: string): Promise<GooglePlacesClient> {
    const supabase = createClient(
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

    // Get encrypted API key from database
    const { data: configData, error } = await supabase
      .from('google_places_config')
      .select('*')
      .eq('organization_id', organizationId)
      .single();

    if (error || !configData) {
      throw new GooglePlacesError({
        code: 'API_KEY_INVALID',
        message: 'Google Places API not configured for this organization',
        details: error,
      });
    }

    // Decrypt API key (in production, use proper encryption)
    const apiKey = GooglePlacesClient.decryptApiKey(
      configData.api_key_encrypted,
    );

    return new GooglePlacesClient({
      apiKey,
      organization_id: organizationId,
      language: configData.preferred_language || 'en',
      region: configData.preferred_region || 'GB',
      quota_limit: configData.daily_quota_limit,
      rate_limit_per_minute: configData.rate_limit_per_minute,
    });
  }

  /**
   * Text search for wedding venues
   */
  async searchPlaces(
    request: GooglePlacesSearchRequest,
  ): Promise<PlacesSearchResponse> {
    const startTime = Date.now();

    // Check rate limits and quota
    await this.checkRateLimitsAndQuota();

    // Check cache first
    const cacheKey = this.getCacheKey('search', request);
    const cached = await this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      let url: string;
      let params: URLSearchParams;

      if (request.type === 'autocomplete') {
        return await this.autocompleteSearch({
          input: request.query,
          sessionToken: request.sessionToken || this.generateSessionToken(),
          location: request.location,
          radius: request.radius,
          language: request.language || this.config.language,
        });
      } else if (request.type === 'nearby_search') {
        url = `${GOOGLE_PLACES_BASE_URL}/nearbysearch/json`;
        params = new URLSearchParams({
          key: this.apiKey,
          location: request.location
            ? `${request.location.lat},${request.location.lng}`
            : '',
          radius: (request.radius || 5000).toString(),
          type: request.placeTypes?.[0] || 'establishment',
          keyword: request.query,
          language: request.language || this.config.language!,
        });
      } else {
        // Text search (default)
        url = `${GOOGLE_PLACES_BASE_URL}/textsearch/json`;
        params = new URLSearchParams({
          key: this.apiKey,
          query: request.query,
          language: request.language || this.config.language!,
          region: request.region || this.config.region!,
        });

        if (request.location) {
          params.append(
            'location',
            `${request.location.lat},${request.location.lng}`,
          );
          params.append('radius', (request.radius || 50000).toString());
        }

        if (request.placeTypes && request.placeTypes.length > 0) {
          params.append('type', request.placeTypes[0]);
        }
      }

      const response = await this.makeRequest<PlacesSearchResponse>(
        `${url}?${params}`,
      );

      // Enhance results with wedding-specific data
      const enhancedResponse = await this.enhanceSearchResults(response);

      // Cache the results
      await this.setCache(cacheKey, enhancedResponse, startTime);

      // Update quota usage
      await this.updateQuotaUsage(1);

      return enhancedResponse;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }

  /**
   * Get detailed information about a specific place
   */
  async getPlaceDetails(
    request: GooglePlaceDetailsRequest,
  ): Promise<PlaceDetailsResponse> {
    const startTime = Date.now();

    await this.checkRateLimitsAndQuota();

    // Check cache first
    const cacheKey = this.getCacheKey('details', request);
    const cached = await this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const fields = request.fields || [
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
      ];

      const params = new URLSearchParams({
        key: this.apiKey,
        place_id: request.placeId,
        fields: fields.join(','),
        language: request.language || this.config.language!,
        region: request.region || this.config.region!,
      });

      if (request.sessionToken) {
        params.append('sessiontoken', request.sessionToken);
      }

      const url = `${GOOGLE_PLACES_BASE_URL}/details/json?${params}`;
      const response = await this.makeRequest<PlaceDetailsResponse>(url);

      // Enhance with wedding-specific data
      const enhancedResponse = await this.enhanceDetailsResult(response);

      // Cache and update quota
      await this.setCache(cacheKey, enhancedResponse, startTime);
      await this.updateQuotaUsage(1);

      return enhancedResponse;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }

  /**
   * Autocomplete search for venue names
   */
  async autocompleteSearch(
    request: PlaceAutocompleteRequest,
  ): Promise<PlaceAutocompleteResponse> {
    await this.checkRateLimitsAndQuota();

    const cacheKey = this.getCacheKey('autocomplete', request);
    const cached = this.sessionCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      return cached.data;
    }

    try {
      const params = new URLSearchParams({
        key: this.apiKey,
        input: request.input,
        sessiontoken: request.sessionToken,
        language: request.language || this.config.language!,
      });

      if (request.location) {
        params.append(
          'location',
          `${request.location.lat},${request.location.lng}`,
        );
        params.append('radius', (request.radius || 50000).toString());
      }

      if (request.types && request.types.length > 0) {
        params.append('types', request.types.join('|'));
      }

      if (request.components) {
        params.append('components', `country:${request.components.country}`);
      }

      const url = `${GOOGLE_PLACES_BASE_URL}/autocomplete/json?${params}`;
      const response = await this.makeRequest<PlaceAutocompleteResponse>(url);

      // Cache in session (autocomplete is often repeated)
      this.sessionCache.set(cacheKey, {
        data: response,
        timestamp: Date.now(),
      });

      await this.updateQuotaUsage(1);
      return response;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }

  /**
   * Nearby search for venues around a location
   */
  async nearbySearch(
    request: GoogleNearbySearchRequest,
  ): Promise<PlacesSearchResponse> {
    const searchRequest: GooglePlacesSearchRequest = {
      query: request.keyword || '',
      type: 'nearby_search',
      location: request.location,
      radius: request.radius,
      placeTypes: request.type ? [request.type] : undefined,
      language: request.language,
    };

    return await this.searchPlaces(searchRequest);
  }

  /**
   * Get photo URL from photo reference
   */
  getPhotoUrl(photoReference: string, maxWidth: number = 400): string {
    return `${GOOGLE_PLACES_BASE_URL}/photo?key=${this.apiKey}&photo_reference=${photoReference}&maxwidth=${maxWidth}`;
  }

  /**
   * Get current rate limit status
   */
  async getRateLimitStatus(): Promise<RateLimitInfo> {
    const { data: config } = await this.supabase
      .from('google_places_config')
      .select('daily_quota_used, daily_quota_limit, quota_reset_date')
      .eq('organization_id', this.organizationId)
      .single();

    const now = new Date();
    const resetTime = new Date(config?.quota_reset_date || now);
    if (resetTime < now) {
      resetTime.setDate(resetTime.getDate() + 1);
    }

    return {
      requests_remaining: Math.max(
        0,
        (config?.daily_quota_limit || 0) - (config?.daily_quota_used || 0),
      ),
      reset_time: resetTime.getTime(),
      quota_used_today: config?.daily_quota_used || 0,
      quota_limit: config?.daily_quota_limit || 0,
    };
  }

  // Private methods

  private async makeRequest<T>(
    url: string,
    retryCount: number = 0,
  ): Promise<T> {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'WedSync-Wedding-Platform/1.0',
          Referer: process.env.NEXT_PUBLIC_APP_URL || 'https://wedsync.com',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.status === 'OVER_QUERY_LIMIT') {
        throw new GooglePlacesError({
          code: 'QUOTA_EXCEEDED',
          message: 'Google Places API quota exceeded',
          quota_reset_time: new Date(
            Date.now() + 24 * 60 * 60 * 1000,
          ).toISOString(),
        });
      }

      if (data.status === 'REQUEST_DENIED') {
        throw new GooglePlacesError({
          code: 'API_KEY_INVALID',
          message: data.error_message || 'API key invalid or restricted',
        });
      }

      return data;
    } catch (error) {
      if (
        retryCount < this.config.retry_attempts! &&
        this.isRetryableError(error)
      ) {
        await this.delay(this.config.retry_delay_ms! * (retryCount + 1));
        return this.makeRequest<T>(url, retryCount + 1);
      }
      throw error;
    }
  }

  private async checkRateLimitsAndQuota(): Promise<void> {
    const now = Date.now();
    const minute = Math.floor(now / 60000);

    // Check per-minute rate limit
    const currentCount = this.requestCounts.get(minute.toString()) || 0;
    if (currentCount >= this.config.rate_limit_per_minute!) {
      const nextMinute = (minute + 1) * 60000;
      throw new GooglePlacesError({
        code: 'RATE_LIMITED',
        message: 'Rate limit exceeded',
        retry_after: Math.ceil((nextMinute - now) / 1000),
      });
    }

    // Check daily quota
    const { data: config } = await this.supabase
      .from('google_places_config')
      .select(
        'daily_quota_used, daily_quota_limit, quota_reset_date, api_status',
      )
      .eq('organization_id', this.organizationId)
      .single();

    if (config?.api_status === 'quota_exceeded') {
      throw new GooglePlacesError({
        code: 'QUOTA_EXCEEDED',
        message: 'Daily quota exceeded',
        quota_reset_time: new Date(
          Date.now() + 24 * 60 * 60 * 1000,
        ).toISOString(),
      });
    }

    // Update rate limit counter
    this.requestCounts.set(minute.toString(), currentCount + 1);
  }

  private async updateQuotaUsage(apiCalls: number): Promise<void> {
    await this.supabase.rpc('check_and_update_api_quota', {
      org_id: this.organizationId,
      calls_needed: apiCalls,
    });
  }

  private async enhanceSearchResults(
    response: PlacesSearchResponse,
  ): Promise<PlacesSearchResponse> {
    // Add wedding-specific enhancements to search results
    const enhancedResults = await Promise.all(
      response.results.map(async (place) => ({
        ...place,
        wedding_suitability_score:
          await this.calculateWeddingSuitability(place),
        estimated_capacity: this.estimateVenueCapacity(place),
      })),
    );

    return {
      ...response,
      results: enhancedResults,
    };
  }

  private async enhanceDetailsResult(
    response: PlaceDetailsResponse,
  ): Promise<PlaceDetailsResponse> {
    const enhanced = {
      ...response.result,
      wedding_suitability_score: await this.calculateWeddingSuitability(
        response.result,
      ),
      estimated_capacity: this.estimateVenueCapacity(response.result),
    };

    return {
      ...response,
      result: enhanced,
    };
  }

  private async calculateWeddingSuitability(
    place: GooglePlaceResult,
  ): Promise<number> {
    // Wedding-specific scoring algorithm
    let score = 5; // Base score

    // Venue type scoring
    const weddingTypes = [
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
    ];

    const hasWeddingType = place.types.some((type) =>
      weddingTypes.includes(type),
    );
    if (hasWeddingType) score += 2;

    // Rating boost
    if (place.rating && place.rating >= 4.5) score += 1;
    if (place.rating && place.rating >= 4.0) score += 0.5;

    // Price level consideration (not too expensive)
    if (place.price_level && place.price_level <= 3) score += 0.5;

    // Business status
    if (place.business_status === 'OPERATIONAL') score += 0.5;

    // Reviews count (popularity indicator)
    if (place.user_ratings_total && place.user_ratings_total > 100)
      score += 0.5;

    // Clamp score between 1-10
    return Math.max(1, Math.min(10, Math.round(score)));
  }

  private estimateVenueCapacity(place: GooglePlaceResult): number | undefined {
    // Estimate capacity based on venue type and other indicators
    const capacityByType: Record<string, number> = {
      wedding_venue: 150,
      banquet_hall: 200,
      hotel: 100,
      restaurant: 80,
      church: 120,
      event_venue: 180,
      park: 250,
      museum: 100,
    };

    for (const type of place.types) {
      if (capacityByType[type]) {
        return capacityByType[type];
      }
    }

    return undefined;
  }

  private async getFromCache(cacheKey: string): Promise<any | null> {
    try {
      const { data } = await this.supabase
        .from('google_places_cache')
        .select('place_data')
        .eq('place_id', cacheKey)
        .gt('cache_expires_at', new Date().toISOString())
        .single();

      return data?.place_data || null;
    } catch {
      return null;
    }
  }

  private async setCache(
    cacheKey: string,
    data: any,
    requestStartTime: number,
  ): Promise<void> {
    const expiresAt = new Date(
      Date.now() + this.config.cache_ttl_days! * 24 * 60 * 60 * 1000,
    );

    try {
      await this.supabase.from('google_places_cache').upsert(
        {
          place_id: cacheKey,
          name: data.results?.[0]?.name || 'Search Result',
          formatted_address: data.results?.[0]?.formatted_address || '',
          coordinates: data.results?.[0]?.geometry?.location
            ? `(${data.results[0].geometry.location.lng},${data.results[0].geometry.location.lat})`
            : null,
          latitude: data.results?.[0]?.geometry?.location?.lat || 0,
          longitude: data.results?.[0]?.geometry?.location?.lng || 0,
          place_data: data,
          cache_expires_at: expiresAt.toISOString(),
          organization_id: this.organizationId,
          api_calls_count: 1,
        },
        {
          onConflict: 'place_id',
        },
      );
    } catch (error) {
      // Log but don't fail the request if caching fails
      console.warn('Cache write failed:', error);
    }
  }

  private getCacheKey(operation: string, request: any): string {
    return `${operation}:${JSON.stringify(request)}:${this.organizationId}`;
  }

  private generateSessionToken(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  private isRetryableError(error: any): boolean {
    return (
      error.code === 'NETWORK_ERROR' ||
      (error.message && error.message.includes('timeout')) ||
      (error.status && error.status >= 500)
    );
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private handleApiError(error: any): GooglePlacesError {
    if (error instanceof GooglePlacesError) {
      return error;
    }

    if (error.message?.includes('API key')) {
      return new GooglePlacesError({
        code: 'API_KEY_INVALID',
        message: 'Invalid or missing Google Places API key',
      });
    }

    if (error.message?.includes('quota')) {
      return new GooglePlacesError({
        code: 'QUOTA_EXCEEDED',
        message: 'Google Places API quota exceeded',
      });
    }

    return new GooglePlacesError({
      code: 'UNKNOWN_ERROR',
      message: error.message || 'Unknown error occurred',
      details: error,
    });
  }

  private static decryptApiKey(encryptedKey: string): string {
    // In production, implement proper decryption
    // For now, assume the key is base64 encoded
    try {
      return Buffer.from(encryptedKey, 'base64').toString('utf-8');
    } catch {
      return encryptedKey; // Fallback if not encrypted
    }
  }
}

// Custom error class for Google Places API errors
export class GooglePlacesError extends Error {
  code: GooglePlacesError['code'];
  details?: any;
  retry_after?: number;
  quota_reset_time?: string;

  constructor(error: {
    code: GooglePlacesError['code'];
    message: string;
    details?: any;
    retry_after?: number;
    quota_reset_time?: string;
  }) {
    super(error.message);
    this.name = 'GooglePlacesError';
    this.code = error.code;
    this.details = error.details;
    this.retry_after = error.retry_after;
    this.quota_reset_time = error.quota_reset_time;
  }
}
