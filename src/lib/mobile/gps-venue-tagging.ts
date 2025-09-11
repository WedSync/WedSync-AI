/**
 * GPS-based Venue Detection and Tagging Service
 * Automatically detects and tags wedding venues using GPS coordinates
 */

import { supabase } from '@/lib/supabase/client';

export interface VenueLocation {
  id: string;
  name: string;
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  type: 'ceremony' | 'reception' | 'both' | 'photo_location';
  radius: number; // meters for detection
  verified: boolean;
}

export interface GPSCoordinates {
  lat: number;
  lng: number;
  accuracy: number; // meters
  timestamp: number;
}

export interface VenueDetectionResult {
  venue: VenueLocation | null;
  confidence: number; // 0-1
  distance: number; // meters from venue center
  suggestedTag: string;
  alternatives?: VenueLocation[];
}

export interface PhotoLocation {
  coordinates: GPSCoordinates;
  venue?: VenueLocation;
  address?: string;
  detectionConfidence: number;
}

class GPSVenueTaggingService {
  private watchId: number | null = null;
  private currentLocation: GPSCoordinates | null = null;
  private venueCache: Map<string, VenueLocation> = new Map();
  private isTracking: boolean = false;

  /**
   * Initialize GPS tracking and venue detection
   */
  async initializeTracking(): Promise<boolean> {
    if (!navigator.geolocation) {
      console.warn('Geolocation not supported');
      return false;
    }

    try {
      const permission = await navigator.permissions.query({
        name: 'geolocation',
      });

      if (permission.state === 'denied') {
        return false;
      }

      await this.loadVenueDatabase();
      this.startLocationTracking();

      return true;
    } catch (error) {
      console.error('Failed to initialize GPS tracking:', error);
      return false;
    }
  }

