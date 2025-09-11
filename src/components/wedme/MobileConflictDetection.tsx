'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  AlertTriangleIcon,
  AlertCircleIcon,
  InfoIcon,
  XMarkIcon,
  CheckIcon,
  ClockIcon,
  MapPinIcon,
  UsersIcon,
  CameraIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  RefreshCwIcon,
  EyeOffIcon,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useWeddingDayOffline } from '@/hooks/useWeddingDayOffline';
import { cn } from '@/lib/utils';

// Types
interface PhotoGroup {
  id: string;
  name: string;
  venue: string;
  startTime: string;
  endTime: string;
  estimatedDuration: number; // minutes
  assignedGuests: Array<{
    id: string;
    name: string;
  }>;
  photographerId?: string;
  priority: 'high' | 'medium' | 'low';
  isLocked?: boolean;
}

interface Conflict {
  id: string;
  type:
    | 'time_overlap'
    | 'venue_double_booking'
    | 'guest_unavailable'
    | 'photographer_conflict'
    | 'travel_time'
    | 'preparation_time';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  affectedGroups: string[];
  affectedResources: {
    venues?: string[];
    guests?: string[];
    photographers?: string[];
  };
  suggestedResolutions: Array<{
    id: string;
    type:
      | 'reschedule'
      | 'relocate'
      | 'reassign'
      | 'split_group'
      | 'adjust_duration';
    description: string;
    impact: 'low' | 'medium' | 'high';
  }>;
  createdAt: string;
  isDismissed: boolean;
  isAcknowledged: boolean;
  autoResolve: boolean;
}

interface MobileConflictDetectionProps {
  photoGroups: PhotoGroup[];
  weddingId: string;
  onResolveConflict: (conflictId: string, resolution: any) => Promise<void>;
  onDismissConflict: (conflictId: string) => void;
  onAcknowledgeConflict: (conflictId: string) => void;
}

