'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  Calendar,
  MapPin,
  Users,
  AlertTriangle,
  CheckCircle2,
  Play,
  Pause,
  SkipForward,
  MoreVertical,
  Edit3,
  Trash2,
  Plus,
  ArrowUp,
  ArrowDown,
  Timer,
  Cloud,
  CloudRain,
  Sun,
  AlertCircleIcon,
  Info,
  Zap,
  Target,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  format,
  addMinutes,
  differenceInMinutes,
  isAfter,
  isBefore,
} from 'date-fns';
import type { TimelineEvent, VendorCheckIn } from '@/types/wedding-day';

const priorityColors = {
  low: 'bg-gray-100 text-gray-700 border-gray-300',
  medium: 'bg-blue-100 text-blue-700 border-blue-300',
  high: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  critical: 'bg-red-100 text-red-700 border-red-300',
};

const statusColors = {
  pending: 'bg-gray-100 text-gray-800 border-gray-200',
  'in-progress': 'bg-blue-100 text-blue-800 border-blue-200',
  completed: 'bg-green-100 text-green-800 border-green-200',
  delayed: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
};

interface WeddingDayTimelineProps {
  timeline: TimelineEvent[];
  vendors: VendorCheckIn[];
  onTimelineUpdate: (eventId: string, update: Partial<TimelineEvent>) => void;
  className?: string;
}

