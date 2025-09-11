import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createRouteCalculator } from '@/lib/maps/route-calculator';
import { createClient } from '@supabase/supabase-js';
import Redis from 'ioredis';

const routeRequestSchema = z.object({
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
        arrivalTime: z.string().optional(),
        departureTime: z.string().optional(),
        stopDuration: z.number().optional(),
        type: z.enum(['pickup', 'venue', 'destination']),
      }),
    )
    .min(2),
  options: z
    .object({
      optimize: z.boolean().default(false),
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
    // Validate API key
    if (!process.env.GOOGLE_MAPS_API_KEY) {
      return NextResponse.json(
        { error: 'Google Maps API not configured' },
        { status: 500 },
      );
    }

    const body = await request.json();
    const validation = routeRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.errors },
        { status: 400 },
      );
    }

    const { stops, options = {} } = validation.data;

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
      cacheExpiration: 1800, // 30 minutes
      defaultBufferTime: 15, // 15 minutes
    });

    // Calculate the route
    const route = await calculator.calculateRoute(stops, options);

    // Save to database if user is authenticated
    const authHeader = request.headers.get('Authorization');
    if (authHeader) {
      try {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
        );

        // Extract user from auth header (simplified)
        const token = authHeader.replace('Bearer ', '');
        const { data: user } = await supabase.auth.getUser(token);

        if (user) {
          // Save route to database
          await supabase.from('travel_routes').insert({
            id: route.id,
            user_id: user.id,
            route_data: route,
            created_at: new Date().toISOString(),
          });
        }
      } catch (error) {
        console.warn('Failed to save route to database:', error);
        // Continue anyway - don't fail the request
      }
    }

    return NextResponse.json({
      success: true,
      route,
    });
  } catch (error: any) {
    console.error('Route calculation error:', error);

    // Handle specific Google Maps API errors
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
      { error: 'Internal server error while calculating route' },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const routeId = searchParams.get('id');

  if (!routeId) {
    return NextResponse.json(
      { error: 'Route ID is required' },
      { status: 400 },
    );
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { data: route, error } = await supabase
      .from('travel_routes')
      .select('*')
      .eq('id', routeId)
      .single();

    if (error || !route) {
      return NextResponse.json({ error: 'Route not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      route: route.route_data,
    });
  } catch (error) {
    console.error('Error fetching route:', error);
    return NextResponse.json(
      { error: 'Failed to fetch route' },
      { status: 500 },
    );
  }
}
