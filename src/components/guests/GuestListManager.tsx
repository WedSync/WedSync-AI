'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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

  // Data fetching
  const { guests, analytics, loading, error, hasMore, loadMore, refresh } =
    useGuestSearch({
      coupleId,
      filters,
      sort,
      pageSize: 50,
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

  // Virtual scrolling for performance with large lists
  const { containerRef, visibleItems, totalHeight, scrollToItem } =
    useVirtualScrolling({
      items: guests,
      itemHeight:
        view.density === 'compact' ? 48 : view.density === 'spacious' ? 80 : 64,
      containerHeight: 600,
      enabled: guests.length > 100,
    });

  // Keyboard shortcuts
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

  // URL sync
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

  // Filter handlers
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

  // Search with debouncing
  const debouncedSearch = useMemo(() => {
    let timeoutId: NodeJS.Timeout;
    return (searchTerm: string) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        handleFilterChange({ search: searchTerm });
      }, 300);
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
      // Show error toast
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
      // Show error toast
    }
  };

  // Render active filters
  const renderActiveFilters = () => {
    const activeFilters = [];

    if (filters.category !== 'all') {
      activeFilters.push(
        <Badge key="category" variant="secondary" className="gap-1">
          Category: {filters.category}
          <XMarkIcon
            className="w-3 h-3 cursor-pointer"
            onClick={() => handleFilterChange({ category: 'all' })}
          />
        </Badge>,
      );
    }

    if (filters.rsvp_status !== 'all') {
      activeFilters.push(
        <Badge key="rsvp" variant="secondary" className="gap-1">
          RSVP: {filters.rsvp_status}
          <XMarkIcon
            className="w-3 h-3 cursor-pointer"
            onClick={() => handleFilterChange({ rsvp_status: 'all' })}
          />
        </Badge>,
      );
    }

    if (filters.has_dietary_restrictions !== undefined) {
      activeFilters.push(
        <Badge key="dietary" variant="secondary" className="gap-1">
          {filters.has_dietary_restrictions ? 'Has' : 'No'} dietary restrictions
          <XMarkIcon
            className="w-3 h-3 cursor-pointer"
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
          className="text-xs"
        >
          Clear all
        </Button>
      </div>
    ) : null;
  };

  // Render view content
  const renderContent = () => {
    if (loading && guests.length === 0) {
      return <GuestListLoadingSkeleton />;
    }

    if (error) {
      return (
        <Card className="p-8 text-center">
          <p className="text-red-600 mb-4">
            Failed to load guests: {error.message}
          </p>
          <Button onClick={refresh}>Try Again</Button>
        </Card>
      );
    }

    if (guests.length === 0) {
      return (
        <Card className="p-8 text-center">
          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
              <PlusIcon className="w-8 h-8 text-gray-400" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                No guests yet
              </h3>
              <p className="text-gray-600 mt-1">
                {filters.search ||
                filters.category !== 'all' ||
                filters.rsvp_status !== 'all'
                  ? 'No guests match your current filters.'
                  : 'Get started by adding guests or importing from a file.'}
              </p>
            </div>
            <div className="flex justify-center gap-3">
              <Button onClick={() => setShowAddGuestModal(true)}>
                <PlusIcon className="w-4 h-4 mr-2" />
                Add Guest
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowImportModal(true)}
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
    <div className="space-y-6">
      {/* Search and Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              id="guest-search"
              type="text"
              placeholder="Search guests..."
              value={filters.search}
              onChange={(e) => debouncedSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="hidden sm:flex border rounded-lg p-1">
            <Button
              size="sm"
              variant={view.type === 'table' ? 'default' : 'ghost'}
              onClick={() => handleViewChange({ type: 'table' })}
            >
              <TableCellsIcon className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant={view.type === 'cards' ? 'default' : 'ghost'}
              onClick={() => handleViewChange({ type: 'cards' })}
            >
              <Squares2X2Icon className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant={view.type === 'households' ? 'default' : 'ghost'}
              onClick={() => handleViewChange({ type: 'households' })}
            >
              <HomeIcon className="w-4 h-4" />
            </Button>
          </div>

          <Button
            variant="outline"
            onClick={() => setShowFiltersPanel(!showFiltersPanel)}
            className={showFiltersPanel ? 'bg-primary-50' : ''}
          >
            <FunnelIcon className="w-4 h-4 mr-2" />
            Filters
          </Button>

          <Button variant="outline" onClick={() => setShowExportModal(true)}>
            <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
            Export
          </Button>

          <Button variant="outline" onClick={() => setShowImportModal(true)}>
            <ArrowUpTrayIcon className="w-4 h-4 mr-2" />
            Import
          </Button>

          <Button onClick={() => setShowAddGuestModal(true)}>
            <PlusIcon className="w-4 h-4 mr-2" />
            Add Guest
          </Button>
        </div>
      </div>

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

      {/* Main Content */}
      <div
        ref={containerRef}
        style={{ height: totalHeight ? `${totalHeight}px` : 'auto' }}
      >
        {renderContent()}
      </div>

      {/* Load More */}
      {hasMore && !loading && (
        <div className="text-center">
          <Button variant="outline" onClick={loadMore}>
            Load More Guests
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

// Loading skeleton component
function GuestListLoadingSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 8 }, (_, i) => (
        <div
          key={i}
          className="flex items-center space-x-4 p-4 border rounded-lg"
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
