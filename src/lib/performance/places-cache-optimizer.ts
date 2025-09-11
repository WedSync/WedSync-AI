/**
 * Google Places Cache Optimizer for Mobile Wedding Planners
 *
 * Optimizes bandwidth usage and provides intelligent caching for venue discovery
 * during on-site visits with poor network connectivity.
 */

import { openDB, IDBPDatabase } from 'idb';

interface VenuePlace {
  placeId: string;
  name: string;
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  photos: string[];
  rating: number;
  priceLevel: number;
  capacity?: number;
  weddingInfo?: {
    ceremonies: boolean;
    receptions: boolean;
    catering: boolean;
    parking: boolean;
  };
  contactInfo: {
    phone?: string;
    website?: string;
    email?: string;
  };
  cachedAt: number;
  lastUpdated: number;
  priority: 'high' | 'medium' | 'low';
}

interface CacheMetrics {
  hitRate: number;
  bandwidth: number;
  offline: boolean;
  lastSync: number;
}

interface SearchQuery {
  location: string;
  radius: number;
  type: 'venue' | 'catering' | 'florist';
  capacity?: number;
}

class PlacesCacheOptimizer {
  private db: IDBPDatabase | null = null;
  private readonly DB_NAME = 'wedsync-places-cache';
  private readonly DB_VERSION = 1;
  private readonly CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days
  private readonly HIGH_PRIORITY_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days
  private readonly MAX_CACHE_SIZE = 500; // venues
  private readonly PRELOAD_RADIUS = 25; // km around current location

  private metrics: CacheMetrics = {
    hitRate: 0,
    bandwidth: 0,
    offline: false,
    lastSync: 0,
  };

  private networkType: 'slow-2g' | '2g' | '3g' | '4g' | 'wifi' = 'wifi';
  private bandwidthThreshold = {
    'slow-2g': 1024, // 1KB
    '2g': 2048, // 2KB
    '3g': 5120, // 5KB
    '4g': 10240, // 10KB
    wifi: 51200, // 50KB
  };

  constructor() {
    this.initializeDatabase();
    this.detectNetworkConditions();
    this.startPerformanceMonitoring();
  }

  /**
   * Initialize IndexedDB for offline venue storage
   */
  private async initializeDatabase(): Promise<void> {
    try {
      this.db = await openDB(this.DB_NAME, this.DB_VERSION, {
        upgrade(db) {
          // Venues store
          const venueStore = db.createObjectStore('venues', {
            keyPath: 'placeId',
          });
          venueStore.createIndex('location', [
            'coordinates.lat',
            'coordinates.lng',
          ]);
          venueStore.createIndex('priority', 'priority');
          venueStore.createIndex('cachedAt', 'cachedAt');
          venueStore.createIndex('weddingType', 'weddingInfo.ceremonies');

          // Search cache store
          const searchStore = db.createObjectStore('searches', {
            keyPath: 'query',
          });
          searchStore.createIndex('timestamp', 'timestamp');

          // User preferences store
          const prefsStore = db.createObjectStore('preferences', {
            keyPath: 'userId',
          });
          prefsStore.createIndex('location', 'preferredLocation');
        },
      });

      await this.cleanupExpiredEntries();
    } catch (error) {
      console.error('Failed to initialize Places cache database:', error);
    }
  }

