'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  UniqueIdentifier,
  MeasuringStrategy,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { restrictToWindowEdges } from '@dnd-kit/modifiers';
import {
  format,
  addMinutes,
  differenceInMinutes,
  parseISO,
  startOfDay,
  endOfDay,
} from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Clock,
  Calendar,
  MapPin,
  Users,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Save,
  Undo,
  Redo,
  Eye,
  EyeOff,
  Settings,
  Download,
  Share2,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Grid3x3,
  Layers,
  Lock,
  Unlock,
} from 'lucide-react';

import type {
  WeddingTimeline,
  TimelineEvent,
  TimelineConflict,
  DragItem,
  DropResult,
  TimelinePosition,
  EventStatus,
  EventPriority,
} from '@/types/timeline';

import { TimelineEventCard } from './TimelineEventCard';
import { TimelineRuler } from './TimelineRuler';
import { TimelineConflictIndicator } from './TimelineConflictIndicator';
import { TimelineEventForm } from './TimelineEventForm';
import { TimelineVendorPanel } from './TimelineVendorPanel';
import { TimelineRealtimeIndicator } from './TimelineRealtimeIndicator';
import { useTimelineRealtime } from '@/hooks/useTimelineRealtime';
import { useTimelineStore } from '@/stores/timelineStore';

interface InteractiveTimelineBuilderProps {
  timeline: WeddingTimeline;
  onTimelineUpdate: (timeline: Partial<WeddingTimeline>) => void;
  onEventUpdate: (eventId: string, update: Partial<TimelineEvent>) => void;
  onEventCreate: (event: Partial<TimelineEvent>) => void;
  onEventDelete: (eventId: string) => void;
  className?: string;
}

