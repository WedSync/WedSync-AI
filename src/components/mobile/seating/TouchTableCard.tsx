'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Users, AlertTriangle, Plus, Settings } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { TouchTableCardProps, Guest } from '@/types/mobile-seating';

/**
 * TouchTableCard - WS-154 Mobile Table Component
 *
 * Interactive table card with touch gestures:
 * - Tap to select/deselect
 * - Long-press for context menu
 * - Swipe for quick actions
 * - Visual feedback for all interactions
 * - Accessibility support
 */
export const TouchTableCard: React.FC<TouchTableCardProps> = ({
  table,
  isSelected = false,
  onSelect,
  onGuestAssign,
  gestureHandlers,
  className = '',
}) => {
  const [isLongPressing, setIsLongPressing] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [touchStartX, setTouchStartX] = useState(0);
  const [touchStartTime, setTouchStartTime] = useState(0);

  const cardRef = useRef<HTMLDivElement>(null);
  const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate table fill percentage
  const fillPercentage = (table.guests.length / table.capacity) * 100;

  // Get table shape styles
  const getShapeStyles = () => {
    const baseSize = 80;
    const styles: React.CSSProperties = {
      minWidth: baseSize,
      minHeight: baseSize,
    };

    switch (table.shape) {
      case 'round':
        return {
          ...styles,
          borderRadius: '50%',
          width: baseSize,
          height: baseSize,
        };
      case 'rectangle':
        return {
          ...styles,
          borderRadius: '8px',
          width: baseSize * 1.5,
          height: baseSize * 0.8,
        };
      case 'square':
        return {
          ...styles,
          borderRadius: '8px',
          width: baseSize,
          height: baseSize,
        };
      default:
        return styles;
    }
  };

  // Get capacity color based on fill level
  const getCapacityColor = () => {
    if (fillPercentage === 100)
      return 'bg-green-100 border-green-300 text-green-800';
    if (fillPercentage >= 80)
      return 'bg-yellow-100 border-yellow-300 text-yellow-800';
    if (fillPercentage > 0) return 'bg-blue-100 border-blue-300 text-blue-800';
    return 'bg-gray-100 border-gray-300 text-gray-600';
  };

  // Touch event handlers
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      setTouchStartX(touch.clientX);
      setTouchStartTime(Date.now());

      // Start long press timer
      longPressTimeoutRef.current = setTimeout(() => {
        setIsLongPressing(true);

        // Haptic feedback if available
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }

        // Trigger long press action
        gestureHandlers?.onLongPress?.(table.id, table);
        onGuestAssign?.(table.id);
      }, 500);

      e.stopPropagation();
    },
    [table, gestureHandlers, onGuestAssign],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStartX;

      // Cancel long press if moving
      if (Math.abs(deltaX) > 10 && longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
        setIsLongPressing(false);
      }

      // Handle swipe for quick actions
      if (Math.abs(deltaX) > 20) {
        setSwipeOffset(deltaX);
        if (Math.abs(deltaX) > 60) {
          setShowQuickActions(true);
        }
      }

      e.stopPropagation();
    },
    [touchStartX],
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const touchDuration = Date.now() - touchStartTime;

      // Clear long press timer
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
      }

      // Handle tap (short touch without movement)
      if (
        touchDuration < 500 &&
        Math.abs(swipeOffset) < 10 &&
        !isLongPressing
      ) {
        onSelect?.(table.id);
        gestureHandlers?.onTap?.(table.id, table);
      }

      // Reset swipe actions
      if (Math.abs(swipeOffset) > 100) {
        // Trigger swipe action
        const direction = swipeOffset > 0 ? 'right' : 'left';
        gestureHandlers?.onSwipe?.(direction, table.id);

        if (direction === 'right') {
          onGuestAssign?.(table.id);
        }
      }

      // Reset states
      setSwipeOffset(0);
      setIsLongPressing(false);
      setShowQuickActions(false);
      setTouchStartX(0);
      setTouchStartTime(0);

      e.stopPropagation();
    },
    [
      touchStartTime,
      swipeOffset,
      isLongPressing,
      table,
      onSelect,
      onGuestAssign,
      gestureHandlers,
    ],
  );

  // Click handler for non-touch devices
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect?.(table.id);
  };

  // Quick action handlers
  const handleQuickAction = (action: string, e: React.MouseEvent) => {
    e.stopPropagation();

    switch (action) {
      case 'assign':
        onGuestAssign?.(table.id);
        break;
      case 'settings':
        // Open table settings
        console.log('Open table settings:', table.id);
        break;
      default:
        break;
    }
  };

  const getTableStatusBadge = () => {
    if (table.guests.length === 0) {
      return (
        <Badge variant="outline" className="text-xs">
          Empty
        </Badge>
      );
    }

    if (fillPercentage === 100) {
      return (
        <Badge variant="default" className="text-xs bg-green-600">
          Full
        </Badge>
      );
    }

    return (
      <Badge variant="secondary" className="text-xs">
        {table.guests.length}/{table.capacity}
      </Badge>
    );
  };

  const hasConflicts = table.guests.some(
    (guest) => guest.conflictFlags && guest.conflictFlags.length > 0,
  );

  return (
    <div
      ref={cardRef}
      className={`
        relative touch-manipulation cursor-pointer transition-all duration-200
        ${isSelected ? 'scale-105 shadow-lg' : 'shadow-md'}
        ${isLongPressing ? 'scale-95' : ''}
        ${className}
      `}
      style={{
        transform: `translateX(${swipeOffset * 0.3}px) ${isSelected ? 'scale(1.05)' : ''}`,
        minWidth: '44px',
        minHeight: '44px',
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label={`Table ${table.name}, ${table.guests.length} of ${table.capacity} guests`}
      aria-pressed={isSelected}
    >
      {/* Main table card */}
      <div
        className={`
          relative flex flex-col items-center justify-center p-2 border-2 transition-all
          ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white'}
          ${getCapacityColor()}
          ${hasConflicts ? 'border-red-300 bg-red-50' : ''}
        `}
        style={getShapeStyles()}
      >
        {/* Table name */}
        <div className="text-xs font-semibold text-center leading-tight mb-1">
          {table.name}
        </div>

        {/* Capacity indicator */}
        <div className="flex items-center space-x-1">
          <Users className="w-3 h-3" />
          <span className="text-xs font-medium">
            {table.guests.length}/{table.capacity}
          </span>
        </div>

        {/* Status indicators */}
        <div className="absolute -top-2 -right-2 flex space-x-1">
          {hasConflicts && (
            <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-2 h-2 text-white" />
            </div>
          )}
        </div>

        {/* Fill indicator */}
        {fillPercentage > 0 && (
          <div className="absolute bottom-1 left-1 right-1">
            <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  fillPercentage === 100
                    ? 'bg-green-500'
                    : fillPercentage >= 80
                      ? 'bg-yellow-500'
                      : 'bg-blue-500'
                }`}
                style={{ width: `${fillPercentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Selection indicator */}
        {isSelected && (
          <div
            className="absolute inset-0 border-2 border-blue-500 rounded-full opacity-50 animate-pulse"
            style={getShapeStyles()}
          />
        )}
      </div>

      {/* Quick actions (shown on swipe) */}
      {showQuickActions && (
        <div className="absolute top-0 right-0 flex space-x-1 transform translate-x-full">
          <Button
            size="sm"
            variant="outline"
            className="w-10 h-10 p-0 bg-white shadow-md"
            onClick={(e) => handleQuickAction('assign', e)}
            aria-label="Assign guests to table"
          >
            <Plus className="w-4 h-4" />
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="w-10 h-10 p-0 bg-white shadow-md"
            onClick={(e) => handleQuickAction('settings', e)}
            aria-label="Table settings"
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Guest preview (overlay on long press) */}
      {isLongPressing && table.guests.length > 0 && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg p-2 z-10 min-w-32">
          <div className="text-xs font-medium mb-1">Seated Guests:</div>
          {table.guests.slice(0, 3).map((guest) => (
            <div key={guest.id} className="text-xs text-gray-600">
              {guest.firstName} {guest.lastName}
            </div>
          ))}
          {table.guests.length > 3 && (
            <div className="text-xs text-gray-500">
              +{table.guests.length - 3} more...
            </div>
          )}
        </div>
      )}

      {/* Accessibility enhancements */}
      <div className="sr-only">
        Table {table.name}, capacity {table.capacity}, currently has{' '}
        {table.guests.length} guests.
        {hasConflicts && ' This table has conflicts that need attention.'}
        {fillPercentage === 100 && ' This table is full.'}
        {table.guests.length === 0 && ' This table is empty.'}
      </div>
    </div>
  );
};
