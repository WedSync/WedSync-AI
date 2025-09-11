'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar,
  MapPin,
  Clock,
} from 'lucide-react';

interface CalendarEvent {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  location?: string;
  color: 'blue' | 'red' | 'green' | 'orange' | 'purple' | 'pink';
  allDay?: boolean;
  type?: 'wedding' | 'meeting' | 'consultation' | 'shoot';
}

interface AppleCalendarMobileProps {
  events?: CalendarEvent[];
  selectedDate?: Date;
  onDateSelect?: (date: Date) => void;
  onEventCreate?: (date: Date) => void;
  onEventSelect?: (event: CalendarEvent) => void;
  className?: string;
}

const MONTHS = [
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

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const EVENT_COLORS = {
  blue: 'bg-blue-500',
  red: 'bg-red-500',
  green: 'bg-green-500',
  orange: 'bg-orange-500',
  purple: 'bg-purple-500',
  pink: 'bg-pink-500',
};

export function AppleCalendarMobile({
  events = [],
  selectedDate = new Date(),
  onDateSelect,
  onEventCreate,
  onEventSelect,
  className,
}: AppleCalendarMobileProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');

  // iOS-style haptic feedback simulation
  const triggerHaptic = useCallback(
    (type: 'light' | 'medium' | 'heavy' = 'light') => {
      if ('vibrate' in navigator) {
        const patterns = { light: 10, medium: 20, heavy: 30 };
        navigator.vibrate(patterns[type]);
      }
    },
    [],
  );

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const startOfMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      1,
    );
    const startOfWeek = new Date(startOfMonth);
    startOfWeek.setDate(startOfMonth.getDate() - startOfMonth.getDay());

    const days = [];
    let currentDay = new Date(startOfWeek);

    // Generate 6 weeks (42 days) for consistent layout
    for (let i = 0; i < 42; i++) {
      days.push(new Date(currentDay));
      currentDay.setDate(currentDay.getDate() + 1);
    }

    return days;
  }, [currentDate]);

  // Get events for a specific date
  const getEventsForDate = useCallback(
    (date: Date) => {
      return events.filter((event) => {
        const eventDate = new Date(event.startDate);
        return eventDate.toDateString() === date.toDateString();
      });
    },
    [events],
  );

  // Navigation handlers
  const navigateMonth = useCallback(
    (direction: 'prev' | 'next') => {
      setCurrentDate((prev) => {
        const newDate = new Date(prev);
        newDate.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
        return newDate;
      });
      triggerHaptic('light');
    },
    [triggerHaptic],
  );

  // Handle date selection
  const handleDateSelect = useCallback(
    (date: Date) => {
      triggerHaptic('medium');
      onDateSelect?.(date);
    },
    [onDateSelect, triggerHaptic],
  );

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date: Date) => {
    return date.toDateString() === selectedDate.toDateString();
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth();
  };

  return (
    <div
      className={cn(
        'bg-white dark:bg-gray-900 rounded-2xl shadow-lg overflow-hidden',
        'border border-gray-200 dark:border-gray-700',
        className,
      )}
    >
      {/* Header */}
      <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          {/* Month/Year Display */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center space-x-1 text-lg font-semibold text-gray-900 dark:text-white"
            onClick={() => setCurrentDate(new Date())}
          >
            <span>
              {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
            </span>
            <Calendar className="w-4 h-4 ml-1 opacity-60" />
          </motion.button>

          {/* Navigation Controls */}
          <div className="flex items-center space-x-1">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => navigateMonth('prev')}
              className="p-2 rounded-full bg-white dark:bg-gray-700 shadow-sm border border-gray-200 dark:border-gray-600"
            >
              <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => navigateMonth('next')}
              className="p-2 rounded-full bg-white dark:bg-gray-700 shadow-sm border border-gray-200 dark:border-gray-600"
            >
              <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </motion.button>
          </div>
        </div>

        {/* View Mode Selector */}
        <div className="flex mt-3 bg-white dark:bg-gray-700 rounded-lg p-1 shadow-sm border border-gray-200 dark:border-gray-600">
          {(['month', 'week', 'day'] as const).map((mode) => (
            <motion.button
              key={mode}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setViewMode(mode);
                triggerHaptic('light');
              }}
              className={cn(
                'flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200',
                viewMode === mode
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600',
              )}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Days */}
      <div className="grid grid-cols-7">
        <AnimatePresence mode="popLayout">
          {calendarDays.map((date, index) => {
            const dayEvents = getEventsForDate(date);
            const isCurrentMonthDay = isCurrentMonth(date);
            const isTodayDate = isToday(date);
            const isSelectedDate = isSelected(date);

            return (
              <motion.div
                key={`${date.getMonth()}-${date.getDate()}`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ delay: index * 0.01 }}
                className={cn(
                  'relative min-h-[60px] border-b border-r border-gray-100 dark:border-gray-700 p-1',
                  'last:border-r-0 [&:nth-child(7n)]:border-r-0',
                )}
              >
                {/* Date Button */}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleDateSelect(date)}
                  onDoubleClick={() => onEventCreate?.(date)}
                  className={cn(
                    'w-full h-8 rounded-lg text-sm font-medium transition-all duration-200',
                    'flex items-center justify-center relative z-10',
                    isTodayDate && 'bg-blue-500 text-white shadow-md',
                    isSelectedDate &&
                      !isTodayDate &&
                      'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white',
                    !isCurrentMonthDay && 'text-gray-400 dark:text-gray-600',
                    isCurrentMonthDay &&
                      !isTodayDate &&
                      !isSelectedDate &&
                      'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800',
                  )}
                >
                  {date.getDate()}
                </motion.button>

                {/* Event Indicators */}
                {dayEvents.length > 0 && (
                  <div className="absolute bottom-1 left-1 right-1 flex flex-wrap gap-0.5 max-h-6 overflow-hidden">
                    {dayEvents.slice(0, 3).map((event, eventIndex) => (
                      <motion.div
                        key={event.id}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: eventIndex * 0.05 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEventSelect?.(event);
                          triggerHaptic('light');
                        }}
                        className={cn(
                          'h-1.5 flex-1 min-w-2 rounded-full cursor-pointer',
                          EVENT_COLORS[event.color],
                        )}
                      />
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="h-1.5 w-2 bg-gray-400 dark:bg-gray-500 rounded-full" />
                    )}
                  </div>
                )}

                {/* Add Event Button (on long press/hover) */}
                <motion.button
                  initial={{ opacity: 0, scale: 0 }}
                  whileHover={{ opacity: 1, scale: 1 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEventCreate?.(date);
                  }}
                  className="absolute top-1 right-1 w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center shadow-sm"
                >
                  <Plus className="w-3 h-3" />
                </motion.button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Today's Events Summary */}
      {getEventsForDate(selectedDate).length > 0 && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4"
        >
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center">
            <Clock className="w-4 h-4 mr-2" />
            {selectedDate.toDateString() === new Date().toDateString()
              ? "Today's Events"
              : 'Events'}
          </h3>
          <div className="space-y-2">
            {getEventsForDate(selectedDate)
              .slice(0, 3)
              .map((event) => (
                <motion.button
                  key={event.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onEventSelect?.(event)}
                  className="w-full text-left p-3 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm"
                >
                  <div className="flex items-start space-x-3">
                    <div
                      className={cn(
                        'w-3 h-3 rounded-full mt-1',
                        EVENT_COLORS[event.color],
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {event.title}
                      </p>
                      {event.location && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center mt-1">
                          <MapPin className="w-3 h-3 mr-1" />
                          {event.location}
                        </p>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {event.allDay
                        ? 'All day'
                        : new Date(event.startDate).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                    </div>
                  </div>
                </motion.button>
              ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
