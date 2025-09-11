/**
 * WS-114: Marketplace Search Page - Main Component
 *
 * Complete marketplace search experience combining search interface,
 * filter sidebar, and results management with performance optimizations.
 *
 * Team B - Batch 9 - Round 1
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MarketplaceSearchInterface } from './MarketplaceSearchInterface';
import { MarketplaceFilterSidebar } from './MarketplaceFilterSidebar';
import { MarketplaceSearchResults } from './MarketplaceSearchResults';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Filter, X } from 'lucide-react';

// =====================================================================================
// INTERFACES
// =====================================================================================

interface SearchFilters {
  category?: string;
  subcategory?: string;
  priceMin?: number;
  priceMax?: number;
  ratingMin?: number;
  tier?: string;
  tags?: string[];
  weddingTypes?: string[];
}

interface MarketplaceTemplate {
  id: string;
  supplier_id: string;
  title: string;
  description: string;
  template_type: string;
  category: string;
  subcategory: string;
  price_cents: number;
  currency: string;
  minimum_tier: string;
  preview_data: object;
  preview_images: string[];
  demo_url: string | null;
  install_count: number;
  view_count: number;
  conversion_rate: number;
  average_rating: number;
  rating_count: number;
  target_wedding_types: string[];
  target_price_range: string;
  tags: string[];
  featured: boolean;
  created_at: string;
  updated_at: string;
  search_rank?: number;
  highlighted_title?: string;
  highlighted_description?: string;
}

interface SearchResults {
  templates: MarketplaceTemplate[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  facets?: any;
  searchMetadata: {
    query: string;
    resultCount: number;
    searchTime: number;
    filters: SearchFilters;
    sortBy: string;
    sortDirection: string;
  };
}

interface MarketplaceSearchPageProps {
  className?: string;
}

// =====================================================================================
// MAIN COMPONENT
// =====================================================================================

export function MarketplaceSearchPage({
  className = '',
}: MarketplaceSearchPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State management
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({});
  const [sortBy, setSortBy] = useState('relevance');
  const [sortDirection, setSortDirection] = useState<'ASC' | 'DESC'>('DESC');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(24);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  // Initialize state from URL parameters
  useEffect(() => {
    initializeFromUrl();
  }, [searchParams]);

  // Perform search when parameters change
  useEffect(() => {
    performSearch();
  }, [query, filters, sortBy, sortDirection, page, limit]);

  // Update URL when search parameters change
  useEffect(() => {
    updateUrl();
  }, [query, filters, sortBy, sortDirection, page, limit]);

  // =====================================================================================
  // INITIALIZATION AND URL HANDLING
  // =====================================================================================

  const initializeFromUrl = useCallback(() => {
    const urlQuery = searchParams.get('q') || '';
    const urlPage = parseInt(searchParams.get('page') || '1');
    const urlLimit = parseInt(searchParams.get('limit') || '24');
    const urlSort = searchParams.get('sort') || 'relevance';
    const urlDirection = (searchParams.get('direction') || 'DESC') as
      | 'ASC'
      | 'DESC';

    // Parse filters from URL
    const urlFilters: SearchFilters = {};

    if (searchParams.get('category')) {
      urlFilters.category = searchParams.get('category')!;
    }

    if (searchParams.get('subcategory')) {
      urlFilters.subcategory = searchParams.get('subcategory')!;
    }

    if (searchParams.get('price_min')) {
      urlFilters.priceMin = parseInt(searchParams.get('price_min')!);
    }

    if (searchParams.get('price_max')) {
      urlFilters.priceMax = parseInt(searchParams.get('price_max')!);
    }

    if (searchParams.get('rating_min')) {
      urlFilters.ratingMin = parseFloat(searchParams.get('rating_min')!);
    }

    if (searchParams.get('tier')) {
      urlFilters.tier = searchParams.get('tier')!;
    }

    if (searchParams.get('tags')) {
      urlFilters.tags = searchParams.get('tags')!.split(',').filter(Boolean);
    }

    if (searchParams.get('wedding_types')) {
      urlFilters.weddingTypes = searchParams
        .get('wedding_types')!
        .split(',')
        .filter(Boolean);
    }

    // Update state
    setQuery(urlQuery);
    setFilters(urlFilters);
    setSortBy(urlSort);
    setSortDirection(urlDirection);
    setPage(urlPage);
    setLimit(urlLimit);
  }, [searchParams]);

  const updateUrl = useCallback(() => {
    const params = new URLSearchParams();

    if (query) params.set('q', query);
    if (page > 1) params.set('page', page.toString());
    if (limit !== 24) params.set('limit', limit.toString());
    if (sortBy !== 'relevance') params.set('sort', sortBy);
    if (sortDirection !== 'DESC') params.set('direction', sortDirection);

    // Add filters to URL
    if (filters.category) params.set('category', filters.category);
    if (filters.subcategory) params.set('subcategory', filters.subcategory);
    if (filters.priceMin !== undefined)
      params.set('price_min', filters.priceMin.toString());
    if (filters.priceMax !== undefined)
      params.set('price_max', filters.priceMax.toString());
    if (filters.ratingMin !== undefined)
      params.set('rating_min', filters.ratingMin.toString());
    if (filters.tier) params.set('tier', filters.tier);
    if (filters.tags?.length) params.set('tags', filters.tags.join(','));
    if (filters.weddingTypes?.length)
      params.set('wedding_types', filters.weddingTypes.join(','));

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    router.replace(newUrl, { scroll: false });
  }, [query, filters, sortBy, sortDirection, page, limit, router]);

  // =====================================================================================
  // SEARCH FUNCTIONALITY
  // =====================================================================================

  const performSearch = useCallback(async () => {
    setIsLoading(true);

    try {
      const params = new URLSearchParams();

      if (query) params.append('q', query);
      params.append('sort', sortBy);
      params.append('direction', sortDirection);
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      params.append('facets', 'true'); // Always request facets for sidebar

      // Add filters
      if (filters.category) params.append('category', filters.category);
      if (filters.subcategory)
        params.append('subcategory', filters.subcategory);
      if (filters.priceMin !== undefined)
        params.append('price_min', filters.priceMin.toString());
      if (filters.priceMax !== undefined)
        params.append('price_max', filters.priceMax.toString());
      if (filters.ratingMin !== undefined)
        params.append('rating_min', filters.ratingMin.toString());
      if (filters.tier) params.append('tier', filters.tier);
      if (filters.tags?.length) params.append('tags', filters.tags.join(','));
      if (filters.weddingTypes?.length)
        params.append('wedding_types', filters.weddingTypes.join(','));

      const response = await fetch(`/api/marketplace/search?${params}`);

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setResults(data.results);
        } else {
          console.error('Search failed:', data.error);
          setResults(null);
        }
      } else {
        console.error('Search request failed:', response.status);
        setResults(null);
      }
    } catch (error) {
      console.error('Search error:', error);
      setResults(null);
    } finally {
      setIsLoading(false);
    }
  }, [query, filters, sortBy, sortDirection, page, limit]);

  // =====================================================================================
  // EVENT HANDLERS
  // =====================================================================================

  const handleSearch = useCallback(
    (newQuery: string, newFilters: SearchFilters) => {
      setQuery(newQuery);
      setFilters(newFilters);
      setPage(1); // Reset to first page on new search
    },
    [],
  );

  const handleFiltersChange = useCallback((newFilters: SearchFilters) => {
    setFilters(newFilters);
    setPage(1); // Reset to first page when filters change
  }, []);

  const handleSortChange = useCallback(
    (newSortBy: string, newDirection: 'ASC' | 'DESC') => {
      setSortBy(newSortBy);
      setSortDirection(newDirection);
      setPage(1); // Reset to first page when sort changes
    },
    [],
  );

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
    // Scroll to top of results
    const resultsElement = document.getElementById('search-results');
    if (resultsElement) {
      resultsElement.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  const handleLimitChange = useCallback((newLimit: number) => {
    setLimit(newLimit);
    setPage(1); // Reset to first page when limit changes
  }, []);

  const handleTemplateClick = useCallback(
    (template: MarketplaceTemplate) => {
      // Navigate to template detail page
      router.push(`/marketplace/templates/${template.id}`);
    },
    [router],
  );

  // =====================================================================================
  // RENDER
  // =====================================================================================

  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      {/* Search Interface */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <MarketplaceSearchInterface
            onSearch={handleSearch}
            onFiltersChange={handleFiltersChange}
            initialQuery={query}
            initialFilters={filters}
            isLoading={isLoading}
            placeholder="Search templates, categories, wedding types..."
            showSaveSearch={true}
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex gap-6 py-6">
          {/* Desktop Filter Sidebar */}
          <div className="hidden lg:block">
            <MarketplaceFilterSidebar
              filters={filters}
              onFiltersChange={handleFiltersChange}
              searchQuery={query}
              isLoading={isLoading}
            />
          </div>

          {/* Mobile Filter Button */}
          <div className="lg:hidden fixed bottom-6 right-6 z-50">
            <Sheet
              open={isMobileFiltersOpen}
              onOpenChange={setIsMobileFiltersOpen}
            >
              <SheetTrigger asChild>
                <Button size="lg" className="rounded-full shadow-lg">
                  <Filter className="w-5 h-5 mr-2" />
                  Filters
                  {Object.keys(filters).length > 0 && (
                    <span className="ml-2 bg-white text-purple-600 rounded-full w-6 h-6 text-sm flex items-center justify-center">
                      {Object.keys(filters).reduce((count, key) => {
                        const value = filters[key as keyof SearchFilters];
                        if (Array.isArray(value)) return count + value.length;
                        if (
                          value !== undefined &&
                          value !== null &&
                          value !== ''
                        )
                          return count + 1;
                        return count;
                      }, 0)}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 p-0">
                <div className="flex items-center justify-between p-4 border-b">
                  <h3 className="text-lg font-semibold">Filters</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsMobileFiltersOpen(false)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <MarketplaceFilterSidebar
                  filters={filters}
                  onFiltersChange={handleFiltersChange}
                  searchQuery={query}
                  isLoading={isLoading}
                  className="border-r-0"
                />
              </SheetContent>
            </Sheet>
          </div>

          {/* Search Results */}
          <div id="search-results" className="flex-1 min-w-0">
            <MarketplaceSearchResults
              results={results}
              isLoading={isLoading}
              onPageChange={handlePageChange}
              onSortChange={handleSortChange}
              onLimitChange={handleLimitChange}
              onTemplateClick={handleTemplateClick}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
