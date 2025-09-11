/**
 * WS-248: Advanced Search System - Core Search Processing Engine
 *
 * AdvancedSearchService: Elasticsearch integration with intelligent
 * relevance scoring, location-based search, and wedding vendor discovery.
 *
 * Team B - Round 1 - Advanced Search Backend Focus
 */

import { RelevanceScoring } from './RelevanceScoring';
import { WeddingVendorScoring } from './WeddingVendorScoring';
import { LocationBasedSearch } from './LocationBasedSearch';

// =====================================================================================
// TYPES & INTERFACES
// =====================================================================================

interface SearchContext {
  userId: string;
  searchId: string;
  userLocation?: {
    latitude: number;
    longitude: number;
    radius?: number;
  };
  searchHistory?: string[];
  preferences?: {
    vendorTypes?: string[];
    budgetRange?: { min: number; max: number };
    preferredLocations?: string[];
  };
}

interface SearchParams {
  query: string;
  searchType: 'vendors' | 'venues' | 'services' | 'all';
  location?: {
    latitude: number;
    longitude: number;
    radius: number;
    address?: string;
  };
  filters?: {
    vendorTypes?: string[];
    priceRange?: { min: number; max: number };
    availability?: { startDate: string; endDate: string };
    rating?: number;
    verified?: boolean;
    featured?: boolean;
    tags?: string[];
  };
  sorting?: {
    by: 'relevance' | 'distance' | 'price' | 'rating' | 'popularity' | 'recent';
    direction: 'asc' | 'desc';
  };
  pagination?: {
    page: number;
    limit: number;
  };
  includeAggregations?: boolean;
  includeHighlights?: boolean;
}

interface SearchResult {
  id: string;
  type: 'vendor' | 'venue' | 'service';
  title: string;
  description: string;
  vendor: {
    id: string;
    name: string;
    type: string;
    verified: boolean;
    rating: number;
    reviewCount: number;
    location: {
      address: string;
      city: string;
      state: string;
      latitude: number;
      longitude: number;
    };
    contact: {
      email: string;
      phone: string;
      website?: string;
    };
  };
  services: Array<{
    id: string;
    name: string;
    category: string;
    priceRange: {
      min: number;
      max: number;
      currency: string;
    };
    availability: boolean;
  }>;
  media: {
    photos: string[];
    videos: string[];
    portfolioUrl?: string;
  };
  searchMetadata: {
    score: number;
    distance?: number;
    highlights: Record<string, string[]>;
    matchedTerms: string[];
  };
}

interface SearchResponse {
  hits: SearchResult[];
  total: number;
  maxScore: number;
  aggregations?: Record<string, any>;
}

// =====================================================================================
// ADVANCED SEARCH SERVICE
// =====================================================================================

export class AdvancedSearchService {
  private supabase: any;
  private relevanceScoring: RelevanceScoring;
  private vendorScoring: WeddingVendorScoring;
  private locationSearch: LocationBasedSearch;

  constructor(supabase: any) {
    this.supabase = supabase;
    this.relevanceScoring = new RelevanceScoring(supabase);
    this.vendorScoring = new WeddingVendorScoring(supabase);
    this.locationSearch = new LocationBasedSearch(supabase);
  }

  // =====================================================================================
  // MAIN SEARCH EXECUTION
  // =====================================================================================

  async executeAdvancedSearch(
    params: SearchParams,
    context: SearchContext,
  ): Promise<SearchResponse | null> {
    try {
      console.log(`Executing advanced search for user ${context.userId}:`, {
        query: params.query,
        searchType: params.searchType,
        filters: params.filters,
      });

      // Step 1: Build search query
      const searchQuery = await this.buildSearchQuery(params, context);

      // Step 2: Execute base search
      const baseResults = await this.executeBaseSearch(searchQuery, params);

      if (!baseResults) {
        return null;
      }

      // Step 3: Apply relevance scoring
      const scoredResults = await this.applyRelevanceScoring(
        baseResults,
        params,
        context,
      );

      // Step 4: Apply location-based filtering and scoring
      const locationFilteredResults = await this.applyLocationFiltering(
        scoredResults,
        params,
        context,
      );

      // Step 5: Apply wedding vendor specific scoring
      const vendorScoredResults = await this.applyVendorScoring(
        locationFilteredResults,
        params,
        context,
      );

      // Step 6: Sort results
      const sortedResults = await this.sortResults(
        vendorScoredResults,
        params.sorting || { by: 'relevance', direction: 'desc' },
      );

      // Step 7: Apply pagination
      const paginatedResults = this.applyPagination(
        sortedResults,
        params.pagination || { page: 1, limit: 20 },
      );

      // Step 8: Enhance with highlights and metadata
      const enhancedResults = await this.enhanceResults(
        paginatedResults,
        params,
        context,
      );

      // Step 9: Generate aggregations if requested
      let aggregations;
      if (params.includeAggregations) {
        aggregations = await this.generateAggregations(sortedResults, params);
      }

      return {
        hits: enhancedResults,
        total: sortedResults.length,
        maxScore:
          sortedResults.length > 0 ? sortedResults[0].searchMetadata.score : 0,
        aggregations,
      };
    } catch (error) {
      console.error('Advanced search execution error:', error);
      return null;
    }
  }