  /**
   * Start continuous location tracking
   */
  private startLocationTracking(): void {
    if (this.isTracking) return;

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000, // 1 minute cache
    };

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        this.currentLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: Date.now(),
        };

        this.onLocationUpdate(this.currentLocation);
      },
      (error) => {
        console.error('GPS tracking error:', error);
        this.handleLocationError(error);
      },
      options,
    );

    this.isTracking = true;
  }

  /**
   * Stop location tracking
   */
  stopTracking(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.isTracking = false;
  }

  /**
   * Detect venue from GPS coordinates
   */
  async detectVenue(
    coordinates: GPSCoordinates,
  ): Promise<VenueDetectionResult> {
    // Check cache first
    const cachedVenues = Array.from(this.venueCache.values());
    const nearbyVenues = this.findNearbyVenues(coordinates, cachedVenues);

    if (nearbyVenues.length === 0) {
      // Query database for nearby venues
      const dbVenues = await this.queryNearbyVenues(coordinates);
      nearbyVenues.push(...dbVenues);
    }

    if (nearbyVenues.length === 0) {
      // Attempt reverse geocoding for unknown location
      const address = await this.reverseGeocode(coordinates);

      return {
        venue: null,
        confidence: 0,
        distance: 0,
        suggestedTag: address || 'Unknown Location',
      };
    }

    // Find best match
    const bestMatch = this.findBestVenueMatch(coordinates, nearbyVenues);
    const alternatives = nearbyVenues
      .filter((v) => v.id !== bestMatch.venue?.id)
      .slice(0, 3);

    return {
      ...bestMatch,
      alternatives: alternatives.length > 0 ? alternatives : undefined,
    };
  }

  /**
   * Tag image with venue information
   */
  async tagImageWithVenue(
    imageId: string,
    coordinates: GPSCoordinates,
    manualVenueId?: string,
  ): Promise<{ success: boolean; venue?: VenueLocation; error?: string }> {
    try {
      let venue: VenueLocation | null = null;

      if (manualVenueId) {
        // Use manually selected venue
        venue = await this.getVenueById(manualVenueId);
      } else {
        // Auto-detect venue
        const detection = await this.detectVenue(coordinates);
        venue = detection.venue;
      }

      // Update image with location data
      const { error } = await supabase
        .from('portfolio_images')
        .update({
          location_data: {
            coordinates: {
              lat: coordinates.lat,
              lng: coordinates.lng,
            },
            accuracy: coordinates.accuracy,
            venue: venue
              ? {
                  id: venue.id,
                  name: venue.name,
                  address: venue.address,
                  type: venue.type,
                }
              : null,
            tagged_at: new Date().toISOString(),
          },
        })
        .eq('id', imageId);

      if (error) throw error;

      // Track venue usage for analytics
      if (venue) {
        await this.trackVenueUsage(venue.id, imageId);
      }

      return { success: true, venue: venue || undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Venue tagging failed',
      };
    }
  }

  /**
   * Get current location
   */
  async getCurrentLocation(): Promise<GPSCoordinates | null> {
    if (
      this.currentLocation &&
      Date.now() - this.currentLocation.timestamp < 60000
    ) {
      return this.currentLocation;
    }

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coordinates = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: Date.now(),
          };

          this.currentLocation = coordinates;
          resolve(coordinates);
        },
        (error) => {
          console.error('Failed to get current location:', error);
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        },
      );
    });
  }

  /**
   * Add new venue to database
   */
  async addNewVenue(
    name: string,
    address: string,
    coordinates: GPSCoordinates,
    type: VenueLocation['type'],
  ): Promise<VenueLocation> {
    const venue: Omit<VenueLocation, 'id'> = {
      name,
      address,
      coordinates: {
        lat: coordinates.lat,
        lng: coordinates.lng,
      },
      type,
      radius: 100, // Default 100m radius
      verified: false, // Requires manual verification
    };

    const { data, error } = await supabase
      .from('wedding_venues')
      .insert([venue])
      .select()
      .single();

    if (error) throw error;

    const newVenue: VenueLocation = {
      id: data.id,
      ...venue,
    };

    // Add to cache
    this.venueCache.set(newVenue.id, newVenue);

    return newVenue;
  }

  /**
   * Load venue database into cache
   */
  private async loadVenueDatabase(): Promise<void> {
    try {
      const { data: venues, error } = await supabase
        .from('wedding_venues')
        .select('*')
        .eq('verified', true);

      if (error) throw error;

      venues?.forEach((venue) => {
        this.venueCache.set(venue.id, {
          id: venue.id,
          name: venue.name,
          address: venue.address,
          coordinates: venue.coordinates,
          type: venue.type,
          radius: venue.radius || 100,
          verified: venue.verified,
        });
      });
    } catch (error) {
      console.error('Failed to load venue database:', error);
    }
  }

  /**
   * Find nearby venues from cached data
   */
  private findNearbyVenues(
    coordinates: GPSCoordinates,
    venues: VenueLocation[],
  ): VenueLocation[] {
    return venues.filter((venue) => {
      const distance = this.calculateDistance(coordinates, venue.coordinates);
      return distance <= venue.radius * 2; // Search in 2x venue radius
    });
  }

  /**
   * Query database for nearby venues
   */
  private async queryNearbyVenues(
    coordinates: GPSCoordinates,
  ): Promise<VenueLocation[]> {
    const searchRadius = 0.01; // ~1km in degrees

    const { data, error } = await supabase
      .from('wedding_venues')
      .select('*')
      .gte('coordinates->lat', coordinates.lat - searchRadius)
      .lte('coordinates->lat', coordinates.lat + searchRadius)
      .gte('coordinates->lng', coordinates.lng - searchRadius)
      .lte('coordinates->lng', coordinates.lng + searchRadius)
      .eq('verified', true);

    if (error) {
      console.error('Failed to query nearby venues:', error);
      return [];
    }

    return (
      data?.map((venue) => ({
        id: venue.id,
        name: venue.name,
        address: venue.address,
        coordinates: venue.coordinates,
        type: venue.type,
        radius: venue.radius || 100,
        verified: venue.verified,
      })) || []
    );
  }

  /**
   * Find best venue match based on distance and confidence
   */
  private findBestVenueMatch(
    coordinates: GPSCoordinates,
    venues: VenueLocation[],
  ): VenueDetectionResult {
    let bestMatch: VenueDetectionResult = {
      venue: null,
      confidence: 0,
      distance: 0,
      suggestedTag: 'Unknown Location',
    };

    for (const venue of venues) {
      const distance = this.calculateDistance(coordinates, venue.coordinates);

      if (distance <= venue.radius) {
        // Inside venue radius
        const confidence = Math.max(0, 1 - distance / venue.radius);

        if (confidence > bestMatch.confidence) {
          bestMatch = {
            venue,
            confidence,
            distance,
            suggestedTag: venue.name,
          };
        }
      }
    }

    return bestMatch;
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  private calculateDistance(
    coord1: { lat: number; lng: number },
    coord2: { lat: number; lng: number },
  ): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRadians(coord2.lat - coord1.lat);
    const dLng = this.toRadians(coord2.lng - coord1.lng);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(coord1.lat)) *
        Math.cos(this.toRadians(coord2.lat)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Reverse geocoding to get address from coordinates
   */
  private async reverseGeocode(
    coordinates: GPSCoordinates,
  ): Promise<string | null> {
    try {
      // Using a free geocoding service (you might want to use Google Maps API in production)
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${coordinates.lat}&longitude=${coordinates.lng}&localityLanguage=en`,
      );

      const data = await response.json();

      return data.locality || data.city || data.countryName || null;
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
      return null;
    }
  }

  /**
   * Get venue by ID
   */
  private async getVenueById(venueId: string): Promise<VenueLocation | null> {
    // Check cache first
    const cached = this.venueCache.get(venueId);
    if (cached) return cached;

    // Query database
    const { data, error } = await supabase
      .from('wedding_venues')
      .select('*')
      .eq('id', venueId)
      .single();

    if (error || !data) return null;

    const venue: VenueLocation = {
      id: data.id,
      name: data.name,
      address: data.address,
      coordinates: data.coordinates,
      type: data.type,
      radius: data.radius || 100,
      verified: data.verified,
    };

    this.venueCache.set(venue.id, venue);
    return venue;
  }

  /**
   * Track venue usage for analytics
   */
  private async trackVenueUsage(
    venueId: string,
    imageId: string,
  ): Promise<void> {
    await supabase.from('venue_usage_analytics').insert({
      venue_id: venueId,
      image_id: imageId,
      tagged_at: new Date().toISOString(),
    });
  }

  /**
   * Handle location tracking updates
   */
  private onLocationUpdate(location: GPSCoordinates): void {
    // Notify subscribers of location updates
    window.dispatchEvent(
      new CustomEvent('gps-location-update', {
        detail: { location },
      }),
    );
  }

  /**
   * Handle location errors
   */
  private handleLocationError(error: GeolocationPositionError): void {
    let message = 'Location access failed';

    switch (error.code) {
      case error.PERMISSION_DENIED:
        message = 'Location permission denied';
        break;
      case error.POSITION_UNAVAILABLE:
        message = 'Location information unavailable';
        break;
      case error.TIMEOUT:
        message = 'Location request timeout';
        break;
    }

    window.dispatchEvent(
      new CustomEvent('gps-location-error', {
        detail: { error, message },
      }),
    );
  }

  /**
   * Get venue suggestions for manual tagging
   */
  async getVenueSuggestions(searchQuery: string): Promise<VenueLocation[]> {
    const { data, error } = await supabase
      .from('wedding_venues')
      .select('*')
      .ilike('name', `%${searchQuery}%`)
      .eq('verified', true)
      .limit(10);

    if (error) return [];

    return (
      data?.map((venue) => ({
        id: venue.id,
        name: venue.name,
        address: venue.address,
        coordinates: venue.coordinates,
        type: venue.type,
        radius: venue.radius || 100,
        verified: venue.verified,
      })) || []
    );
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stopTracking();
    this.venueCache.clear();
  }
}

// Singleton instance
export const gpsVenueTagging = new GPSVenueTaggingService();

// Export types
export type {
  VenueLocation,
  GPSCoordinates,
  VenueDetectionResult,
  PhotoLocation,
};
