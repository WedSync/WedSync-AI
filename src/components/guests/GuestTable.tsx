'use client';

import React, { useState, useMemo } from 'react';
import {
  Guest,
  GuestSearchResult,
  GuestListSort,
  GuestListView,
  GuestAnalytics,
} from '@/types/guest-management';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ChevronUpIcon,
  ChevronDownIcon,
  EllipsisHorizontalIcon,
  PencilIcon,
  TrashIcon,
  UserIcon,
} from '@heroicons/react/20/solid';
import { cn } from '@/lib/utils';

interface GuestTableProps {
  guests: GuestSearchResult[];
  selectedGuests: Set<string>;
  onGuestSelect: (guestId: string) => void;
  onSort: (sort: GuestListSort) => void;
  sort: GuestListSort;
  view: GuestListView;
  analytics: GuestAnalytics | undefined;
  onLoadMore?: () => void;
  loading: boolean;
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

const CATEGORY_COLORS = {
  family: 'bg-blue-50 text-blue-700 border-blue-200',
  friends: 'bg-green-50 text-green-700 border-green-200',
  work: 'bg-purple-50 text-purple-700 border-purple-200',
  other: 'bg-gray-50 text-gray-700 border-gray-200',
};

const RSVP_COLORS = {
  pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  attending: 'bg-green-50 text-green-700 border-green-200',
  declined: 'bg-red-50 text-red-700 border-red-200',
  maybe: 'bg-orange-50 text-orange-700 border-orange-200',
};

const SIDE_COLORS = {
  partner1: 'bg-pink-50 text-pink-700 border-pink-200',
  partner2: 'bg-blue-50 text-blue-700 border-blue-200',
  mutual: 'bg-gray-50 text-gray-700 border-gray-200',
};

export function GuestTable({
  guests,
  selectedGuests,
  onGuestSelect,
  onSort,
  sort,
  view,
  analytics,
  onLoadMore,
  loading,
}: GuestTableProps) {
  const [hoveredGuest, setHoveredGuest] = useState<string | null>(null);

  const visibleColumns = useMemo(() => {
    return view.columns.filter(
      (col) => COLUMN_CONFIGS[col as keyof typeof COLUMN_CONFIGS],
    );
  }, [view.columns]);

  const handleSort = (field: keyof Guest | 'household_name') => {
    if (sort.field === field) {
      onSort({
        field,
        direction: sort.direction === 'asc' ? 'desc' : 'asc',
      });
    } else {
      onSort({ field, direction: 'asc' });
    }
  };

  const handleSelectAll = (checked: boolean) => {
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
  };

  const isAllSelected =
    guests.length > 0 && guests.every((guest) => selectedGuests.has(guest.id));
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

  const renderTableHeader = () => (
    <thead className="bg-gray-50 border-b border-gray-200">
      <tr>
        {/* Selection Column */}
        <th className="w-12 px-4 py-3 text-left">
          <Checkbox
            checked={isAllSelected}
            indeterminate={isPartiallySelected}
            onCheckedChange={handleSelectAll}
            aria-label="Select all guests"
          />
        </th>

        {visibleColumns.map((columnKey) => {
          const config =
            COLUMN_CONFIGS[columnKey as keyof typeof COLUMN_CONFIGS];
          if (!config) return null;

          return (
            <th
              key={columnKey}
              className={cn(
                'px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
                config.width,
                config.sortable
                  ? 'cursor-pointer hover:bg-gray-100 select-none'
                  : '',
              )}
              onClick={
                config.sortable ? () => handleSort(config.sortField) : undefined
              }
            >
              <div className="flex items-center">
                {config.label}
                {config.sortable && renderSortIcon(config.sortField)}
              </div>
            </th>
          );
        })}
      </tr>
    </thead>
  );

  const renderGuestRow = (guest: GuestSearchResult) => {
    const isSelected = selectedGuests.has(guest.id);
    const isHovered = hoveredGuest === guest.id;

    return (
      <tr
        key={guest.id}
        className={cn(
          'border-b border-gray-100 transition-colors',
          view.density === 'compact'
            ? 'h-12'
            : view.density === 'spacious'
              ? 'h-20'
              : 'h-16',
          isSelected ? 'bg-primary-50 border-primary-200' : 'hover:bg-gray-50',
          isHovered && !isSelected ? 'bg-gray-25' : '',
        )}
        onMouseEnter={() => setHoveredGuest(guest.id)}
        onMouseLeave={() => setHoveredGuest(null)}
        data-testid={`guest-row-${guest.id}`}
        data-selected={isSelected}
      >
        {/* Selection Column */}
        <td className="px-4 py-3">
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onGuestSelect(guest.id)}
            aria-label={`Select ${guest.first_name} ${guest.last_name}`}
          />
        </td>

        {visibleColumns.map((columnKey) => {
          return (
            <td key={columnKey} className="px-4 py-3">
              {renderCellContent(guest, columnKey, view.density)}
            </td>
          );
        })}
      </tr>
    );
  };

