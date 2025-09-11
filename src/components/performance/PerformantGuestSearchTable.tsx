'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { GuestSearchResult, GuestListSort } from '@/types/guest-management';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  ClockIcon,
  CpuChipIcon,
} from '@heroicons/react/20/solid';
import { cn } from '@/lib/utils';
import {
  useWebWorkerSearch,
  useSearchSuggestions,
} from '@/hooks/useWebWorkerSearch';
import { VirtualizedGuestTable } from './VirtualizedGuestTable';
import { usePerformanceMonitor } from '@/hooks/usePerformanceOptimization';

interface PerformantGuestSearchTableProps {
  initialGuests: GuestSearchResult[];
  selectedGuests: Set<string>;
  onGuestSelect: (guestId: string) => void;
  onLoadMore?: () => void;
  loading?: boolean;
  height?: number;
  className?: string;
}

interface FilterState {
  category: string[];
  rsvp_status: string[];
  side: string[];
  plus_one: boolean | null;
  dietary_restrictions: boolean | null;
  has_table: boolean | null;
}

const FILTER_OPTIONS = {
  category: ['family', 'friends', 'work', 'other'],
  rsvp_status: ['pending', 'attending', 'declined', 'maybe'],
  side: ['partner1', 'partner2', 'mutual'],
};

export const PerformantGuestSearchTable: React.FC<
  PerformantGuestSearchTableProps
