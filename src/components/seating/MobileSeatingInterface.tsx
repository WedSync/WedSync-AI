'use client';

import React, { useState, useMemo } from 'react';
import { type Guest, type Table } from '@/types/seating';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Users,
  Plus,
  Minus,
  Search,
  Filter,
  ArrowRight,
  AlertTriangle,
  CheckCircle,
  Clock,
  Crown,
  Heart,
  Star,
  Utensils,
  Wheelchair,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileSeatingInterfaceProps {
  guests: Guest[];
  tables: Table[];
  onGuestAssign: (guestId: string, tableId: string) => void;
  onGuestUnassign: (guestId: string) => void;
  onTableAdd: () => void;
  conflicts?: number;
  readonly?: boolean;
  className?: string;
}

type ViewMode = 'guests' | 'tables' | 'assignments';

const priorityIcons = {
  vip: Crown,
  family: Heart,
  wedding_party: Star,
  friend: Users,
};

export function MobileSeatingInterface({
  guests,
  tables,
  onGuestAssign,
  onGuestUnassign,
  onTableAdd,
  conflicts = 0,
  readonly = false,
  className,
}: MobileSeatingInterfaceProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('guests');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBy, setFilterBy] = useState<'all' | 'assigned' | 'unassigned'>(
    'all',
  );
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);
  const [showAssignDialog, setShowAssignDialog] = useState(false);

  // Statistics
  const stats = useMemo(() => {
    const assigned = guests.filter((g) => g.assignedTableId).length;
    const unassigned = guests.length - assigned;
    const totalCapacity = tables.reduce(
      (sum, table) => sum + table.capacity,
      0,
    );
    const utilization =
      totalCapacity > 0 ? (assigned / totalCapacity) * 100 : 0;

    return { assigned, unassigned, totalCapacity, utilization };
  }, [guests, tables]);

  // Filtered guests
  const filteredGuests = useMemo(() => {
    let filtered = [...guests];

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (guest) =>
          guest.name.toLowerCase().includes(query) ||
          guest.notes?.toLowerCase().includes(query),
      );
    }

    // Apply filter
    switch (filterBy) {
      case 'assigned':
        filtered = filtered.filter((g) => g.assignedTableId);
        break;
      case 'unassigned':
        filtered = filtered.filter((g) => !g.assignedTableId);
        break;
    }

    return filtered;
  }, [guests, searchQuery, filterBy]);

  // Get table guests
  const getTableGuests = (tableId: string) => {
    return guests.filter((g) => g.assignedTableId === tableId);
  };

  // Get available tables for assignment
  const getAvailableTables = (guestId?: string) => {
    return tables.filter((table) => {
      const currentGuests = getTableGuests(table.id);
      const isCurrentGuestAssigned = guestId
        ? currentGuests.some((g) => g.id === guestId)
        : false;
      return isCurrentGuestAssigned || currentGuests.length < table.capacity;
    });
  };

  // Handle guest assignment
  const handleGuestAssign = (guestId: string, tableId: string) => {
    onGuestAssign(guestId, tableId);
    setSelectedGuestId(null);
    setShowAssignDialog(false);
  };

  // Status indicator
  const getStatusInfo = () => {
    if (conflicts > 0) {
      return {
        icon: AlertTriangle,
        color: 'text-red-600',
        text: `${conflicts} conflicts`,
      };
    }
    if (stats.assigned === guests.length) {
      return { icon: CheckCircle, color: 'text-green-600', text: 'Complete' };
    }
    if (stats.assigned > 0) {
      return { icon: Clock, color: 'text-yellow-600', text: 'In progress' };
    }
    return { icon: Clock, color: 'text-slate-600', text: 'Not started' };
  };

  const statusInfo = getStatusInfo();

  return (
    <div className={cn('flex flex-col h-full bg-white', className)}>
      {/* Header with stats and status */}
      <div className="flex-shrink-0 p-4 border-b bg-slate-50">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Seating Arrangements</h2>
          <div className="flex items-center gap-2">
            <statusInfo.icon className={cn('h-5 w-5', statusInfo.color)} />
            <span className={cn('text-sm font-medium', statusInfo.color)}>
              {statusInfo.text}
            </span>
          </div>
        </div>

        {/* Progress stats */}
        <div className="grid grid-cols-3 gap-4 mb-3">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {stats.assigned}
            </div>
            <div className="text-xs text-slate-600">Assigned</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-600">
              {stats.unassigned}
            </div>
            <div className="text-xs text-slate-600">Unassigned</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {tables.length}
            </div>
            <div className="text-xs text-slate-600">Tables</div>
          </div>
        </div>

        {/* View mode tabs */}
        <div className="flex rounded-lg bg-white p-1 shadow-sm">
          <button
            onClick={() => setViewMode('guests')}
            className={cn(
              'flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors',
              viewMode === 'guests'
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 hover:text-slate-900',
            )}
          >
            Guests ({filteredGuests.length})
          </button>
          <button
            onClick={() => setViewMode('tables')}
            className={cn(
              'flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors',
              viewMode === 'tables'
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 hover:text-slate-900',
            )}
          >
            Tables ({tables.length})
          </button>
          <button
            onClick={() => setViewMode('assignments')}
            className={cn(
              'flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors',
              viewMode === 'assignments'
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 hover:text-slate-900',
            )}
          >
            Assignments
          </button>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto">
        {viewMode === 'guests' && (
          <div className="p-4">
            {/* Search and filter */}
            <div className="space-y-3 mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search guests..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 text-base" // Prevent zoom on iOS
                />
              </div>

              <Select
                value={filterBy}
                onValueChange={(value: typeof filterBy) => setFilterBy(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    All guests ({guests.length})
                  </SelectItem>
                  <SelectItem value="assigned">
                    Assigned ({stats.assigned})
                  </SelectItem>
                  <SelectItem value="unassigned">
                    Unassigned ({stats.unassigned})
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Guest list */}
            <div className="space-y-2">
              {filteredGuests.map((guest) => {
                const PriorityIcon = guest.priority
                  ? priorityIcons[guest.priority]
                  : null;
                const assignedTable = guest.assignedTableId
                  ? tables.find((t) => t.id === guest.assignedTableId)
                  : null;

                return (
                  <div
                    key={guest.id}
                    className="flex items-center justify-between p-3 border rounded-lg bg-white shadow-sm"
                  >
                    <div className="flex-1 min-w-0 mr-3">
                      <div className="flex items-center gap-2 mb-1">
                        {PriorityIcon && (
                          <PriorityIcon className="h-4 w-4 text-blue-600 flex-shrink-0" />
                        )}
                        <span className="font-medium truncate">
                          {guest.name}
                        </span>

                        {/* Requirement indicators */}
                        <div className="flex gap-1 flex-shrink-0">
                          {guest.dietaryRequirements &&
                            guest.dietaryRequirements.length > 0 && (
                              <Utensils className="h-3 w-3 text-orange-500" />
                            )}
                          {guest.accessibilityRequirements &&
                            guest.accessibilityRequirements.length > 0 && (
                              <Wheelchair className="h-3 w-3 text-blue-500" />
                            )}
                          {guest.conflictsWith &&
                            guest.conflictsWith.length > 0 && (
                              <AlertTriangle className="h-3 w-3 text-red-500" />
                            )}
                        </div>
                      </div>

                      {/* Assignment status */}
                      {assignedTable ? (
                        <div className="flex items-center gap-1">
                          <Badge variant="secondary" className="text-xs">
                            {assignedTable.name}
                          </Badge>
                          <span className="text-xs text-slate-500">
                            ({getTableGuests(assignedTable.id).length}/
                            {assignedTable.capacity})
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500">
                          Not assigned
                        </span>
                      )}
                    </div>

                    {/* Action button */}
                    {!readonly && (
                      <div className="flex-shrink-0">
                        {assignedTable ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onGuestUnassign(guest.id)}
                            className="h-8 px-3"
                          >
                            <Minus className="h-3 w-3 mr-1" />
                            Remove
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedGuestId(guest.id);
                              setShowAssignDialog(true);
                            }}
                            className="h-8 px-3"
                            disabled={getAvailableTables().length === 0}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Assign
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {filteredGuests.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  <Users className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                  <div>No guests found</div>
                  {searchQuery && (
                    <div className="text-sm mt-1">
                      Try adjusting your search
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {viewMode === 'tables' && (
          <div className="p-4">
            {/* Add table button */}
            {!readonly && (
              <Button
                onClick={onTableAdd}
                className="w-full mb-4 h-12 text-base"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New Table
              </Button>
            )}

            {/* Table list */}
            <div className="space-y-3">
              {tables.map((table) => {
                const tableGuests = getTableGuests(table.id);
                const utilizationPercent =
                  (tableGuests.length / table.capacity) * 100;

                return (
                  <div
                    key={table.id}
                    className="border rounded-lg p-4 bg-white shadow-sm"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-base">
                          {table.name}
                        </h3>
                        <div className="text-sm text-slate-600">
                          {table.shape} table • {tableGuests.length}/
                          {table.capacity} guests
                        </div>
                      </div>

                      <div className="text-right">
                        <div
                          className={cn(
                            'text-sm font-medium',
                            utilizationPercent > 100
                              ? 'text-red-600'
                              : utilizationPercent === 100
                                ? 'text-green-600'
                                : utilizationPercent > 75
                                  ? 'text-yellow-600'
                                  : 'text-slate-600',
                          )}
                        >
                          {Math.round(utilizationPercent)}%
                        </div>
                        <div className="text-xs text-slate-500">capacity</div>
                      </div>
                    </div>

                    {/* Guest chips */}
                    {tableGuests.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs font-medium text-slate-700 mb-2">
                          Assigned Guests:
                        </div>
                        <div className="space-y-1">
                          {tableGuests.map((guest) => {
                            const PriorityIcon = guest.priority
                              ? priorityIcons[guest.priority]
                              : null;

                            return (
                              <div
                                key={guest.id}
                                className="flex items-center justify-between p-2 bg-slate-50 rounded-md"
                              >
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  {PriorityIcon && (
                                    <PriorityIcon className="h-3 w-3 text-blue-600 flex-shrink-0" />
                                  )}
                                  <span className="text-sm truncate">
                                    {guest.name}
                                  </span>

                                  <div className="flex gap-1 flex-shrink-0">
                                    {guest.dietaryRequirements &&
                                      guest.dietaryRequirements.length > 0 && (
                                        <Utensils className="h-2.5 w-2.5 text-orange-500" />
                                      )}
                                    {guest.accessibilityRequirements &&
                                      guest.accessibilityRequirements.length >
                                        0 && (
                                        <Wheelchair className="h-2.5 w-2.5 text-blue-500" />
                                      )}
                                    {guest.conflictsWith &&
                                      guest.conflictsWith.length > 0 && (
                                        <AlertTriangle className="h-2.5 w-2.5 text-red-500" />
                                      )}
                                  </div>
                                </div>

                                {!readonly && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => onGuestUnassign(guest.id)}
                                    className="h-6 w-6 p-0 text-red-600 hover:bg-red-50 flex-shrink-0"
                                  >
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {tableGuests.length === 0 && (
                      <div className="text-center py-4 text-slate-400">
                        <Users className="h-6 w-6 mx-auto mb-1" />
                        <div className="text-sm">No guests assigned</div>
                      </div>
                    )}
                  </div>
                );
              })}

              {tables.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  <Users className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                  <div>No tables created yet</div>
                  {!readonly && (
                    <div className="text-sm mt-1">
                      Add your first table to get started
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {viewMode === 'assignments' && (
          <div className="p-4">
            <div className="text-sm text-slate-600 mb-4">
              Quick assignment overview for all tables and guests
            </div>

            <div className="space-y-4">
              {tables.map((table) => {
                const tableGuests = getTableGuests(table.id);

                return (
                  <div
                    key={table.id}
                    className="border rounded-lg p-3 bg-white shadow-sm"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">{table.name}</h3>
                      <Badge
                        variant={
                          tableGuests.length === table.capacity
                            ? 'default'
                            : 'secondary'
                        }
                      >
                        {tableGuests.length}/{table.capacity}
                      </Badge>
                    </div>

                    {tableGuests.length > 0 ? (
                      <div className="text-sm text-slate-600">
                        {tableGuests.map((g) => g.name).join(', ')}
                      </div>
                    ) : (
                      <div className="text-sm text-slate-400 italic">
                        Empty table
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Assignment Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Guest to Table</DialogTitle>
            <DialogDescription>
              Choose a table for{' '}
              {selectedGuestId
                ? guests.find((g) => g.id === selectedGuestId)?.name
                : 'this guest'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {getAvailableTables(selectedGuestId).map((table) => {
              const tableGuests = getTableGuests(table.id);
              const wouldBeAtCapacity = tableGuests.length >= table.capacity;
              const isCurrentlyAssigned =
                selectedGuestId &&
                tableGuests.some((g) => g.id === selectedGuestId);

              return (
                <button
                  key={table.id}
                  onClick={() =>
                    selectedGuestId &&
                    handleGuestAssign(selectedGuestId, table.id)
                  }
                  className="w-full p-3 text-left border rounded-lg hover:bg-slate-50 transition-colors"
                  disabled={wouldBeAtCapacity && !isCurrentlyAssigned}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{table.name}</div>
                      <div className="text-sm text-slate-600">
                        {table.shape} table • {tableGuests.length}/
                        {table.capacity} guests
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-400" />
                  </div>
                </button>
              );
            })}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAssignDialog(false)}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
