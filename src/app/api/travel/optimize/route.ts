import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createRouteCalculator } from '@/lib/maps/route-calculator';
import Redis from 'ioredis';

const optimizeRequestSchema = z.object({
  origin: z.object({
    lat: z.number(),
    lng: z.number(),
    address: z.string().optional(),
    name: z.string().optional(),
  }),
  destination: z.object({
    lat: z.number(),
    lng: z.number(),
    address: z.string().optional(),
    name: z.string().optional(),
  }),
  waypoints: z.array(
    z.object({
      lat: z.number(),
      lng: z.number(),
      address: z.string().optional(),
      name: z.string().optional(),
    }),
  ),
  options: z
    .object({
      avoidTolls: z.boolean().default(false),
      avoidHighways: z.boolean().default(false),
      departureTime: z.string().optional(),
      trafficModel: z
        .enum(['best_guess', 'pessimistic', 'optimistic'])
        .default('best_guess'),
    })
    .optional(),
});

export async function POST(request: NextRequest) {
  try {
    if (!process.env.GOOGLE_MAPS_API_KEY) {
      return NextResponse.json(
        { error: 'Google Maps API not configured' },
        { status: 500 },
      );
    }

    const body = await request.json();
    const validation = optimizeRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.errors },
        { status: 400 },
      );
    }

    const { origin, destination, waypoints, options = {} } = validation.data;

    // Initialize Redis for caching (optional)
    let redis: Redis | undefined;
    try {
      if (process.env.REDIS_URL) {
        redis = new Redis(process.env.REDIS_URL);
      }
    } catch (error) {
      console.warn('Redis not available, proceeding without caching:', error);
    }

    // Create route calculator
    const calculator = createRouteCalculator({
      apiKey: process.env.GOOGLE_MAPS_API_KEY,
      redis,
      cacheExpiration: 1800,
      defaultBufferTime: 15,
    });

    // Optimize the route
    const optimizedRoute = await calculator.optimizeRoute(
      origin,
      destination,
      waypoints,
      options,
    );

    // Also get alternative routes for comparison
    const alternatives = await calculator.getAlternativeRoutes(
      optimizedRoute.stops,
      options,
    );

    return NextResponse.json({
      success: true,
      optimizedRoute,
      alternatives,
      timeSaved:
        alternatives.length > 1
          ? Math.ceil(
              (alternatives[1].totalDurationInTraffic -
                optimizedRoute.totalDurationInTraffic) /
                60,
            )
          : 0,
    });
  } catch (error: any) {
    console.error('Route optimization error:', error);

    if (error.type === 'api_error') {
      return NextResponse.json(
        { error: error.message, type: error.type },
        { status: 400 },
      );
    }

    if (error.type === 'no_route_found') {
      return NextResponse.json(
        { error: error.message, type: error.type },
        { status: 404 },
      );
    }

    if (error.type === 'invalid_location') {
      return NextResponse.json(
        { error: error.message, type: error.type },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: 'Internal server error while optimizing route' },
      { status: 500 },
    );
  }
}
