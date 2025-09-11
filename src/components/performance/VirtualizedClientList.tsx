'use client';

import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import { Button } from '@/components/ui/button-untitled';
import { Input } from '@/components/ui/input-untitled';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Filter,
  ArrowUpDown,
  MoreHorizontal,
  Mail,
  Phone,
  CheckCircle,
  XCircle,
  Square,
  Clock,
  Link as LinkIcon,
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { VirtualizedList } from './VirtualizedList';
import { ClientData } from '@/components/clients/ClientListViews';

interface VirtualizedClientListProps {
  clients: ClientData[];
  onSearch: (query: string) => void;
  onFilter: (filters: any) => void;
  onSort: (field: string, direction: 'asc' | 'desc') => void;
  searchQuery: string;
  bulkSelection?: {
    isClientSelected: (id: string) => boolean;
    toggleClientSelection: (id: string) => void;
    showBulkInterface: boolean;
    selectedIds: string[];
  };
  containerHeight?: number;
}

const statusConfig = {
  lead: { color: 'amber', icon: Clock },
  booked: { color: 'green', icon: CheckCircle },
  completed: { color: 'blue', icon: CheckCircle },
  archived: { color: 'gray', icon: XCircle },
} as const;

const getClientName = (client: ClientData) => {
  const names = [client.first_name, client.last_name].filter(Boolean).join(' ');
  const partnerNames = [client.partner_first_name, client.partner_last_name]
    .filter(Boolean)
    .join(' ');

  if (names && partnerNames) {
    return `${names} & ${partnerNames}`;
  }
  return names || partnerNames || 'Unnamed Client';
};

const getDaysUntilWedding = (weddingDate: string | null) => {
  if (!weddingDate) return null;
  const days = Math.ceil(
    (new Date(weddingDate).getTime() - new Date().getTime()) /
      (1000 * 60 * 60 * 24),
  );
  if (days < 0) return 'Past';
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `${days} days`;
};

