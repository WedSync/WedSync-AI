import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createRouteCalculator } from '@/lib/maps/route-calculator';
import Redis from 'ioredis';

const travelTimeRequestSchema = z.object({
  stops: z
    .array(
      z.object({
        id: z.string(),
        location: z.object({
          lat: z.number(),
          lng: z.number(),
          address: z.string().optional(),
          name: z.string().optional(),
        }),
        name: z.string(),
        type: z.enum(['pickup', 'venue', 'destination']),
      }),
    )
    .min(2),
  departureTime: z.string(),
  options: z
    .object({
      optimize: z.boolean().default(false),
      avoidTolls: z.boolean().default(false),
      avoidHighways: z.boolean().default(false),
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
    const validation = travelTimeRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.errors },
        { status: 400 },
      );
    }

    const { stops, departureTime, options = {} } = validation.data;

    // Validate departure time
    const departure = new Date(departureTime);
    if (isNaN(departure.getTime())) {
      return NextResponse.json(
        { error: 'Invalid departure time format' },
        { status: 400 },
      );
    }

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
      cacheExpiration: 900, // 15 minutes (shorter for time-specific queries)
      defaultBufferTime: 15,
    });

    // Calculate travel time for specific departure
    const travelTime = await calculator.calculateTravelTime(
      stops,
      departureTime,
      options,
    );

    // Get alternative departure times (15 minutes earlier and later)
    const earlier = new Date(departure.getTime() - 15 * 60000).toISOString();
    const later = new Date(departure.getTime() + 15 * 60000).toISOString();

    const [earlierTime, laterTime] = await Promise.allSettled([
      calculator.calculateTravelTime(stops, earlier, options),
      calculator.calculateTravelTime(stops, later, options),
    ]);

    const alternatives = {
      earlier: earlierTime.status === 'fulfilled' ? earlierTime.value : null,
      later: laterTime.status === 'fulfilled' ? laterTime.value : null,
    };

    // Calculate recommendations
    const recommendations = [];

    if (
      alternatives.earlier &&
      alternatives.earlier.totalTravelTime < travelTime.totalTravelTime
    ) {
      const timeSaved =
        travelTime.totalTravelTime - alternatives.earlier.totalTravelTime;
      recommendations.push({
        type: 'departure_adjustment',
        message: `Leave 15 minutes earlier to save ${timeSaved} minutes of travel time`,
        newDepartureTime: earlier,
        timeSaved,
      });
    }

    if (travelTime.confidence === 'low') {
      recommendations.push({
        type: 'buffer_increase',
        message: `Consider adding extra buffer time due to unpredictable traffic conditions`,
        suggestedBuffer: travelTime.bufferTime + 15,
      });
    }

    if (travelTime.warnings.length > 0) {
      recommendations.push({
        type: 'traffic_warning',
        message: 'Traffic conditions may impact your journey',
        warnings: travelTime.warnings,
      });
    }

    return NextResponse.json({
      success: true,
      travelTime,
      alternatives,
      recommendations,
      summary: {
        departureTime,
        arrivalTime: travelTime.arrivalTime,
        totalTime: travelTime.totalTravelTime,
        bufferTime: travelTime.bufferTime,
        confidence: travelTime.confidence,
      },
    });
  } catch (error: any) {
    console.error('Travel time calculation error:', error);

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
      { error: 'Internal server error while calculating travel time' },
      { status: 500 },
    );
  }
}
