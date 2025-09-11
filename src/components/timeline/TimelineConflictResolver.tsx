'use client';

import { useState, useEffect, useMemo } from 'react';
import { format, parseISO, addMinutes } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  AlertTriangle,
  Clock,
  MapPin,
  Users,
  CheckCircle,
  X,
  Calendar,
  ArrowRight,
  Lightbulb,
  RefreshCw,
  Filter,
} from 'lucide-react';
import type { TimelineConflict, TimelineEvent } from '@/types/timeline';

interface TimelineConflictResolverProps {
  conflicts: TimelineConflict[];
  events: TimelineEvent[];
  onResolveConflict: (
    conflictId: string,
    resolution: 'ignore' | 'adjust_times' | 'change_location',
  ) => Promise<void>;
  onUpdateEvent: (
    eventId: string,
    updates: Partial<TimelineEvent>,
  ) => Promise<void>;
  onRefreshConflicts: () => Promise<void>;
  className?: string;
}

const severityColors = {
  warning: 'border-yellow-200 bg-yellow-50',
  error: 'border-red-200 bg-red-50',
  critical: 'border-red-300 bg-red-100',
};

const severityIcons = {
  warning: <AlertTriangle className="w-5 h-5 text-yellow-600" />,
  error: <AlertTriangle className="w-5 h-5 text-red-600" />,
  critical: <AlertTriangle className="w-5 h-5 text-red-700" />,
};

const conflictTypeDescriptions = {
  'time-overlap': 'Events overlap in time',
  'vendor-double-booking':
    'Vendor assigned to multiple events at the same time',
  'location-conflict':
    'Multiple events scheduled at the same location and time',
  'travel-time': 'Insufficient travel time between locations',
  'setup-conflict': 'Setup time conflicts with previous event',
  'resource-conflict': 'Shared resource conflicts',
};