// Conflict Detection Logic
const detectConflicts = (photoGroups: PhotoGroup[]): Conflict[] => {
  const conflicts: Conflict[] = [];
  const now = new Date().toISOString();

  // Helper to parse time strings
  const parseTime = (timeStr: string): Date => {
    // Mock parsing - in real app would properly parse time strings
    return new Date(timeStr);
  };

  // Check for time overlaps
  for (let i = 0; i < photoGroups.length; i++) {
    for (let j = i + 1; j < photoGroups.length; j++) {
      const group1 = photoGroups[i];
      const group2 = photoGroups[j];

      const start1 = parseTime(group1.startTime);
      const end1 = parseTime(group1.endTime);
      const start2 = parseTime(group2.startTime);
      const end2 = parseTime(group2.endTime);

      // Check for time overlap
      if (start1 < end2 && start2 < end1) {
        conflicts.push({
          id: `time_overlap_${group1.id}_${group2.id}`,
          type: 'time_overlap',
          severity:
            group1.priority === 'high' || group2.priority === 'high'
              ? 'critical'
              : 'warning',
          title: 'Schedule Conflict',
          description: `${group1.name} and ${group2.name} have overlapping time slots`,
          affectedGroups: [group1.id, group2.id],
          affectedResources: {},
          suggestedResolutions: [
            {
              id: 'reschedule_later',
              type: 'reschedule',
              description: `Move ${group2.name} to start after ${group1.name}`,
              impact: 'medium',
            },
            {
              id: 'shorten_duration',
              type: 'adjust_duration',
              description: 'Reduce duration of both groups by 10 minutes',
              impact: 'low',
            },
          ],
          createdAt: now,
          isDismissed: false,
          isAcknowledged: false,
          autoResolve: false,
        });
      }

      // Check for venue double booking
      if (group1.venue === group2.venue && start1 < end2 && start2 < end1) {
        conflicts.push({
          id: `venue_conflict_${group1.id}_${group2.id}`,
          type: 'venue_double_booking',
          severity: 'critical',
          title: 'Venue Double Booking',
          description: `Both ${group1.name} and ${group2.name} are scheduled at ${group1.venue}`,
          affectedGroups: [group1.id, group2.id],
          affectedResources: { venues: [group1.venue] },
          suggestedResolutions: [
            {
              id: 'relocate_group',
              type: 'relocate',
              description: `Move ${group2.name} to alternative venue`,
              impact: 'medium',
            },
            {
              id: 'sequential_scheduling',
              type: 'reschedule',
              description: 'Schedule groups sequentially at same venue',
              impact: 'low',
            },
          ],
          createdAt: now,
          isDismissed: false,
          isAcknowledged: false,
          autoResolve: false,
        });
      }

      // Check for guest conflicts
      const sharedGuests = group1.assignedGuests.filter((g1) =>
        group2.assignedGuests.some((g2) => g2.id === g1.id),
      );

      if (sharedGuests.length > 0 && start1 < end2 && start2 < end1) {
        conflicts.push({
          id: `guest_conflict_${group1.id}_${group2.id}`,
          type: 'guest_unavailable',
          severity: 'warning',
          title: 'Guest Availability Conflict',
          description: `${sharedGuests.length} guest${sharedGuests.length > 1 ? 's' : ''} assigned to overlapping groups`,
          affectedGroups: [group1.id, group2.id],
          affectedResources: { guests: sharedGuests.map((g) => g.id) },
          suggestedResolutions: [
            {
              id: 'remove_from_later',
              type: 'reassign',
              description: `Remove shared guests from ${group2.name}`,
              impact: 'medium',
            },
            {
              id: 'split_session',
              type: 'split_group',
              description: 'Split overlapping groups into separate sessions',
              impact: 'high',
            },
          ],
          createdAt: now,
          isDismissed: false,
          isAcknowledged: false,
          autoResolve: false,
        });
      }

      // Check for photographer conflicts
      if (
        group1.photographerId &&
        group2.photographerId &&
        group1.photographerId === group2.photographerId &&
        start1 < end2 &&
        start2 < end1
      ) {
        conflicts.push({
          id: `photographer_conflict_${group1.id}_${group2.id}`,
          type: 'photographer_conflict',
          severity: 'critical',
          title: 'Photographer Double Booking',
          description: 'Same photographer assigned to overlapping sessions',
          affectedGroups: [group1.id, group2.id],
          affectedResources: { photographers: [group1.photographerId] },
          suggestedResolutions: [
            {
              id: 'assign_backup',
              type: 'reassign',
              description: 'Assign backup photographer to one session',
              impact: 'medium',
            },
            {
              id: 'reschedule_sequential',
              type: 'reschedule',
              description: 'Schedule sessions back-to-back',
              impact: 'low',
            },
          ],
          createdAt: now,
          isDismissed: false,
          isAcknowledged: false,
          autoResolve: false,
        });
      }
    }
  }

  // Check for travel time issues
  photoGroups.forEach((group, index) => {
    const nextGroup = photoGroups[index + 1];
    if (nextGroup && group.venue !== nextGroup.venue) {
      const groupEnd = parseTime(group.endTime);
      const nextStart = parseTime(nextGroup.startTime);
      const timeBetween =
        (nextStart.getTime() - groupEnd.getTime()) / (1000 * 60); // minutes

      // Assume 15 minutes minimum travel time between venues
      if (timeBetween < 15) {
        conflicts.push({
          id: `travel_time_${group.id}_${nextGroup.id}`,
          type: 'travel_time',
          severity: 'warning',
          title: 'Insufficient Travel Time',
          description: `Only ${timeBetween} minutes between ${group.venue} and ${nextGroup.venue}`,
          affectedGroups: [group.id, nextGroup.id],
          affectedResources: { venues: [group.venue, nextGroup.venue] },
          suggestedResolutions: [
            {
              id: 'add_buffer',
              type: 'reschedule',
              description: 'Add 15-minute buffer between sessions',
              impact: 'low',
            },
            {
              id: 'same_venue',
              type: 'relocate',
              description: 'Move one session to same venue',
              impact: 'medium',
            },
          ],
          createdAt: now,
          isDismissed: false,
          isAcknowledged: false,
          autoResolve: true,
        });
      }
    }
  });

  return conflicts;
};

