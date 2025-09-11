'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  TimelineEvent,
  TimelineConflict,
  ConflictSeverity,
  ConflictType,
} from '@/types/timeline';
import { useHaptic } from '@/hooks/useTouch';
import {
  AlertTriangle,
  Clock,
  MapPin,
  Users,
  X,
  CheckCircle,
  ArrowRight,
  Calendar,
  Zap,
  AlertCircle,
  Info,
} from 'lucide-react';
import { format, parseISO, addMinutes, differenceInMinutes } from 'date-fns';

interface TouchConflictResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  conflicts: TimelineConflict[];
  events: TimelineEvent[];
  onResolveConflict: (
    conflictId: string,
    resolution: ConflictResolution,
  ) => void;
  onEventUpdate: (eventId: string, updates: Partial<TimelineEvent>) => void;
  className?: string;
}

interface ConflictResolution {
  action:
    | 'move_event'
    | 'adjust_duration'
    | 'merge_events'
    | 'split_events'
    | 'accept_overlap'
    | 'assign_backup_vendor';
  eventId?: string;
  newStartTime?: string;
  newEndTime?: string;
  newLocation?: string;
  parameters?: any;
}

interface ConflictSolution {
  id: string;
  title: string;
  description: string;
  action: ConflictResolution['action'];
  icon: React.ComponentType<{ className?: string }>;
  severity: 'low' | 'medium' | 'high';
  autoApplyable: boolean;
  parameters?: any;
}

