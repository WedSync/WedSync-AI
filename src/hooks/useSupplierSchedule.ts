'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  SupplierSchedule,
  ScheduleEvent,
  ScheduleConflict,
  SupplierBooking,
} from '@/types/supplier';

export function useSupplierSchedule(date?: string) {
  const { user } = useAuth();
  const [schedule, setSchedule] = useState<SupplierSchedule | null>(null);
  const [todayEvents, setTodayEvents] = useState<ScheduleEvent[]>([]);
  const [upcomingBookings, setUpcomingBookings] = useState<SupplierBooking[]>(
    [],
  );
  const [conflicts, setConflicts] = useState<ScheduleConflict[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSchedule = useCallback(async () => {
    if (!user || user.role !== 'vendor') {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams();
      if (date) {
        queryParams.append('date', date);
      }

      const response = await fetch(
        `/api/supplier/schedule?${queryParams.toString()}`,
      );
      if (!response.ok) {
        throw new Error('Failed to fetch schedule');
      }

      const data = await response.json();
      setSchedule(data.schedule);
      setTodayEvents(data.todayEvents || []);
      setUpcomingBookings(data.upcomingBookings || []);
      setConflicts(data.conflicts || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [user, date]);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  const updateEventStatus = async (eventId: string, status: string) => {
    try {
      const response = await fetch(
        `/api/supplier/schedule/events/${eventId}/status`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status }),
        },
      );

      if (!response.ok) {
        throw new Error('Failed to update event status');
      }

      const updatedEvent = await response.json();

      // Update local state
      setTodayEvents((prev) =>
        prev.map((event) => (event.id === eventId ? updatedEvent : event)),
      );

      return updatedEvent;
    } catch (err) {
      throw new Error(
        err instanceof Error ? err.message : 'Failed to update event status',
      );
    }
  };

  const reportConflict = async (
    eventIds: string[],
    description: string,
    type: string,
  ) => {
    try {
      const response = await fetch('/api/supplier/schedule/conflicts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event_ids: eventIds,
          description,
          type,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to report conflict');
      }

      const conflict = await response.json();
      setConflicts((prev) => [...prev, conflict]);
      return conflict;
    } catch (err) {
      throw new Error(
        err instanceof Error ? err.message : 'Failed to report conflict',
      );
    }
  };

  const resolveConflict = async (conflictId: string, resolution?: string) => {
    try {
      const response = await fetch(
        `/api/supplier/schedule/conflicts/${conflictId}/resolve`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ resolution }),
        },
      );

      if (!response.ok) {
        throw new Error('Failed to resolve conflict');
      }

      const resolvedConflict = await response.json();
      setConflicts((prev) =>
        prev.map((conflict) =>
          conflict.id === conflictId ? resolvedConflict : conflict,
        ),
      );

      return resolvedConflict;
    } catch (err) {
      throw new Error(
        err instanceof Error ? err.message : 'Failed to resolve conflict',
      );
    }
  };

  const confirmAvailability = async (eventId: string) => {
    try {
      const response = await fetch(
        `/api/supplier/schedule/events/${eventId}/confirm`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        throw new Error('Failed to confirm availability');
      }

      const confirmedEvent = await response.json();

      // Update local state
      setTodayEvents((prev) =>
        prev.map((event) => (event.id === eventId ? confirmedEvent : event)),
      );

      return confirmedEvent;
    } catch (err) {
      throw new Error(
        err instanceof Error ? err.message : 'Failed to confirm availability',
      );
    }
  };

  const exportSchedule = async (
    format: 'ics' | 'pdf',
    dateRange?: { start: string; end: string },
  ) => {
    try {
      const queryParams = new URLSearchParams({
        format,
        ...(dateRange && {
          start_date: dateRange.start,
          end_date: dateRange.end,
        }),
      });

      const response = await fetch(
        `/api/supplier/schedule/export?${queryParams.toString()}`,
      );
      if (!response.ok) {
        throw new Error('Failed to export schedule');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `schedule.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      throw new Error(
        err instanceof Error ? err.message : 'Failed to export schedule',
      );
    }
  };

  return {
    schedule,
    todayEvents,
    upcomingBookings,
    conflicts,
    loading,
    error,
    refetch: fetchSchedule,
    updateEventStatus,
    reportConflict,
    resolveConflict,
    confirmAvailability,
    exportSchedule,
  };
}