  /**
   * Detect network conditions for adaptive caching
   */
  private detectNetworkConditions(): void {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;

      const updateNetworkInfo = () => {
        this.networkType = this.getNetworkTypeFromConnection(connection);
        this.metrics.offline = !navigator.onLine;
      };

      connection.addEventListener('change', updateNetworkInfo);
      window.addEventListener('online', () => {
        this.metrics.offline = false;
      });
      window.addEventListener('offline', () => {
        this.metrics.offline = true;
      });

      updateNetworkInfo();
    }
  }

  /**
   * Convert navigator.connection to our network type
   */
  private getNetworkTypeFromConnection(
    connection: any,
  ): typeof this.networkType {
    if (connection.effectiveType) {
      return connection.effectiveType as typeof this.networkType;
    }

    // Fallback based on downlink speed
    const downlink = connection.downlink || 10;
    if (downlink < 0.5) return 'slow-2g';
    if (downlink < 1.5) return '2g';
    if (downlink < 10) return '3g';
    return '4g';
  }

  /**
   * Search for venues with intelligent caching
   */
  async searchVenues(query: SearchQuery): Promise<VenuePlace[]> {
    const cacheKey = this.generateSearchCacheKey(query);

    try {
      // Check cache first
      const cached = await this.getCachedSearch(cacheKey);
      if (cached && this.isCacheValid(cached.timestamp)) {
        this.updateMetrics('hit');
        return cached.results;
      }

      // If offline, return best available cache
      if (this.metrics.offline) {
        return await this.getOfflineResults(query);
      }

      // Fetch from Google Places API with bandwidth optimization
      const results = await this.fetchFromGooglePlaces(query);

      // Cache results with priority scoring
      await this.cacheSearchResults(cacheKey, results, query);

      // Preload nearby venues if on good connection
      if (this.networkType === 'wifi' || this.networkType === '4g') {
        this.preloadNearbyVenues(query.location);
      }

      this.updateMetrics('miss');
      return results;
    } catch (error) {
      console.error('Places search error:', error);
      // Fallback to cache on error
      return await this.getOfflineResults(query);
    }
  }

  /**
   * Fetch venues from Google Places API with bandwidth optimization
   */
  private async fetchFromGooglePlaces(
    query: SearchQuery,
  ): Promise<VenuePlace[]> {
    const maxResults = this.getMaxResultsForNetwork();
    const fields = this.getOptimizedFields();

    const response = await fetch('/api/google-places/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...query,
        maxResults,
        fields,
        networkType: this.networkType,
      }),
    });

    if (!response.ok) {
      throw new Error(`Places API error: ${response.status}`);
    }

    const data = await response.json();
    this.metrics.bandwidth += this.estimateResponseSize(data);

    return this.transformGooglePlacesResponse(data.results);
  }

  /**
   * Get maximum results based on network conditions
   */
  private getMaxResultsForNetwork(): number {
    switch (this.networkType) {
      case 'slow-2g':
        return 5;
      case '2g':
        return 10;
      case '3g':
        return 20;
      case '4g':
        return 30;
      case 'wifi':
        return 50;
      default:
        return 20;
    }
  }

  /**
   * Get optimized fields based on network conditions
   */
  private getOptimizedFields(): string[] {
    const baseFields = [
      'place_id',
      'name',
      'formatted_address',
      'geometry',
      'rating',
    ];

    if (this.networkType === 'slow-2g' || this.networkType === '2g') {
      return baseFields;
    }

    return [
      ...baseFields,
      'photos',
      'price_level',
      'formatted_phone_number',
      'website',
      'opening_hours',
      'user_ratings_total',
    ];
  }

  /**
   * Transform Google Places response to our venue format
   */
  private transformGooglePlacesResponse(places: any[]): VenuePlace[] {
    return places.map((place) => ({
      placeId: place.place_id,
      name: place.name,
      address: place.formatted_address,
      coordinates: {
        lat: place.geometry.location.lat,
        lng: place.geometry.location.lng,
      },
      photos: this.optimizePhotos(place.photos || []),
      rating: place.rating || 0,
      priceLevel: place.price_level || 0,
      weddingInfo: this.inferWeddingCapabilities(place),
      contactInfo: {
        phone: place.formatted_phone_number,
        website: place.website,
        email: this.extractEmailFromWebsite(place.website),
      },
      cachedAt: Date.now(),
      lastUpdated: Date.now(),
      priority: this.calculatePriority(place),
    }));
  }

  /**
   * Optimize photo URLs based on network conditions
   */
  private optimizePhotos(photos: any[]): string[] {
    const maxPhotos =
      this.networkType === 'wifi' ? 5 : this.networkType === '4g' ? 3 : 1;

    const maxWidth =
      this.networkType === 'wifi' ? 800 : this.networkType === '4g' ? 400 : 200;

    return photos
      .slice(0, maxPhotos)
      .map((photo) => `${photo.photo_reference}&maxwidth=${maxWidth}`);
  }

  /**
   * Infer wedding capabilities from place types and reviews
   */
  private inferWeddingCapabilities(place: any): VenuePlace['weddingInfo'] {
    const types = place.types || [];
    const name = place.name?.toLowerCase() || '';

    return {
      ceremonies:
        types.includes('wedding_venue') ||
        name.includes('chapel') ||
        name.includes('church') ||
        types.includes('place_of_worship'),
      receptions:
        types.includes('banquet_hall') ||
        types.includes('event_venue') ||
        name.includes('reception') ||
        name.includes('ballroom'),
      catering:
        types.includes('restaurant') ||
        types.includes('meal_takeaway') ||
        name.includes('catering'),
      parking: true, // Assume most venues have parking
    };
  }

  /**
   * Calculate venue priority for caching
   */
  private calculatePriority(place: any): 'high' | 'medium' | 'low' {
    const score = (place.rating || 0) * (place.user_ratings_total || 1);
    const types = place.types || [];

    if (types.includes('wedding_venue') || score > 400) return 'high';
    if (types.includes('event_venue') || score > 100) return 'medium';
    return 'low';
  }

  /**
   * Cache search results with intelligent priority
   */
  private async cacheSearchResults(
    cacheKey: string,
    results: VenuePlace[],
    query: SearchQuery,
  ): Promise<void> {
    if (!this.db) return;

    try {
      const tx = this.db.transaction(['venues', 'searches'], 'readwrite');

      // Cache individual venues
      for (const venue of results) {
        await tx.objectStore('venues').put(venue);
      }

      // Cache search query
      await tx.objectStore('searches').put({
        query: cacheKey,
        results: results.map((v) => v.placeId),
        timestamp: Date.now(),
        location: query.location,
        radius: query.radius,
      });

      await tx.done;

      // Cleanup if cache is too large
      await this.enforceStorageLimit();
    } catch (error) {
      console.error('Failed to cache search results:', error);
    }
  }

  /**
   * Get cached search results
   */
  private async getCachedSearch(cacheKey: string): Promise<any> {
    if (!this.db) return null;

    try {
      const search = await this.db.get('searches', cacheKey);
      if (!search) return null;

      const venues = await Promise.all(
        search.results.map((placeId: string) =>
          this.db!.get('venues', placeId),
        ),
      );

      return {
        results: venues.filter(Boolean),
        timestamp: search.timestamp,
      };
    } catch (error) {
      console.error('Failed to get cached search:', error);
      return null;
    }
  }

  /**
   * Get offline results based on location
   */
  private async getOfflineResults(query: SearchQuery): Promise<VenuePlace[]> {
    if (!this.db) return [];

    try {
      // Get all cached venues and filter by distance
      const allVenues = await this.db.getAll('venues');
      const queryCoords = await this.geocodeLocation(query.location);

      return allVenues
        .filter((venue) => {
          const distance = this.calculateDistance(
            queryCoords.lat,
            queryCoords.lng,
            venue.coordinates.lat,
            venue.coordinates.lng,
          );
          return distance <= query.radius;
        })
        .filter((venue) => this.matchesWeddingType(venue, query.type))
        .sort((a, b) => {
          // Sort by priority, then rating
          if (a.priority !== b.priority) {
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
          }
          return b.rating - a.rating;
        })
        .slice(0, 20); // Limit offline results
    } catch (error) {
      console.error('Failed to get offline results:', error);
      return [];
    }
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  private calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const R = 6371; // Earth's radius in km
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
   * Check if venue matches wedding service type
   */
  private matchesWeddingType(venue: VenuePlace, type: string): boolean {
    if (!venue.weddingInfo) return true;

    switch (type) {
      case 'venue':
        return venue.weddingInfo.ceremonies || venue.weddingInfo.receptions;
      case 'catering':
        return venue.weddingInfo.catering;
      default:
        return true;
    }
  }

  /**
   * Preload venues around a location for better offline experience
   */
  private async preloadNearbyVenues(location: string): Promise<void> {
    try {
      const coords = await this.geocodeLocation(location);

      // Preload in expanding circles
      const radiuses = [5, 10, 25]; // km

      for (const radius of radiuses) {
        setTimeout(
          () => {
            this.searchVenues({
              location,
              radius,
              type: 'venue',
            });
          },
          1000 * radiuses.indexOf(radius),
        ); // Stagger requests
      }
    } catch (error) {
      console.error('Failed to preload nearby venues:', error);
    }
  }

  /**
   * Get venue details with caching
   */
  async getVenueDetails(placeId: string): Promise<VenuePlace | null> {
    if (!this.db) return null;

    try {
      // Check cache first
      const cached = await this.db.get('venues', placeId);
      if (cached && this.isCacheValid(cached.cachedAt)) {
        return cached;
      }

      // If offline, return cached version
      if (this.metrics.offline && cached) {
        return cached;
      }

      // Fetch fresh details
      const response = await fetch('/api/placeholder');
      if (!response.ok) {
        return cached || null; // Fallback to cache
      }

      const details = await response.json();
      const venue = this.transformGooglePlacesResponse([details])[0];

      // Update cache
      await this.db.put('venues', venue);

      return venue;
    } catch (error) {
      console.error('Failed to get venue details:', error);
      return null;
    }
  }

  /**
   * Sync offline changes when connection returns
   */
  async syncOfflineChanges(): Promise<void> {
    if (this.metrics.offline) return;

    try {
      // Find venues that need fresh data
      const staleVenues = await this.getStaleVenues();

      for (const venue of staleVenues) {
        await this.refreshVenueData(venue.placeId);

        // Rate limit to avoid API quota issues
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      this.metrics.lastSync = Date.now();
    } catch (error) {
      console.error('Failed to sync offline changes:', error);
    }
  }

  /**
   * Generate cache key for search query
   */
  private generateSearchCacheKey(query: SearchQuery): string {
    return `${query.location}-${query.radius}-${query.type}-${query.capacity || 'any'}`;
  }

  /**
   * Check if cache entry is still valid
   */
  private isCacheValid(timestamp: number): boolean {
    const age = Date.now() - timestamp;
    return age < this.CACHE_DURATION;
  }

  /**
   * Update performance metrics
   */
  private updateMetrics(type: 'hit' | 'miss'): void {
    // Simplified metrics tracking
    if (type === 'hit') {
      this.metrics.hitRate = Math.min(this.metrics.hitRate + 0.1, 1.0);
    } else {
      this.metrics.hitRate = Math.max(this.metrics.hitRate - 0.1, 0.0);
    }
  }

  /**
   * Start performance monitoring
   */
  private startPerformanceMonitoring(): void {
    setInterval(() => {
      this.reportPerformanceMetrics();
    }, 60000); // Every minute
  }

  /**
   * Report performance metrics to analytics
   */
  private reportPerformanceMetrics(): void {
    if (window.gtag) {
      window.gtag('event', 'places_cache_performance', {
        cache_hit_rate: this.metrics.hitRate,
        bandwidth_usage: this.metrics.bandwidth,
        network_type: this.networkType,
        offline_mode: this.metrics.offline,
      });
    }
  }

  /**
   * Cleanup expired cache entries
   */
  private async cleanupExpiredEntries(): Promise<void> {
    if (!this.db) return;

    try {
      const tx = this.db.transaction(['venues', 'searches'], 'readwrite');
      const now = Date.now();

      // Cleanup venues
      const venues = await tx.objectStore('venues').getAll();
      for (const venue of venues) {
        const maxAge =
          venue.priority === 'high'
            ? this.HIGH_PRIORITY_DURATION
            : this.CACHE_DURATION;

        if (now - venue.cachedAt > maxAge) {
          await tx.objectStore('venues').delete(venue.placeId);
        }
      }

      // Cleanup searches
      const searches = await tx.objectStore('searches').getAll();
      for (const search of searches) {
        if (now - search.timestamp > this.CACHE_DURATION) {
          await tx.objectStore('searches').delete(search.query);
        }
      }

      await tx.done;
    } catch (error) {
      console.error('Failed to cleanup expired entries:', error);
    }
  }

  /**
   * Enforce storage limits to prevent memory issues
   */
  private async enforceStorageLimit(): Promise<void> {
    if (!this.db) return;

    try {
      const venues = await this.db.getAll('venues');

      if (venues.length > this.MAX_CACHE_SIZE) {
        // Sort by priority and age, remove oldest low-priority venues
        const toRemove = venues
          .sort((a, b) => {
            if (a.priority !== b.priority) {
              const priorityOrder = { low: 1, medium: 2, high: 3 };
              return priorityOrder[a.priority] - priorityOrder[b.priority];
            }
            return a.cachedAt - b.cachedAt;
          })
          .slice(0, venues.length - this.MAX_CACHE_SIZE);

        const tx = this.db.transaction('venues', 'readwrite');
        for (const venue of toRemove) {
          await tx.objectStore('venues').delete(venue.placeId);
        }
        await tx.done;
      }
    } catch (error) {
      console.error('Failed to enforce storage limit:', error);
    }
  }

  /**
   * Get stale venues that need refreshing
   */
  private async getStaleVenues(): Promise<VenuePlace[]> {
    if (!this.db) return [];

    const venues = await this.db.getAll('venues');
    const now = Date.now();

    return venues.filter((venue) => {
      const age = now - venue.lastUpdated;
      const staleThreshold =
        venue.priority === 'high'
          ? 24 * 60 * 60 * 1000 // 24 hours
          : 7 * 24 * 60 * 60 * 1000; // 7 days

      return age > staleThreshold;
    });
  }

  /**
   * Refresh venue data from API
   */
  private async refreshVenueData(placeId: string): Promise<void> {
    try {
      const response = await fetch('/api/placeholder');
      if (response.ok) {
        const details = await response.json();
        const venue = this.transformGooglePlacesResponse([details])[0];
        await this.db?.put('venues', venue);
      }
    } catch (error) {
      console.error(`Failed to refresh venue ${placeId}:`, error);
    }
  }

  /**
   * Estimate response size for bandwidth tracking
   */
  private estimateResponseSize(data: any): number {
    return JSON.stringify(data).length;
  }

  /**
   * Extract email from website URL (basic heuristic)
   */
  private extractEmailFromWebsite(website?: string): string | undefined {
    if (!website) return undefined;

    // Basic extraction - in production, this would be more sophisticated
    const domain = website.replace(/^https?:\/\//, '').split('/')[0];
    return `info@${domain}`;
  }

  /**
   * Geocode location string to coordinates
   */
  private async geocodeLocation(
    location: string,
  ): Promise<{ lat: number; lng: number }> {
    // This would integrate with Google Geocoding API
    // For now, return a default location
    return { lat: 51.5074, lng: -0.1278 }; // London
  }

  /**
   * Get cache statistics for debugging
   */
  async getCacheStats(): Promise<{
    totalVenues: number;
    totalSearches: number;
    hitRate: number;
    bandwidthUsage: number;
    networkType: string;
    offline: boolean;
  }> {
    if (!this.db) {
      return {
        totalVenues: 0,
        totalSearches: 0,
        hitRate: 0,
        bandwidthUsage: 0,
        networkType: this.networkType,
        offline: this.metrics.offline,
      };
    }

    const venues = await this.db.getAll('venues');
    const searches = await this.db.getAll('searches');

    return {
      totalVenues: venues.length,
      totalSearches: searches.length,
      hitRate: this.metrics.hitRate,
      bandwidthUsage: this.metrics.bandwidth,
      networkType: this.networkType,
      offline: this.metrics.offline,
    };
  }
}

export default PlacesCacheOptimizer;
export type { VenuePlace, SearchQuery, CacheMetrics };
