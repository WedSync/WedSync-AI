'use client';

import React, { useState, useMemo } from 'react';
import { type Guest } from '@/types/seating';
import { GuestChip } from './GuestChip';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Search,
  Filter,
  Users,
  UserCheck,
  UserX,
  ChevronDown,
  ChevronRight,
  SortAsc,
  SortDesc,
  Crown,
  Heart,
  Star,
  Utensils,
  Wheelchair,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface GuestListProps {
  guests: Guest[];
  onGuestSelect?: (guest: Guest) => void;
  selectedGuestIds?: string[];
  showAssignedCount?: boolean;
  showFilters?: boolean;
  showSearch?: boolean;
  showGrouping?: boolean;
  compact?: boolean;
  readonly?: boolean;
  className?: string;
}

type SortOption = 'name' | 'priority' | 'assigned' | 'requirements';
type FilterOption =
  | 'all'
  | 'assigned'
  | 'unassigned'
  | 'vip'
  | 'dietary'
  | 'accessibility'
  | 'conflicts';
type GroupOption = 'none' | 'priority' | 'assigned' | 'requirements';

const priorityLabels = {
  vip: 'VIP',
  family: 'Family',
  wedding_party: 'Wedding Party',
  friend: 'Friend',
};

const priorityIcons = {
  vip: Crown,
  family: Heart,
  wedding_party: Star,
  friend: Users,
};