export function TimelineConflictResolver({
  conflicts,
  events,
  onResolveConflict,
  onUpdateEvent,
  onRefreshConflicts,
  className,
}: TimelineConflictResolverProps) {
  const [filterSeverity, setFilterSeverity] = useState<
    'all' | 'warning' | 'error' | 'critical'
  >('all');
  const [showResolved, setShowResolved] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedConflicts, setExpandedConflicts] = useState<Set<string>>(
    new Set(),
  );

  // Filter conflicts
  const filteredConflicts = useMemo(() => {
    return conflicts
      .filter((conflict) => {
        if (!showResolved && conflict.status === 'resolved') return false;
        if (filterSeverity !== 'all' && conflict.severity !== filterSeverity)
          return false;
        return true;
      })
      .sort((a, b) => {
        // Sort by severity (critical > error > warning) then by creation date
        const severityOrder = { critical: 3, error: 2, warning: 1 };
        const severityDiff =
          severityOrder[b.severity] - severityOrder[a.severity];
        if (severityDiff !== 0) return severityDiff;
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      });
  }, [conflicts, filterSeverity, showResolved]);

  // Get event by ID
  const getEvent = (eventId: string) => {
    return events.find((e) => e.id === eventId);
  };

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefreshConflicts();
    } finally {
      setIsRefreshing(false);
    }
  };

  // Toggle conflict expansion
  const toggleExpansion = (conflictId: string) => {
    const newExpanded = new Set(expandedConflicts);
    if (newExpanded.has(conflictId)) {
      newExpanded.delete(conflictId);
    } else {
      newExpanded.add(conflictId);
    }
    setExpandedConflicts(newExpanded);
  };

  // Generate resolution suggestions
  const getResolutionSuggestions = (conflict: TimelineConflict) => {
    const event1 = getEvent(conflict.event1_id);
    const event2 = getEvent(conflict.event2_id);
    if (!event1 || !event2) return [];

    const suggestions = [];

    switch (conflict.conflict_type) {
      case 'time-overlap':
        suggestions.push({
          type: 'adjust_times' as const,
          title: 'Adjust Event Times',
          description: `Move ${event2.title} to start after ${event1.title} ends`,
          action: () => {
            const newStartTime = addMinutes(
              parseISO(event1.end_time || event1.start_time),
              event1.duration || 60,
            );
            const newEndTime = addMinutes(newStartTime, event2.duration || 60);
            onUpdateEvent(event2.id, {
              start_time: newStartTime.toISOString(),
              end_time: newEndTime.toISOString(),
            });
          },
        });
        break;

      case 'location-conflict':
        suggestions.push({
          type: 'change_location' as const,
          title: 'Change Location',
          description: `Move ${event2.title} to a different location`,
          action: () => {
            // This would open a location picker in a real implementation
            // TODO: Implement location picker modal
          },
        });
        break;

      case 'vendor-double-booking':
        suggestions.push({
          type: 'adjust_times' as const,
          title: 'Reschedule Event',
          description: 'Reschedule one of the events to avoid vendor conflict',
          action: () => {
            // This would open a time picker in a real implementation
            // TODO: Implement time picker modal
          },
        });
        break;
    }

    suggestions.push({
      type: 'ignore' as const,
      title: 'Mark as Acceptable',
      description: 'Keep current setup and mark conflict as resolved',
      action: () => onResolveConflict(conflict.id, 'ignore'),
    });

    return suggestions;
  };

  // Stats
  const stats = useMemo(() => {
    const total = conflicts.length;
    const critical = conflicts.filter(
      (c) => c.severity === 'critical' && c.status !== 'resolved',
    ).length;
    const errors = conflicts.filter(
      (c) => c.severity === 'error' && c.status !== 'resolved',
    ).length;
    const warnings = conflicts.filter(
      (c) => c.severity === 'warning' && c.status !== 'resolved',
    ).length;
    const resolved = conflicts.filter((c) => c.status === 'resolved').length;

    return { total, critical, errors, warnings, resolved };
  }, [conflicts]);

  return (
    <div className={cn('bg-white rounded-xl border shadow-sm', className)}>
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              Timeline Conflicts
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Resolve scheduling conflicts to ensure smooth event execution
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <RefreshCw
                className={cn(
                  'w-5 h-5 text-gray-600',
                  isRefreshing && 'animate-spin',
                )}
              />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-5 gap-4 mb-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">
              {stats.total}
            </div>
            <div className="text-xs text-gray-600">Total</div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">
              {stats.critical}
            </div>
            <div className="text-xs text-gray-600">Critical</div>
          </div>
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">
              {stats.errors}
            </div>
            <div className="text-xs text-gray-600">Errors</div>
          </div>
          <div className="text-center p-3 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">
              {stats.warnings}
            </div>
            <div className="text-xs text-gray-600">Warnings</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {stats.resolved}
            </div>
            <div className="text-xs text-gray-600">Resolved</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-600" />
            <span className="text-sm text-gray-600">Filter:</span>
          </div>

          <div className="flex gap-2">
            {(['all', 'critical', 'error', 'warning'] as const).map(
              (severity) => (
                <button
                  key={severity}
                  onClick={() => setFilterSeverity(severity)}
                  className={cn(
                    'px-3 py-1 rounded-lg text-sm font-medium capitalize transition-colors',
                    filterSeverity === severity
                      ? 'bg-primary-100 text-primary-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
                  )}
                >
                  {severity}
                </button>
              ),
            )}
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-600 ml-4">
            <input
              type="checkbox"
              checked={showResolved}
              onChange={(e) => setShowResolved(e.target.checked)}
              className="rounded"
            />
            Show resolved
          </label>
        </div>
      </div>

      {/* Conflicts List */}
      <div className="p-6">
        {filteredConflicts.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Conflicts Found
            </h3>
            <p className="text-gray-600">
              {filterSeverity !== 'all' || showResolved
                ? 'No conflicts match your current filters.'
                : 'Your timeline looks great! No conflicts detected.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredConflicts.map((conflict) => {
              const event1 = getEvent(conflict.event1_id);
              const event2 = getEvent(conflict.event2_id);
              const isExpanded = expandedConflicts.has(conflict.id);
              const suggestions = getResolutionSuggestions(conflict);

              if (!event1 || !event2) return null;

              return (
                <div
                  key={conflict.id}
                  className={cn(
                    'border rounded-lg overflow-hidden transition-all',
                    severityColors[conflict.severity],
                    conflict.status === 'resolved' && 'opacity-75',
                  )}
                >
                  {/* Conflict Header */}
                  <div
                    className="p-4 cursor-pointer hover:bg-black/5 transition-colors"
                    onClick={() => toggleExpansion(conflict.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        {severityIcons[conflict.severity]}
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900 mb-1">
                            {conflictTypeDescriptions[conflict.conflict_type]}
                          </h3>
                          <p className="text-sm text-gray-600 mb-2">
                            {conflict.description}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>
                              Events: {event1.title} & {event2.title}
                            </span>
                            <span>
                              Detected:{' '}
                              {format(
                                parseISO(conflict.created_at),
                                'MMM d, HH:mm',
                              )}
                            </span>
                            {conflict.status === 'resolved' && (
                              <span className="text-green-600 font-medium">
                                ✓ Resolved
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {conflict.status !== 'resolved' && (
                          <span
                            className={cn(
                              'px-2 py-1 text-xs font-medium rounded-full',
                              conflict.severity === 'critical' &&
                                'bg-red-100 text-red-800',
                              conflict.severity === 'error' &&
                                'bg-orange-100 text-orange-800',
                              conflict.severity === 'warning' &&
                                'bg-yellow-100 text-yellow-800',
                            )}
                          >
                            {conflict.severity}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="border-t bg-white/50 p-4 space-y-4">
                      {/* Event Details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[event1, event2].map((event, index) => (
                          <div
                            key={event.id}
                            className="bg-white p-3 rounded-lg border"
                          >
                            <h4 className="font-medium text-gray-900 mb-2">
                              {event.title}
                            </h4>
                            <div className="space-y-1 text-sm text-gray-600">
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>
                                  {format(
                                    parseISO(event.start_time),
                                    'MMM d, HH:mm',
                                  )}
                                  {event.duration && ` (${event.duration}min)`}
                                </span>
                              </div>
                              {event.location && (
                                <div className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  <span>{event.location}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                <span>Priority: {event.priority}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Resolution Suggestions */}
                      {conflict.status !== 'resolved' &&
                        suggestions.length > 0 && (
                          <div>
                            <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                              <Lightbulb className="w-4 h-4 text-yellow-500" />
                              Resolution Suggestions
                            </h4>
                            <div className="grid gap-2">
                              {suggestions.map((suggestion, index) => (
                                <button
                                  key={index}
                                  onClick={suggestion.action}
                                  className="text-left p-3 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
                                >
                                  <div className="font-medium text-blue-900">
                                    {suggestion.title}
                                  </div>
                                  <div className="text-sm text-blue-700">
                                    {suggestion.description}
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
