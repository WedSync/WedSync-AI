'use client';

import React, {
  useState,
  useMemo,
  useCallback,
  useRef,
  useEffect,
  memo,
} from 'react';
import {
  format,
  addMinutes,
  differenceInMinutes,
  parseISO,
  startOfDay,
  isWithinInterval,
} from 'date-fns';
import { VirtualizedList } from '../performance/VirtualizedList';
import {
  usePerformanceMonitor,
  useMemoryOptimization,
} from '@/hooks/usePerformanceOptimization';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';
import {
  TimelineEvent,
  WeddingTimeline,
  TimelineConflict,
} from '@/types/timeline';
import {
  Clock,
  MapPin,
  Users,
  AlertTriangle,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Calendar,
} from 'lucide-react';

interface VirtualizedTimelineProps {
  timeline: WeddingTimeline;
  events: TimelineEvent[];
  conflicts?: TimelineConflict[];
  onEventUpdate: (eventId: string, update: Partial<TimelineEvent>) => void;
  onEventSelect?: (event: TimelineEvent | null) => void;
  onEventEdit?: (event: TimelineEvent) => void;
  onEventDelete?: (eventId: string) => void;
  selectedEventId?: string;
  viewMode?: 'timeline' | 'list' | 'agenda';
  timeRange?: { start: number; end: number };
  showConflicts?: boolean;
  className?: string;
  'data-testid'?: string;
}

interface VirtualizedTimelineItemData {
  id: string;
  type: 'time-slot' | 'event' | 'break' | 'conflict';
  timestamp: Date;
  event?: TimelineEvent;
  conflicts?: TimelineConflict[];
  duration?: number; // minutes
}