  // =====================================================================================
  // QUERY BUILDING
  // =====================================================================================

  private async buildSearchQuery(
    params: SearchParams,
    context: SearchContext,
  ): Promise<any> {
    const query: any = {
      bool: {
        must: [],
        should: [],
        filter: [],
        must_not: [],
      },
    };

    // Main query text search
    if (params.query && params.query.trim().length > 0) {
      query.bool.must.push({
        multi_match: {
          query: params.query,
          fields: [
            'business_name^3',
            'description^2',
            'services.name^2',
            'services.description',
            'tags^1.5',
            'location.city',
            'location.state',
          ],
          type: 'best_fields',
          fuzziness: 'AUTO',
          prefix_length: 2,
        },
      });

      // Add semantic search boost
      const semanticTerms = await this.extractSemanticTerms(params.query);
      if (semanticTerms.length > 0) {
        query.bool.should.push({
          terms: {
            semantic_tags: semanticTerms,
            boost: 1.2,
          },
        });
      }
    }

    // Search type filter
    if (params.searchType !== 'all') {
      query.bool.filter.push({
        term: { search_type: params.searchType },
      });
    }

    // Vendor type filters
    if (params.filters?.vendorTypes?.length) {
      query.bool.filter.push({
        terms: { 'vendor.type': params.filters.vendorTypes },
      });
    }

    // Price range filter
    if (params.filters?.priceRange) {
      query.bool.filter.push({
        range: {
          'services.price_min': {
            gte: params.filters.priceRange.min,
            lte: params.filters.priceRange.max,
          },
        },
      });
    }

    // Rating filter
    if (params.filters?.rating) {
      query.bool.filter.push({
        range: {
          'vendor.rating': {
            gte: params.filters.rating,
          },
        },
      });
    }

    // Verification filter
    if (params.filters?.verified) {
      query.bool.filter.push({
        term: { 'vendor.verified': true },
      });
    }

    // Featured boost
    if (params.filters?.featured) {
      query.bool.should.push({
        term: {
          featured: true,
          boost: 1.3,
        },
      });
    }

    // Availability filter
    if (params.filters?.availability) {
      query.bool.filter.push({
        range: {
          'availability.available_dates': {
            gte: params.filters.availability.startDate,
            lte: params.filters.availability.endDate,
          },
        },
      });
    }

    // Tags filter
    if (params.filters?.tags?.length) {
      query.bool.filter.push({
        terms: { tags: params.filters.tags },
      });
    }

    // Location-based query
    if (params.location) {
      query.bool.filter.push({
        geo_distance: {
          distance: `${params.location.radius}km`,
          location: {
            lat: params.location.latitude,
            lon: params.location.longitude,
          },
        },
      });

      // Boost closer results
      query.bool.should.push({
        function_score: {
          gauss: {
            location: {
              origin: {
                lat: params.location.latitude,
                lon: params.location.longitude,
              },
              scale: `${params.location.radius / 2}km`,
              decay: 0.5,
            },
          },
          boost: 1.2,
        },
      });
    }

    // User preference boosts
    if (context.preferences?.vendorTypes?.length) {
      query.bool.should.push({
        terms: {
          'vendor.type': context.preferences.vendorTypes,
          boost: 1.1,
        },
      });
    }

    return query;
  }

  // =====================================================================================
  // BASE SEARCH EXECUTION
  // =====================================================================================