const CONFLICT_TYPE_CONFIG = {
  time_overlap: {
    icon: Clock,
    color: 'text-red-500',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
  },
  vendor_overlap: {
    icon: Users,
    color: 'text-orange-500',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
  },
  location_conflict: {
    icon: MapPin,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
  },
  dependency_issue: {
    icon: ArrowRight,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
};

const SEVERITY_CONFIG = {
  info: { icon: Info, color: 'text-blue-500', bgColor: 'bg-blue-50' },
  warning: {
    icon: AlertCircle,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-50',
  },
  error: { icon: AlertTriangle, color: 'text-red-500', bgColor: 'bg-red-50' },
};

export function TouchConflictResolutionModal({
  isOpen,
  onClose,
  conflicts,
  events,
  onResolveConflict,
  onEventUpdate,
  className,
}: TouchConflictResolutionModalProps) {
  const [selectedConflictIndex, setSelectedConflictIndex] = useState(0);
  const [selectedSolution, setSelectedSolution] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);

  const haptic = useHaptic();

  const currentConflict = conflicts[selectedConflictIndex];
  const event1 = currentConflict
    ? events.find((e) => e.id === currentConflict.event_id_1)
    : null;
  const event2 = currentConflict?.event_id_2
    ? events.find((e) => e.id === currentConflict.event_id_2)
    : null;

  // Generate solutions for the current conflict
  const generateSolutions = useCallback(
    (conflict: TimelineConflict): ConflictSolution[] => {
      const solutions: ConflictSolution[] = [];

      if (!event1) return solutions;

      switch (conflict.conflict_type) {
        case 'time_overlap':
          if (event2) {
            // Move first event earlier
            solutions.push({
              id: 'move_event1_earlier',
              title: `Move "${event1.title}" earlier`,
              description: `Start 30 minutes earlier to avoid overlap`,
              action: 'move_event',
              icon: Clock,
              severity: 'low',
              autoApplyable: true,
              parameters: {
                eventId: event1.id,
                timeAdjustment: -30,
              },
            });

            // Move second event later
            solutions.push({
              id: 'move_event2_later',
              title: `Move "${event2.title}" later`,
              description: `Start after ${event1.title} ends`,
              action: 'move_event',
              icon: Clock,
              severity: 'low',
              autoApplyable: true,
              parameters: {
                eventId: event2.id,
                timeAdjustment: 30,
              },
            });

            // Reduce duration of first event
            solutions.push({
              id: 'reduce_event1_duration',
              title: `Shorten "${event1.title}"`,
              description: `Reduce duration by 30 minutes`,
              action: 'adjust_duration',
              icon: Zap,
              severity: 'medium',
              autoApplyable: true,
              parameters: {
                eventId: event1.id,
                durationChange: -30,
              },
            });

            // Accept overlap (for preparation events)
            if (
              event1.event_type === 'preparation' ||
              event2.event_type === 'preparation'
            ) {
              solutions.push({
                id: 'accept_overlap',
                title: 'Allow overlap',
                description: 'These events can happen simultaneously',
                action: 'accept_overlap',
                icon: CheckCircle,
                severity: 'low',
                autoApplyable: false,
              });
            }
          }
          break;

        case 'vendor_overlap':
          solutions.push({
            id: 'assign_backup_vendor',
            title: 'Assign backup vendor',
            description: 'Use an alternative vendor for one of the events',
            action: 'assign_backup_vendor',
            icon: Users,
            severity: 'medium',
            autoApplyable: false,
          });
          break;

        case 'location_conflict':
          solutions.push({
            id: 'adjust_location',
            title: 'Change location',
            description: 'Move one event to a different location',
            action: 'move_event',
            icon: MapPin,
            severity: 'medium',
            autoApplyable: false,
          });
          break;

        case 'dependency_issue':
          solutions.push({
            id: 'reorder_events',
            title: 'Reorder events',
            description: 'Adjust timing to respect dependencies',
            action: 'move_event',
            icon: ArrowRight,
            severity: 'high',
            autoApplyable: true,
          });
          break;
      }

      return solutions;
    },
    [event1, event2],
  );

  const solutions = currentConflict ? generateSolutions(currentConflict) : [];

  // Handle solution application
  const handleApplySolution = useCallback(
    async (solution: ConflictSolution) => {
      if (!currentConflict || !event1) return;

      setIsResolving(true);
      haptic.medium();

      try {
        let resolution: ConflictResolution;

        switch (solution.action) {
          case 'move_event':
            const timeAdjustment = solution.parameters?.timeAdjustment || 0;
            const newStartTime = addMinutes(
              parseISO(event1.start_time),
              timeAdjustment,
            );
            const eventDuration = differenceInMinutes(
              parseISO(event1.end_time),
              parseISO(event1.start_time),
            );
            const newEndTime = addMinutes(newStartTime, eventDuration);

            resolution = {
              action: 'move_event',
              eventId: solution.parameters?.eventId || event1.id,
              newStartTime: newStartTime.toISOString(),
              newEndTime: newEndTime.toISOString(),
            };

            // Apply the event update immediately
            onEventUpdate(solution.parameters?.eventId || event1.id, {
              start_time: newStartTime.toISOString(),
              end_time: newEndTime.toISOString(),
            });
            break;

          case 'adjust_duration':
            const durationChange = solution.parameters?.durationChange || 0;
            const adjustedEndTime = addMinutes(
              parseISO(event1.end_time),
              durationChange,
            );

            resolution = {
              action: 'adjust_duration',
              eventId: event1.id,
              newEndTime: adjustedEndTime.toISOString(),
            };

            onEventUpdate(event1.id, {
              end_time: adjustedEndTime.toISOString(),
            });
            break;

          case 'accept_overlap':
            resolution = {
              action: 'accept_overlap',
            };
            break;

          default:
            resolution = {
              action: solution.action,
              parameters: solution.parameters,
            };
        }

        await onResolveConflict(currentConflict.id, resolution);
        haptic.success();

        // Move to next conflict or close if all resolved
        if (selectedConflictIndex < conflicts.length - 1) {
          setSelectedConflictIndex((prev) => prev + 1);
          setSelectedSolution(null);
        } else {
          onClose();
        }
      } catch (error) {
        console.error('Error applying solution:', error);
        haptic.error();
      } finally {
        setIsResolving(false);
      }
    },
    [
      currentConflict,
      event1,
      onResolveConflict,
      onEventUpdate,
      haptic,
      selectedConflictIndex,
      conflicts.length,
      onClose,
    ],
  );

  // Handle skip conflict
  const handleSkipConflict = useCallback(() => {
    haptic.light();
    if (selectedConflictIndex < conflicts.length - 1) {
      setSelectedConflictIndex((prev) => prev + 1);
      setSelectedSolution(null);
    } else {
      onClose();
    }
  }, [selectedConflictIndex, conflicts.length, onClose, haptic]);

  if (!isOpen || !currentConflict || !event1) return null;

  const conflictConfig = CONFLICT_TYPE_CONFIG[currentConflict.conflict_type];
  const severityConfig = SEVERITY_CONFIG[currentConflict.severity];
  const ConflictIcon = conflictConfig.icon;
  const SeverityIcon = severityConfig.icon;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className={cn(
            'w-full max-w-lg bg-white rounded-t-3xl shadow-xl',
            'max-h-[90vh] overflow-hidden',
            className,
          )}
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b bg-gray-50">
            <div className="flex items-center gap-3">
              <div className={cn('p-2 rounded-lg', severityConfig.bgColor)}>
                <SeverityIcon className={cn('w-5 h-5', severityConfig.color)} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Conflict Detected
                </h2>
                <p className="text-sm text-gray-600">
                  {selectedConflictIndex + 1} of {conflicts.length}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Progress indicator */}
          <div className="px-6 py-3">
            <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
              <span>Resolving conflicts</span>
              <span>
                {selectedConflictIndex + 1}/{conflicts.length}
              </span>
            </div>
            <div className="h-1 bg-gray-200 rounded-full">
              <div
                className="h-1 bg-purple-500 rounded-full transition-all duration-300"
                style={{
                  width: `${((selectedConflictIndex + 1) / conflicts.length) * 100}%`,
                }}
              />
            </div>
          </div>

          {/* Conflict details */}
          <div className="px-6 py-4 border-b">
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  'p-2 rounded-lg flex-shrink-0',
                  conflictConfig.bgColor,
                )}
              >
                <ConflictIcon className={cn('w-5 h-5', conflictConfig.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 mb-1">
                  {currentConflict.description}
                </h3>

                {/* Affected events */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                    <div className="w-3 h-3 bg-purple-500 rounded-full flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900 truncate">
                        {event1.title}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-gray-600">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(parseISO(event1.start_time), 'HH:mm')} -
                          {format(parseISO(event1.end_time), 'HH:mm')}
                        </span>
                        {event1.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {event1.location}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {event2 && (
                    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                      <div className="w-3 h-3 bg-pink-500 rounded-full flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-900 truncate">
                          {event2.title}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-gray-600">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(parseISO(event2.start_time), 'HH:mm')} -
                            {format(parseISO(event2.end_time), 'HH:mm')}
                          </span>
                          {event2.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {event2.location}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Solutions */}
          <div className="flex-1 overflow-y-auto">
            <div className="px-6 py-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3">
                Choose a solution:
              </h4>

              <div className="space-y-3">
                {solutions.map((solution) => {
                  const isSelected = selectedSolution === solution.id;
                  const SolutionIcon = solution.icon;

                  return (
                    <motion.button
                      key={solution.id}
                      onClick={() => setSelectedSolution(solution.id)}
                      className={cn(
                        'w-full text-left p-4 rounded-xl border-2 transition-all',
                        'min-h-[80px] touch-manipulation',
                        isSelected
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 bg-white hover:border-gray-300',
                      )}
                      whileTap={{ scale: 0.98 }}
                      disabled={isResolving}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            'p-2 rounded-lg flex-shrink-0',
                            isSelected ? 'bg-purple-100' : 'bg-gray-100',
                          )}
                        >
                          <SolutionIcon
                            className={cn(
                              'w-4 h-4',
                              isSelected ? 'text-purple-600' : 'text-gray-600',
                            )}
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h5 className="font-medium text-gray-900">
                              {solution.title}
                            </h5>
                            {solution.autoApplyable && (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                                Auto
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">
                            {solution.description}
                          </p>
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="p-6 bg-gray-50 border-t">
            <div className="flex items-center gap-3">
              <button
                onClick={handleSkipConflict}
                className="flex-1 py-3 px-4 bg-white text-gray-700 border border-gray-300 rounded-xl font-medium min-h-[50px]"
                disabled={isResolving}
              >
                Skip for now
              </button>

              <button
                onClick={() => {
                  const solution = solutions.find(
                    (s) => s.id === selectedSolution,
                  );
                  if (solution) {
                    handleApplySolution(solution);
                  }
                }}
                disabled={!selectedSolution || isResolving}
                className={cn(
                  'flex-1 py-3 px-4 rounded-xl font-medium min-h-[50px] flex items-center justify-center gap-2',
                  selectedSolution && !isResolving
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed',
                )}
              >
                {isResolving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Applying...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Apply Solution
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