// Memoized timeline event component for optimal performance
const VirtualizedTimelineEvent = memo(function VirtualizedTimelineEvent({
  event,
  conflicts = [],
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  showConflicts,
}: {
  event: TimelineEvent;
  conflicts?: TimelineConflict[];
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  showConflicts: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { logMetric } = usePerformanceMonitor('VirtualizedTimelineEvent');

  const eventDuration = differenceInMinutes(
    parseISO(event.end_time),
    parseISO(event.start_time),
  );

  const hasConflicts = conflicts.length > 0;
  const criticalConflicts = conflicts.filter((c) => c.severity === 'error');

  const handleInteraction = useCallback(
    (action: string) => {
      logMetric('timelineEventInteraction', performance.now());
      logMetric(`timelineAction_${action}`, 1);
    },
    [logMetric],
  );

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-l-red-500 bg-red-50';
      case 'medium':
        return 'border-l-yellow-500 bg-yellow-50';
      case 'low':
        return 'border-l-blue-500 bg-blue-50';
      default:
        return 'border-l-gray-500 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <div className="w-2 h-2 bg-green-500 rounded-full" />;
      case 'tentative':
        return <div className="w-2 h-2 bg-yellow-500 rounded-full" />;
      case 'cancelled':
        return <div className="w-2 h-2 bg-red-500 rounded-full" />;
      default:
        return <div className="w-2 h-2 bg-gray-300 rounded-full" />;
    }
  };

  return (
    <div
      className={`relative bg-white border-l-4 rounded-lg border border-gray-200 p-4 transition-all duration-200 cursor-pointer ${getPriorityColor(
        event.priority || 'low',
      )} ${isSelected ? 'ring-2 ring-blue-500 shadow-md' : 'hover:shadow-sm'}`}
      onClick={() => {
        handleInteraction('select');
        onSelect();
      }}
      data-testid={`timeline-event-${event.id}`}
    >
      {/* Event Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {getStatusIcon(event.status || 'confirmed')}
            <h3 className="font-semibold text-gray-900 truncate">
              {event.title}
            </h3>
            {hasConflicts && showConflicts && (
              <div className="flex items-center gap-1">
                <AlertTriangle
                  className={`w-4 h-4 ${
                    criticalConflicts.length > 0
                      ? 'text-red-500'
                      : 'text-yellow-500'
                  }`}
                />
                <span className="text-xs text-red-600 font-medium">
                  {conflicts.length} conflict{conflicts.length !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>
                {format(parseISO(event.start_time), 'HH:mm')} -
                {format(parseISO(event.end_time), 'HH:mm')}
              </span>
              <span className="text-gray-400">({eventDuration}m)</span>
            </div>

            {event.location && (
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                <span className="truncate">{event.location}</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
              handleInteraction('expand');
            }}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleInteraction('edit');
              onEdit();
            }}
            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
            title="Edit event"
          >
            <Edit className="w-4 h-4" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleInteraction('delete');
              if (confirm(`Delete event "${event.title}"?`)) {
                onDelete();
              }
            }}
            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
            title="Delete event"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Event Details (when expanded) */}
      {isExpanded && (
        <div className="border-t pt-3 mt-3 space-y-2">
          {event.description && (
            <p className="text-sm text-gray-700">{event.description}</p>
          )}

          {event.vendors && event.vendors.length > 0 && (
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-500" />
              <div className="flex flex-wrap gap-1">
                {event.vendors.map((vendor, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                  >
                    {vendor.vendor_name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {event.notes && (
            <div className="text-sm text-gray-600">
              <strong>Notes:</strong> {event.notes}
            </div>
          )}

          {event.estimated_cost && (
            <div className="text-sm text-gray-600">
              <strong>Est. Cost:</strong> $
              {event.estimated_cost.toLocaleString()}
            </div>
          )}

          {/* Conflict Details */}
          {showConflicts && conflicts.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <h4 className="text-sm font-medium text-red-800 mb-2">
                Conflicts Detected:
              </h4>
              <div className="space-y-1">
                {conflicts.slice(0, 3).map((conflict, index) => (
                  <div key={index} className="text-sm text-red-700">
                    • {conflict.description}
                  </div>
                ))}
                {conflicts.length > 3 && (
                  <div className="text-sm text-red-600">
                    ... and {conflicts.length - 3} more conflicts
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

// Time slot separator component
const TimeSlotSeparator = memo(function TimeSlotSeparator({
  time,
  isCurrentTime = false,
}: {
  time: Date;
  isCurrentTime?: boolean;
}) {
  return (
    <div
      className={`flex items-center py-2 ${isCurrentTime ? 'bg-red-50' : ''}`}
    >
      <div
        className={`flex items-center gap-3 ${
          isCurrentTime ? 'text-red-600 font-medium' : 'text-gray-500'
        }`}
      >
        <div
          className={`w-16 text-right text-sm ${
            isCurrentTime ? 'font-semibold' : ''
          }`}
        >
          {format(time, 'HH:mm')}
        </div>
        <div
          className={`flex-1 h-px ${
            isCurrentTime ? 'bg-red-300' : 'bg-gray-200'
          }`}
        />
        {isCurrentTime && (
          <div className="flex items-center gap-1 text-xs bg-red-100 px-2 py-1 rounded-full">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            Now
          </div>
        )}
      </div>
    </div>
  );
});

export const VirtualizedTimeline: React.FC<VirtualizedTimelineProps> = ({
  timeline,
  events,
  conflicts = [],
  onEventUpdate,
  onEventSelect,
  onEventEdit,
  onEventDelete,
  selectedEventId,
  viewMode = 'timeline',
  timeRange = { start: 6, end: 24 },
  showConflicts = true,
  className = '',
  'data-testid': testId,
}) => {
  const [currentTime] = useState(new Date());
  const { addObserver } = useMemoryOptimization();
  const { logMetric } = usePerformanceMonitor('VirtualizedTimeline');
  const containerRef = useRef<HTMLDivElement>(null);

  // Create timeline start and end times
  const timelineStartTime = useMemo(() => {
    const weddingDate = parseISO(timeline.wedding_date);
    const start = startOfDay(weddingDate);
    return addMinutes(start, timeRange.start * 60);
  }, [timeline.wedding_date, timeRange.start]);

  const timelineEndTime = useMemo(() => {
    const weddingDate = parseISO(timeline.wedding_date);
    const start = startOfDay(weddingDate);
    return addMinutes(start, timeRange.end * 60);
  }, [timeline.wedding_date, timeRange.end]);

  // Create virtualized timeline items
  const virtualizedItems = useMemo(() => {
    const startTime = performance.now();
    const items: VirtualizedTimelineItemData[] = [];
    const timeSlotInterval = 30; // 30-minute intervals

    // Sort events by start time
    const sortedEvents = [...events].sort(
      (a, b) =>
        parseISO(a.start_time).getTime() - parseISO(b.start_time).getTime(),
    );

    // Generate time slots and insert events
    let currentSlotTime = new Date(timelineStartTime);
    let eventIndex = 0;

    while (currentSlotTime <= timelineEndTime) {
      const slotEndTime = addMinutes(currentSlotTime, timeSlotInterval);

      // Add time slot separator
      const isCurrentTimeSlot = isWithinInterval(currentTime, {
        start: currentSlotTime,
        end: slotEndTime,
      });

      items.push({
        id: `time-slot-${currentSlotTime.getTime()}`,
        type: 'time-slot',
        timestamp: new Date(currentSlotTime),
        duration: timeSlotInterval,
      });

      // Add events that start in this time slot
      while (eventIndex < sortedEvents.length) {
        const event = sortedEvents[eventIndex];
        const eventStartTime = parseISO(event.start_time);

        if (eventStartTime >= currentSlotTime && eventStartTime < slotEndTime) {
          // Find conflicts for this event
          const eventConflicts = conflicts.filter(
            (c) => c.event_id_1 === event.id || c.event_id_2 === event.id,
          );

          items.push({
            id: event.id,
            type: 'event',
            timestamp: eventStartTime,
            event,
            conflicts: eventConflicts,
            duration: differenceInMinutes(
              parseISO(event.end_time),
              eventStartTime,
            ),
          });

          eventIndex++;
        } else if (eventStartTime >= slotEndTime) {
          break;
        } else {
          eventIndex++;
        }
      }

      currentSlotTime = slotEndTime;
    }

    const processingTime = performance.now() - startTime;
    logMetric('timelineVirtualizationProcessing', processingTime);
    logMetric('virtualizedTimelineItems', items.length);

    return items;
  }, [
    events,
    conflicts,
    timelineStartTime,
    timelineEndTime,
    currentTime,
    logMetric,
  ]);

  // Memory optimization
  useEffect(() => {
    const observer = addObserver(
      'VirtualizedTimeline',
      virtualizedItems.length,
    );
    return () => observer?.disconnect();
  }, [addObserver, virtualizedItems.length]);

  // Event handlers
  const handleEventSelect = useCallback(
    (event: TimelineEvent | null) => {
      logMetric('timelineEventSelected', performance.now());
      onEventSelect?.(event);
    },
    [onEventSelect, logMetric],
  );

  const handleEventEdit = useCallback(
    (event: TimelineEvent) => {
      logMetric('timelineEventEdited', performance.now());
      onEventEdit?.(event);
    },
    [onEventEdit, logMetric],
  );

  const handleEventDelete = useCallback(
    (eventId: string) => {
      logMetric('timelineEventDeleted', performance.now());
      onEventDelete?.(eventId);
    },
    [onEventDelete, logMetric],
  );

  // Render timeline item
  const renderTimelineItem = useCallback(
    (item: VirtualizedTimelineItemData, index: number) => {
      if (item.type === 'time-slot') {
        const isCurrentTimeSlot = isWithinInterval(currentTime, {
          start: item.timestamp,
          end: addMinutes(item.timestamp, item.duration || 30),
        });

        return (
          <TimeSlotSeparator
            key={item.id}
            time={item.timestamp}
            isCurrentTime={isCurrentTimeSlot}
          />
        );
      }

      if (item.type === 'event' && item.event) {
        return (
          <div key={item.id} className="px-4 py-2">
            <VirtualizedTimelineEvent
              event={item.event}
              conflicts={item.conflicts || []}
              isSelected={selectedEventId === item.event.id}
              onSelect={() => handleEventSelect(item.event!)}
              onEdit={() => handleEventEdit(item.event!)}
              onDelete={() => handleEventDelete(item.event!.id)}
              showConflicts={showConflicts}
            />
          </div>
        );
      }

      return null;
    },
    [
      currentTime,
      selectedEventId,
      showConflicts,
      handleEventSelect,
      handleEventEdit,
      handleEventDelete,
    ],
  );

  // Different view modes
  if (viewMode === 'list') {
    return (
      <div
        className={`bg-white rounded-lg shadow-sm ${className}`}
        data-testid={testId}
      >
        {/* Header */}
        <div className="border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Events List</h2>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">
                {events.length} events • {conflicts.length} conflicts
              </span>
            </div>
          </div>
        </div>

        {/* Simple list view */}
        <div className="divide-y divide-gray-200">
          {events.map((event) => {
            const eventConflicts = conflicts.filter(
              (c) => c.event_id_1 === event.id || c.event_id_2 === event.id,
            );

            return (
              <div key={event.id} className="p-4">
                <VirtualizedTimelineEvent
                  event={event}
                  conflicts={eventConflicts}
                  isSelected={selectedEventId === event.id}
                  onSelect={() => handleEventSelect(event)}
                  onEdit={() => handleEventEdit(event)}
                  onDelete={() => handleEventDelete(event.id)}
                  showConflicts={showConflicts}
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (viewMode === 'agenda') {
    // Group events by hour for agenda view
    const eventsByHour = useMemo(() => {
      const groups = new Map<number, TimelineEvent[]>();

      events.forEach((event) => {
        const hour = parseISO(event.start_time).getHours();
        if (!groups.has(hour)) {
          groups.set(hour, []);
        }
        groups.get(hour)!.push(event);
      });

      return groups;
    }, [events]);

    return (
      <div
        className={`bg-white rounded-lg shadow-sm ${className}`}
        data-testid={testId}
      >
        <div className="border-b px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Agenda View</h2>
        </div>

        <div className="p-4 space-y-4">
          {Array.from(eventsByHour.entries())
            .sort(([a], [b]) => a - b)
            .map(([hour, hourEvents]) => (
              <div key={hour} className="space-y-2">
                <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {format(new Date().setHours(hour, 0, 0, 0), 'HH:mm')}
                </h3>
                <div className="pl-6 space-y-2">
                  {hourEvents.map((event) => {
                    const eventConflicts = conflicts.filter(
                      (c) =>
                        c.event_id_1 === event.id || c.event_id_2 === event.id,
                    );

                    return (
                      <VirtualizedTimelineEvent
                        key={event.id}
                        event={event}
                        conflicts={eventConflicts}
                        isSelected={selectedEventId === event.id}
                        onSelect={() => handleEventSelect(event)}
                        onEdit={() => handleEventEdit(event)}
                        onDelete={() => handleEventDelete(event.id)}
                        showConflicts={showConflicts}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
        </div>
      </div>
    );
  }

  // Default timeline view with virtualization
  return (
    <div
      className={`flex flex-col h-full bg-white rounded-lg shadow-sm ${className}`}
      data-testid={testId}
    >
      {/* Header */}
      <div className="border-b px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {timeline.title} Timeline
          </h2>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">
              {format(parseISO(timeline.wedding_date), 'EEEE, MMMM d, yyyy')}
            </span>
            <span className="text-sm text-gray-500">
              {events.length} events
            </span>
            {conflicts.length > 0 && (
              <div className="flex items-center gap-1 text-sm text-red-600">
                <AlertTriangle className="w-4 h-4" />
                {conflicts.length} conflicts
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Virtualized Timeline */}
      <div className="flex-1 min-h-0" ref={containerRef}>
        <VirtualizedList
          items={virtualizedItems}
          itemHeight={80} // Estimated height per item
          containerHeight="100%"
          renderItem={renderTimelineItem}
          keyExtractor={(item) => item.id}
          overscan={5}
          className="h-full"
          data-testid="virtualized-timeline-list"
        />
      </div>

      {/* Performance Debug (development only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="p-2 text-xs text-gray-500 bg-gray-50 border-t">
          Rendering {virtualizedItems.length} timeline items • Events:{' '}
          {events.length} • Conflicts: {conflicts.length} • Time Range:{' '}
          {format(timelineStartTime, 'HH:mm')} -{' '}
          {format(timelineEndTime, 'HH:mm')}
        </div>
      )}
    </div>
  );
};
