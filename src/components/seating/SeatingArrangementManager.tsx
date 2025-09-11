'use client';

import React, {
  useState,
  useMemo,
  useCallback,
  useOptimistic,
  useTransition,
} from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
  KeyboardSensor,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { restrictToWindowEdges } from '@dnd-kit/modifiers';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { TableLayout } from './TableLayout';
import { GuestList } from './GuestList';
import { SeatingControls } from './SeatingControls';
import { ConflictAlert } from './ConflictAlert';

interface Guest {
  id: string;
  name: string;
  email: string;
  dietaryRequirements?: string[];
  plusOne?: boolean;
  tableId?: string;
  seatNumber?: number;
  accessibilityNeeds?: string[];
}

interface Table {
  id: string;
  name: string;
  capacity: number;
  shape: 'round' | 'rectangle' | 'long-rectangle';
  x: number;
  y: number;
  rotation: number;
  guests: Guest[];
  isVip?: boolean;
}

interface SeatingUpdate {
  type: 'MOVE_GUEST' | 'REMOVE_GUEST' | 'ADD_TABLE' | 'REMOVE_TABLE';
  guestId?: string;
  fromTableId?: string;
  toTableId?: string;
  toSeatNumber?: number;
  tableId?: string;
}

interface SeatingArrangementManagerProps {
  guests: Guest[];
  tables: Table[];
  onUpdateArrangement: (tables: Table[], guests: Guest[]) => void;
  className?: string;
  weddingId: string;
  userId: string;
  readOnly?: boolean;
}

// Optimistic update logic
function applySeatingUpdate(
  state: { guests: Guest[]; tables: Table[] },
  update: SeatingUpdate,
): { guests: Guest[]; tables: Table[] } {
  const { guests, tables } = state;

  switch (update.type) {
    case 'MOVE_GUEST': {
      if (!update.guestId || !update.toTableId) return state;

      const updatedGuests = guests.map((guest) =>
        guest.id === update.guestId
          ? {
              ...guest,
              tableId: update.toTableId,
              seatNumber: update.toSeatNumber,
            }
          : guest,
      );

      const updatedTables = tables.map((table) => {
        if (table.id === update.fromTableId) {
          return {
            ...table,
            guests: table.guests.filter((g) => g.id !== update.guestId),
          };
        }
        if (table.id === update.toTableId) {
          const guest = guests.find((g) => g.id === update.guestId);
          return guest
            ? {
                ...table,
                guests: [...table.guests, guest],
              }
            : table;
        }
        return table;
      });

      return { guests: updatedGuests, tables: updatedTables };
    }

    case 'REMOVE_GUEST': {
      if (!update.guestId) return state;

      const updatedGuests = guests.map((guest) =>
        guest.id === update.guestId
          ? { ...guest, tableId: undefined, seatNumber: undefined }
          : guest,
      );

      const updatedTables = tables.map((table) => ({
        ...table,
        guests: table.guests.filter((g) => g.id !== update.guestId),
      }));

      return { guests: updatedGuests, tables: updatedTables };
    }

    default:
      return state;
  }
}

