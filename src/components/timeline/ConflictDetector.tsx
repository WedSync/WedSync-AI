'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  X,
  Clock,
  Users,
  MapPin,
  Zap,
  ChevronDown,
  ChevronUp,
  Filter,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO, differenceInMinutes } from 'date-fns';
import type {
  TimelineConflict,
  TimelineEvent,
  ConflictType,
  ConflictSeverity,
} from '@/types/timeline';
import { autoTimeCalculator } from '@/lib/services/autoTimeCalculator';

interface ConflictDetectorProps {
  events: TimelineEvent[];
  conflicts: TimelineConflict[];
  onResolveConflict?: (conflictId: string, resolution?: any) => void;
  onAutoResolve?: (conflicts: TimelineConflict[]) => void;
  onEventUpdate?: (eventId: string, updates: Partial<TimelineEvent>) => void;
  className?: string;
  showInline?: boolean;
  realTimeDetection?: boolean;
}

interface ConflictFilter {
  severity?: ConflictSeverity[];
  type?: ConflictType[];
  resolved?: boolean;
  canAutoResolve?: boolean;
}

interface ConflictResolution {
  conflictId: string;
  strategy:
    | 'adjust_timing'
    | 'reassign_vendor'
    | 'merge_events'
    | 'split_event'
    | 'manual';
  changes: Array<{
    eventId: string;
    field: string;
    oldValue: any;
    newValue: any;
  }>;
  confidence: number;
  estimatedTimeSaving: number;
}

const SEVERITY_CONFIG = {
  info: {
    icon: Info,
    color: 'blue',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-800',
    iconColor: 'text-blue-600',
  },
  warning: {
    icon: AlertTriangle,
    color: 'yellow',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    textColor: 'text-yellow-800',
    iconColor: 'text-yellow-600',
  },
  error: {
    icon: AlertCircle,
    color: 'red',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    textColor: 'text-red-800',
    iconColor: 'text-red-600',
  },
} as const;

const CONFLICT_TYPE_CONFIG = {
  time_overlap: {
    label: 'Time Overlap',
    icon: Clock,
    description: 'Events overlap in time',
  },
  vendor_overlap: {
    label: 'Vendor Conflict',
    icon: Users,
    description: 'Same vendor assigned to multiple events',
  },
  location_conflict: {
    label: 'Location Issue',
    icon: MapPin,
    description: 'Location or travel time conflicts',
  },
  dependency_issue: {
    label: 'Dependency Problem',
    icon: ArrowRight,
    description: 'Event dependency violations',
  },
} as const;

