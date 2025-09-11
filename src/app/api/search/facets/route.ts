/**
 * WS-248: Advanced Search System - Faceted Search Filtering API
 *
 * GET /api/search/facets
 * POST /api/search/facets
 *
 * Multi-dimensional search faceting with real-time aggregations,
 * dynamic filtering, and wedding vendor discovery optimization.
 *
 * Team B - Round 1 - Advanced Search Backend Focus
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { FacetedSearchEngine } from '@/lib/services/search/FacetedSearchEngine';

// =====================================================================================
// VALIDATION SCHEMAS
// =====================================================================================

const FacetRequestSchema = z.object({
  query: z.string().optional(),
  filters: z
    .object({
      vendorTypes: z.array(z.string()).optional(),
      locations: z.array(z.string()).optional(),
      priceRanges: z.array(z.string()).optional(),
      ratings: z.array(z.number()).optional(),
      availability: z
        .object({
          startDate: z.string(),
          endDate: z.string(),
        })
        .optional(),
      features: z.array(z.string()).optional(),
      certifications: z.array(z.string()).optional(),
      experienceLevel: z.array(z.string()).optional(),
    })
    .optional(),
  facetConfig: z
    .object({
      includeFacets: z
        .array(
          z.enum([
            'vendorTypes',
            'locations',
            'priceRanges',
            'ratings',
            'availability',
            'features',
            'certifications',
            'experienceLevel',
            'portfolioSize',
            'responseTime',
            'languages',
            'serviceAreas',
          ]),
        )
        .default(['vendorTypes', 'locations', 'priceRanges', 'ratings']),
      maxFacetValues: z.number().min(5).max(100).default(20),
      includeCounts: z.boolean().default(true),
      includePercentages: z.boolean().default(false),
    })
    .optional(),
  searchContext: z
    .object({
      weddingType: z.string().optional(),
      weddingSize: z.number().optional(),
      weddingDate: z.string().optional(),
      budget: z
        .object({
          total: z.number(),
          allocated: z.record(z.number()),
        })
        .optional(),
      location: z
        .object({
          latitude: z.number(),
          longitude: z.number(),
          radius: z.number().default(50),
        })
        .optional(),
    })
    .optional(),
});

// =====================================================================================
// TYPES & INTERFACES
// =====================================================================================

interface FacetValue {
  value: string;
  label: string;
  count: number;
  percentage?: number;
  selected: boolean;
  metadata?: {
    averagePrice?: number;
    averageRating?: number;
    totalVendors?: number;
    popularityScore?: number;
  };
}

interface Facet {
  name: string;
  displayName: string;
  type: 'terms' | 'range' | 'date' | 'nested';
  values: FacetValue[];
  totalValues: number;
  hasMore: boolean;
  metadata?: {
    minValue?: number;
    maxValue?: number;
    averageValue?: number;
    distribution?: Record<string, number>;
  };
}

interface FacetResponse {
  success: boolean;
  facets: Facet[];
  searchMetadata: {
    totalResults: number;
    filteredResults: number;
    executionTime: number;
    facetCount: number;
    appliedFilters: Record<string, any>;
  };
  recommendations?: {
    suggestedFilters: Array<{
      facet: string;
      value: string;
      reason: string;
      potentialResults: number;
    }>;
    filterCombinations: Array<{
      filters: Record<string, any>;
      resultCount: number;
      score: number;
    }>;
  };
  error?: string;
}

// =====================================================================================
// API HANDLERS
// =====================================================================================

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const supabase = createClient();
    const { searchParams } = request.nextUrl;

    // Parse GET parameters
    const requestData = {
      query: searchParams.get('q') || undefined,
      filters: {
        vendorTypes: searchParams.get('vendor_types')?.split(','),
        locations: searchParams.get('locations')?.split(','),
        priceRanges: searchParams.get('price_ranges')?.split(','),
        ratings: searchParams
          .get('ratings')
          ?.split(',')
          .map((r) => parseFloat(r)),
        features: searchParams.get('features')?.split(','),
        certifications: searchParams.get('certifications')?.split(','),
        experienceLevel: searchParams.get('experience_level')?.split(','),
      },
      facetConfig: {
        includeFacets: searchParams.get('facets')?.split(',') || [
          'vendorTypes',
          'locations',
          'priceRanges',
          'ratings',
        ],
        maxFacetValues: Math.min(
          parseInt(searchParams.get('max_values') || '20'),
          100,
        ),
        includeCounts: searchParams.get('include_counts') !== 'false',
        includePercentages: searchParams.get('include_percentages') === 'true',
      },
      searchContext: {
        weddingType: searchParams.get('wedding_type') || undefined,
        weddingSize: searchParams.get('wedding_size')
          ? parseInt(searchParams.get('wedding_size')!)
          : undefined,
        weddingDate: searchParams.get('wedding_date') || undefined,
        location:
          searchParams.get('lat') && searchParams.get('lng')
            ? {
                latitude: parseFloat(searchParams.get('lat')!),
                longitude: parseFloat(searchParams.get('lng')!),
                radius: searchParams.get('radius')
                  ? parseInt(searchParams.get('radius')!)
                  : 50,
              }
            : undefined,
      },
    };

    return await handleFacetRequest(supabase, requestData, startTime);
  } catch (error) {
    console.error('Facets GET API error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve facets',
        executionTime: Date.now() - startTime,
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const supabase = createClient();
    const body = await request.json();

    // Authenticate user for POST requests
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required for POST requests' },
        { status: 401 },
      );
    }

    return await handleFacetRequest(supabase, body, startTime, user.id);
  } catch (error) {
    console.error('Facets POST API error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process facet request',
        executionTime: Date.now() - startTime,
      },
      { status: 500 },
    );
  }
}

// =====================================================================================
// CORE HANDLERS
// =====================================================================================

async function handleFacetRequest(
  supabase: any,
  requestData: any,
  startTime: number,
  userId?: string,
): Promise<NextResponse> {
  // Validate request
  const validation = FacetRequestSchema.safeParse(requestData);
  if (!validation.success) {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid facet request parameters',
        details: validation.error.errors,
      },
      { status: 400 },
    );
  }

  const params = validation.data;

  // Initialize faceted search engine
  const facetEngine = new FacetedSearchEngine(supabase);

  // Execute faceted search
  const facetResults = await facetEngine.generateFacets(params);

  if (!facetResults) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate facets',
      },
      { status: 500 },
    );
  }

  // Generate recommendations if user is authenticated
  let recommendations;
  if (userId) {
    recommendations = await generateFacetRecommendations(
      supabase,
      params,
      facetResults,
      userId,
    );
  }

  const response: FacetResponse = {
    success: true,
    facets: facetResults.facets,
    searchMetadata: {
      totalResults: facetResults.totalResults,
      filteredResults: facetResults.filteredResults,
      executionTime: Date.now() - startTime,
      facetCount: facetResults.facets.length,
      appliedFilters: params.filters || {},
    },
    recommendations,
  };

  // Add performance headers
  const headers = {
    'X-Execution-Time': (Date.now() - startTime).toString(),
    'Cache-Control': 'public, max-age=180, stale-while-revalidate=600',
  };

  return NextResponse.json(response, { headers });
}

// =====================================================================================
// FACET GENERATION LOGIC
// =====================================================================================

async function generateVendorTypeFacets(
  supabase: any,
  params: any,
  config: any,
): Promise<Facet> {
  let query = supabase
    .from('suppliers')
    .select('supplier_type, COUNT(*) as count', { count: 'exact' })
    .eq('status', 'active');

  // Apply existing filters (except vendor type)
  if (params.filters?.locations?.length) {
    query = query.in('city', params.filters.locations);
  }

  if (params.filters?.ratings?.length) {
    query = query.gte('average_rating', Math.min(...params.filters.ratings));
  }

  // Add location-based filtering
  if (params.searchContext?.location) {
    query = query.rpc('suppliers_within_radius', {
      center_lat: params.searchContext.location.latitude,
      center_lng: params.searchContext.location.longitude,
      radius_km: params.searchContext.location.radius,
    });
  }

  const { data, error, count } = await query
    .group('supplier_type')
    .order('count', { ascending: false })
    .limit(config.maxFacetValues);

  if (error) {
    console.error('Vendor type facet error:', error);
    return createEmptyFacet('vendorTypes', 'Vendor Types');
  }

  const totalResults = count || 0;
  const values: FacetValue[] =
    data?.map((item: any) => ({
      value: item.supplier_type,
      label: formatVendorTypeLabel(item.supplier_type),
      count: item.count,
      percentage: config.includePercentages
        ? (item.count / totalResults) * 100
        : undefined,
      selected:
        params.filters?.vendorTypes?.includes(item.supplier_type) || false,
      metadata: {
        totalVendors: item.count,
      },
    })) || [];

  return {
    name: 'vendorTypes',
    displayName: 'Vendor Types',
    type: 'terms',
    values,
    totalValues: values.length,
    hasMore: values.length >= config.maxFacetValues,
    metadata: {
      distribution: Object.fromEntries(values.map((v) => [v.value, v.count])),
    },
  };
}

async function generateLocationFacets(
  supabase: any,
  params: any,
  config: any,
): Promise<Facet> {
  let query = supabase
    .from('suppliers')
    .select('city, state, COUNT(*) as count')
    .eq('status', 'active');

  // Apply existing filters (except locations)
  if (params.filters?.vendorTypes?.length) {
    query = query.in('supplier_type', params.filters.vendorTypes);
  }

  if (params.filters?.ratings?.length) {
    query = query.gte('average_rating', Math.min(...params.filters.ratings));
  }

  const { data, error } = await query
    .group(['city', 'state'])
    .order('count', { ascending: false })
    .limit(config.maxFacetValues);

  if (error) {
    console.error('Location facet error:', error);
    return createEmptyFacet('locations', 'Locations');
  }

  const values: FacetValue[] =
    data?.map((item: any) => ({
      value: `${item.city}, ${item.state}`,
      label: `${item.city}, ${item.state}`,
      count: item.count,
      percentage: config.includePercentages ? undefined : undefined, // Would need total count
      selected:
        params.filters?.locations?.includes(`${item.city}, ${item.state}`) ||
        false,
      metadata: {
        totalVendors: item.count,
      },
    })) || [];

  return {
    name: 'locations',
    displayName: 'Locations',
    type: 'terms',
    values,
    totalValues: values.length,
    hasMore: values.length >= config.maxFacetValues,
  };
}

async function generatePriceRangeFacets(
  supabase: any,
  params: any,
  config: any,
): Promise<Facet> {
  // Define price ranges for wedding vendors
  const priceRanges = [
    { label: 'Under $1,000', min: 0, max: 1000, value: '0-1000' },
    { label: '$1,000 - $2,500', min: 1000, max: 2500, value: '1000-2500' },
    { label: '$2,500 - $5,000', min: 2500, max: 5000, value: '2500-5000' },
    { label: '$5,000 - $10,000', min: 5000, max: 10000, value: '5000-10000' },
    {
      label: '$10,000 - $25,000',
      min: 10000,
      max: 25000,
      value: '10000-25000',
    },
    { label: 'Over $25,000', min: 25000, max: 999999999, value: '25000+' },
  ];

  const values: FacetValue[] = [];

  for (const range of priceRanges) {
    let query = supabase
      .from('supplier_services')
      .select('id', { count: 'exact' })
      .gte('price_min', range.min)
      .lte('price_max', range.max);

    // Apply existing filters
    if (params.filters?.vendorTypes?.length) {
      query = query.in('supplier_type', params.filters.vendorTypes);
    }

    const { count } = await query;

    if (count && count > 0) {
      values.push({
        value: range.value,
        label: range.label,
        count,
        selected: params.filters?.priceRanges?.includes(range.value) || false,
        metadata: {
          averagePrice: (range.min + range.max) / 2,
          totalVendors: count,
        },
      });
    }
  }

  return {
    name: 'priceRanges',
    displayName: 'Price Ranges',
    type: 'range',
    values,
    totalValues: values.length,
    hasMore: false,
    metadata: {
      minValue: 0,
      maxValue: 25000,
      distribution: Object.fromEntries(values.map((v) => [v.value, v.count])),
    },
  };
}

async function generateRatingFacets(
  supabase: any,
  params: any,
  config: any,
): Promise<Facet> {
  const ratingRanges = [
    { label: '4.5+ Stars', min: 4.5, value: '4.5+' },
    { label: '4.0+ Stars', min: 4.0, value: '4.0+' },
    { label: '3.5+ Stars', min: 3.5, value: '3.5+' },
    { label: '3.0+ Stars', min: 3.0, value: '3.0+' },
  ];

  const values: FacetValue[] = [];

  for (const range of ratingRanges) {
    let query = supabase
      .from('suppliers')
      .select('id', { count: 'exact' })
      .gte('average_rating', range.min)
      .eq('status', 'active');

    // Apply existing filters
    if (params.filters?.vendorTypes?.length) {
      query = query.in('supplier_type', params.filters.vendorTypes);
    }

    if (params.filters?.locations?.length) {
      query = query.in(
        'city',
        params.filters.locations.map((l: string) => l.split(',')[0].trim()),
      );
    }

    const { count } = await query;

    if (count && count > 0) {
      values.push({
        value: range.value,
        label: range.label,
        count,
        selected: params.filters?.ratings?.includes(range.min) || false,
        metadata: {
          averageRating: range.min,
          totalVendors: count,
        },
      });
    }
  }

  return {
    name: 'ratings',
    displayName: 'Ratings',
    type: 'range',
    values,
    totalValues: values.length,
    hasMore: false,
    metadata: {
      minValue: 3.0,
      maxValue: 5.0,
      averageValue: 4.2,
    },
  };
}

// =====================================================================================
// RECOMMENDATION ENGINE
// =====================================================================================

async function generateFacetRecommendations(
  supabase: any,
  params: any,
  facetResults: any,
  userId: string,
) {
  try {
    // Get user preferences and history
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('wedding_preferences, search_history')
      .eq('id', userId)
      .single();

    const suggestions = [];
    const filterCombinations = [];

    // Analyze current search and suggest improvements
    if (facetResults.filteredResults < 10) {
      // Too few results - suggest broader filters
      suggestions.push({
        facet: 'location',
        value: 'expand_radius',
        reason: 'Expand search radius to find more vendors',
        potentialResults: Math.ceil(facetResults.filteredResults * 2.5),
      });
    } else if (facetResults.filteredResults > 100) {
      // Too many results - suggest narrower filters
      const popularVendorType = facetResults.facets.find(
        (f: any) => f.name === 'vendorTypes',
      )?.values[0];

      if (popularVendorType) {
        suggestions.push({
          facet: 'vendorTypes',
          value: popularVendorType.value,
          reason: `Focus on ${popularVendorType.label} to narrow results`,
          potentialResults: popularVendorType.count,
        });
      }
    }

    // Generate effective filter combinations
    const combinations = await analyzeFilterCombinations(supabase, params);
    filterCombinations.push(...combinations.slice(0, 3));

    return {
      suggestedFilters: suggestions,
      filterCombinations,
    };
  } catch (error) {
    console.error('Failed to generate recommendations:', error);
    return undefined;
  }
}

async function analyzeFilterCombinations(supabase: any, params: any) {
  // Analyze which filter combinations yield good result sets
  const combinations = [
    { filters: { vendorTypes: ['photographer'], ratings: [4.0] }, weight: 0.9 },
    {
      filters: { vendorTypes: ['venue'], priceRanges: ['5000-10000'] },
      weight: 0.8,
    },
    { filters: { ratings: [4.5], certifications: ['verified'] }, weight: 0.85 },
  ];

  const results = [];

  for (const combo of combinations) {
    try {
      // Count results for this combination
      let query = supabase
        .from('suppliers')
        .select('id', { count: 'exact' })
        .eq('status', 'active');

      if (combo.filters.vendorTypes) {
        query = query.in('supplier_type', combo.filters.vendorTypes);
      }

      if (combo.filters.ratings) {
        query = query.gte('average_rating', Math.min(...combo.filters.ratings));
      }

      const { count } = await query;

      results.push({
        filters: combo.filters,
        resultCount: count || 0,
        score: combo.weight * Math.min(count || 0 / 50, 1), // Normalize to 0-1
      });
    } catch (error) {
      console.error('Filter combination analysis error:', error);
    }
  }

  return results.sort((a, b) => b.score - a.score);
}

// =====================================================================================
// UTILITY FUNCTIONS
// =====================================================================================

function createEmptyFacet(name: string, displayName: string): Facet {
  return {
    name,
    displayName,
    type: 'terms',
    values: [],
    totalValues: 0,
    hasMore: false,
  };
}

function formatVendorTypeLabel(vendorType: string): string {
  return vendorType
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export const dynamic = 'force-dynamic';
