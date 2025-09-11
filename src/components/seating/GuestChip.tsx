'use client';

import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { type Guest } from '@/types/seating';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  X,
  Utensils,
  Wheelchair,
  AlertTriangle,
  Star,
  Heart,
  Users,
  Crown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface GuestChipProps {
  guest: Guest;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'compact' | 'detailed';
  showRemove?: boolean;
  showConflicts?: boolean;
  showRequirements?: boolean;
  isSelected?: boolean;
  isDraggable?: boolean;
  onRemove?: () => void;
  onClick?: () => void;
  className?: string;
}

const sizeStyles = {
  sm: 'text-xs px-2 py-1 gap-1',
  md: 'text-sm px-3 py-1.5 gap-1.5',
  lg: 'text-base px-4 py-2 gap-2',
};

const priorityIcons = {
  vip: Crown,
  family: Heart,
  wedding_party: Star,
  friend: Users,
};

const priorityColors = {
  vip: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  family: 'text-red-600 bg-red-50 border-red-200',
  wedding_party: 'text-blue-600 bg-blue-50 border-blue-200',
  friend: 'text-green-600 bg-green-50 border-green-200',
};

export function GuestChip({
  guest,
  size = 'md',
  variant = 'default',
  showRemove = false,
  showConflicts = true,
  showRequirements = true,
  isSelected = false,
  isDraggable = true,
  onRemove,
  onClick,
  className,
}: GuestChipProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `guest-${guest.id}`,
      data: {
        type: 'guest',
        guest,
      },
      disabled: !isDraggable,
    });

  const dragStyle = {
    transform: CSS.Translate.toString(transform),
    zIndex: isDragging ? 1000 : 'auto',
  };

  // Get guest requirements
  const hasDietaryRequirements =
    guest.dietaryRequirements && guest.dietaryRequirements.length > 0;
  const hasAccessibilityRequirements =
    guest.accessibilityRequirements &&
    guest.accessibilityRequirements.length > 0;
  const hasConflicts = guest.conflictsWith && guest.conflictsWith.length > 0;
  const PriorityIcon = guest.priority ? priorityIcons[guest.priority] : null;

  // Get appropriate styling based on guest status and requirements
  const getChipStyles = () => {
    let baseStyles = cn(
      'inline-flex items-center rounded-full border transition-all duration-200',
      'cursor-pointer select-none relative',
      sizeStyles[size],
      isDraggable && 'hover:shadow-md active:scale-95',
      isDragging && 'opacity-50 shadow-lg',
      isSelected && 'ring-2 ring-blue-500 ring-offset-1',
    );

    // Priority-based styling
    if (guest.priority && priorityColors[guest.priority]) {
      baseStyles = cn(baseStyles, priorityColors[guest.priority]);
    } else {
      baseStyles = cn(baseStyles, 'bg-white border-slate-200 text-slate-700');
    }

    // Status-based styling
    if (guest.assignedTableId) {
      baseStyles = cn(
        baseStyles,
        'bg-green-50 border-green-200 text-green-800',
      );
    }

    if (hasConflicts && showConflicts) {
      baseStyles = cn(baseStyles, 'border-red-300 bg-red-50');
    }

    return baseStyles;
  };

  const chipContent = (
    <div
      ref={setNodeRef}
      style={dragStyle}
      className={cn(getChipStyles(), className)}
      onClick={onClick}
      {...(isDraggable ? attributes : {})}
      {...(isDraggable ? listeners : {})}
    >
      {/* Priority icon */}
      {PriorityIcon && (
        <PriorityIcon
          className={cn(
            size === 'sm' ? 'h-3 w-3' : size === 'md' ? 'h-4 w-4' : 'h-5 w-5',
          )}
        />
      )}

      {/* Guest name */}
      <span
        className={cn(
          'font-medium truncate',
          variant === 'compact' && 'max-w-16',
          variant === 'default' && 'max-w-32',
          variant === 'detailed' && 'max-w-48',
        )}
      >
        {guest.name}
      </span>

      {/* Requirements indicators */}
      {showRequirements && (
        <div className="flex items-center gap-0.5">
          {hasDietaryRequirements && (
            <Utensils
              className={cn(
                'text-orange-500',
                size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3',
              )}
            />
          )}
          {hasAccessibilityRequirements && (
            <Wheelchair
              className={cn(
                'text-blue-500',
                size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3',
              )}
            />
          )}
          {hasConflicts && showConflicts && (
            <AlertTriangle
              className={cn(
                'text-red-500',
                size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3',
              )}
            />
          )}
        </div>
      )}

      {/* Remove button */}
      {showRemove && onRemove && (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className={cn(
            'p-0 h-auto hover:bg-red-100 rounded-full',
            size === 'sm' ? 'ml-1' : 'ml-1.5',
          )}
        >
          <X
            className={cn(
              'text-slate-400 hover:text-red-600',
              size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3',
            )}
          />
        </Button>
      )}

      {/* Assignment indicator */}
      {guest.assignedTableId && (
        <div
          className={cn(
            'absolute -top-1 -right-1 bg-green-500 rounded-full border border-white',
            size === 'sm' ? 'h-2 w-2' : 'h-2.5 w-2.5',
          )}
        />
      )}
    </div>
  );

  // Wrap with tooltip for detailed information
  if (
    variant === 'detailed' ||
    hasDietaryRequirements ||
    hasAccessibilityRequirements ||
    hasConflicts
  ) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{chipContent}</TooltipTrigger>
          <TooltipContent side="top" className="max-w-64">
            <div className="space-y-2">
              <div className="font-semibold">{guest.name}</div>

              {guest.priority && (
                <div className="text-xs">
                  <span className="font-medium">Priority:</span>{' '}
                  {guest.priority.replace('_', ' ')}
                </div>
              )}

              {guest.assignedTableId && (
                <div className="text-xs">
                  <span className="font-medium">Assigned to:</span> Table{' '}
                  {guest.assignedTableId}
                </div>
              )}

              {hasDietaryRequirements && (
                <div className="text-xs">
                  <span className="font-medium">Dietary:</span>{' '}
                  {guest.dietaryRequirements!.join(', ')}
                </div>
              )}

              {hasAccessibilityRequirements && (
                <div className="text-xs">
                  <span className="font-medium">Accessibility:</span>{' '}
                  {guest.accessibilityRequirements!.join(', ')}
                </div>
              )}

              {hasConflicts && showConflicts && (
                <div className="text-xs text-red-600">
                  <span className="font-medium">Conflicts:</span>{' '}
                  {guest.conflictsWith!.length} guest(s)
                </div>
              )}

              {guest.notes && (
                <div className="text-xs">
                  <span className="font-medium">Notes:</span> {guest.notes}
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return chipContent;
}
