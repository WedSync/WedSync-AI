'use client';

import React from 'react';
import {
  Guest,
  GuestSearchResult,
  GuestListSort,
  GuestListView,
  GuestAnalytics,
} from '@/types/guest-management';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  EnvelopeIcon,
  PhoneIcon,
  UserIcon,
  PencilIcon,
  EllipsisHorizontalIcon,
} from '@heroicons/react/20/solid';
import { cn } from '@/lib/utils';

interface GuestCardsProps {
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

export function GuestCards({
  guests,
  selectedGuests,
  onGuestSelect,
  onSort,
  sort,
  view,
  analytics,
  onLoadMore,
  loading,
}: GuestCardsProps) {
  const isCompact = view.density === 'compact';
  const isSpacious = view.density === 'spacious';

  const renderGuestCard = (guest: GuestSearchResult) => {
    const isSelected = selectedGuests.has(guest.id);

    return (
      <Card
        key={guest.id}
        className={cn(
          'relative transition-all duration-200 hover:shadow-md',
          isSelected
            ? 'ring-2 ring-primary-500 bg-primary-25'
            : 'hover:bg-gray-25',
          isCompact ? 'p-4' : isSpacious ? 'p-8' : 'p-6',
        )}
        data-testid={`guest-card-${guest.id}`}
        data-selected={isSelected}
      >
        {/* Selection Checkbox */}
        <div className="absolute top-4 right-4">
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onGuestSelect(guest.id)}
            aria-label={`Select ${guest.first_name} ${guest.last_name}`}
          />
        </div>

        {/* Guest Avatar and Name */}
        <div className="flex items-start space-x-4 mb-4">
          <div
            className={cn(
              'flex-shrink-0 rounded-full bg-gray-200 flex items-center justify-center',
              isCompact ? 'w-10 h-10' : isSpacious ? 'w-16 h-16' : 'w-12 h-12',
            )}
          >
            <UserIcon
              className={cn(
                'text-gray-400',
                isCompact ? 'w-5 h-5' : isSpacious ? 'w-8 h-8' : 'w-6 h-6',
              )}
            />
          </div>

          <div className="flex-1 min-w-0">
            <h3
              className={cn(
                'font-semibold text-gray-900 truncate',
                isCompact ? 'text-sm' : isSpacious ? 'text-xl' : 'text-lg',
              )}
            >
              {guest.first_name} {guest.last_name}
            </h3>

            {guest.plus_one && guest.plus_one_name && (
              <p
                className={cn(
                  'text-gray-500',
                  isCompact ? 'text-xs' : 'text-sm',
                )}
              >
                +1: {guest.plus_one_name}
              </p>
            )}
          </div>
        </div>

        {/* Contact Information */}
        <div className="space-y-2 mb-4">
          {guest.email && (
            <div className="flex items-center space-x-2 text-gray-600">
              <EnvelopeIcon className="w-4 h-4 flex-shrink-0" />
              <span
                className={cn('truncate', isCompact ? 'text-xs' : 'text-sm')}
              >
                {guest.email}
              </span>
            </div>
          )}

          {guest.phone && (
            <div className="flex items-center space-x-2 text-gray-600">
              <PhoneIcon className="w-4 h-4 flex-shrink-0" />
              <span className={cn(isCompact ? 'text-xs' : 'text-sm')}>
                {guest.phone}
              </span>
            </div>
          )}
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Badge
            className={cn(
              'capitalize border',
              CATEGORY_COLORS[guest.category],
              isCompact ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1',
            )}
          >
            {guest.category}
          </Badge>

          <Badge
            className={cn(
              'capitalize border',
              RSVP_COLORS[guest.rsvp_status],
              isCompact ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1',
            )}
          >
            {guest.rsvp_status}
          </Badge>

          {guest.plus_one && (
            <Badge
              className={cn(
                'bg-purple-50 text-purple-700 border border-purple-200',
                isCompact ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1',
              )}
            >
              +1
            </Badge>
          )}

          {guest.dietary_restrictions && (
            <Badge
              className={cn(
                'bg-orange-50 text-orange-700 border border-orange-200',
                isCompact ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1',
              )}
            >
              Dietary
            </Badge>
          )}
        </div>

        {/* Additional Information */}
        {!isCompact && (
          <div className="space-y-2 mb-4 text-sm text-gray-600">
            {guest.household_name && (
              <div>
                <span className="font-medium">Household:</span>{' '}
                {guest.household_name}
              </div>
            )}

            {guest.table_number && (
              <div>
                <span className="font-medium">Table:</span> {guest.table_number}
              </div>
            )}

            <div>
              <span className="font-medium">Side:</span>{' '}
              {guest.side === 'partner1'
                ? 'Partner 1'
                : guest.side === 'partner2'
                  ? 'Partner 2'
                  : 'Mutual'}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between items-center">
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

          <div className="text-xs text-gray-400 capitalize">
            {guest.age_group}
          </div>
        </div>

        {/* Special Notes Indicator */}
        {(guest.special_needs || guest.helper_role) && !isCompact && (
          <div className="mt-3 p-2 bg-blue-50 rounded border border-blue-200">
            {guest.helper_role && (
              <div className="text-xs text-blue-700">
                <span className="font-medium">Role:</span> {guest.helper_role}
              </div>
            )}
            {guest.special_needs && (
              <div className="text-xs text-blue-700">
                <span className="font-medium">Special Needs:</span>{' '}
                {guest.special_needs}
              </div>
            )}
          </div>
        )}
      </Card>
    );
  };

  if (guests.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Cards Grid */}
      <div
        className={cn(
          'grid gap-4',
          isCompact
            ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
            : isSpacious
              ? 'grid-cols-1 lg:grid-cols-2'
              : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
        )}
      >
        {guests.map(renderGuestCard)}
      </div>

      {/* Load More */}
      {onLoadMore && !loading && (
        <div className="text-center">
          <Button variant="outline" onClick={onLoadMore}>
            Load More Guests
          </Button>
        </div>
      )}

      {/* Loading indicator */}
      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          <p className="text-sm text-gray-500 mt-2">Loading more guests...</p>
        </div>
      )}
    </div>
  );
}