> = ({
  initialGuests,
  selectedGuests,
  onGuestSelect,
  onLoadMore,
  loading = false,
  height = 600,
  className,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sort, setSort] = useState<GuestListSort>({
    field: 'last_name',
    direction: 'asc',
  });
  const [activeFilters, setActiveFilters] = useState<FilterState>({
    category: [],
    rsvp_status: [],
    side: [],
    plus_one: null,
    dietary_restrictions: null,
    has_table: null,
  });

  // Web Worker search hook
  const {
    searchResults,
    isSearching,
    searchError,
    searchAndFilter,
    clearSearch,
    isWorkerReady,
    workerError,
    lastSearchDuration,
    averageSearchDuration,
    searchCount,
  } = useWebWorkerSearch(initialGuests);

  // Search suggestions
  const { suggestions, generateSuggestions } =
    useSearchSuggestions(initialGuests);

  // Performance monitoring
  const { recordMetric } = usePerformanceMonitor();

  // Determine which guests to display
  const displayGuests = searchResults?.guests || initialGuests;

  // View configuration for virtualized table
  const viewConfig = {
    columns: [
      'name',
      'email',
      'phone',
      'category',
      'side',
      'rsvp_status',
      'table_number',
      'actions',
    ],
    density: 'normal' as const,
  };

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      activeFilters.category.length > 0 ||
      activeFilters.rsvp_status.length > 0 ||
      activeFilters.side.length > 0 ||
      activeFilters.plus_one !== null ||
      activeFilters.dietary_restrictions !== null ||
      activeFilters.has_table !== null
    );
  }, [activeFilters]);

  // Perform search and filter
  const performSearch = useCallback(async () => {
    if (!isWorkerReady) return;

    const startTime = performance.now();

    try {
      // Create filter object from active filters
      const filters = Object.entries(activeFilters).reduce(
        (acc, [key, value]) => {
          if (
            value !== null &&
            (Array.isArray(value) ? value.length > 0 : true)
          ) {
            acc[key] = value;
          }
          return acc;
        },
        {} as any,
      );

      await searchAndFilter(searchQuery, filters, sort, initialGuests, {
        fuzzySearch: true,
        minScore: 0.1,
        maxResults: 5000,
      });

      const endTime = performance.now();
      recordMetric('guest_search_complete', endTime - startTime);
    } catch (error) {
      console.error('Search failed:', error);
    }
  }, [
    searchQuery,
    activeFilters,
    sort,
    initialGuests,
    searchAndFilter,
    isWorkerReady,
    recordMetric,
  ]);

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim() || hasActiveFilters) {
        performSearch();
      } else {
        clearSearch();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, hasActiveFilters, performSearch, clearSearch]);

  // Generate search suggestions
  useEffect(() => {
    generateSuggestions(searchQuery);
  }, [searchQuery, generateSuggestions]);

  // Handle search input change
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchQuery(value);
      recordMetric('guest_search_input_change', 1);
    },
    [recordMetric],
  );

  // Handle filter changes
  const handleFilterChange = useCallback(
    (filterKey: keyof FilterState, value: any) => {
      setActiveFilters((prev) => ({
        ...prev,
        [filterKey]: value,
      }));
    },
    [],
  );

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    setActiveFilters({
      category: [],
      rsvp_status: [],
      side: [],
      plus_one: null,
      dietary_restrictions: null,
      has_table: null,
    });
    setSearchQuery('');
    clearSearch();
  }, [clearSearch]);

  // Handle sort changes
  const handleSort = useCallback((newSort: GuestListSort) => {
    setSort(newSort);
  }, []);

  // Render filter controls
  const renderFilterControls = () => (
    <div className="space-y-4 p-4 bg-gray-50 border rounded-lg">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">Filters</h3>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="text-xs"
          >
            Clear All
          </Button>
        )}
      </div>

      {/* Category Filter */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-2">
          Category
        </label>
        <div className="flex flex-wrap gap-2">
          {FILTER_OPTIONS.category.map((category) => (
            <Badge
              key={category}
              variant={
                activeFilters.category.includes(category)
                  ? 'default'
                  : 'outline'
              }
              className="cursor-pointer capitalize"
              onClick={() => {
                const newCategories = activeFilters.category.includes(category)
                  ? activeFilters.category.filter((c) => c !== category)
                  : [...activeFilters.category, category];
                handleFilterChange('category', newCategories);
              }}
            >
              {category}
            </Badge>
          ))}
        </div>
      </div>

      {/* RSVP Status Filter */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-2">
          RSVP Status
        </label>
        <div className="flex flex-wrap gap-2">
          {FILTER_OPTIONS.rsvp_status.map((status) => (
            <Badge
              key={status}
              variant={
                activeFilters.rsvp_status.includes(status)
                  ? 'default'
                  : 'outline'
              }
              className="cursor-pointer capitalize"
              onClick={() => {
                const newStatuses = activeFilters.rsvp_status.includes(status)
                  ? activeFilters.rsvp_status.filter((s) => s !== status)
                  : [...activeFilters.rsvp_status, status];
                handleFilterChange('rsvp_status', newStatuses);
              }}
            >
              {status}
            </Badge>
          ))}
        </div>
      </div>

      {/* Boolean Filters */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-2">
            Plus One
          </label>
          <div className="flex gap-2">
            <Badge
              variant={activeFilters.plus_one === true ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() =>
                handleFilterChange(
                  'plus_one',
                  activeFilters.plus_one === true ? null : true,
                )
              }
            >
              Yes
            </Badge>
            <Badge
              variant={activeFilters.plus_one === false ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() =>
                handleFilterChange(
                  'plus_one',
                  activeFilters.plus_one === false ? null : false,
                )
              }
            >
              No
            </Badge>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-2">
            Has Table
          </label>
          <div className="flex gap-2">
            <Badge
              variant={activeFilters.has_table === true ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() =>
                handleFilterChange(
                  'has_table',
                  activeFilters.has_table === true ? null : true,
                )
              }
            >
              Yes
            </Badge>
            <Badge
              variant={
                activeFilters.has_table === false ? 'default' : 'outline'
              }
              className="cursor-pointer"
              onClick={() =>
                handleFilterChange(
                  'has_table',
                  activeFilters.has_table === false ? null : false,
                )
              }
            >
              No
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );

  // Render performance stats
  const renderPerformanceStats = () => (
    <div className="flex items-center gap-4 text-xs text-gray-500">
      <div className="flex items-center gap-1">
        <ClockIcon className="w-3 h-3" />
        Last: {lastSearchDuration.toFixed(1)}ms
      </div>
      <div className="flex items-center gap-1">
        <CpuChipIcon className="w-3 h-3" />
        Avg: {averageSearchDuration.toFixed(1)}ms
      </div>
      <div>Searches: {searchCount}</div>
      {!isWorkerReady && (
        <Badge variant="outline" className="text-orange-600">
          Worker Loading
        </Badge>
      )}
    </div>
  );

  return (
    <div className={cn('space-y-4', className)}>
      {/* Search and Filter Controls */}
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search guests by name, email, or household..."
              className="pl-10 pr-10"
            />
            {searchQuery && (
              <button
                onClick={() => handleSearchChange('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Search Suggestions */}
          {suggestions.length > 0 && searchQuery && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg">
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm"
                  onClick={() => handleSearchChange(suggestion)}
                >
                  {suggestion}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Filter Toggle and Stats */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <FunnelIcon className="w-4 h-4" />
              Filters
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {
                    Object.values(activeFilters).filter(
                      (v) =>
                        v !== null && (Array.isArray(v) ? v.length > 0 : true),
                    ).length
                  }
                </Badge>
              )}
            </Button>

            {/* Results Summary */}
            <div className="text-sm text-gray-600">
              Showing {displayGuests.length} of {initialGuests.length} guests
              {searchResults && (
                <span className="ml-2 text-green-600">
                  (Search: {lastSearchDuration.toFixed(1)}ms)
                </span>
              )}
            </div>
          </div>

          {/* Performance Stats */}
          {process.env.NODE_ENV === 'development' && renderPerformanceStats()}
        </div>

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2">
            {activeFilters.category.map((category) => (
              <Badge key={category} variant="secondary" className="capitalize">
                Category: {category}
                <XMarkIcon
                  className="w-3 h-3 ml-1 cursor-pointer"
                  onClick={() =>
                    handleFilterChange(
                      'category',
                      activeFilters.category.filter((c) => c !== category),
                    )
                  }
                />
              </Badge>
            ))}
            {activeFilters.rsvp_status.map((status) => (
              <Badge key={status} variant="secondary" className="capitalize">
                RSVP: {status}
                <XMarkIcon
                  className="w-3 h-3 ml-1 cursor-pointer"
                  onClick={() =>
                    handleFilterChange(
                      'rsvp_status',
                      activeFilters.rsvp_status.filter((s) => s !== status),
                    )
                  }
                />
              </Badge>
            ))}
            {activeFilters.plus_one !== null && (
              <Badge variant="secondary">
                Plus One: {activeFilters.plus_one ? 'Yes' : 'No'}
                <XMarkIcon
                  className="w-3 h-3 ml-1 cursor-pointer"
                  onClick={() => handleFilterChange('plus_one', null)}
                />
              </Badge>
            )}
          </div>
        )}

        {/* Filter Controls */}
        {showFilters && renderFilterControls()}

        {/* Search Error */}
        {searchError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">Search error: {searchError}</p>
          </div>
        )}

        {/* Worker Error */}
        {workerError && (
          <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <p className="text-sm text-orange-700">
              Worker error: {workerError}
            </p>
          </div>
        )}
      </div>

      {/* Virtualized Guest Table */}
      <VirtualizedGuestTable
        guests={displayGuests}
        selectedGuests={selectedGuests}
        onGuestSelect={onGuestSelect}
        onSort={handleSort}
        sort={sort}
        view={viewConfig}
        analytics={undefined}
        onLoadMore={onLoadMore}
        loading={loading || isSearching}
        height={height}
        overscanCount={5}
        enableInfiniteScroll={true}
      />
    </div>
  );
};

PerformantGuestSearchTable.displayName = 'PerformantGuestSearchTable';
