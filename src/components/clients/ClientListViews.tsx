'use client';

import { useState, useMemo, useTransition } from 'react';
import { Button } from '@/components/ui/button-untitled';
import { Input } from '@/components/ui/input-untitled';
import { Card } from '@/components/ui/card-untitled';
import { Badge } from '@/components/ui/badge';
import {
  List,
  Grid3X3,
  Calendar,
  Kanban,
  Search,
  Filter,
  ArrowUpDown,
  MoreHorizontal,
  Plus,
  Upload,
  Clock,
  CheckCircle,
  XCircle,
  Link as LinkIcon,
  Mail,
  Phone,
  User,
  Square,
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import {
  BulkSelectionInterface,
  useBulkSelection,
} from './bulk/BulkSelectionInterface';
import TagFilter from '@/components/tags/TagFilter';

export type ViewType = 'list' | 'grid' | 'calendar' | 'kanban';

export interface ClientData {
  id: string;
  first_name: string | null;
  last_name: string | null;
  partner_first_name: string | null;
  partner_last_name: string | null;
  email: string | null;
  phone: string | null;
  wedding_date: string | null;
  venue_name: string | null;
  status: 'lead' | 'booked' | 'completed' | 'archived';
  package_name: string | null;
  package_price: number | null;
  is_wedme_connected: boolean;
  created_at: string;
  client_activities?: Array<{
    id: string;
    activity_type: string;
    created_at: string;
  }>;
}

interface ClientListViewsProps {
  clients: ClientData[];
  onSearch: (query: string) => void;
  onFilter: (filters: any) => void;
  onSort: (field: string, direction: 'asc' | 'desc') => void;
  onTagFilter: (tagIds: string[]) => void;
  searchQuery: string;
  selectedTagIds: string[];
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
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

function ListView({
  clients,
  bulkSelection,
}: {
  clients: ClientData[];
  bulkSelection?: any;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs">
      <div className="overflow-x-auto" data-testid="list-view">
        <table className="min-w-full">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              {bulkSelection && (
                <th className="px-6 py-3 text-left">
                  <button
                    onClick={() => {
                      const allSelected = clients.every((c) =>
                        bulkSelection.isClientSelected(c.id),
                      );
                      clients.forEach((c) => {
                        if (
                          allSelected &&
                          bulkSelection.isClientSelected(c.id)
                        ) {
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
                    {clients.every((c) =>
                      bulkSelection.isClientSelected(c.id),
                    ) ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : clients.some((c) =>
                        bulkSelection.isClientSelected(c.id),
                      ) ? (
                      <div className="w-4 h-4 bg-blue-600 rounded flex items-center justify-center">
                        <div className="w-2 h-0.5 bg-white rounded" />
                      </div>
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Client
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Wedding Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Venue
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Package
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                WedMe
              </th>
              <th className="relative px-6 py-3 w-0">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {clients.map((client) => {
              const StatusIcon = statusConfig[client.status].icon;
              const daysUntil = getDaysUntilWedding(client.wedding_date);

              return (
                <tr
                  key={client.id}
                  className="hover:bg-gray-50 transition-colors duration-150"
                >
                  {bulkSelection && (
                    <td className="px-6 py-4">
                      <button
                        onClick={() =>
                          bulkSelection.toggleClientSelection(client.id)
                        }
                        className="flex items-center justify-center w-4 h-4 text-blue-600"
                        data-testid={`select-client-${client.id}`}
                      >
                        {bulkSelection.isClientSelected(client.id) ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                  )}
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-medium text-gray-900">
                        {getClientName(client)}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        {client.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {client.email}
                          </span>
                        )}
                        {client.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {client.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {client.wedding_date ? (
                      <div>
                        <div className="text-sm font-medium">
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
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      {client.venue_name || (
                        <span className="text-gray-400">Not set</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
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
                  </td>
                  <td className="px-6 py-4">
                    {client.package_name ? (
                      <div>
                        <div className="text-sm font-medium">
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
                  </td>
                  <td className="px-6 py-4">
                    {client.is_wedme_connected ? (
                      <Badge className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                        <LinkIcon className="w-3 h-3" />
                        Connected
                      </Badge>
                    ) : (
                      <Link href={`/clients/${client.id}/invite`}>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7 px-2"
                        >
                          Invite
                        </Button>
                      </Link>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GridView({ clients }: { clients: ClientData[] }) {
  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
      data-testid="grid-view"
    >
      {clients.map((client) => {
        const StatusIcon = statusConfig[client.status].icon;
        const daysUntil = getDaysUntilWedding(client.wedding_date);

        return (
          <Card
            key={client.id}
            className="p-6 hover:shadow-md transition-all duration-200 border border-gray-200 rounded-xl"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-primary-50 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-primary-600" />
                </div>
                <Badge
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    statusConfig[client.status].color === 'amber'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : statusConfig[client.status].color === 'green'
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : statusConfig[client.status].color === 'blue'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-gray-50 text-gray-700 border border-gray-200'
                  }`}
                >
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {client.status}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-gray-600"
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </div>

            <div className="mb-4">
              <h3 className="font-semibold text-gray-900 mb-2">
                {getClientName(client)}
              </h3>

              <div className="space-y-2 text-sm text-gray-600">
                {client.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="truncate">{client.email}</span>
                  </div>
                )}
                {client.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span>{client.phone}</span>
                  </div>
                )}
                {client.wedding_date && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <div>
                      <div>
                        {format(new Date(client.wedding_date), 'MMM d, yyyy')}
                      </div>
                      {daysUntil && (
                        <div
                          className={`text-xs ${
                            daysUntil === 'Today' || daysUntil === 'Tomorrow'
                              ? 'text-amber-600 font-medium'
                              : 'text-gray-500'
                          }`}
                        >
                          {daysUntil}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between">
                {client.is_wedme_connected ? (
                  <Badge className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                    <LinkIcon className="w-3 h-3" />
                    Connected
                  </Badge>
                ) : (
                  <Link href={`/clients/${client.id}/invite`}>
                    <Button size="sm" variant="outline" className="text-xs">
                      Invite to WedMe
                    </Button>
                  </Link>
                )}
                <Link href={`/clients/${client.id}`}>
                  <Button size="sm" variant="outline">
                    View
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function CalendarView({ clients }: { clients: ClientData[] }) {
  const clientsByMonth = useMemo(() => {
    const grouped = clients.reduce(
      (acc, client) => {
        if (client.wedding_date) {
          const monthKey = format(new Date(client.wedding_date), 'yyyy-MM');
          if (!acc[monthKey]) {
            acc[monthKey] = [];
          }
          acc[monthKey].push(client);
        }
        return acc;
      },
      {} as Record<string, ClientData[]>,
    );

    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
  }, [clients]);

  return (
    <div className="space-y-6" data-testid="calendar-view">
      {clientsByMonth.length === 0 ? (
        <Card className="p-12 text-center">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No wedding dates set
          </h3>
          <p className="text-gray-500">
            Add wedding dates to your clients to see them in calendar view
          </p>
        </Card>
      ) : (
        clientsByMonth.map(([monthKey, monthClients]) => (
          <Card key={monthKey} className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {format(new Date(monthKey + '-01'), 'MMMM yyyy')}
            </h3>
            <div className="grid gap-4">
              {monthClients.map((client) => {
                const StatusIcon = statusConfig[client.status].icon;
                const daysUntil = getDaysUntilWedding(client.wedding_date);

                return (
                  <div
                    key={client.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-150"
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary-600">
                          {client.wedding_date
                            ? format(new Date(client.wedding_date), 'd')
                            : '?'}
                        </div>
                        {daysUntil && (
                          <div
                            className={`text-xs ${
                              daysUntil === 'Today' || daysUntil === 'Tomorrow'
                                ? 'text-amber-600 font-medium'
                                : 'text-gray-500'
                            }`}
                          >
                            {daysUntil}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {getClientName(client)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {client.venue_name || 'No venue set'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
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
                      <Link href={`/clients/${client.id}`}>
                        <Button size="sm" variant="outline">
                          View
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        ))
      )}
    </div>
  );
}

function KanbanView({ clients }: { clients: ClientData[] }) {
  const clientsByStatus = useMemo(() => {
    const statuses: Array<keyof typeof statusConfig> = [
      'lead',
      'booked',
      'completed',
      'archived',
    ];
    return statuses.map((status) => ({
      status,
      clients: clients.filter((client) => client.status === status),
      config: statusConfig[status],
    }));
  }, [clients]);

  return (
    <div className="flex gap-6 overflow-x-auto pb-6" data-testid="kanban-view">
      {clientsByStatus.map(({ status, clients: statusClients, config }) => {
        const StatusIcon = config.icon;

        return (
          <div key={status} className="flex-shrink-0 w-80">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-4">
                <Badge
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                    config.color === 'amber'
                      ? 'bg-amber-100 text-amber-800'
                      : config.color === 'green'
                        ? 'bg-green-100 text-green-800'
                        : config.color === 'blue'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  <StatusIcon className="w-4 h-4" />
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Badge>
                <span className="text-sm text-gray-500">
                  ({statusClients.length})
                </span>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {statusClients.map((client) => {
                  const daysUntil = getDaysUntilWedding(client.wedding_date);

                  return (
                    <Card
                      key={client.id}
                      className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-all duration-200 cursor-pointer"
                    >
                      <div className="mb-3">
                        <div className="font-medium text-gray-900 mb-1">
                          {getClientName(client)}
                        </div>
                        {client.email && (
                          <div className="text-sm text-gray-500 truncate">
                            {client.email}
                          </div>
                        )}
                      </div>

                      {client.wedding_date && (
                        <div className="mb-3 text-sm">
                          <div className="text-gray-900">
                            {format(
                              new Date(client.wedding_date),
                              'MMM d, yyyy',
                            )}
                          </div>
                          {daysUntil && (
                            <div
                              className={`text-xs ${
                                daysUntil === 'Today' ||
                                daysUntil === 'Tomorrow'
                                  ? 'text-amber-600 font-medium'
                                  : 'text-gray-500'
                              }`}
                            >
                              {daysUntil}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        {client.is_wedme_connected ? (
                          <Badge className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                            <LinkIcon className="w-3 h-3" />
                            Connected
                          </Badge>
                        ) : (
                          <span className="text-xs text-gray-400">
                            Not connected
                          </span>
                        )}
                        <Link href={`/clients/${client.id}`}>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs"
                          >
                            View
                          </Button>
                        </Link>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function ClientListViews({
  clients,
  onSearch,
  onFilter,
  onSort,
  onTagFilter,
  searchQuery,
  selectedTagIds,
  currentView,
  onViewChange,
}: ClientListViewsProps) {
  const [isPending, startTransition] = useTransition();
  const bulkSelection = useBulkSelection(clients);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    startTransition(() => {
      onSearch(e.target.value);
    });
  };

  const viewButtons = [
    { key: 'list' as ViewType, icon: List, label: 'List' },
    { key: 'grid' as ViewType, icon: Grid3X3, label: 'Grid' },
    { key: 'calendar' as ViewType, icon: Calendar, label: 'Calendar' },
    { key: 'kanban' as ViewType, icon: Kanban, label: 'Kanban' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Clients</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your wedding clients and their information
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/clients/import">
            <Button variant="outline" className="gap-2">
              <Upload className="w-4 h-4" />
              Import
            </Button>
          </Link>
          <Link href="/clients/new">
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add Client
            </Button>
          </Link>
        </div>
      </div>

      {/* Bulk Selection Interface - Team A Integration */}
      {bulkSelection.showBulkInterface && (
        <BulkSelectionInterface
          clients={clients}
          onSelectionChange={bulkSelection.setSelectedIds}
        />
      )}

      {/* Filters and Search */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            data-testid="client-search"
            placeholder="Search clients..."
            value={searchQuery}
            onChange={handleSearch}
            className="pl-10 border-gray-300 focus:border-primary-300 focus:ring-4 focus:ring-primary-100"
          />
        </div>

        <div className="flex items-center gap-3">
          <TagFilter
            selectedTagIds={selectedTagIds}
            onTagsChange={onTagFilter}
            buttonVariant="outline"
          />
          <Button variant="outline" className="gap-2">
            <Filter className="w-4 h-4" />
            More Filters
          </Button>
          <Button variant="outline" className="gap-2">
            <ArrowUpDown className="w-4 h-4" />
            Sort
          </Button>
        </div>
      </div>

      {/* View Toggles */}
      <div className="flex items-center justify-between">
        <div className="flex items-center bg-gray-100 p-1 rounded-lg">
          {viewButtons.map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              data-testid={`${key}-view-toggle`}
              onClick={() => onViewChange(key)}
              className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-all duration-150 ${
                currentView === key
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        <div className="text-sm text-gray-500">
          {clients.length} client{clients.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Views */}
      <div className={isPending ? 'opacity-50' : ''}>
        {clients.length === 0 ? (
          <Card className="p-12 text-center">
            <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No clients found
            </h3>
            <p className="text-gray-500 mb-6">
              {searchQuery
                ? 'Try adjusting your search terms'
                : 'Add your first client to get started'}
            </p>
            <div className="flex justify-center gap-2">
              <Link href="/clients/new">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Client
                </Button>
              </Link>
              <Link href="/clients/import">
                <Button variant="outline">
                  <Upload className="w-4 h-4 mr-2" />
                  Import Clients
                </Button>
              </Link>
            </div>
          </Card>
        ) : (
          <>
            {currentView === 'list' && (
              <ListView clients={clients} bulkSelection={bulkSelection} />
            )}
            {currentView === 'grid' && (
              <GridView clients={clients} bulkSelection={bulkSelection} />
            )}
            {currentView === 'calendar' && (
              <CalendarView clients={clients} bulkSelection={bulkSelection} />
            )}
            {currentView === 'kanban' && (
              <KanbanView clients={clients} bulkSelection={bulkSelection} />
            )}
          </>
        )}
      </div>

      {/* Summary */}
      {clients.length > 0 && (
        <div className="flex items-center justify-between text-sm text-gray-500 pt-4 border-t border-gray-200">
          <div>
            Showing {clients.length} client{clients.length !== 1 ? 's' : ''}
          </div>
          <div className="flex gap-4">
            <span>
              {clients.filter((c) => c.status === 'lead').length} leads
            </span>
            <span>
              {clients.filter((c) => c.status === 'booked').length} booked
            </span>
            <span>
              {clients.filter((c) => c.is_wedme_connected).length} connected
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
