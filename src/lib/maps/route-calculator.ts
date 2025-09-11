import { Client } from '@googlemaps/google-maps-services-js';
import {
  Location,
  RouteStop,
  TravelRoute,
  RouteOptimizationOptions,
  TravelTimeCalculation,
  TrafficConditions,
  RouteSegment,
  GoogleMapsDirectionsResponse,
  DistanceMatrixResponse,
  RouteValidationError,
} from '@/types/travel';
import { Redis } from 'ioredis';

interface RouteCalculatorConfig {
  apiKey: string;
  redis?: Redis;
  cacheExpiration?: number;
  defaultBufferTime?: number;
}

export class RouteCalculator {
  private client: Client;
  private redis?: Redis;
  private cacheExpiration: number;
  private defaultBufferTime: number;

  constructor(config: RouteCalculatorConfig) {
    this.client = new Client({});
    this.redis = config.redis;
    this.cacheExpiration = config.cacheExpiration || 1800; // 30 minutes
    this.defaultBufferTime = config.defaultBufferTime || 15; // 15 minutes
  }

  /**
   * Calculate travel time and route between multiple stops
   */
  async calculateRoute(
    stops: RouteStop[],
    options: RouteOptimizationOptions = {
      optimize: false,
      avoidTolls: false,
      avoidHighways: false,
      trafficModel: 'best_guess',
    },
  ): Promise<TravelRoute> {
    if (stops.length < 2) {
      throw new Error('At least 2 stops are required for route calculation');
    }

    const cacheKey = this.generateCacheKey(stops, options);

    // Check cache first
    if (this.redis) {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    }

    try {
      const route = await this.computeRoute(stops, options);

      // Cache the result
      if (this.redis) {
        await this.redis.setex(
          cacheKey,
          this.cacheExpiration,
          JSON.stringify(route),
        );
      }

      return route;
    } catch (error) {
      throw this.handleRouteError(error);
    }
  }

  /**
   * Calculate travel time for a specific departure time
   */
  async calculateTravelTime(
    stops: RouteStop[],
    departureTime: string,
    options?: RouteOptimizationOptions,
  ): Promise<TravelTimeCalculation> {
    const route = await this.calculateRoute(stops, {
      ...options,
      departureTime,
    });

    const totalTravelTime = Math.ceil(route.totalDurationInTraffic / 60); // minutes
    const confidence = this.calculateConfidence(route);
    const warnings = this.generateWarnings(route);

    return {
      routeId: route.id,
      departureTime,
      arrivalTime: this.calculateArrivalTime(departureTime, totalTravelTime),
      totalTravelTime,
      bufferTime: this.calculateBufferTime(route),
      confidence,
      warnings,
    };
  }

  /**
   * Optimize route stops for minimum travel time
   */
  async optimizeRoute(
    origin: Location,
    destination: Location,
    waypoints: Location[],
    options?: RouteOptimizationOptions,
  ): Promise<TravelRoute> {
    if (waypoints.length === 0) {
      const stops: RouteStop[] = [
        {
          id: 'origin',
          location: origin,
          name: origin.name || 'Start',
          type: 'pickup',
        },
        {
          id: 'destination',
          location: destination,
          name: destination.name || 'End',
          type: 'destination',
        },
      ];
      return this.calculateRoute(stops, options);
    }

    // Use Google's waypoint optimization
    const optimizedRoute = await this.computeOptimizedRoute(
      origin,
      destination,
      waypoints,
      options,
    );

    return optimizedRoute;
  }

  /**
   * Get alternative routes
   */
  async getAlternativeRoutes(
    stops: RouteStop[],
    options?: RouteOptimizationOptions,
  ): Promise<TravelRoute[]> {
    const alternatives: TravelRoute[] = [];

    // Calculate main route
    const mainRoute = await this.calculateRoute(stops, options);
    alternatives.push(mainRoute);

    // Calculate alternative with different options
    if (!options?.avoidHighways) {
      const noHighwayRoute = await this.calculateRoute(stops, {
        ...options,
        avoidHighways: true,
      });
      alternatives.push(noHighwayRoute);
    }

    if (!options?.avoidTolls) {
      const noTollRoute = await this.calculateRoute(stops, {
        ...options,
        avoidTolls: true,
      });
      alternatives.push(noTollRoute);
    }

    return alternatives.filter(
      (route, index, self) =>
        index === self.findIndex((r) => r.id === route.id),
    );
  }

