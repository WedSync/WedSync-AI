'use client';

import React, {
  useMemo,
  useCallback,
  forwardRef,
  useRef,
  useEffect,
  useState,
} from 'react';
import { FixedSizeList as List } from 'react-window';
import {
  Guest,
  GuestSearchResult,
  GuestListSort,
  GuestListView,
  GuestAnalytics,
} from '@/types/guest-management';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/20/solid';
import { cn } from '@/lib/utils';
import { VirtualizedGuestRow } from './VirtualizedGuestRow';
import { useVirtualScrollOptimization } from '@/hooks/useVirtualScrollOptimization';
import { usePerformanceMonitor } from '@/hooks/usePerformanceOptimization';

interface VirtualizedGuestTableProps {
  guests: GuestSearchResult[];
  selectedGuests: Set<string>;
  onGuestSelect: (guestId: string) => void;
  onSort: (sort: GuestListSort) => void;
  sort: GuestListSort;
  view: GuestListView;
  analytics: GuestAnalytics | undefined;
  onLoadMore?: () => void;
  loading: boolean;
  height?: number;
  overscanCount?: number;
  enableInfiniteScroll?: boolean;
}

const COLUMN_CONFIGS = {
  name: {
    label: 'Name',
    width: 'w-48',
    sortable: true,
    sortField: 'last_name' as keyof Guest,
  },
  email: {
    label: 'Email',
    width: 'w-56',
    sortable: true,
    sortField: 'email' as keyof Guest,
  },
  phone: {
    label: 'Phone',
    width: 'w-40',
    sortable: true,
    sortField: 'phone' as keyof Guest,
  },
  category: {
    label: 'Category',
    width: 'w-28',
    sortable: true,
    sortField: 'category' as keyof Guest,
  },
  side: {
    label: 'Side',
    width: 'w-24',
    sortable: true,
    sortField: 'side' as keyof Guest,
  },
  rsvp_status: {
    label: 'RSVP',
    width: 'w-28',
    sortable: true,
    sortField: 'rsvp_status' as keyof Guest,
  },
  age_group: {
    label: 'Age',
    width: 'w-20',
    sortable: true,
    sortField: 'age_group' as keyof Guest,
  },
  plus_one: {
    label: 'Plus One',
    width: 'w-24',
    sortable: true,
    sortField: 'plus_one' as keyof Guest,
  },
  table_number: {
    label: 'Table',
    width: 'w-20',
    sortable: true,
    sortField: 'table_number' as keyof Guest,
  },
  household: {
    label: 'Household',
    width: 'w-40',
    sortable: true,
    sortField: 'household_name',
  },
  dietary: {
    label: 'Dietary',
    width: 'w-32',
    sortable: false,
  },
  actions: {
    label: '',
    width: 'w-16',
    sortable: false,
  },
};

export const VirtualizedGuestTable = forwardRef<
  List,
  VirtualizedGuestTableProps
