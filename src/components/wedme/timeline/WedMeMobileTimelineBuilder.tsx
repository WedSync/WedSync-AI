'use client';

import React, {
  useState,
  useRef,
  useCallback,
  useMemo,
  useEffect,
} from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  WeddingTimeline,
  TimelineEvent,
  TimelineConflict,
  CreateEventRequest,
  EventType,
  EventPriority,
} from '@/types/timeline';
import {
  useTouch,
  useTouchDrag,
  useHaptic,
  useLongPress,
} from '@/hooks/useTouch';
import {
  Clock,
  MapPin,
  Users,
  GripVertical,
  Edit2,
  Trash2,
  Check,
  Plus,
  AlertTriangle,
  Heart,
  Camera,
  Music,
  Utensils,
  Car,
} from 'lucide-react';
import {
  format,
  addMinutes,
  parseISO,
  differenceInMinutes,
  startOfDay,
} from 'date-fns';

interface WedMeMobileTimelineBuilderProps {
  timeline: WeddingTimeline;
  events: TimelineEvent[];
  onEventUpdate: (eventId: string, updates: Partial<TimelineEvent>) => void;
  onEventCreate: (event: CreateEventRequest) => void;
  onEventDelete: (eventId: string) => void;
  onEventReorder: (events: TimelineEvent[]) => void;
  conflicts?: TimelineConflict[];
  onConflictResolve?: (conflictId: string) => void;
  className?: string;
  onTimelineShare?: () => void;
  onTemplateSelect?: () => void;
}

interface DragInfo {
  eventId: string;
  initialY: number;
  currentY: number;
  dragOffset: number;
  targetSlot?: number;
}

interface TimeSlot {
  time: Date;
  index: number;
  events: TimelineEvent[];
  conflicts: TimelineConflict[];
}

const EVENT_HEIGHT = 80;
const TIME_SLOT_HEIGHT = 60;
const DRAG_THRESHOLD = 10;

// Wedding-specific event type icons and colors
const EVENT_TYPE_CONFIG = {
  preparation: { icon: Heart, color: 'bg-pink-500', label: 'Getting Ready' },
  ceremony: { icon: Heart, color: 'bg-purple-500', label: 'Ceremony' },
  photos: { icon: Camera, color: 'bg-yellow-500', label: 'Photos' },
  reception: { icon: Music, color: 'bg-blue-500', label: 'Reception' },
  cocktails: { icon: Utensils, color: 'bg-green-500', label: 'Cocktails' },
  dinner: { icon: Utensils, color: 'bg-orange-500', label: 'Dinner' },
  dancing: { icon: Music, color: 'bg-indigo-500', label: 'Dancing' },
  transport: { icon: Car, color: 'bg-gray-500', label: 'Transport' },
  other: { icon: Clock, color: 'bg-gray-400', label: 'Other' },
};

