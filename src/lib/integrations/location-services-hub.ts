/**
 * WS-219 Location Services Hub
 * Team C - Round 1 Implementation
 *
 * Centralized location service coordination for travel times, directions,
 * geofencing, and venue proximity notifications for wedding management.
 */

import { createClient } from '@supabase/supabase-js';
import { PlacesIntegrationService } from './PlacesIntegrationService';

interface LocationCoordinate {
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy?: number;
  timestamp?: Date;
}

interface RouteInformation {
  origin: LocationCoordinate;
  destination: LocationCoordinate;
  waypoints?: LocationCoordinate[];
  distance: number; // in meters
  duration: number; // in seconds
  traffic?: 'light' | 'moderate' | 'heavy';
  routePolyline?: string;
  steps?: RouteStep[];
  alternativeRoutes?: RouteInformation[];
  calculatedAt: Date;
}

interface RouteStep {
  instruction: string;
  distance: number;
  duration: number;
  startLocation: LocationCoordinate;
  endLocation: LocationCoordinate;
}

interface GeofenceZone {
  id: string;
  name: string;
  weddingId: string;
  center: LocationCoordinate;
  radius: number; // in meters
  type: 'venue' | 'supplier' | 'accommodation' | 'parking' | 'restricted';
  active: boolean;
  notifications: {
    onEntry: boolean;
    onExit: boolean;
    webhookUrl?: string;
    notifySuppliers: string[]; // supplier IDs
  };
  metadata: Record<string, any>;
  createdAt: Date;
}

interface ProximityAlert {
  id: string;
  weddingId: string;
  supplierId: string;
  geofenceId: string;
  alertType: 'entry' | 'exit' | 'proximity' | 'arrival_reminder';
  triggeredAt: Date;
  location: LocationCoordinate;
  message: string;
  acknowledged: boolean;
  metadata: Record<string, any>;
}

interface TravelOptimization {
  weddingId: string;
  optimizationType:
    | 'supplier_routes'
    | 'guest_directions'
    | 'logistics_planning';
  participants: Array<{
    id: string;
    type: 'supplier' | 'guest' | 'coordinator';
    startLocation: LocationCoordinate;
    arrivalTime: Date;
  }>;
  optimizedRoutes: RouteInformation[];
  totalDistance: number;
  totalTime: number;
  carbonFootprint?: number;
  costEstimate?: number;
  generatedAt: Date;
}

interface LocationServiceConfig {
  googleMapsApiKey: string;
  enableRealTimeTraffic: boolean;
  enableGeofencing: boolean;
  proximityNotificationRadius: number; // meters
  routeOptimizationEnabled: boolean;
  carbonFootprintTracking: boolean;
  maxWaypoints: number;
  cacheDuration: number; // minutes
}

export class LocationServicesHub {
  private supabase: any;
  private placesService?: PlacesIntegrationService;
  private config: LocationServiceConfig;
  private routeCache = new Map<
    string,
    { route: RouteInformation; timestamp: number }
  >();
  private activeGeofences = new Map<string, GeofenceZone>();
  private proximityWatchers = new Map<string, NodeJS.Timeout>();

  constructor(
    supabaseUrl: string,
    supabaseKey: string,
    config: LocationServiceConfig,
    placesService?: PlacesIntegrationService,
  ) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.config = config;
    this.placesService = placesService;

