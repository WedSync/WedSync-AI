import axios, { AxiosResponse, AxiosError } from 'axios';
import { BaseIntegrationService } from './BaseIntegrationService';
import {
  IntegrationConfig,
  IntegrationCredentials,
  IntegrationResponse,
  PlacesSearchCriteria,
  PlaceDetails,
  IntegrationError,
  ErrorCategory,
} from '@/types/integrations';

interface GooglePlacesSearchResponse {
  results: Array<{
    place_id: string;
    name: string;
    formatted_address: string;
    geometry: {
      location: {
        lat: number;
        lng: number;
      };
    };
    rating?: number;
    price_level?: number;
    types: string[];
    photos?: Array<{
      photo_reference: string;
      height: number;
      width: number;
    }>;
    business_status?: string;
  }>;
  next_page_token?: string;
  status: string;
}

interface GooglePlaceDetailsResponse {
  result: {
    place_id: string;
    name: string;
    formatted_address: string;
    geometry: {
      location: {
        lat: number;
        lng: number;
      };
    };
    rating?: number;
    formatted_phone_number?: string;
    website?: string;
    types: string[];
    photos?: Array<{
      photo_reference: string;
      height: number;
      width: number;
    }>;
    opening_hours?: {
      periods: Array<{
        open: {
          day: number;
          time: string;
        };
        close?: {
          day: number;
          time: string;
        };
      }>;
      weekday_text: string[];
    };
    reviews?: Array<{
      author_name: string;
      rating: number;
      text: string;
      time: number;
    }>;
  };
  status: string;
}

export class PlacesIntegrationService extends BaseIntegrationService {
  protected serviceName = 'google-places';
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

  constructor(config: IntegrationConfig, credentials: IntegrationCredentials) {
    super(config, credentials);
  }

  async validateConnection(): Promise<boolean> {
    try {
      const response = await this.makeRequest('/textsearch/json', {
        params: {
          query: 'restaurant',
          key: this.credentials.apiKey,
        },
      });
      return response.success && response.data.status === 'OK';
    } catch (error) {
      return false;
    }
  }

  async refreshToken(): Promise<string> {
    // Google Places API uses API keys, not refreshable tokens
    return this.credentials.apiKey;
  }

  protected async makeRequest(
    endpoint: string,
    options: any = {},
  ): Promise<IntegrationResponse> {
    const url = `${this.config.apiUrl}${endpoint}`;
    const method = options.method || 'GET';

    this.logRequest(method, endpoint, options.params);

    try {
      const response: AxiosResponse = await axios({
        url,
        method,
        params: {
          key: this.credentials.apiKey,
          ...options.params,
        },
        timeout: this.config.timeout,
      });

      this.logResponse(method, endpoint, response.data);

      // Check Google Places API status
      if (
        response.data.status &&
        response.data.status !== 'OK' &&
        response.data.status !== 'ZERO_RESULTS'
      ) {
        throw new IntegrationError(
          `Google Places API error: ${response.data.status}`,
          'PLACES_API_ERROR',
          ErrorCategory.EXTERNAL_API,
        );
      }

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      const sanitizedError = this.sanitizeError(error);

      if (error instanceof AxiosError) {
        if (error.response?.status === 400) {
          throw new IntegrationError(
            'Invalid request parameters',
            'INVALID_PARAMETERS',
            ErrorCategory.VALIDATION,
            sanitizedError,
          );
        }

        if (error.response?.status === 403) {
          throw new IntegrationError(
            'Google Places API access denied',
            'ACCESS_DENIED',
            ErrorCategory.AUTHENTICATION,
            sanitizedError,
          );
        }

        if (error.response?.status === 429) {
          throw new IntegrationError(
            'Google Places API quota exceeded',
            'QUOTA_EXCEEDED',
            ErrorCategory.RATE_LIMIT,
            sanitizedError,
          );
        }
      }

      throw new IntegrationError(
        'Places API request failed',
        'API_REQUEST_FAILED',
        ErrorCategory.EXTERNAL_API,
        sanitizedError,
      );
    }
  }