>(
  (
    {
      guests,
      selectedGuests,
      onGuestSelect,
      onSort,
      sort,
      view,
      analytics,
      onLoadMore,
      loading,
      height = 400,
      overscanCount = 5,
      enableInfiniteScroll = true,
    },
    ref,
  ) => {
    const listRef = useRef<List>(null);
    const [hoveredGuest, setHoveredGuest] = useState<string | null>(null);

    // Performance optimization hooks
    const {
      virtualizedHeight,
      shouldLoadMore,
      scrollToIndex,
      resetAfterIndex,
    } = useVirtualScrollOptimization({
      itemCount: guests.length,
      itemHeight: getRowHeight(view.density),
      containerHeight: height,
      overscanCount,
      enableInfiniteScroll,
    });

    const { recordMetric } = usePerformanceMonitor();

    // Calculate row height based on density
    function getRowHeight(density: string): number {
      switch (density) {
        case 'compact':
          return 48;
        case 'spacious':
          return 80;
        default:
          return 64;
      }
    }

    const rowHeight = useMemo(() => getRowHeight(view.density), [view.density]);

    // Visible columns memoization
    const visibleColumns = useMemo(() => {
      return view.columns.filter(
        (col) => COLUMN_CONFIGS[col as keyof typeof COLUMN_CONFIGS],
      );
    }, [view.columns]);

    // Sort handler with performance tracking
    const handleSort = useCallback(
      (field: keyof Guest | 'household_name') => {
        const startTime = performance.now();

        if (sort.field === field) {
          onSort({
            field,
            direction: sort.direction === 'asc' ? 'desc' : 'asc',
          });
        } else {
          onSort({ field, direction: 'asc' });
        }

        const endTime = performance.now();
        recordMetric('guest_table_sort', endTime - startTime);
      },
      [sort, onSort, recordMetric],
    );

    // Bulk selection with optimization
    const handleSelectAll = useCallback(
      (checked: boolean) => {
        const startTime = performance.now();

        if (checked) {
          guests.forEach((guest) => {
            if (!selectedGuests.has(guest.id)) {
              onGuestSelect(guest.id);
            }
          });
        } else {
          guests.forEach((guest) => {
            if (selectedGuests.has(guest.id)) {
              onGuestSelect(guest.id);
            }
          });
        }

        const endTime = performance.now();
        recordMetric('guest_table_bulk_select', endTime - startTime);
      },
      [guests, selectedGuests, onGuestSelect, recordMetric],
    );

    // Infinite scroll handler
    const handleScroll = useCallback(
      ({ scrollOffset, scrollUpdateWasRequested }: any) => {
        if (!enableInfiniteScroll || loading || !onLoadMore) return;

        const threshold = height * 0.8; // Load more when 80% scrolled
        if (shouldLoadMore(scrollOffset, threshold)) {
          onLoadMore();
        }
      },
      [enableInfiniteScroll, loading, onLoadMore, height, shouldLoadMore],
    );

    // Row renderer with memoization
    const renderRow = useCallback(
      ({ index, style }: { index: number; style: React.CSSProperties }) => {
        if (index >= guests.length) return null;

        const guest = guests[index];

        return (
          <div style={style}>
            <VirtualizedGuestRow
              guest={guest}
              isSelected={selectedGuests.has(guest.id)}
              onSelect={() => onGuestSelect(guest.id)}
              visibleColumns={visibleColumns}
              density={view.density}
              isHovered={hoveredGuest === guest.id}
              onHover={setHoveredGuest}
            />
          </div>
        );
      },
      [
        guests,
        selectedGuests,
        onGuestSelect,
        visibleColumns,
        view.density,
        hoveredGuest,
      ],
    );

    // Selection state calculations
    const isAllSelected =
      guests.length > 0 &&
      guests.every((guest) => selectedGuests.has(guest.id));
    const isPartiallySelected =
      guests.some((guest) => selectedGuests.has(guest.id)) && !isAllSelected;

    const renderSortIcon = (field: keyof Guest | 'household_name') => {
      if (sort.field !== field) return null;
      return sort.direction === 'asc' ? (
        <ChevronUpIcon className="w-4 h-4 ml-1" />
      ) : (
        <ChevronDownIcon className="w-4 h-4 ml-1" />
      );
    };

    // Header component
    const renderTableHeader = () => (
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center">
          {/* Selection Column */}
          <div className="w-12 pr-4">
            <Checkbox
              checked={isAllSelected}
              indeterminate={isPartiallySelected}
              onCheckedChange={handleSelectAll}
              aria-label="Select all guests"
            />
          </div>

          {visibleColumns.map((columnKey) => {
            const config =
              COLUMN_CONFIGS[columnKey as keyof typeof COLUMN_CONFIGS];
            if (!config) return null;

            return (
              <div
                key={columnKey}
                className={cn(
                  'flex items-center px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
                  config.width,
                  config.sortable
                    ? 'cursor-pointer hover:bg-gray-100 select-none'
                    : '',
                )}
                onClick={
                  config.sortable
                    ? () => handleSort(config.sortField)
                    : undefined
                }
              >
                {config.label}
                {config.sortable && renderSortIcon(config.sortField)}
              </div>
            );
          })}
        </div>
      </div>
    );

    // Performance monitoring
    useEffect(() => {
      recordMetric('guest_table_items', guests.length);
      recordMetric('guest_table_selected', selectedGuests.size);
    }, [guests.length, selectedGuests.size, recordMetric]);

    // Reset scroll position on data changes
    useEffect(() => {
      if (listRef.current) {
        resetAfterIndex(0);
      }
    }, [guests, resetAfterIndex]);

    if (guests.length === 0) {
      return (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <p className="text-gray-500">No guests found</p>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Table Header */}
        {renderTableHeader()}

        {/* Virtualized List */}
        <List
          ref={ref || listRef}
          height={height}
          itemCount={guests.length}
          itemSize={rowHeight}
          onScroll={handleScroll}
          overscanCount={overscanCount}
          className="guest-virtual-list"
          style={{
            // Ensure smooth scrolling
            scrollBehavior: 'smooth',
            // Improve scrollbar appearance
            scrollbarWidth: 'thin',
          }}
        >
          {renderRow}
        </List>

        {/* Load More / Loading States */}
        {enableInfiniteScroll && onLoadMore && !loading && (
          <div className="px-6 py-4 border-t border-gray-200 text-center">
            <Button variant="outline" onClick={onLoadMore} disabled={loading}>
              Load More Guests
            </Button>
          </div>
        )}

        {loading && (
          <div className="px-6 py-4 border-t border-gray-200 text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto"></div>
            <p className="text-sm text-gray-500 mt-2">Loading guests...</p>
          </div>
        )}

        {/* Performance Debug Info (Development Only) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="px-4 py-2 bg-gray-50 border-t text-xs text-gray-500">
            Items: {guests.length} | Selected: {selectedGuests.size} | Row
            Height: {rowHeight}px
          </div>
        )}
      </div>
    );
  },
);

VirtualizedGuestTable.displayName = 'VirtualizedGuestTable';
