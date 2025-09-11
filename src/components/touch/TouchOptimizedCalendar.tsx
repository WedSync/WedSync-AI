'use client';

import { useState, useRef, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  Users,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { SupplierSchedule, ScheduleEvent } from '@/types/supplier';

interface TouchOptimizedCalendarProps {
  selectedDate: string;
  onDateSelect: (date: string) => void;
  schedule: SupplierSchedule | null;
  loading: boolean;
}

export function TouchOptimizedCalendar({
  selectedDate,
  onDateSelect,
  schedule,
  loading,
}: TouchOptimizedCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(
    null,
  );
  const calendarRef = useRef<HTMLDivElement>(null);

  // Minimum distance for swipe
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    });
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    });
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distanceX = touchStart.x - touchEnd.x;
    const distanceY = touchStart.y - touchEnd.y;
    const isLeftSwipe =
      distanceX > minSwipeDistance && Math.abs(distanceY) < 100;
    const isRightSwipe =
      distanceX < -minSwipeDistance && Math.abs(distanceY) < 100;

    if (isLeftSwipe) {
      // Next month
      setCurrentMonth(
        (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
      );
    }
    if (isRightSwipe) {
      // Previous month
      setCurrentMonth(
        (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1),
      );
    }
  };

  // Generate calendar days
  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Previous month's trailing days
    const prevMonth = new Date(year, month - 1, 0);
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const dayNumber = prevMonth.getDate() - i;
      days.push({
        date: new Date(year, month - 1, dayNumber),
        isCurrentMonth: false,
        isToday: false,
        isSelected: false,
      });
    }

    // Current month's days
    const today = new Date();
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateString = date.toISOString().split('T')[0];
      const isToday = date.toDateString() === today.toDateString();
      const isSelected = dateString === selectedDate;

      days.push({
        date,
        dateString,
        isCurrentMonth: true,
        isToday,
        isSelected,
      });
    }

    // Next month's leading days
    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month + 1, day);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: false,
        isSelected: false,
      });
    }

    return days;
  };

  const getEventsForDate = (date: Date) => {
    if (!schedule?.weeklySchedule) return [];

    const dateString = date.toISOString().split('T')[0];
    const daySchedule = schedule.weeklySchedule.days.find(
      (day) => day.date.split('T')[0] === dateString,
    );

    return daySchedule?.events || [];
  };

  const getEventIndicators = (events: ScheduleEvent[]) => {
    if (events.length === 0) return null;

    const confirmedCount = events.filter(
      (e) => e.status === 'confirmed',
    ).length;
    const pendingCount = events.filter((e) => e.status === 'pending').length;
    const conflictCount = events.filter((e) => e.status === 'conflict').length;

    return (
      <div className="flex justify-center space-x-0.5 mt-1">
        {confirmedCount > 0 && (
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
        )}
        {pendingCount > 0 && (
          <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full" />
        )}
        {conflictCount > 0 && (
          <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
        )}
      </div>
    );
  };

  const calendarDays = generateCalendarDays();
  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <Card className="p-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() =>
            setCurrentMonth(
              (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1),
            )
          }
          className="h-10 w-10"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>

        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-900">
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </h2>
          <p className="text-xs text-gray-500">Swipe to navigate</p>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() =>
            setCurrentMonth(
              (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
            )
          }
          className="h-10 w-10"
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* Calendar Grid */}
      <div
        ref={calendarRef}
        className="touch-pan-y"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNames.map((dayName) => (
            <div
              key={dayName}
              className="text-center text-xs font-medium text-gray-500 py-2"
            >
              {dayName}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, index) => {
            const events = day.isCurrentMonth ? getEventsForDate(day.date) : [];
            const hasEvents = events.length > 0;
            const hasConflicts = events.some((e) => e.status === 'conflict');

            return (
              <button
                key={index}
                onClick={() => {
                  if (day.isCurrentMonth && day.dateString) {
                    onDateSelect(day.dateString);
                    // Haptic feedback
                    if ('vibrate' in navigator) {
                      navigator.vibrate(10);
                    }
                  }
                }}
                className={cn(
                  'relative aspect-square p-1 rounded-lg text-sm font-medium transition-all duration-200',
                  'touch-manipulation active:scale-95',
                  'min-h-[44px]', // Minimum touch target
                  // Base styles
                  day.isCurrentMonth
                    ? 'text-gray-900 hover:bg-gray-100'
                    : 'text-gray-400',
                  // Today styles
                  day.isToday &&
                    day.isCurrentMonth &&
                    'bg-pink-600 text-white hover:bg-pink-700',
                  // Selected styles
                  day.isSelected &&
                    !day.isToday &&
                    'bg-pink-100 text-pink-800 ring-2 ring-pink-500',
                  // Event indicators
                  hasEvents &&
                    !day.isSelected &&
                    !day.isToday &&
                    'bg-blue-50 border border-blue-200',
                  // Conflict indicators
                  hasConflicts && 'bg-red-50 border border-red-300',
                )}
                disabled={!day.isCurrentMonth}
              >
                <div className="flex flex-col items-center justify-center h-full">
                  <span>{day.date.getDate()}</span>
                  {hasEvents && getEventIndicators(events)}
                </div>

                {/* Event count badge */}
                {events.length > 3 && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center">
                    {events.length}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected date events preview */}
      {selectedDate && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-900 mb-2">
            Events for{' '}
            {new Date(selectedDate).toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </h3>

          <SelectedDateEvents
            selectedDate={selectedDate}
            schedule={schedule}
            loading={loading}
          />
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-green-500 rounded-full" />
            <span className="text-gray-600">Confirmed</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-yellow-500 rounded-full" />
            <span className="text-gray-600">Pending</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-red-500 rounded-full" />
            <span className="text-gray-600">Conflicts</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

// Selected date events component
function SelectedDateEvents({
  selectedDate,
  schedule,
  loading,
}: {
  selectedDate: string;
  schedule: SupplierSchedule | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="h-16 bg-gray-200 rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  const events =
    schedule?.weeklySchedule?.days.find(
      (day) => day.date.split('T')[0] === selectedDate,
    )?.events || [];

  if (events.length === 0) {
    return (
      <p className="text-sm text-gray-500 text-center py-4">
        No events scheduled for this date
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {events.slice(0, 3).map((event) => (
        <div
          key={event.id}
          className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg"
        >
          <div className="flex-shrink-0">
            <Clock className="w-4 h-4 text-gray-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {event.title}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {new Date(event.start_time).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
              })}{' '}
              - {event.client_name}
            </p>
          </div>
          <Badge
            className={cn(
              'text-xs',
              event.status === 'confirmed'
                ? 'bg-green-100 text-green-800'
                : event.status === 'pending'
                  ? 'bg-yellow-100 text-yellow-800'
                  : event.status === 'conflict'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-gray-100 text-gray-800',
            )}
          >
            {event.status}
          </Badge>
        </div>
      ))}

      {events.length > 3 && (
        <p className="text-xs text-gray-500 text-center">
          +{events.length - 3} more events
        </p>
      )}
    </div>
  );
}
