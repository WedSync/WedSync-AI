/**
 * WS-116: Geographic Search Service
 * Comprehensive location-based vendor discovery and search functionality
 */

import { createClient } from '@supabase/supabase-js';

export interface LocationSearchParams {
  // Location parameters
  latitude: number;
  longitude: number;
  radius: number; // in kilometers
  address?: string;

  // Filter parameters
  category?: string;
  subcategories?: string[];
  priceRange?: string[];
  minRating?: number;
  verifiedOnly?: boolean;

  // Sorting and pagination
  sortBy?: 'distance' | 'rating' | 'price' | 'reviews';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface GeographicSearchResult {
  supplierId: string;
  businessName: string;
  category: string;

  // Location data
  distance: number; // in kilometers
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  state: string;
  postcode: string;

  // Business data
  rating: number;
  totalReviews: number;
  priceRange: string;
  isVerified: boolean;
  featuredImage?: string;

  // Service area data
  servesLocation: boolean;
  serviceRadius: number;
  additionalTravelCost?: number;
}

export interface LocationSuggestion {
  id: string;
  name: string;
  type: 'city' | 'region' | 'postcode' | 'venue';
  fullAddress: string;
  latitude: number;
  longitude: number;
  popularity?: number;
}

export interface PopularLocation {
  id: string;
  name: string;
  type: string;
  weddingsPerYear: number;
  averageGuestCount: number;
  supplierCount: number;
  location: {
    latitude: number;
    longitude: number;
  };
}

class GeographicSearchService {
  private supabase;
  private readonly CACHE_DURATION = 30 * 60; // 30 minutes in seconds

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }

