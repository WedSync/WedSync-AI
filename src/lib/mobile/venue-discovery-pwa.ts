/**
 * Venue Discovery PWA System
 *
 * Provides offline-first venue discovery for wedding planners during on-site visits.
 * Syncs data when connectivity returns and manages local storage efficiently.
 */

import PlacesCacheOptimizer, {
  VenuePlace,
  SearchQuery,
} from '../performance/places-cache-optimizer';

interface GeolocationPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number;
  heading?: number;
  speed?: number;
}

interface VenueComparison {
  venueId: string;
  notes: string;
  rating: number;
  photos: string[];
  visited: boolean;
  visitDate?: number;
  pros: string[];
  cons: string[];
  capacity: number;
  estimatedCost: number;
  contactAttempts: ContactAttempt[];
}

interface ContactAttempt {
  type: 'phone' | 'email' | 'website';
  timestamp: number;
  successful: boolean;
  notes: string;
}

interface ItineraryItem {
  venueId: string;
  scheduledTime: number;
  duration: number; // minutes
  purpose: 'visit' | 'call' | 'email';
  completed: boolean;
  notes: string;
}

interface SyncQueueItem {
  id: string;
  type: 'venue_update' | 'comparison_add' | 'itinerary_update';
  data: any;
  timestamp: number;
  retryCount: number;
}

class VenueDiscoveryPWA {
  private cacheOptimizer: PlacesCacheOptimizer;
  private currentPosition: GeolocationPosition | null = null;
  private watchId: number | null = null;
  private syncQueue: SyncQueueItem[] = [];
  private isOnline: boolean = navigator.onLine;
  private lastSyncAttempt: number = 0;
  private readonly SYNC_INTERVAL = 30000; // 30 seconds

  constructor() {
    this.cacheOptimizer = new PlacesCacheOptimizer();
    this.initializeGeolocation();
    this.initializeNetworkListeners();
    this.initializeSyncScheduler();
    this.loadSyncQueue();
  }

  /**
   * Initialize GPS tracking for location-aware venue discovery
   */
  private initializeGeolocation(): void {
    if (!navigator.geolocation) {
      console.warn('Geolocation not supported');
      return;
    }

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000, // 1 minute
    };

    // Get initial position
    navigator.geolocation.getCurrentPosition(
      (position) => this.updateCurrentPosition(position),
      (error) => this.handleGeolocationError(error),
      options,
    );

