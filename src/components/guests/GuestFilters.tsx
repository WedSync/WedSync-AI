'use client';

import React, { useState } from 'react';
import { GuestListFilters, GuestAnalytics } from '@/types/guest-management';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  XMarkIcon,
  AdjustmentsHorizontalIcon,
  FunnelIcon,
  UserGroupIcon,
  HeartIcon,
  BriefcaseIcon,
  UsersIcon,
} from '@heroicons/react/20/solid';
import { cn } from '@/lib/utils';

interface GuestFiltersProps {
  filters: GuestListFilters;
  onChange: (filters: Partial<GuestListFilters>) => void;
  analytics: GuestAnalytics | undefined;
  onClose?: () => void;
  className?: string;
}

interface FilterSection {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  content: React.ReactNode;
}

export function GuestFilters({
  filters,
  onChange,
  analytics,
  onClose,
  className,
}: GuestFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleFilterChange = (key: keyof GuestListFilters, value: any) => {
    onChange({ [key]: value });
  };

  const clearAllFilters = () => {
    onChange({
      search: '',
      category: 'all',
      rsvp_status: 'all',
      age_group: 'all',
      side: 'all',
      has_dietary_restrictions: undefined,
      has_plus_one: undefined,
      show_households: false,
    });
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.search) count++;
    if (filters.category !== 'all') count++;
    if (filters.rsvp_status !== 'all') count++;
    if (filters.age_group !== 'all') count++;
    if (filters.side !== 'all') count++;
    if (filters.has_dietary_restrictions !== undefined) count++;
    if (filters.has_plus_one !== undefined) count++;
    if (filters.show_households) count++;
    return count;
  };

  const activeFilterCount = getActiveFilterCount();

  const filterSections: FilterSection[] = [
    {
      title: 'Category',
      icon: UserGroupIcon,
      content: (
        <div className="space-y-3">
          <Select
            value={filters.category}
            onValueChange={(value) => handleFilterChange('category', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="family">
                <div className="flex items-center">
                  <HeartIcon className="w-4 h-4 mr-2 text-blue-500" />
                  Family {analytics && `(${analytics.family})`}
                </div>
              </SelectItem>
              <SelectItem value="friends">
                <div className="flex items-center">
                  <UsersIcon className="w-4 h-4 mr-2 text-green-500" />
                  Friends {analytics && `(${analytics.friends})`}
                </div>
              </SelectItem>
              <SelectItem value="work">
                <div className="flex items-center">
                  <BriefcaseIcon className="w-4 h-4 mr-2 text-purple-500" />
                  Work {analytics && `(${analytics.work})`}
                </div>
              </SelectItem>
              <SelectItem value="other">
                Other {analytics && `(${analytics.other})`}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      ),
    },
    {
      title: 'RSVP Status',
      icon: FunnelIcon,
      content: (
        <div className="space-y-3">
          <Select
            value={filters.rsvp_status}
            onValueChange={(value) => handleFilterChange('rsvp_status', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select RSVP status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">
                <div className="flex items-center justify-between w-full">
                  <span>Pending</span>
                  {analytics && (
                    <Badge variant="secondary">{analytics.pending}</Badge>
                  )}
                </div>
              </SelectItem>
              <SelectItem value="attending">
                <div className="flex items-center justify-between w-full">
                  <span>Attending</span>
                  {analytics && (
                    <Badge variant="secondary">{analytics.attending}</Badge>
                  )}
                </div>
              </SelectItem>
              <SelectItem value="declined">
                <div className="flex items-center justify-between w-full">
                  <span>Declined</span>
                  {analytics && (
                    <Badge variant="secondary">{analytics.declined}</Badge>
                  )}
                </div>
              </SelectItem>
              <SelectItem value="maybe">
                <div className="flex items-center justify-between w-full">
                  <span>Maybe</span>
                  {analytics && (
                    <Badge variant="secondary">{analytics.maybe}</Badge>
                  )}
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      ),
    },
    {
      title: 'Wedding Party Side',
      icon: HeartIcon,
      content: (
        <div className="space-y-3">
          <Select
            value={filters.side}
            onValueChange={(value) => handleFilterChange('side', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select side" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sides</SelectItem>
              <SelectItem value="partner1">
                <div className="flex items-center justify-between w-full">
                  <span>Partner 1</span>
                  {analytics && (
                    <Badge variant="secondary">{analytics.partner1_side}</Badge>
                  )}
                </div>
              </SelectItem>
              <SelectItem value="partner2">
                <div className="flex items-center justify-between w-full">
                  <span>Partner 2</span>
                  {analytics && (
                    <Badge variant="secondary">{analytics.partner2_side}</Badge>
                  )}
                </div>
              </SelectItem>
              <SelectItem value="mutual">
                <div className="flex items-center justify-between w-full">
                  <span>Mutual</span>
                  {analytics && (
                    <Badge variant="secondary">{analytics.mutual_side}</Badge>
                  )}
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      ),
    },
    {
      title: 'Age Group',
      icon: UsersIcon,
      content: (
        <div className="space-y-3">
          <Select
            value={filters.age_group}
            onValueChange={(value) => handleFilterChange('age_group', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select age group" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Ages</SelectItem>
              <SelectItem value="adult">
                <div className="flex items-center justify-between w-full">
                  <span>Adults</span>
                  {analytics && (
                    <Badge variant="secondary">{analytics.adults}</Badge>
                  )}
                </div>
              </SelectItem>
              <SelectItem value="child">
                <div className="flex items-center justify-between w-full">
                  <span>Children</span>
                  {analytics && (
                    <Badge variant="secondary">{analytics.children}</Badge>
                  )}
                </div>
              </SelectItem>
              <SelectItem value="infant">
                <div className="flex items-center justify-between w-full">
                  <span>Infants</span>
                  {analytics && (
                    <Badge variant="secondary">{analytics.infants}</Badge>
                  )}
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      ),
    },
  ];

  return (
    <Card className={cn('p-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <AdjustmentsHorizontalIcon className="w-5 h-5 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900">Filter Guests</h3>
          {activeFilterCount > 0 && (
            <Badge
              variant="secondary"
              className="bg-primary-100 text-primary-800"
            >
              {activeFilterCount} active
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="text-gray-600 hover:text-gray-900"
            >
              Clear all
            </Button>
          )}

          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose} className="p-2">
              <XMarkIcon className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Quick Search */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Search
        </label>
        <Input
          type="text"
          placeholder="Search by name, email, or phone..."
          value={filters.search}
          onChange={(e) => handleFilterChange('search', e.target.value)}
          className="w-full"
        />
      </div>

      <Separator className="my-6" />

      {/* Filter Sections */}
      <div className="space-y-6">
        {filterSections.map((section, index) => (
          <div key={section.title} className="space-y-3">
            <div className="flex items-center gap-2">
              <section.icon className="w-4 h-4 text-gray-400" />
              <label className="text-sm font-medium text-gray-700">
                {section.title}
              </label>
            </div>
            {section.content}
          </div>
        ))}
      </div>

      <Separator className="my-6" />

      {/* Special Filters */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <label className="text-sm font-medium text-gray-700">
              Dietary Restrictions
            </label>
            <p className="text-xs text-gray-500">
              {analytics &&
                `${analytics.with_dietary_restrictions} guests have dietary restrictions`}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant={
                filters.has_dietary_restrictions === false
                  ? 'default'
                  : 'outline'
              }
              size="sm"
              onClick={() =>
                handleFilterChange(
                  'has_dietary_restrictions',
                  filters.has_dietary_restrictions === false
                    ? undefined
                    : false,
                )
              }
            >
              No
            </Button>
            <Button
              variant={
                filters.has_dietary_restrictions === true
                  ? 'default'
                  : 'outline'
              }
              size="sm"
              onClick={() =>
                handleFilterChange(
                  'has_dietary_restrictions',
                  filters.has_dietary_restrictions === true ? undefined : true,
                )
              }
            >
              Yes
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <label className="text-sm font-medium text-gray-700">
              Plus Ones
            </label>
            <p className="text-xs text-gray-500">
              {analytics && `${analytics.with_plus_ones} guests have plus ones`}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant={filters.has_plus_one === false ? 'default' : 'outline'}
              size="sm"
              onClick={() =>
                handleFilterChange(
                  'has_plus_one',
                  filters.has_plus_one === false ? undefined : false,
                )
              }
            >
              No
            </Button>
            <Button
              variant={filters.has_plus_one === true ? 'default' : 'outline'}
              size="sm"
              onClick={() =>
                handleFilterChange(
                  'has_plus_one',
                  filters.has_plus_one === true ? undefined : true,
                )
              }
            >
              Yes
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <label className="text-sm font-medium text-gray-700">
              Group by Households
            </label>
            <p className="text-xs text-gray-500">
              {analytics && `${analytics.households} households total`}
            </p>
          </div>
          <Switch
            checked={filters.show_households}
            onCheckedChange={(checked) =>
              handleFilterChange('show_households', checked)
            }
          />
        </div>
      </div>

      {/* Analytics Summary */}
      {analytics && (
        <>
          <Separator className="my-6" />
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-3">
              Guest Summary
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Total Guests:</span>
                <span className="font-semibold ml-2">
                  {analytics.total_guests}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Confirmed:</span>
                <span className="font-semibold ml-2 text-green-600">
                  {analytics.attending}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Households:</span>
                <span className="font-semibold ml-2">
                  {analytics.households}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Avg/Household:</span>
                <span className="font-semibold ml-2">
                  {analytics.avg_household_size.toFixed(1)}
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}