export function InteractiveTimelineBuilder({
  timeline,
  onTimelineUpdate,
  onEventUpdate,
  onEventCreate,
  onEventDelete,
  className,
}: InteractiveTimelineBuilderProps) {
  // State
  const [events, setEvents] = useState<TimelineEvent[]>(timeline.events || []);
  const [conflicts, setConflicts] = useState<TimelineConflict[]>(
    timeline.conflicts || [],
  );
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(
    null,
  );
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [showEventForm, setShowEventForm] = useState(false);
  const [showVendorPanel, setShowVendorPanel] = useState(false);
  const [viewMode, setViewMode] = useState<'timeline' | 'grid'>('timeline');
  const [zoomLevel, setZoomLevel] = useState(1); // 0.5 to 2
  const [timeRange, setTimeRange] = useState({ start: 6, end: 24 }); // hours
  const [showLayers, setShowLayers] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [gridSize, setGridSize] = useState(15); // minutes

  // Store and realtime hooks
  const { undoStack, redoStack, addToHistory, undo, redo, canUndo, canRedo } =
    useTimelineStore();

  const { presenceData, sendUpdate, subscribeToUpdates } = useTimelineRealtime(
    timeline.id,
  );

  // DnD Kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Measuring configuration for better drag performance
  const measuringConfig = {
    droppable: {
      strategy: MeasuringStrategy.Always,
    },
  };

  // Calculate timeline dimensions
  const pixelsPerHour = 120 * zoomLevel;
  const pixelsPerMinute = pixelsPerHour / 60;
  const timelineWidth = (timeRange.end - timeRange.start) * pixelsPerHour;
  const timelineStartTime = useMemo(() => {
    const date = parseISO(timeline.wedding_date);
    const start = startOfDay(date);
    return addMinutes(start, timeRange.start * 60);
  }, [timeline.wedding_date, timeRange.start]);

  // Convert pixel position to time
  const pixelToTime = useCallback(
    (pixels: number): Date => {
      const minutes = pixels / pixelsPerMinute;
      return addMinutes(timelineStartTime, minutes);
    },
    [pixelsPerMinute, timelineStartTime],
  );

  // Convert time to pixel position
  const timeToPixel = useCallback(
    (time: Date | string): number => {
      const date = typeof time === 'string' ? parseISO(time) : time;
      const minutes = differenceInMinutes(date, timelineStartTime);
      return minutes * pixelsPerMinute;
    },
    [pixelsPerMinute, timelineStartTime],
  );

  // Snap time to grid
  const snapTimeToGrid = useCallback(
    (time: Date): Date => {
      if (!snapToGrid) return time;

      const minutes = time.getMinutes();
      const snappedMinutes = Math.round(minutes / gridSize) * gridSize;
      const result = new Date(time);
      result.setMinutes(snappedMinutes);
      return result;
    },
    [snapToGrid, gridSize],
  );

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const draggedEvent = events.find((e) => e.id === active.id);

    if (draggedEvent) {
      setActiveId(active.id);
      setSelectedEvent(draggedEvent);

      // Send realtime update
      sendUpdate({
        type: 'drag_start',
        event_id: draggedEvent.id,
        user_id: 'current_user', // Replace with actual user ID
      });
    }
  };

  // Handle drag over
  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;

    if (!over) return;

    // Calculate new position based on drag
    const draggedEvent = events.find((e) => e.id === active.id);
    if (!draggedEvent) return;

    // Send realtime cursor update
    sendUpdate({
      type: 'cursor_move',
      position: {
        x: event.delta.x,
        y: event.delta.y,
      },
      user_id: 'current_user',
    });
  };

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveId(null);
      return;
    }

    const draggedEvent = events.find((e) => e.id === active.id);
    if (!draggedEvent) return;

    // Calculate new time based on drop position
    const dropX = event.delta.x;
    const originalStartPixel = timeToPixel(draggedEvent.start_time);
    const newStartPixel = originalStartPixel + dropX;
    const newStartTime = snapTimeToGrid(pixelToTime(newStartPixel));

    // Calculate duration and new end time
    const duration = differenceInMinutes(
      parseISO(draggedEvent.end_time),
      parseISO(draggedEvent.start_time),
    );
    const newEndTime = addMinutes(newStartTime, duration);

    // Update event
    const updatedEvent = {
      ...draggedEvent,
      start_time: newStartTime.toISOString(),
      end_time: newEndTime.toISOString(),
    };

    // Check for conflicts
    const newConflicts = detectConflicts(
      updatedEvent,
      events.filter((e) => e.id !== active.id),
    );

    // Update state
    const updatedEvents = events.map((e) =>
      e.id === active.id ? updatedEvent : e,
    );
    setEvents(updatedEvents);
    setConflicts(newConflicts);

    // Add to history for undo/redo
    addToHistory({
      type: 'event_move',
      before: draggedEvent,
      after: updatedEvent,
    });

    // Send update to parent
    onEventUpdate(draggedEvent.id, {
      start_time: updatedEvent.start_time,
      end_time: updatedEvent.end_time,
    });

    // Send realtime update
    sendUpdate({
      type: 'event_update',
      event: updatedEvent,
      user_id: 'current_user',
    });

    setActiveId(null);
  };

  // Detect conflicts between events
  const detectConflicts = (
    event: TimelineEvent,
    otherEvents: TimelineEvent[],
  ): TimelineConflict[] => {
    const conflicts: TimelineConflict[] = [];
    const eventStart = parseISO(event.start_time);
    const eventEnd = parseISO(event.end_time);

    otherEvents.forEach((other) => {
      const otherStart = parseISO(other.start_time);
      const otherEnd = parseISO(other.end_time);

      // Check time overlap
      if (
        (eventStart >= otherStart && eventStart < otherEnd) ||
        (eventEnd > otherStart && eventEnd <= otherEnd) ||
        (eventStart <= otherStart && eventEnd >= otherEnd)
      ) {
        // Check if on same layer
        if (event.layer === other.layer) {
          conflicts.push({
            id: `conflict-${event.id}-${other.id}`,
            timeline_id: timeline.id,
            conflict_type: 'time_overlap',
            severity: 'warning',
            event_id_1: event.id,
            event_id_2: other.id,
            description: `"${event.title}" overlaps with "${other.title}"`,
            suggestion: 'Move one event to a different layer or adjust timing',
            is_resolved: false,
            can_auto_resolve: true,
            detected_at: new Date().toISOString(),
            last_checked_at: new Date().toISOString(),
          });
        }
      }

      // Check vendor conflicts
      const eventVendors = event.vendors?.map((v) => v.vendor_id) || [];
      const otherVendors = other.vendors?.map((v) => v.vendor_id) || [];
      const commonVendors = eventVendors.filter((v) =>
        otherVendors.includes(v),
      );

      if (
        commonVendors.length > 0 &&
        ((eventStart >= otherStart && eventStart < otherEnd) ||
          (eventEnd > otherStart && eventEnd <= otherEnd))
      ) {
        conflicts.push({
          id: `vendor-conflict-${event.id}-${other.id}`,
          timeline_id: timeline.id,
          conflict_type: 'vendor_overlap',
          severity: 'error',
          event_id_1: event.id,
          event_id_2: other.id,
          description: `Vendor scheduled for both "${event.title}" and "${other.title}"`,
          suggestion: 'Reassign vendor or adjust event timing',
          is_resolved: false,
          can_auto_resolve: false,
          detected_at: new Date().toISOString(),
          last_checked_at: new Date().toISOString(),
        });
      }
    });

    return conflicts;
  };

  // Zoom controls
  const handleZoomIn = () => setZoomLevel(Math.min(2, zoomLevel + 0.25));
  const handleZoomOut = () => setZoomLevel(Math.max(0.5, zoomLevel - 0.25));
  const handleZoomReset = () => setZoomLevel(1);

  // Export timeline
  const handleExport = async (format: 'pdf' | 'csv' | 'ical') => {
    // TODO: Implement timeline export functionality
    // Format options: PDF, CSV, iCal
  };

  // Share timeline
  const handleShare = async () => {
    // TODO: Implement timeline sharing functionality
    // Enable timeline link sharing with permissions
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Z for undo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) undo();
      }
      // Ctrl/Cmd + Shift + Z for redo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        if (canRedo) redo();
      }
      // Ctrl/Cmd + S for save
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        // Trigger save
      }
      // Delete key for deleting selected event
      if (e.key === 'Delete' && selectedEvent) {
        e.preventDefault();
        onEventDelete(selectedEvent.id);
        setSelectedEvent(null);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [canUndo, canRedo, selectedEvent, undo, redo, onEventDelete]);

  return (
    <div className={cn('bg-white rounded-xl shadow-sm', className)}>
      {/* Header Toolbar */}
      <div className="border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Timeline Builder
            </h2>
            <div className="flex items-center gap-1">
              <button
                onClick={() => canUndo && undo()}
                disabled={!canUndo}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  canUndo
                    ? 'text-gray-700 hover:bg-gray-100'
                    : 'text-gray-300 cursor-not-allowed',
                )}
                title="Undo (Ctrl+Z)"
              >
                <Undo className="w-4 h-4" />
              </button>
              <button
                onClick={() => canRedo && redo()}
                disabled={!canRedo}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  canRedo
                    ? 'text-gray-700 hover:bg-gray-100'
                    : 'text-gray-300 cursor-not-allowed',
                )}
                title="Redo (Ctrl+Shift+Z)"
              >
                <Redo className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* View Controls */}
            <div className="flex items-center gap-1 border-r pr-3">
              <button
                onClick={() => setViewMode('timeline')}
                className={cn(
                  'px-3 py-1.5 text-sm rounded-lg transition-colors',
                  viewMode === 'timeline'
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100',
                )}
              >
                Timeline
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  'px-3 py-1.5 text-sm rounded-lg transition-colors',
                  viewMode === 'grid'
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100',
                )}
              >
                Grid
              </button>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-1">
              <button
                onClick={handleZoomOut}
                className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={handleZoomReset}
                className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {Math.round(zoomLevel * 100)}%
              </button>
              <button
                onClick={handleZoomIn}
                className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>

            {/* Options */}
            <div className="flex items-center gap-1 border-l pl-3">
              <button
                onClick={() => setShowLayers(!showLayers)}
                className={cn(
                  'p-1.5 rounded-lg transition-colors',
                  showLayers
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100',
                )}
                title="Toggle Layers"
              >
                <Layers className="w-4 h-4" />
              </button>
              <button
                onClick={() => setSnapToGrid(!snapToGrid)}
                className={cn(
                  'p-1.5 rounded-lg transition-colors',
                  snapToGrid
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100',
                )}
                title="Snap to Grid"
              >
                <Grid3x3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowVendorPanel(!showVendorPanel)}
                className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Vendor Panel"
              >
                <Users className="w-4 h-4" />
              </button>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 border-l pl-3">
              <button
                onClick={() => setShowEventForm(true)}
                className="flex items-center gap-1 px-3 py-1.5 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Event
              </button>
              <button
                onClick={() => handleShare()}
                className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Share"
              >
                <Share2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleExport('pdf')}
                className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Export"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Conflict Warning Bar */}
        {conflicts.length > 0 && (
          <div className="flex items-center gap-2 mt-3 px-3 py-2 bg-yellow-50 text-yellow-800 rounded-lg">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm">
              {conflicts.length} conflict{conflicts.length !== 1 ? 's' : ''}{' '}
              detected
            </span>
            <button className="ml-auto text-xs font-medium hover:underline">
              View Details
            </button>
          </div>
        )}
      </div>

      {/* Main Timeline Area */}
      <div className="relative flex">
        {/* Timeline Content */}
        <div className="flex-1 overflow-x-auto">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            measuring={measuringConfig}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            {viewMode === 'timeline' ? (
              <div className="relative" style={{ width: timelineWidth }}>
                {/* Time Ruler */}
                <TimelineRuler
                  startTime={timelineStartTime}
                  endTime={addMinutes(
                    timelineStartTime,
                    (timeRange.end - timeRange.start) * 60,
                  )}
                  pixelsPerHour={pixelsPerHour}
                  snapToGrid={snapToGrid}
                  gridSize={gridSize}
                />

                {/* Timeline Layers */}
                <div className="relative mt-12" style={{ minHeight: '400px' }}>
                  {/* Grid Lines */}
                  {snapToGrid && (
                    <div className="absolute inset-0 pointer-events-none">
                      {Array.from({
                        length: Math.floor(
                          ((timeRange.end - timeRange.start) * 60) / gridSize,
                        ),
                      }).map((_, i) => (
                        <div
                          key={i}
                          className="absolute top-0 bottom-0 w-px bg-gray-100"
                          style={{
                            left: `${i * gridSize * pixelsPerMinute}px`,
                          }}
                        />
                      ))}
                    </div>
                  )}

                  {/* Current Time Indicator */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none z-10"
                    style={{ left: `${timeToPixel(new Date())}px` }}
                  >
                    <div className="absolute -top-1 -left-1 w-2 h-2 bg-red-500 rounded-full" />
                  </div>

                  {/* Events */}
                  <SortableContext
                    items={events.map((e) => e.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {events.map((event, index) => (
                      <TimelineEventCard
                        key={event.id}
                        event={event}
                        position={{
                          x: timeToPixel(event.start_time),
                          width:
                            differenceInMinutes(
                              parseISO(event.end_time),
                              parseISO(event.start_time),
                            ) * pixelsPerMinute,
                          y: showLayers ? (event.layer || 0) * 80 : index * 80,
                        }}
                        isSelected={selectedEvent?.id === event.id}
                        isDragging={activeId === event.id}
                        conflicts={conflicts.filter(
                          (c) =>
                            c.event_id_1 === event.id ||
                            c.event_id_2 === event.id,
                        )}
                        onSelect={() => setSelectedEvent(event)}
                        onEdit={() => {
                          setSelectedEvent(event);
                          setShowEventForm(true);
                        }}
                        onDelete={() => onEventDelete(event.id)}
                      />
                    ))}
                  </SortableContext>

                  {/* Realtime Cursors and Indicators */}
                  <TimelineRealtimeIndicator
                    presenceData={presenceData}
                    timeToPixel={timeToPixel}
                  />
                </div>
              </div>
            ) : (
              // Grid View
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {events.map((event) => (
                  <div
                    key={event.id}
                    className={cn(
                      'p-4 border rounded-lg cursor-pointer transition-all',
                      selectedEvent?.id === event.id
                        ? 'border-primary-500 shadow-md'
                        : 'border-gray-200 hover:shadow-sm',
                    )}
                    onClick={() => setSelectedEvent(event)}
                  >
                    <h3 className="font-medium text-gray-900">{event.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {format(parseISO(event.start_time), 'HH:mm')} -{' '}
                      {format(parseISO(event.end_time), 'HH:mm')}
                    </p>
                    {event.location && (
                      <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {event.location}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Drag Overlay */}
            <DragOverlay modifiers={[restrictToWindowEdges]}>
              {activeId && (
                <div className="bg-white border-2 border-primary-500 rounded-lg p-3 shadow-xl">
                  <p className="font-medium">
                    {events.find((e) => e.id === activeId)?.title}
                  </p>
                </div>
              )}
            </DragOverlay>
          </DndContext>
        </div>

        {/* Vendor Panel */}
        {showVendorPanel && (
          <TimelineVendorPanel
            events={events}
            onAssignVendor={(eventId, vendorId) => {
              // Handle vendor assignment
            }}
            onClose={() => setShowVendorPanel(false)}
          />
        )}
      </div>

      {/* Event Form Modal */}
      {showEventForm && (
        <TimelineEventForm
          event={selectedEvent}
          timeline={timeline}
          onSave={(eventData) => {
            if (selectedEvent) {
              onEventUpdate(selectedEvent.id, eventData);
            } else {
              onEventCreate(eventData);
            }
            setShowEventForm(false);
            setSelectedEvent(null);
          }}
          onClose={() => {
            setShowEventForm(false);
            setSelectedEvent(null);
          }}
        />
      )}
    </div>
  );
}