  const renderCellContent = (
    guest: GuestSearchResult,
    columnKey: string,
    density: string,
  ) => {
    const isCompact = density === 'compact';

    switch (columnKey) {
      case 'name':
        return (
          <div className="flex items-center space-x-3">
            <div
              className={cn(
                'flex-shrink-0 rounded-full bg-gray-200 flex items-center justify-center',
                isCompact ? 'w-6 h-6' : 'w-8 h-8',
              )}
            >
              <UserIcon
                className={cn(
                  'text-gray-400',
                  isCompact ? 'w-3 h-3' : 'w-4 h-4',
                )}
              />
            </div>
            <div>
              <div
                className={cn(
                  'font-medium text-gray-900',
                  isCompact ? 'text-sm' : 'text-base',
                )}
              >
                {guest.first_name} {guest.last_name}
              </div>
              {guest.plus_one && guest.plus_one_name && !isCompact && (
                <div className="text-xs text-gray-500">
                  +1: {guest.plus_one_name}
                </div>
              )}
            </div>
          </div>
        );

      case 'email':
        return guest.email ? (
          <div
            className={cn('text-gray-900', isCompact ? 'text-sm' : 'text-base')}
          >
            {guest.email}
          </div>
        ) : (
          <span className="text-gray-400">—</span>
        );

      case 'phone':
        return guest.phone ? (
          <div
            className={cn('text-gray-900', isCompact ? 'text-sm' : 'text-base')}
          >
            {guest.phone}
          </div>
        ) : (
          <span className="text-gray-400">—</span>
        );

      case 'category':
        return (
          <Badge
            className={cn(
              'capitalize border',
              CATEGORY_COLORS[guest.category],
              isCompact ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1',
            )}
          >
            {guest.category}
          </Badge>
        );

      case 'side':
        return (
          <Badge
            className={cn(
              'capitalize border',
              SIDE_COLORS[guest.side],
              isCompact ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1',
            )}
          >
            {guest.side === 'partner1'
              ? 'P1'
              : guest.side === 'partner2'
                ? 'P2'
                : 'Both'}
          </Badge>
        );

      case 'rsvp_status':
        return (
          <Badge
            className={cn(
              'capitalize border',
              RSVP_COLORS[guest.rsvp_status],
              isCompact ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1',
            )}
          >
            {guest.rsvp_status}
          </Badge>
        );

      case 'age_group':
        return (
          <span
            className={cn(
              'text-gray-600 capitalize',
              isCompact ? 'text-sm' : 'text-base',
            )}
          >
            {guest.age_group}
          </span>
        );

      case 'plus_one':
        return guest.plus_one ? (
          <Badge
            className={cn(
              'bg-green-50 text-green-700 border border-green-200',
              isCompact ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1',
            )}
          >
            Yes
          </Badge>
        ) : (
          <span className="text-gray-400">—</span>
        );

      case 'table_number':
        return guest.table_number ? (
          <div
            className={cn(
              'font-medium text-center bg-gray-100 rounded px-2 py-1',
              isCompact ? 'text-sm' : 'text-base',
            )}
          >
            {guest.table_number}
          </div>
        ) : (
          <span className="text-gray-400">—</span>
        );

      case 'household':
        return guest.household_name ? (
          <div
            className={cn('text-gray-600', isCompact ? 'text-sm' : 'text-base')}
          >
            {guest.household_name}
          </div>
        ) : (
          <span className="text-gray-400">—</span>
        );

      case 'dietary':
        return guest.dietary_restrictions ? (
          <div
            className={cn(
              'text-orange-600 bg-orange-50 border border-orange-200 rounded px-2 py-1 text-center',
              isCompact ? 'text-xs' : 'text-sm',
            )}
          >
            Yes
          </div>
        ) : (
          <span className="text-gray-400">—</span>
        );

      case 'actions':
        return (
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              className="w-8 h-8 p-0"
              title="Edit guest"
            >
              <PencilIcon className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-8 h-8 p-0"
              title="More actions"
            >
              <EllipsisHorizontalIcon className="w-4 h-4" />
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  if (guests.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          {renderTableHeader()}
          <tbody className="bg-white divide-y divide-gray-100">
            {guests.map(renderGuestRow)}
          </tbody>
        </table>
      </div>

      {/* Load More */}
      {onLoadMore && !loading && (
        <div className="px-6 py-4 border-t border-gray-200 text-center">
          <Button variant="outline" onClick={onLoadMore}>
            Load More Guests
          </Button>
        </div>
      )}

      {/* Loading indicator */}
      {loading && (
        <div className="px-6 py-4 border-t border-gray-200 text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto"></div>
        </div>
      )}
    </div>
  );
}
