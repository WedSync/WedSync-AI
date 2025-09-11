'use client';

import React, { memo, useMemo, useCallback } from 'react';
import { GuestSearchResult } from '@/types/guest-management';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  UserIcon,
  PencilIcon,
  EllipsisHorizontalIcon,
} from '@heroicons/react/20/solid';
import { cn } from '@/lib/utils';
import {
  MemoizedDataGrid,
  DataGridColumn,
  DataGridProps,
  DataGridSort,
} from './MemoizedDataGrid';

interface MemoizedGuestDataGridProps {
  guests: GuestSearchResult[];
  selectedGuests: Set<string>;
  onGuestSelect: (guestId: string) => void;
  onSort?: (sort: DataGridSort) => void;
  sort?: DataGridSort;
  visibleColumns?: string[];
  density?: 'compact' | 'normal' | 'spacious';
  loading?: boolean;
  onLoadMore?: () => void;
  onEditGuest?: (guest: GuestSearchResult) => void;
  onGuestActions?: (guest: GuestSearchResult) => void;
  height?: number;
  className?: string;
}

const CATEGORY_COLORS = {
  family: 'bg-blue-50 text-blue-700 border-blue-200',
  friends: 'bg-green-50 text-green-700 border-green-200',
  work: 'bg-purple-50 text-purple-700 border-purple-200',
  other: 'bg-gray-50 text-gray-700 border-gray-200',
} as const;

const RSVP_COLORS = {
  pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  attending: 'bg-green-50 text-green-700 border-green-200',
  declined: 'bg-red-50 text-red-700 border-red-200',
  maybe: 'bg-orange-50 text-orange-700 border-orange-200',
} as const;

const SIDE_COLORS = {
  partner1: 'bg-pink-50 text-pink-700 border-pink-200',
  partner2: 'bg-blue-50 text-blue-700 border-blue-200',
  mutual: 'bg-gray-50 text-gray-700 border-gray-200',
} as const;

const DEFAULT_VISIBLE_COLUMNS = [
  'name',
  'email',
  'phone',
  'category',
  'side',
  'rsvp_status',
  'table_number',
  'actions',
];

