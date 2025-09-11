'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Guest,
  GuestSearchResult,
  GuestListFilters,
  GuestListSort,
  GuestListView,
  BulkOperationsState,
  GuestAnalytics,
} from '@/types/guest-management';

// Import all integration components
import { RSVPIntegration } from './RSVPIntegration';
import { TaskIntegration } from './TaskIntegration';
import { BudgetIntegration } from './BudgetIntegration';
import { WebsiteIntegration } from './WebsiteIntegration';

// Import existing components
import { GuestTable } from './GuestTable';
import { GuestCards } from './GuestCards';
import { HouseholdView } from './HouseholdView';
import { GuestFilters } from './GuestFilters';
import { BulkOperationsModal } from './BulkOperationsModal';
import { BulkSelectionBar } from './BulkSelectionBar';
import { GuestImportWizard } from './import/GuestImportWizard';
import { GuestExportModal } from './GuestExportModal';
import { AddGuestModal } from './AddGuestModal';

// Import hooks
import { useGuestSearch } from '@/hooks/useGuestSearch';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useVirtualScrolling } from '@/hooks/useVirtualScrolling';
import { useBulkOperations } from '@/hooks/useGuestBulkOperations';
import { useGuestSync } from '@/lib/realtime/guest-sync';

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
  HeartIcon,
  ClipboardDocumentListIcon,
  CurrencyDollarIcon,
  GlobeAltIcon,
  WifiIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/20/solid';

