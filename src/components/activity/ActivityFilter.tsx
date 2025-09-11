'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Calendar, X, Filter, RotateCcw } from 'lucide-react';
import { ActivityFeed as ActivityFeedType } from '@/types/communications';

interface FilterState {
  entityTypes: string[];
  activityTypes: string[];
  dateRange: { start: Date | null; end: Date | null };
  readStatus: 'all' | 'read' | 'unread';
  actorTypes: string[];
}

interface ActivityFilterProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  activities: ActivityFeedType[];
}

const ENTITY_TYPE_LABELS = {
  client: 'Clients',
  vendor: 'Vendors',
  form: 'Forms',
  message: 'Messages',
  booking: 'Bookings',
  payment: 'Payments',
} as const;

const ACTOR_TYPE_LABELS = {
  client: 'Clients',
  vendor: 'Team Members',
  system: 'System',
} as const;

const READ_STATUS_OPTIONS = [
  { value: 'all', label: 'All Activities' },
  { value: 'unread', label: 'Unread Only' },
  { value: 'read', label: 'Read Only' },
] as const;

export function ActivityFilter({
  filters,
  onFiltersChange,
  activities,
}: ActivityFilterProps) {
  const [dateStartInput, setDateStartInput] = useState(
    filters.dateRange.start?.toISOString().split('T')[0] || '',
  );
  const [dateEndInput, setDateEndInput] = useState(
    filters.dateRange.end?.toISOString().split('T')[0] || '',
  );

  // Extract unique values from activities
  const availableFilters = useMemo(() => {
    const entityTypes = new Set<string>();
    const activityTypes = new Set<string>();
    const actorTypes = new Set<string>();

    activities.forEach((activity) => {
      entityTypes.add(activity.entity_type);
      activityTypes.add(activity.activity_type);
      actorTypes.add(activity.actor_type);
    });

    return {
      entityTypes: Array.from(entityTypes).sort(),
      activityTypes: Array.from(activityTypes).sort(),
      actorTypes: Array.from(actorTypes).sort(),
    };
  }, [activities]);

  const handleEntityTypeToggle = (entityType: string) => {
    const newEntityTypes = filters.entityTypes.includes(entityType)
      ? filters.entityTypes.filter((t) => t !== entityType)
      : [...filters.entityTypes, entityType];

    onFiltersChange({
      ...filters,
      entityTypes: newEntityTypes,
    });
  };

  const handleActivityTypeToggle = (activityType: string) => {
    const newActivityTypes = filters.activityTypes.includes(activityType)
      ? filters.activityTypes.filter((t) => t !== activityType)
      : [...filters.activityTypes, activityType];

    onFiltersChange({
      ...filters,
      activityTypes: newActivityTypes,
    });
  };

  const handleActorTypeToggle = (actorType: string) => {
    const newActorTypes = filters.actorTypes.includes(actorType)
      ? filters.actorTypes.filter((t) => t !== actorType)
      : [...filters.actorTypes, actorType];

    onFiltersChange({
      ...filters,
      actorTypes: newActorTypes,
    });
  };

  const handleReadStatusChange = (status: 'all' | 'read' | 'unread') => {
    onFiltersChange({
      ...filters,
      readStatus: status,
    });
  };

  const handleDateRangeChange = (field: 'start' | 'end', value: string) => {
    const date = value ? new Date(value) : null;

    if (field === 'start') {
      setDateStartInput(value);
    } else {
      setDateEndInput(value);
    }

    onFiltersChange({
      ...filters,
      dateRange: {
        ...filters.dateRange,
        [field]: date,
      },
    });
  };

  const clearAllFilters = () => {
    setDateStartInput('');
    setDateEndInput('');
    onFiltersChange({
      entityTypes: [],
      activityTypes: [],
      dateRange: { start: null, end: null },
      readStatus: 'all',
      actorTypes: [],
    });
  };

  const hasActiveFilters =
    filters.entityTypes.length > 0 ||
    filters.activityTypes.length > 0 ||
    filters.actorTypes.length > 0 ||
    filters.readStatus !== 'all' ||
    filters.dateRange.start ||
    filters.dateRange.end;

  const formatActivityTypeName = (type: string) => {
    return type
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <Card className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4" />
          <Label className="text-sm font-medium">Filters</Label>
        </div>

        {hasActiveFilters && (
          <Button
            size="sm"
            variant="outline"
            onClick={clearAllFilters}
            className="text-xs"
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            Clear All
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Entity Types */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Entity Types</Label>
          <div className="space-y-2">
            {availableFilters.entityTypes.map((entityType) => (
              <div key={entityType} className="flex items-center space-x-2">
                <Button
                  size="sm"
                  variant={
                    filters.entityTypes.includes(entityType)
                      ? 'default'
                      : 'outline'
                  }
                  onClick={() => handleEntityTypeToggle(entityType)}
                  className="h-8 text-xs justify-start w-full"
                >
                  {ENTITY_TYPE_LABELS[
                    entityType as keyof typeof ENTITY_TYPE_LABELS
                  ] || entityType}
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Activity Types */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Activity Types</Label>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {availableFilters.activityTypes.map((activityType) => (
              <div key={activityType} className="flex items-center space-x-2">
                <Button
                  size="sm"
                  variant={
                    filters.activityTypes.includes(activityType)
                      ? 'default'
                      : 'outline'
                  }
                  onClick={() => handleActivityTypeToggle(activityType)}
                  className="h-8 text-xs justify-start w-full"
                >
                  {formatActivityTypeName(activityType)}
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Actor Types */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Created By</Label>
          <div className="space-y-2">
            {availableFilters.actorTypes.map((actorType) => (
              <div key={actorType} className="flex items-center space-x-2">
                <Button
                  size="sm"
                  variant={
                    filters.actorTypes.includes(actorType)
                      ? 'default'
                      : 'outline'
                  }
                  onClick={() => handleActorTypeToggle(actorType)}
                  className="h-8 text-xs justify-start w-full"
                >
                  {ACTOR_TYPE_LABELS[
                    actorType as keyof typeof ACTOR_TYPE_LABELS
                  ] || actorType}
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Read Status & Date Range */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Status & Date</Label>

          {/* Read Status */}
          <div className="space-y-2">
            {READ_STATUS_OPTIONS.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <Button
                  size="sm"
                  variant={
                    filters.readStatus === option.value ? 'default' : 'outline'
                  }
                  onClick={() => handleReadStatusChange(option.value)}
                  className="h-8 text-xs justify-start w-full"
                >
                  {option.label}
                </Button>
              </div>
            ))}
          </div>

          <Separator />

          {/* Date Range */}
          <div className="space-y-2">
            <Label className="text-xs text-gray-600">Date Range</Label>
            <div className="space-y-2">
              <div>
                <Label htmlFor="start-date" className="text-xs text-gray-500">
                  From
                </Label>
                <Input
                  id="start-date"
                  type="date"
                  value={dateStartInput}
                  onChange={(e) =>
                    handleDateRangeChange('start', e.target.value)
                  }
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label htmlFor="end-date" className="text-xs text-gray-500">
                  To
                </Label>
                <Input
                  id="end-date"
                  type="date"
                  value={dateEndInput}
                  onChange={(e) => handleDateRangeChange('end', e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="pt-4 border-t">
          <Label className="text-sm font-medium mb-2 block">
            Active Filters:
          </Label>
          <div className="flex flex-wrap gap-2">
            {filters.entityTypes.map((type) => (
              <Badge
                key={`entity-${type}`}
                variant="secondary"
                className="text-xs"
              >
                {ENTITY_TYPE_LABELS[type as keyof typeof ENTITY_TYPE_LABELS] ||
                  type}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleEntityTypeToggle(type)}
                  className="h-auto p-0 ml-1"
                >
                  <X className="w-3 h-3" />
                </Button>
              </Badge>
            ))}

            {filters.activityTypes.map((type) => (
              <Badge
                key={`activity-${type}`}
                variant="secondary"
                className="text-xs"
              >
                {formatActivityTypeName(type)}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleActivityTypeToggle(type)}
                  className="h-auto p-0 ml-1"
                >
                  <X className="w-3 h-3" />
                </Button>
              </Badge>
            ))}

            {filters.actorTypes.map((type) => (
              <Badge
                key={`actor-${type}`}
                variant="secondary"
                className="text-xs"
              >
                {ACTOR_TYPE_LABELS[type as keyof typeof ACTOR_TYPE_LABELS] ||
                  type}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleActorTypeToggle(type)}
                  className="h-auto p-0 ml-1"
                >
                  <X className="w-3 h-3" />
                </Button>
              </Badge>
            ))}

            {filters.readStatus !== 'all' && (
              <Badge variant="secondary" className="text-xs">
                {
                  READ_STATUS_OPTIONS.find(
                    (o) => o.value === filters.readStatus,
                  )?.label
                }
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleReadStatusChange('all')}
                  className="h-auto p-0 ml-1"
                >
                  <X className="w-3 h-3" />
                </Button>
              </Badge>
            )}

            {(filters.dateRange.start || filters.dateRange.end) && (
              <Badge variant="secondary" className="text-xs">
                Date: {filters.dateRange.start?.toLocaleDateString() || '...'} -{' '}
                {filters.dateRange.end?.toLocaleDateString() || '...'}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setDateStartInput('');
                    setDateEndInput('');
                    onFiltersChange({
                      ...filters,
                      dateRange: { start: null, end: null },
                    });
                  }}
                  className="h-auto p-0 ml-1"
                >
                  <X className="w-3 h-3" />
                </Button>
              </Badge>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
