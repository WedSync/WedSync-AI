'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
// ✅ UNTITLED UI IMPORTS - Following WS-077 requirements
import { Button } from '@/components/untitled-ui/button';
import { Input } from '@/components/untitled-ui/input';
import { Card } from '@/components/untitled-ui/card';
import { Badge } from '@/components/untitled-ui/badge';
import { ShimmerButton } from '@/components/magicui/shimmer-button';
import {
  Guest,
  GuestSearchResult,
  GuestListFilters,
  GuestListSort,
  GuestListView,
  BulkOperationsState,
  GuestAnalytics,
} from '@/types/guest-management';
import { GuestTable } from './GuestTable';
import { GuestCards } from './GuestCards';
import { HouseholdView } from './HouseholdView';
import { GuestFilters } from './GuestFilters';
import { BulkOperationsModal } from './BulkOperationsModal';
import { BulkSelectionBar } from './BulkSelectionBar';
import { GuestImportWizard } from './import/GuestImportWizard';
import { GuestExportModal } from './GuestExportModal';
import { AddGuestModal } from './AddGuestModal';
import { useGuestSearch } from '@/hooks/useGuestSearch';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useVirtualScrolling } from '@/hooks/useVirtualScrolling';
import { useBulkOperations } from '@/hooks/useGuestBulkOperations';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowUpTrayIcon,
  ArrowDownTrayIcon,
  ViewColumnsIcon,
  Squares2X2Icon,
  TableCellsIcon,
  HomeIcon,
  XMarkIcon,
} from '@heroicons/react/20/solid';

interface GuestListManagerProps {
  coupleId: string;
  initialParams: Record<string, any>;
  clientName: string;
}

const DEFAULT_FILTERS: GuestListFilters = {
  search: '',
  category: 'all',
  rsvp_status: 'all',
  age_group: 'all',
  side: 'all',
  show_households: false,
};

const DEFAULT_SORT: GuestListSort = {
  field: 'last_name',
  direction: 'asc',
};

const DEFAULT_VIEW: GuestListView = {
  type: 'table',
  density: 'normal',
  columns: ['name', 'email', 'phone', 'category', 'rsvp_status', 'household'],
};