  /**
   * Search for suppliers within a geographic area
   */
  async searchSuppliers(params: LocationSearchParams): Promise<{
    results: GeographicSearchResult[];
    totalCount: number;
    searchRadius: number;
    center: { latitude: number; longitude: number };
  }> {
    const {
      latitude,
      longitude,
      radius,
      category,
      subcategories,
      priceRange,
      minRating,
      verifiedOnly,
      sortBy = 'distance',
      sortOrder = 'asc',
      limit = 20,
      offset = 0,
    } = params;

    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(params);
      const cached = await this.getCachedResults(cacheKey);
      if (cached) {
        return cached;
      }

      // Build the query
      let query = this.supabase
        .from('suppliers')
        .select(
          `
          id,
          business_name,
          primary_category,
          latitude,
          longitude,
          address_line1,
          address_line2,
          city,
          county,
          postcode,
          average_rating,
          total_reviews,
          price_range,
          is_verified,
          featured_image,
          service_radius_miles,
          cities(name),
          states(name),
          countries(name)
        `,
        )
        .eq('is_published', true)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      // Apply filters
      if (category) {
        query = query.eq('primary_category', category);
      }

      if (subcategories && subcategories.length > 0) {
        query = query.overlaps('secondary_categories', subcategories);
      }

      if (priceRange && priceRange.length > 0) {
        query = query.in('price_range', priceRange);
      }

      if (minRating) {
        query = query.gte('average_rating', minRating);
      }

      if (verifiedOnly) {
        query = query.eq('is_verified', true);
      }

      const { data: suppliers, error } = await query;

      if (error) {
        throw error;
      }

      if (!suppliers || suppliers.length === 0) {
        return {
          results: [],
          totalCount: 0,
          searchRadius: radius,
          center: { latitude, longitude },
        };
      }

      // Calculate distances and filter by radius
      const resultsWithDistance = await Promise.all(
        suppliers.map(async (supplier) => {
          const distance = this.calculateDistance(
            latitude,
            longitude,
            supplier.latitude,
            supplier.longitude,
          );

          if (distance > radius) {
            return null;
          }

          // Check if supplier serves this location
          const servesLocation = await this.checkSupplierServesLocation(
            supplier.id,
            latitude,
            longitude,
          );

          return {
            supplierId: supplier.id,
            businessName: supplier.business_name,
            category: supplier.primary_category,
            distance: Math.round(distance * 10) / 10, // Round to 1 decimal
            latitude: supplier.latitude,
            longitude: supplier.longitude,
            address: this.formatAddress(supplier),
            city: supplier.cities?.name || supplier.city || '',
            state: supplier.states?.name || supplier.county || '',
            postcode: supplier.postcode || '',
            rating: supplier.average_rating || 0,
            totalReviews: supplier.total_reviews || 0,
            priceRange: supplier.price_range || '',
            isVerified: supplier.is_verified || false,
            featuredImage: supplier.featured_image,
            servesLocation,
            serviceRadius: supplier.service_radius_miles || 0,
          };
        }),
      );

      // Filter out null results and sort
      const validResults = resultsWithDistance.filter(
        Boolean,
      ) as GeographicSearchResult[];

      const sortedResults = this.sortResults(validResults, sortBy, sortOrder);

      // Apply pagination
      const paginatedResults = sortedResults.slice(offset, offset + limit);

      const searchResults = {
        results: paginatedResults,
        totalCount: validResults.length,
        searchRadius: radius,
        center: { latitude, longitude },
      };

      // Cache the results
      await this.cacheResults(cacheKey, searchResults);

      // Track analytics
      await this.trackSearchAnalytics({
        searchLocation: { latitude, longitude },
        radius,
        category,
        resultsFound: validResults.length,
        searchTimeMs: Date.now() - performance.now(),
      });

      return searchResults;
    } catch (error) {
      console.error('Geographic search error:', error);
      throw new Error('Failed to search suppliers by location');
    }
  }

  /**
   * Get location suggestions for autocomplete
   */
  async getLocationSuggestions(
    query: string,
    limit: number = 10,
  ): Promise<LocationSuggestion[]> {
    try {
      // Search cities
      const { data: cities } = await this.supabase
        .from('cities')
        .select('id, name, ascii_name, location, states(name), countries(name)')
        .or(`name.ilike.%${query}%,ascii_name.ilike.%${query}%`)
        .order('population', { ascending: false })
        .limit(limit);

      // Search postcodes
      const { data: postcodes } = await this.supabase
        .from('postcodes')
        .select(
          'id, code, formatted_code, location, cities(name), states(name)',
        )
        .ilike('code', `%${query}%`)
        .limit(Math.floor(limit / 2));

      const suggestions: LocationSuggestion[] = [];

      // Add city suggestions
      if (cities) {
        cities.forEach((city) => {
          const location = city.location as any;
          suggestions.push({
            id: city.id,
            name: city.name,
            type: 'city',
            fullAddress: `${city.name}, ${city.states?.name || ''}, ${city.countries?.name || ''}`,
            latitude: location.coordinates[1],
            longitude: location.coordinates[0],
            popularity: 0,
          });
        });
      }

      // Add postcode suggestions
      if (postcodes) {
        postcodes.forEach((postcode) => {
          const location = postcode.location as any;
          suggestions.push({
            id: postcode.id,
            name: postcode.formatted_code || postcode.code,
            type: 'postcode',
            fullAddress: `${postcode.formatted_code || postcode.code}, ${postcode.cities?.name || ''}, ${postcode.states?.name || ''}`,
            latitude: location.coordinates[1],
            longitude: location.coordinates[0],
            popularity: 0,
          });
        });
      }

      return suggestions;
    } catch (error) {
      console.error('Location suggestions error:', error);
      return [];
    }
  }

  /**
   * Get popular wedding locations
   */
  async getPopularWeddingLocations(
    limit: number = 20,
  ): Promise<PopularLocation[]> {
    try {
      const { data: hotspots, error } = await this.supabase
        .from('wedding_location_hotspots')
        .select('*')
        .order('weddings_per_year', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      return (hotspots || []).map((hotspot) => ({
        id: hotspot.id,
        name: hotspot.name,
        type: 'wedding_hotspot',
        weddingsPerYear: hotspot.weddings_per_year || 0,
        averageGuestCount: hotspot.average_guest_count || 0,
        supplierCount: hotspot.total_suppliers || 0,
        location: {
          latitude: hotspot.location.coordinates[1],
          longitude: hotspot.location.coordinates[0],
        },
      }));
    } catch (error) {
      console.error('Popular locations error:', error);
      return [];
    }
  }

  /**
   * Get suppliers in a specific city or region
   */
  async getSuppliersInArea(
    areaId: string,
    areaType: 'city' | 'state' | 'country',
    category?: string,
  ): Promise<GeographicSearchResult[]> {
    try {
      let query = this.supabase
        .from('suppliers')
        .select(
          `
          id,
          business_name,
          primary_category,
          latitude,
          longitude,
          address_line1,
          city,
          county,
          postcode,
          average_rating,
          total_reviews,
          price_range,
          is_verified,
          featured_image,
          service_radius_miles
        `,
        )
        .eq('is_published', true);

      // Apply area filter
      switch (areaType) {
        case 'city':
          query = query.eq('city_id', areaId);
          break;
        case 'state':
          query = query.eq('state_id', areaId);
          break;
        case 'country':
          query = query.eq('country_id', areaId);
          break;
      }

      if (category) {
        query = query.eq('primary_category', category);
      }

      const { data: suppliers, error } = await query;

      if (error) {
        throw error;
      }

      return (suppliers || []).map((supplier) => ({
        supplierId: supplier.id,
        businessName: supplier.business_name,
        category: supplier.primary_category,
        distance: 0, // Not applicable for area searches
        latitude: supplier.latitude,
        longitude: supplier.longitude,
        address: this.formatAddress(supplier),
        city: supplier.city || '',
        state: supplier.county || '',
        postcode: supplier.postcode || '',
        rating: supplier.average_rating || 0,
        totalReviews: supplier.total_reviews || 0,
        priceRange: supplier.price_range || '',
        isVerified: supplier.is_verified || false,
        featuredImage: supplier.featured_image,
        servesLocation: true, // Assume true for area searches
        serviceRadius: supplier.service_radius_miles || 0,
      }));
    } catch (error) {
      console.error('Area suppliers search error:', error);
      return [];
    }
  }

  /**
   * Check if a supplier serves a specific location
   */
  private async checkSupplierServesLocation(
    supplierId: string,
    latitude: number,
    longitude: number,
  ): Promise<boolean> {
    try {
      const { data, error } = await this.supabase.rpc(
        'supplier_serves_location',
        {
          p_supplier_id: supplierId,
          p_lat: latitude,
          p_lng: longitude,
        },
      );

      return data === true;
    } catch (error) {
      console.error('Error checking supplier service area:', error);
      return false;
    }
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in kilometers
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  /**
   * Sort search results
   */
  private sortResults(
    results: GeographicSearchResult[],
    sortBy: string,
    sortOrder: string,
  ): GeographicSearchResult[] {
    return results.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'distance':
          comparison = a.distance - b.distance;
          break;
        case 'rating':
          comparison = b.rating - a.rating; // Higher rating first by default
          break;
        case 'reviews':
          comparison = b.totalReviews - a.totalReviews; // More reviews first by default
          break;
        case 'price':
          const priceOrder = ['£', '££', '£££', '££££'];
          const aPrice = priceOrder.indexOf(a.priceRange);
          const bPrice = priceOrder.indexOf(b.priceRange);
          comparison = aPrice - bPrice;
          break;
        default:
          comparison = a.businessName.localeCompare(b.businessName);
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });
  }

  /**
   * Format supplier address
   */
  private formatAddress(supplier: any): string {
    const parts = [
      supplier.address_line1,
      supplier.address_line2,
      supplier.city,
      supplier.postcode,
    ].filter(Boolean);

    return parts.join(', ');
  }

  /**
   * Generate cache key for search parameters
   */
  private generateCacheKey(params: LocationSearchParams): string {
    const key = `search:${params.latitude}:${params.longitude}:${params.radius}:${params.category || 'all'}:${params.sortBy || 'distance'}`;
    return btoa(key); // Base64 encode for safe storage
  }

  /**
   * Get cached search results
   */
  private async getCachedResults(cacheKey: string): Promise<any | null> {
    try {
      const { data } = await this.supabase
        .from('location_search_cache')
        .select('*')
        .eq('cache_key', cacheKey)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (data) {
        // Update hit count
        await this.supabase
          .from('location_search_cache')
          .update({ hit_count: data.hit_count + 1 })
          .eq('id', data.id);

        return JSON.parse(data.cached_results || '{}');
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Cache search results
   */
  private async cacheResults(cacheKey: string, results: any): Promise<void> {
    try {
      const expiresAt = new Date(Date.now() + this.CACHE_DURATION * 1000);

      await this.supabase.from('location_search_cache').upsert({
        cache_key: cacheKey,
        search_location: `POINT(${results.center.longitude} ${results.center.latitude})`,
        radius_km: results.searchRadius,
        supplier_ids: results.results.map((r: any) => r.supplierId),
        result_count: results.totalCount,
        cached_results: JSON.stringify(results),
        expires_at: expiresAt.toISOString(),
      });
    } catch (error) {
      console.error('Cache error:', error);
      // Don't fail the request if caching fails
    }
  }

  /**
   * Track search analytics
   */
  private async trackSearchAnalytics(data: {
    searchLocation: { latitude: number; longitude: number };
    radius: number;
    category?: string;
    resultsFound: number;
    searchTimeMs: number;
  }): Promise<void> {
    try {
      await this.supabase.from('geographic_search_analytics').insert({
        search_location: `POINT(${data.searchLocation.longitude} ${data.searchLocation.latitude})`,
        radius_km: data.radius,
        category: data.category,
        results_found: data.resultsFound,
        search_time_ms: Math.round(data.searchTimeMs),
      });
    } catch (error) {
      console.error('Analytics tracking error:', error);
      // Don't fail the request if analytics fails
    }
  }
}

export const geographicSearchService = new GeographicSearchService();
