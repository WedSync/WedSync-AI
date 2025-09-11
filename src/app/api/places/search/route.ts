import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@googlemaps/google-maps-services-js';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query) {
      return NextResponse.json(
        { error: 'Search query is required' },
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

    // Use Places Autocomplete API
    const response = await client.placeAutocomplete({
      params: {
        input: query,
        key: process.env.GOOGLE_MAPS_API_KEY,
        types: 'establishment|geocode', // Include both places and addresses
        components: ['country:us'], // Restrict to US (adjust as needed)
      },
    });

    return NextResponse.json({
      success: true,
      predictions: response.data.predictions,
    });
  } catch (error: any) {
    console.error('Places search error:', error);

    return NextResponse.json(
      { error: 'Failed to search places' },
      { status: 500 },
    );
  }
}
