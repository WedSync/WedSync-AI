import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  VenueSearchParams,
  GooglePlaceResult,
  VenueDetails,
  VenueType,
  CachedVenue,
} from '@/types/venue';

export class GooglePlacesService {
  private apiKey: string;
  private baseUrl = 'https://places.googleapis.com/v1/places';
  private rateLimit: { requests: number; lastReset: number } = {
    requests: 0,
    lastReset: Date.now(),
  };
  private maxRequestsPerMinute = 50;

  constructor() {
    this.apiKey =
      process.env.GOOGLE_PLACES_API_KEY ||
      (() => {
        throw new Error('Missing environment variable: GOOGLE_PLACES_API_KEY');
      })();
    if (!this.apiKey) {
      throw new Error('GOOGLE_PLACES_API_KEY environment variable is required');
    }
  }

  private async checkRateLimit(): Promise<void> {
    const now = Date.now();
    const minutesSinceReset = (now - this.rateLimit.lastReset) / (1000 * 60);

    if (minutesSinceReset >= 1) {
      this.rateLimit.requests = 0;
      this.rateLimit.lastReset = now;
    }

    if (this.rateLimit.requests >= this.maxRequestsPerMinute) {
      const waitTime = 60000 - (now - this.rateLimit.lastReset);
      throw new Error(
        `Rate limit exceeded. Please wait ${Math.ceil(waitTime / 1000)} seconds.`,
      );
    }

    this.rateLimit.requests++;
  }

  private determineVenueType(types: string[]): VenueType {
    const typeSet = new Set(types);

    if (typeSet.has('church') || typeSet.has('place_of_worship')) {
      return VenueType.CEREMONY;
    }
    if (typeSet.has('restaurant') || typeSet.has('banquet_hall')) {
      return VenueType.RECEPTION;
    }
    if (typeSet.has('park') || typeSet.has('garden') || typeSet.has('beach')) {
      return VenueType.OUTDOOR;
    }

    return VenueType.BOTH;
  }

  private async getCachedVenues(query: string): Promise<CachedVenue[]> {
    try {
      const supabase = await createServerSupabaseClient();

      const { data, error } = await supabase
        .from('venue_cache')
        .select('*')
        .ilike('name', `%${query}%`)
        .gt(
          'last_updated',
          new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        ) // 24 hours cache
        .order('rating', { ascending: false })
        .limit(20);

      if (error) {
        console.warn('Cache retrieval failed:', error);
        return [];
      }

      return (data || []).map((venue) => ({
        place_id: venue.place_id,
        name: venue.name,
        address: venue.formatted_address,
        location: venue.geometry
          ? (venue.geometry as any).location
          : { lat: 0, lng: 0 },
        venue_type: this.determineVenueType([]),
        price_level: venue.price_level,
        rating: venue.rating,
        photos: (venue.photos as string[]) || [],
        phone: venue.phone_number,
        website: venue.website,
        cached_at: venue.created_at,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      }));
    } catch (error) {
      console.warn('Cache error:', error);
      return [];
    }
  }