export function SeatingArrangementManager({
  guests,
  tables,
  onUpdateArrangement,
  className,
  weddingId,
  userId,
  readOnly = false,
}: SeatingArrangementManagerProps) {
  const [isPending, startTransition] = useTransition();
  const [optimisticState, addOptimistic] = useOptimistic(
    { guests, tables },
    applySeatingUpdate,
  );

  const [activeId, setActiveId] = useState<string | null>(null);
  const [draggedGuest, setDraggedGuest] = useState<Guest | null>(null);
  const [viewMode, setViewMode] = useState<'layout' | 'list'>('layout');
  const [conflicts, setConflicts] = useState<string[]>([]);

  const { toast } = useToast();

  // Optimized sensors for multi-device support
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const unassignedGuests = useMemo(
    () => optimisticState.guests.filter((guest) => !guest.tableId),
    [optimisticState.guests],
  );

  const assignedGuests = useMemo(
    () => optimisticState.guests.filter((guest) => guest.tableId),
    [optimisticState.guests],
  );

  // Conflict detection
  const detectConflicts = useCallback(
    (guestId: string, tableId: string) => {
      const guest = optimisticState.guests.find((g) => g.id === guestId);
      const table = optimisticState.tables.find((t) => t.id === tableId);

      if (!guest || !table) return [];

      const conflicts: string[] = [];

      // Check dietary conflicts
      if (guest.dietaryRequirements?.includes('vegetarian')) {
        const hasNonVegetarian = table.guests.some(
          (g) =>
            g.dietaryRequirements &&
            !g.dietaryRequirements.includes('vegetarian'),
        );
        if (hasNonVegetarian) {
          conflicts.push('Dietary preference conflict detected');
        }
      }

      // Check accessibility needs
      if (
        guest.accessibilityNeeds?.includes('wheelchair-accessible') &&
        !table.isVip
      ) {
        conflicts.push(
          'This guest requires wheelchair accessibility - consider VIP table',
        );
      }

      // Check table capacity
      if (table.guests.length >= table.capacity) {
        conflicts.push('Table is at full capacity');
      }

      return conflicts;
    },
    [optimisticState.guests, optimisticState.tables],
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      if (readOnly) return;

      const { active } = event;
      setActiveId(active.id as string);

      const guest = optimisticState.guests.find((g) => g.id === active.id);
      if (guest) {
        setDraggedGuest(guest);
      }
    },
    [optimisticState.guests, readOnly],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      if (readOnly) return;

      const { active, over } = event;

      if (!over) {
        setActiveId(null);
        setDraggedGuest(null);
        return;
      }

      const guestId = active.id as string;
      const targetId = over.id as string;

      // Handle table assignment
      if (targetId.startsWith('table-')) {
        const tableId = targetId.replace('table-', '');
        const table = optimisticState.tables.find((t) => t.id === tableId);

        if (table) {
          // Check for conflicts
          const conflictMessages = detectConflicts(guestId, tableId);

          if (conflictMessages.length > 0) {
            setConflicts(conflictMessages);
            toast({
              title: 'Seating Conflict',
              description: conflictMessages[0],
              variant: 'destructive',
            });
          }

          if (table.guests.length < table.capacity) {
            const currentGuest = optimisticState.guests.find(
              (g) => g.id === guestId,
            );

            const update: SeatingUpdate = {
              type: 'MOVE_GUEST',
              guestId,
              fromTableId: currentGuest?.tableId,
              toTableId: tableId,
              toSeatNumber: table.guests.length + 1,
            };

            // Optimistic update
            addOptimistic(update);

            // Actual update with server
            startTransition(async () => {
              try {
                const updatedTables = optimisticState.tables.map((t) =>
                  t.id === tableId
                    ? { ...t, guests: [...t.guests, currentGuest!] }
                    : t.id === currentGuest?.tableId
                      ? {
                          ...t,
                          guests: t.guests.filter((g) => g.id !== guestId),
                        }
                      : t,
                );

                const updatedGuests = optimisticState.guests.map((guest) =>
                  guest.id === guestId
                    ? { ...guest, tableId, seatNumber: table.guests.length + 1 }
                    : guest,
                );

                await onUpdateArrangement(updatedTables, updatedGuests);

                toast({
                  title: 'Guest Assigned',
                  description: `${currentGuest?.name} assigned to ${table.name}`,
                });
              } catch (error) {
                console.error('Failed to update seating:', error);
                toast({
                  title: 'Assignment Failed',
                  description: 'Failed to assign guest. Please try again.',
                  variant: 'destructive',
                });
              }
            });
          } else {
            toast({
              title: 'Table Full',
              description: `${table.name} is at full capacity`,
              variant: 'destructive',
            });
          }
        }
      }

      // Handle unassigning from table
      if (targetId === 'unassigned-guests') {
        const currentGuest = optimisticState.guests.find(
          (g) => g.id === guestId,
        );

        const update: SeatingUpdate = {
          type: 'REMOVE_GUEST',
          guestId,
        };

        // Optimistic update
        addOptimistic(update);

        // Actual update with server
        startTransition(async () => {
          try {
            const updatedGuests = optimisticState.guests.map((guest) =>
              guest.id === guestId
                ? { ...guest, tableId: undefined, seatNumber: undefined }
                : guest,
            );

            const updatedTables = optimisticState.tables.map((t) =>
              t.guests.some((g) => g.id === guestId)
                ? { ...t, guests: t.guests.filter((g) => g.id !== guestId) }
                : t,
            );

            await onUpdateArrangement(updatedTables, updatedGuests);

            toast({
              title: 'Guest Unassigned',
              description: `${currentGuest?.name} moved to unassigned list`,
            });
          } catch (error) {
            console.error('Failed to unassign guest:', error);
            toast({
              title: 'Unassignment Failed',
              description: 'Failed to unassign guest. Please try again.',
              variant: 'destructive',
            });
          }
        });
      }

      setActiveId(null);
      setDraggedGuest(null);
      setConflicts([]);
    },
    [
      optimisticState.guests,
      optimisticState.tables,
      draggedGuest,
      onUpdateArrangement,
      detectConflicts,
      toast,
      readOnly,
    ],
  );

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (readOnly) return;

      if (e.key === 'Escape') {
        setActiveId(null);
        setDraggedGuest(null);
        setConflicts([]);
      }

      if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
        setViewMode((prev) => (prev === 'layout' ? 'list' : 'layout'));
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [readOnly]);

  return (
    <div
      className={cn('flex h-full bg-background', className)}
      role="application"
      aria-label="Seating Arrangement Manager"
    >
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToWindowEdges]}
      >
        {/* Controls Panel */}
        <div className="w-80 border-r border-border bg-muted/30 p-6">
          <SeatingControls
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            totalGuests={optimisticState.guests.length}
            assignedGuests={assignedGuests.length}
            totalTables={optimisticState.tables.length}
            readOnly={readOnly}
          />

          {/* Conflict Alerts */}
          {conflicts.length > 0 && (
            <div className="mt-4">
              {conflicts.map((conflict, index) => (
                <ConflictAlert
                  key={index}
                  message={conflict}
                  severity="warning"
                  onDismiss={() => {
                    setConflicts((prev) => prev.filter((_, i) => i !== index));
                  }}
                />
              ))}
            </div>
          )}

          {/* Unassigned Guests List */}
          <div className="mt-6">
            <h3 className="text-sm font-medium mb-4 flex items-center">
              Unassigned Guests
              <span className="ml-2 bg-muted text-muted-foreground px-2 py-1 rounded text-xs">
                {unassignedGuests.length}
              </span>
            </h3>
            <GuestList
              guests={unassignedGuests}
              droppableId="unassigned-guests"
              className="max-h-96 overflow-y-auto"
              readOnly={readOnly}
            />
          </div>

          {/* Statistics */}
          <div className="mt-6 pt-6 border-t border-border">
            <h4 className="text-sm font-medium mb-3">Statistics</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Assigned:</span>
                <span className="font-mono">
                  {assignedGuests.length}/{optimisticState.guests.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Tables Used:</span>
                <span className="font-mono">
                  {
                    optimisticState.tables.filter((t) => t.guests.length > 0)
                      .length
                  }
                  /{optimisticState.tables.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Completion:</span>
                <span className="font-mono">
                  {Math.round(
                    (assignedGuests.length / optimisticState.guests.length) *
                      100,
                  )}
                  %
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Seating Layout */}
        <div className="flex-1 relative">
          {viewMode === 'layout' ? (
            <TableLayout
              tables={optimisticState.tables}
              activeId={activeId}
              className="h-full"
              readOnly={readOnly}
            />
          ) : (
            <div className="p-6">
              {/* List view implementation */}
              <SeatingListView
                tables={optimisticState.tables}
                guests={optimisticState.guests}
                readOnly={readOnly}
              />
            </div>
          )}

          {/* Loading Overlay */}
          {isPending && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="flex items-center space-x-3 bg-background border rounded-lg p-4 shadow-lg">
                <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                <span className="text-sm font-medium">
                  Updating seating arrangement...
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {draggedGuest ? (
            <div className="bg-background border-2 border-primary rounded-lg p-3 shadow-xl rotate-3 scale-105">
              <div className="font-medium text-sm">{draggedGuest.name}</div>
              <div className="text-xs text-muted-foreground">
                {draggedGuest.email}
              </div>
              {draggedGuest.dietaryRequirements &&
                draggedGuest.dietaryRequirements.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {draggedGuest.dietaryRequirements
                      .slice(0, 2)
                      .map((req, index) => (
                        <span
                          key={index}
                          className="bg-orange-100 text-orange-800 text-xs px-1.5 py-0.5 rounded"
                        >
                          {req}
                        </span>
                      ))}
                    {draggedGuest.dietaryRequirements.length > 2 && (
                      <span className="text-xs text-muted-foreground">
                        +{draggedGuest.dietaryRequirements.length - 2} more
                      </span>
                    )}
                  </div>
                )}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

// List View Component
function SeatingListView({
  tables,
  guests,
  readOnly,
}: {
  tables: Table[];
  guests: Guest[];
  readOnly?: boolean;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Seating Arrangement List</h2>
        <div className="text-sm text-muted-foreground">
          {tables.filter((t) => t.guests.length > 0).length} of {tables.length}{' '}
          tables used
        </div>
      </div>

      <div className="grid gap-4">
        {tables.map((table) => (
          <div key={table.id} className="bg-background border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium">
                {table.name}
                {table.isVip && (
                  <span className="ml-2 bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
                    VIP
                  </span>
                )}
              </h3>
              <div className="text-sm text-muted-foreground">
                {table.guests.length}/{table.capacity} seats
              </div>
            </div>

            {table.guests.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {table.guests.map((guest, index) => (
                  <div
                    key={guest.id}
                    className="flex items-center space-x-2 p-2 bg-muted rounded text-sm"
                  >
                    <span className="font-mono text-xs text-muted-foreground">
                      {index + 1}
                    </span>
                    <span>{guest.name}</span>
                    {guest.dietaryRequirements &&
                      guest.dietaryRequirements.length > 0 && (
                        <span className="bg-orange-100 text-orange-800 text-xs px-1 py-0.5 rounded">
                          Dietary
                        </span>
                      )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No guests assigned to this table
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
