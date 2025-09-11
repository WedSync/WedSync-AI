'use client';

import React, { useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useTouchDrag, useHaptic, useLongPress } from '@/hooks/useTouch';
import {
  Clock,
  MapPin,
  Users,
  GripVertical,
  Edit2,
  Trash2,
  Check,
} from 'lucide-react';
import { format, addMinutes } from 'date-fns';

interface TimelineEvent {
  id: string;
  title: string;
  time: string;
  duration: number;
  location?: string;
  attendees?: number;
  description?: string;
  type:
    | 'ceremony'
    | 'reception'
    | 'preparation'
    | 'photo'
    | 'transport'
    | 'other';
  status?: 'pending' | 'in-progress' | 'completed';
}

interface TouchTimelineProps {
  events: TimelineEvent[];
  onEventUpdate?: (eventId: string, updates: Partial<TimelineEvent>) => void;
  onEventReorder?: (events: TimelineEvent[]) => void;
  onEventDelete?: (eventId: string) => void;
  onEventEdit?: (event: TimelineEvent) => void;
  className?: string;
  editable?: boolean;
}

export function TouchTimeline({
  events: initialEvents,
  onEventUpdate,
  onEventReorder,
  onEventDelete,
  onEventEdit,
  className,
  editable = true,
}: TouchTimelineProps) {
  const [events, setEvents] = useState(initialEvents);
  const [draggedEvent, setDraggedEvent] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<string | null>(null);
  const haptic = useHaptic();
  const containerRef = useRef<HTMLDivElement>(null);
  const draggedOverRef = useRef<string | null>(null);

  // Handle drag and drop for reordering
  const handleDragStart = useCallback(
    (eventId: string) => {
      setDraggedEvent(eventId);
      haptic.medium();
    },
    [haptic],
  );

  const handleDragOver = useCallback(
    (eventId: string) => {
      if (draggedEvent && draggedEvent !== eventId) {
        draggedOverRef.current = eventId;

        // Reorder events
        const draggedIndex = events.findIndex((e) => e.id === draggedEvent);
        const targetIndex = events.findIndex((e) => e.id === eventId);

        if (draggedIndex !== -1 && targetIndex !== -1) {
          const newEvents = [...events];
          const [removed] = newEvents.splice(draggedIndex, 1);
          newEvents.splice(targetIndex, 0, removed);

          setEvents(newEvents);
          haptic.light();
        }
      }
    },
    [draggedEvent, events, haptic],
  );

  const handleDragEnd = useCallback(() => {
    if (draggedEvent) {
      onEventReorder?.(events);
      haptic.success();
    }
    setDraggedEvent(null);
    draggedOverRef.current = null;
  }, [draggedEvent, events, onEventReorder, haptic]);

  // Toggle event status with tap
  const handleStatusToggle = useCallback(
    (eventId: string) => {
      const event = events.find((e) => e.id === eventId);
      if (!event) return;

      const statusFlow: Record<string, TimelineEvent['status']> = {
        pending: 'in-progress',
        'in-progress': 'completed',
        completed: 'pending',
      };

      const newStatus = statusFlow[event.status || 'pending'];
      onEventUpdate?.(eventId, { status: newStatus });

      // Update local state
      setEvents((prev) =>
        prev.map((e) => (e.id === eventId ? { ...e, status: newStatus } : e)),
      );

      haptic.light();
    },
    [events, onEventUpdate, haptic],
  );

  // Get status color
  const getStatusColor = (status?: TimelineEvent['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-success-100 text-success-700 border-success-200';
      case 'in-progress':
        return 'bg-primary-100 text-primary-700 border-primary-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  // Get event type color
  const getEventTypeColor = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'ceremony':
        return 'bg-purple-500';
      case 'reception':
        return 'bg-pink-500';
      case 'preparation':
        return 'bg-blue-500';
      case 'photo':
        return 'bg-yellow-500';
      case 'transport':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div ref={containerRef} className={cn('space-y-2', className)}>
      {events.map((event, index) => {
        const { handlers: dragHandlers } = useTouchDrag({
          onDragStart: () => handleDragStart(event.id),
          onDragMove: () => {
            // Visual feedback during drag
          },
          onDragEnd: handleDragEnd,
        });

        const { handlers: longPressHandlers } = useLongPress(() => {
          setEditMode(event.id);
          haptic.medium();
        }, 500);

        const isBeingDragged = draggedEvent === event.id;
        const isEditMode = editMode === event.id;

        return (
          <div
            key={event.id}
            className={cn(
              'relative bg-white rounded-xl shadow-sm border transition-all',
              'min-h-[80px]', // Minimum touch target height
              isBeingDragged && 'opacity-50 scale-95',
              isEditMode && 'ring-2 ring-primary-500',
            )}
            onTouchMove={() => handleDragOver(event.id)}
          >
            {/* Timeline connector */}
            {index < events.length - 1 && (
              <div className="absolute left-6 top-full h-8 w-0.5 bg-gray-300 z-0" />
            )}

            <div className="relative flex items-stretch">
              {/* Drag handle */}
              {editable && (
                <div
                  className="flex items-center justify-center px-3 cursor-move touch-none bg-gray-50 rounded-l-xl"
                  {...dragHandlers}
                >
                  <GripVertical className="w-5 h-5 text-gray-400" />
                </div>
              )}

              {/* Event marker */}
              <div className="flex items-center justify-center px-2">
                <div
                  className={cn(
                    'w-3 h-3 rounded-full',
                    getEventTypeColor(event.type),
                  )}
                />
              </div>

              {/* Event content */}
              <div
                className="flex-1 p-4"
                {...(editable ? longPressHandlers : {})}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">
                      {event.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-600">
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        {event.time} ({event.duration} min)
                      </div>

                      {event.location && (
                        <div className="flex items-center">
                          <MapPin className="w-4 h-4 mr-1" />
                          {event.location}
                        </div>
                      )}

                      {event.attendees && (
                        <div className="flex items-center">
                          <Users className="w-4 h-4 mr-1" />
                          {event.attendees}
                        </div>
                      )}
                    </div>

                    {event.description && (
                      <p className="mt-2 text-sm text-gray-500">
                        {event.description}
                      </p>
                    )}
                  </div>

                  {/* Status badge */}
                  <button
                    onClick={() => handleStatusToggle(event.id)}
                    className={cn(
                      'ml-3 px-3 py-1.5 rounded-full text-xs font-medium border',
                      'min-w-[44px] min-h-[32px]', // Touch target
                      getStatusColor(event.status),
                    )}
                  >
                    {event.status === 'completed' && (
                      <Check className="w-3 h-3 inline mr-1" />
                    )}
                    {event.status || 'pending'}
                  </button>
                </div>

                {/* Edit mode actions */}
                {isEditMode && (
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                    <button
                      onClick={() => {
                        onEventEdit?.(event);
                        setEditMode(null);
                        haptic.light();
                      }}
                      className="flex items-center px-4 py-2 bg-primary-50 text-primary-700 rounded-lg min-h-[44px]"
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      Edit
                    </button>

                    <button
                      onClick={() => {
                        onEventDelete?.(event.id);
                        setEditMode(null);
                        haptic.success();
                      }}
                      className="flex items-center px-4 py-2 bg-error-50 text-error-700 rounded-lg min-h-[44px]"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </button>

                    <button
                      onClick={() => {
                        setEditMode(null);
                        haptic.light();
                      }}
                      className="ml-auto px-4 py-2 text-gray-600 min-h-[44px]"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Empty state */}
      {events.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No timeline events yet</p>
          <p className="text-sm mt-1">Tap + to add your first event</p>
        </div>
      )}
    </div>
  );
}
