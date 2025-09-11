'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card-untitled';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  Search,
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  Settings,
  Save,
  RotateCcw,
  Sparkles,
  TrendingUp,
  Clock,
} from 'lucide-react';

// Import our specialized filter components
import { SearchFilters } from './SearchFilters';
import { SearchSuggestions } from './SearchSuggestions';
import { SearchResults } from './SearchResults';
import { SavedSearches } from './SavedSearches';
import { VendorCategoryFilter } from './VendorCategoryFilter';
import { LocationSearchFilter } from './LocationSearchFilter';
import { PriceRangeFilter } from './PriceRangeFilter';
import { AvailabilityFilter } from './AvailabilityFilter';
import { ReviewScoreFilter } from './ReviewScoreFilter';

export interface SearchFiltersState {
  query: string;
  vendorCategories: string[];
  location: {
    city?: string;
    region?: string;
    radius?: number;
    coordinates?: [number, number];
  };
  priceRange: {
    min?: number;
    max?: number;
    currency: string;
  };
  availability: {
    startDate?: Date;
    endDate?: Date;
    flexible?: boolean;
  };
  reviewScore: {
    minRating?: number;
    minReviews?: number;
  };
  sortBy:
    | 'relevance'
    | 'price_asc'
    | 'price_desc'
    | 'rating'
    | 'distance'
    | 'recent';
  advancedFilters: Record<string, any>;
}

export interface SearchResult {
  id: string;
  type: 'vendor' | 'service' | 'venue' | 'package';
  title: string;
  description: string;
  category: string;
  rating: number;
  reviewCount: number;
  priceRange: string;
  location: string;
  distance?: number;
  image?: string;
  featured: boolean;
  verified: boolean;
  availability?: string;
  tags: string[];
}

interface AdvancedSearchInterfaceProps {
  className?: string;
  onSearch?: (filters: SearchFiltersState, results: SearchResult[]) => void;
  onSaveSearch?: (name: string, filters: SearchFiltersState) => void;
  initialFilters?: Partial<SearchFiltersState>;
  compact?: boolean;
  showSavedSearches?: boolean;
}

const defaultFilters: SearchFiltersState = {
  query: '',
  vendorCategories: [],
  location: {
    currency: 'GBP',
  },
  priceRange: {
    currency: 'GBP',
  },
  availability: {},
  reviewScore: {},
  sortBy: 'relevance',
  advancedFilters: {},
};

