'use client';

import React, { useState, useRef, useCallback } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { type Table, type Guest, type Position } from '@/types/seating';
import { GuestChip } from './GuestChip';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MoreHorizontal,
  Users,
  Edit3,
  Trash2,
  AlertTriangle,
  Check,
  X,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TableCardProps {
  table: Table;
  guests: Guest[];
  isSelected?: boolean;
  onUpdate: (updates: Partial<Table>) => void;
  onMove: (position: Position) => void;
  onSelect: () => void;
  onDelete: () => void;
  readonly?: boolean;
  gridSize?: number;
  style?: React.CSSProperties;
}

const TABLE_SHAPES = {
  round: { width: 120, height: 120, borderRadius: '50%' },
  square: { width: 120, height: 120, borderRadius: '8px' },
  rectangular: { width: 160, height: 100, borderRadius: '8px' },
} as const;

export function TableCard({
  table,
  guests,
  isSelected,
  onUpdate,
  onMove,
  onSelect,
  onDelete,
  readonly = false,
  gridSize = 20,
  style,
}: TableCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(table.name);
  const [isDragMode, setIsDragMode] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);

  // Draggable for moving the table
  const {
    attributes,
    listeners,
    setNodeRef: setDragNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: `table-${table.id}`,
    data: {
      type: 'table',
      table,
    },
    disabled: readonly || isEditing,
  });

  // Droppable for guest assignments
  const { setNodeRef: setDropNodeRef, isOver } = useDroppable({
    id: `table-drop-${table.id}`,
    data: {
      type: 'table',
      tableId: table.id,
    },
    disabled: readonly,
  });

  const dragStyle = {
    transform: CSS.Translate.toString(transform),
    zIndex: isDragging ? 1000 : 'auto',
  };

  const shapeStyle = TABLE_SHAPES[table.shape];
  const isOverCapacity = guests.length > table.capacity;
  const availableSlots = Math.max(0, table.capacity - guests.length);

  // Handle name editing
  const handleNameSubmit = useCallback(() => {
    if (editName.trim() && editName !== table.name) {
      onUpdate({ name: editName.trim() });
    }
    setIsEditing(false);
  }, [editName, table.name, onUpdate]);

  const handleNameCancel = useCallback(() => {
    setEditName(table.name);
    setIsEditing(false);
  }, [table.name]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter') {
        handleNameSubmit();
      } else if (event.key === 'Escape') {
        handleNameCancel();
      }
    },
    [handleNameSubmit, handleNameCancel],
  );

  // Handle capacity change
  const adjustCapacity = useCallback(
    (delta: number) => {
      const newCapacity = Math.max(1, Math.min(20, table.capacity + delta));
      onUpdate({ capacity: newCapacity });
    },
    [table.capacity, onUpdate],
  );

  // Get dietary requirements summary
  const dietaryRequirements = guests.reduce(
    (acc, guest) => {
      guest.dietaryRequirements?.forEach((req) => {
        acc[req] = (acc[req] || 0) + 1;
      });
      return acc;
    },
    {} as Record<string, number>,
  );

  // Get accessibility requirements summary
  const accessibilityNeeds = guests.reduce(
    (acc, guest) => {
      guest.accessibilityRequirements?.forEach((req) => {
        acc[req] = (acc[req] || 0) + 1;
      });
      return acc;
    },
    {} as Record<string, number>,
  );

  // Check for conflicts
  const hasConflicts = guests.some((guest) =>
    guest.conflictsWith?.some((conflictId) =>
      guests.some((otherGuest) => otherGuest.id === conflictId),
    ),
  );

  return (
    <div
      ref={(node) => {
        setDragNodeRef(node);
        setDropNodeRef(node);
        dragRef.current = node;
      }}
      style={{ ...style, ...dragStyle }}
      className={cn(
        'relative group cursor-pointer select-none',
        isDragging && 'opacity-50',
        isSelected && 'ring-2 ring-blue-500 ring-offset-2',
        readonly && 'cursor-default',
      )}
      onClick={onSelect}
      {...(isDragMode ? attributes : {})}
      {...(isDragMode ? listeners : {})}
    >
      {/* Table shape */}
      <div
        className={cn(
          'relative flex flex-col items-center justify-center border-2 transition-all duration-200',
          'bg-white shadow-lg',
          isOver && 'border-blue-400 bg-blue-50',
          isOverCapacity && 'border-red-400 bg-red-50',
          hasConflicts && 'border-yellow-400 bg-yellow-50',
          isSelected && 'shadow-xl',
          !readonly && 'hover:shadow-xl',
        )}
        style={shapeStyle}
      >
        {/* Status indicators */}
        <div className="absolute -top-2 -right-2 flex gap-1">
          {hasConflicts && (
            <Badge variant="destructive" className="h-5 w-5 p-0 rounded-full">
              <AlertTriangle className="h-3 w-3" />
            </Badge>
          )}
          {isOverCapacity && (
            <Badge variant="destructive" className="h-5 w-5 p-0 rounded-full">
              <Users className="h-3 w-3" />
            </Badge>
          )}
        </div>

        {/* Table content */}
        <div className="flex flex-col items-center justify-center h-full w-full p-2">
          {/* Table name */}
          {isEditing ? (
            <div className="flex items-center gap-1 w-full">
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={handleNameSubmit}
                onKeyDown={handleKeyDown}
                className="h-6 text-xs text-center"
                autoFocus
                maxLength={20}
              />
              <div className="flex gap-0.5">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleNameSubmit}
                  className="h-5 w-5 p-0"
                >
                  <Check className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleNameCancel}
                  className="h-5 w-5 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-sm font-semibold text-center truncate w-full">
              {table.name}
            </div>
          )}

          {/* Capacity indicator */}
          <div
            className={cn(
              'text-xs mt-1',
              isOverCapacity ? 'text-red-600' : 'text-slate-500',
            )}
          >
            {guests.length}/{table.capacity}
          </div>

          {/* Guest indicators (mini chips) */}
          {guests.length > 0 && (
            <div className="flex flex-wrap gap-0.5 mt-1 justify-center max-w-full">
              {guests.slice(0, 6).map((guest) => (
                <div
                  key={guest.id}
                  className={cn(
                    'w-2 h-2 rounded-full border',
                    guest.dietaryRequirements?.length
                      ? 'bg-orange-400'
                      : 'bg-green-400',
                    guest.accessibilityRequirements?.length &&
                      'border-blue-400 border-2',
                  )}
                  title={guest.name}
                />
              ))}
              {guests.length > 6 && (
                <div className="text-xs text-slate-400">
                  +{guests.length - 6}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Table actions menu */}
        {!readonly && (isSelected || !isDragging) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'absolute -top-2 -left-2 h-6 w-6 p-0 bg-white border shadow-sm',
                  'opacity-0 group-hover:opacity-100 transition-opacity',
                )}
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => setIsEditing(true)}>
                <Edit3 className="h-4 w-4 mr-2" />
                Rename table
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsDragMode(!isDragMode)}>
                <Settings className="h-4 w-4 mr-2" />
                {isDragMode ? 'Exit move mode' : 'Move table'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => adjustCapacity(1)}>
                <Users className="h-4 w-4 mr-2" />
                Increase capacity ({table.capacity + 1})
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => adjustCapacity(-1)}
                disabled={table.capacity <= 1}
              >
                <Users className="h-4 w-4 mr-2" />
                Decrease capacity ({table.capacity - 1})
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete()}
                className="text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete table
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Detailed guest list (when selected) */}
      {isSelected && guests.length > 0 && (
        <div className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-xl border p-3 min-w-64 z-50">
          <div className="text-sm font-medium mb-2">Assigned Guests</div>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {guests.map((guest) => (
              <GuestChip
                key={guest.id}
                guest={guest}
                size="sm"
                showRemove={!readonly}
                onRemove={() =>
                  onUpdate({
                    guestIds: guests
                      .filter((g) => g.id !== guest.id)
                      .map((g) => g.id),
                  })
                }
              />
            ))}
          </div>

          {/* Requirements summary */}
          {(Object.keys(dietaryRequirements).length > 0 ||
            Object.keys(accessibilityNeeds).length > 0) && (
            <div className="mt-3 pt-2 border-t text-xs text-slate-600">
              {Object.keys(dietaryRequirements).length > 0 && (
                <div>
                  <strong>Dietary:</strong>{' '}
                  {Object.entries(dietaryRequirements)
                    .map(([req, count]) => `${req} (${count})`)
                    .join(', ')}
                </div>
              )}
              {Object.keys(accessibilityNeeds).length > 0 && (
                <div>
                  <strong>Accessibility:</strong>{' '}
                  {Object.entries(accessibilityNeeds)
                    .map(([req, count]) => `${req} (${count})`)
                    .join(', ')}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Drop indicator */}
      {isOver && (
        <div className="absolute inset-0 border-2 border-dashed border-blue-400 rounded-lg bg-blue-50/50 pointer-events-none" />
      )}

      {/* Move mode indicator */}
      {isDragMode && (
        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
          Move mode - drag to reposition
        </div>
      )}
    </div>
  );
}
