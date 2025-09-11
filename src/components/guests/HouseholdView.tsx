'use client';

import React from 'react';
import {
  Guest,
  GuestSearchResult,
  GuestListSort,
  GuestListView,
  GuestAnalytics,
} from '@/types/guest-management';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  HomeIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  PlusIcon,
} from '@heroicons/react/20/solid';
import { cn } from '@/lib/utils';

interface HouseholdViewProps {
  guests: GuestSearchResult[];
  selectedGuests: Set<string>;
  onGuestSelect: (guestId: string) => void;
  onSort: (sort: GuestListSort) => void;
  sort: GuestListSort;
  view: GuestListView;
  analytics: GuestAnalytics | undefined;
  onLoadMore?: () => void;
  loading: boolean;
  coupleId: string;
}

interface HouseholdGroup {
  household_name: string;
  guests: GuestSearchResult[];
  primary_contact?: GuestSearchResult;
}

export function HouseholdView({
  guests,
  selectedGuests,
  onGuestSelect,
  onSort,
  sort,
  view,
  analytics,
  onLoadMore,
  loading,
  coupleId,
}: HouseholdViewProps) {
  // Group guests by household
  const householdGroups = React.useMemo(() => {
    const groups = new Map<string, HouseholdGroup>();

    guests.forEach((guest) => {
      const householdName = guest.household_name || 'Individual Guests';

      if (!groups.has(householdName)) {
        groups.set(householdName, {
          household_name: householdName,
          guests: [],
          primary_contact: undefined,
        });
      }

      const group = groups.get(householdName)!;
      group.guests.push(guest);

      // Set primary contact (first adult with email)
      if (
        !group.primary_contact &&
        guest.age_group === 'adult' &&
        guest.email
      ) {
        group.primary_contact = guest;
      }
    });

    return Array.from(groups.values()).sort((a, b) =>
      a.household_name.localeCompare(b.household_name),
    );
  }, [guests]);

  const isCompact = view.density === 'compact';

  const renderHouseholdCard = (household: HouseholdGroup) => {
    const householdSelected = household.guests.every((guest) =>
      selectedGuests.has(guest.id),
    );
    const householdPartiallySelected =
      household.guests.some((guest) => selectedGuests.has(guest.id)) &&
      !householdSelected;

    const handleHouseholdSelection = (checked: boolean) => {
      household.guests.forEach((guest) => {
        if (checked && !selectedGuests.has(guest.id)) {
          onGuestSelect(guest.id);
        } else if (!checked && selectedGuests.has(guest.id)) {
          onGuestSelect(guest.id);
        }
      });
    };

    return (
      <Card key={household.household_name} className="p-6">
        {/* Household Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Checkbox
              checked={householdSelected}
              indeterminate={householdPartiallySelected}
              onCheckedChange={handleHouseholdSelection}
              aria-label={`Select ${household.household_name} household`}
            />
            <HomeIcon className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="font-semibold text-gray-900">
                {household.household_name}
              </h3>
              <p className="text-sm text-gray-600">
                {household.guests.length} members
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Badge variant="secondary">
              {
                household.guests.filter((g) => g.rsvp_status === 'attending')
                  .length
              }{' '}
              attending
            </Badge>
            {household.primary_contact && (
              <Badge className="bg-blue-100 text-blue-700">
                Primary Contact
              </Badge>
            )}
          </div>
        </div>

        {/* Household Members */}
        <div className="space-y-3">
          {household.guests.map((guest, index) => {
            const isSelected = selectedGuests.has(guest.id);
            const isPrimary = household.primary_contact?.id === guest.id;

            return (
              <div
                key={guest.id}
                className={cn(
                  'flex items-center space-x-3 p-3 border rounded-lg transition-colors',
                  isSelected
                    ? 'bg-primary-25 border-primary-200'
                    : 'hover:bg-gray-50',
                  isCompact ? 'p-2' : 'p-3',
                )}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => onGuestSelect(guest.id)}
                  aria-label={`Select ${guest.first_name} ${guest.last_name}`}
                />

                <div
                  className={cn(
                    'flex-shrink-0 rounded-full bg-gray-200 flex items-center justify-center',
                    isCompact ? 'w-8 h-8' : 'w-10 h-10',
                  )}
                >
                  <UserIcon
                    className={cn(
                      'text-gray-400',
                      isCompact ? 'w-4 h-4' : 'w-5 h-5',
                    )}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span
                      className={cn(
                        'font-medium text-gray-900',
                        isCompact ? 'text-sm' : '',
                      )}
                    >
                      {guest.first_name} {guest.last_name}
                    </span>
                    {isPrimary && (
                      <Badge className="bg-blue-100 text-blue-700 text-xs">
                        Primary
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center space-x-4 mt-1">
                    {guest.email && (
                      <div className="flex items-center space-x-1 text-gray-600">
                        <EnvelopeIcon className="w-3 h-3" />
                        <span className={cn(isCompact ? 'text-xs' : 'text-sm')}>
                          {guest.email}
                        </span>
                      </div>
                    )}
                    {guest.phone && (
                      <div className="flex items-center space-x-1 text-gray-600">
                        <PhoneIcon className="w-3 h-3" />
                        <span className={cn(isCompact ? 'text-xs' : 'text-sm')}>
                          {guest.phone}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Badge
                    className={cn(
                      'capitalize border',
                      guest.category === 'family'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : guest.category === 'friends'
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : guest.category === 'work'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : 'bg-gray-50 text-gray-700 border-gray-200',
                      isCompact ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1',
                    )}
                  >
                    {guest.category}
                  </Badge>

                  <Badge
                    className={cn(
                      'capitalize border',
                      guest.rsvp_status === 'attending'
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : guest.rsvp_status === 'declined'
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : guest.rsvp_status === 'maybe'
                            ? 'bg-orange-50 text-orange-700 border-orange-200'
                            : 'bg-yellow-50 text-yellow-700 border-yellow-200',
                      isCompact ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1',
                    )}
                  >
                    {guest.rsvp_status}
                  </Badge>

                  {guest.plus_one && (
                    <Badge
                      className={cn(
                        'bg-purple-50 text-purple-700 border border-purple-200',
                        isCompact
                          ? 'text-xs px-2 py-0.5'
                          : 'text-sm px-2.5 py-1',
                      )}
                    >
                      +1
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Household Actions */}
        <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
          <div className="text-sm text-gray-600">
            Total: {household.guests.length} • Adults:{' '}
            {household.guests.filter((g) => g.age_group === 'adult').length} •
            Children:{' '}
            {household.guests.filter((g) => g.age_group === 'child').length}
          </div>

          <Button variant="ghost" size="sm">
            <PlusIcon className="w-4 h-4 mr-1" />
            Add Member
          </Button>
        </div>
      </Card>
    );
  };

  if (householdGroups.length === 0) {
    return (
      <Card className="p-8 text-center">
        <HomeIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-gray-900 mb-1">
          No Households Found
        </h3>
        <p className="text-gray-600">
          Guests will appear here when household information is available.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <span>{householdGroups.length} households</span>
          <span>{guests.length} total guests</span>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              onSort({
                field: 'household_name',
                direction: sort.direction === 'asc' ? 'desc' : 'asc',
              })
            }
          >
            Sort by Name
          </Button>
        </div>
      </div>

      {/* Household Cards */}
      <div className="space-y-4">
        {householdGroups.map(renderHouseholdCard)}
      </div>

      {/* Load More */}
      {onLoadMore && !loading && (
        <div className="text-center">
          <Button variant="outline" onClick={onLoadMore}>
            Load More Households
          </Button>
        </div>
      )}

      {/* Loading indicator */}
      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          <p className="text-sm text-gray-500 mt-2">
            Loading more households...
          </p>
        </div>
      )}
    </div>
  );
}