  private async executeBaseSearch(
    searchQuery: any,
    params: SearchParams,
  ): Promise<SearchResult[]> {
    try {
      // For now, simulate Elasticsearch with PostgreSQL full-text search
      // In production, this would be replaced with actual Elasticsearch queries

      let query = this.supabase
        .from('suppliers')
        .select(
          `
          id,
          business_name,
          description,
          supplier_type,
          verified,
          average_rating,
          review_count,
          city,
          state,
          latitude,
          longitude,
          contact_email,
          contact_phone,
          website,
          profile_image,
          portfolio_images,
          tags,
          supplier_services (
            id,
            service_name,
            category,
            price_min,
            price_max,
            currency
          )
        `,
        )
        .eq('status', 'active')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      // Apply text search if query provided
      if (params.query && params.query.trim()) {
        query = query.textSearch('search_vector', params.query, {
          type: 'websearch',
          config: 'english',
        });
      }

      // Apply filters
      if (params.filters?.vendorTypes?.length) {
        query = query.in('supplier_type', params.filters.vendorTypes);
      }

      if (params.filters?.rating) {
        query = query.gte('average_rating', params.filters.rating);
      }

      if (params.filters?.verified) {
        query = query.eq('verified', true);
      }

      // Location filtering
      if (params.location) {
        query = query.rpc('suppliers_within_radius', {
          center_lat: params.location.latitude,
          center_lng: params.location.longitude,
          radius_km: params.location.radius,
        });
      }

      const { data, error } = await query
        .order('average_rating', { ascending: false })
        .limit(params.pagination?.limit || 100);

      if (error) {
        console.error('Base search query error:', error);
        return [];
      }

      // Transform to SearchResult format
      return this.transformToSearchResults(data || []);
    } catch (error) {
      console.error('Base search execution error:', error);
      return [];
    }
  }

  // =====================================================================================
  // RELEVANCE SCORING
  // =====================================================================================

  private async applyRelevanceScoring(
    results: SearchResult[],
    params: SearchParams,
    context: SearchContext,
  ): Promise<SearchResult[]> {
    try {
      return await this.relevanceScoring.scoreResults(results, {
        query: params.query,
        searchType: params.searchType,
        userContext: context,
      });
    } catch (error) {
      console.error('Relevance scoring error:', error);
      return results;
    }
  }

  // =====================================================================================
  // LOCATION FILTERING
  // =====================================================================================

  private async applyLocationFiltering(
    results: SearchResult[],
    params: SearchParams,
    context: SearchContext,
  ): Promise<SearchResult[]> {
    if (!params.location) {
      return results;
    }

    try {
      return await this.locationSearch.filterAndScoreByLocation(results, {
        center: {
          latitude: params.location.latitude,
          longitude: params.location.longitude,
        },
        radius: params.location.radius,
        userLocation: context.userLocation,
      });
    } catch (error) {
      console.error('Location filtering error:', error);
      return results;
    }
  }

  // =====================================================================================
  // VENDOR SCORING
  // =====================================================================================

  private async applyVendorScoring(
    results: SearchResult[],
    params: SearchParams,
    context: SearchContext,
  ): Promise<SearchResult[]> {
    try {
      return await this.vendorScoring.scoreWeddingVendors(results, {
        searchQuery: params.query,
        searchType: params.searchType,
        userContext: context,
        filters: params.filters,
      });
    } catch (error) {
      console.error('Vendor scoring error:', error);
      return results;
    }
  }

  // =====================================================================================
  // RESULT SORTING
  // =====================================================================================

  private async sortResults(
    results: SearchResult[],
    sorting: { by: string; direction: string },
  ): Promise<SearchResult[]> {
    const sortFunctions = {
      relevance: (a: SearchResult, b: SearchResult) =>
        b.searchMetadata.score - a.searchMetadata.score,

      distance: (a: SearchResult, b: SearchResult) => {
        const distanceA = a.searchMetadata.distance || Infinity;
        const distanceB = b.searchMetadata.distance || Infinity;
        return sorting.direction === 'asc'
          ? distanceA - distanceB
          : distanceB - distanceA;
      },

      price: (a: SearchResult, b: SearchResult) => {
        const priceA = a.services[0]?.priceRange.min || 0;
        const priceB = b.services[0]?.priceRange.min || 0;
        return sorting.direction === 'asc' ? priceA - priceB : priceB - priceA;
      },

      rating: (a: SearchResult, b: SearchResult) => {
        const ratingA = a.vendor.rating || 0;
        const ratingB = b.vendor.rating || 0;
        return sorting.direction === 'asc'
          ? ratingA - ratingB
          : ratingB - ratingA;
      },

      popularity: (a: SearchResult, b: SearchResult) => {
        const popularityA = a.vendor.reviewCount || 0;
        const popularityB = b.vendor.reviewCount || 0;
        return sorting.direction === 'asc'
          ? popularityA - popularityB
          : popularityB - popularityA;
      },
    };

    const sortFunction = sortFunctions[sorting.by] || sortFunctions.relevance;

    return [...results].sort(sortFunction);
  }

