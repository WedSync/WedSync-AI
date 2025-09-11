/**
 * WS-116: Location-based Supplier Search API
 * Geographic search endpoint for vendor discovery
 */

import { NextRequest, NextResponse } from 'next/server';
import { geographicSearchService } from '@/lib/services/geographic-search-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Extract and validate location parameters
    const latitude = parseFloat(searchParams.get('lat') || '');
    const longitude = parseFloat(searchParams.get('lng') || '');
    const radius = parseInt(searchParams.get('radius') || '50');

    if (isNaN(latitude) || isNaN(longitude)) {
      return NextResponse.json(
        { error: 'Valid latitude and longitude are required' },
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
        { error: 'Invalid latitude or longitude values' },
        { status: 400 },
      );
    }

    if (radius < 1 || radius > 500) {
      return NextResponse.json(
        { error: 'Search radius must be between 1 and 500 kilometers' },
        { status: 400 },
      );
    }

    // Extract filter parameters
    const category = searchParams.get('category') || undefined;
    const subcategories =
      searchParams.get('subcategories')?.split(',').filter(Boolean) ||
      undefined;
    const priceRange =
      searchParams.get('priceRange')?.split(',').filter(Boolean) || undefined;
    const minRating = searchParams.get('minRating')
      ? parseFloat(searchParams.get('minRating')!)
      : undefined;
    const verifiedOnly = searchParams.get('verifiedOnly') === 'true';

    // Extract sorting and pagination parameters
    const sortBy = (searchParams.get('sortBy') || 'distance') as
      | 'distance'
      | 'rating'
      | 'price'
      | 'reviews';
    const sortOrder = (searchParams.get('sortOrder') || 'asc') as
      | 'asc'
      | 'desc';
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Validate sorting parameters
    const validSortFields = ['distance', 'rating', 'price', 'reviews'];
    if (!validSortFields.includes(sortBy)) {
      return NextResponse.json(
        {
          error:
            'Invalid sortBy parameter. Must be one of: ' +
            validSortFields.join(', '),
        },
        { status: 400 },
      );
    }

    // Validate pagination
    if (limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: 'Limit must be between 1 and 100' },
        { status: 400 },
      );
    }

    if (offset < 0) {
      return NextResponse.json(
        { error: 'Offset must be non-negative' },
        { status: 400 },
      );
    }

    // Perform the search
    const results = await geographicSearchService.searchSuppliers({
      latitude,
      longitude,
      radius,
      address: searchParams.get('address') || undefined,
      category,
      subcategories,
      priceRange,
      minRating,
      verifiedOnly,
      sortBy,
      sortOrder,
      limit,
      offset,
    });

    return NextResponse.json({
      success: true,
      data: results,
      pagination: {
        limit,
        offset,
        total: results.totalCount,
        hasMore: offset + limit < results.totalCount,
      },
    });
  } catch (error: any) {
    console.error('Location search API error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to search suppliers',
        message: error.message || 'Internal server error',
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const { latitude, longitude, radius } = body;

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return NextResponse.json(
        { error: 'Valid latitude and longitude are required' },
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
        { error: 'Invalid latitude or longitude values' },
        { status: 400 },
      );
    }

    const searchRadius = radius || 50;
    if (searchRadius < 1 || searchRadius > 500) {
      return NextResponse.json(
        { error: 'Search radius must be between 1 and 500 kilometers' },
        { status: 400 },
      );
    }

    // Extract other parameters with defaults
    const {
      address,
      category,
      subcategories = [],
      priceRange = [],
      minRating,
      verifiedOnly = false,
      sortBy = 'distance',
      sortOrder = 'asc',
      limit = 20,
      offset = 0,
    } = body;

    // Perform the search
    const results = await geographicSearchService.searchSuppliers({
      latitude,
      longitude,
      radius: searchRadius,
      address,
      category,
      subcategories,
      priceRange,
      minRating,
      verifiedOnly,
      sortBy,
      sortOrder,
      limit,
      offset,
    });

    return NextResponse.json({
      success: true,
      data: results,
      pagination: {
        limit,
        offset,
        total: results.totalCount,
        hasMore: offset + limit < results.totalCount,
      },
    });
  } catch (error: any) {
    console.error('Location search POST API error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to search suppliers',
        message: error.message || 'Internal server error',
      },
      { status: 500 },
    );
  }
}
