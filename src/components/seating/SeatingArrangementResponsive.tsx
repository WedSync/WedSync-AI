'use client';

import React, { useState, useCallback, useReducer, useEffect } from 'react';
import { DndContext, DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import {
  type Guest,
  type Table,
  type Position,
  type ConflictDetails,
  type SeatingAction,
  type ViewMode,
} from '@/types/seating';
import { TableLayout } from './TableLayout';
import { GuestList } from './GuestList';
import { TableToolbar } from './TableToolbar';
import { SeatingControls } from './SeatingControls';
import { ConflictAlert, createConflictDetails } from './ConflictAlert';
import { MobileSeatingInterface } from './MobileSeatingInterface';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import '@/styles/seating.css';

interface SeatingArrangementResponsiveProps {
  initialGuests?: Guest[];
  initialTables?: Table[];
  onSave?: (
    tables: Table[],
    assignments: Record<string, string>,
    name: string,
  ) => void;
  onLoad?: (arrangementId: string) => void;
  readonly?: boolean;
  className?: string;
}

// Seating state reducer
function seatingReducer(
  state: { guests: Guest[]; tables: Table[] },
  action: SeatingAction,
) {
  switch (action.type) {
    case 'ADD_TABLE': {
      const newTable: Table = {
        ...action.table,
        id: `table-${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
      };
      return { ...state, tables: [...state.tables, newTable] };
    }

    case 'UPDATE_TABLE': {
      return {
        ...state,
        tables: state.tables.map((table) =>
          table.id === action.tableId
            ? { ...table, ...action.updates, updatedAt: new Date() }
            : table,
        ),
      };
    }

    case 'DELETE_TABLE': {
      // Unassign guests from deleted table
      const updatedGuests = state.guests.map((guest) =>
        guest.assignedTableId === action.tableId
          ? { ...guest, assignedTableId: undefined }
          : guest,
      );

      return {
        guests: updatedGuests,
        tables: state.tables.filter((table) => table.id !== action.tableId),
      };
    }

    case 'MOVE_TABLE': {
      return {
        ...state,
        tables: state.tables.map((table) =>
          table.id === action.tableId
            ? { ...table, position: action.position, updatedAt: new Date() }
            : table,
        ),
      };
    }

    case 'ASSIGN_GUEST': {
      return {
        ...state,
        guests: state.guests.map((guest) =>
          guest.id === action.guestId
            ? { ...guest, assignedTableId: action.tableId }
            : guest,
        ),
      };
    }

    case 'UNASSIGN_GUEST': {
      return {
        ...state,
        guests: state.guests.map((guest) =>
          guest.id === action.guestId
            ? { ...guest, assignedTableId: undefined }
            : guest,
        ),
      };
    }

    default:
      return state;
  }
}

export function SeatingArrangementResponsive({
  initialGuests = [],
  initialTables = [],
  onSave,
  onLoad,
  readonly = false,
  className,
}: SeatingArrangementResponsiveProps) {
  const { toast } = useToast();

  // State management
  const [state, dispatch] = useReducer(seatingReducer, {
    guests: initialGuests,
    tables: initialTables,
  });

  const [selectedTableId, setSelectedTableId] = useState<string>();
  const [conflicts, setConflicts] = useState<ConflictDetails[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 767);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Conflict detection
  const detectConflicts = useCallback(() => {
    const newConflicts: ConflictDetails[] = [];

    state.tables.forEach((table) => {
      const tableGuests = state.guests.filter(
        (g) => g.assignedTableId === table.id,
      );

      // Check capacity exceeded
      if (tableGuests.length > table.capacity) {
        newConflicts.push(
          createConflictDetails(
            'capacity_exceeded',
            'high',
            table,
            tableGuests,
            `This table has ${tableGuests.length} guests but capacity is ${table.capacity}.`,
            [
              'Move some guests to available tables',
              'Increase table capacity if space allows',
              'Create an additional table nearby',
            ],
          ),
        );
      }

      // Check guest conflicts
      for (let i = 0; i < tableGuests.length; i++) {
        const guest1 = tableGuests[i];
        if (!guest1.conflictsWith) continue;

        for (let j = i + 1; j < tableGuests.length; j++) {
          const guest2 = tableGuests[j];
          if (guest1.conflictsWith.includes(guest2.id)) {
            newConflicts.push(
              createConflictDetails(
                'guest_conflict',
                'high',
                table,
                [guest1, guest2],
                `${guest1.name} and ${guest2.name} have relationship conflicts.`,
                [
                  'Move one guest to a different table',
                  'Review relationship settings',
                  'Consider creating separate tables for conflicting groups',
                ],
              ),
            );
          }
        }
      }

      // Check dietary conflicts
      const dietaryGroups = new Map<string, Guest[]>();
      tableGuests.forEach((guest) => {
        guest.dietaryRequirements?.forEach((req) => {
          if (!dietaryGroups.has(req)) {
            dietaryGroups.set(req, []);
          }
          dietaryGroups.get(req)!.push(guest);
        });
      });

      // Example: Check for potential cross-contamination issues
      const hasVegan = dietaryGroups.has('vegan');
      const hasNonVegan = tableGuests.some(
        (g) => !g.dietaryRequirements?.includes('vegan'),
      );

      if (hasVegan && hasNonVegan && dietaryGroups.get('vegan')!.length > 1) {
        newConflicts.push(
          createConflictDetails(
            'dietary_conflict',
            'medium',
            table,
            dietaryGroups.get('vegan')!,
            'Multiple guests with strict dietary requirements at this table.',
            [
              'Group guests with similar dietary needs',
              'Ensure kitchen can accommodate all requirements at this table',
              'Consider creating specialized dietary tables',
            ],
          ),
        );
      }
    });

    setConflicts(newConflicts);
  }, [state.guests, state.tables]);

  // Run conflict detection when assignments change
  useEffect(() => {
    detectConflicts();
  }, [detectConflicts]);

  // Table operations
  const handleAddTable = useCallback(
    (shape: Table['shape'], capacity: number, name?: string) => {
      // Find a good position for the new table (simple algorithm)
      const positions = state.tables.map((t) => t.position);
      let position: Position = { x: 100, y: 100 };

      // Try to find an empty spot
      for (let y = 100; y < 800; y += 150) {
        for (let x = 100; x < 800; x += 150) {
          const testPos = { x, y };
          const tooClose = positions.some(
            (pos) =>
              Math.abs(pos.x - testPos.x) < 120 &&
              Math.abs(pos.y - testPos.y) < 120,
          );
          if (!tooClose) {
            position = testPos;
            break;
          }
        }
      }

      dispatch({
        type: 'ADD_TABLE',
        table: {
          name: name || `Table ${state.tables.length + 1}`,
          capacity,
          shape,
          position,
          notes: '',
          specialRequirements: [],
        },
      });

      toast({
        title: 'Table added',
        description: `${name || `Table ${state.tables.length + 1}`} has been created.`,
      });
    },
    [state.tables, toast],
  );

  const handleUpdateTable = useCallback(
    (tableId: string, updates: Partial<Table>) => {
      dispatch({ type: 'UPDATE_TABLE', tableId, updates });
    },
    [],
  );

  const handleMoveTable = useCallback((tableId: string, position: Position) => {
    dispatch({ type: 'MOVE_TABLE', tableId, position });
  }, []);

  const handleDeleteTable = useCallback(
    (tableId: string) => {
      const table = state.tables.find((t) => t.id === tableId);
      if (table) {
        dispatch({ type: 'DELETE_TABLE', tableId });
        toast({
          title: 'Table deleted',
          description: `${table.name} has been removed.`,
        });
      }
    },
    [state.tables, toast],
  );

  const handleDuplicateTable = useCallback(
    (tableId: string) => {
      const table = state.tables.find((t) => t.id === tableId);
      if (table) {
        handleAddTable(table.shape, table.capacity, `${table.name} (Copy)`);
      }
    },
    [state.tables, handleAddTable],
  );

  // Guest assignment operations
  const handleGuestAssign = useCallback(
    (guestId: string, tableId: string) => {
      dispatch({ type: 'ASSIGN_GUEST', guestId, tableId });

      const guest = state.guests.find((g) => g.id === guestId);
      const table = state.tables.find((t) => t.id === tableId);

      if (guest && table) {
        toast({
          title: 'Guest assigned',
          description: `${guest.name} assigned to ${table.name}.`,
        });
      }
    },
    [state.guests, state.tables, toast],
  );

  const handleGuestUnassign = useCallback(
    (guestId: string) => {
      const guest = state.guests.find((g) => g.id === guestId);
      if (guest) {
        dispatch({ type: 'UNASSIGN_GUEST', guestId });
        toast({
          title: 'Guest unassigned',
          description: `${guest.name} removed from table.`,
        });
      }
    },
    [state.guests, toast],
  );

  // Drag and drop handling
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (!over || readonly) return;

      const guestId = active.id as string;
      const overId = over.id as string;

      // Check if dropping on a table
      if (overId.startsWith('table-drop-')) {
        const tableId = overId.replace('table-drop-', '');
        handleGuestAssign(guestId, tableId);
      }
    },
    [readonly, handleGuestAssign],
  );

  // Save arrangement
  const handleSave = useCallback(
    (name: string, setAsDefault?: boolean) => {
      if (onSave) {
        const assignments = state.guests.reduce(
          (acc, guest) => {
            if (guest.assignedTableId) {
              acc[guest.id] = guest.assignedTableId;
            }
            return acc;
          },
          {} as Record<string, string>,
        );

        onSave(state.tables, assignments, name);

        toast({
          title: 'Arrangement saved',
          description: `"${name}" has been saved${setAsDefault ? ' as default' : ''}.`,
        });
      }
    },
    [state.tables, state.guests, onSave, toast],
  );

  // Resolve conflicts
  const handleConflictResolve = useCallback(
    (conflict: ConflictDetails, action: string) => {
      // Simple auto-resolution logic
      if (action === 'auto_resolve' && conflict.type === 'capacity_exceeded') {
        // Move excess guests to available tables
        const tableGuests = state.guests.filter(
          (g) => g.assignedTableId === conflict.table.id,
        );
        const excessGuests = tableGuests.slice(conflict.table.capacity);

        excessGuests.forEach((guest) => {
          // Find available table
          const availableTable = state.tables.find((table) => {
            const currentGuests = state.guests.filter(
              (g) => g.assignedTableId === table.id,
            );
            return currentGuests.length < table.capacity;
          });

          if (availableTable) {
            handleGuestAssign(guest.id, availableTable.id);
          } else {
            handleGuestUnassign(guest.id);
          }
        });
      }
    },
    [state.guests, state.tables, handleGuestAssign, handleGuestUnassign],
  );

  // Mobile interface renders different layout
  if (isMobile) {
    return (
      <div
        className={cn('seating-arrangement-manager mobile-layout', className)}
      >
        <MobileSeatingInterface
          guests={state.guests}
          tables={state.tables}
          onGuestAssign={handleGuestAssign}
          onGuestUnassign={handleGuestUnassign}
          onTableAdd={() => handleAddTable('round', 8)}
          conflicts={conflicts.length}
          readonly={readonly}
        />

        {/* Mobile conflict alerts */}
        <div className="conflict-alert-container">
          <ConflictAlert
            conflicts={conflicts}
            onResolve={handleConflictResolve}
            compact
            showSuggestions={false}
          />
        </div>
      </div>
    );
  }

  // Desktop/Tablet layout
  return (
    <div className={cn('seating-arrangement-manager', className)}>
      <DndContext onDragEnd={handleDragEnd}>
        {/* Main layout */}
        <div className="seating-sidebar">
          <GuestList
            guests={state.guests}
            showFilters
            showSearch
            showGrouping
            readonly={readonly}
          />
        </div>

        <div className="seating-main-content">
          {/* Controls */}
          <SeatingControls
            guests={state.guests}
            tables={state.tables}
            conflicts={conflicts.length}
            onSave={handleSave}
            readonly={readonly}
          />

          {/* Toolbar */}
          <TableToolbar
            tables={state.tables}
            selectedTableId={selectedTableId}
            onAddTable={handleAddTable}
            onDuplicateTable={handleDuplicateTable}
            onDeleteTable={handleDeleteTable}
            onDeleteAllTables={() => {
              state.tables.forEach((table) =>
                dispatch({ type: 'DELETE_TABLE', tableId: table.id }),
              );
            }}
            readonly={readonly}
          />

          {/* Main canvas */}
          <div className="seating-canvas-area">
            <TableLayout
              tables={state.tables}
              guests={state.guests}
              onTableUpdate={handleUpdateTable}
              onTableMove={handleMoveTable}
              onTableAdd={(position) => {
                dispatch({
                  type: 'ADD_TABLE',
                  table: {
                    name: `Table ${state.tables.length + 1}`,
                    capacity: 8,
                    shape: 'round',
                    position,
                    notes: '',
                    specialRequirements: [],
                  },
                });
              }}
              onTableDelete={handleDeleteTable}
              readonly={readonly}
            />
          </div>
        </div>

        {/* Conflict alerts - desktop/tablet positioning */}
        <div className="conflict-alert-container">
          <ConflictAlert
            conflicts={conflicts}
            onResolve={handleConflictResolve}
            showSuggestions
          />
        </div>
      </DndContext>
    </div>
  );
}
