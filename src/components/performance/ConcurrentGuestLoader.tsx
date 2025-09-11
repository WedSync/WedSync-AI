'use client';

import React, {
  Suspense,
  useState,
  useTransition,
  useDeferredValue,
  memo,
  useMemo,
  startTransition,
} from 'react';
import { GuestSearchResult } from '@/types/guest-management';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Loader2Icon,
  UsersIcon,
  SearchIcon,
  FilterIcon,
} from '@heroicons/react/20/solid';
import { cn } from '@/lib/utils';
import { usePerformanceMonitor } from '@/hooks/usePerformanceOptimization';

// React 19 Compiler Ready: This component uses the latest React patterns
// The React Compiler will automatically optimize re-renders and memoization

interface ConcurrentGuestLoaderProps {
  initialGuests: GuestSearchResult[];
  onGuestsChange?: (guests: GuestSearchResult[]) => void;
  className?: string;
}

interface LoadingState {
  isLoading: boolean;
  progress: number;
  stage: string;
  error?: string;
}

// Concurrent data processing hook using React 19 features
function useConcurrentGuestProcessing(guests: GuestSearchResult[]) {
  const [isPending, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCriteria, setFilterCriteria] = useState({
    category: '',
    rsvp_status: '',
    has_table: null as boolean | null,
  });

  // Deferred value for search query to reduce re-renders during typing
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const deferredFilterCriteria = useDeferredValue(filterCriteria);

  const { recordMetric } = usePerformanceMonitor();

  // Process guests concurrently using startTransition
  const processedGuests = useMemo(() => {
    const startTime = performance.now();

    let filtered = guests;

    // Apply search filter
    if (deferredSearchQuery.trim()) {
      const query = deferredSearchQuery.toLowerCase();
      filtered = filtered.filter(
        (guest) =>
          guest.first_name?.toLowerCase().includes(query) ||
          guest.last_name?.toLowerCase().includes(query) ||
          guest.email?.toLowerCase().includes(query) ||
          guest.household_name?.toLowerCase().includes(query),
      );
    }

    // Apply category filter
    if (deferredFilterCriteria.category) {
      filtered = filtered.filter(
        (guest) => guest.category === deferredFilterCriteria.category,
      );
    }

    // Apply RSVP status filter
    if (deferredFilterCriteria.rsvp_status) {
      filtered = filtered.filter(
        (guest) => guest.rsvp_status === deferredFilterCriteria.rsvp_status,
      );
    }

    // Apply table assignment filter
    if (deferredFilterCriteria.has_table !== null) {
      filtered = filtered.filter((guest) =>
        deferredFilterCriteria.has_table
          ? Boolean(guest.table_number)
          : !Boolean(guest.table_number),
      );
    }

    const endTime = performance.now();
    recordMetric('concurrent_guest_processing', endTime - startTime);

    return filtered;
  }, [guests, deferredSearchQuery, deferredFilterCriteria, recordMetric]);

  // Non-blocking search update using startTransition
  const updateSearch = (query: string) => {
    startTransition(() => {
      setSearchQuery(query);
    });
  };

  // Non-blocking filter update using startTransition
  const updateFilter = (key: string, value: any) => {
    startTransition(() => {
      setFilterCriteria((prev) => ({
        ...prev,
        [key]: value,
      }));
    });
  };

  return {
    processedGuests,
    searchQuery,
    filterCriteria,
    isPending,
    updateSearch,
    updateFilter,
  };
}

// Suspense fallback components optimized for different loading states
const SearchLoadingFallback = memo(() => (
  <div className="flex items-center justify-center p-8 bg-gray-50 rounded-lg">
    <div className="flex items-center gap-3">
      <Loader2Icon className="w-5 h-5 animate-spin text-blue-600" />
      <span className="text-sm text-gray-600">Processing guest search...</span>
    </div>
  </div>
));

const FilterLoadingFallback = memo(() => (
  <div className="flex items-center gap-2 p-2 bg-blue-50 rounded text-sm text-blue-700">
    <FilterIcon className="w-4 h-4" />
    Applying filters...
  </div>
));