  // =====================================================================================
  // PAGINATION
  // =====================================================================================

  private applyPagination(
    results: SearchResult[],
    pagination: { page: number; limit: number },
  ): SearchResult[] {
    const start = (pagination.page - 1) * pagination.limit;
    const end = start + pagination.limit;
    return results.slice(start, end);
  }

  // =====================================================================================
  // RESULT ENHANCEMENT
  // =====================================================================================

  private async enhanceResults(
    results: SearchResult[],
    params: SearchParams,
    context: SearchContext,
  ): Promise<SearchResult[]> {
    return Promise.all(
      results.map(async (result) => {
        // Add search highlights
        if (params.includeHighlights && params.query) {
          result.searchMetadata.highlights = this.generateHighlights(
            result,
            params.query,
          );
        }

        // Add matched terms
        if (params.query) {
          result.searchMetadata.matchedTerms = this.extractMatchedTerms(
            result,
            params.query,
          );
        }

        // Add portfolio samples if available
        if (result.media.photos.length === 0) {
          const portfolioSamples = await this.getPortfolioSamples(
            result.vendor.id,
          );
          result.media.photos = portfolioSamples.slice(0, 3);
        }

        return result;
      }),
    );
  }

  // =====================================================================================
  // AGGREGATIONS
  // =====================================================================================

  private async generateAggregations(
    results: SearchResult[],
    params: SearchParams,
  ): Promise<Record<string, any>> {
    const aggregations: Record<string, any> = {};

    // Vendor types aggregation
    const vendorTypes = results.reduce((acc, result) => {
      const type = result.vendor.type;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});
    aggregations.vendorTypes = vendorTypes;

    // Price ranges aggregation
    const priceRanges = {
      '0-1000': 0,
      '1000-2500': 0,
      '2500-5000': 0,
      '5000-10000': 0,
      '10000+': 0,
    };

    results.forEach((result) => {
      const minPrice = result.services[0]?.priceRange.min || 0;
      if (minPrice < 1000) priceRanges['0-1000']++;
      else if (minPrice < 2500) priceRanges['1000-2500']++;
      else if (minPrice < 5000) priceRanges['2500-5000']++;
      else if (minPrice < 10000) priceRanges['5000-10000']++;
      else priceRanges['10000+']++;
    });
    aggregations.priceRanges = priceRanges;

    // Rating aggregation
    const ratingRanges = {
      '4.5+': 0,
      '4.0+': 0,
      '3.5+': 0,
      '3.0+': 0,
    };

    results.forEach((result) => {
      const rating = result.vendor.rating;
      if (rating >= 4.5) ratingRanges['4.5+']++;
      if (rating >= 4.0) ratingRanges['4.0+']++;
      if (rating >= 3.5) ratingRanges['3.5+']++;
      if (rating >= 3.0) ratingRanges['3.0+']++;
    });
    aggregations.ratings = ratingRanges;

    // Location aggregation
    const locations = results.reduce((acc, result) => {
      const location = `${result.vendor.location.city}, ${result.vendor.location.state}`;
      acc[location] = (acc[location] || 0) + 1;
      return acc;
    }, {});
    aggregations.locations = locations;

    return aggregations;
  }

  // =====================================================================================
  // UTILITY METHODS
  // =====================================================================================

  private transformToSearchResults(data: any[]): SearchResult[] {
    return data.map((item) => ({
      id: item.id,
      type: 'vendor' as const,
      title: item.business_name,
      description: item.description || '',
      vendor: {
        id: item.id,
        name: item.business_name,
        type: item.supplier_type,
        verified: item.verified || false,
        rating: item.average_rating || 0,
        reviewCount: item.review_count || 0,
        location: {
          address: `${item.city}, ${item.state}`,
          city: item.city,
          state: item.state,
          latitude: item.latitude,
          longitude: item.longitude,
        },
        contact: {
          email: item.contact_email,
          phone: item.contact_phone,
          website: item.website,
        },
      },
      services: (item.supplier_services || []).map((service: any) => ({
        id: service.id,
        name: service.service_name,
        category: service.category,
        priceRange: {
          min: service.price_min || 0,
          max: service.price_max || 0,
          currency: service.currency || 'USD',
        },
        availability: true,
      })),
      media: {
        photos: item.portfolio_images ? item.portfolio_images.slice(0, 5) : [],
        videos: [],
        portfolioUrl: item.website,
      },
      searchMetadata: {
        score: 0.5, // Will be updated by scoring algorithms
        highlights: {},
        matchedTerms: [],
      },
    }));
  }

