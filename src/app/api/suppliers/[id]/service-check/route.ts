/**
 * WS-116: Supplier Service Location Check API
 * Check if a supplier serves a specific location
 */

import { NextRequest, NextResponse } from 'next/server';
import { serviceRadiusCalculator } from '@/lib/services/service-radius-calculator';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supplierId = params.id;

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(supplierId)) {
      return NextResponse.json(
        { error: 'Invalid supplier ID format' },
        { status: 400 },
      );
    }

    const { searchParams } = new URL(request.url);
    const latitude = parseFloat(searchParams.get('lat') || '');
    const longitude = parseFloat(searchParams.get('lng') || '');
    const includeRouting = searchParams.get('includeRouting') === 'true';

    // Validate coordinates
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

    const serviceCheck = await serviceRadiusCalculator.checkLocationService(
      supplierId,
      latitude,
      longitude,
      includeRouting,
    );

    return NextResponse.json({
      success: true,
      data: serviceCheck,
    });
  } catch (error: any) {
    console.error('Service check API error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to check service coverage',
        message: error.message || 'Internal server error',
      },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supplierId = params.id;

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(supplierId)) {
      return NextResponse.json(
        { error: 'Invalid supplier ID format' },
        { status: 400 },
      );
    }

    const body = await request.json();
    const { latitude, longitude, includeRouting = false } = body;

    // Validate coordinates
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

    const serviceCheck = await serviceRadiusCalculator.checkLocationService(
      supplierId,
      latitude,
      longitude,
      includeRouting,
    );

    return NextResponse.json({
      success: true,
      data: serviceCheck,
    });
  } catch (error: any) {
    console.error('Service check POST API error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to check service coverage',
        message: error.message || 'Internal server error',
      },
      { status: 500 },
    );
  }
}
