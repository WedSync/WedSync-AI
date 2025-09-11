'use client';

import { useEffect, useState } from 'react';
import { useRealtimeTickets } from '@/hooks/useRealtimeTickets';
import { NotificationManager } from './NotificationManager';
import { TicketListView } from './TicketListView';
import { TicketSubmissionForm } from './TicketSubmissionForm';
import { OfflineQueueManager } from './OfflineQueueManager';
import { Plus, Search, Filter, Wifi, WifiOff, Bell } from 'lucide-react';

interface SupportDashboardProps {
  organizationId?: string;
  userId?: string;
  className?: string;
}

export function SupportDashboard({
  organizationId,
  userId,
  className = '',
}: SupportDashboardProps) {
  const [activeView, setActiveView] = useState<'tickets' | 'create' | 'queue'>(
    'tickets',
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [isOnline, setIsOnline] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);

  // Initialize realtime tickets with notification callbacks
  const {
    tickets,
    loading,
    error,
    isConnected,
    refresh,
    getUrgentTickets,
    getWeddingDayTickets,
    getTicketsByStatus,
  } = useRealtimeTickets({
    organizationId,
    userId,
    onTicketUpdate: (update) => {
      console.log('Ticket updated:', update);
      // Handle real-time ticket updates
      if (update.type === 'INSERT' && update.new) {
        // Scroll to top for new tickets
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    onUrgentTicket: (ticket) => {
      console.log('Urgent ticket received:', ticket);
      // Additional handling for urgent tickets beyond notifications
      if (ticket.priority === 'wedding_day_emergency') {
        // Auto-switch to tickets view for wedding day emergencies
        setActiveView('tickets');
      }
    },
  });

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Filter tickets based on search and filters
  const filteredTickets = tickets.filter((ticket) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesTitle = ticket.title.toLowerCase().includes(query);
      const matchesDescription = ticket.description
        .toLowerCase()
        .includes(query);
      const matchesVenue = ticket.venue_name?.toLowerCase().includes(query);
      const matchesTicketNumber = ticket.ticket_number
        .toLowerCase()
        .includes(query);

      if (
        !matchesTitle &&
        !matchesDescription &&
        !matchesVenue &&
        !matchesTicketNumber
      ) {
        return false;
      }
    }

    // Status filter
    if (filterStatus !== 'all' && ticket.status !== filterStatus) {
      return false;
    }

    // Priority filter
    if (filterPriority !== 'all') {
      if (
        filterPriority === 'urgent' &&
        ticket.priority !== 'urgent' &&
        ticket.priority !== 'wedding_day_emergency'
      ) {
        return false;
      }
      if (filterPriority !== 'urgent' && ticket.priority !== filterPriority) {
        return false;
      }
    }

    return true;
  });

  // Get ticket counts for dashboard stats
  const urgentTickets = getUrgentTickets();
  const weddingDayTickets = getWeddingDayTickets();
  const newTickets = getTicketsByStatus('new');
  const inProgressTickets = getTicketsByStatus('in_progress');

  return (
    <div className={`support-dashboard min-h-screen bg-gray-50 ${className}`}>
      {/* Header with status indicators */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="px-4 py-3">
          {/* Top status bar */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              {/* Connection status */}
              <div className="flex items-center space-x-1">
                {isOnline ? (
                  <Wifi className="h-4 w-4 text-green-600" />
                ) : (
                  <WifiOff className="h-4 w-4 text-red-600" />
                )}
                <span className="text-xs text-gray-600">
                  {isOnline ? 'Online' : 'Offline'}
                </span>
                {isConnected && isOnline && (
                  <span className="text-xs text-green-600">• Live</span>
                )}
              </div>

              {/* Offline queue indicator */}
              {!isOnline && (
                <div className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded">
                  Queuing requests
                </div>
              )}
            </div>

            {/* Notification toggle */}
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full relative"
            >
              <Bell className="h-4 w-4" />
              {(urgentTickets.length > 0 || weddingDayTickets.length > 0) && (
                <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-xs text-white font-medium">
                    {weddingDayTickets.length || urgentTickets.length}
                  </span>
                </span>
              )}
            </button>
          </div>

          {/* Dashboard stats */}
          <div className="grid grid-cols-4 gap-3 mb-4">
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900">
                {tickets.length}
              </div>
              <div className="text-xs text-gray-600">Total</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-amber-600">
                {newTickets.length}
              </div>
              <div className="text-xs text-gray-600">New</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-blue-600">
                {inProgressTickets.length}
              </div>
              <div className="text-xs text-gray-600">In Progress</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-red-600">
                {urgentTickets.length}
              </div>
              <div className="text-xs text-gray-600">Urgent</div>
            </div>
          </div>

          {/* Navigation tabs */}
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveView('tickets')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                activeView === 'tickets'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Tickets
            </button>
            <button
              onClick={() => setActiveView('create')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                activeView === 'create'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Create
            </button>
            {!isOnline && (
              <button
                onClick={() => setActiveView('queue')}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                  activeView === 'queue'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Queue
              </button>
            )}
          </div>
        </div>

        {/* Notification manager */}
        {showNotifications && (
          <div className="border-t border-gray-200 p-4">
            <NotificationManager />
          </div>
        )}

        {/* Search and filters (only show for tickets view) */}
        {activeView === 'tickets' && (
          <div className="border-t border-gray-200 p-4 space-y-3">
            {/* Search bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search tickets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Filters */}
            <div className="flex space-x-3">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="flex-1 py-2 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="all">All Status</option>
                <option value="new">New</option>
                <option value="assigned">Assigned</option>
                <option value="in_progress">In Progress</option>
                <option value="waiting_for_customer">Waiting</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>

              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="flex-1 py-2 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="all">All Priority</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent+</option>
              </select>
            </div>

            {/* Active filters indicator */}
            {(searchQuery ||
              filterStatus !== 'all' ||
              filterPriority !== 'all') && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">
                  Showing {filteredTickets.length} of {tickets.length} tickets
                </span>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setFilterStatus('all');
                    setFilterPriority('all');
                  }}
                  className="text-xs text-blue-600 hover:text-blue-500"
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="pb-20">
        {' '}
        {/* Bottom padding for mobile navigation */}
        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading tickets...</span>
          </div>
        )}
        {/* Error state */}
        {error && (
          <div className="mx-4 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <div className="text-red-800">
                <p className="font-medium">Connection Error</p>
                <p className="text-sm mt-1">{error}</p>
              </div>
              <button
                onClick={refresh}
                className="ml-auto px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
              >
                Retry
              </button>
            </div>
          </div>
        )}
        {/* Content based on active view */}
        {activeView === 'tickets' && !loading && (
          <TicketListView
            tickets={filteredTickets}
            onRefresh={refresh}
            className="px-4"
          />
        )}
        {activeView === 'create' && (
          <div className="px-4 py-4">
            <TicketSubmissionForm
              organizationId={organizationId}
              onTicketCreated={(ticket) => {
                console.log('Ticket created:', ticket);
                setActiveView('tickets');
              }}
            />
          </div>
        )}
        {activeView === 'queue' && !isOnline && (
          <div className="px-4 py-4">
            <OfflineQueueManager />
          </div>
        )}
        {/* Empty state */}
        {activeView === 'tickets' &&
          !loading &&
          filteredTickets.length === 0 &&
          tickets.length > 0 && (
            <div className="text-center py-12 px-4">
              <Filter className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                No matching tickets
              </h3>
              <p className="mt-2 text-gray-600">
                Try adjusting your search or filters to find what you're looking
                for.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setFilterStatus('all');
                  setFilterPriority('all');
                }}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Clear Filters
              </button>
            </div>
          )}
        {/* No tickets at all */}
        {activeView === 'tickets' && !loading && tickets.length === 0 && (
          <div className="text-center py-12 px-4">
            <div className="text-6xl mb-4">🎫</div>
            <h3 className="text-lg font-medium text-gray-900">
              No support tickets
            </h3>
            <p className="mt-2 text-gray-600 max-w-sm mx-auto">
              You don't have any support tickets yet. Create your first ticket
              to get help with any issues.
            </p>
            <button
              onClick={() => setActiveView('create')}
              className="mt-6 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create First Ticket
            </button>
          </div>
        )}
      </div>

      {/* Wedding day emergency floating action button */}
      {weddingDayTickets.length === 0 && (
        <button
          onClick={() => {
            setActiveView('create');
            // Pre-fill with wedding day emergency priority
            const createForm = document.querySelector(
              '[data-priority-field]',
            ) as HTMLSelectElement;
            if (createForm) {
              createForm.value = 'wedding_day_emergency';
            }
          }}
          className="fixed bottom-20 right-4 bg-red-600 text-white p-4 rounded-full shadow-lg hover:bg-red-700 transition-colors z-50"
          title="Wedding Day Emergency"
        >
          <span className="text-xl">🚨</span>
        </button>
      )}
    </div>
  );
}