export function WeddingDayTimeline({
  timeline,
  vendors,
  onTimelineUpdate,
  className,
}: WeddingDayTimelineProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(
    null,
  );
  const [showEditModal, setShowEditModal] = useState(false);
  const [viewMode, setViewMode] = useState<'timeline' | 'list'>('timeline');
  const [timeRange, setTimeRange] = useState<'all' | 'current' | 'upcoming'>(
    'all',
  );

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // Sort timeline events by start time
  const sortedTimeline = useMemo(() => {
    return [...timeline].sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    );
  }, [timeline]);

  // Filter events based on time range
  const filteredTimeline = useMemo(() => {
    const now = currentTime;
    const twoHoursFromNow = addMinutes(now, 120);

    switch (timeRange) {
      case 'current':
        return sortedTimeline.filter((event) => {
          const start = new Date(event.startTime);
          const end = new Date(event.endTime);
          return (
            (isBefore(start, now) && isAfter(end, now)) ||
            event.status === 'in-progress'
          );
        });
      case 'upcoming':
        return sortedTimeline.filter((event) => {
          const start = new Date(event.startTime);
          return isAfter(start, now) && isBefore(start, twoHoursFromNow);
        });
      default:
        return sortedTimeline;
    }
  }, [sortedTimeline, timeRange, currentTime]);

  // Get vendor info for an event
  const getEventVendors = (event: TimelineEvent) => {
    return event.assignedVendors
      .map((vendorId) => vendors.find((v) => v.id === vendorId))
      .filter(Boolean) as VendorCheckIn[];
  };

  // Check if event is currently active
  const isEventActive = (event: TimelineEvent) => {
    const now = currentTime;
    const start = new Date(event.startTime);
    const end = new Date(event.endTime);
    return isBefore(start, now) && isAfter(end, now);
  };

  // Check if event should be starting soon
  const isEventUpcoming = (event: TimelineEvent) => {
    const now = currentTime;
    const start = new Date(event.startTime);
    const timeDiff = differenceInMinutes(start, now);
    return timeDiff > 0 && timeDiff <= 30; // Starting within 30 minutes
  };

  // Check if event is overdue
  const isEventOverdue = (event: TimelineEvent) => {
    if (event.status === 'completed' || event.status === 'cancelled')
      return false;
    const now = currentTime;
    const end = new Date(event.endTime);
    return isAfter(now, end);
  };

  const handleStatusUpdate = (
    eventId: string,
    status: TimelineEvent['status'],
  ) => {
    onTimelineUpdate(eventId, { status });
  };

  const handleTimeAdjustment = (
    eventId: string,
    adjustment: 'start' | 'delay',
    minutes: number,
  ) => {
    const event = timeline.find((e) => e.id === eventId);
    if (!event) return;

    if (adjustment === 'start') {
      // Start event now
      onTimelineUpdate(eventId, {
        status: 'in-progress',
        startTime: new Date().toISOString(),
      });
    } else {
      // Delay event
      const newStart = addMinutes(new Date(event.startTime), minutes);
      const newEnd = addMinutes(new Date(event.endTime), minutes);

      onTimelineUpdate(eventId, {
        startTime: newStart.toISOString(),
        endTime: newEnd.toISOString(),
        status: 'delayed',
        delayMinutes: (event.delayMinutes || 0) + minutes,
        delayReason: `Delayed by ${minutes} minutes`,
      });
    }
  };

  return (
    <div className={cn('bg-white rounded-lg shadow', className)}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary-600" />
            <h3 className="text-lg font-medium text-gray-900">
              Wedding Day Timeline
            </h3>
            <span className="text-sm text-gray-500">
              ({filteredTimeline.filter((e) => e.status === 'completed').length}
              /{filteredTimeline.length} completed)
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Time Range Filter */}
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="px-3 py-1 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Events</option>
              <option value="current">Current</option>
              <option value="upcoming">Next 2 Hours</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex border rounded-lg">
              <button
                onClick={() => setViewMode('timeline')}
                className={cn(
                  'px-3 py-1 text-sm rounded-l-lg',
                  viewMode === 'timeline'
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50',
                )}
              >
                Timeline
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  'px-3 py-1 text-sm rounded-r-lg border-l',
                  viewMode === 'list'
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50',
                )}
              >
                List
              </button>
            </div>
          </div>
        </div>

        {/* Current Time Indicator */}
        <div className="flex items-center gap-2 mt-3 text-sm text-gray-600">
          <Clock className="w-4 h-4" />
          <span>Current time: {format(currentTime, 'HH:mm')}</span>
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse ml-2" />
        </div>
      </div>

      {/* Timeline Content */}
      <div className="p-4">
        {filteredTimeline.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-500">
            <Calendar className="w-12 h-12 mb-3 text-gray-300" />
            <p className="text-sm">No events in selected time range</p>
          </div>
        ) : viewMode === 'timeline' ? (
          <TimelineView
            events={filteredTimeline}
            vendors={vendors}
            currentTime={currentTime}
            onStatusUpdate={handleStatusUpdate}
            onTimeAdjustment={handleTimeAdjustment}
            onEventSelect={setSelectedEvent}
          />
        ) : (
          <ListView
            events={filteredTimeline}
            vendors={vendors}
            currentTime={currentTime}
            onStatusUpdate={handleStatusUpdate}
            onTimeAdjustment={handleTimeAdjustment}
            onEventSelect={setSelectedEvent}
          />
        )}
      </div>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          vendors={getEventVendors(selectedEvent)}
          onClose={() => setSelectedEvent(null)}
          onUpdate={(update) => {
            onTimelineUpdate(selectedEvent.id, update);
            setSelectedEvent(null);
          }}
        />
      )}
    </div>
  );
}

interface TimelineViewProps {
  events: TimelineEvent[];
  vendors: VendorCheckIn[];
  currentTime: Date;
  onStatusUpdate: (eventId: string, status: TimelineEvent['status']) => void;
  onTimeAdjustment: (
    eventId: string,
    adjustment: 'start' | 'delay',
    minutes: number,
  ) => void;
  onEventSelect: (event: TimelineEvent) => void;
}