// Memoized client row component for maximum performance
const ClientRow = React.memo(
  ({
    client,
    index,
    bulkSelection,
  }: {
    client: ClientData;
    index: number;
    bulkSelection?: VirtualizedClientListProps['bulkSelection'];
  }) => {
    const StatusIcon = statusConfig[client.status].icon;
    const daysUntil = getDaysUntilWedding(client.wedding_date);

    return (
      <div
        className="flex items-center px-6 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors duration-150"
        data-testid={`client-row-${client.id}`}
      >
        {bulkSelection && (
          <div className="flex items-center justify-center w-12">
            <button
              onClick={() => bulkSelection.toggleClientSelection(client.id)}
              className="flex items-center justify-center w-4 h-4 text-blue-600"
              data-testid={`select-client-${client.id}`}
            >
              {bulkSelection.isClientSelected(client.id) ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <Square className="w-4 h-4" />
              )}
            </button>
          </div>
        )}

        <div className="flex-1 min-w-0 px-4">
          <div className="font-medium text-gray-900 truncate">
            {getClientName(client)}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
            {client.email && (
              <span className="flex items-center gap-1 truncate">
                <Mail className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{client.email}</span>
              </span>
            )}
            {client.phone && (
              <span className="flex items-center gap-1">
                <Phone className="w-3 h-3 flex-shrink-0" />
                {client.phone}
              </span>
            )}
          </div>
        </div>

        <div className="w-32 px-4 text-sm">
          {client.wedding_date ? (
            <div>
              <div className="font-medium">
                {format(new Date(client.wedding_date), 'MMM d, yyyy')}
              </div>
              {daysUntil && (
                <div
                  className={`text-xs mt-0.5 ${
                    daysUntil === 'Today' || daysUntil === 'Tomorrow'
                      ? 'text-amber-600 font-medium'
                      : 'text-gray-500'
                  }`}
                >
                  {daysUntil}
                </div>
              )}
            </div>
          ) : (
            <span className="text-gray-400">Not set</span>
          )}
        </div>

        <div className="w-40 px-4 text-sm">
          <div className="truncate">
            {client.venue_name || (
              <span className="text-gray-400">Not set</span>
            )}
          </div>
        </div>

        <div className="w-28 px-4">
          <Badge
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
              statusConfig[client.status].color === 'amber'
                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                : statusConfig[client.status].color === 'green'
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : statusConfig[client.status].color === 'blue'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'bg-gray-50 text-gray-700 border border-gray-200'
            }`}
          >
            <StatusIcon className="w-3 h-3" />
            {client.status}
          </Badge>
        </div>

        <div className="w-32 px-4">
          {client.package_name ? (
            <div>
              <div className="text-sm font-medium truncate">
                {client.package_name}
              </div>
              {client.package_price && (
                <div className="text-xs text-gray-500 mt-0.5">
                  £{client.package_price.toLocaleString()}
                </div>
              )}
            </div>
          ) : (
            <span className="text-gray-400 text-sm">No package</span>
          )}
        </div>

        <div className="w-28 px-4">
          {client.is_wedme_connected ? (
            <Badge className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
              <LinkIcon className="w-3 h-3" />
              Connected
            </Badge>
          ) : (
            <Link href={`/clients/${client.id}/invite`}>
              <Button size="sm" variant="outline" className="text-xs h-7 px-2">
                Invite
              </Button>
            </Link>
          )}
        </div>

        <div className="w-12 px-4">
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-gray-600"
          >
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  },
);

ClientRow.displayName = 'ClientRow';

// Quick actions component for virtualized search
const QuickActions = React.memo(
  ({
    searchQuery,
    onSearch,
    onSort,
    filteredCount,
    totalCount,
  }: {
    searchQuery: string;
    onSearch: (query: string) => void;
    onSort: (field: string, direction: 'asc' | 'desc') => void;
    filteredCount: number;
    totalCount: number;
  }) => {
    const [sortField, setSortField] = useState<string>('');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    const handleSort = useCallback(
      (field: string) => {
        const newDirection =
          sortField === field && sortDirection === 'asc' ? 'desc' : 'asc';
        setSortField(field);
        setSortDirection(newDirection);
        onSort(field, newDirection);
      },
      [sortField, sortDirection, onSort],
    );

    return (
      <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              data-testid="virtualized-client-search"
              placeholder="Search clients..."
              value={searchQuery}
              onChange={(e) => onSearch(e.target.value)}
              className="pl-10 w-80 border-gray-300 focus:border-primary-300 focus:ring-4 focus:ring-primary-100"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSort('first_name')}
              className="gap-2"
            >
              <ArrowUpDown className="w-4 h-4" />
              Name
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSort('wedding_date')}
              className="gap-2"
            >
              <ArrowUpDown className="w-4 h-4" />
              Date
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSort('status')}
              className="gap-2"
            >
              <ArrowUpDown className="w-4 h-4" />
              Status
            </Button>
          </div>
        </div>

        <div className="text-sm text-gray-500">
          {filteredCount !== totalCount
            ? `${filteredCount} of ${totalCount} clients`
            : `${totalCount} clients`}
        </div>
      </div>
    );
  },
);

QuickActions.displayName = 'QuickActions';

export const VirtualizedClientList: React.FC<VirtualizedClientListProps> = ({
  clients,
  onSearch,
  onFilter,
  onSort,
  searchQuery,
  bulkSelection,
  containerHeight = 600,
}) => {
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  // Debounced search to avoid performance issues
  const handleSearch = useCallback(
    (query: string) => {
      setLocalSearchQuery(query);

      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      searchTimeoutRef.current = setTimeout(() => {
        onSearch(query);
      }, 300);
    },
    [onSearch],
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Filtered clients for performance
  const filteredClients = useMemo(() => {
    if (!localSearchQuery.trim()) return clients;

    const query = localSearchQuery.toLowerCase();
    return clients.filter((client) => {
      const name = getClientName(client).toLowerCase();
      const email = client.email?.toLowerCase() || '';
      const venue = client.venue_name?.toLowerCase() || '';

      return (
        name.includes(query) || email.includes(query) || venue.includes(query)
      );
    });
  }, [clients, localSearchQuery]);

  // Table header component
  const TableHeader = useCallback(
    () => (
      <div className="flex items-center px-6 py-3 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wider">
        {bulkSelection && (
          <div className="flex items-center justify-center w-12">
            <button
              onClick={() => {
                const allSelected = filteredClients.every((c) =>
                  bulkSelection.isClientSelected(c.id),
                );
                filteredClients.forEach((c) => {
                  if (allSelected && bulkSelection.isClientSelected(c.id)) {
                    bulkSelection.toggleClientSelection(c.id);
                  } else if (
                    !allSelected &&
                    !bulkSelection.isClientSelected(c.id)
                  ) {
                    bulkSelection.toggleClientSelection(c.id);
                  }
                });
              }}
              className="flex items-center justify-center w-4 h-4 text-blue-600"
            >
              {filteredClients.every((c) =>
                bulkSelection.isClientSelected(c.id),
              ) ? (
                <CheckCircle className="w-4 h-4" />
              ) : filteredClients.some((c) =>
                  bulkSelection.isClientSelected(c.id),
                ) ? (
                <div className="w-4 h-4 bg-blue-600 rounded flex items-center justify-center">
                  <div className="w-2 h-0.5 bg-white rounded" />
                </div>
              ) : (
                <Square className="w-4 h-4" />
              )}
            </button>
          </div>
        )}
        <div className="flex-1 min-w-0 px-4">Client</div>
        <div className="w-32 px-4">Wedding Date</div>
        <div className="w-40 px-4">Venue</div>
        <div className="w-28 px-4">Status</div>
        <div className="w-32 px-4">Package</div>
        <div className="w-28 px-4">WedMe</div>
        <div className="w-12 px-4">
          <span className="sr-only">Actions</span>
        </div>
      </div>
    ),
    [bulkSelection, filteredClients],
  );

  // Render item function for virtual list
  const renderClientItem = useCallback(
    (client: ClientData, index: number) => (
      <ClientRow
        key={client.id}
        client={client}
        index={index}
        bulkSelection={bulkSelection}
      />
    ),
    [bulkSelection],
  );

  const itemHeight = 80; // Height for each client row
  const headerHeight = 60; // Height for quick actions
  const tableHeaderHeight = 48; // Height for table header
  const totalHeaderHeight = headerHeight + tableHeaderHeight;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
      {/* Quick Actions Header */}
      <QuickActions
        searchQuery={localSearchQuery}
        onSearch={handleSearch}
        onSort={onSort}
        filteredCount={filteredClients.length}
        totalCount={clients.length}
      />

      {/* Table Header */}
      <TableHeader />

      {/* Virtualized Client List */}
      {filteredClients.length > 0 ? (
        <VirtualizedList
          items={filteredClients}
          itemHeight={itemHeight}
          containerHeight={containerHeight - totalHeaderHeight}
          renderItem={renderClientItem}
          keyExtractor={(client) => client.id}
          overscan={5}
          data-testid="virtualized-client-list"
        />
      ) : (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-6 h-6 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No clients found
            </h3>
            <p className="text-gray-500">
              {localSearchQuery
                ? 'Try adjusting your search terms'
                : 'No clients to display'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default VirtualizedClientList;