  private async extractSemanticTerms(query: string): Promise<string[]> {
    // Simple semantic term extraction - would be enhanced with NLP in production
    const weddingTerms = {
      photo: ['photographer', 'photography', 'photos', 'images'],
      venue: ['location', 'hall', 'church', 'outdoor', 'reception'],
      music: ['DJ', 'band', 'entertainment', 'sound'],
      flowers: ['florist', 'bouquet', 'centerpieces', 'decoration'],
      food: ['catering', 'cake', 'dessert', 'dining'],
    };

    const terms = [];
    const queryLower = query.toLowerCase();

    for (const [key, synonyms] of Object.entries(weddingTerms)) {
      if (
        queryLower.includes(key) ||
        synonyms.some((syn) => queryLower.includes(syn))
      ) {
        terms.push(key, ...synonyms);
      }
    }

    return [...new Set(terms)];
  }

  private generateHighlights(
    result: SearchResult,
    query: string,
  ): Record<string, string[]> {
    const highlights: Record<string, string[]> = {};
    const queryTerms = query.toLowerCase().split(/\s+/);

    // Highlight business name
    let highlightedName = result.vendor.name;
    queryTerms.forEach((term) => {
      if (term.length > 2) {
        const regex = new RegExp(`(${term})`, 'gi');
        highlightedName = highlightedName.replace(regex, '<mark>$1</mark>');
      }
    });
    if (highlightedName !== result.vendor.name) {
      highlights.name = [highlightedName];
    }

    // Highlight description
    if (result.description) {
      let highlightedDesc = result.description;
      queryTerms.forEach((term) => {
        if (term.length > 2) {
          const regex = new RegExp(`(${term})`, 'gi');
          highlightedDesc = highlightedDesc.replace(regex, '<mark>$1</mark>');
        }
      });
      if (highlightedDesc !== result.description) {
        highlights.description = [highlightedDesc];
      }
    }

    return highlights;
  }

  private extractMatchedTerms(result: SearchResult, query: string): string[] {
    const queryTerms = query.toLowerCase().split(/\s+/);
    const matchedTerms = [];

    const searchableText = [
      result.vendor.name,
      result.description,
      result.vendor.type,
      ...result.services.map((s) => s.name),
    ]
      .join(' ')
      .toLowerCase();

    queryTerms.forEach((term) => {
      if (term.length > 2 && searchableText.includes(term)) {
        matchedTerms.push(term);
      }
    });

    return [...new Set(matchedTerms)];
  }

  private async getPortfolioSamples(vendorId: string): Promise<string[]> {
    try {
      const { data } = await this.supabase
        .from('supplier_portfolios')
        .select('image_url')
        .eq('supplier_id', vendorId)
        .limit(5);

      return data?.map((item: any) => item.image_url) || [];
    } catch (error) {
      console.error('Portfolio samples error:', error);
      return [];
    }
  }

  // =====================================================================================
  // SUGGESTION GENERATION
  // =====================================================================================

  async generateSuggestedQueries(
    originalQuery: string,
    searchType: string,
    location?: any,
  ): Promise<string[]> {
    try {
      const suggestions = [];

      // Add location-based suggestions
      if (location) {
        const { data: nearbyVendors } = await this.supabase
          .rpc('suppliers_within_radius', {
            center_lat: location.latitude,
            center_lng: location.longitude,
            radius_km: location.radius,
          })
          .select('supplier_type')
          .limit(10);

        const popularTypes = nearbyVendors?.reduce((acc, vendor) => {
          acc[vendor.supplier_type] = (acc[vendor.supplier_type] || 0) + 1;
          return acc;
        }, {});

        Object.keys(popularTypes || {})
          .slice(0, 3)
          .forEach((type) => {
            suggestions.push(`${type} ${location.address || 'near me'}`);
          });
      }

      // Add contextual wedding suggestions
      const weddingContexts = [
        'outdoor wedding photographer',
        'church wedding venue',
        'reception catering',
        'bridal flowers',
        'wedding DJ',
      ];

      suggestions.push(...weddingContexts.slice(0, 3));

      return [...new Set(suggestions)];
    } catch (error) {
      console.error('Suggestion generation error:', error);
      return [];
    }
  }
}