  private async computeRoute(
    stops: RouteStop[],
    options: RouteOptimizationOptions,
  ): Promise<TravelRoute> {
    const origin = stops[0].location;
    const destination = stops[stops.length - 1].location;
    const waypoints = stops.slice(1, -1).map((stop) => stop.location);

    const response = await this.client.directions({
      params: {
        origin: `${origin.lat},${origin.lng}`,
        destination: `${destination.lat},${destination.lng}`,
        waypoints:
          waypoints.length > 0
            ? waypoints.map((wp) => `${wp.lat},${wp.lng}`)
            : undefined,
        optimize: options.optimize,
        avoid: this.buildAvoidOptions(options),
        departure_time: options.departureTime
          ? new Date(options.departureTime)
          : new Date(),
        traffic_model: options.trafficModel,
        key: process.env.GOOGLE_MAPS_API_KEY!,
      },
    });

    return this.processDirectionsResponse(response.data, stops);
  }

  private async computeOptimizedRoute(
    origin: Location,
    destination: Location,
    waypoints: Location[],
    options?: RouteOptimizationOptions,
  ): Promise<TravelRoute> {
    const response = await this.client.directions({
      params: {
        origin: `${origin.lat},${origin.lng}`,
        destination: `${destination.lat},${destination.lng}`,
        waypoints: waypoints.map((wp) => `${wp.lat},${wp.lng}`),
        optimize: true,
        avoid: this.buildAvoidOptions(options),
        departure_time: options?.departureTime
          ? new Date(options.departureTime)
          : new Date(),
        traffic_model: options?.trafficModel || 'best_guess',
        key: process.env.GOOGLE_MAPS_API_KEY!,
      },
    });

    const stops: RouteStop[] = [
      {
        id: 'origin',
        location: origin,
        name: origin.name || 'Start',
        type: 'pickup',
      },
      ...waypoints.map((wp, index) => ({
        id: `waypoint-${index}`,
        location: wp,
        name: wp.name || `Stop ${index + 1}`,
        type: 'venue' as const,
      })),
      {
        id: 'destination',
        location: destination,
        name: destination.name || 'End',
        type: 'destination',
      },
    ];

    return this.processDirectionsResponse(response.data, stops);
  }

  private processDirectionsResponse(
    response: GoogleMapsDirectionsResponse,
    stops: RouteStop[],
  ): TravelRoute {
    if (!response.routes || response.routes.length === 0) {
      throw new Error('No route found');
    }

    const route = response.routes[0];
    const segments: RouteSegment[] = [];
    let totalDistance = 0;
    let totalDuration = 0;
    let totalDurationInTraffic = 0;

    route.legs.forEach((leg, index) => {
      const traffic = this.analyzeTrafficConditions(leg);

      const segment: RouteSegment = {
        start: stops[index].location,
        end: stops[index + 1].location,
        distance: leg.distance.value,
        duration: leg.duration.value,
        durationInTraffic: leg.duration_in_traffic?.value || leg.duration.value,
        traffic,
        instructions: leg.steps.map((step) => step.html_instructions),
      };

      segments.push(segment);
      totalDistance += leg.distance.value;
      totalDuration += leg.duration.value;
      totalDurationInTraffic += segment.durationInTraffic;
    });

    const routeId = this.generateRouteId(stops);
    const now = new Date().toISOString();

    return {
      id: routeId,
      name: `Route from ${stops[0].name} to ${stops[stops.length - 1].name}`,
      stops,
      segments,
      totalDistance,
      totalDuration,
      totalDurationInTraffic,
      createdAt: now,
      lastCalculated: now,
      bufferTime: this.calculateBufferTime({
        totalDurationInTraffic,
        segments,
      } as any),
    };
  }

  private analyzeTrafficConditions(leg: any): TrafficConditions {
    const normalDuration = leg.duration.value;
    const trafficDuration = leg.duration_in_traffic?.value || normalDuration;
    const delay = Math.max(0, trafficDuration - normalDuration);
    const delayMinutes = Math.ceil(delay / 60);

    let severity: 'light' | 'moderate' | 'heavy' = 'light';
    let description = 'Light traffic conditions';

    if (delay > normalDuration * 0.5) {
      severity = 'heavy';
      description = 'Heavy traffic - significant delays expected';
    } else if (delay > normalDuration * 0.25) {
      severity = 'moderate';
      description = 'Moderate traffic - some delays possible';
    }

    return {
      currentDelay: delayMinutes,
      expectedDelay: delayMinutes,
      severity,
      description,
    };
  }

  private calculateBufferTime(route: TravelRoute): number {
    const trafficDelay = Math.ceil(
      (route.totalDurationInTraffic - route.totalDuration) / 60,
    );
    const baseBuffer = this.defaultBufferTime;

    // Add extra buffer based on traffic conditions
    const maxTrafficSeverity = route.segments.reduce((max, segment) => {
      const severityWeight = { light: 1, moderate: 2, heavy: 3 };
      return Math.max(max, severityWeight[segment.traffic.severity]);
    }, 1);

    const additionalBuffer = maxTrafficSeverity * 5; // 5 minutes per severity level

    return Math.min(baseBuffer + additionalBuffer + trafficDelay, 60); // Cap at 60 minutes
  }

