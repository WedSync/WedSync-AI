'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Users,
} from 'lucide-react';

// Types
import { PhotoGroup } from '@/types/photo-groups';

// Hooks
import { usePhotoGroupSchedulingRealtime } from '@/hooks/useSupabaseRealtime';

interface TimeSlot {
  id: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  location?: string;
  is_available: boolean;
  conflicts: string[];
  assigned_group_id?: string;
}

interface SchedulingConflict {
  type:
    | 'guest_overlap'
    | 'venue_conflict'
    | 'photographer_unavailable'
    | 'equipment_conflict';
  message: string;
  severity: 'warning' | 'error';
  suggested_resolution?: string;
}

interface PhotoGroupSchedulerProps {
  photoGroup: PhotoGroup;
  availableTimeSlots: TimeSlot[];
  onScheduleUpdate: (groupId: string, timeSlotId: string) => Promise<void>;
  onConflictResolution: (groupId: string, resolution: string) => Promise<void>;
  className?: string;
  readonly?: boolean;
}

export function PhotoGroupScheduler({
  photoGroup,
  availableTimeSlots,
  onScheduleUpdate,
  onConflictResolution,
  className = '',
  readonly = false,
}: PhotoGroupSchedulerProps) {
  // State
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(
    null,
  );
  const [conflicts, setConflicts] = useState<SchedulingConflict[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'timeline' | 'calendar'>('timeline');

  // Real-time subscription for scheduling updates
  const { send, isConnected } = usePhotoGroupSchedulingRealtime(
    photoGroup.couple_id,
    true,
  );

  useEffect(() => {
    // Real-time updates are handled by the hook automatically
    // When there are scheduling updates, we refresh conflicts
    if (selectedTimeSlot) {
      checkSchedulingConflicts(selectedTimeSlot);
    }
  }, [selectedTimeSlot, checkSchedulingConflicts]);

  // Check for scheduling conflicts
  const checkSchedulingConflicts = useCallback(
    async (timeSlot: TimeSlot | null) => {
      if (!timeSlot) {
        setConflicts([]);
        return;
      }

      const detectedConflicts: SchedulingConflict[] = [];

      // Check guest conflicts
      if (timeSlot.conflicts.length > 0) {
        detectedConflicts.push({
          type: 'guest_overlap',
          message: `${timeSlot.conflicts.length} guests are scheduled in overlapping sessions`,
          severity: 'error',
          suggested_resolution:
            'Reschedule overlapping groups or remove conflicting guests',
        });
      }

      // Check venue availability
      if (!timeSlot.is_available) {
        detectedConflicts.push({
          type: 'venue_conflict',
          message: 'Venue is not available during this time slot',
          severity: 'error',
          suggested_resolution: 'Choose a different time slot or location',
        });
      }

      // Check photographer availability (mock logic)
      const photographerUnavailable = Math.random() < 0.2; // 20% chance
      if (photographerUnavailable) {
        detectedConflicts.push({
          type: 'photographer_unavailable',
          message: 'Primary photographer is not available during this time',
          severity: 'warning',
          suggested_resolution:
            'Consider backup photographer or different time slot',
        });
      }

      setConflicts(detectedConflicts);
    },
    [],
  );

  // Handle time slot selection
  const handleTimeSlotSelect = useCallback(
    async (timeSlot: TimeSlot) => {
      if (readonly || loading) return;

      setSelectedTimeSlot(timeSlot);
      await checkSchedulingConflicts(timeSlot);
    },
    [readonly, loading, checkSchedulingConflicts],
  );

  // Handle scheduling confirmation
  const handleScheduleConfirm = useCallback(async () => {
    if (!selectedTimeSlot || conflicts.some((c) => c.severity === 'error')) {
      return;
    }

    setLoading(true);
    try {
      await onScheduleUpdate(photoGroup.id, selectedTimeSlot.id);

      // Broadcast update to other users
      if (isConnected) {
        await send('schedule_updated', {
          group_id: photoGroup.id,
          time_slot_id: selectedTimeSlot.id,
          group_name: photoGroup.name,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('Failed to update schedule:', error);
    } finally {
      setLoading(false);
    }
  }, [
    selectedTimeSlot,
    conflicts,
    photoGroup,
    onScheduleUpdate,
    send,
    isConnected,
  ]);

  // Get formatted time slots by day
  const timeSlotsByDay = useMemo(() => {
    const grouped = availableTimeSlots.reduce(
      (acc, slot) => {
        const date = new Date(slot.start_time).toDateString();
        if (!acc[date]) acc[date] = [];
        acc[date].push(slot);
        return acc;
      },
      {} as Record<string, TimeSlot[]>,
    );

    // Sort slots within each day
    Object.values(grouped).forEach((slots) => {
      slots.sort(
        (a, b) =>
          new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
      );
    });

    return grouped;
  }, [availableTimeSlots]);

  // Format time for display
  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Conflict severity color classes
  const getConflictColor = (severity: 'warning' | 'error') => {
    return severity === 'error'
      ? 'bg-red-50 border-red-200 text-red-700'
      : 'bg-amber-50 border-amber-200 text-amber-700';
  };

  return (
    <div
      className={`bg-white border border-gray-200 rounded-xl overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-primary-600" />
              Schedule: {photoGroup.name}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Duration: {photoGroup.estimated_time_minutes} minutes
              {photoGroup.location && (
                <span className="ml-3 inline-flex items-center">
                  <MapPin className="w-3 h-3 mr-1" />
                  {photoGroup.location}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                setViewMode(viewMode === 'timeline' ? 'calendar' : 'timeline')
              }
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {viewMode === 'timeline' ? 'Calendar View' : 'Timeline View'}
            </button>
          </div>
        </div>
      </div>

      {/* Conflicts Display */}
      {conflicts.length > 0 && (
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="space-y-3">
            {conflicts.map((conflict, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${getConflictColor(conflict.severity)}`}
              >
                <div className="flex items-start">
                  {conflict.severity === 'error' ? (
                    <XCircle className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium">{conflict.message}</p>
                    {conflict.suggested_resolution && (
                      <p className="text-sm mt-1 opacity-80">
                        Suggestion: {conflict.suggested_resolution}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Time Slots Grid */}
      <div className="p-6">
        {viewMode === 'timeline' ? (
          <div className="space-y-6">
            {Object.entries(timeSlotsByDay).map(([date, slots]) => (
              <div key={date}>
                <h4 className="text-base font-medium text-gray-900 mb-3 pb-2 border-b border-gray-100">
                  {new Date(date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {slots.map((slot) => (
                    <button
                      key={slot.id}
                      onClick={() => handleTimeSlotSelect(slot)}
                      disabled={readonly || !slot.is_available}
                      className={`p-4 border rounded-lg transition-all duration-200 text-left ${
                        selectedTimeSlot?.id === slot.id
                          ? 'border-primary-300 bg-primary-50 ring-2 ring-primary-100'
                          : slot.is_available
                            ? 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            : 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-2 text-gray-500" />
                          <span className="font-medium text-gray-900">
                            {formatTime(slot.start_time)} -{' '}
                            {formatTime(slot.end_time)}
                          </span>
                        </div>
                        {slot.assigned_group_id ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : slot.is_available ? (
                          <div className="w-2 h-2 bg-green-400 rounded-full" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-400" />
                        )}
                      </div>

                      <div className="text-sm text-gray-600">
                        <div className="flex items-center">
                          <span>{slot.duration_minutes} minutes</span>
                          {slot.location && (
                            <>
                              <span className="mx-2">•</span>
                              <span>{slot.location}</span>
                            </>
                          )}
                        </div>

                        {slot.conflicts.length > 0 && (
                          <div className="mt-2 flex items-center text-amber-600">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            <span className="text-xs">
                              {slot.conflicts.length} conflict
                              {slot.conflicts.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Calendar view implementation would go here
          <div className="text-center py-12 text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Calendar view coming soon</p>
          </div>
        )}

        {/* No time slots available */}
        {Object.keys(timeSlotsByDay).length === 0 && (
          <div className="text-center py-12">
            <Clock className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No time slots available
            </h3>
            <p className="text-gray-600">
              Contact your photographer to add available time slots for
              scheduling.
            </p>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      {selectedTimeSlot && !readonly && (
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              <strong>Selected:</strong>{' '}
              {formatTime(selectedTimeSlot.start_time)} -{' '}
              {formatTime(selectedTimeSlot.end_time)}
              {selectedTimeSlot.location && ` at ${selectedTimeSlot.location}`}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setSelectedTimeSlot(null)}
                disabled={loading}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Clear
              </button>
              <button
                onClick={handleScheduleConfirm}
                disabled={
                  loading || conflicts.some((c) => c.severity === 'error')
                }
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50 inline-flex items-center gap-2"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                {loading ? 'Scheduling...' : 'Confirm Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PhotoGroupScheduler;