export function ConflictDetector({
  events,
  conflicts: initialConflicts,
  onResolveConflict,
  onAutoResolve,
  onEventUpdate,
  className,
  showInline = false,
  realTimeDetection = true,
}: ConflictDetectorProps) {
  const [conflicts, setConflicts] =
    useState<TimelineConflict[]>(initialConflicts);
  const [filter, setFilter] = useState<ConflictFilter>({});
  const [expandedConflicts, setExpandedConflicts] = useState<Set<string>>(
    new Set(),
  );
  const [showResolved, setShowResolved] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [resolutionSuggestions, setResolutionSuggestions] = useState<
    ConflictResolution[]
  >([]);

  // Update conflicts when external conflicts change
  useEffect(() => {
    setConflicts(initialConflicts);
  }, [initialConflicts]);

  // Real-time conflict detection
  useEffect(() => {
    if (!realTimeDetection) return;

    const detectConflicts = async () => {
      setIsDetecting(true);
      const detectedConflicts = await performConflictDetection(events);
      setConflicts(detectedConflicts);

      // Generate resolution suggestions
      const suggestions = await generateResolutionSuggestions(
        detectedConflicts,
        events,
      );
      setResolutionSuggestions(suggestions);

      setIsDetecting(false);
    };

    detectConflicts();
  }, [events, realTimeDetection]);

  // Filter conflicts
  const filteredConflicts = useMemo(() => {
    let filtered = conflicts;

    if (!showResolved) {
      filtered = filtered.filter((c) => !c.is_resolved);
    }

    if (filter.severity?.length) {
      filtered = filtered.filter((c) => filter.severity!.includes(c.severity));
    }

    if (filter.type?.length) {
      filtered = filtered.filter((c) => filter.type!.includes(c.conflict_type));
    }

    if (filter.resolved !== undefined) {
      filtered = filtered.filter((c) => c.is_resolved === filter.resolved);
    }

    if (filter.canAutoResolve !== undefined) {
      filtered = filtered.filter(
        (c) => c.can_auto_resolve === filter.canAutoResolve,
      );
    }

    return filtered;
  }, [conflicts, filter, showResolved]);

  // Group conflicts by severity
  const conflictsBySeverity = useMemo(() => {
    return filteredConflicts.reduce(
      (groups, conflict) => {
        const severity = conflict.severity;
        if (!groups[severity]) groups[severity] = [];
        groups[severity].push(conflict);
        return groups;
      },
      {} as Record<ConflictSeverity, TimelineConflict[]>,
    );
  }, [filteredConflicts]);

  // Statistics
  const stats = useMemo(() => {
    const total = conflicts.length;
    const resolved = conflicts.filter((c) => c.is_resolved).length;
    const critical = conflicts.filter((c) => c.severity === 'error').length;
    const autoResolvable = conflicts.filter(
      (c) => c.can_auto_resolve && !c.is_resolved,
    ).length;

    return { total, resolved, critical, autoResolvable };
  }, [conflicts]);

  // Handle conflict expansion
  const toggleConflictExpansion = useCallback((conflictId: string) => {
    setExpandedConflicts((prev) => {
      const next = new Set(prev);
      if (next.has(conflictId)) {
        next.delete(conflictId);
      } else {
        next.add(conflictId);
      }
      return next;
    });
  }, []);

  // Handle conflict resolution
  const handleResolveConflict = useCallback(
    (conflict: TimelineConflict, resolution?: ConflictResolution) => {
      if (resolution) {
        // Apply resolution changes
        resolution.changes.forEach((change) => {
          if (onEventUpdate) {
            onEventUpdate(change.eventId, { [change.field]: change.newValue });
          }
        });
      }

      if (onResolveConflict) {
        onResolveConflict(conflict.id, resolution);
      }

      // Mark as resolved locally
      setConflicts((prev) =>
        prev.map((c) =>
          c.id === conflict.id
            ? { ...c, is_resolved: true, resolved_at: new Date().toISOString() }
            : c,
        ),
      );
    },
    [onResolveConflict, onEventUpdate],
  );

  // Handle auto-resolve all
  const handleAutoResolveAll = useCallback(() => {
    const autoResolvableConflicts = conflicts.filter(
      (c) => c.can_auto_resolve && !c.is_resolved,
    );

    if (onAutoResolve) {
      onAutoResolve(autoResolvableConflicts);
    }

    // Apply resolution suggestions
    const applicableResolutions = resolutionSuggestions.filter((r) =>
      autoResolvableConflicts.some((c) => c.id === r.conflictId),
    );

    applicableResolutions.forEach((resolution) => {
      resolution.changes.forEach((change) => {
        if (onEventUpdate) {
          onEventUpdate(change.eventId, { [change.field]: change.newValue });
        }
      });
    });

    // Mark all as resolved
    setConflicts((prev) =>
      prev.map((c) =>
        autoResolvableConflicts.some((ac) => ac.id === c.id)
          ? { ...c, is_resolved: true, resolved_at: new Date().toISOString() }
          : c,
      ),
    );
  }, [conflicts, resolutionSuggestions, onAutoResolve, onEventUpdate]);

  // Manual conflict detection trigger
  const triggerDetection = useCallback(async () => {
    setIsDetecting(true);
    const detectedConflicts = await performConflictDetection(events);
    setConflicts(detectedConflicts);
    const suggestions = await generateResolutionSuggestions(
      detectedConflicts,
      events,
    );
    setResolutionSuggestions(suggestions);
    setIsDetecting(false);
  }, [events]);

  // Inline view for timeline integration
  if (showInline) {
    return (
      <InlineConflictView
        conflicts={filteredConflicts}
        stats={stats}
        onResolveConflict={handleResolveConflict}
        onAutoResolveAll={handleAutoResolveAll}
      />
    );
  }

  return (
    <div className={cn('bg-white rounded-xl shadow-sm border', className)}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              <h3 className="font-semibold text-gray-900">
                Conflict Detection
              </h3>
              {isDetecting && (
                <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
              )}
            </div>

            <ConflictStatsBadge stats={stats} />
          </div>

          <div className="flex items-center gap-2">
            {stats.autoResolvable > 0 && (
              <button
                onClick={handleAutoResolveAll}
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Zap className="w-4 h-4" />
                Auto-Resolve ({stats.autoResolvable})
              </button>
            )}

            <button
              onClick={triggerDetection}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              title="Re-scan for conflicts"
            >
              <RefreshCw
                className={cn('w-4 h-4', isDetecting && 'animate-spin')}
              />
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <ConflictFilters
          filter={filter}
          onFilterChange={setFilter}
          showResolved={showResolved}
          onShowResolvedChange={setShowResolved}
        />
      </div>

      {/* Conflicts List */}
      <div className="max-h-96 overflow-y-auto">
        {filteredConflicts.length === 0 ? (
          <div className="p-8 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">No conflicts detected</p>
            <p className="text-sm text-gray-500">
              Your timeline is looking great!
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {Object.entries(conflictsBySeverity)
              .sort(([a], [b]) => {
                const order = { error: 0, warning: 1, info: 2 };
                return (
                  order[a as ConflictSeverity] - order[b as ConflictSeverity]
                );
              })
              .map(([severity, severityConflicts]) => (
                <div key={severity}>
                  {severityConflicts.map((conflict) => (
                    <ConflictCard
                      key={conflict.id}
                      conflict={conflict}
                      events={events}
                      isExpanded={expandedConflicts.has(conflict.id)}
                      onToggleExpansion={() =>
                        toggleConflictExpansion(conflict.id)
                      }
                      onResolve={(resolution) =>
                        handleResolveConflict(conflict, resolution)
                      }
                      resolutionSuggestion={resolutionSuggestions.find(
                        (r) => r.conflictId === conflict.id,
                      )}
                    />
                  ))}
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Statistics Badge Component
function ConflictStatsBadge({ stats }: { stats: any }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span
        className={cn(
          'px-2 py-1 rounded-full text-xs font-medium',
          stats.total === 0
            ? 'bg-green-100 text-green-800'
            : stats.critical > 0
              ? 'bg-red-100 text-red-800'
              : 'bg-yellow-100 text-yellow-800',
        )}
      >
        {stats.total} Total
      </span>

      {stats.critical > 0 && (
        <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
          {stats.critical} Critical
        </span>
      )}

      {stats.autoResolvable > 0 && (
        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
          {stats.autoResolvable} Auto-fix
        </span>
      )}
    </div>
  );
}

// Filter Controls Component
function ConflictFilters({
  filter,
  onFilterChange,
  showResolved,
  onShowResolvedChange,
}: {
  filter: ConflictFilter;
  onFilterChange: (filter: ConflictFilter) => void;
  showResolved: boolean;
  onShowResolvedChange: (show: boolean) => void;
}) {
  return (
    <div className="mt-3 flex items-center gap-3">
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-gray-400" />
        <select
          className="text-sm border border-gray-300 rounded px-2 py-1"
          value={filter.severity?.join(',') || ''}
          onChange={(e) =>
            onFilterChange({
              ...filter,
              severity: e.target.value
                ? (e.target.value.split(',') as ConflictSeverity[])
                : undefined,
            })
          }
        >
          <option value="">All Severities</option>
          <option value="error">Critical Only</option>
          <option value="warning">Warnings Only</option>
          <option value="info">Info Only</option>
        </select>

        <select
          className="text-sm border border-gray-300 rounded px-2 py-1"
          value={filter.type?.join(',') || ''}
          onChange={(e) =>
            onFilterChange({
              ...filter,
              type: e.target.value
                ? (e.target.value.split(',') as ConflictType[])
                : undefined,
            })
          }
        >
          <option value="">All Types</option>
          <option value="time_overlap">Time Conflicts</option>
          <option value="vendor_overlap">Vendor Conflicts</option>
          <option value="location_conflict">Location Conflicts</option>
          <option value="dependency_issue">Dependency Issues</option>
        </select>

        <label className="flex items-center gap-1 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={showResolved}
            onChange={(e) => onShowResolvedChange(e.target.checked)}
            className="rounded border-gray-300"
          />
          Show resolved
        </label>
      </div>
    </div>
  );
}

// Individual Conflict Card Component
function ConflictCard({
  conflict,
  events,
  isExpanded,
  onToggleExpansion,
  onResolve,
  resolutionSuggestion,
}: {
  conflict: TimelineConflict;
  events: TimelineEvent[];
  isExpanded: boolean;
  onToggleExpansion: () => void;
  onResolve: (resolution?: ConflictResolution) => void;
  resolutionSuggestion?: ConflictResolution;
}) {
  const severityConfig = SEVERITY_CONFIG[conflict.severity];
  const typeConfig = CONFLICT_TYPE_CONFIG[conflict.conflict_type];
  const Icon = severityConfig.icon;
  const TypeIcon = typeConfig.icon;

  const event1 = events.find((e) => e.id === conflict.event_id_1);
  const event2 = events.find((e) => e.id === conflict.event_id_2);

  return (
    <div className="p-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-start gap-3">
        <Icon
          className={cn(
            'w-5 h-5 flex-shrink-0 mt-0.5',
            severityConfig.iconColor,
          )}
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'px-2 py-0.5 rounded-full text-xs font-medium',
                  severityConfig.bgColor,
                  severityConfig.textColor,
                )}
              >
                {typeConfig.label}
              </span>
              {conflict.is_resolved && (
                <CheckCircle className="w-4 h-4 text-green-600" />
              )}
            </div>

            <button
              onClick={onToggleExpansion}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          </div>

          <p className="text-sm text-gray-900 mb-1">{conflict.description}</p>

          {conflict.suggestion && (
            <p className="text-sm text-gray-600 mb-2">{conflict.suggestion}</p>
          )}

          <div className="flex items-center gap-4 text-xs text-gray-500">
            {event1 && (
              <div className="flex items-center gap-1">
                <TypeIcon className="w-3 h-3" />
                <span>{event1.title}</span>
                <span>({format(parseISO(event1.start_time), 'HH:mm')})</span>
              </div>
            )}
            {event2 && (
              <div className="flex items-center gap-1">
                <TypeIcon className="w-3 h-3" />
                <span>{event2.title}</span>
                <span>({format(parseISO(event2.start_time), 'HH:mm')})</span>
              </div>
            )}
          </div>

          {isExpanded && (
            <div className="mt-3 pt-3 border-t">
              <div className="space-y-2">
                {resolutionSuggestion && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-blue-900">
                        Suggested Resolution
                      </h4>
                      <span className="text-xs text-blue-600">
                        {Math.round(resolutionSuggestion.confidence * 100)}%
                        confidence
                      </span>
                    </div>

                    <p className="text-sm text-blue-800 mb-3">
                      Strategy:{' '}
                      {resolutionSuggestion.strategy.replace('_', ' ')}
                    </p>

                    <div className="space-y-1">
                      {resolutionSuggestion.changes.map((change, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between text-xs"
                        >
                          <span className="text-blue-700">
                            Update {change.field} for event
                          </span>
                          <span className="text-blue-600">
                            {change.oldValue} → {change.newValue}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  {conflict.can_auto_resolve && resolutionSuggestion && (
                    <button
                      onClick={() => onResolve(resolutionSuggestion)}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Zap className="w-3 h-3" />
                      Auto-Fix
                    </button>
                  )}

                  <button
                    onClick={() => onResolve()}
                    className="px-3 py-1.5 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Mark Resolved
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Inline View for Timeline Integration
function InlineConflictView({
  conflicts,
  stats,
  onResolveConflict,
  onAutoResolveAll,
}: {
  conflicts: TimelineConflict[];
  stats: any;
  onResolveConflict: (conflict: TimelineConflict) => void;
  onAutoResolveAll: () => void;
}) {
  if (stats.total === 0) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
      <AlertTriangle className="w-4 h-4 text-yellow-600" />
      <span className="text-sm text-yellow-800">
        {stats.total} conflict{stats.total !== 1 ? 's' : ''} detected
      </span>
      {stats.autoResolvable > 0 && (
        <button
          onClick={onAutoResolveAll}
          className="ml-auto text-sm text-yellow-800 hover:text-yellow-900 underline"
        >
          Auto-fix {stats.autoResolvable}
        </button>
      )}
    </div>
  );
}

// Utility Functions

async function performConflictDetection(
  events: TimelineEvent[],
): Promise<TimelineConflict[]> {
  const conflicts: TimelineConflict[] = [];

  // Time overlap detection
  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      const event1 = events[i];
      const event2 = events[j];

      const start1 = parseISO(event1.start_time);
      const end1 = parseISO(event1.end_time);
      const start2 = parseISO(event2.start_time);
      const end2 = parseISO(event2.end_time);

      // Check for time overlap
      if (
        (start1 < end2 && end1 > start2) ||
        (start2 < end1 && end2 > start1)
      ) {
        conflicts.push({
          id: `time-overlap-${event1.id}-${event2.id}`,
          timeline_id: event1.timeline_id,
          conflict_type: 'time_overlap',
          severity:
            event1.priority === 'critical' || event2.priority === 'critical'
              ? 'error'
              : 'warning',
          event_id_1: event1.id,
          event_id_2: event2.id,
          description: `"${event1.title}" overlaps with "${event2.title}"`,
          suggestion:
            'Adjust timing or move one event to a different time slot',
          is_resolved: false,
          can_auto_resolve: event1.is_flexible || event2.is_flexible,
          detected_at: new Date().toISOString(),
          last_checked_at: new Date().toISOString(),
        });
      }

      // Vendor overlap detection
      const vendors1 = event1.vendors?.map((v) => v.vendor_id) || [];
      const vendors2 = event2.vendors?.map((v) => v.vendor_id) || [];
      const sharedVendors = vendors1.filter((v) => vendors2.includes(v));

      if (sharedVendors.length > 0 && start1 < end2 && end1 > start2) {
        conflicts.push({
          id: `vendor-overlap-${event1.id}-${event2.id}`,
          timeline_id: event1.timeline_id,
          conflict_type: 'vendor_overlap',
          severity: 'error',
          event_id_1: event1.id,
          event_id_2: event2.id,
          description: `Vendor double-booked for "${event1.title}" and "${event2.title}"`,
          suggestion: 'Reassign vendor or adjust event timing',
          is_resolved: false,
          can_auto_resolve: false,
          detected_at: new Date().toISOString(),
          last_checked_at: new Date().toISOString(),
        });
      }
    }
  }

  // Dependency violation detection
  for (const event of events) {
    if (event.depends_on?.length) {
      for (const dependencyId of event.depends_on) {
        const dependency = events.find((e) => e.id === dependencyId);
        if (dependency) {
          const eventStart = parseISO(event.start_time);
          const dependencyEnd = parseISO(dependency.end_time);

          if (eventStart < dependencyEnd) {
            conflicts.push({
              id: `dependency-${event.id}-${dependencyId}`,
              timeline_id: event.timeline_id,
              conflict_type: 'dependency_issue',
              severity: 'error',
              event_id_1: event.id,
              event_id_2: dependencyId,
              description: `"${event.title}" starts before dependency "${dependency.title}" ends`,
              suggestion: 'Adjust timing to respect dependencies',
              is_resolved: false,
              can_auto_resolve: true,
              detected_at: new Date().toISOString(),
              last_checked_at: new Date().toISOString(),
            });
          }
        }
      }
    }
  }

  return conflicts;
}

async function generateResolutionSuggestions(
  conflicts: TimelineConflict[],
  events: TimelineEvent[],
): Promise<ConflictResolution[]> {
  const resolutions: ConflictResolution[] = [];

  for (const conflict of conflicts) {
    if (!conflict.can_auto_resolve) continue;

    const event1 = events.find((e) => e.id === conflict.event_id_1);
    const event2 = events.find((e) => e.id === conflict.event_id_2);

    if (!event1 || !event2) continue;

    switch (conflict.conflict_type) {
      case 'time_overlap':
        // Suggest moving the more flexible event
        const flexibleEvent = event1.is_flexible
          ? event1
          : event2.is_flexible
            ? event2
            : event1;
        const fixedEvent = flexibleEvent === event1 ? event2 : event1;

        const fixedEventEnd = parseISO(fixedEvent.end_time);
        const flexibleEventDuration = differenceInMinutes(
          parseISO(flexibleEvent.end_time),
          parseISO(flexibleEvent.start_time),
        );

        const newStartTime = new Date(fixedEventEnd.getTime() + 15 * 60000); // 15min buffer
        const newEndTime = new Date(
          newStartTime.getTime() + flexibleEventDuration * 60000,
        );

        resolutions.push({
          conflictId: conflict.id,
          strategy: 'adjust_timing',
          changes: [
            {
              eventId: flexibleEvent.id,
              field: 'start_time',
              oldValue: flexibleEvent.start_time,
              newValue: newStartTime.toISOString(),
            },
            {
              eventId: flexibleEvent.id,
              field: 'end_time',
              oldValue: flexibleEvent.end_time,
              newValue: newEndTime.toISOString(),
            },
          ],
          confidence: event1.is_flexible || event2.is_flexible ? 0.9 : 0.7,
          estimatedTimeSaving: 0,
        });
        break;

      case 'dependency_issue':
        // Adjust dependent event to start after dependency
        const dependency = event2;
        const dependent = event1;
        const dependencyEnd = parseISO(dependency.end_time);
        const dependentDuration = differenceInMinutes(
          parseISO(dependent.end_time),
          parseISO(dependent.start_time),
        );

        const adjustedStartTime = new Date(
          dependencyEnd.getTime() +
            (dependent.buffer_before_minutes || 15) * 60000,
        );
        const adjustedEndTime = new Date(
          adjustedStartTime.getTime() + dependentDuration * 60000,
        );

        resolutions.push({
          conflictId: conflict.id,
          strategy: 'adjust_timing',
          changes: [
            {
              eventId: dependent.id,
              field: 'start_time',
              oldValue: dependent.start_time,
              newValue: adjustedStartTime.toISOString(),
            },
            {
              eventId: dependent.id,
              field: 'end_time',
              oldValue: dependent.end_time,
              newValue: adjustedEndTime.toISOString(),
            },
          ],
          confidence: 0.95,
          estimatedTimeSaving: 0,
        });
        break;
    }
  }

  return resolutions;
}