    // Watch position changes
    this.watchId = navigator.geolocation.watchPosition(
      (position) => this.updateCurrentPosition(position),
      (error) => this.handleGeolocationError(error),
      options,
    );
  }

  /**
   * Update current position and trigger location-based features
   */
  private updateCurrentPosition(position: GeolocationPosition): void {
    this.currentPosition = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      altitude: position.coords.altitude || undefined,
      heading: position.coords.heading || undefined,
      speed: position.coords.speed || undefined,
    };

    // Trigger nearby venue discovery
    this.discoverNearbyVenues();

    // Update user location in local storage
    localStorage.setItem(
      'wedsync-last-location',
      JSON.stringify({
        position: this.currentPosition,
        timestamp: Date.now(),
      }),
    );
  }

  /**
   * Handle geolocation errors gracefully
   */
  private handleGeolocationError(error: GeolocationPositionError): void {
    let message = 'Location access error: ';

    switch (error.code) {
      case error.PERMISSION_DENIED:
        message +=
          'Location access denied. Please enable location services for better venue discovery.';
        break;
      case error.POSITION_UNAVAILABLE:
        message +=
          'Location information unavailable. Using last known location.';
        this.loadLastKnownLocation();
        break;
      case error.TIMEOUT:
        message += 'Location request timed out. Retrying...';
        setTimeout(() => this.initializeGeolocation(), 5000);
        break;
    }

    console.warn(message);

    // Show user-friendly notification
    this.showLocationNotification(message);
  }

  /**
   * Load last known location from storage
   */
  private loadLastKnownLocation(): void {
    const stored = localStorage.getItem('wedsync-last-location');
    if (stored) {
      const { position, timestamp } = JSON.parse(stored);

      // Use if less than 1 hour old
      if (Date.now() - timestamp < 60 * 60 * 1000) {
        this.currentPosition = position;
      }
    }
  }

  /**
   * Initialize network status listeners
   */
  private initializeNetworkListeners(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processSyncQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    // Listen for visibility change to sync when app comes back to foreground
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.isOnline) {
        this.processSyncQueue();
      }
    });
  }

  /**
   * Initialize sync scheduler for periodic background sync
   */
  private initializeSyncScheduler(): void {
    setInterval(() => {
      if (this.isOnline && this.syncQueue.length > 0) {
        this.processSyncQueue();
      }
    }, this.SYNC_INTERVAL);
  }

  /**
   * Discover nearby venues based on current location
   */
  async discoverNearbyVenues(radius: number = 10): Promise<VenuePlace[]> {
    if (!this.currentPosition) {
      throw new Error('Location not available. Please enable GPS.');
    }

    const query: SearchQuery = {
      location: `${this.currentPosition.latitude},${this.currentPosition.longitude}`,
      radius,
      type: 'venue',
    };

    try {
      return await this.cacheOptimizer.searchVenues(query);
    } catch (error) {
      console.error('Failed to discover nearby venues:', error);

      // Return cached venues if available
      return this.getCachedNearbyVenues(radius);
    }
  }

  /**
   * Get cached venues near current location
   */
  private async getCachedNearbyVenues(radius: number): Promise<VenuePlace[]> {
    if (!this.currentPosition) return [];

    // This would query the IndexedDB cache
    // Implementation details would depend on the cache structure
    return [];
  }

  /**
   * Search venues with enhanced mobile experience
   */
  async searchVenues(
    query: string,
    filters: {
      radius?: number;
      capacity?: number;
      priceLevel?: number;
      weddingType?: 'ceremony' | 'reception' | 'both';
      amenities?: string[];
    } = {},
  ): Promise<VenuePlace[]> {
    const searchQuery: SearchQuery = {
      location: query,
      radius: filters.radius || 25,
      type: 'venue',
      capacity: filters.capacity,
    };

    const venues = await this.cacheOptimizer.searchVenues(searchQuery);

    // Apply additional filters
    return venues.filter((venue) => {
      if (filters.priceLevel && venue.priceLevel > filters.priceLevel) {
        return false;
      }

      if (filters.weddingType && venue.weddingInfo) {
        switch (filters.weddingType) {
          case 'ceremony':
            return venue.weddingInfo.ceremonies;
          case 'reception':
            return venue.weddingInfo.receptions;
          case 'both':
            return venue.weddingInfo.ceremonies && venue.weddingInfo.receptions;
        }
      }

      return true;
    });
  }

  /**
   * Add venue to comparison list for detailed analysis
   */
  async addToComparison(
    venueId: string,
    initialData?: Partial<VenueComparison>,
  ): Promise<void> {
    const comparison: VenueComparison = {
      venueId,
      notes: '',
      rating: 0,
      photos: [],
      visited: false,
      pros: [],
      cons: [],
      capacity: 0,
      estimatedCost: 0,
      contactAttempts: [],
      ...initialData,
    };

    // Store locally
    const comparisons = this.getStoredComparisons();
    comparisons[venueId] = comparison;
    localStorage.setItem(
      'wedsync-venue-comparisons',
      JSON.stringify(comparisons),
    );

    // Queue for sync
    this.addToSyncQueue({
      type: 'comparison_add',
      data: comparison,
    });
  }

  /**
   * Update venue comparison data
   */
  async updateComparison(
    venueId: string,
    updates: Partial<VenueComparison>,
  ): Promise<void> {
    const comparisons = this.getStoredComparisons();

    if (comparisons[venueId]) {
      comparisons[venueId] = { ...comparisons[venueId], ...updates };
      localStorage.setItem(
        'wedsync-venue-comparisons',
        JSON.stringify(comparisons),
      );

      // Queue for sync
      this.addToSyncQueue({
        type: 'comparison_add',
        data: comparisons[venueId],
      });
    }
  }

  /**
   * Get stored venue comparisons
   */
  private getStoredComparisons(): Record<string, VenueComparison> {
    const stored = localStorage.getItem('wedsync-venue-comparisons');
    return stored ? JSON.parse(stored) : {};
  }

  /**
   * Get all venue comparisons
   */
  getComparisons(): VenueComparison[] {
    const comparisons = this.getStoredComparisons();
    return Object.values(comparisons);
  }

  /**
   * Mark venue as visited with optional notes and photos
   */
  async markVenueVisited(
    venueId: string,
    visitData: {
      notes?: string;
      photos?: string[];
      rating?: number;
      pros?: string[];
      cons?: string[];
    } = {},
  ): Promise<void> {
    await this.updateComparison(venueId, {
      visited: true,
      visitDate: Date.now(),
      ...visitData,
    });
  }

  /**
   * Record contact attempt with venue
   */
  async recordContactAttempt(
    venueId: string,
    contactType: 'phone' | 'email' | 'website',
    successful: boolean,
    notes: string = '',
  ): Promise<void> {
    const comparisons = this.getStoredComparisons();
    const comparison = comparisons[venueId];

    if (comparison) {
      comparison.contactAttempts.push({
        type: contactType,
        timestamp: Date.now(),
        successful,
        notes,
      });

      await this.updateComparison(venueId, comparison);
    }
  }

  /**
   * Create venue visit itinerary
   */
  async createItinerary(
    venues: string[],
    baseTime: number = Date.now(),
  ): Promise<ItineraryItem[]> {
    const itinerary: ItineraryItem[] = venues.map((venueId, index) => ({
      venueId,
      scheduledTime: baseTime + index * 90 * 60 * 1000, // 90 minutes apart
      duration: 60, // 1 hour per venue
      purpose: 'visit',
      completed: false,
      notes: '',
    }));

    // Store locally
    localStorage.setItem('wedsync-venue-itinerary', JSON.stringify(itinerary));

    // Queue for sync
    this.addToSyncQueue({
      type: 'itinerary_update',
      data: itinerary,
    });

    return itinerary;
  }

  /**
   * Update itinerary item
   */
  async updateItineraryItem(
    venueId: string,
    updates: Partial<ItineraryItem>,
  ): Promise<void> {
    const stored = localStorage.getItem('wedsync-venue-itinerary');
    if (!stored) return;

    const itinerary: ItineraryItem[] = JSON.parse(stored);
    const itemIndex = itinerary.findIndex((item) => item.venueId === venueId);

    if (itemIndex >= 0) {
      itinerary[itemIndex] = { ...itinerary[itemIndex], ...updates };
      localStorage.setItem(
        'wedsync-venue-itinerary',
        JSON.stringify(itinerary),
      );

      // Queue for sync
      this.addToSyncQueue({
        type: 'itinerary_update',
        data: itinerary,
      });
    }
  }

  /**
   * Get current itinerary
   */
  getItinerary(): ItineraryItem[] {
    const stored = localStorage.getItem('wedsync-venue-itinerary');
    return stored ? JSON.parse(stored) : [];
  }

  /**
   * Calculate optimal route between venues
   */
  calculateOptimalRoute(venues: VenuePlace[]): VenuePlace[] {
    if (!this.currentPosition || venues.length <= 1) {
      return venues;
    }

    // Simple nearest-neighbor algorithm for route optimization
    const unvisited = [...venues];
    const route: VenuePlace[] = [];
    let currentLat = this.currentPosition.latitude;
    let currentLng = this.currentPosition.longitude;

    while (unvisited.length > 0) {
      let nearestIndex = 0;
      let minDistance = Number.MAX_VALUE;

      // Find nearest unvisited venue
      unvisited.forEach((venue, index) => {
        const distance = this.calculateDistance(
          currentLat,
          currentLng,
          venue.coordinates.lat,
          venue.coordinates.lng,
        );

        if (distance < minDistance) {
          minDistance = distance;
          nearestIndex = index;
        }
      });

      // Add nearest venue to route
      const nearestVenue = unvisited.splice(nearestIndex, 1)[0];
      route.push(nearestVenue);
      currentLat = nearestVenue.coordinates.lat;
      currentLng = nearestVenue.coordinates.lng;
    }

    return route;
  }

  /**
   * Calculate distance between two points (Haversine formula)
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
   * Get estimated travel time between venues
   */
  getEstimatedTravelTime(from: VenuePlace, to: VenuePlace): number {
    const distance = this.calculateDistance(
      from.coordinates.lat,
      from.coordinates.lng,
      to.coordinates.lat,
      to.coordinates.lng,
    );

    // Estimate 40 km/h average speed in city
    return Math.round((distance / 40) * 60); // minutes
  }

  /**
   * Export venue comparison data for sharing/backup
   */
  exportData(): {
    comparisons: VenueComparison[];
    itinerary: ItineraryItem[];
    location: GeolocationPosition | null;
    timestamp: number;
  } {
    return {
      comparisons: this.getComparisons(),
      itinerary: this.getItinerary(),
      location: this.currentPosition,
      timestamp: Date.now(),
    };
  }

  /**
   * Import venue comparison data
   */
  async importData(data: {
    comparisons: VenueComparison[];
    itinerary: ItineraryItem[];
    location?: GeolocationPosition;
  }): Promise<void> {
    // Import comparisons
    const comparisons: Record<string, VenueComparison> = {};
    data.comparisons.forEach((comp) => {
      comparisons[comp.venueId] = comp;
    });
    localStorage.setItem(
      'wedsync-venue-comparisons',
      JSON.stringify(comparisons),
    );

    // Import itinerary
    localStorage.setItem(
      'wedsync-venue-itinerary',
      JSON.stringify(data.itinerary),
    );

    // Update location if provided
    if (data.location) {
      this.currentPosition = data.location;
    }

    // Queue everything for sync
    data.comparisons.forEach((comp) => {
      this.addToSyncQueue({
        type: 'comparison_add',
        data: comp,
      });
    });

    this.addToSyncQueue({
      type: 'itinerary_update',
      data: data.itinerary,
    });
  }

  /**
   * Add item to sync queue for later processing
   */
  private addToSyncQueue(
    item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retryCount'>,
  ): void {
    const syncItem: SyncQueueItem = {
      id: this.generateSyncId(),
      timestamp: Date.now(),
      retryCount: 0,
      ...item,
    };

    this.syncQueue.push(syncItem);
    this.saveSyncQueue();
  }

  /**
   * Process sync queue when online
   */
  private async processSyncQueue(): Promise<void> {
    if (!this.isOnline || this.syncQueue.length === 0) return;

    const now = Date.now();

    // Don't sync too frequently
    if (now - this.lastSyncAttempt < 10000) return; // 10 seconds minimum

    this.lastSyncAttempt = now;

    const itemsToSync = [...this.syncQueue];
    const successfulItems: string[] = [];

    for (const item of itemsToSync) {
      try {
        await this.syncItem(item);
        successfulItems.push(item.id);
      } catch (error) {
        console.error('Failed to sync item:', item.id, error);

        // Increment retry count
        item.retryCount++;

        // Remove items that have failed too many times
        if (item.retryCount > 5) {
          successfulItems.push(item.id);
        }
      }
    }

    // Remove successfully synced items
    this.syncQueue = this.syncQueue.filter(
      (item) => !successfulItems.includes(item.id),
    );
    this.saveSyncQueue();
  }

  /**
   * Sync individual item to server
   */
  private async syncItem(item: SyncQueueItem): Promise<void> {
    const endpoint = this.getSyncEndpoint(item.type);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.getAuthToken()}`,
      },
      body: JSON.stringify({
        type: item.type,
        data: item.data,
        timestamp: item.timestamp,
      }),
    });

    if (!response.ok) {
      throw new Error(`Sync failed: ${response.status}`);
    }
  }

  /**
   * Get sync endpoint for item type
   */
  private getSyncEndpoint(type: string): string {
    switch (type) {
      case 'venue_update':
        return '/api/venues/sync';
      case 'comparison_add':
        return '/api/venue-comparisons/sync';
      case 'itinerary_update':
        return '/api/itinerary/sync';
      default:
        return '/api/sync/general';
    }
  }

  /**
   * Get authentication token (implement based on your auth system)
   */
  private getAuthToken(): string {
    // Implement based on your authentication system
    return localStorage.getItem('wedsync-auth-token') || '';
  }

  /**
   * Generate unique sync ID
   */
  private generateSyncId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Save sync queue to localStorage
   */
  private saveSyncQueue(): void {
    localStorage.setItem('wedsync-sync-queue', JSON.stringify(this.syncQueue));
  }

  /**
   * Load sync queue from localStorage
   */
  private loadSyncQueue(): void {
    const stored = localStorage.getItem('wedsync-sync-queue');
    if (stored) {
      this.syncQueue = JSON.parse(stored);
    }
  }

  /**
   * Show location notification to user
   */
  private showLocationNotification(message: string): void {
    // This would integrate with your notification system
    console.log('Location notification:', message);

    // You could implement a toast notification or modal here
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('WedSync Location', {
        body: message,
        icon: '/icons/wedsync-192.png',
      });
    }
  }

  /**
   * Cleanup resources when PWA is unloaded
   */
  cleanup(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
    }
  }
}

export default VenueDiscoveryPWA;
export type {
  VenueComparison,
  ContactAttempt,
  ItineraryItem,
  SyncQueueItem,
  GeolocationPosition,
};