const DataLoadingFallback = memo(() => (
  <div className="space-y-4">
    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
      <Loader2Icon className="w-6 h-6 animate-spin text-blue-600" />
      <div>
        <div className="text-sm font-medium text-gray-900">
          Loading guest data
        </div>
        <div className="text-xs text-gray-500">
          This may take a moment for large datasets
        </div>
      </div>
    </div>

    {/* Loading skeleton */}
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className="h-16 bg-gray-100 rounded-lg animate-pulse"
        />
      ))}
    </div>
  </div>
));

// Concurrent guest statistics calculator
const GuestStatistics = memo(({ guests }: { guests: GuestSearchResult[] }) => {
  // Use useDeferredValue to prevent blocking UI updates during recalculation
  const deferredGuests = useDeferredValue(guests);

  const statistics = useMemo(() => {
    const stats = {
      total: deferredGuests.length,
      attending: 0,
      pending: 0,
      declined: 0,
      withPlusOne: 0,
      withTable: 0,
      categories: {} as Record<string, number>,
    };

    deferredGuests.forEach((guest) => {
      // RSVP status counts
      if (guest.rsvp_status === 'attending') stats.attending++;
      else if (guest.rsvp_status === 'pending') stats.pending++;
      else if (guest.rsvp_status === 'declined') stats.declined++;

      // Plus one count
      if (guest.plus_one) stats.withPlusOne++;

      // Table assignment count
      if (guest.table_number) stats.withTable++;

      // Category counts
      stats.categories[guest.category] =
        (stats.categories[guest.category] || 0) + 1;
    });

    return stats;
  }, [deferredGuests]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-blue-50 p-3 rounded-lg">
        <div className="text-2xl font-bold text-blue-900">
          {statistics.total}
        </div>
        <div className="text-xs text-blue-600">Total Guests</div>
      </div>

      <div className="bg-green-50 p-3 rounded-lg">
        <div className="text-2xl font-bold text-green-900">
          {statistics.attending}
        </div>
        <div className="text-xs text-green-600">Attending</div>
      </div>

      <div className="bg-yellow-50 p-3 rounded-lg">
        <div className="text-2xl font-bold text-yellow-900">
          {statistics.pending}
        </div>
        <div className="text-xs text-yellow-600">Pending</div>
      </div>

      <div className="bg-purple-50 p-3 rounded-lg">
        <div className="text-2xl font-bold text-purple-900">
          {statistics.withTable}
        </div>
        <div className="text-xs text-purple-600">With Table</div>
      </div>
    </div>
  );
});