  // Search Methods
  async searchPlaces(
    criteria: PlacesSearchCriteria,
  ): Promise<IntegrationResponse<PlaceDetails[]>> {
    this.validateSearchCriteria(criteria);

    const cacheKey = this.generateCacheKey('search', criteria);
    const cached = this.getCachedData(cacheKey);

    if (cached) {
      return {
        success: true,
        data: cached,
      };
    }

    try {
      let endpoint = '/nearbysearch/json';
      const params: any = {
        location: `${criteria.location.latitude},${criteria.location.longitude}`,
        radius: criteria.radius,
      };

      if (criteria.query) {
        endpoint = '/textsearch/json';
        params.query = criteria.query;
      }

      if (criteria.type) {
        params.type = criteria.type;
      }

      if (criteria.priceLevel) {
        params.minprice = criteria.priceLevel;
        params.maxprice = criteria.priceLevel;
      }

      if (criteria.minRating) {
        params.minrating = criteria.minRating;
      }

      const response = await this.makeRequestWithRetry(endpoint, { params });

      if (response.success) {
        let places = response.data.results.map((place: any) =>
          this.transformPlaceResult(place),
        );

        // Apply additional filtering
        if (criteria.minRating) {
          places = places.filter(
            (place: PlaceDetails) =>
              place.rating === undefined || place.rating >= criteria.minRating!,
          );
        }

        this.setCachedData(cacheKey, places);

        return {
          success: true,
          data: places,
        };
      }

      return response;
    } catch (error) {
      const categorized = this.categorizeError(error);
      return {
        success: false,
        error: categorized.userMessage,
      };
    }
  }

  async searchVenues(
    location: { latitude: number; longitude: number },
    radius: number = 5000,
    filters: {
      capacity?: number;
      priceRange?: 1 | 2 | 3 | 4;
      amenities?: string[];
      rating?: number;
    } = {},
  ): Promise<IntegrationResponse<PlaceDetails[]>> {
    const criteria: PlacesSearchCriteria = {
      location,
      radius,
      type: 'establishment',
      priceLevel: filters.priceRange,
      minRating: filters.rating,
      query: 'wedding venue',
    };

    try {
      const venueResults = await this.searchPlaces(criteria);

      if (venueResults.success) {
        let venues = venueResults.data;

        // Additional filtering for wedding-specific criteria
        venues = venues.filter((venue) => {
          return (
            venue.category.includes('establishment') ||
            venue.name.toLowerCase().includes('venue') ||
            venue.name.toLowerCase().includes('wedding') ||
            venue.name.toLowerCase().includes('event')
          );
        });

        // Sort by rating and relevance
        venues.sort((a, b) => {
          const aRating = a.rating || 0;
          const bRating = b.rating || 0;
          return bRating - aRating;
        });

        return {
          success: true,
          data: venues,
        };
      }

      return venueResults;
    } catch (error) {
      const categorized = this.categorizeError(error);
      return {
        success: false,
        error: categorized.userMessage,
      };
    }
  }

  async getPlaceDetails(
    placeId: string,
  ): Promise<IntegrationResponse<PlaceDetails>> {
    if (!placeId) {
      throw new Error('Place ID is required');
    }

    const cacheKey = `details:${placeId}`;
    const cached = this.getCachedData(cacheKey);

    if (cached) {
      return {
        success: true,
        data: cached,
      };
    }

    try {
      const response = await this.makeRequestWithRetry('/details/json', {
        params: {
          place_id: placeId,
          fields:
            'place_id,name,formatted_address,geometry,rating,formatted_phone_number,website,photos,opening_hours,reviews,types',
        },
      });

      if (response.success && response.data.result) {
        const placeDetails = this.transformPlaceDetails(response.data.result);
        this.setCachedData(cacheKey, placeDetails);

        return {
          success: true,
          data: placeDetails,
        };
      }

      return {
        success: false,
        error: 'Place details not found',
      };
    } catch (error) {
      const categorized = this.categorizeError(error);
      return {
        success: false,
        error: categorized.userMessage,
      };
    }
  }

