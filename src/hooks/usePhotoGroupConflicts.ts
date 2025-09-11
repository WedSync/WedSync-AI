import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  PhotoGroup,
  PhotoGroupConflict,
  TimelineConflict,
} from '@/types/photo-groups';

interface UsePhotoGroupConflictsReturn {
  conflicts: PhotoGroupConflict[];
  timelineConflicts: TimelineConflict[];
  checkConflicts: (
    guestId: string,
    targetGroupId: string,
  ) => PhotoGroupConflict[];
  validateGroupTiming: (groupId: string) => TimelineConflict[];
  hasConflicts: boolean;
  conflictsByGroup: Record<string, PhotoGroupConflict[]>;
}

// Timeline slot mappings for conflict detection
const TIMELINE_SLOTS = {
  'pre-ceremony': { start: '08:00', end: '11:00' },
  'ceremony-before': { start: '10:00', end: '13:00' },
  'ceremony-after': { start: '13:00', end: '15:00' },
  'cocktail-hour': { start: '15:00', end: '17:00' },
  'reception-before': { start: '16:00', end: '18:00' },
  'reception-during': { start: '18:00', end: '22:00' },
  'reception-after': { start: '21:00', end: '23:00' },
};

export function usePhotoGroupConflicts(
  groups: PhotoGroup[],
): UsePhotoGroupConflictsReturn {
  const [conflicts, setConflicts] = useState<PhotoGroupConflict[]>([]);
  const [timelineConflicts, setTimelineConflicts] = useState<
    TimelineConflict[]
  >([]);

  // Parse timeline slot to get start/end times
  const parseTimelineSlot = useCallback((slot: string) => {
    if (slot.includes('-') && slot.includes(':')) {
      // Format: "14:00-15:30"
      const [start, end] = slot.split('-');
      return { start: start.trim(), end: end.trim() };
    }

    // Use predefined slot
    return TIMELINE_SLOTS[slot as keyof typeof TIMELINE_SLOTS] || null;
  }, []);

  // Check if two time ranges overlap
  const timesOverlap = useCallback(
    (start1: string, end1: string, start2: string, end2: string) => {
      const parseTime = (time: string) => {
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
      };

      const s1 = parseTime(start1);
      const e1 = parseTime(end1);
      const s2 = parseTime(start2);
      const e2 = parseTime(end2);

      return s1 < e2 && s2 < e1;
    },
    [],
  );

  // Detect all conflicts
  const detectConflicts = useCallback(() => {
    const newConflicts: PhotoGroupConflict[] = [];
    const newTimelineConflicts: TimelineConflict[] = [];

    for (let i = 0; i < groups.length; i++) {
      const group1 = groups[i];

      for (let j = i + 1; j < groups.length; j++) {
        const group2 = groups[j];

        // Check for guest overlap conflicts
        const group1Guests = new Set(
          group1.assignments?.map((a) => a.guest_id) || [],
        );
        const group2Guests = new Set(
          group2.assignments?.map((a) => a.guest_id) || [],
        );

        const commonGuests = [...group1Guests].filter((guestId) =>
          group2Guests.has(guestId),
        );

        if (commonGuests.length > 0) {
          newConflicts.push({
            groupId: group1.id,
            conflictingGroupId: group2.id,
            reason: 'guest_overlap',
            severity: 'error',
            message: `${commonGuests.length} guest${commonGuests.length !== 1 ? 's' : ''} assigned to both "${group1.name}" and "${group2.name}"`,
          });

          // Add reverse conflict
          newConflicts.push({
            groupId: group2.id,
            conflictingGroupId: group1.id,
            reason: 'guest_overlap',
            severity: 'error',
            message: `${commonGuests.length} guest${commonGuests.length !== 1 ? 's' : ''} assigned to both "${group2.name}" and "${group1.name}"`,
          });
        }

        // Check for timeline conflicts
        if (group1.timeline_slot && group2.timeline_slot) {
          const time1 = parseTimelineSlot(group1.timeline_slot);
          const time2 = parseTimelineSlot(group2.timeline_slot);

          if (time1 && time2) {
            // Calculate estimated end times
            const end1Time = new Date(`2024-01-01T${time1.start}:00`);
            end1Time.setMinutes(
              end1Time.getMinutes() + group1.estimated_time_minutes,
            );
            const end1 = end1Time.toTimeString().slice(0, 5);

            const end2Time = new Date(`2024-01-01T${time2.start}:00`);
            end2Time.setMinutes(
              end2Time.getMinutes() + group2.estimated_time_minutes,
            );
            const end2 = end2Time.toTimeString().slice(0, 5);

            if (timesOverlap(time1.start, end1, time2.start, end2)) {
              newConflicts.push({
                groupId: group1.id,
                conflictingGroupId: group2.id,
                reason: 'time_overlap',
                severity: 'warning',
                message: `Time overlap with "${group2.name}" (${time1.start}-${end1} vs ${time2.start}-${end2})`,
              });

              newConflicts.push({
                groupId: group2.id,
                conflictingGroupId: group1.id,
                reason: 'time_overlap',
                severity: 'warning',
                message: `Time overlap with "${group1.name}" (${time2.start}-${end2} vs ${time1.start}-${end1})`,
              });
            }
          }
        }

        // Check for location conflicts (if scheduled at same time)
        if (
          group1.location &&
          group2.location &&
          group1.location.toLowerCase() === group2.location.toLowerCase() &&
          group1.timeline_slot === group2.timeline_slot
        ) {
          newConflicts.push({
            groupId: group1.id,
            conflictingGroupId: group2.id,
            reason: 'location_conflict',
            severity: 'warning',
            message: `Same location "${group1.location}" booked for same time slot`,
          });

          newConflicts.push({
            groupId: group2.id,
            conflictingGroupId: group1.id,
            reason: 'location_conflict',
            severity: 'warning',
            message: `Same location "${group2.location}" booked for same time slot`,
          });
        }
      }
    }

    setConflicts(newConflicts);
    setTimelineConflicts(newTimelineConflicts);
  }, [groups, parseTimelineSlot, timesOverlap]);

  // Run conflict detection when groups change
  useEffect(() => {
    detectConflicts();
  }, [detectConflicts]);

  // Check conflicts for a specific guest assignment
  const checkConflicts = useCallback(
    (guestId: string, targetGroupId: string): PhotoGroupConflict[] => {
      const targetGroup = groups.find((g) => g.id === targetGroupId);
      if (!targetGroup) return [];

      const potentialConflicts: PhotoGroupConflict[] = [];

      // Check if guest is already in other groups
      for (const group of groups) {
        if (group.id === targetGroupId) continue;

        const isGuestInGroup = group.assignments?.some(
          (a) => a.guest_id === guestId,
        );
        if (isGuestInGroup) {
          potentialConflicts.push({
            groupId: targetGroupId,
            conflictingGroupId: group.id,
            reason: 'guest_overlap',
            severity: 'error',
            message: `Guest is already assigned to "${group.name}"`,
          });

          // Check for timeline conflicts with existing assignment
          if (group.timeline_slot && targetGroup.timeline_slot) {
            const time1 = parseTimelineSlot(group.timeline_slot);
            const time2 = parseTimelineSlot(targetGroup.timeline_slot);

            if (
              time1 &&
              time2 &&
              timesOverlap(time1.start, time1.end, time2.start, time2.end)
            ) {
              potentialConflicts.push({
                groupId: targetGroupId,
                conflictingGroupId: group.id,
                reason: 'time_overlap',
                severity: 'error',
                message: `Guest cannot be in overlapping time slots: "${group.name}" and "${targetGroup.name}"`,
              });
            }
          }
        }
      }

      return potentialConflicts;
    },
    [groups, parseTimelineSlot, timesOverlap],
  );

  // Validate timing for a specific group
  const validateGroupTiming = useCallback(
    (groupId: string): TimelineConflict[] => {
      const group = groups.find((g) => g.id === groupId);
      if (!group || !group.timeline_slot) return [];

      const timelineConflictsForGroup: TimelineConflict[] = [];
      const timeSlot = parseTimelineSlot(group.timeline_slot);

      if (!timeSlot) return [];

      // Check if estimated time fits within the slot
      const slotDuration = (() => {
        const parseTime = (time: string) => {
          const [hours, minutes] = time.split(':').map(Number);
          return hours * 60 + minutes;
        };
        return parseTime(timeSlot.end) - parseTime(timeSlot.start);
      })();

      if (group.estimated_time_minutes > slotDuration) {
        timelineConflictsForGroup.push({
          slot_id: group.timeline_slot,
          total_estimated_time: group.estimated_time_minutes,
          available_time: slotDuration,
          conflicting_groups: [group],
        });
      }

      return timelineConflictsForGroup;
    },
    [groups, parseTimelineSlot],
  );

  // Computed values
  const hasConflicts = conflicts.length > 0;

  const conflictsByGroup = useMemo(() => {
    const grouped: Record<string, PhotoGroupConflict[]> = {};

    for (const conflict of conflicts) {
      if (!grouped[conflict.groupId]) {
        grouped[conflict.groupId] = [];
      }
      grouped[conflict.groupId].push(conflict);
    }

    return grouped;
  }, [conflicts]);

  return {
    conflicts,
    timelineConflicts,
    checkConflicts,
    validateGroupTiming,
    hasConflicts,
    conflictsByGroup,
  };
}