// Main concurrent guest list component
const ConcurrentGuestList = memo(
  ({
    guests,
    isPending,
  }: {
    guests: GuestSearchResult[];
    isPending: boolean;
  }) => {
    // Use deferred value to prevent blocking during large list renders
    const deferredGuests = useDeferredValue(guests);

    return (
      <div
        className={cn(
          'space-y-2 transition-opacity duration-200',
          isPending ? 'opacity-60' : 'opacity-100',
        )}
      >
        {deferredGuests.slice(0, 50).map((guest) => (
          <div
            key={guest.id}
            className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                <UsersIcon className="w-4 h-4 text-gray-400" />
              </div>
              <div>
                <div className="font-medium text-gray-900">
                  {guest.first_name} {guest.last_name}
                </div>
                {guest.email && (
                  <div className="text-xs text-gray-500">{guest.email}</div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge
                variant={
                  guest.rsvp_status === 'attending' ? 'default' : 'outline'
                }
                className="capitalize"
              >
                {guest.rsvp_status}
              </Badge>
              <Badge variant="outline" className="capitalize">
                {guest.category}
              </Badge>
              {guest.table_number && (
                <Badge variant="secondary">Table {guest.table_number}</Badge>
              )}
            </div>
          </div>
        ))}

        {deferredGuests.length > 50 && (
          <div className="p-4 text-center text-sm text-gray-500 bg-gray-50 rounded-lg">
            Showing first 50 of {deferredGuests.length} guests
          </div>
        )}

        {isPending && (
          <div className="fixed bottom-4 right-4 flex items-center gap-2 p-3 bg-blue-600 text-white rounded-lg shadow-lg">
            <Loader2Icon className="w-4 h-4 animate-spin" />
            <span className="text-sm">Updating...</span>
          </div>
        )}
      </div>
    );
  },
);

// Search and filter controls with concurrent updates
const SearchAndFilters = memo(
  ({
    searchQuery,
    filterCriteria,
    onSearchChange,
    onFilterChange,
    isPending,
  }: {
    searchQuery: string;
    filterCriteria: any;
    onSearchChange: (query: string) => void;
    onFilterChange: (key: string, value: any) => void;
    isPending: boolean;
  }) => {
    return (
      <div className="space-y-4">
        {/* Search Input */}
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search guests..."
            className={cn(
              'pl-10',
              isPending && 'bg-yellow-50 border-yellow-200',
            )}
          />
          {isPending && (
            <Loader2Icon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 animate-spin text-blue-600" />
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <select
            value={filterCriteria.category}
            onChange={(e) => onFilterChange('category', e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded text-sm"
          >
            <option value="">All Categories</option>
            <option value="family">Family</option>
            <option value="friends">Friends</option>
            <option value="work">Work</option>
            <option value="other">Other</option>
          </select>

          <select
            value={filterCriteria.rsvp_status}
            onChange={(e) => onFilterChange('rsvp_status', e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded text-sm"
          >
            <option value="">All RSVP Status</option>
            <option value="pending">Pending</option>
            <option value="attending">Attending</option>
            <option value="declined">Declined</option>
            <option value="maybe">Maybe</option>
          </select>

          <select
            value={
              filterCriteria.has_table === null
                ? ''
                : filterCriteria.has_table.toString()
            }
            onChange={(e) =>
              onFilterChange(
                'has_table',
                e.target.value === '' ? null : e.target.value === 'true',
              )
            }
            className="px-3 py-1 border border-gray-300 rounded text-sm"
          >
            <option value="">Table Status</option>
            <option value="true">Has Table</option>
            <option value="false">No Table</option>
          </select>
        </div>
      </div>
    );
  },
);

// Main component with Suspense boundaries and concurrent features
export const ConcurrentGuestLoader: React.FC<ConcurrentGuestLoaderProps> = ({
  initialGuests,
  onGuestsChange,
  className,
}) => {
  const {
    processedGuests,
    searchQuery,
    filterCriteria,
    isPending,
    updateSearch,
    updateFilter,
  } = useConcurrentGuestProcessing(initialGuests);

  // Notify parent of guest changes
  React.useEffect(() => {
    if (onGuestsChange) {
      startTransition(() => {
        onGuestsChange(processedGuests);
      });
    }
  }, [processedGuests, onGuestsChange]);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Statistics with Suspense boundary */}
      <Suspense
        fallback={<div className="h-20 bg-gray-100 rounded-lg animate-pulse" />}
      >
        <GuestStatistics guests={processedGuests} />
      </Suspense>

      {/* Search and Filters with concurrent updates */}
      <Suspense fallback={<SearchLoadingFallback />}>
        <SearchAndFilters
          searchQuery={searchQuery}
          filterCriteria={filterCriteria}
          onSearchChange={updateSearch}
          onFilterChange={updateFilter}
          isPending={isPending}
        />
      </Suspense>

      {/* Guest List with Suspense and concurrent rendering */}
      <Suspense fallback={<DataLoadingFallback />}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              Guest List ({processedGuests.length})
            </h3>
            {isPending && <FilterLoadingFallback />}
          </div>

          <ConcurrentGuestList guests={processedGuests} isPending={isPending} />
        </div>
      </Suspense>

      {/* Performance Debug Info (Development Only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="p-3 bg-gray-50 border rounded-lg text-xs text-gray-600">
          <div className="font-medium mb-1">
            React 19 Concurrent Features Active
          </div>
          <div>• useTransition: {isPending ? 'Pending' : 'Idle'}</div>
          <div>• useDeferredValue: Optimizing re-renders</div>
          <div>• Suspense: Concurrent rendering enabled</div>
          <div>• startTransition: Non-blocking state updates</div>
        </div>
      )}
    </div>
  );
};

ConcurrentGuestLoader.displayName = 'ConcurrentGuestLoader';