  async getPlacePhotos(
    placeId: string,
    maxPhotos: number = 5,
  ): Promise<IntegrationResponse<string[]>> {
    const detailsResult = await this.getPlaceDetails(placeId);

    if (!detailsResult.success || !detailsResult.data.photos) {
      return {
        success: true,
        data: [],
      };
    }

    const photos = detailsResult.data.photos
      .slice(0, maxPhotos)
      .map((photoRef) => {
        return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${photoRef}&key=${this.credentials.apiKey}`;
      });

    return {
      success: true,
      data: photos,
    };
  }

  async validateBusinessHours(
    placeId: string,
    requiredDate: Date,
  ): Promise<IntegrationResponse<{ isOpen: boolean; hours?: string }>> {
    const detailsResult = await this.getPlaceDetails(placeId);

    if (!detailsResult.success) {
      return detailsResult;
    }

    const place = detailsResult.data;

    if (!place.businessHours || place.businessHours.length === 0) {
      return {
        success: true,
        data: {
          isOpen: true, // Assume open if no hours specified
          hours: 'Hours not available',
        },
      };
    }

    const dayOfWeek = requiredDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const timeStr = requiredDate.toTimeString().slice(0, 5); // HH:MM format

    const dayHours = place.businessHours.find((h) => h.day === dayOfWeek);

    if (!dayHours) {
      return {
        success: true,
        data: {
          isOpen: false,
          hours: 'Closed',
        },
      };
    }

    const isOpen = timeStr >= dayHours.open && timeStr <= dayHours.close;

    return {
      success: true,
      data: {
        isOpen,
        hours: `${dayHours.open} - ${dayHours.close}`,
      },
    };
  }

  // Validation Methods
  private validateSearchCriteria(criteria: PlacesSearchCriteria): void {
    if (
      !criteria.location ||
      criteria.location.latitude === undefined ||
      criteria.location.longitude === undefined
    ) {
      throw new Error('Valid location coordinates are required');
    }

    if (criteria.location.latitude < -90 || criteria.location.latitude > 90) {
      throw new Error('Invalid latitude value');
    }

    if (
      criteria.location.longitude < -180 ||
      criteria.location.longitude > 180
    ) {
      throw new Error('Invalid longitude value');
    }

    if (criteria.radius <= 0 || criteria.radius > 50000) {
      throw new Error('Radius must be between 1 and 50,000 meters');
    }

    if (
      criteria.priceLevel &&
      (criteria.priceLevel < 1 || criteria.priceLevel > 4)
    ) {
      throw new Error('Price level must be between 1 and 4');
    }

    if (
      criteria.minRating &&
      (criteria.minRating < 0 || criteria.minRating > 5)
    ) {
      throw new Error('Minimum rating must be between 0 and 5');
    }
  }

  // Cache Management
  private generateCacheKey(operation: string, params: any): string {
    return `${operation}:${JSON.stringify(params)}`;
  }

  private getCachedData(key: string): any {
    const cached = this.cache.get(key);

    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    this.cache.delete(key);
    return null;
  }

  private setCachedData(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });

    // Clean up old cache entries periodically
    if (this.cache.size > 200) {
      this.cleanupCache();
    }
  }

  private cleanupCache(): void {
    const now = Date.now();

    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.CACHE_DURATION) {
        this.cache.delete(key);
      }
    }
  }

  // Data Transformation Methods
  private transformPlaceResult(place: any): PlaceDetails {
    return {
      id: place.place_id,
      name: place.name || 'Unknown',
      address: place.formatted_address || place.vicinity || '',
      location: {
        latitude: place.geometry.location.lat,
        longitude: place.geometry.location.lng,
      },
      rating: place.rating,
      category: this.determinePlaceCategory(place.types || []),
      photos: place.photos
        ? place.photos.map((photo: any) => photo.photo_reference)
        : [],
    };
  }

  private transformPlaceDetails(place: any): PlaceDetails {
    return {
      id: place.place_id,
      name: place.name || 'Unknown',
      address: place.formatted_address || '',
      location: {
        latitude: place.geometry.location.lat,
        longitude: place.geometry.location.lng,
      },
      rating: place.rating,
      phoneNumber: place.formatted_phone_number,
      website: place.website,
      category: this.determinePlaceCategory(place.types || []),
      photos: place.photos
        ? place.photos.map((photo: any) => photo.photo_reference)
        : [],
      businessHours: place.opening_hours?.periods
        ? this.transformBusinessHours(place.opening_hours.periods)
        : [],
      reviews: place.reviews
        ? place.reviews.slice(0, 5).map((review: any) => ({
            author: review.author_name,
            rating: review.rating,
            text: review.text,
            date: new Date(review.time * 1000),
          }))
        : [],
    };
  }

  private transformBusinessHours(
    periods: any[],
  ): Array<{ day: number; open: string; close: string }> {
    const hours: Array<{ day: number; open: string; close: string }> = [];

    periods.forEach((period) => {
      if (period.open && period.close) {
        hours.push({
          day: period.open.day,
          open: this.formatTime(period.open.time),
          close: this.formatTime(period.close.time),
        });
      }
    });

    return hours;
  }

  private formatTime(timeStr: string): string {
    if (timeStr.length === 4) {
      return `${timeStr.slice(0, 2)}:${timeStr.slice(2)}`;
    }
    return timeStr;
  }

  private determinePlaceCategory(types: string[]): string {
    const categoryMap: { [key: string]: string } = {
      wedding_venue: 'wedding-venue',
      event_venue: 'event-venue',
      banquet_hall: 'banquet-hall',
      restaurant: 'restaurant',
      hotel: 'hotel',
      church: 'religious-venue',
      synagogue: 'religious-venue',
      mosque: 'religious-venue',
      park: 'outdoor-venue',
      museum: 'museum',
      art_gallery: 'gallery',
      florist: 'florist',
      bakery: 'bakery',
      photographer: 'photographer',
      hair_care: 'beauty',
      beauty_salon: 'beauty',
      clothing_store: 'retail',
      jewelry_store: 'jewelry',
      establishment: 'establishment',
    };

    for (const type of types) {
      if (categoryMap[type]) {
        return categoryMap[type];
      }
    }

    return 'other';
  }
}