  private calculateConfidence(route: TravelRoute): 'high' | 'medium' | 'low' {
    const avgTrafficDelay =
      route.segments.reduce(
        (sum, segment) => sum + segment.traffic.currentDelay,
        0,
      ) / route.segments.length;

    if (avgTrafficDelay < 5) return 'high';
    if (avgTrafficDelay < 15) return 'medium';
    return 'low';
  }

  private generateWarnings(route: TravelRoute): string[] {
    const warnings: string[] = [];

    const totalDelay = route.segments.reduce(
      (sum, segment) => sum + segment.traffic.currentDelay,
      0,
    );

    if (totalDelay > 30) {
      warnings.push(
        'Significant traffic delays expected. Consider alternative departure time.',
      );
    }

    const heavyTrafficSegments = route.segments.filter(
      (s) => s.traffic.severity === 'heavy',
    );
    if (heavyTrafficSegments.length > 0) {
      warnings.push(
        `Heavy traffic detected on ${heavyTrafficSegments.length} route segment(s).`,
      );
    }

    if (route.totalDistance > 100000) {
      // >100km
      warnings.push('Long distance route - consider rest stops and fuel.');
    }

    return warnings;
  }

  private buildAvoidOptions(options?: RouteOptimizationOptions): string[] {
    const avoid: string[] = [];
    if (options?.avoidTolls) avoid.push('tolls');
    if (options?.avoidHighways) avoid.push('highways');
    return avoid;
  }

  private generateCacheKey(
    stops: RouteStop[],
    options: RouteOptimizationOptions,
  ): string {
    const stopsKey = stops
      .map((s) => `${s.location.lat},${s.location.lng}`)
      .join('|');
    const optionsKey = `${options.optimize}-${options.avoidTolls}-${options.avoidHighways}-${options.trafficModel}`;
    const timeKey = options.departureTime
      ? new Date(options.departureTime).toISOString().slice(0, 13)
      : 'now';
    return `route:${Buffer.from(stopsKey + optionsKey + timeKey).toString('base64')}`;
  }

  private generateRouteId(stops: RouteStop[]): string {
    const timestamp = Date.now();
    const stopsHash = stops
      .map((s) => `${s.location.lat.toFixed(6)},${s.location.lng.toFixed(6)}`)
      .join('-');
    return `route_${timestamp}_${Buffer.from(stopsHash).toString('base64').slice(0, 8)}`;
  }

  private calculateArrivalTime(
    departureTime: string,
    travelTimeMinutes: number,
  ): string {
    const departure = new Date(departureTime);
    const arrival = new Date(departure.getTime() + travelTimeMinutes * 60000);
    return arrival.toISOString();
  }

  private handleRouteError(error: any): RouteValidationError {
    if (error.response?.data?.error_message) {
      return {
        type: 'api_error',
        message: error.response.data.error_message,
        details: error.response.data,
      };
    }

    if (error.message?.includes('ZERO_RESULTS')) {
      return {
        type: 'no_route_found',
        message: 'No route could be found between the specified locations',
        details: error,
      };
    }

    if (error.message?.includes('INVALID_REQUEST')) {
      return {
        type: 'invalid_location',
        message: 'One or more locations are invalid',
        details: error,
      };
    }

    return {
      type: 'api_error',
      message:
        error.message || 'Unknown error occurred while calculating route',
      details: error,
    };
  }
}

// Utility function to create route calculator instance
export function createRouteCalculator(
  config: RouteCalculatorConfig,
): RouteCalculator {
  return new RouteCalculator(config);
}

// Wedding-specific route templates
export const WEDDING_ROUTE_TEMPLATES = {
  PHOTOGRAPHER_DAY: [
    { type: 'pickup', name: 'Bride Preparation', duration: 120 },
    { type: 'venue', name: 'Ceremony Venue', duration: 90 },
    { type: 'venue', name: 'Photo Session Location', duration: 60 },
    { type: 'destination', name: 'Reception Venue', duration: 240 },
  ],
  VENDOR_DELIVERY: [
    { type: 'pickup', name: 'Vendor Location', duration: 30 },
    { type: 'destination', name: 'Wedding Venue', duration: 120 },
  ],
  GUEST_TRANSPORT: [
    { type: 'pickup', name: 'Hotel/Accommodation', duration: 15 },
    { type: 'venue', name: 'Ceremony Venue', duration: 90 },
    { type: 'destination', name: 'Reception Venue', duration: 240 },
  ],
} as const;