// Conflict Card Component
function ConflictCard({
  conflict,
  onResolve,
  onDismiss,
  onAcknowledge,
  isExpanded,
  onToggleExpand,
}: {
  conflict: Conflict;
  onResolve: (resolutionId: string) => void;
  onDismiss: () => void;
  onAcknowledge: () => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}) {
  const getSeverityColor = (severity: Conflict['severity']) => {
    switch (severity) {
      case 'critical':
        return 'bg-error-50 border-error-200 text-error-700';
      case 'warning':
        return 'bg-warning-50 border-warning-200 text-warning-700';
      case 'info':
        return 'bg-primary-50 border-primary-200 text-primary-700';
    }
  };

  const getSeverityIcon = (severity: Conflict['severity']) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangleIcon className="w-4 h-4" />;
      case 'warning':
        return <AlertCircleIcon className="w-4 h-4" />;
      case 'info':
        return <InfoIcon className="w-4 h-4" />;
    }
  };

  const getTypeIcon = (type: Conflict['type']) => {
    switch (type) {
      case 'time_overlap':
        return <ClockIcon className="w-4 h-4" />;
      case 'venue_double_booking':
        return <MapPinIcon className="w-4 h-4" />;
      case 'guest_unavailable':
        return <UsersIcon className="w-4 h-4" />;
      case 'photographer_conflict':
        return <CameraIcon className="w-4 h-4" />;
      default:
        return <AlertCircleIcon className="w-4 h-4" />;
    }
  };

  return (
    <div
      className={cn(
        'bg-white rounded-lg border-2 shadow-xs',
        getSeverityColor(conflict.severity),
        conflict.isDismissed && 'opacity-60',
        conflict.isAcknowledged && 'border-success-200 bg-success-50',
      )}
    >
      {/* Header */}
      <div
        className="p-4 cursor-pointer touch-manipulation"
        onClick={onToggleExpand}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1 min-w-0">
            <div className="flex items-center space-x-2 flex-shrink-0">
              {getSeverityIcon(conflict.severity)}
              {getTypeIcon(conflict.type)}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-gray-900 text-sm">
                {conflict.title}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {conflict.description}
              </p>
              <div className="flex items-center gap-2 mt-2 text-xs">
                <span className="capitalize px-2 py-1 bg-white bg-opacity-60 rounded-full">
                  {conflict.severity}
                </span>
                <span className="px-2 py-1 bg-white bg-opacity-60 rounded-full">
                  {conflict.affectedGroups.length} group
                  {conflict.affectedGroups.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 flex-shrink-0">
            {conflict.isAcknowledged && (
              <CheckIcon className="w-4 h-4 text-success-600" />
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDismiss();
              }}
              className="p-1 rounded text-gray-400 hover:text-gray-600 touch-manipulation"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
            <div className="text-gray-400">
              {isExpanded ? (
                <ChevronUpIcon className="w-4 h-4" />
              ) : (
                <ChevronDownIcon className="w-4 h-4" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-200 p-4 space-y-4">
          {/* Affected Resources */}
          {(conflict.affectedResources.venues ||
            conflict.affectedResources.guests ||
            conflict.affectedResources.photographers) && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-900">
                Affected Resources:
              </h4>
              <div className="space-y-1 text-xs text-gray-600">
                {conflict.affectedResources.venues && (
                  <div className="flex items-center space-x-1">
                    <MapPinIcon className="w-3 h-3" />
                    <span>
                      Venues: {conflict.affectedResources.venues.join(', ')}
                    </span>
                  </div>
                )}
                {conflict.affectedResources.guests && (
                  <div className="flex items-center space-x-1">
                    <UsersIcon className="w-3 h-3" />
                    <span>
                      Guests: {conflict.affectedResources.guests.length}{' '}
                      affected
                    </span>
                  </div>
                )}
                {conflict.affectedResources.photographers && (
                  <div className="flex items-center space-x-1">
                    <CameraIcon className="w-3 h-3" />
                    <span>
                      Photographers:{' '}
                      {conflict.affectedResources.photographers.length} affected
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Suggested Resolutions */}
          {conflict.suggestedResolutions.length > 0 &&
            !conflict.isDismissed && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-900">
                  Suggested Solutions:
                </h4>
                <div className="space-y-2">
                  {conflict.suggestedResolutions.map((resolution) => (
                    <div
                      key={resolution.id}
                      className="flex items-center justify-between p-2 bg-white bg-opacity-60 rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="text-sm text-gray-900">
                          {resolution.description}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span
                            className={cn(
                              'text-xs px-2 py-0.5 rounded-full',
                              resolution.impact === 'low'
                                ? 'bg-success-100 text-success-700'
                                : resolution.impact === 'medium'
                                  ? 'bg-warning-100 text-warning-700'
                                  : 'bg-error-100 text-error-700',
                            )}
                          >
                            {resolution.impact} impact
                          </span>
                          <span className="text-xs text-gray-500 capitalize">
                            {resolution.type.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => onResolve(resolution.id)}
                        className="ml-2 px-3 py-1.5 bg-primary-600 text-white text-xs font-medium rounded-lg touch-manipulation hover:bg-primary-700 transition-colors"
                      >
                        Apply
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* Actions */}
          <div className="flex space-x-2 pt-2">
            {!conflict.isAcknowledged && (
              <button
                onClick={onAcknowledge}
                className="flex-1 py-2 px-3 bg-success-100 text-success-700 rounded-lg text-sm font-medium touch-manipulation hover:bg-success-200 transition-colors"
              >
                Acknowledge
              </button>
            )}
            <button
              onClick={onDismiss}
              className="flex-1 py-2 px-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium touch-manipulation hover:bg-gray-200 transition-colors"
            >
              {conflict.isDismissed ? 'Dismissed' : 'Dismiss'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Main Component
export function MobileConflictDetection({
  photoGroups,
  weddingId,
  onResolveConflict,
  onDismissConflict,
  onAcknowledgeConflict,
}: MobileConflictDetectionProps) {
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [expandedConflicts, setExpandedConflicts] = useState<Set<string>>(
    new Set(),
  );
  const [showDismissed, setShowDismissed] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning' | 'info'>(
    'all',
  );

  const { toast } = useToast();

  // Enhanced offline support
  const offlineHook = useWeddingDayOffline({
    weddingId,
    coordinatorId: 'current-user',
    enablePreCaching: true,
    enablePerformanceOptimization: true,
  });

  // Detect conflicts when photo groups change
  const refreshConflicts = useCallback(() => {
    setIsRefreshing(true);

    try {
      const detectedConflicts = detectConflicts(photoGroups);

      // Merge with existing dismissed/acknowledged states
      const mergedConflicts = detectedConflicts.map((newConflict) => {
        const existing = conflicts.find((c) => c.id === newConflict.id);
        return existing
          ? {
              ...newConflict,
              isDismissed: existing.isDismissed,
              isAcknowledged: existing.isAcknowledged,
            }
          : newConflict;
      });

      setConflicts(mergedConflicts);

      // Auto-expand critical conflicts
      const criticalConflictIds = mergedConflicts
        .filter((c) => c.severity === 'critical' && !c.isDismissed)
        .map((c) => c.id);

      if (criticalConflictIds.length > 0) {
        setExpandedConflicts(
          (prev) => new Set([...prev, ...criticalConflictIds]),
        );
      }
    } catch (error) {
      toast({
        title: 'Error detecting conflicts',
        description: 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [photoGroups, conflicts, toast]);

  // Initial conflict detection and refresh on photo groups change
  useEffect(() => {
    refreshConflicts();
  }, [photoGroups.length]); // Only trigger on groups count change to avoid infinite loops

  // Filter conflicts
  const filteredConflicts = useMemo(() => {
    let filtered = conflicts;

    if (!showDismissed) {
      filtered = filtered.filter((c) => !c.isDismissed);
    }

    if (filter !== 'all') {
      filtered = filtered.filter((c) => c.severity === filter);
    }

    return filtered.sort((a, b) => {
      // Sort by severity (critical first), then by creation time
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      const severityDiff =
        severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;

      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [conflicts, showDismissed, filter]);

  // Toggle conflict expansion
  const toggleExpand = useCallback((conflictId: string) => {
    setExpandedConflicts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(conflictId)) {
        newSet.delete(conflictId);
      } else {
        newSet.add(conflictId);
      }
      return newSet;
    });
  }, []);

  // Handle conflict resolution
  const handleResolveConflict = useCallback(
    async (conflictId: string, resolutionId: string) => {
      try {
        await onResolveConflict(conflictId, { resolutionId });

        // Mark conflict as resolved/dismissed
        setConflicts((prev) =>
          prev.map((c) =>
            c.id === conflictId
              ? { ...c, isDismissed: true, isAcknowledged: true }
              : c,
          ),
        );

        toast({
          title: 'Conflict resolved',
          description: 'The suggested solution has been applied',
        });

        // Refresh conflicts to detect any new ones
        setTimeout(refreshConflicts, 1000);
      } catch (error) {
        toast({
          title: 'Resolution failed',
          description: 'Please try again or resolve manually',
          variant: 'destructive',
        });
      }
    },
    [onResolveConflict, toast, refreshConflicts],
  );

  // Handle dismiss conflict
  const handleDismissConflict = useCallback(
    (conflictId: string) => {
      setConflicts((prev) =>
        prev.map((c) =>
          c.id === conflictId ? { ...c, isDismissed: true } : c,
        ),
      );
      onDismissConflict(conflictId);

      toast({
        title: 'Conflict dismissed',
        description: 'This conflict will be hidden',
      });
    },
    [onDismissConflict, toast],
  );

  // Handle acknowledge conflict
  const handleAcknowledgeConflict = useCallback(
    (conflictId: string) => {
      setConflicts((prev) =>
        prev.map((c) =>
          c.id === conflictId ? { ...c, isAcknowledged: true } : c,
        ),
      );
      onAcknowledgeConflict(conflictId);

      toast({
        title: 'Conflict acknowledged',
        description: 'Marked as reviewed',
      });
    },
    [onAcknowledgeConflict, toast],
  );

  // Get conflict counts by severity
  const conflictCounts = useMemo(() => {
    const counts = { critical: 0, warning: 0, info: 0, total: 0 };

    conflicts
      .filter((c) => !c.isDismissed)
      .forEach((conflict) => {
        counts[conflict.severity]++;
        counts.total++;
      });

    return counts;
  }, [conflicts]);

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <AlertTriangleIcon className="w-5 h-5 text-warning-600" />
            <h2 className="text-lg font-medium text-gray-900">
              Conflict Detection
            </h2>
            {!offlineHook.isOnline && (
              <span className="px-2 py-1 bg-warning-50 text-warning-700 text-xs font-medium rounded-full border border-warning-200">
                Offline
              </span>
            )}
          </div>
          <button
            onClick={refreshConflicts}
            disabled={isRefreshing}
            className="p-2 text-gray-500 hover:text-gray-700 touch-manipulation disabled:opacity-50"
          >
            <RefreshCwIcon
              className={cn('w-4 h-4', isRefreshing && 'animate-spin')}
            />
          </button>
        </div>

        {/* Conflict Stats */}
        <div className="grid grid-cols-4 gap-3 text-center">
          <div>
            <div className="text-lg font-semibold text-error-600">
              {conflictCounts.critical}
            </div>
            <div className="text-xs text-gray-500">Critical</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-warning-600">
              {conflictCounts.warning}
            </div>
            <div className="text-xs text-gray-500">Warning</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-primary-600">
              {conflictCounts.info}
            </div>
            <div className="text-xs text-gray-500">Info</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-gray-900">
              {conflictCounts.total}
            </div>
            <div className="text-xs text-gray-500">Total</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center justify-between mt-3">
          <div className="flex gap-1 overflow-x-auto">
            {['all', 'critical', 'warning', 'info'].map((filterOption) => (
              <button
                key={filterOption}
                onClick={() => setFilter(filterOption as typeof filter)}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap touch-manipulation',
                  'transition-colors duration-200',
                  filter === filterOption
                    ? 'bg-primary-100 text-primary-700 border border-primary-300'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                )}
              >
                {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowDismissed(!showDismissed)}
            className={cn(
              'flex items-center space-x-1 px-2 py-1 text-xs font-medium rounded touch-manipulation',
              showDismissed
                ? 'bg-gray-200 text-gray-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
            )}
          >
            <EyeOffIcon className="w-3 h-3" />
            <span>Dismissed</span>
          </button>
        </div>
      </div>

      {/* Conflicts List */}
      <div className="p-4">
        {isRefreshing && (
          <div className="text-center py-4">
            <RefreshCwIcon className="w-6 h-6 animate-spin mx-auto text-gray-400 mb-2" />
            <p className="text-sm text-gray-500">Checking for conflicts...</p>
          </div>
        )}

        {!isRefreshing && filteredConflicts.length === 0 && (
          <div className="text-center py-12">
            <CheckIcon className="w-12 h-12 text-success-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {filter === 'all'
                ? 'No conflicts found'
                : `No ${filter} conflicts`}
            </h3>
            <p className="text-gray-600 text-sm">
              {conflicts.some((c) => c.isDismissed) && !showDismissed
                ? 'All conflicts have been addressed or dismissed'
                : 'Your photo schedule looks good!'}
            </p>
          </div>
        )}

        {!isRefreshing && filteredConflicts.length > 0 && (
          <div className="space-y-3">
            {filteredConflicts.map((conflict) => (
              <ConflictCard
                key={conflict.id}
                conflict={conflict}
                onResolve={(resolutionId) =>
                  handleResolveConflict(conflict.id, resolutionId)
                }
                onDismiss={() => handleDismissConflict(conflict.id)}
                onAcknowledge={() => handleAcknowledgeConflict(conflict.id)}
                isExpanded={expandedConflicts.has(conflict.id)}
                onToggleExpand={() => toggleExpand(conflict.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Global Actions */}
      {conflictCounts.total > 0 && (
        <div className="border-t border-gray-200 p-4">
          <div className="flex space-x-2">
            <button
              onClick={() => {
                // Acknowledge all conflicts
                conflicts
                  .filter((c) => !c.isDismissed && !c.isAcknowledged)
                  .forEach((c) => {
                    handleAcknowledgeConflict(c.id);
                  });
              }}
              className="flex-1 py-2 px-3 bg-success-100 text-success-700 rounded-lg text-sm font-medium touch-manipulation hover:bg-success-200 transition-colors"
            >
              Acknowledge All
            </button>
            <button
              onClick={() => {
                // Dismiss all non-critical conflicts
                conflicts
                  .filter((c) => !c.isDismissed && c.severity !== 'critical')
                  .forEach((c) => {
                    handleDismissConflict(c.id);
                  });
              }}
              className="flex-1 py-2 px-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium touch-manipulation hover:bg-gray-200 transition-colors"
            >
              Dismiss Warnings
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
