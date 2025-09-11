import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@googlemaps/google-maps-services-js';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json(
        { error: 'Address is required' },
        { status: 400 },
      );
    }

    if (!process.env.GOOGLE_MAPS_API_KEY) {
      return NextResponse.json(
        { error: 'Google Maps API not configured' },
        { status: 500 },
      );
    }

    const client = new Client({});

    // Geocode the address
    const response = await client.geocode({
      params: {
        address,
        key: process.env.GOOGLE_MAPS_API_KEY,
        components: {
          country: 'US', // Adjust as needed
        },
      },
    });

    return NextResponse.json({
      success: true,
      results: response.data.results,
      status: response.data.status,
    });
  } catch (error: any) {
    console.error('Geocoding error:', error);

    return NextResponse.json(
      { error: 'Failed to geocode address' },
      { status: 500 },
    );
  }
}
