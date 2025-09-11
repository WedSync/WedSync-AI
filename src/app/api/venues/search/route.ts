import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { googlePlacesService } from '@/lib/services/google-places-service';
import {
  VenueSearchParams,
  VenueType,
  VenueSearchResponse,
} from '@/types/venue';

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(
  identifier: string,
  limit: number = 10,
  windowMs: number = 60000,
): boolean {
  const now = Date.now();
  const userLimit = rateLimitStore.get(identifier);

  if (!userLimit || now > userLimit.resetTime) {
    rateLimitStore.set(identifier, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (userLimit.count >= limit) {
    return false;
  }

  userLimit.count++;
  return true;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    // Rate limiting
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const identifier = `${user.id}_${userAgent}`;

    if (!checkRateLimit(identifier, 20, 60000)) {
      // 20 requests per minute
      return NextResponse.json(
        {
          error:
            'Rate limit exceeded. Please wait before making another request.',
        },
        { status: 429 },
      );
    }

    // Parse search parameters
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query');
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const radius = searchParams.get('radius');
    const type = searchParams.get('type') as VenueType;
    const priceLevel = searchParams.get('priceLevel');

    // Validate required parameters
    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 },
      );
    }

    if (query.length > 200) {
      return NextResponse.json(
        { error: 'Search query too long (max 200 characters)' },
        { status: 400 },
      );
    }

    // Build search parameters
    const venueSearchParams: VenueSearchParams = {
      query: query.trim(),
    };

    // Add location if provided
    if (lat && lng) {
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);

      if (isNaN(latitude) || isNaN(longitude)) {
        return NextResponse.json(
          { error: 'Invalid latitude or longitude' },
          { status: 400 },
        );
      }

      if (
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180
      ) {
        return NextResponse.json(
          {
            error:
              'Latitude must be between -90 and 90, longitude between -180 and 180',
          },
          { status: 400 },
        );
      }

      venueSearchParams.location = { lat: latitude, lng: longitude };
    }

    // Add radius if provided
    if (radius) {
      const radiusNum = parseInt(radius);
      if (!isNaN(radiusNum) && radiusNum > 0 && radiusNum <= 100000) {
        // Max 100km
        venueSearchParams.radius = radiusNum;
      }
    }

    // Add venue type if provided
    if (type && Object.values(VenueType).includes(type)) {
      venueSearchParams.type = type;
    }

    // Add price level if provided
    if (priceLevel) {
      const priceLevels = priceLevel
        .split(',')
        .map((p) => parseInt(p))
        .filter((p) => !isNaN(p) && p >= 0 && p <= 4);
      if (priceLevels.length > 0) {
        venueSearchParams.priceLevel = priceLevels;
      }
    }

    // Search venues
    const { venues, fromCache } =
      await googlePlacesService.searchVenues(venueSearchParams);

    // Build response
    const response: VenueSearchResponse = {
      venues,
      total: venues.length,
      has_more: false, // Google Places doesn't support pagination in this implementation
      search_metadata: {
        query: venueSearchParams.query,
        location: venueSearchParams.location,
        radius: venueSearchParams.radius,
        cached: fromCache,
      },
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': fromCache
          ? 'public, s-maxage=3600'
          : 'public, s-maxage=300', // Cache longer if from our cache
        'X-Search-Cached': fromCache.toString(),
        'X-Search-Results': venues.length.toString(),
      },
    });
  } catch (error) {
    console.error('Venue search API error:', error);

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('rate limit')) {
        return NextResponse.json(
          {
            error:
              'Search service temporarily unavailable. Please try again later.',
          },
          { status: 429 },
        );
      }

      if (error.message.includes('API key')) {
        return NextResponse.json(
          { error: 'Search service configuration error' },
          { status: 500 },
        );
      }
    }

    return NextResponse.json(
      { error: 'An unexpected error occurred while searching venues' },
      { status: 500 },
    );
  }
}