    this.initializeGeofences();
    this.startProximityMonitoring();
  }

  /**
   * Calculate travel time and route between two locations
   */
  async calculateRoute(
    origin: LocationCoordinate,
    destination: LocationCoordinate,
    options?: {
      waypoints?: LocationCoordinate[];
      avoidTolls?: boolean;
      avoidHighways?: boolean;
      departureTime?: Date;
      travelMode?: 'driving' | 'walking' | 'transit' | 'bicycling';
    },
  ): Promise<{
    success: boolean;
    route?: RouteInformation;
    error?: string;
  }> {
    try {
      const cacheKey = this.generateRouteCacheKey(origin, destination, options);
      const cached = this.getCachedRoute(cacheKey);

      if (cached) {
        return { success: true, route: cached };
      }

      // Build Google Maps Directions API request
      const directionsUrl = new URL(
        'https://maps.googleapis.com/maps/api/directions/json',
      );
      directionsUrl.searchParams.append(
        'origin',
        `${origin.latitude},${origin.longitude}`,
      );
      directionsUrl.searchParams.append(
        'destination',
        `${destination.latitude},${destination.longitude}`,
      );
      directionsUrl.searchParams.append('key', this.config.googleMapsApiKey);

      if (options?.waypoints && options.waypoints.length > 0) {
        const waypoints = options.waypoints
          .slice(0, this.config.maxWaypoints)
          .map((wp) => `${wp.latitude},${wp.longitude}`)
          .join('|');
        directionsUrl.searchParams.append('waypoints', waypoints);
      }

      if (options?.avoidTolls)
        directionsUrl.searchParams.append('avoid', 'tolls');
      if (options?.avoidHighways)
        directionsUrl.searchParams.append('avoid', 'highways');
      if (options?.travelMode)
        directionsUrl.searchParams.append('mode', options.travelMode);
      if (this.config.enableRealTimeTraffic)
        directionsUrl.searchParams.append('departure_time', 'now');

      const response = await fetch(directionsUrl.toString());
      const data = await response.json();

      if (data.status !== 'OK') {
        return {
          success: false,
          error: `Google Directions API error: ${data.status}`,
        };
      }

      const route = this.transformDirectionsResponse(
        data.routes[0],
        origin,
        destination,
      );

      // Cache the route
      this.setCachedRoute(cacheKey, route);

      // Store in database for analytics
      await this.storeRouteCalculation(route);

      return { success: true, route };
    } catch (error) {
      return {
        success: false,
        error: `Route calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Calculate optimized routes for multiple suppliers to venue
   */
  async optimizeSupplierRoutes(
    weddingId: string,
    venueLocation: LocationCoordinate,
    arrivalTimeWindow: { start: Date; end: Date },
  ): Promise<{
    success: boolean;
    optimization?: TravelOptimization;
    error?: string;
  }> {
    try {
      // Get all suppliers for the wedding
      const { data: suppliers, error } = await this.supabase
        .from('wedding_suppliers')
        .select(
          'id, name, service_type, business_address, location, arrival_time_preference',
        )
        .eq('wedding_id', weddingId);

      if (error || !suppliers) {
        return { success: false, error: 'Failed to fetch wedding suppliers' };
      }

      // Filter suppliers with valid locations
      const suppliersWithLocations = suppliers.filter(
        (s) => s.location?.lat && s.location?.lng,
      );

      if (suppliersWithLocations.length === 0) {
        return {
          success: false,
          error: 'No suppliers with valid locations found',
        };
      }

      // Calculate routes for each supplier
      const routePromises = suppliersWithLocations.map(async (supplier) => {
        const supplierLocation: LocationCoordinate = {
          latitude: supplier.location.lat,
          longitude: supplier.location.lng,
        };

        const routeResult = await this.calculateRoute(
          supplierLocation,
          venueLocation,
          {
            departureTime: arrivalTimeWindow.start,
            travelMode: 'driving',
          },
        );

        return {
          supplierId: supplier.id,
          supplierName: supplier.name,
          serviceType: supplier.service_type,
          route: routeResult.success ? routeResult.route : null,
          startLocation: supplierLocation,
        };
      });

      const routeResults = await Promise.all(routePromises);
      const validRoutes = routeResults.filter((r) => r.route !== null);

      // Calculate optimal arrival times to avoid congestion
      const optimizedSchedule = this.optimizeArrivalSchedule(
        validRoutes.map((r) => ({
          id: r.supplierId,
          type: 'supplier' as const,
          startLocation: r.startLocation,
          arrivalTime: new Date(
            arrivalTimeWindow.start.getTime() + (r.route?.duration || 0) * 1000,
          ),
          serviceType: r.serviceType,
        })),
        arrivalTimeWindow,
      );

      const optimization: TravelOptimization = {
        weddingId,
        optimizationType: 'supplier_routes',
        participants: optimizedSchedule,
        optimizedRoutes: validRoutes.map((r) => r.route!),
        totalDistance: validRoutes.reduce(
          (sum, r) => sum + (r.route?.distance || 0),
          0,
        ),
        totalTime: validRoutes.reduce(
          (sum, r) => sum + (r.route?.duration || 0),
          0,
        ),
        carbonFootprint: this.config.carbonFootprintTracking
          ? this.calculateCarbonFootprint(validRoutes)
          : undefined,
        generatedAt: new Date(),
      };

      // Store optimization results
      await this.supabase.from('travel_optimizations').insert({
        wedding_id: weddingId,
        optimization_data: optimization,
        created_at: new Date().toISOString(),
      });

      return { success: true, optimization };
    } catch (error) {
      return {
        success: false,
        error: `Route optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Setup geofencing for venue and supplier locations
   */
  async setupGeofencing(
    weddingId: string,
    zones: Omit<GeofenceZone, 'id' | 'createdAt'>[],
  ): Promise<{
    success: boolean;
    geofenceIds?: string[];
    error?: string;
  }> {
    try {
      if (!this.config.enableGeofencing) {
        return {
          success: false,
          error: 'Geofencing is disabled in configuration',
        };
      }

      const geofenceIds: string[] = [];

      for (const zone of zones) {
        const geofenceId = `geofence-${weddingId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        const geofence: GeofenceZone = {
          id: geofenceId,
          createdAt: new Date(),
          ...zone,
        };

        // Store in database
        await this.supabase.from('geofence_zones').insert({
          ...geofence,
          created_at: geofence.createdAt.toISOString(),
        });

        // Add to active geofences
        this.activeGeofences.set(geofenceId, geofence);
        geofenceIds.push(geofenceId);

        // Setup proximity monitoring if needed
        if (geofence.notifications.onEntry || geofence.notifications.onExit) {
          this.setupProximityWatcher(geofence);
        }
      }

      await this.logLocationEvent(weddingId, 'geofences_created', {
        geofenceCount: zones.length,
        geofenceIds,
      });

      return { success: true, geofenceIds };
    } catch (error) {
      return {
        success: false,
        error: `Geofencing setup failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Check if a location is within a geofence
   */
  isLocationInGeofence(
    location: LocationCoordinate,
    geofence: GeofenceZone,
  ): boolean {
    const distance = this.calculateHaversineDistance(
      location.latitude,
      location.longitude,
      geofence.center.latitude,
      geofence.center.longitude,
    );

    return distance <= geofence.radius;
  }

  /**
   * Process location update for proximity alerts
   */
  async processLocationUpdate(
    weddingId: string,
    supplierId: string,
    location: LocationCoordinate,
  ): Promise<{
    success: boolean;
    alerts?: ProximityAlert[];
    error?: string;
  }> {
    try {
      const alerts: ProximityAlert[] = [];

      // Check against all active geofences for this wedding
      const weddingGeofences = Array.from(this.activeGeofences.values()).filter(
        (g) => g.weddingId === weddingId && g.active,
      );

      for (const geofence of weddingGeofences) {
        const isInGeofence = this.isLocationInGeofence(location, geofence);
        const wasInGeofence = await this.wasSupplierInGeofence(
          supplierId,
          geofence.id,
        );

        // Entry alert
        if (isInGeofence && !wasInGeofence && geofence.notifications.onEntry) {
          const alert: ProximityAlert = {
            id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            weddingId,
            supplierId,
            geofenceId: geofence.id,
            alertType: 'entry',
            triggeredAt: new Date(),
            location,
            message: `Supplier entered ${geofence.name}`,
            acknowledged: false,
            metadata: { geofenceName: geofence.name },
          };

          alerts.push(alert);
          await this.processProximityAlert(alert);
        }

        // Exit alert
        if (!isInGeofence && wasInGeofence && geofence.notifications.onExit) {
          const alert: ProximityAlert = {
            id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            weddingId,
            supplierId,
            geofenceId: geofence.id,
            alertType: 'exit',
            triggeredAt: new Date(),
            location,
            message: `Supplier left ${geofence.name}`,
            acknowledged: false,
            metadata: { geofenceName: geofence.name },
          };

          alerts.push(alert);
          await this.processProximityAlert(alert);
        }

        // Update supplier location history
        await this.updateSupplierLocation(
          supplierId,
          geofence.id,
          location,
          isInGeofence,
        );
      }

      return { success: true, alerts };
    } catch (error) {
      return {
        success: false,
        error: `Location update processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Get directions from supplier to venue with real-time traffic
   */
  async getSupplierDirections(
    weddingId: string,
    supplierId: string,
    currentLocation?: LocationCoordinate,
  ): Promise<{
    success: boolean;
    directions?: RouteInformation;
    error?: string;
  }> {
    try {
      // Get supplier location
      let supplierLocation = currentLocation;

      if (!supplierLocation) {
        const { data: supplier } = await this.supabase
          .from('wedding_suppliers')
          .select('location, business_address')
          .eq('id', supplierId)
          .single();

        if (!supplier?.location?.lat) {
          return { success: false, error: 'Supplier location not available' };
        }

        supplierLocation = {
          latitude: supplier.location.lat,
          longitude: supplier.location.lng,
        };
      }

      // Get venue location
      const { data: wedding } = await this.supabase
        .from('weddings')
        .select('venue_location, venue_id')
        .eq('id', weddingId)
        .single();

      if (!wedding?.venue_location?.lat) {
        return {
          success: false,
          error: 'Wedding venue location not available',
        };
      }

      const venueLocation: LocationCoordinate = {
        latitude: wedding.venue_location.lat,
        longitude: wedding.venue_location.lng,
      };

      // Calculate route with real-time traffic
      const routeResult = await this.calculateRoute(
        supplierLocation,
        venueLocation,
        {
          travelMode: 'driving',
          departureTime: new Date(), // Current time for real-time traffic
        },
      );

      if (routeResult.success) {
        // Log directions request for analytics
        await this.logLocationEvent(weddingId, 'directions_requested', {
          supplierId,
          from: supplierLocation,
          to: venueLocation,
          distance: routeResult.route?.distance,
          duration: routeResult.route?.duration,
        });
      }

      return routeResult;
    } catch (error) {
      return {
        success: false,
        error: `Directions calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  // Private helper methods
  private async initializeGeofences(): Promise<void> {
    try {
      const { data: geofences } = await this.supabase
        .from('geofence_zones')
        .select('*')
        .eq('active', true);

      if (geofences) {
        for (const geofence of geofences) {
          this.activeGeofences.set(geofence.id, {
            ...geofence,
            createdAt: new Date(geofence.created_at),
          });

          if (
            geofence.notifications?.onEntry ||
            geofence.notifications?.onExit
          ) {
            this.setupProximityWatcher(geofence);
          }
        }
      }
    } catch (error) {
      console.error('Failed to initialize geofences:', error);
    }
  }

  private startProximityMonitoring(): void {
    if (!this.config.enableGeofencing) return;

    // Set up periodic check for supplier locations
    setInterval(async () => {
      await this.checkAllSupplierProximity();
    }, 60000); // Check every minute
  }

  private setupProximityWatcher(geofence: GeofenceZone): void {
    // This would be enhanced with real-time location tracking
    // For now, we'll rely on periodic updates
    const watcherId = `watcher-${geofence.id}`;

    if (this.proximityWatchers.has(watcherId)) {
      clearInterval(this.proximityWatchers.get(watcherId)!);
    }

    const interval = setInterval(async () => {
      await this.checkGeofenceProximity(geofence);
    }, 30000); // Check every 30 seconds

    this.proximityWatchers.set(watcherId, interval);
  }

  private async checkAllSupplierProximity(): Promise<void> {
    try {
      // This would integrate with real-time location services
      // For now, we'll check against last known locations
      const { data: recentLocations } = await this.supabase
        .from('supplier_locations')
        .select('*')
        .gte('updated_at', new Date(Date.now() - 300000).toISOString()); // Last 5 minutes

      if (recentLocations) {
        for (const locationData of recentLocations) {
          await this.processLocationUpdate(
            locationData.wedding_id,
            locationData.supplier_id,
            {
              latitude: locationData.latitude,
              longitude: locationData.longitude,
              timestamp: new Date(locationData.updated_at),
            },
          );
        }
      }
    } catch (error) {
      console.error('Error checking supplier proximity:', error);
    }
  }

  private async checkGeofenceProximity(geofence: GeofenceZone): Promise<void> {
    // Implementation would depend on real-time location tracking system
    // This is a placeholder for the geofence monitoring logic
  }

  private transformDirectionsResponse(
    googleRoute: any,
    origin: LocationCoordinate,
    destination: LocationCoordinate,
  ): RouteInformation {
    const leg = googleRoute.legs[0];

    return {
      origin,
      destination,
      distance: leg.distance.value,
      duration: leg.duration.value,
      traffic: leg.duration_in_traffic
        ? this.categorizeTraffic(
            leg.duration.value,
            leg.duration_in_traffic.value,
          )
        : undefined,
      routePolyline: googleRoute.overview_polyline?.points,
      steps: leg.steps?.map((step: any) => ({
        instruction: step.html_instructions?.replace(/<[^>]*>/g, ''), // Strip HTML
        distance: step.distance.value,
        duration: step.duration.value,
        startLocation: {
          latitude: step.start_location.lat,
          longitude: step.start_location.lng,
        },
        endLocation: {
          latitude: step.end_location.lat,
          longitude: step.end_location.lng,
        },
      })),
      calculatedAt: new Date(),
    };
  }

  private categorizeTraffic(
    normalDuration: number,
    trafficDuration: number,
  ): 'light' | 'moderate' | 'heavy' {
    const ratio = trafficDuration / normalDuration;

    if (ratio <= 1.1) return 'light';
    if (ratio <= 1.3) return 'moderate';
    return 'heavy';
  }

  private optimizeArrivalSchedule(
    participants: Array<{
      id: string;
      type: 'supplier' | 'guest' | 'coordinator';
      startLocation: LocationCoordinate;
      arrivalTime: Date;
      serviceType?: string;
    }>,
    timeWindow: { start: Date; end: Date },
  ): Array<{
    id: string;
    type: 'supplier' | 'guest' | 'coordinator';
    startLocation: LocationCoordinate;
    arrivalTime: Date;
  }> {
    // Sort by service priority (setup services first)
    const servicePriority = {
      venue_setup: 1,
      catering: 2,
      flowers: 3,
      photography: 4,
      music: 5,
    };

    const sorted = participants.sort((a, b) => {
      const aPriority =
        servicePriority[a.serviceType as keyof typeof servicePriority] || 10;
      const bPriority =
        servicePriority[b.serviceType as keyof typeof servicePriority] || 10;
      return aPriority - bPriority;
    });

    // Distribute arrival times with 15-minute intervals
    const intervalMs = 15 * 60 * 1000; // 15 minutes
    const startTime = timeWindow.start.getTime();

    return sorted.map((participant, index) => ({
      ...participant,
      arrivalTime: new Date(startTime + index * intervalMs),
    }));
  }

  private calculateCarbonFootprint(routeResults: any[]): number {
    // Rough calculation: 0.404 kg CO2 per mile for average car
    const totalMiles =
      routeResults.reduce((sum, r) => sum + (r.route?.distance || 0), 0) *
      0.000621371; // meters to miles
    return totalMiles * 0.404; // kg CO2
  }

  private calculateHaversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.degToRad(lat2 - lat1);
    const dLon = this.degToRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.degToRad(lat1)) *
        Math.cos(this.degToRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private degToRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  // Cache management
  private generateRouteCacheKey(
    origin: LocationCoordinate,
    destination: LocationCoordinate,
    options?: any,
  ): string {
    return `route:${origin.latitude},${origin.longitude}:${destination.latitude},${destination.longitude}:${JSON.stringify(options || {})}`;
  }

  private getCachedRoute(key: string): RouteInformation | null {
    const cached = this.routeCache.get(key);
    if (
      cached &&
      Date.now() - cached.timestamp < this.config.cacheDuration * 60 * 1000
    ) {
      return cached.route;
    }
    this.routeCache.delete(key);
    return null;
  }

  private setCachedRoute(key: string, route: RouteInformation): void {
    this.routeCache.set(key, { route, timestamp: Date.now() });

    // Cleanup old entries
    if (this.routeCache.size > 500) {
      const now = Date.now();
      for (const [k, v] of this.routeCache.entries()) {
        if (now - v.timestamp > this.config.cacheDuration * 60 * 1000) {
          this.routeCache.delete(k);
        }
      }
    }
  }

  // Database operations
  private async storeRouteCalculation(route: RouteInformation): Promise<void> {
    await this.supabase.from('route_calculations').insert({
      origin_lat: route.origin.latitude,
      origin_lng: route.origin.longitude,
      destination_lat: route.destination.latitude,
      destination_lng: route.destination.longitude,
      distance: route.distance,
      duration: route.duration,
      traffic_condition: route.traffic,
      calculated_at: route.calculatedAt.toISOString(),
    });
  }

  private async processProximityAlert(alert: ProximityAlert): Promise<void> {
    // Store alert
    await this.supabase.from('proximity_alerts').insert({
      ...alert,
      triggered_at: alert.triggeredAt.toISOString(),
    });

    // Get geofence for notification settings
    const geofence = this.activeGeofences.get(alert.geofenceId);
    if (!geofence) return;

    // Send webhook notification if configured
    if (geofence.notifications.webhookUrl) {
      try {
        await fetch(geofence.notifications.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(alert),
        });
      } catch (error) {
        console.error('Failed to send proximity alert webhook:', error);
      }
    }

    // Notify relevant suppliers
    if (geofence.notifications.notifySuppliers.length > 0) {
      const notifications = geofence.notifications.notifySuppliers.map(
        (supplierId) => ({
          recipient_type: 'supplier',
          recipient_id: supplierId,
          notification_type: 'proximity_alert',
          title: 'Location Alert',
          message: alert.message,
          data: { alert },
          created_at: new Date().toISOString(),
        }),
      );

      await this.supabase.from('notifications').insert(notifications);
    }
  }

  private async wasSupplierInGeofence(
    supplierId: string,
    geofenceId: string,
  ): Promise<boolean> {
    const { data } = await this.supabase
      .from('supplier_geofence_history')
      .select('inside_geofence')
      .eq('supplier_id', supplierId)
      .eq('geofence_id', geofenceId)
      .order('updated_at', { ascending: false })
      .limit(1);

    return data && data.length > 0 ? data[0].inside_geofence : false;
  }

  private async updateSupplierLocation(
    supplierId: string,
    geofenceId: string,
    location: LocationCoordinate,
    isInside: boolean,
  ): Promise<void> {
    await this.supabase.from('supplier_geofence_history').upsert({
      supplier_id: supplierId,
      geofence_id: geofenceId,
      latitude: location.latitude,
      longitude: location.longitude,
      inside_geofence: isInside,
      updated_at: new Date().toISOString(),
    });
  }

  private async logLocationEvent(
    weddingId: string,
    eventType: string,
    metadata: Record<string, any>,
  ): Promise<void> {
    await this.supabase.from('location_service_logs').insert({
      wedding_id: weddingId,
      event_type: eventType,
      metadata,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Health check for the location services hub
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: Record<string, any>;
  }> {
    const results = {
      supabaseConnection: false,
      googleMapsApi: false,
      activeGeofences: this.activeGeofences.size,
      routeCache: this.routeCache.size,
      proximityWatchers: this.proximityWatchers.size,
    };

    try {
      // Test Supabase connection
      const { error } = await this.supabase
        .from('weddings')
        .select('id')
        .limit(1);
      results.supabaseConnection = !error;

      // Test Google Maps API
      try {
        const testRoute = await this.calculateRoute(
          { latitude: 40.7128, longitude: -74.006 }, // NYC
          { latitude: 40.7589, longitude: -73.9851 }, // Times Square
        );
        results.googleMapsApi = testRoute.success;
      } catch {
        results.googleMapsApi = false;
      }

      const healthyServices = [
        results.supabaseConnection,
        results.googleMapsApi,
      ].filter(Boolean).length;

      if (healthyServices >= 2) {
        return { status: 'healthy', details: results };
      } else if (healthyServices >= 1) {
        return { status: 'degraded', details: results };
      } else {
        return { status: 'unhealthy', details: results };
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          ...results,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    // Clear all proximity watchers
    for (const [_, timeout] of this.proximityWatchers) {
      clearInterval(timeout);
    }
    this.proximityWatchers.clear();

    // Clear caches
    this.routeCache.clear();
    this.activeGeofences.clear();
  }
}