export function GuestListManager({
  coupleId,
  initialParams,
  clientName,
}: GuestListManagerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Core state
  const [filters, setFilters] = useState<GuestListFilters>({
    ...DEFAULT_FILTERS,
    search: initialParams.search || '',
    category: initialParams.category || 'all',
    rsvp_status: initialParams.rsvp_status || 'all',
  });

  const [sort, setSort] = useState<GuestListSort>(DEFAULT_SORT);
  const [view, setView] = useState<GuestListView>({
    ...DEFAULT_VIEW,
    type: initialParams.view || 'table',
  });

  // Modal states
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showAddGuestModal, setShowAddGuestModal] = useState(false);
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);

  // Data fetching with performance optimization for 180+ guests
  const { guests, analytics, loading, error, hasMore, loadMore, refresh } =
    useGuestSearch({
      coupleId,
      filters,
      sort,
      pageSize: 50, // Optimized batch size for performance
      enableVirtualScrolling: true, // Performance requirement for 180+ guests
    });

  // Bulk operations
  const {
    selectedGuests,
    bulkOperationsState,
    toggleGuestSelection,
    selectAllVisible,
    clearSelection,
    setBulkOperationType,
    closeBulkModal,
  } = useBulkOperations();

  // Virtual scrolling for performance with 180+ guest requirement
  const { containerRef, visibleItems, totalHeight, scrollToItem } =
    useVirtualScrolling({
      items: guests,
      itemHeight:
        view.density === 'compact' ? 48 : view.density === 'spacious' ? 80 : 64,
      containerHeight: 600,
      enabled: guests.length > 100, // Enable for large lists
      overscan: 10, // Performance optimization
    });

  // Keyboard shortcuts for power users
  useKeyboardShortcuts({
    'ctrl+k': () => document.getElementById('guest-search')?.focus(),
    'ctrl+a': () => selectAllVisible(guests),
    'ctrl+i': () => setShowImportModal(true),
    'ctrl+e': () => setShowExportModal(true),
    'ctrl+n': () => setShowAddGuestModal(true),
    'ctrl+f': () => setShowFiltersPanel(!showFiltersPanel),
    escape: () => {
      clearSelection();
      setShowFiltersPanel(false);
    },
  });

  // URL sync for better UX
  const updateURL = useCallback(
    (
      newFilters: Partial<GuestListFilters>,
      newView?: Partial<GuestListView>,
    ) => {
      const params = new URLSearchParams();

      if (newFilters.search) params.set('search', newFilters.search);
      if (newFilters.category && newFilters.category !== 'all')
        params.set('category', newFilters.category);
      if (newFilters.rsvp_status && newFilters.rsvp_status !== 'all')
        params.set('rsvp_status', newFilters.rsvp_status);
      if (newView?.type) params.set('view', newView.type);

      router.push(`?${params.toString()}`, { scroll: false });
    },
    [router],
  );

  // Filter handlers with performance optimization
  const handleFilterChange = useCallback(
    (newFilters: Partial<GuestListFilters>) => {
      const updatedFilters = { ...filters, ...newFilters };
      setFilters(updatedFilters);
      updateURL(updatedFilters, view);
    },
    [filters, view, updateURL],
  );

  const handleViewChange = useCallback(
    (newView: Partial<GuestListView>) => {
      const updatedView = { ...view, ...newView };
      setView(updatedView);
      updateURL(filters, updatedView);
    },
    [filters, view, updateURL],
  );

  const handleSortChange = useCallback((newSort: GuestListSort) => {
    setSort(newSort);
  }, []);

  // Debounced search for performance - <200ms requirement
  const debouncedSearch = useMemo(() => {
    let timeoutId: NodeJS.Timeout;
    return (searchTerm: string) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        handleFilterChange({ search: searchTerm });
      }, 150); // Optimized for <200ms performance requirement
    };
  }, [handleFilterChange]);

  // Bulk operations handlers
  const handleBulkUpdate = async (updates: any) => {
    try {
      const response = await fetch('/api/guests/bulk?action=update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guest_ids: Array.from(selectedGuests),
          updates,
        }),
      });

      const result = await response.json();

      if (result.success) {
        refresh();
        clearSelection();
        closeBulkModal();
      } else {
        throw new Error(result.error || 'Bulk update failed');
      }
    } catch (error) {
      console.error('Bulk update error:', error);
      // Show error notification
    }
  };

  const handleBulkDelete = async () => {
    if (
      !confirm(
        `Are you sure you want to delete ${selectedGuests.size} guests? This action cannot be undone.`,
      )
    ) {
      return;
    }

    try {
      const response = await fetch('/api/guests/bulk?action=delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guest_ids: Array.from(selectedGuests),
        }),
      });

      const result = await response.json();

      if (result.success) {
        refresh();
        clearSelection();
        closeBulkModal();
      } else {
        throw new Error(result.error || 'Bulk delete failed');
      }
    } catch (error) {
      console.error('Bulk delete error:', error);
      // Show error notification
    }
  };

  // Render active filters using Untitled UI Badge
  const renderActiveFilters = () => {
    const activeFilters = [];

    if (filters.category !== 'all') {
      activeFilters.push(
        <Badge
          key="category"
          variant="secondary"
          className="
          inline-flex items-center
          px-2.5 py-0.5
          rounded-full
          text-xs font-medium
          bg-gray-50 text-gray-700
          border border-gray-200
          gap-1
        "
        >
          Category: {filters.category}
          <XMarkIcon
            className="w-3 h-3 cursor-pointer hover:text-gray-900 transition-colors"
            onClick={() => handleFilterChange({ category: 'all' })}
          />
        </Badge>,
      );
    }

    if (filters.rsvp_status !== 'all') {
      activeFilters.push(
        <Badge
          key="rsvp"
          variant="secondary"
          className="
          inline-flex items-center
          px-2.5 py-0.5
          rounded-full
          text-xs font-medium
          bg-primary-50 text-primary-700
          border border-primary-200
          gap-1
        "
        >
          RSVP: {filters.rsvp_status}
          <XMarkIcon
            className="w-3 h-3 cursor-pointer hover:text-primary-900 transition-colors"
            onClick={() => handleFilterChange({ rsvp_status: 'all' })}
          />
        </Badge>,
      );
    }

    if (filters.has_dietary_restrictions !== undefined) {
      activeFilters.push(
        <Badge
          key="dietary"
          variant="secondary"
          className="
          inline-flex items-center
          px-2.5 py-0.5
          rounded-full
          text-xs font-medium
          bg-success-50 text-success-700
          border border-success-200
          gap-1
        "
        >
          {filters.has_dietary_restrictions ? 'Has' : 'No'} dietary restrictions
          <XMarkIcon
            className="w-3 h-3 cursor-pointer hover:text-success-900 transition-colors"
            onClick={() =>
              handleFilterChange({ has_dietary_restrictions: undefined })
            }
          />
        </Badge>,
      );
    }

    return activeFilters.length > 0 ? (
      <div className="flex flex-wrap gap-2 mb-4">
        {activeFilters}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setFilters(DEFAULT_FILTERS)}
          className="
            text-xs
            px-3 py-1.5
            text-gray-500 hover:text-gray-700
            hover:bg-gray-50
            transition-all duration-200
          "
        >
          Clear all
        </Button>
      </div>
    ) : null;
  };

  // Render view content with performance optimization
  const renderContent = () => {
    if (loading && guests.length === 0) {
      return <GuestListLoadingSkeleton />;
    }

    if (error) {
      return (
        <Card
          className="
          bg-white
          border border-error-200
          rounded-xl
          p-8
          text-center
          shadow-xs
        "
        >
          <div className="space-y-4">
            <div className="w-12 h-12 mx-auto bg-error-100 rounded-full flex items-center justify-center">
              <XMarkIcon className="w-6 h-6 text-error-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Error Loading Guests
              </h3>
              <p className="text-error-600 mt-1">{error.message}</p>
            </div>
            <Button
              onClick={refresh}
              className="
              px-4 py-2.5
              bg-primary-600 hover:bg-primary-700
              text-white font-semibold text-sm
              rounded-lg
              shadow-xs hover:shadow-sm
              transition-all duration-200
            "
            >
              Try Again
            </Button>
          </div>
        </Card>
      );
    }

    if (guests.length === 0) {
      return (
        <Card
          className="
          bg-white
          border border-gray-200
          rounded-xl
          p-8
          text-center
          shadow-xs
        "
        >
          <div className="space-y-6">
            <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
              <PlusIcon className="w-8 h-8 text-gray-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                No guests yet
              </h3>
              <p className="text-gray-600 mt-2 text-base leading-relaxed">
                {filters.search ||
                filters.category !== 'all' ||
                filters.rsvp_status !== 'all'
                  ? 'No guests match your current filters. Try adjusting your search criteria.'
                  : 'Get started by adding guests individually or importing from a CSV file.'}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <ShimmerButton
                className="shadow-lg"
                onClick={() => setShowAddGuestModal(true)}
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                <span className="whitespace-pre-wrap text-center text-sm font-medium">
                  Add Guest
                </span>
              </ShimmerButton>
              <Button
                variant="outline"
                onClick={() => setShowImportModal(true)}
                className="
                  px-4 py-2.5
                  bg-white hover:bg-gray-50
                  text-gray-700 font-semibold text-sm
                  border border-gray-300
                  rounded-lg
                  shadow-xs hover:shadow-sm
                  transition-all duration-200
                "
              >
                <ArrowUpTrayIcon className="w-4 h-4 mr-2" />
                Import Guests
              </Button>
            </div>
          </div>
        </Card>
      );
    }

    const contentProps = {
      guests: visibleItems.length > 0 ? visibleItems : guests,
      selectedGuests,
      onGuestSelect: toggleGuestSelection,
      onSort: handleSortChange,
      sort,
      view,
      analytics,
      onLoadMore: hasMore ? loadMore : undefined,
      loading,
    };

    switch (view.type) {
      case 'cards':
        return <GuestCards {...contentProps} />;
      case 'households':
        return <HouseholdView {...contentProps} coupleId={coupleId} />;
      default:
        return <GuestTable {...contentProps} />;
    }
  };

  return (
    <div className="space-y-6" data-testid="guest-list-container">
      {/* Search and Actions Bar - Untitled UI Design */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              id="guest-search"
              type="text"
              placeholder="Search guests by name, email, or notes..."
              value={filters.search}
              onChange={(e) => debouncedSearch(e.target.value)}
              data-testid="guest-search-input"
              className="
                w-full pl-10 pr-4 py-2.5
                bg-white
                border border-gray-300
                rounded-lg
                text-gray-900 placeholder-gray-500
                shadow-xs
                focus:outline-none focus:ring-4 focus:ring-primary-100
                focus:border-primary-300
                transition-all duration-200
              "
            />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View Toggle - Untitled UI Style */}
          <div className="hidden sm:flex border border-gray-200 rounded-lg p-1 bg-gray-50">
            <Button
              size="sm"
              variant={view.type === 'table' ? 'default' : 'ghost'}
              onClick={() => handleViewChange({ type: 'table' })}
              className={`
                px-3 py-2 text-sm font-medium rounded-md transition-all
                ${
                  view.type === 'table'
                    ? 'bg-white text-gray-900 shadow-xs border border-gray-200'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }
              `}
            >
              <TableCellsIcon className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant={view.type === 'cards' ? 'default' : 'ghost'}
              onClick={() => handleViewChange({ type: 'cards' })}
              className={`
                px-3 py-2 text-sm font-medium rounded-md transition-all
                ${
                  view.type === 'cards'
                    ? 'bg-white text-gray-900 shadow-xs border border-gray-200'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }
              `}
            >
              <Squares2X2Icon className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant={view.type === 'households' ? 'default' : 'ghost'}
              onClick={() => handleViewChange({ type: 'households' })}
              className={`
                px-3 py-2 text-sm font-medium rounded-md transition-all
                ${
                  view.type === 'households'
                    ? 'bg-white text-gray-900 shadow-xs border border-gray-200'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }
              `}
              data-testid="view-households-button"
            >
              <HomeIcon className="w-4 h-4" />
            </Button>
          </div>

          <Button
            variant="outline"
            onClick={() => setShowFiltersPanel(!showFiltersPanel)}
            data-testid="filters-button"
            className={`
              px-4 py-2.5
              text-sm font-semibold
              border border-gray-300
              rounded-lg
              shadow-xs hover:shadow-sm
              transition-all duration-200
              ${
                showFiltersPanel
                  ? 'bg-primary-50 text-primary-700 border-primary-300'
                  : 'bg-white hover:bg-gray-50 text-gray-700'
              }
            `}
          >
            <FunnelIcon className="w-4 h-4 mr-2" />
            Filters
          </Button>

          <Button
            variant="outline"
            onClick={() => setShowExportModal(true)}
            data-testid="export-guests-button"
            className="
              px-4 py-2.5
              bg-white hover:bg-gray-50
              text-gray-700 font-semibold text-sm
              border border-gray-300
              rounded-lg
              shadow-xs hover:shadow-sm
              transition-all duration-200
            "
          >
            <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
            Export
          </Button>

          <Button
            variant="outline"
            onClick={() => setShowImportModal(true)}
            data-testid="import-guests-button"
            className="
              px-4 py-2.5
              bg-white hover:bg-gray-50
              text-gray-700 font-semibold text-sm
              border border-gray-300
              rounded-lg
              shadow-xs hover:shadow-sm
              transition-all duration-200
            "
          >
            <ArrowUpTrayIcon className="w-4 h-4 mr-2" />
            Import
          </Button>

          <ShimmerButton
            className="shadow-lg"
            onClick={() => setShowAddGuestModal(true)}
            data-testid="add-guest-button"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            <span className="whitespace-pre-wrap text-center text-sm font-medium">
              Add Guest
            </span>
          </ShimmerButton>
        </div>
      </div>

      {/* Analytics Summary - WS-077 Requirement */}
      {analytics && (
        <Card
          className="
          bg-white
          border border-gray-200
          rounded-xl
          p-4
          shadow-xs
        "
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
            <div className="text-center">
              <div
                className="text-2xl font-bold text-gray-900"
                data-testid="total-guest-count"
              >
                {analytics.total_guests}
              </div>
              <div className="text-sm text-gray-600">Total Guests</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-success-600">
                {analytics.attending}
              </div>
              <div className="text-sm text-gray-600">Attending</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-warning-600">
                {analytics.pending}
              </div>
              <div className="text-sm text-gray-600">Pending</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-error-600">
                {analytics.declined}
              </div>
              <div className="text-sm text-gray-600">Declined</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary-600">
                {analytics.with_dietary_restrictions}
              </div>
              <div className="text-sm text-gray-600">Special Diets</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {analytics.with_plus_ones}
              </div>
              <div className="text-sm text-gray-600">Plus Ones</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {analytics.households}
              </div>
              <div className="text-sm text-gray-600">Households</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {analytics.avg_household_size}
              </div>
              <div className="text-sm text-gray-600">Avg Size</div>
            </div>
          </div>
        </Card>
      )}

      {/* Filters Panel */}
      {showFiltersPanel && (
        <GuestFilters
          filters={filters}
          onChange={handleFilterChange}
          analytics={analytics}
          onClose={() => setShowFiltersPanel(false)}
        />
      )}

      {/* Active Filters */}
      {renderActiveFilters()}

      {/* Bulk Selection Bar */}
      {selectedGuests.size > 0 && (
        <BulkSelectionBar
          selectedCount={selectedGuests.size}
          totalCount={guests.length}
          onSelectAll={() => selectAllVisible(guests)}
          onClearSelection={clearSelection}
          onBulkUpdate={() => setBulkOperationType('update')}
          onBulkDelete={() => setBulkOperationType('delete')}
          onBulkExport={() => setBulkOperationType('export')}
          onTableAssignment={() => setBulkOperationType('assign_table')}
        />
      )}

      {/* Main Content with Virtual Scrolling for Performance */}
      <div
        ref={containerRef}
        style={{ height: totalHeight ? `${totalHeight}px` : 'auto' }}
        className="min-h-[400px]"
      >
        {renderContent()}
      </div>

      {/* Load More for Performance Optimization */}
      {hasMore && !loading && (
        <div className="text-center">
          <Button
            variant="outline"
            onClick={loadMore}
            className="
              px-6 py-3
              bg-white hover:bg-gray-50
              text-gray-700 font-semibold text-sm
              border border-gray-300
              rounded-lg
              shadow-xs hover:shadow-sm
              transition-all duration-200
            "
          >
            Load More Guests ({guests.length} loaded)
          </Button>
        </div>
      )}

      {/* Modals */}
      <GuestImportWizard
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        coupleId={coupleId}
        clientName={clientName}
        onSuccess={refresh}
      />

      <GuestExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        coupleId={coupleId}
        selectedGuests={
          selectedGuests.size > 0 ? Array.from(selectedGuests) : undefined
        }
        filters={filters}
        analytics={analytics}
      />

      <AddGuestModal
        isOpen={showAddGuestModal}
        onClose={() => setShowAddGuestModal(false)}
        coupleId={coupleId}
        onSuccess={refresh}
      />

      <BulkOperationsModal
        isOpen={bulkOperationsState.showModal}
        onClose={closeBulkModal}
        operationType={bulkOperationsState.operationType}
        selectedGuests={Array.from(selectedGuests)}
        onBulkUpdate={handleBulkUpdate}
        onBulkDelete={handleBulkDelete}
        coupleId={coupleId}
      />
    </div>
  );
}

// Loading skeleton with Untitled UI styling
function GuestListLoadingSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 8 }, (_, i) => (
        <div
          key={i}
          className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg bg-white"
        >
          <div className="w-4 h-4 bg-gray-200 rounded animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded animate-pulse" />
            <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3" />
          </div>
          <div className="w-20 h-6 bg-gray-200 rounded animate-pulse" />
          <div className="w-16 h-6 bg-gray-200 rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}
