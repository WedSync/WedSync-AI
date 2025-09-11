'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  MapPin,
  MoreHorizontal,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { SupplierSchedule } from '@/types/supplier';

interface ScheduleOverviewProps {
  schedule: SupplierSchedule | null;
  loading: boolean;
}

export function SupplierScheduleOverview({
  schedule,
  loading,
}: ScheduleOverviewProps) {
  const router = useRouter();
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');

  // Get current week dates
  const getCurrentWeekDates = () => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(
      today.getDate() - today.getDay() + currentWeekOffset * 7,
    );

    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      weekDates.push(date);
    }
    return weekDates;
  };

  const weekDates = getCurrentWeekDates();
  const today = new Date().toDateString();

  const formatWeekRange = () => {
    const start = weekDates[0];
    const end = weekDates[6];

    if (start.getMonth() === end.getMonth()) {
      return `${start.toLocaleDateString('en-US', { month: 'short' })} ${start.getDate()} - ${end.getDate()}`;
    } else {
      return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    }
  };

  const getEventsForDate = (date: Date) => {
    if (!schedule?.weeklySchedule) return [];

    const dateString = date.toISOString().split('T')[0];
    const daySchedule = schedule.weeklySchedule.days.find(
      (day) => day.date.split('T')[0] === dateString,
    );

    return daySchedule?.events || [];
  };

  const getAvailabilityForDate = (date: Date) => {
    if (!schedule?.weeklySchedule) return null;

    const dateString = date.toISOString().split('T')[0];
    const daySchedule = schedule.weeklySchedule.days.find(
      (day) => day.date.split('T')[0] === dateString,
    );

    return daySchedule?.availability || null;
  };

  const getConflictsForDate = (date: Date) => {
    if (!schedule?.weeklySchedule) return [];

    const dateString = date.toISOString().split('T')[0];
    const daySchedule = schedule.weeklySchedule.days.find(
      (day) => day.date.split('T')[0] === dateString,
    );

    return daySchedule?.conflicts || [];
  };

  if (loading) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Schedule Overview
          </h2>
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-pink-600" />
        </div>
        <div className="space-y-3">
          <div className="animate-pulse">
            <div className="h-64 bg-gray-200 rounded-lg" />
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Schedule Overview
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/supplier-portal/schedule')}
          className="text-pink-600"
        >
          Full Calendar
        </Button>
      </div>

      {/* Week navigation */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCurrentWeekOffset(currentWeekOffset - 1)}
          className="h-8 w-8 p-0"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        <div className="text-center">
          <div className="font-medium text-gray-900">{formatWeekRange()}</div>
          <div className="text-xs text-gray-500">
            {currentWeekOffset === 0
              ? 'This Week'
              : currentWeekOffset === -1
                ? 'Last Week'
                : currentWeekOffset === 1
                  ? 'Next Week'
                  : `${Math.abs(currentWeekOffset)} weeks ${currentWeekOffset > 0 ? 'ahead' : 'ago'}`}
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCurrentWeekOffset(currentWeekOffset + 1)}
          className="h-8 w-8 p-0"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Weekly calendar */}
      <div className="space-y-2">
        {weekDates.map((date, index) => {
          const events = getEventsForDate(date);
          const availability = getAvailabilityForDate(date);
          const conflicts = getConflictsForDate(date);
          const isToday = date.toDateString() === today;
          const dayName = date.toLocaleDateString('en-US', {
            weekday: 'short',
          });
          const dayNumber = date.getDate();

          return (
            <div
              key={index}
              className={cn(
                'border rounded-lg p-3 transition-all duration-200',
                'touch-manipulation active:scale-[0.98] cursor-pointer',
                isToday && 'border-pink-300 bg-pink-50',
                conflicts.length > 0 && 'border-red-300 bg-red-50',
                !isToday && conflicts.length === 0 && 'hover:border-gray-300',
              )}
              onClick={() =>
                router.push(
                  `/supplier-portal/schedule/${date.toISOString().split('T')[0]}`,
                )
              }
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {/* Date */}
                  <div
                    className={cn(
                      'flex flex-col items-center justify-center w-12 h-12 rounded-lg',
                      isToday
                        ? 'bg-pink-600 text-white'
                        : 'bg-gray-100 text-gray-700',
                    )}
                  >
                    <span className="text-xs font-medium">{dayName}</span>
                    <span className="text-sm font-bold">{dayNumber}</span>
                  </div>

                  {/* Events summary */}
                  <div className="flex-1">
                    {events.length > 0 ? (
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-gray-900">
                          {events.length} event{events.length > 1 ? 's' : ''}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {events.slice(0, 2).map((event, eventIndex) => (
                            <Badge
                              key={eventIndex}
                              variant="secondary"
                              className="text-xs truncate max-w-24"
                            >
                              {event.title}
                            </Badge>
                          ))}
                          {events.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{events.length - 2} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    ) : availability?.available ? (
                      <div className="text-sm text-green-600 font-medium">
                        Available
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">No events</div>
                    )}
                  </div>
                </div>

                {/* Status indicators */}
                <div className="flex items-center space-x-1">
                  {conflicts.length > 0 && (
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  )}
                  {events.some((e) => e.status === 'pending') && (
                    <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                  )}
                  {events.some((e) => e.status === 'confirmed') && (
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                  )}
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              </div>

              {/* Time slots preview */}
              {events.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-100 space-y-1">
                  {events.slice(0, 3).map((event, eventIndex) => (
                    <div
                      key={eventIndex}
                      className="flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center space-x-2">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span className="text-gray-600">
                          {new Date(event.start_time).toLocaleTimeString(
                            'en-US',
                            {
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true,
                            },
                          )}
                        </span>
                        <span className="font-medium text-gray-900 truncate">
                          {event.client_name}
                        </span>
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
                    <div className="text-xs text-gray-500 text-center">
                      +{events.length - 3} more events
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Quick stats */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-gray-900">
              {schedule?.weeklySchedule?.days.reduce(
                (sum, day) => sum + day.events.length,
                0,
              ) || 0}
            </div>
            <div className="text-xs text-gray-500">Events This Week</div>
          </div>
          <div>
            <div className="text-lg font-bold text-green-600">
              {schedule?.weeklySchedule?.days.filter(
                (day) => day.availability.available,
              ).length || 0}
            </div>
            <div className="text-xs text-gray-500">Available Days</div>
          </div>
          <div>
            <div className="text-lg font-bold text-red-600">
              {schedule?.conflicts?.filter((c) => c.status === 'active')
                .length || 0}
            </div>
            <div className="text-xs text-gray-500">Active Conflicts</div>
          </div>
        </div>
      </div>
    </Card>
  );
}