export function AdvancedSearchInterface({
  className,
  onSearch,
  onSaveSearch,
  initialFilters = {},
  compact = false,
  showSavedSearches = true,
}: AdvancedSearchInterfaceProps) {
  const [filters, setFilters] = useState<SearchFiltersState>({
    ...defaultFilters,
    ...initialFilters,
  });

  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Handle filter changes
  const handleFilterChange = useCallback(
    (key: keyof SearchFiltersState, value: any) => {
      setFilters((prev) => ({
        ...prev,
        [key]: value,
      }));
    },
    [],
  );

  // Handle advanced filter changes
  const handleAdvancedFilterChange = useCallback((key: string, value: any) => {
    setFilters((prev) => ({
      ...prev,
      advancedFilters: {
        ...prev.advancedFilters,
        [key]: value,
      },
    }));
  }, []);

  // Perform search
  const performSearch = useCallback(async () => {
    if (!filters.query && !hasActiveFilters()) return;

    setIsSearching(true);
    setShowSuggestions(false);

    try {
      // Add to recent searches
      if (filters.query && !recentSearches.includes(filters.query)) {
        setRecentSearches((prev) => [filters.query, ...prev.slice(0, 4)]);
      }

      // Simulate API call - replace with actual search implementation
      const results = await mockSearch(filters);
      setSearchResults(results);

      onSearch?.(filters, results);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [filters, onSearch, recentSearches]);

  // Check if any filters are active
  const hasActiveFilters = useCallback(() => {
    return (
      filters.vendorCategories.length > 0 ||
      filters.location.city ||
      filters.location.region ||
      filters.priceRange.min ||
      filters.priceRange.max ||
      filters.availability.startDate ||
      filters.availability.endDate ||
      filters.reviewScore.minRating ||
      filters.reviewScore.minReviews ||
      Object.keys(filters.advancedFilters).length > 0
    );
  }, [filters]);

  // Reset all filters
  const resetFilters = useCallback(() => {
    setFilters(defaultFilters);
    setSearchResults([]);
  }, []);

  // Save current search
  const saveCurrentSearch = useCallback(() => {
    const searchName = filters.query || 'Custom Search';
    onSaveSearch?.(searchName, filters);
  }, [filters, onSaveSearch]);

  // Get search suggestions
  const getSuggestions = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      return;
    }

    // Simulate API call for suggestions
    const mockSuggestions = [
      'Wedding photographers in London',
      'Wedding venues near Birmingham',
      'Wedding cake makers',
      'Wedding dress shops',
      'Wedding florists',
      'Wedding bands and DJs',
    ].filter((s) => s.toLowerCase().includes(query.toLowerCase()));

    setSuggestions(mockSuggestions.slice(0, 5));
  }, []);

  // Handle query input change
  const handleQueryChange = useCallback(
    (query: string) => {
      handleFilterChange('query', query);
      getSuggestions(query);
      setShowSuggestions(true);
    },
    [handleFilterChange, getSuggestions],
  );

  // Effect for auto-search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (filters.query.length >= 2 || hasActiveFilters()) {
        performSearch();
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [filters.query, performSearch, hasActiveFilters]);

  const activeFilterCount = [
    filters.vendorCategories.length,
    filters.location.city ? 1 : 0,
    filters.priceRange.min || filters.priceRange.max ? 1 : 0,
    filters.availability.startDate ? 1 : 0,
    filters.reviewScore.minRating ? 1 : 0,
    Object.keys(filters.advancedFilters).length,
  ].reduce((acc, count) => acc + count, 0);

  return (
    <div className={cn('w-full space-y-4', className)}>
      {/* Main Search Bar */}
      <Card className="relative">
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search wedding vendors, venues, services..."
                value={filters.query}
                onChange={(e) => handleQueryChange(e.target.value)}
                className="pl-10 pr-4"
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              />

              {/* Search Suggestions */}
              {showSuggestions && suggestions.length > 0 && (
                <SearchSuggestions
                  suggestions={suggestions}
                  onSelect={(suggestion) => {
                    handleFilterChange('query', suggestion);
                    setShowSuggestions(false);
                  }}
                  recentSearches={recentSearches}
                />
              )}
            </div>

            <Button
              variant="outline"
              onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
              className="relative"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-2 px-2 py-0.5 text-xs">
                  {activeFilterCount}
                </Badge>
              )}
              {isFiltersExpanded ? (
                <ChevronUp className="w-4 h-4 ml-2" />
              ) : (
                <ChevronDown className="w-4 h-4 ml-2" />
              )}
            </Button>

            <Button
              onClick={performSearch}
              disabled={isSearching || (!filters.query && !hasActiveFilters())}
              className="min-w-[100px]"
            >
              {isSearching ? (
                <>
                  <div className="animate-spin w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Search
                </>
              )}
            </Button>
          </div>

          {/* Active Filters Display */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t">
              {filters.vendorCategories.map((category) => (
                <Badge
                  key={category}
                  variant="secondary"
                  className="flex items-center gap-1"
                >
                  {category}
                  <X
                    className="w-3 h-3 cursor-pointer hover:text-red-500"
                    onClick={() => {
                      handleFilterChange(
                        'vendorCategories',
                        filters.vendorCategories.filter((c) => c !== category),
                      );
                    }}
                  />
                </Badge>
              ))}

              {filters.location.city && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  {filters.location.city}
                  <X
                    className="w-3 h-3 cursor-pointer hover:text-red-500"
                    onClick={() =>
                      handleFilterChange('location', {
                        ...filters.location,
                        city: undefined,
                      })
                    }
                  />
                </Badge>
              )}

              {(filters.priceRange.min || filters.priceRange.max) && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  £{filters.priceRange.min || 0} - £
                  {filters.priceRange.max || '∞'}
                  <X
                    className="w-3 h-3 cursor-pointer hover:text-red-500"
                    onClick={() =>
                      handleFilterChange('priceRange', { currency: 'GBP' })
                    }
                  />
                </Badge>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="text-xs"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Reset
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Advanced Filters Panel */}
      {isFiltersExpanded && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Advanced Filters</CardTitle>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={saveCurrentSearch}>
                  <Save className="w-4 h-4 mr-1" />
                  Save Search
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsFiltersExpanded(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <SearchFilters
              filters={filters}
              onChange={handleFilterChange}
              onAdvancedChange={handleAdvancedFilterChange}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <VendorCategoryFilter
                selectedCategories={filters.vendorCategories}
                onChange={(categories) =>
                  handleFilterChange('vendorCategories', categories)
                }
              />

              <LocationSearchFilter
                location={filters.location}
                onChange={(location) =>
                  handleFilterChange('location', location)
                }
              />

              <PriceRangeFilter
                priceRange={filters.priceRange}
                onChange={(priceRange) =>
                  handleFilterChange('priceRange', priceRange)
                }
              />

              <AvailabilityFilter
                availability={filters.availability}
                onChange={(availability) =>
                  handleFilterChange('availability', availability)
                }
              />

              <ReviewScoreFilter
                reviewScore={filters.reviewScore}
                onChange={(reviewScore) =>
                  handleFilterChange('reviewScore', reviewScore)
                }
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Saved Searches */}
      {showSavedSearches && !compact && (
        <SavedSearches
          onLoadSearch={(savedFilters) =>
            setFilters({ ...defaultFilters, ...savedFilters })
          }
        />
      )}

      {/* Search Results */}
      <SearchResults
        results={searchResults}
        isLoading={isSearching}
        filters={filters}
        onFiltersChange={setFilters}
        onResultSelect={(result) => console.log('Selected result:', result)}
      />
    </div>
  );
}

// Mock search function - replace with actual implementation
async function mockSearch(
  filters: SearchFiltersState,
): Promise<SearchResult[]> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  return [
    {
      id: '1',
      type: 'vendor',
      title: 'Elegant Weddings Photography',
      description: 'Professional wedding photography with 10+ years experience',
      category: 'Photography',
      rating: 4.8,
      reviewCount: 127,
      priceRange: '£1,500 - £3,000',
      location: 'London, UK',
      distance: 2.3,
      image: '/placeholder-vendor.jpg',
      featured: true,
      verified: true,
      availability: 'Available this weekend',
      tags: ['Photography', 'Portraits', 'Digital', 'Albums'],
    },
    {
      id: '2',
      type: 'venue',
      title: 'The Grand Ballroom',
      description: 'Stunning historic venue for unforgettable celebrations',
      category: 'Venue',
      rating: 4.9,
      reviewCount: 89,
      priceRange: '£3,000 - £8,000',
      location: 'Birmingham, UK',
      distance: 15.7,
      image: '/placeholder-venue.jpg',
      featured: false,
      verified: true,
      availability: '3 dates available',
      tags: ['Historic', 'Ballroom', 'Indoor', 'Catering'],
    },
  ];
}

export default AdvancedSearchInterface;
