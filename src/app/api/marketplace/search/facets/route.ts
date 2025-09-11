/**
 * WS-114: Marketplace Search Facets API Endpoint
 *
 * GET /api/marketplace/search/facets
 *
 * Provides dynamic filter facets and counts for marketplace search,
 * enabling users to see available filter options and result counts.
 *
 * Team B - Batch 9 - Round 1
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
);

// =====================================================================================
// REQUEST/RESPONSE INTERFACES
// =====================================================================================

interface FacetFilters {
  query?: string;
  category?: string;
  subcategory?: string;
  priceMin?: number;
  priceMax?: number;
  ratingMin?: number;
  tier?: string;
  tags?: string[];
  weddingTypes?: string[];
}

interface FacetItem {
  value: string;
  label: string;
  count: number;
  percentage?: number;
}

interface PriceRangeFacet {
  min: number;
  max: number;
  label: string;
  count: number;
  percentage?: number;
}

interface FacetsResponse {
  success: boolean;
  facets?: {
    categories: FacetItem[];
    subcategories: FacetItem[];
    tiers: FacetItem[];
    priceRanges: PriceRangeFacet[];
    ratings: FacetItem[];
    tags: FacetItem[];
    weddingTypes: FacetItem[];
    priceStats: {
      min: number;
      max: number;
      avg: number;
      median: number;
    };
    ratingStats: {
      min: number;
      max: number;
      avg: number;
      distribution: { [rating: string]: number };
    };
  };
  metadata?: {
    totalResults: number;
    responseTime: number;
    appliedFilters: FacetFilters;
  };
  error?: string;
}

// =====================================================================================
// API HANDLERS
// =====================================================================================

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const { searchParams } = request.nextUrl;

    // Parse filters to apply when calculating facets
    const filters: FacetFilters = {
      query: searchParams.get('q') || undefined,
      category: searchParams.get('category') || undefined,
      subcategory: searchParams.get('subcategory') || undefined,
      priceMin: searchParams.get('price_min')
        ? parseInt(searchParams.get('price_min')!)
        : undefined,
      priceMax: searchParams.get('price_max')
        ? parseInt(searchParams.get('price_max')!)
        : undefined,
      ratingMin: searchParams.get('rating_min')
        ? parseFloat(searchParams.get('rating_min')!)
        : undefined,
      tier: searchParams.get('tier') || undefined,
      tags: searchParams.get('tags')
        ? searchParams.get('tags')!.split(',')
        : undefined,
      weddingTypes: searchParams.get('wedding_types')
        ? searchParams.get('wedding_types')!.split(',')
        : undefined,
    };

    // Get the filtered dataset that facets will be calculated from
    const baseResults = await getFilteredResults(filters);

    if (!baseResults) {
      return NextResponse.json(
        { success: false, error: 'Failed to retrieve facet data' },
        { status: 500 },
      );
    }

    // Calculate all facets from the filtered results
    const facets = await calculateFacets(baseResults, filters);

    const responseTime = Date.now() - startTime;

    const response: FacetsResponse = {
      success: true,
      facets,
      metadata: {
        totalResults: baseResults.length,
        responseTime,
        appliedFilters: filters,
      },
    };

    // Add cache headers for performance
    const cacheHeaders = {
      'Cache-Control': 'public, max-age=120, stale-while-revalidate=300',
    };

    return NextResponse.json(response, { headers: cacheHeaders });
  } catch (error) {
    console.error('Facets API error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate facets. Please try again.',
      },
      { status: 500 },
    );
  }
}

// =====================================================================================
// HELPER FUNCTIONS
// =====================================================================================

async function getFilteredResults(
  filters: FacetFilters,
): Promise<any[] | null> {
  try {
    let query = supabase
      .from('marketplace_templates')
      .select('*')
      .eq('status', 'active');

    // Apply text search if query provided
    if (filters.query && filters.query.length > 0) {
      query = query.textSearch('search_vector', filters.query, {
        type: 'websearch',
        config: 'english',
      });
    }

    // Apply filters (but not all - some are excluded for facet calculation)
    if (filters.subcategory) {
      query = query.eq('subcategory', filters.subcategory);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Filtered results query error:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Get filtered results error:', error);
    return null;
  }
}

async function calculateFacets(results: any[], appliedFilters: FacetFilters) {
  const totalResults = results.length;

  // Helper function to calculate percentage
  const calcPercentage = (count: number) =>
    totalResults > 0 ? Math.round((count / totalResults) * 100) : 0;

  // 1. Categories facet
  const categoryCounts: { [key: string]: number } = {};
  const subcategoryCounts: { [key: string]: number } = {};
  const tierCounts: { [key: string]: number } = {};
  const tagCounts: { [key: string]: number } = {};
  const weddingTypeCounts: { [key: string]: number } = {};

  let priceValues: number[] = [];
  let ratingValues: number[] = [];
  const ratingDistribution: { [key: string]: number } = {};

  // Process each result to build facet counts
  results.forEach((template) => {
    // Categories (don't include if category filter is applied)
    if (!appliedFilters.category) {
      categoryCounts[template.category] =
        (categoryCounts[template.category] || 0) + 1;
    }

    // Subcategories (filter by category if applied)
    if (
      !appliedFilters.subcategory &&
      (!appliedFilters.category ||
        template.category === appliedFilters.category)
    ) {
      if (template.subcategory) {
        subcategoryCounts[template.subcategory] =
          (subcategoryCounts[template.subcategory] || 0) + 1;
      }
    }

    // Tiers (don't include if tier filter is applied)
    if (!appliedFilters.tier) {
      tierCounts[template.minimum_tier] =
        (tierCounts[template.minimum_tier] || 0) + 1;
    }

    // Price values for range calculations
    if (template.price_cents !== null && template.price_cents !== undefined) {
      priceValues.push(template.price_cents);
    }

    // Rating values and distribution
    if (
      template.average_rating !== null &&
      template.average_rating !== undefined
    ) {
      ratingValues.push(template.average_rating);
      const ratingKey = Math.floor(template.average_rating).toString();
      ratingDistribution[ratingKey] = (ratingDistribution[ratingKey] || 0) + 1;
    }

    // Tags (limit to avoid too many options)
    if (template.tags && Array.isArray(template.tags)) {
      template.tags.forEach((tag: string) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    }

    // Wedding types
    if (
      template.target_wedding_types &&
      Array.isArray(template.target_wedding_types)
    ) {
      template.target_wedding_types.forEach((type: string) => {
        weddingTypeCounts[type] = (weddingTypeCounts[type] || 0) + 1;
      });
    }
  });

  // Convert counts to facet items and sort
  const categories: FacetItem[] = Object.entries(categoryCounts)
    .map(
      ([value, count]): FacetItem => ({
        value,
        label: formatCategoryLabel(value),
        count,
        percentage: calcPercentage(count),
      }),
    )
    .sort((a, b) => b.count - a.count);

  const subcategories: FacetItem[] = Object.entries(subcategoryCounts)
    .map(
      ([value, count]): FacetItem => ({
        value,
        label: formatSubcategoryLabel(value),
        count,
        percentage: calcPercentage(count),
      }),
    )
    .sort((a, b) => b.count - a.count);

  const tiers: FacetItem[] = Object.entries(tierCounts)
    .map(
      ([value, count]): FacetItem => ({
        value,
        label: formatTierLabel(value),
        count,
        percentage: calcPercentage(count),
      }),
    )
    .sort((a, b) => {
      const tierOrder = { starter: 1, professional: 2, scale: 3 };
      return (tierOrder[a.value] || 0) - (tierOrder[b.value] || 0);
    });

  // Price ranges
  const priceStats = calculatePriceStats(priceValues);
  const priceRanges: PriceRangeFacet[] = calculatePriceRanges(
    priceValues,
    calcPercentage,
  );

  // Ratings facet
  const ratings: FacetItem[] = [
    {
      value: '4.5',
      label: '4.5+ stars',
      count: ratingValues.filter((r) => r >= 4.5).length,
    },
    {
      value: '4.0',
      label: '4.0+ stars',
      count: ratingValues.filter((r) => r >= 4.0).length,
    },
    {
      value: '3.5',
      label: '3.5+ stars',
      count: ratingValues.filter((r) => r >= 3.5).length,
    },
    {
      value: '3.0',
      label: '3.0+ stars',
      count: ratingValues.filter((r) => r >= 3.0).length,
    },
  ]
    .map((item) => ({ ...item, percentage: calcPercentage(item.count) }))
    .filter((item) => item.count > 0);

  // Tags (limit to top 20 most popular)
  const tags: FacetItem[] = Object.entries(tagCounts)
    .map(
      ([value, count]): FacetItem => ({
        value,
        label: formatTagLabel(value),
        count,
        percentage: calcPercentage(count),
      }),
    )
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  // Wedding types
  const weddingTypes: FacetItem[] = Object.entries(weddingTypeCounts)
    .map(
      ([value, count]): FacetItem => ({
        value,
        label: formatWeddingTypeLabel(value),
        count,
        percentage: calcPercentage(count),
      }),
    )
    .sort((a, b) => b.count - a.count);

  const ratingStats = {
    min: ratingValues.length > 0 ? Math.min(...ratingValues) : 0,
    max: ratingValues.length > 0 ? Math.max(...ratingValues) : 5,
    avg:
      ratingValues.length > 0
        ? ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length
        : 0,
    distribution: ratingDistribution,
  };

  return {
    categories,
    subcategories,
    tiers,
    priceRanges,
    ratings,
    tags,
    weddingTypes,
    priceStats,
    ratingStats,
  };
}

function calculatePriceStats(priceValues: number[]) {
  if (priceValues.length === 0) {
    return { min: 0, max: 10000, avg: 0, median: 0 };
  }

  const sorted = [...priceValues].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const avg = priceValues.reduce((a, b) => a + b, 0) / priceValues.length;
  const median =
    sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];

  return { min, max, avg: Math.round(avg), median: Math.round(median) };
}

function calculatePriceRanges(
  priceValues: number[],
  calcPercentage: (count: number) => number,
): PriceRangeFacet[] {
  if (priceValues.length === 0) {
    return [];
  }

  const ranges: PriceRangeFacet[] = [
    { min: 0, max: 1000, label: 'Under £10', count: 0 },
    { min: 1000, max: 2500, label: '£10 - £25', count: 0 },
    { min: 2500, max: 5000, label: '£25 - £50', count: 0 },
    { min: 5000, max: 10000, label: '£50 - £100', count: 0 },
    { min: 10000, max: Infinity, label: '£100+', count: 0 },
  ];

  priceValues.forEach((price) => {
    ranges.forEach((range) => {
      if (price >= range.min && price < range.max) {
        range.count++;
      }
    });
  });

  return ranges
    .map((range) => ({ ...range, percentage: calcPercentage(range.count) }))
    .filter((range) => range.count > 0);
}

// Label formatting functions
function formatCategoryLabel(category: string): string {
  return category
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatSubcategoryLabel(subcategory: string): string {
  return subcategory
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatTierLabel(tier: string): string {
  const labels = {
    starter: 'Starter',
    professional: 'Professional',
    scale: 'Scale',
  };
  return labels[tier] || tier;
}

function formatTagLabel(tag: string): string {
  return tag
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatWeddingTypeLabel(type: string): string {
  const labels = {
    luxury: 'Luxury Weddings',
    budget: 'Budget-Friendly',
    destination: 'Destination Weddings',
    intimate: 'Intimate Ceremonies',
    traditional: 'Traditional Weddings',
    modern: 'Modern Weddings',
    outdoor: 'Outdoor Weddings',
    church: 'Church Weddings',
    beach: 'Beach Weddings',
    garden: 'Garden Weddings',
  };
  return labels[type] || type.charAt(0).toUpperCase() + type.slice(1);
}