export function WedMeMobileTimelineBuilder({
  timeline,
  events: initialEvents,
  onEventUpdate,
  onEventCreate,
  onEventDelete,
  onEventReorder,
  conflicts = [],
  onConflictResolve,
  className,
  onTimelineShare,
  onTemplateSelect,
}: WedMeMobileTimelineBuilderProps) {
  const [events, setEvents] = useState(initialEvents);
  const [dragInfo, setDragInfo] = useState<DragInfo | null>(null);
  const [editMode, setEditMode] = useState<string | null>(null);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<number | null>(null);

  const haptic = useHaptic();
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Generate time slots for the wedding day (6 AM to 2 AM next day)
  const timeSlots = useMemo(() => {
    const weddingDate = parseISO(timeline.wedding_date);
    const startTime = startOfDay(weddingDate);
    const slots: TimeSlot[] = [];

    // Create 30-minute slots from 6 AM to 2 AM (20 hours)
    for (let i = 6; i <= 25; i++) {
      // 25 = 1 AM next day
      for (let j = 0; j < 2; j++) {
        // Two 30-minute slots per hour
        const slotTime = addMinutes(startTime, i * 60 + j * 30);
        const slotEvents = events.filter((event) => {
          const eventStart = parseISO(event.start_time);
          const eventEnd = parseISO(event.end_time);
          return eventStart <= slotTime && eventEnd > slotTime;
        });

        const slotConflicts = conflicts.filter((conflict) =>
          slotEvents.some(
            (event) =>
              event.id === conflict.event_id_1 ||
              event.id === conflict.event_id_2,
          ),
        );

        slots.push({
          time: slotTime,
          index: slots.length,
          events: slotEvents,
          conflicts: slotConflicts,
        });
      }
    }

    return slots;
  }, [timeline.wedding_date, events, conflicts]);

  // Handle drag start
  const handleDragStart = useCallback(
    (eventId: string, panInfo: PanInfo) => {
      const event = events.find((e) => e.id === eventId);
      if (!event || event.is_locked) return;

      const eventElement = document.querySelector(
        `[data-event-id="${eventId}"]`,
      );
      if (!eventElement) return;

      const rect = eventElement.getBoundingClientRect();
      const containerRect = containerRef.current?.getBoundingClientRect();
      if (!containerRect) return;

      setDragInfo({
        eventId,
        initialY: rect.top - containerRect.top,
        currentY: rect.top - containerRect.top,
        dragOffset: panInfo.offset.y,
        targetSlot: undefined,
      });

      haptic.medium();
    },
    [events, haptic],
  );

  // Handle drag movement
  const handleDrag = useCallback(
    (eventId: string, panInfo: PanInfo) => {
      if (!dragInfo || dragInfo.eventId !== eventId) return;

      const newY = dragInfo.initialY + panInfo.offset.y;
      const targetSlotIndex = Math.max(0, Math.floor(newY / TIME_SLOT_HEIGHT));

      setDragInfo((prev) =>
        prev
          ? {
              ...prev,
              currentY: newY,
              targetSlot:
                targetSlotIndex < timeSlots.length
                  ? targetSlotIndex
                  : undefined,
            }
          : null,
      );

      // Auto-scroll when dragging near edges
      if (scrollContainerRef.current) {
        const scrollContainer = scrollContainerRef.current;
        const containerHeight = scrollContainer.clientHeight;
        const scrollTop = scrollContainer.scrollTop;

        if (newY < 100 && scrollTop > 0) {
          scrollContainer.scrollTo({ top: scrollTop - 10, behavior: 'smooth' });
        } else if (newY > containerHeight - 100) {
          scrollContainer.scrollTo({ top: scrollTop + 10, behavior: 'smooth' });
        }
      }
    },
    [dragInfo, timeSlots.length],
  );

  // Handle drag end
  const handleDragEnd = useCallback(
    (eventId: string, panInfo: PanInfo) => {
      if (!dragInfo || dragInfo.eventId !== eventId) return;

      const targetSlot = dragInfo.targetSlot;
      if (targetSlot !== undefined && targetSlot < timeSlots.length) {
        const event = events.find((e) => e.id === eventId);
        if (event) {
          const newStartTime = timeSlots[targetSlot].time;
          const eventDuration = differenceInMinutes(
            parseISO(event.end_time),
            parseISO(event.start_time),
          );
          const newEndTime = addMinutes(newStartTime, eventDuration);

          // Check for conflicts
          const wouldConflict = events.some(
            (e) =>
              e.id !== eventId &&
              parseISO(e.start_time) < newEndTime &&
              parseISO(e.end_time) > newStartTime,
          );

          if (!wouldConflict) {
            const updatedEvent = {
              ...event,
              start_time: newStartTime.toISOString(),
              end_time: newEndTime.toISOString(),
            };

            const newEvents = events.map((e) =>
              e.id === eventId ? updatedEvent : e,
            );
            setEvents(newEvents);
            onEventUpdate(eventId, {
              start_time: newStartTime.toISOString(),
              end_time: newEndTime.toISOString(),
            });

            haptic.success();
          } else {
            haptic.error();
          }
        }
      }

      setDragInfo(null);
    },
    [dragInfo, timeSlots, events, onEventUpdate, haptic],
  );

  // Get event status color
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'in-progress':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'confirmed':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  // Get priority indicator
  const getPriorityIndicator = (priority: EventPriority) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-500';
      case 'high':
        return 'bg-orange-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-green-500';
      default:
        return 'bg-gray-400';
    }
  };

  // Handle event status toggle
  const handleStatusToggle = useCallback(
    (eventId: string) => {
      const event = events.find((e) => e.id === eventId);
      if (!event) return;

      const statusFlow = {
        pending: 'confirmed',
        confirmed: 'in-progress',
        'in-progress': 'completed',
        completed: 'pending',
      };

      const newStatus =
        statusFlow[event.status as keyof typeof statusFlow] || 'pending';
      onEventUpdate(eventId, { status: newStatus });

      setEvents((prev) =>
        prev.map((e) => (e.id === eventId ? { ...e, status: newStatus } : e)),
      );

      haptic.light();
    },
    [events, onEventUpdate, haptic],
  );

  // Handle add event
  const handleAddEvent = useCallback(
    (slotIndex: number) => {
      const slot = timeSlots[slotIndex];
      if (!slot) return;

      const newEvent: CreateEventRequest = {
        timeline_id: timeline.id,
        title: 'New Event',
        start_time: slot.time.toISOString(),
        end_time: addMinutes(slot.time, 60).toISOString(),
        event_type: 'other',
        priority: 'medium',
      };

      onEventCreate(newEvent);
      setSelectedTimeSlot(null);
      setShowAddEvent(false);
      haptic.success();
    },
    [timeSlots, timeline.id, onEventCreate, haptic],
  );

  // Sync props changes with local state
  useEffect(() => {
    setEvents(initialEvents);
  }, [initialEvents]);

  return (
    <div className={cn('flex flex-col h-full bg-white', className)}>
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Wedding Timeline</h1>
            <p className="text-sm text-purple-100">
              {format(parseISO(timeline.wedding_date), 'EEEE, MMMM d, yyyy')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {conflicts.length > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 bg-red-500 rounded-full">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-xs font-medium">{conflicts.length}</span>
              </div>
            )}
            <button
              onClick={onTemplateSelect}
              className="p-2 bg-white/20 rounded-lg min-h-[44px] min-w-[44px]"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Timeline Container */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto scrollbar-hide"
      >
        <div ref={containerRef} className="relative px-4 py-4">
          {/* Time slots and events */}
          {timeSlots.map((slot) => (
            <div key={slot.index} className="relative mb-2">
              {/* Time label */}
              <div className="flex items-center gap-3 py-2">
                <div className="text-sm font-medium text-gray-600 w-16">
                  {format(slot.time, 'HH:mm')}
                </div>
                <div className="flex-1 h-px bg-gray-200" />

                {/* Add event button */}
                {slot.events.length === 0 && (
                  <button
                    onClick={() => setSelectedTimeSlot(slot.index)}
                    className="p-1.5 text-gray-400 hover:text-purple-500 hover:bg-purple-50 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Events in this slot */}
              <div className="ml-16 space-y-2">
                {slot.events.map((event) => {
                  const eventConflicts = conflicts.filter(
                    (c) =>
                      c.event_id_1 === event.id || c.event_id_2 === event.id,
                  );
                  const isDragging = dragInfo?.eventId === event.id;
                  const isEditMode = editMode === event.id;

                  const eventTypeConfig =
                    EVENT_TYPE_CONFIG[
                      event.event_type as keyof typeof EVENT_TYPE_CONFIG
                    ] || EVENT_TYPE_CONFIG.other;
                  const IconComponent = eventTypeConfig.icon;

                  return (
                    <motion.div
                      key={event.id}
                      data-event-id={event.id}
                      className={cn(
                        'relative bg-white rounded-xl shadow-sm border transition-all',
                        'min-h-[80px] touch-none select-none',
                        isDragging && 'opacity-50 scale-95 z-50',
                        isEditMode && 'ring-2 ring-purple-500',
                        eventConflicts.length > 0 && 'border-red-300 bg-red-50',
                      )}
                      drag="y"
                      dragConstraints={{ top: 0, bottom: 0 }}
                      dragElastic={0.1}
                      onDragStart={(_, info) => handleDragStart(event.id, info)}
                      onDrag={(_, info) => handleDrag(event.id, info)}
                      onDragEnd={(_, info) => handleDragEnd(event.id, info)}
                      whileDrag={{
                        scale: 1.05,
                        boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                        zIndex: 50,
                      }}
                      layout
                    >
                      {/* Drag handle */}
                      <div className="absolute left-0 top-0 bottom-0 w-8 flex items-center justify-center bg-gray-50 rounded-l-xl cursor-move">
                        <GripVertical className="w-4 h-4 text-gray-400" />
                      </div>

                      {/* Priority indicator */}
                      <div className="absolute left-8 top-3 bottom-3 w-1 rounded-full">
                        <div
                          className={cn(
                            'w-full h-full rounded-full',
                            getPriorityIndicator(event.priority),
                          )}
                        />
                      </div>

                      {/* Event content */}
                      <div className="pl-12 pr-4 py-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <div
                                className={cn(
                                  'w-6 h-6 rounded-lg flex items-center justify-center',
                                  eventTypeConfig.color,
                                )}
                              >
                                <IconComponent className="w-3.5 h-3.5 text-white" />
                              </div>
                              <h3 className="font-semibold text-gray-900 truncate">
                                {event.title}
                              </h3>
                            </div>

                            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                              <div className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                <span>
                                  {format(parseISO(event.start_time), 'HH:mm')}{' '}
                                  -{format(parseISO(event.end_time), 'HH:mm')}
                                </span>
                              </div>

                              {event.location && (
                                <div className="flex items-center gap-1">
                                  <MapPin className="w-3.5 h-3.5" />
                                  <span className="truncate">
                                    {event.location}
                                  </span>
                                </div>
                              )}

                              {event.vendors && event.vendors.length > 0 && (
                                <div className="flex items-center gap-1">
                                  <Users className="w-3.5 h-3.5" />
                                  <span>{event.vendors.length} vendors</span>
                                </div>
                              )}
                            </div>

                            {eventConflicts.length > 0 && (
                              <div className="flex items-center gap-1 mt-2 text-red-600 text-xs">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                <span>
                                  {eventConflicts.length} conflict
                                  {eventConflicts.length > 1 ? 's' : ''}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Status badge */}
                          <button
                            onClick={() => handleStatusToggle(event.id)}
                            className={cn(
                              'ml-3 px-3 py-1.5 rounded-full text-xs font-medium border',
                              'min-w-[60px] min-h-[32px] flex items-center justify-center',
                              getStatusColor(event.status),
                            )}
                          >
                            {event.status === 'completed' && (
                              <Check className="w-3 h-3 mr-1" />
                            )}
                            {event.status || 'pending'}
                          </button>
                        </div>

                        {/* Edit mode actions */}
                        {isEditMode && (
                          <motion.div
                            className="flex items-center gap-2 mt-3 pt-3 border-t"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                          >
                            <button
                              onClick={() => {
                                // onEventEdit?.(event) - would need to be added to props
                                setEditMode(null);
                                haptic.light();
                              }}
                              className="flex items-center px-4 py-2 bg-purple-50 text-purple-700 rounded-lg min-h-[44px]"
                            >
                              <Edit2 className="w-4 h-4 mr-2" />
                              Edit
                            </button>

                            <button
                              onClick={() => {
                                onEventDelete(event.id);
                                setEditMode(null);
                                haptic.success();
                              }}
                              className="flex items-center px-4 py-2 bg-red-50 text-red-700 rounded-lg min-h-[44px]"
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
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Add event overlay */}
              {selectedTimeSlot === slot.index && (
                <motion.div
                  className="ml-16 p-4 bg-purple-50 border-2 border-dashed border-purple-300 rounded-xl"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-900">
                        Add event at {format(slot.time, 'HH:mm')}
                      </p>
                      <p className="text-xs text-purple-700">
                        Tap to create a new timeline event
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAddEvent(slot.index)}
                        className="px-4 py-2 bg-purple-500 text-white rounded-lg font-medium min-h-[44px]"
                      >
                        Add Event
                      </button>
                      <button
                        onClick={() => setSelectedTimeSlot(null)}
                        className="p-2 text-purple-500 min-h-[44px] min-w-[44px]"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          ))}

          {/* Empty state */}
          {events.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Heart className="w-16 h-16 mx-auto mb-4 text-purple-300" />
              <p className="text-lg font-medium text-gray-700">
                Your Wedding Timeline
              </p>
              <p className="text-sm mt-1">Start building your perfect day</p>
              <button
                onClick={onTemplateSelect}
                className="mt-4 px-6 py-3 bg-purple-500 text-white rounded-xl font-medium min-h-[44px]"
              >
                Choose Template
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Floating action button */}
      <div className="absolute bottom-4 right-4">
        <button
          onClick={() => setShowAddEvent(true)}
          className="w-14 h-14 bg-purple-500 text-white rounded-full shadow-lg flex items-center justify-center"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
