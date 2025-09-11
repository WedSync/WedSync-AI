'use client';

import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
} from 'react';
import { motion, PanInfo, AnimatePresence } from 'motion/react';
import {
  Clock,
  MapPin,
  User,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Edit3,
  Eye,
} from 'lucide-react';
import {
  useDndMonitor,
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface TimelineEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  vendor: string;
  location?: string;
  status: 'confirmed' | 'pending' | 'changed' | 'cancelled';
  type: 'preparation' | 'ceremony' | 'photography' | 'reception' | 'other';
  canEdit: boolean;
  isFixed: boolean;
  notes?: string;
  attendees?: string[];
}

interface TouchTimelineProps {
  timelineEvents: TimelineEvent[];
  onEventUpdate: (eventId: string, updates: Partial<TimelineEvent>) => void;
  isOffline: boolean;
  userType: 'couple' | 'vendor';
  weddingId: string;
  className?: string;
}

const TouchTimelineView: React.FC<TouchTimelineProps> = ({
  timelineEvents,
  onEventUpdate,
  isOffline,
  userType,
  weddingId,
  className,
}) => {
  // State management
  const [scale, setScale] = useState(1);
  const [draggedEvent, setDraggedEvent] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'timeline'>('timeline');
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [lastTap, setLastTap] = useState<number>(0);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const gestureStartRef = useRef<{ scale: number; distance: number } | null>(
    null,
  );

  const { toast } = useToast();

  // Memoized sorted events
  const sortedEvents = useMemo(() => {
    return [...timelineEvents].sort((a, b) => {
      const aTime = new Date(`2024-01-01 ${a.startTime}`);
      const bTime = new Date(`2024-01-01 ${b.startTime}`);
      return aTime.getTime() - bTime.getTime();
    });
  }, [timelineEvents]);

  // Touch gesture handlers
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      setTouchStart({ x: touch.clientX, y: touch.clientY });

      // Handle multi-touch for pinch gestures
      if (e.touches.length === 2) {
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const distance = Math.sqrt(
          Math.pow(touch2.clientX - touch1.clientX, 2) +
            Math.pow(touch2.clientY - touch1.clientY, 2),
        );

        gestureStartRef.current = { scale, distance };
        e.preventDefault(); // Prevent scrolling during pinch
      }
    },
    [scale],
  );

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && gestureStartRef.current) {
      // Pinch-to-zoom handling
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
          Math.pow(touch2.clientY - touch1.clientY, 2),
      );

      const scaleChange = distance / gestureStartRef.current.distance;
      const newScale = Math.min(
        Math.max(gestureStartRef.current.scale * scaleChange, 0.5),
        3,
      );

      setScale(newScale);
      e.preventDefault();
    }
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!touchStart) return;

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStart.x;
      const deltaY = touch.clientY - touchStart.y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      // Reset gesture tracking
      gestureStartRef.current = null;
      setTouchStart(null);

      // Handle swipe gestures (horizontal swipes for navigation)
      if (distance > 50 && Math.abs(deltaX) > Math.abs(deltaY)) {
        if (deltaX > 50) {
          // Swipe right - previous day
          navigateDate(-1);
        } else if (deltaX < -50) {
          // Swipe left - next day
          navigateDate(1);
        }
      }

      // Handle double-tap for zoom reset
      const now = Date.now();
      if (now - lastTap < 300) {
        setScale(1);
      }
      setLastTap(now);
    },
    [touchStart, lastTap],
  );

  const navigateDate = useCallback(
    (direction: number) => {
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() + direction);
      setCurrentDate(newDate);

      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
    },
    [currentDate],
  );

  // Long press handler for event editing
  const handleLongPress = useCallback(
    (eventId: string) => {
      const event = timelineEvents.find((e) => e.id === eventId);
      if (!event?.canEdit || isOffline) return;

      setSelectedEventId(eventId);

      // Haptic feedback for long press
      if ('vibrate' in navigator) {
        navigator.vibrate([100, 50, 100]);
      }

      toast({
        title: 'Edit Mode',
        description: `Long press detected for ${event.title}`,
      });
    },
    [timelineEvents, isOffline, toast],
  );

  // Drag and drop handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setDraggedEvent(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (!over || active.id === over.id) {
        setDraggedEvent(null);
        return;
      }

      const activeEvent = timelineEvents.find((e) => e.id === active.id);
      const overEvent = timelineEvents.find((e) => e.id === over.id);

      if (activeEvent && overEvent && activeEvent.canEdit && !isOffline) {
        // Calculate new time based on position
        const activeIndex = sortedEvents.findIndex((e) => e.id === active.id);
        const overIndex = sortedEvents.findIndex((e) => e.id === over.id);

        if (activeIndex !== overIndex) {
          // Reorder logic would go here
          onEventUpdate(active.id as string, {
            startTime: overEvent.startTime,
            endTime: overEvent.endTime,
          });

          // Haptic feedback for successful reorder
          if ('vibrate' in navigator) {
            navigator.vibrate([50, 50, 50]);
          }

          toast({
            title: 'Timeline Updated',
            description: `${activeEvent.title} moved to ${overEvent.startTime}`,
          });
        }
      }

      setDraggedEvent(null);
    },
    [timelineEvents, sortedEvents, onEventUpdate, isOffline, toast],
  );

  // Event status color mapping
  const getEventStatusColor = (status: TimelineEvent['status']) => {
    const colors = {
      confirmed: 'bg-green-500',
      pending: 'bg-yellow-500',
      changed: 'bg-orange-500',
      cancelled: 'bg-red-500',
    };
    return colors[status] || 'bg-gray-500';
  };

  // Event type icon mapping
  const getEventTypeIcon = (type: TimelineEvent['type']) => {
    const icons = {
      preparation: '💄',
      ceremony: '💒',
      photography: '📸',
      reception: '🎉',
      other: '📅',
    };
    return icons[type] || '📅';
  };

  // Render timeline event
  const renderTimelineEvent = (event: TimelineEvent, index: number) => (
    <motion.div
      key={event.id}
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        'touch-timeline-event relative',
        event.canEdit && !isOffline && 'cursor-move',
        selectedEventId === event.id && 'ring-2 ring-blue-500',
      )}
      onTouchStart={(e) => {
        const touch = e.touches[0];
        const startTime = Date.now();

        const longPressTimer = setTimeout(() => {
          handleLongPress(event.id);
        }, 500);

        const handleTouchEnd = () => {
          clearTimeout(longPressTimer);
          document.removeEventListener('touchend', handleTouchEnd);
        };

        document.addEventListener('touchend', handleTouchEnd);
      }}
    >
      <Card
        className={cn(
          'border-0 shadow-sm transition-all duration-200',
          event.isFixed && 'opacity-75',
          isOffline && 'opacity-60',
        )}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'w-1 h-16 rounded-full',
                  getEventStatusColor(event.status),
                )}
              />
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">
                    {getEventTypeIcon(event.type)}
                  </span>
                  <h3 className="font-semibold text-lg leading-tight">
                    {event.title}
                  </h3>
                  {!isOffline && event.canEdit && userType === 'vendor' && (
                    <Edit3 className="w-4 h-4 text-muted-foreground" />
                  )}
                  {!event.canEdit && (
                    <Eye className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {event.vendor}
                </p>
                {event.location && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3" />
                    {event.location}
                  </p>
                )}
              </div>
            </div>

            <div className="text-right">
              <div className="flex items-center gap-1 mb-1">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{event.startTime}</span>
              </div>
              {event.endTime && (
                <span className="text-sm text-muted-foreground">
                  to {event.endTime}
                </span>
              )}
              <Badge
                variant={event.status === 'confirmed' ? 'success' : 'secondary'}
                className="mt-2 text-xs"
              >
                {event.status}
              </Badge>
            </div>
          </div>

          {event.notes && (
            <div className="mt-3 p-2 bg-gray-50 rounded text-sm">
              <p>{event.notes}</p>
            </div>
          )}

          {event.attendees && event.attendees.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {event.attendees.slice(0, 3).map((attendee, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {attendee}
                </Badge>
              ))}
              {event.attendees.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{event.attendees.length - 3} more
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <div
      ref={containerRef}
      className={cn('touch-timeline-view', className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Timeline Header with Controls */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigateDate(-1)}
              className="touch-target-48"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="text-center">
              <h2 className="font-semibold text-lg">
                {currentDate.toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </h2>
              <p className="text-sm text-muted-foreground">Wedding Timeline</p>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigateDate(1)}
              className="touch-target-48"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setScale(Math.max(scale - 0.25, 0.5))}
              disabled={scale <= 0.5}
              className="touch-target-48"
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium w-12 text-center">
              {Math.round(scale * 100)}%
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setScale(Math.min(scale + 0.25, 3))}
              disabled={scale >= 3}
              className="touch-target-48"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Offline Indicator */}
        {isOffline && (
          <div className="flex items-center gap-2 p-2 bg-orange-50 border border-orange-200 rounded-lg text-sm">
            <AlertCircle className="w-4 h-4 text-orange-500" />
            <span className="text-orange-800">
              Offline mode - Changes will sync when connected
            </span>
          </div>
        )}
      </div>

      {/* Timeline Content */}
      <div
        ref={timelineRef}
        className="p-4"
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'top center',
          minHeight: '100vh',
        }}
      >
        <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <SortableContext
            items={sortedEvents.map((e) => e.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-4">
              <AnimatePresence>
                {sortedEvents.map((event, index) =>
                  renderTimelineEvent(event, index),
                )}
              </AnimatePresence>
            </div>
          </SortableContext>

          {/* Drag Overlay */}
          <DragOverlay>
            {draggedEvent ? (
              <div className="opacity-75 rotate-3 transform">
                {renderTimelineEvent(
                  sortedEvents.find((e) => e.id === draggedEvent)!,
                  0,
                )}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        {/* Empty State */}
        {sortedEvents.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📅</div>
            <h3 className="font-semibold text-lg mb-2">No Events Scheduled</h3>
            <p className="text-muted-foreground">
              Add timeline events to see them here
            </p>
          </div>
        )}
      </div>

      {/* Zoom Indicator */}
      {scale !== 1 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed bottom-4 right-4 bg-black bg-opacity-75 text-white px-3 py-1 rounded-full text-sm"
        >
          {Math.round(scale * 100)}% zoom
        </motion.div>
      )}
    </div>
  );
};

export default TouchTimelineView;