export const MemoizedGuestDataGrid = memo<MemoizedGuestDataGridProps>(
  ({
    guests,
    selectedGuests,
    onGuestSelect,
    onSort,
    sort,
    visibleColumns = DEFAULT_VISIBLE_COLUMNS,
    density = 'normal',
    loading = false,
    onLoadMore,
    onEditGuest,
    onGuestActions,
    height = 400,
    className,
  }) => {
    // Calculate row height based on density
    const rowHeight = useMemo(() => {
      switch (density) {
        case 'compact':
          return 40;
        case 'spacious':
          return 64;
        default:
          return 48;
      }
    }, [density]);

    const isCompact = density === 'compact';

    // Column configurations with optimized renderers
    const columns: DataGridColumn<GuestSearchResult>[] = useMemo(() => {
      const columnConfigs: Record<string, DataGridColumn<GuestSearchResult>> = {
        name: {
          id: 'name',
          label: 'Name',
          width: 200,
          sortable: true,
          sortField: 'last_name',
          render: (_, guest) => (
            <div className="flex items-center space-x-3">
              <div
                className={cn(
                  'flex-shrink-0 rounded-full bg-gray-200 flex items-center justify-center',
                  isCompact ? 'w-5 h-5' : 'w-8 h-8',
                )}
              >
                <UserIcon
                  className={cn(
                    'text-gray-400',
                    isCompact ? 'w-3 h-3' : 'w-4 h-4',
                  )}
                />
              </div>
              <div className="min-w-0 flex-1">
                <div
                  className={cn(
                    'font-medium text-gray-900 truncate',
                    isCompact ? 'text-sm' : 'text-base',
                  )}
                >
                  {guest.first_name} {guest.last_name}
                </div>
                {guest.plus_one && guest.plus_one_name && !isCompact && (
                  <div className="text-xs text-gray-500 truncate">
                    +1: {guest.plus_one_name}
                  </div>
                )}
              </div>
            </div>
          ),
        },

        email: {
          id: 'email',
          label: 'Email',
          width: 200,
          sortable: true,
          sortField: 'email',
          render: (_, guest) =>
            guest.email ? (
              <div
                className={cn(
                  'text-gray-900 truncate',
                  isCompact ? 'text-sm' : 'text-base',
                )}
                title={guest.email}
              >
                {guest.email}
              </div>
            ) : (
              <span className="text-gray-400">—</span>
            ),
        },

        phone: {
          id: 'phone',
          label: 'Phone',
          width: 140,
          sortable: true,
          sortField: 'phone',
          render: (_, guest) =>
            guest.phone ? (
              <div
                className={cn(
                  'text-gray-900',
                  isCompact ? 'text-sm' : 'text-base',
                )}
              >
                {guest.phone}
              </div>
            ) : (
              <span className="text-gray-400">—</span>
            ),
        },

        category: {
          id: 'category',
          label: 'Category',
          width: 100,
          sortable: true,
          sortField: 'category',
          align: 'center' as const,
          render: (_, guest) => (
            <Badge
              className={cn(
                'capitalize border',
                CATEGORY_COLORS[guest.category],
                isCompact ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1',
              )}
            >
              {guest.category}
            </Badge>
          ),
        },

        side: {
          id: 'side',
          label: 'Side',
          width: 80,
          sortable: true,
          sortField: 'side',
          align: 'center' as const,
          render: (_, guest) => (
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
          ),
        },

        rsvp_status: {
          id: 'rsvp_status',
          label: 'RSVP',
          width: 100,
          sortable: true,
          sortField: 'rsvp_status',
          align: 'center' as const,
          render: (_, guest) => (
            <Badge
              className={cn(
                'capitalize border',
                RSVP_COLORS[guest.rsvp_status],
                isCompact ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1',
              )}
            >
              {guest.rsvp_status}
            </Badge>
          ),
        },

        age_group: {
          id: 'age_group',
          label: 'Age',
          width: 80,
          sortable: true,
          sortField: 'age_group',
          align: 'center' as const,
          render: (_, guest) => (
            <span
              className={cn(
                'text-gray-600 capitalize',
                isCompact ? 'text-sm' : 'text-base',
              )}
            >
              {guest.age_group}
            </span>
          ),
        },

        plus_one: {
          id: 'plus_one',
          label: 'Plus One',
          width: 90,
          sortable: true,
          sortField: 'plus_one',
          align: 'center' as const,
          render: (_, guest) =>
            guest.plus_one ? (
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
            ),
        },

        table_number: {
          id: 'table_number',
          label: 'Table',
          width: 80,
          sortable: true,
          sortField: 'table_number',
          align: 'center' as const,
          render: (_, guest) =>
            guest.table_number ? (
              <div
                className={cn(
                  'font-medium text-center bg-gray-100 rounded px-2 py-1 inline-block',
                  isCompact ? 'text-sm' : 'text-base',
                )}
              >
                {guest.table_number}
              </div>
            ) : (
              <span className="text-gray-400">—</span>
            ),
        },

        household: {
          id: 'household',
          label: 'Household',
          width: 140,
          sortable: true,
          sortField: 'household_name',
          render: (_, guest) =>
            guest.household_name ? (
              <div
                className={cn(
                  'text-gray-600 truncate',
                  isCompact ? 'text-sm' : 'text-base',
                )}
                title={guest.household_name}
              >
                {guest.household_name}
              </div>
            ) : (
              <span className="text-gray-400">—</span>
            ),
        },

        dietary: {
          id: 'dietary',
          label: 'Dietary',
          width: 90,
          align: 'center' as const,
          render: (_, guest) =>
            guest.dietary_restrictions ? (
              <div
                className={cn(
                  'text-orange-600 bg-orange-50 border border-orange-200 rounded px-2 py-1',
                  isCompact ? 'text-xs' : 'text-sm',
                )}
              >
                Yes
              </div>
            ) : (
              <span className="text-gray-400">—</span>
            ),
        },

        actions: {
          id: 'actions',
          label: '',
          width: 80,
          align: 'center' as const,
          render: (_, guest) => (
            <div className="flex items-center justify-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {onEditGuest && (
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn('p-0', isCompact ? 'w-6 h-6' : 'w-8 h-8')}
                  onClick={() => onEditGuest(guest)}
                  title="Edit guest"
                >
                  <PencilIcon className="w-4 h-4" />
                </Button>
              )}
              {onGuestActions && (
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn('p-0', isCompact ? 'w-6 h-6' : 'w-8 h-8')}
                  onClick={() => onGuestActions(guest)}
                  title="More actions"
                >
                  <EllipsisHorizontalIcon className="w-4 h-4" />
                </Button>
              )}
            </div>
          ),
        },
      };

      return visibleColumns
        .map((columnId) => columnConfigs[columnId])
        .filter(Boolean);
    }, [visibleColumns, isCompact, onEditGuest, onGuestActions]);

    // Get guest ID function
    const getGuestId = useCallback((guest: GuestSearchResult) => guest.id, []);

    // Memoized data grid props
    const dataGridProps: DataGridProps<GuestSearchResult> = useMemo(
      () => ({
        data: guests,
        columns,
        selectedItems: selectedGuests,
        onItemSelect: onGuestSelect,
        onSort,
        sort,
        getItemId: getGuestId,
        height,
        rowHeight,
        loading,
        onLoadMore,
        enableBulkSelection: true,
        enableVirtualization: guests.length > 50,
        className: cn('guest-data-grid', className),
        emptyStateMessage:
          'No guests found. Try adjusting your filters or add some guests.',
      }),
      [
        guests,
        columns,
        selectedGuests,
        onGuestSelect,
        onSort,
        sort,
        getGuestId,
        height,
        rowHeight,
        loading,
        onLoadMore,
        className,
      ],
    );

    return <MemoizedDataGrid {...dataGridProps} />;
  },
  (prevProps, nextProps) => {
    // Custom comparison for optimal performance
    return (
      prevProps.guests === nextProps.guests &&
      prevProps.selectedGuests === nextProps.selectedGuests &&
      prevProps.sort === nextProps.sort &&
      prevProps.visibleColumns === nextProps.visibleColumns &&
      prevProps.density === nextProps.density &&
      prevProps.loading === nextProps.loading &&
      prevProps.height === nextProps.height
    );
  },
);

MemoizedGuestDataGrid.displayName = 'MemoizedGuestDataGrid';
