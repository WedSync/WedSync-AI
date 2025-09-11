'use client';

import React, { memo } from 'react';
import { GuestSearchResult } from '@/types/guest-management';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  PencilIcon,
  EllipsisHorizontalIcon,
  UserIcon,
} from '@heroicons/react/20/solid';
import { cn } from '@/lib/utils';

interface VirtualizedGuestRowProps {
  guest: GuestSearchResult;
  isSelected: boolean;
  onSelect: () => void;
  visibleColumns: string[];
  density: string;
  isHovered: boolean;
  onHover: (guestId: string | null) => void;
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

const COLUMN_WIDTHS = {
  name: 'w-48',
  email: 'w-56',
  phone: 'w-40',
  category: 'w-28',
  side: 'w-24',
  rsvp_status: 'w-28',
  age_group: 'w-20',
  plus_one: 'w-24',
  table_number: 'w-20',
  household: 'w-40',
  dietary: 'w-32',
  actions: 'w-16',
} as const;

const VirtualizedGuestRowComponent: React.FC<VirtualizedGuestRowProps> = ({
  guest,
  isSelected,
  onSelect,
  visibleColumns,
  density,
  isHovered,
  onHover,
}) => {
  const isCompact = density === 'compact';

  const renderCellContent = (columnKey: string) => {
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
            className={cn(
              'text-gray-900 truncate',
              isCompact ? 'text-sm' : 'text-base',
            )}
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
            className={cn(
              'text-gray-600 truncate',
              isCompact ? 'text-sm' : 'text-base',
            )}
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
              className="w-8 h-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              title="Edit guest"
            >
              <PencilIcon className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-8 h-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
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

  return (
    <div
      className={cn(
        'group flex items-center border-b border-gray-100 transition-colors px-4 py-3',
        isSelected ? 'bg-primary-50 border-primary-200' : 'hover:bg-gray-50',
        isHovered && !isSelected ? 'bg-gray-25' : '',
      )}
      onMouseEnter={() => onHover(guest.id)}
      onMouseLeave={() => onHover(null)}
      data-testid={`virtual-guest-row-${guest.id}`}
      data-selected={isSelected}
      style={{
        // Optimize for performance
        contain: 'layout style paint',
        willChange: 'transform',
      }}
    >
      {/* Selection Column */}
      <div className="w-12 pr-4 flex-shrink-0">
        <Checkbox
          checked={isSelected}
          onCheckedChange={onSelect}
          aria-label={`Select ${guest.first_name} ${guest.last_name}`}
        />
      </div>

      {/* Data Columns */}
      {visibleColumns.map((columnKey, index) => {
        const width =
          COLUMN_WIDTHS[columnKey as keyof typeof COLUMN_WIDTHS] || 'w-auto';

        return (
          <div
            key={`${columnKey}-${index}`}
            className={cn('px-4 flex-shrink-0', width)}
          >
            {renderCellContent(columnKey)}
          </div>
        );
      })}
    </div>
  );
};

// Memoization comparison function for performance optimization
const areEqual = (
  prevProps: VirtualizedGuestRowProps,
  nextProps: VirtualizedGuestRowProps,
): boolean => {
  // Guest data comparison
  if (prevProps.guest.id !== nextProps.guest.id) return false;
  if (prevProps.guest.first_name !== nextProps.guest.first_name) return false;
  if (prevProps.guest.last_name !== nextProps.guest.last_name) return false;
  if (prevProps.guest.email !== nextProps.guest.email) return false;
  if (prevProps.guest.phone !== nextProps.guest.phone) return false;
  if (prevProps.guest.category !== nextProps.guest.category) return false;
  if (prevProps.guest.side !== nextProps.guest.side) return false;
  if (prevProps.guest.rsvp_status !== nextProps.guest.rsvp_status) return false;
  if (prevProps.guest.age_group !== nextProps.guest.age_group) return false;
  if (prevProps.guest.plus_one !== nextProps.guest.plus_one) return false;
  if (prevProps.guest.plus_one_name !== nextProps.guest.plus_one_name)
    return false;
  if (prevProps.guest.table_number !== nextProps.guest.table_number)
    return false;
  if (prevProps.guest.household_name !== nextProps.guest.household_name)
    return false;
  if (
    prevProps.guest.dietary_restrictions !==
    nextProps.guest.dietary_restrictions
  )
    return false;

  // UI state comparison
  if (prevProps.isSelected !== nextProps.isSelected) return false;
  if (prevProps.density !== nextProps.density) return false;
  if (prevProps.isHovered !== nextProps.isHovered) return false;

  // Visible columns comparison (shallow)
  if (prevProps.visibleColumns.length !== nextProps.visibleColumns.length)
    return false;
  for (let i = 0; i < prevProps.visibleColumns.length; i++) {
    if (prevProps.visibleColumns[i] !== nextProps.visibleColumns[i])
      return false;
  }

  return true;
};

export const VirtualizedGuestRow = memo(VirtualizedGuestRowComponent, areEqual);