export function GuestList({
  guests,
  onGuestSelect,
  selectedGuestIds = [],
  showAssignedCount = true,
  showFilters = true,
  showSearch = true,
  showGrouping = true,
  compact = false,
  readonly = false,
  className,
}: GuestListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [groupBy, setGroupBy] = useState<GroupOption>('none');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Filter and sort guests
  const processedGuests = useMemo(() => {
    let filtered = [...guests];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (guest) =>
          guest.name.toLowerCase().includes(query) ||
          guest.notes?.toLowerCase().includes(query) ||
          guest.dietaryRequirements?.some((req) =>
            req.toLowerCase().includes(query),
          ) ||
          guest.accessibilityRequirements?.some((req) =>
            req.toLowerCase().includes(query),
          ),
      );
    }

    // Apply category filter
    switch (filterBy) {
      case 'assigned':
        filtered = filtered.filter((guest) => guest.assignedTableId);
        break;
      case 'unassigned':
        filtered = filtered.filter((guest) => !guest.assignedTableId);
        break;
      case 'vip':
        filtered = filtered.filter((guest) => guest.priority === 'vip');
        break;
      case 'dietary':
        filtered = filtered.filter(
          (guest) =>
            guest.dietaryRequirements && guest.dietaryRequirements.length > 0,
        );
        break;
      case 'accessibility':
        filtered = filtered.filter(
          (guest) =>
            guest.accessibilityRequirements &&
            guest.accessibilityRequirements.length > 0,
        );
        break;
      case 'conflicts':
        filtered = filtered.filter(
          (guest) => guest.conflictsWith && guest.conflictsWith.length > 0,
        );
        break;
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'priority':
          const priorityOrder = {
            vip: 0,
            family: 1,
            wedding_party: 2,
            friend: 3,
          };
          const aPriority = a.priority ? priorityOrder[a.priority] : 999;
          const bPriority = b.priority ? priorityOrder[b.priority] : 999;
          comparison = aPriority - bPriority;
          break;
        case 'assigned':
          const aAssigned = a.assignedTableId ? 1 : 0;
          const bAssigned = b.assignedTableId ? 1 : 0;
          comparison = bAssigned - aAssigned; // Assigned first
          break;
        case 'requirements':
          const aReqs =
            (a.dietaryRequirements?.length || 0) +
            (a.accessibilityRequirements?.length || 0);
          const bReqs =
            (b.dietaryRequirements?.length || 0) +
            (b.accessibilityRequirements?.length || 0);
          comparison = bReqs - aReqs; // More requirements first
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [guests, searchQuery, sortBy, sortDirection, filterBy]);

  // Group guests
  const groupedGuests = useMemo(() => {
    if (groupBy === 'none') {
      return { 'All Guests': processedGuests };
    }

    const groups: Record<string, Guest[]> = {};

    processedGuests.forEach((guest) => {
      let groupKey = 'Other';

      switch (groupBy) {
        case 'priority':
          groupKey = guest.priority
            ? priorityLabels[guest.priority]
            : 'No Priority';
          break;
        case 'assigned':
          groupKey = guest.assignedTableId ? 'Assigned' : 'Unassigned';
          break;
        case 'requirements':
          if (
            guest.dietaryRequirements &&
            guest.dietaryRequirements.length > 0
          ) {
            groupKey = 'Dietary Requirements';
          } else if (
            guest.accessibilityRequirements &&
            guest.accessibilityRequirements.length > 0
          ) {
            groupKey = 'Accessibility Requirements';
          } else {
            groupKey = 'No Special Requirements';
          }
          break;
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(guest);
    });

    return groups;
  }, [processedGuests, groupBy]);

  // Statistics
  const stats = useMemo(() => {
    const assigned = guests.filter((g) => g.assignedTableId).length;
    const unassigned = guests.length - assigned;
    const vip = guests.filter((g) => g.priority === 'vip').length;
    const dietary = guests.filter(
      (g) => g.dietaryRequirements && g.dietaryRequirements.length > 0,
    ).length;
    const accessibility = guests.filter(
      (g) =>
        g.accessibilityRequirements && g.accessibilityRequirements.length > 0,
    ).length;
    const conflicts = guests.filter(
      (g) => g.conflictsWith && g.conflictsWith.length > 0,
    ).length;

    return { assigned, unassigned, vip, dietary, accessibility, conflicts };
  }, [guests]);

  const toggleGroup = (groupKey: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupKey)) {
      newExpanded.delete(groupKey);
    } else {
      newExpanded.add(groupKey);
    }
    setExpandedGroups(newExpanded);
  };

  const toggleSort = (option: SortOption) => {
    if (sortBy === option) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(option);
      setSortDirection('asc');
    }
  };

  return (
    <div
      className={cn(
        'flex flex-col h-full bg-white border rounded-lg',
        className,
      )}
    >
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Guest List</h3>
          {showAssignedCount && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <UserCheck className="h-4 w-4 text-green-600" />
              <span>{stats.assigned}</span>
              <UserX className="h-4 w-4 text-slate-400" />
              <span>{stats.unassigned}</span>
            </div>
          )}
        </div>

        {/* Search */}
        {showSearch && (
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search guests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        )}

        {/* Filter and Sort Controls */}
        {showFilters && (
          <div className="grid grid-cols-2 gap-2 mb-3">
            <Select
              value={filterBy}
              onValueChange={(value: FilterOption) => setFilterBy(value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All ({guests.length})</SelectItem>
                <SelectItem value="assigned">
                  Assigned ({stats.assigned})
                </SelectItem>
                <SelectItem value="unassigned">
                  Unassigned ({stats.unassigned})
                </SelectItem>
                <SelectItem value="vip">VIP ({stats.vip})</SelectItem>
                <SelectItem value="dietary">
                  Dietary ({stats.dietary})
                </SelectItem>
                <SelectItem value="accessibility">
                  Accessibility ({stats.accessibility})
                </SelectItem>
                <SelectItem value="conflicts">
                  Conflicts ({stats.conflicts})
                </SelectItem>
              </SelectContent>
            </Select>

            <div className="flex gap-1">
              <Select
                value={sortBy}
                onValueChange={(value: SortOption) => setSortBy(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="priority">Priority</SelectItem>
                  <SelectItem value="assigned">Assignment</SelectItem>
                  <SelectItem value="requirements">Requirements</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleSort(sortBy)}
                className="px-2"
              >
                {sortDirection === 'asc' ? (
                  <SortAsc className="h-4 w-4" />
                ) : (
                  <SortDesc className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Grouping */}
        {showGrouping && (
          <Select
            value={groupBy}
            onValueChange={(value: GroupOption) => setGroupBy(value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Group by..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No grouping</SelectItem>
              <SelectItem value="priority">By priority</SelectItem>
              <SelectItem value="assigned">By assignment</SelectItem>
              <SelectItem value="requirements">By requirements</SelectItem>
            </SelectContent>
          </Select>
        )}

        {/* Stats badges */}
        {!compact && (
          <div className="flex flex-wrap gap-1 mt-3">
            <Badge variant="outline" className="text-xs">
              <Crown className="h-3 w-3 mr-1 text-yellow-600" />
              {stats.vip}
            </Badge>
            <Badge variant="outline" className="text-xs">
              <Utensils className="h-3 w-3 mr-1 text-orange-600" />
              {stats.dietary}
            </Badge>
            <Badge variant="outline" className="text-xs">
              <Wheelchair className="h-3 w-3 mr-1 text-blue-600" />
              {stats.accessibility}
            </Badge>
            {stats.conflicts > 0 && (
              <Badge variant="outline" className="text-xs">
                <AlertTriangle className="h-3 w-3 mr-1 text-red-600" />
                {stats.conflicts}
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Guest List */}
      <div className="flex-1 overflow-y-auto p-4">
        {Object.entries(groupedGuests).length === 0 ? (
          <div className="text-center text-slate-500 py-8">
            <Users className="h-8 w-8 mx-auto mb-2 text-slate-300" />
            <div className="text-sm">No guests found</div>
            {searchQuery && (
              <div className="text-xs mt-1">
                Try adjusting your search or filters
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedGuests).map(([groupKey, groupGuests]) => {
              const isExpanded =
                expandedGroups.has(groupKey) || groupBy === 'none';

              return (
                <div key={groupKey}>
                  {groupBy !== 'none' && (
                    <Collapsible
                      open={isExpanded}
                      onOpenChange={() => toggleGroup(groupKey)}
                    >
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-between p-2 h-auto"
                        >
                          <div className="flex items-center gap-2">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                            <span className="font-medium">{groupKey}</span>
                            <Badge variant="secondary" className="text-xs">
                              {groupGuests.length}
                            </Badge>
                          </div>
                        </Button>
                      </CollapsibleTrigger>

                      <CollapsibleContent className="mt-2">
                        <div className="space-y-2 ml-6">
                          {groupGuests.map((guest) => (
                            <GuestChip
                              key={guest.id}
                              guest={guest}
                              size={compact ? 'sm' : 'md'}
                              variant="detailed"
                              isSelected={selectedGuestIds.includes(guest.id)}
                              isDraggable={!readonly}
                              onClick={() => onGuestSelect?.(guest)}
                              showRequirements
                              showConflicts
                            />
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  )}

                  {groupBy === 'none' && (
                    <div className="space-y-2">
                      {groupGuests.map((guest) => (
                        <GuestChip
                          key={guest.id}
                          guest={guest}
                          size={compact ? 'sm' : 'md'}
                          variant="detailed"
                          isSelected={selectedGuestIds.includes(guest.id)}
                          isDraggable={!readonly}
                          onClick={() => onGuestSelect?.(guest)}
                          showRequirements
                          showConflicts
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer with summary */}
      {!compact && processedGuests.length > 0 && (
        <div className="flex-shrink-0 p-4 border-t bg-slate-50 text-xs text-slate-600">
          Showing {processedGuests.length} of {guests.length} guests
          {searchQuery && ` matching "${searchQuery}"`}
        </div>
      )}
    </div>
  );
}