interface GuestListManagerIntegratedProps {
  coupleId: string;
  weddingId: string;
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

export function GuestListManagerIntegrated({
  coupleId,
  weddingId,
  initialParams,
  clientName,
}: GuestListManagerIntegratedProps) {
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

  // Integration state
  const [activeTab, setActiveTab] = useState<string>(
    initialParams.tab || 'guests',
  );
  const [integrationData, setIntegrationData] = useState({
    rsvp_attending: 0,
    tasks_assigned: 0,
    budget_per_guest: 0,
    website_views: 0,
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

  // Real-time sync
  const { lastUpdate, connected, triggerSync } = useGuestSync(coupleId, {
    includeRSVP: true,
    includeTasks: true,
    includeBudget: true,
    includeWebsite: true,
  });

  // Handle real-time updates
  useEffect(() => {
    if (lastUpdate) {
      console.log('Processing real-time update:', lastUpdate);
      refresh(); // Refresh guest data

      // Update integration metrics
      if (lastUpdate.metadata?.integration_updates?.includes('rsvp')) {
        fetchIntegrationData();
      }
    }
  }, [lastUpdate, refresh]);

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

  // Fetch integration data
  const fetchIntegrationData = useCallback(async () => {
    try {
      const [rsvpRes, taskRes, budgetRes, websiteRes] = await Promise.all([
        fetch(`/api/rsvp/analytics?wedding_id=${weddingId}`),
        fetch(`/api/tasks/analytics?wedding_id=${weddingId}`),
        fetch(`/api/budget/analytics?wedding_id=${weddingId}`),
        fetch(`/api/website/analytics?website_id=${weddingId}`),
      ]);

      const [rsvpData, taskData, budgetData, websiteData] = await Promise.all([
        rsvpRes.ok ? rsvpRes.json() : null,
        taskRes.ok ? taskRes.json() : null,
        budgetRes.ok ? budgetRes.json() : null,
        websiteRes.ok ? websiteRes.json() : null,
      ]);

      setIntegrationData({
        rsvp_attending: rsvpData?.attending_count || 0,
        tasks_assigned: taskData?.assigned_tasks || 0,
        budget_per_guest: budgetData?.per_guest_cost || 0,
        website_views: websiteData?.total_views || 0,
      });
    } catch (error) {
      console.error('Failed to fetch integration data:', error);
    }
  }, [weddingId]);

  useEffect(() => {
    fetchIntegrationData();
  }, [fetchIntegrationData]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    'ctrl+k': () => document.getElementById('guest-search')?.focus(),
    'ctrl+a': () => selectAllVisible(guests),
    'ctrl+i': () => setShowImportModal(true),
    'ctrl+e': () => setShowExportModal(true),
    'ctrl+n': () => setShowAddGuestModal(true),
    'ctrl+f': () => setShowFiltersPanel(!showFiltersPanel),
    'ctrl+1': () => setActiveTab('guests'),
    'ctrl+2': () => setActiveTab('rsvp'),
    'ctrl+3': () => setActiveTab('tasks'),
    'ctrl+4': () => setActiveTab('budget'),
    'ctrl+5': () => setActiveTab('website'),
    'ctrl+r': () => triggerSync(),
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
      newTab?: string,
    ) => {
      const params = new URLSearchParams();

      if (newFilters.search) params.set('search', newFilters.search);
      if (newFilters.category && newFilters.category !== 'all')
        params.set('category', newFilters.category);
      if (newFilters.rsvp_status && newFilters.rsvp_status !== 'all')
        params.set('rsvp_status', newFilters.rsvp_status);
      if (newView?.type) params.set('view', newView.type);
      if (newTab) params.set('tab', newTab);

      router.push(`?${params.toString()}`, { scroll: false });
    },
    [router],
  );

  // Filter handlers
  const handleFilterChange = useCallback(
    (newFilters: Partial<GuestListFilters>) => {
      const updatedFilters = { ...filters, ...newFilters };
      setFilters(updatedFilters);
      updateURL(updatedFilters, view, activeTab);
    },
    [filters, view, activeTab, updateURL],
  );

  const handleViewChange = useCallback(
    (newView: Partial<GuestListView>) => {
      const updatedView = { ...view, ...newView };
      setView(updatedView);
      updateURL(filters, updatedView, activeTab);
    },
    [filters, view, activeTab, updateURL],
  );

  const handleTabChange = useCallback(
    (newTab: string) => {
      setActiveTab(newTab);
      updateURL(filters, view, newTab);
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

  // Integration event handlers
  const handleRSVPUpdate = useCallback(
    (guestId: string, rsvpData: any) => {
      console.log('RSVP updated for guest:', guestId, rsvpData);
      fetchIntegrationData();
    },
    [fetchIntegrationData],
  );

  const handleTaskAssigned = useCallback(
    (guestId: string, taskId: string) => {
      console.log('Task assigned to guest:', guestId, taskId);
      fetchIntegrationData();
    },
    [fetchIntegrationData],
  );

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
        triggerSync(); // Notify all integrations
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
        triggerSync(); // Notify all integrations
      } else {
        throw new Error(result.error || 'Bulk delete failed');
      }
    } catch (error) {
      console.error('Bulk delete error:', error);
      // Show error toast
    }
  };

  // Get selected guest objects
  const selectedGuestObjects = useMemo(() => {
    return guests.filter((guest) => selectedGuests.has(guest.id));
  }, [guests, selectedGuests]);

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

  // Render main guest view content
  const renderGuestContent = () => {
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
      {/* Integration Status Bar */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <WifiIcon
                className={`w-4 h-4 ${connected ? 'text-green-600' : 'text-red-600'}`}
              />
              <span className="text-sm font-medium">
                {connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <HeartIcon className="w-4 h-4 text-primary-600" />
                <span>{integrationData.rsvp_attending} attending</span>
              </div>
              <div className="flex items-center gap-1">
                <ClipboardDocumentListIcon className="w-4 h-4 text-blue-600" />
                <span>{integrationData.tasks_assigned} tasks</span>
              </div>
              <div className="flex items-center gap-1">
                <CurrencyDollarIcon className="w-4 h-4 text-green-600" />
                <span>${integrationData.budget_per_guest}/guest</span>
              </div>
              <div className="flex items-center gap-1">
                <GlobeAltIcon className="w-4 h-4 text-purple-600" />
                <span>{integrationData.website_views} views</span>
              </div>
            </div>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={triggerSync}
            disabled={!connected}
          >
            Sync All
          </Button>
        </div>

        {lastUpdate && (
          <div className="mt-2 text-xs text-gray-500">
            Last update: {lastUpdate.type} from {lastUpdate.metadata?.source}(
            {new Date(
              lastUpdate.metadata?.timestamp || Date.now(),
            ).toLocaleTimeString()}
            )
          </div>
        )}
      </Card>

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

      {/* Main Integration Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="guests" className="flex items-center gap-2">
            <UserGroupIcon className="w-4 h-4" />
            Guests ({analytics?.total_guests || 0})
          </TabsTrigger>
          <TabsTrigger value="rsvp" className="flex items-center gap-2">
            <HeartIcon className="w-4 h-4" />
            RSVPs ({integrationData.rsvp_attending})
          </TabsTrigger>
          <TabsTrigger value="tasks" className="flex items-center gap-2">
            <ClipboardDocumentListIcon className="w-4 h-4" />
            Tasks ({integrationData.tasks_assigned})
          </TabsTrigger>
          <TabsTrigger value="budget" className="flex items-center gap-2">
            <CurrencyDollarIcon className="w-4 h-4" />
            Budget
          </TabsTrigger>
          <TabsTrigger value="website" className="flex items-center gap-2">
            <GlobeAltIcon className="w-4 h-4" />
            Website
          </TabsTrigger>
        </TabsList>

        <TabsContent value="guests" className="mt-6">
          <div
            ref={containerRef}
            style={{ height: totalHeight ? `${totalHeight}px` : 'auto' }}
          >
            {renderGuestContent()}
          </div>

          {/* Load More */}
          {hasMore && !loading && (
            <div className="text-center mt-6">
              <Button variant="outline" onClick={loadMore}>
                Load More Guests
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="rsvp" className="mt-6">
          <RSVPIntegration
            selectedGuests={selectedGuestObjects}
            onRSVPUpdate={handleRSVPUpdate}
            coupleId={coupleId}
            weddingId={weddingId}
          />
        </TabsContent>

        <TabsContent value="tasks" className="mt-6">
          <TaskIntegration
            selectedGuests={selectedGuestObjects}
            onTaskAssigned={handleTaskAssigned}
            coupleId={coupleId}
            weddingId={weddingId}
          />
        </TabsContent>

        <TabsContent value="budget" className="mt-6">
          <BudgetIntegration
            selectedGuests={selectedGuestObjects}
            totalGuests={analytics?.total_guests || 0}
            attendingGuests={integrationData.rsvp_attending}
            coupleId={coupleId}
            weddingId={weddingId}
          />
        </TabsContent>

        <TabsContent value="website" className="mt-6">
          <WebsiteIntegration
            selectedGuests={selectedGuestObjects}
            totalGuests={analytics?.total_guests || 0}
            coupleId={coupleId}
            weddingId={weddingId}
          />
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <GuestImportWizard
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        coupleId={coupleId}
        clientName={clientName}
        onSuccess={() => {
          refresh();
          triggerSync();
        }}
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
        onSuccess={() => {
          refresh();
          triggerSync();
        }}
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

export default GuestListManagerIntegrated;
