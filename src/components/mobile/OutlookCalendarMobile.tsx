'use client';

import React, { useState, useEffect, useMemo, startTransition } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Plus,
  Filter,
  RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';

interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  startTime: string;
  endTime: string;
  type: 'wedding' | 'consultation' | 'venue_visit' | 'other';
  status: 'confirmed' | 'pending' | 'cancelled';
  client?: string;
  venue?: string;
  conflictsWith?: string[];
}

interface OutlookCalendarMobileProps {
  events?: CalendarEvent[];
  onDateSelect?: (date: Date) => void;
  onEventSelect?: (event: CalendarEvent) => void;
  onSyncRequest?: () => Promise<void>;
  isLoading?: boolean;
  className?: string;
}

const OutlookCalendarMobile: React.FC<OutlookCalendarMobileProps> = ({
  events = [],
  onDateSelect,
  onEventSelect,
  onSyncRequest,
  isLoading = false,
  className = '',
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [showFilters, setShowFilters] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(
    null,
  );

  // Generate calendar grid for current month
  const calendarGrid = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days = [];
    for (let i = 0; i < 42; i++) {
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + i);
      days.push(day);
    }

    return days;
  }, [currentDate]);

  // Get events for a specific date
  const getEventsForDate = (date: Date) => {
    return events.filter(
      (event) => event.date.toDateString() === date.toDateString(),
    );
  };

  // Handle month navigation with haptic feedback
  const navigateMonth = (direction: 'prev' | 'next') => {
    // Trigger haptic feedback if supported
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }

    startTransition(() => {
      const newDate = new Date(currentDate);
      newDate.setMonth(
        currentDate.getMonth() + (direction === 'next' ? 1 : -1),
      );
      setCurrentDate(newDate);
    });
  };

  // Handle swipe gestures
  const handlePanEnd = (event: any, info: PanInfo) => {
    const threshold = 100;
    const velocity = 0.5;

    if (info.offset.x > threshold && info.velocity.x > velocity) {
      navigateMonth('prev');
    } else if (info.offset.x < -threshold && info.velocity.x < -velocity) {
      navigateMonth('next');
    }
  };

  // Handle date selection
  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    onDateSelect?.(date);
  };

  // Handle pull-to-refresh
  const handlePullToRefresh = async (info: PanInfo) => {
    if (info.offset.y > 100 && info.velocity.y > 0.5) {
      await onSyncRequest?.();
    }
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  };

  return (
    <div
      className={`bg-white dark:bg-gray-900 rounded-xl shadow-xs border border-gray-200 dark:border-gray-700 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors touch-manipulation"
            style={{ minHeight: '44px', minWidth: '44px' }}
          >
            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {formatMonthYear(currentDate)}
          </h2>
          <button
            onClick={() => navigateMonth('next')}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors touch-manipulation"
            style={{ minHeight: '44px', minWidth: '44px' }}
          >
            <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-lg transition-colors touch-manipulation ${
              showFilters
                ? 'bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400'
                : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
            }`}
            style={{ minHeight: '44px', minWidth: '44px' }}
          >
            <Filter className="w-5 h-5" />
          </button>

          <button
            onClick={onSyncRequest}
            disabled={isLoading}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors touch-manipulation disabled:opacity-50"
            style={{ minHeight: '44px', minWidth: '44px' }}
          >
            <RefreshCw
              className={`w-5 h-5 text-gray-600 dark:text-gray-400 ${isLoading ? 'animate-spin' : ''}`}
            />
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
          >
            <div className="p-4 space-y-3">
              <div className="flex flex-wrap gap-2">
                {['All', 'Weddings', 'Consultations', 'Venue Visits'].map(
                  (filter) => (
                    <button
                      key={filter}
                      className="px-4 py-2 text-sm font-medium bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors touch-manipulation"
                      style={{ minHeight: '44px' }}
                    >
                      {filter}
                    </button>
                  ),
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Calendar Grid */}
      <motion.div
        className="p-4"
        onPanEnd={handlePanEnd}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.1}
      >
        {/* Day Headers */}
        <div className="grid grid-cols-7 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="text-center py-2">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {day}
              </span>
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-1">
          {calendarGrid.map((date, index) => {
            const isCurrentMonth = date.getMonth() === currentDate.getMonth();
            const isToday = date.toDateString() === new Date().toDateString();
            const isSelected =
              selectedDate?.toDateString() === date.toDateString();
            const dayEvents = getEventsForDate(date);
            const hasEvents = dayEvents.length > 0;
            const hasConflicts = dayEvents.some(
              (event) => event.conflictsWith && event.conflictsWith.length > 0,
            );

            return (
              <motion.button
                key={`${date.toISOString()}-${index}`}
                onClick={() => handleDateSelect(date)}
                className={`
                  relative aspect-square rounded-lg p-1 text-center transition-all duration-200 touch-manipulation
                  ${isCurrentMonth ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-600'}
                  ${isToday ? 'bg-primary-100 dark:bg-primary-900 border-2 border-primary-500' : ''}
                  ${isSelected ? 'bg-primary-500 text-white' : ''}
                  ${!isSelected && !isToday ? 'hover:bg-gray-100 dark:hover:bg-gray-800' : ''}
                  ${hasConflicts ? 'ring-2 ring-red-300 dark:ring-red-700' : ''}
                `}
                style={{ minHeight: '44px', minWidth: '44px' }}
                whileTap={{ scale: 0.95 }}
              >
                <span className="text-sm font-medium">{date.getDate()}</span>

                {/* Event indicators */}
                {hasEvents && (
                  <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 flex space-x-1">
                    {dayEvents.slice(0, 3).map((event, i) => (
                      <div
                        key={i}
                        className={`w-1.5 h-1.5 rounded-full ${
                          event.type === 'wedding'
                            ? 'bg-pink-500'
                            : event.type === 'consultation'
                              ? 'bg-blue-500'
                              : event.type === 'venue_visit'
                                ? 'bg-green-500'
                                : 'bg-gray-500'
                        }`}
                      />
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                    )}
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {/* Selected Date Events */}
      <AnimatePresence>
        {selectedDate && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
          >
            <div className="p-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                {selectedDate.toLocaleDateString('en-GB', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </h3>

              {getEventsForDate(selectedDate).length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No events scheduled
                </p>
              ) : (
                <div className="space-y-2">
                  {getEventsForDate(selectedDate).map((event) => (
                    <button
                      key={event.id}
                      onClick={() => onEventSelect?.(event)}
                      className="w-full text-left p-3 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-primary-300 dark:hover:border-primary-500 transition-colors touch-manipulation"
                      style={{ minHeight: '44px' }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                event.type === 'wedding'
                                  ? 'bg-pink-500'
                                  : event.type === 'consultation'
                                    ? 'bg-blue-500'
                                    : event.type === 'venue_visit'
                                      ? 'bg-green-500'
                                      : 'bg-gray-500'
                              }`}
                            />
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {event.title}
                            </span>
                            {event.conflictsWith &&
                              event.conflictsWith.length > 0 && (
                                <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-full">
                                  Conflict
                                </span>
                              )}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {event.startTime} - {event.endTime}
                            {event.client && ` • ${event.client}`}
                            {event.venue && ` • ${event.venue}`}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default OutlookCalendarMobile;