  private async cacheVenues(
    query: string,
    venues: GooglePlaceResult[],
  ): Promise<void> {
    try {
      const supabase = await createServerSupabaseClient();

      const cacheEntries = venues.map((venue) => ({
        place_id: venue.place_id,
        name: venue.name,
        formatted_address: venue.formatted_address,
        geometry: venue.geometry,
        venue_type: this.determineVenueType(venue.types),
        rating: venue.rating,
        price_level: venue.price_level,
        photos: venue.photos?.map((p) => p.photo_reference) || [],
        reviews_count: venue.user_ratings_total,
        phone_number: venue.formatted_phone_number,
        website: venue.website,
        place_details: venue,
        is_verified: false,
        last_updated: new Date().toISOString(),
        created_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('venue_cache')
        .upsert(cacheEntries, { onConflict: 'place_id' });

      if (error) {
        console.warn('Cache storage failed:', error);
      }
    } catch (error) {
      console.warn('Cache storage error:', error);
    }
  }

  async searchVenues(
    params: VenueSearchParams,
  ): Promise<{ venues: CachedVenue[]; fromCache: boolean }> {
    // Try cache first
    const cachedVenues = await this.getCachedVenues(params.query);
    if (cachedVenues.length > 0) {
      return { venues: cachedVenues, fromCache: true };
    }

    // If no cache, search Google Places
    await this.checkRateLimit();

    try {
      const requestBody: any = {
        textQuery: params.query,
        includedType: 'wedding_venue',
        maxResultCount: 20,
        languageCode: 'en',
      };

      // Add location bias if provided
      if (params.location) {
        requestBody.locationBias = {
          circle: {
            center: {
              latitude: params.location.lat,
              longitude: params.location.lng,
            },
            radius: params.radius || 50000,
          },
        };
      }

      const response = await fetch(`${this.baseUrl}:searchText`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.apiKey,
          'X-Goog-FieldMask':
            'places.displayName,places.formattedAddress,places.location,places.photos,places.priceLevel,places.rating,places.userRatingCount,places.types,places.currentOpeningHours,places.website,places.nationalPhoneNumber,places.id',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Google Places API rate limit exceeded');
        }
        throw new Error(`Google Places API error: ${response.status}`);
      }

      const data = await response.json();
      const places: GooglePlaceResult[] = (data.places || []).map(
        (place: any) => ({
          place_id: place.id,
          name: place.displayName?.text || 'Unknown Venue',
          formatted_address: place.formattedAddress || '',
          geometry: {
            location: {
              lat: place.location?.latitude || 0,
              lng: place.location?.longitude || 0,
            },
          },
          photos:
            place.photos?.map((photo: any) => ({
              photo_reference: photo.name,
              height: photo.heightPx,
              width: photo.widthPx,
            })) || [],
          price_level: place.priceLevel,
          rating: place.rating,
          user_ratings_total: place.userRatingCount,
          types: place.types || [],
          website: place.website,
          formatted_phone_number: place.nationalPhoneNumber,
        }),
      );

      // Cache the results
      await this.cacheVenues(params.query, places);

      // Convert to CachedVenue format
      const venues: CachedVenue[] = places.map((place) => ({
        place_id: place.place_id,
        name: place.name,
        address: place.formatted_address,
        location: place.geometry.location,
        venue_type: this.determineVenueType(place.types),
        price_level: place.price_level,
        rating: place.rating,
        photos: place.photos?.map((p) => p.photo_reference) || [],
        phone: place.formatted_phone_number,
        website: place.website,
        cached_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      }));

      return { venues, fromCache: false };
    } catch (error) {
      console.error('Google Places search error:', error);
      throw new Error(
        `Venue search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async getVenueDetails(placeId: string): Promise<VenueDetails | null> {
    await this.checkRateLimit();

    try {
      const response = await fetch(`${this.baseUrl}/${placeId}`, {
        headers: {
          'X-Goog-Api-Key': this.apiKey,
          'X-Goog-FieldMask':
            'displayName,formattedAddress,location,photos,priceLevel,rating,userRatingCount,types,currentOpeningHours,website,nationalPhoneNumber,internationalPhoneNumber,reviews,url,utcOffsetMinutes',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Google Places API error: ${response.status}`);
      }

      const place = await response.json();

      return {
        place_id: placeId,
        name: place.displayName?.text || 'Unknown Venue',
        formatted_address: place.formattedAddress || '',
        geometry: {
          location: {
            lat: place.location?.latitude || 0,
            lng: place.location?.longitude || 0,
          },
        },
        photos:
          place.photos?.map((photo: any) => ({
            photo_reference: photo.name,
            height: photo.heightPx,
            width: photo.widthPx,
          })) || [],
        price_level: place.priceLevel,
        rating: place.rating,
        user_ratings_total: place.userRatingCount,
        types: place.types || [],
        website: place.website,
        formatted_phone_number: place.nationalPhoneNumber,
        international_phone_number: place.internationalPhoneNumber,
        reviews:
          place.reviews?.map((review: any) => ({
            author_name: review.authorAttribution?.displayName || 'Anonymous',
            rating: review.rating,
            text: review.text?.text || '',
            time: new Date(review.publishTime).getTime() / 1000,
          })) || [],
        opening_hours: place.currentOpeningHours
          ? {
              open_now: place.currentOpeningHours.openNow,
              periods:
                place.currentOpeningHours.periods?.map((period: any) => ({
                  open: {
                    day: period.open?.day || 0,
                    time: period.open?.time || '0000',
                  },
                  close: period.close
                    ? {
                        day: period.close.day,
                        time: period.close.time,
                      }
                    : undefined,
                })) || [],
              weekday_text: place.currentOpeningHours.weekdayDescriptions || [],
            }
          : undefined,
        url: place.url,
        utc_offset: place.utcOffsetMinutes,
      };
    } catch (error) {
      console.error('Google Places details error:', error);
      throw new Error(
        `Failed to get venue details: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  getPhotoUrl(photoReference: string, maxWidth: number = 800): string {
    return `https://places.googleapis.com/v1/${photoReference}/media?maxWidthPx=${maxWidth}&key=${this.apiKey}`;
  }
}

export const googlePlacesService = new GooglePlacesService();