function TimelineView({
  events,
  vendors,
  currentTime,
  onStatusUpdate,
  onTimeAdjustment,
  onEventSelect,
}: TimelineViewProps) {
  // Calculate timeline scale (pixels per hour)
  const pixelsPerHour = 120;
  const startOfDay = new Date(currentTime);
  startOfDay.setHours(6, 0, 0, 0); // Start timeline at 6 AM

  const getEventPosition = (event: TimelineEvent) => {
    const eventStart = new Date(event.startTime);
    const hoursFromStart =
      (eventStart.getTime() - startOfDay.getTime()) / (1000 * 60 * 60);
    return hoursFromStart * pixelsPerHour;
  };

  const getEventWidth = (event: TimelineEvent) => {
    const durationHours = event.duration / 60;
    return Math.max(durationHours * pixelsPerHour, 80); // Minimum 80px width
  };

  const getCurrentTimePosition = () => {
    const hoursFromStart =
      (currentTime.getTime() - startOfDay.getTime()) / (1000 * 60 * 60);
    return hoursFromStart * pixelsPerHour;
  };

  // Generate time markers (every 2 hours)
  const timeMarkers = [];
  for (let hour = 6; hour <= 24; hour += 2) {
    const markerTime = new Date(startOfDay);
    markerTime.setHours(hour);
    const position = (hour - 6) * pixelsPerHour;

    timeMarkers.push({
      time: markerTime,
      position,
      label: format(markerTime, 'HH:mm'),
    });
  }

  return (
    <div className="relative">
      {/* Time Scale */}
      <div className="relative h-8 border-b mb-4">
        {timeMarkers.map((marker) => (
          <div
            key={marker.label}
            className="absolute flex flex-col items-center"
            style={{ left: `${marker.position}px` }}
          >
            <div className="w-px h-4 bg-gray-300" />
            <span className="text-xs text-gray-500 mt-1">{marker.label}</span>
          </div>
        ))}

        {/* Current Time Line */}
        <div
          className="absolute top-0 w-px h-full bg-red-500 z-10"
          style={{ left: `${getCurrentTimePosition()}px` }}
        >
          <div className="absolute -top-1 -left-1 w-2 h-2 bg-red-500 rounded-full" />
        </div>
      </div>

      {/* Events */}
      <div className="relative space-y-2">
        {events.map((event) => {
          const isActive = isEventActive(event);
          const isUpcoming = isEventUpcoming(event);
          const isOverdue = isEventOverdue(event);

          return (
            <div
              key={event.id}
              className={cn(
                'absolute h-16 rounded-lg border-2 p-2 cursor-pointer transition-all hover:shadow-md group',
                statusColors[event.status],
                isActive && 'ring-2 ring-blue-500 ring-opacity-50',
                isUpcoming && 'ring-2 ring-yellow-500 ring-opacity-50',
                isOverdue && 'ring-2 ring-red-500 ring-opacity-50',
              )}
              style={{
                left: `${getEventPosition(event)}px`,
                width: `${getEventWidth(event)}px`,
                top: `${events.indexOf(event) * 72}px`,
              }}
              onClick={() => onEventSelect(event)}
            >
              <div className="flex items-start justify-between h-full">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 mb-1">
                    {/* Priority Indicator */}
                    <div
                      className={cn(
                        'w-2 h-2 rounded-full',
                        event.priority === 'critical' && 'bg-red-500',
                        event.priority === 'high' && 'bg-yellow-500',
                        event.priority === 'medium' && 'bg-blue-500',
                        event.priority === 'low' && 'bg-gray-500',
                      )}
                    />

                    <h4 className="font-medium text-sm text-gray-900 truncate">
                      {event.title}
                    </h4>

                    {/* Status Indicators */}
                    {isActive && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                    )}
                    {isUpcoming && (
                      <Timer className="w-3 h-3 text-yellow-600" />
                    )}
                    {isOverdue && (
                      <AlertTriangle className="w-3 h-3 text-red-600" />
                    )}
                    {event.weather_dependent && (
                      <Cloud className="w-3 h-3 text-gray-600" />
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <span>{format(new Date(event.startTime), 'HH:mm')}</span>
                    <span>•</span>
                    <span>{event.duration}min</span>
                    {event.location && (
                      <>
                        <span>•</span>
                        <MapPin className="w-3 h-3" />
                        <span className="truncate">{event.location}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                  <TimelineEventActions
                    event={event}
                    onStatusUpdate={onStatusUpdate}
                    onTimeAdjustment={onTimeAdjustment}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Set minimum height based on number of events */}
      <div style={{ height: `${events.length * 72 + 32}px` }} />
    </div>
  );
}

interface ListViewProps {
  events: TimelineEvent[];
  vendors: VendorCheckIn[];
  currentTime: Date;
  onStatusUpdate: (eventId: string, status: TimelineEvent['status']) => void;
  onTimeAdjustment: (
    eventId: string,
    adjustment: 'start' | 'delay',
    minutes: number,
  ) => void;
  onEventSelect: (event: TimelineEvent) => void;
}

function ListView({
  events,
  vendors,
  currentTime,
  onStatusUpdate,
  onTimeAdjustment,
  onEventSelect,
}: ListViewProps) {
  return (
    <div className="space-y-3">
      {events.map((event) => {
        const isActive = isEventActive(event);
        const isUpcoming = isEventUpcoming(event);
        const isOverdue = isEventOverdue(event);
        const eventVendors = event.assignedVendors
          .map((id) => vendors.find((v) => v.id === id))
          .filter(Boolean) as VendorCheckIn[];

        return (
          <div
            key={event.id}
            className={cn(
              'p-4 border rounded-lg cursor-pointer transition-all hover:shadow-sm group',
              statusColors[event.status],
              isActive && 'ring-2 ring-blue-500 ring-opacity-50',
              isUpcoming && 'ring-2 ring-yellow-500 ring-opacity-50',
              isOverdue && 'ring-2 ring-red-500 ring-opacity-50',
            )}
            onClick={() => onEventSelect(event)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {/* Priority & Status Indicators */}
                  <div
                    className={cn(
                      'w-3 h-3 rounded-full',
                      event.priority === 'critical' && 'bg-red-500',
                      event.priority === 'high' && 'bg-yellow-500',
                      event.priority === 'medium' && 'bg-blue-500',
                      event.priority === 'low' && 'bg-gray-500',
                    )}
                  />

                  <h4 className="font-medium text-gray-900">{event.title}</h4>

                  <div
                    className={cn(
                      'px-2 py-0.5 text-xs font-medium rounded-full border',
                      statusColors[event.status],
                    )}
                  >
                    {event.status.replace('-', ' ').toUpperCase()}
                  </div>

                  {isActive && (
                    <div className="flex items-center gap-1 text-blue-600">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                      <span className="text-xs font-medium">ACTIVE</span>
                    </div>
                  )}

                  {isUpcoming && (
                    <div className="flex items-center gap-1 text-yellow-600">
                      <Timer className="w-3 h-3" />
                      <span className="text-xs font-medium">STARTING SOON</span>
                    </div>
                  )}

                  {isOverdue && (
                    <div className="flex items-center gap-1 text-red-600">
                      <AlertTriangle className="w-3 h-3" />
                      <span className="text-xs font-medium">OVERDUE</span>
                    </div>
                  )}
                </div>

                {/* Event Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span>
                      {format(new Date(event.startTime), 'HH:mm')} -{' '}
                      {format(new Date(event.endTime), 'HH:mm')}
                      <span className="text-gray-400 ml-1">
                        ({event.duration}min)
                      </span>
                    </span>
                  </div>

                  {event.location && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <MapPin className="w-4 h-4" />
                      <span>{event.location}</span>
                    </div>
                  )}

                  {eventVendors.length > 0 && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Users className="w-4 h-4" />
                      <span>
                        {eventVendors.length} vendor
                        {eventVendors.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                </div>

                {/* Event Description */}
                {event.description && (
                  <p className="text-sm text-gray-600 mt-2">
                    {event.description}
                  </p>
                )}

                {/* Delay Information */}
                {event.delayMinutes && event.delayMinutes > 0 && (
                  <div className="flex items-center gap-2 mt-2 text-yellow-600">
                    <Timer className="w-4 h-4" />
                    <span className="text-sm">
                      Delayed by {event.delayMinutes} minutes
                      {event.delayReason && ` - ${event.delayReason}`}
                    </span>
                  </div>
                )}

                {/* Weather Dependency */}
                {event.weather_dependent && (
                  <div className="flex items-center gap-2 mt-2 text-blue-600">
                    <Cloud className="w-4 h-4" />
                    <span className="text-sm">Weather dependent</span>
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity ml-4">
                <TimelineEventActions
                  event={event}
                  onStatusUpdate={onStatusUpdate}
                  onTimeAdjustment={onTimeAdjustment}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface TimelineEventActionsProps {
  event: TimelineEvent;
  onStatusUpdate: (eventId: string, status: TimelineEvent['status']) => void;
  onTimeAdjustment: (
    eventId: string,
    adjustment: 'start' | 'delay',
    minutes: number,
  ) => void;
}

function TimelineEventActions({
  event,
  onStatusUpdate,
  onTimeAdjustment,
}: TimelineEventActionsProps) {
  const [showActions, setShowActions] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowActions(!showActions);
        }}
        className="p-1 text-gray-400 hover:text-gray-600 rounded"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {showActions && (
        <div className="absolute right-0 top-8 z-20 w-48 bg-white rounded-lg shadow-lg border py-1">
          {event.status === 'pending' && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onStatusUpdate(event.id, 'in-progress');
                  setShowActions(false);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                <Play className="w-4 h-4" />
                Start Now
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onTimeAdjustment(event.id, 'delay', 15);
                  setShowActions(false);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                <Timer className="w-4 h-4" />
                Delay 15min
              </button>
            </>
          )}

          {event.status === 'in-progress' && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onStatusUpdate(event.id, 'completed');
                  setShowActions(false);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Mark Complete
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onStatusUpdate(event.id, 'pending');
                  setShowActions(false);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                <Pause className="w-4 h-4" />
                Pause
              </button>
            </>
          )}

          <div className="border-t my-1" />

          <button
            onClick={(e) => e.stopPropagation()}
            className="w-full px-4 py-2 text-left text-sm text-blue-600 hover:bg-gray-50 flex items-center gap-2"
          >
            <Edit3 className="w-4 h-4" />
            Edit Details
          </button>
        </div>
      )}
    </div>
  );
}

interface EventDetailModalProps {
  event: TimelineEvent;
  vendors: VendorCheckIn[];
  onClose: () => void;
  onUpdate: (update: Partial<TimelineEvent>) => void;
}

function EventDetailModal({
  event,
  vendors,
  onClose,
  onUpdate,
}: EventDetailModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="text-xl font-medium text-gray-900">
                {event.title}
              </h3>
              <p className="text-gray-600 mt-1">
                {format(new Date(event.startTime), 'HH:mm')} -{' '}
                {format(new Date(event.endTime), 'HH:mm')}
                <span className="ml-2">({event.duration} minutes)</span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Event Details */}
          <div className="space-y-4">
            {event.description && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">
                  Description
                </h4>
                <p className="text-gray-600">{event.description}</p>
              </div>
            )}

            {event.location && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">
                  Location
                </h4>
                <div className="flex items-center gap-2 text-gray-600">
                  <MapPin className="w-4 h-4" />
                  <span>{event.location}</span>
                </div>
              </div>
            )}

            {vendors.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">
                  Assigned Vendors
                </h4>
                <div className="space-y-2">
                  {vendors.map((vendor) => (
                    <div
                      key={vendor.id}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded"
                    >
                      <span>{vendor.vendorName}</span>
                      <span
                        className={cn(
                          'px-2 py-1 text-xs rounded-full',
                          vendor.status === 'checked-in'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800',
                        )}
                      >
                        {vendor.status.replace('-', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {event.requirements && event.requirements.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">
                  Requirements
                </h4>
                <ul className="list-disc list-inside text-gray-600 space-y-1">
                  {event.requirements.map((req, index) => (
                    <li key={index}>{req}</li>
                  ))}
                </ul>
              </div>
            )}

            {event.notes && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">
                  Notes
                </h4>
                <p className="text-gray-600">{event.notes}</p>
              </div>
            )}
          </div>

          {/* Status Update Actions */}
          <div className="flex gap-3 mt-6 pt-6 border-t">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Close
            </button>
            {event.status !== 'completed' && (
              <button
                onClick={() => {
                  onUpdate({ status: 'completed' });
                }}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
              >
                Mark as Complete
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
