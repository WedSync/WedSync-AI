'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Filter,
  Search,
  Calendar as CalendarIcon,
  X,
  Save,
  Clock,
  User,
  MapPin,
  Heart,
  Tag,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface FilterState {
  search: string;
  status: string[];
  dateRange: {
    from: Date | undefined;
    to: Date | undefined;
  };
  responseTime: {
    min: number | undefined;
    max: number | undefined;
  };
  deviceType: string[];
  weddingDate: {
    from: Date | undefined;
    to: Date | undefined;
  };
  guestCount: {
    min: number | undefined;
    max: number | undefined;
  };
  budget: {
    min: number | undefined;
    max: number | undefined;
  };
  venue: string;
  tags: string[];
}

interface SavedFilter {
  id: string;
  name: string;
  filters: FilterState;
  createdAt: Date;
}

interface ResponseFiltersProps {
  onFiltersChange: (filters: FilterState) => void;
  initialFilters?: Partial<FilterState>;
}

const ResponseFilters: React.FC<ResponseFiltersProps> = ({
  onFiltersChange,
  initialFilters = {},
}) => {
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    status: [],
    dateRange: { from: undefined, to: undefined },
    responseTime: { min: undefined, max: undefined },
    deviceType: [],
    weddingDate: { from: undefined, to: undefined },
    guestCount: { min: undefined, max: undefined },
    budget: { min: undefined, max: undefined },
    venue: '',
    tags: [],
    ...initialFilters,
  });

  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [saveFilterName, setSaveFilterName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  // Wedding-specific status options
  const statusOptions = [
    {
      value: 'completed',
      label: 'Completed',
      color: 'bg-green-100 text-green-800',
    },
    {
      value: 'pending',
      label: 'Pending Review',
      color: 'bg-yellow-100 text-yellow-800',
    },
    {
      value: 'follow_up',
      label: 'Follow-up Required',
      color: 'bg-blue-100 text-blue-800',
    },
    {
      value: 'interested',
      label: 'Interested',
      color: 'bg-purple-100 text-purple-800',
    },
    {
      value: 'not_interested',
      label: 'Not Interested',
      color: 'bg-gray-100 text-gray-800',
    },
    { value: 'booked', label: 'Booked', color: 'bg-pink-100 text-pink-800' },
  ];

  const deviceOptions = [
    { value: 'mobile', label: 'Mobile' },
    { value: 'tablet', label: 'Tablet' },
    { value: 'desktop', label: 'Desktop' },
  ];

  const tagOptions = [
    'VIP',
    'Referral',
    'Social Media',
    'Wedding Show',
    'Venue Partner',
    'Luxury',
    'Budget-Conscious',
    'Last-Minute',
    'Destination Wedding',
    'Elopement',
    'Traditional',
    'Modern',
    'Rustic',
    'Garden Party',
  ];

  // Update filters and notify parent
  const updateFilters = (newFilters: Partial<FilterState>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    onFiltersChange(updatedFilters);
  };

  // Clear all filters
  const clearFilters = () => {
    const clearedFilters: FilterState = {
      search: '',
      status: [],
      dateRange: { from: undefined, to: undefined },
      responseTime: { min: undefined, max: undefined },
      deviceType: [],
      weddingDate: { from: undefined, to: undefined },
      guestCount: { min: undefined, max: undefined },
      budget: { min: undefined, max: undefined },
      venue: '',
      tags: [],
    };
    setFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  };

  // Save current filter set
  const saveFilters = () => {
    if (!saveFilterName.trim()) return;

    const newFilter: SavedFilter = {
      id: Date.now().toString(),
      name: saveFilterName,
      filters: { ...filters },
      createdAt: new Date(),
    };

    const updated = [...savedFilters, newFilter];
    setSavedFilters(updated);
    localStorage.setItem('response-filters', JSON.stringify(updated));
    setSaveFilterName('');
    setShowSaveDialog(false);
  };

  // Load saved filter
  const loadFilter = (savedFilter: SavedFilter) => {
    setFilters(savedFilter.filters);
    onFiltersChange(savedFilter.filters);
  };

  // Delete saved filter
  const deleteFilter = (filterId: string) => {
    const updated = savedFilters.filter((f) => f.id !== filterId);
    setSavedFilters(updated);
    localStorage.setItem('response-filters', JSON.stringify(updated));
  };

  // Load saved filters on mount
  useEffect(() => {
    const saved = localStorage.getItem('response-filters');
    if (saved) {
      try {
        setSavedFilters(JSON.parse(saved));
      } catch (error) {
        console.error('Failed to load saved filters:', error);
      }
    }
  }, []);

  // Count active filters
  const activeFilterCount = [
    filters.search && 1,
    filters.status.length,
    (filters.dateRange.from || filters.dateRange.to) && 1,
    (filters.responseTime.min || filters.responseTime.max) && 1,
    filters.deviceType.length,
    (filters.weddingDate.from || filters.weddingDate.to) && 1,
    (filters.guestCount.min || filters.guestCount.max) && 1,
    (filters.budget.min || filters.budget.max) && 1,
    filters.venue && 1,
    filters.tags.length,
  ].filter(Boolean).length;

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Advanced Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFilterCount} active
              </Badge>
            )}
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'Collapse' : 'Expand'}
            </Button>
            {activeFilterCount > 0 && (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Clear All
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Quick Search */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search responses, names, emails, or wedding details..."
            value={filters.search}
            onChange={(e) => updateFilters({ search: e.target.value })}
            className="pl-10"
          />
        </div>

        {/* Status Filter */}
        <div className="flex flex-wrap gap-2">
          <Label className="text-sm font-medium">Status:</Label>
          {statusOptions.map((option) => (
            <Badge
              key={option.value}
              variant={
                filters.status.includes(option.value) ? 'default' : 'outline'
              }
              className={cn(
                'cursor-pointer',
                filters.status.includes(option.value) && option.color,
              )}
              onClick={() => {
                const newStatus = filters.status.includes(option.value)
                  ? filters.status.filter((s) => s !== option.value)
                  : [...filters.status, option.value];
                updateFilters({ status: newStatus });
              }}
            >
              {option.label}
            </Badge>
          ))}
        </div>

        {/* Expanded Filters */}
        {isExpanded && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t">
              {/* Submission Date Range */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <CalendarIcon className="h-4 w-4" />
                  Submission Date
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !filters.dateRange.from && 'text-muted-foreground',
                      )}
                    >
                      {filters.dateRange.from ? (
                        filters.dateRange.to ? (
                          <>
                            {format(filters.dateRange.from, 'LLL dd, y')} -{' '}
                            {format(filters.dateRange.to, 'LLL dd, y')}
                          </>
                        ) : (
                          format(filters.dateRange.from, 'LLL dd, y')
                        )
                      ) : (
                        'Pick a date range'
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={filters.dateRange.from}
                      selected={filters.dateRange}
                      onSelect={(range) =>
                        updateFilters({
                          dateRange: range || {
                            from: undefined,
                            to: undefined,
                          },
                        })
                      }
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Response Time */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  Response Time (seconds)
                </Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={filters.responseTime.min || ''}
                    onChange={(e) =>
                      updateFilters({
                        responseTime: {
                          ...filters.responseTime,
                          min: e.target.value
                            ? parseInt(e.target.value)
                            : undefined,
                        },
                      })
                    }
                  />
                  <Input
                    type="number"
                    placeholder="Max"
                    value={filters.responseTime.max || ''}
                    onChange={(e) =>
                      updateFilters({
                        responseTime: {
                          ...filters.responseTime,
                          max: e.target.value
                            ? parseInt(e.target.value)
                            : undefined,
                        },
                      })
                    }
                  />
                </div>
              </div>

              {/* Device Type */}
              <div className="space-y-2">
                <Label>Device Type</Label>
                <div className="flex flex-wrap gap-2">
                  {deviceOptions.map((device) => (
                    <Badge
                      key={device.value}
                      variant={
                        filters.deviceType.includes(device.value)
                          ? 'default'
                          : 'outline'
                      }
                      className="cursor-pointer"
                      onClick={() => {
                        const newDevices = filters.deviceType.includes(
                          device.value,
                        )
                          ? filters.deviceType.filter((d) => d !== device.value)
                          : [...filters.deviceType, device.value];
                        updateFilters({ deviceType: newDevices });
                      }}
                    >
                      {device.label}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Wedding Date Range */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Heart className="h-4 w-4" />
                  Wedding Date
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !filters.weddingDate.from && 'text-muted-foreground',
                      )}
                    >
                      {filters.weddingDate.from ? (
                        filters.weddingDate.to ? (
                          <>
                            {format(filters.weddingDate.from, 'LLL dd, y')} -{' '}
                            {format(filters.weddingDate.to, 'LLL dd, y')}
                          </>
                        ) : (
                          format(filters.weddingDate.from, 'LLL dd, y')
                        )
                      ) : (
                        'Wedding date range'
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={filters.weddingDate.from}
                      selected={filters.weddingDate}
                      onSelect={(range) =>
                        updateFilters({
                          weddingDate: range || {
                            from: undefined,
                            to: undefined,
                          },
                        })
                      }
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Guest Count */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  Guest Count
                </Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={filters.guestCount.min || ''}
                    onChange={(e) =>
                      updateFilters({
                        guestCount: {
                          ...filters.guestCount,
                          min: e.target.value
                            ? parseInt(e.target.value)
                            : undefined,
                        },
                      })
                    }
                  />
                  <Input
                    type="number"
                    placeholder="Max"
                    value={filters.guestCount.max || ''}
                    onChange={(e) =>
                      updateFilters({
                        guestCount: {
                          ...filters.guestCount,
                          max: e.target.value
                            ? parseInt(e.target.value)
                            : undefined,
                        },
                      })
                    }
                  />
                </div>
              </div>

              {/* Budget Range */}
              <div className="space-y-2">
                <Label>Budget Range ($)</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={filters.budget.min || ''}
                    onChange={(e) =>
                      updateFilters({
                        budget: {
                          ...filters.budget,
                          min: e.target.value
                            ? parseInt(e.target.value)
                            : undefined,
                        },
                      })
                    }
                  />
                  <Input
                    type="number"
                    placeholder="Max"
                    value={filters.budget.max || ''}
                    onChange={(e) =>
                      updateFilters({
                        budget: {
                          ...filters.budget,
                          max: e.target.value
                            ? parseInt(e.target.value)
                            : undefined,
                        },
                      })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Venue Filter */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                Venue or Location
              </Label>
              <Input
                placeholder="Search by venue name or location..."
                value={filters.venue}
                onChange={(e) => updateFilters({ venue: e.target.value })}
              />
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Tag className="h-4 w-4" />
                Tags
              </Label>
              <div className="flex flex-wrap gap-2">
                {tagOptions.map((tag) => (
                  <Badge
                    key={tag}
                    variant={filters.tags.includes(tag) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => {
                      const newTags = filters.tags.includes(tag)
                        ? filters.tags.filter((t) => t !== tag)
                        : [...filters.tags, tag];
                      updateFilters({ tags: newTags });
                    }}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Saved Filters */}
        {isExpanded && (
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between mb-3">
              <Label>Saved Filter Sets</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSaveDialog(!showSaveDialog)}
              >
                <Save className="h-4 w-4 mr-1" />
                Save Current
              </Button>
            </div>

            {showSaveDialog && (
              <div className="flex gap-2 mb-3">
                <Input
                  placeholder="Filter set name..."
                  value={saveFilterName}
                  onChange={(e) => setSaveFilterName(e.target.value)}
                />
                <Button onClick={saveFilters} disabled={!saveFilterName.trim()}>
                  Save
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowSaveDialog(false)}
                >
                  Cancel
                </Button>
              </div>
            )}

            {savedFilters.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {savedFilters.map((savedFilter) => (
                  <div key={savedFilter.id} className="flex items-center gap-1">
                    <Badge
                      variant="outline"
                      className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                      onClick={() => loadFilter(savedFilter)}
                    >
                      {savedFilter.name}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteFilter(savedFilter.id)}
                      className="h-5 w-5 p-0 hover:bg-destructive hover:text-destructive-foreground"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ResponseFilters;
