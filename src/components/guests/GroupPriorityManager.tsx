'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  GripVertical,
  ArrowUp,
  ArrowDown,
  Target,
  Clock,
  Users,
  AlertTriangle,
  CheckCircle,
  RotateCcw,
  Zap,
  ChevronUp,
  ChevronDown,
  Hash,
} from 'lucide-react';

// DnD Kit imports
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Types
import { PhotoGroup } from '@/types/photo-groups';

// Hooks
import { usePhotoGroupsRealtime } from '@/hooks/useSupabaseRealtime';

interface PriorityConflict {
  groupId: string;
  type: 'timing_issue' | 'venue_conflict' | 'photographer_availability';
  message: string;
  severity: 'warning' | 'error';
  suggested_priority: number;
}

interface PriorityManagerProps {
  photoGroups: PhotoGroup[];
  onPriorityUpdate: (
    updates: Array<{ groupId: string; priority: number }>,
  ) => Promise<void>;
  onBulkPriorityUpdate?: (
    groupIds: string[],
    startPriority: number,
  ) => Promise<void>;
  className?: string;
  readonly?: boolean;
  showConflicts?: boolean;
}

// Sortable group item component
function SortableGroupItem({
  group,
  index,
  conflicts,
  onQuickPriority,
  readonly,
}: {
  group: PhotoGroup;
  index: number;
  conflicts: PriorityConflict[];
  onQuickPriority: (groupId: string, direction: 'up' | 'down') => void;
  readonly: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: group.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const groupConflicts = conflicts.filter((c) => c.groupId === group.id);
  const hasErrors = groupConflicts.some((c) => c.severity === 'error');
  const hasWarnings = groupConflicts.some((c) => c.severity === 'warning');

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group bg-white border rounded-lg transition-all duration-200 ${
        isDragging ? 'shadow-lg scale-105 z-10' : 'shadow-sm hover:shadow-md'
      } ${hasErrors ? 'border-red-300' : hasWarnings ? 'border-amber-300' : 'border-gray-200'}`}
    >
      <div className="p-4">
        <div className="flex items-center gap-4">
          {/* Drag Handle */}
          {!readonly && (
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 transition-colors touch-manipulation"
            >
              <GripVertical className="w-5 h-5" />
            </div>
          )}

          {/* Priority Number */}
          <div
            className={`flex-shrink-0 w-10 h-10 rounded-full border-2 flex items-center justify-center font-semibold ${
              hasErrors
                ? 'border-red-300 bg-red-50 text-red-700'
                : hasWarnings
                  ? 'border-amber-300 bg-amber-50 text-amber-700'
                  : 'border-primary-300 bg-primary-50 text-primary-700'
            }`}
          >
            {index + 1}
          </div>

          {/* Group Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-gray-900 truncate">
                {group.name}
              </h4>
              {hasErrors && (
                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
              )}
              {hasWarnings && !hasErrors && (
                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
              )}
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span className="flex items-center">
                <Clock className="w-3 h-3 mr-1" />
                {group.estimated_time_minutes}m
              </span>
              <span className="flex items-center">
                <Users className="w-3 h-3 mr-1" />
                {group.assignments?.length || 0} guests
              </span>
              <span className="capitalize text-xs bg-gray-100 px-2 py-1 rounded">
                {group.photo_type.replace('_', ' ')}
              </span>
            </div>

            {/* Conflicts */}
            {groupConflicts.length > 0 && (
              <div className="mt-2 space-y-1">
                {groupConflicts.map((conflict, i) => (
                  <div
                    key={i}
                    className={`text-xs p-2 rounded ${
                      conflict.severity === 'error'
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    <div className="font-medium">{conflict.message}</div>
                    {conflict.suggested_priority !== group.priority && (
                      <div className="mt-1">
                        Suggested priority: #{conflict.suggested_priority}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          {!readonly && (
            <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => onQuickPriority(group.id, 'up')}
                disabled={index === 0}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors disabled:opacity-30"
                title="Move up"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <button
                onClick={() => onQuickPriority(group.id, 'down')}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                title="Move down"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function GroupPriorityManager({
  photoGroups,
  onPriorityUpdate,
  onBulkPriorityUpdate,
  className = '',
  readonly = false,
  showConflicts = true,
}: PriorityManagerProps) {
  // State
  const [groups, setGroups] = useState<PhotoGroup[]>([]);
  const [conflicts, setConflicts] = useState<PriorityConflict[]>([]);
  const [loading, setLoading] = useState(false);
  const [draggedGroup, setDraggedGroup] = useState<PhotoGroup | null>(null);
  const [pendingChanges, setPendingChanges] = useState<Map<string, number>>(
    new Map(),
  );
  const [autoResolveConflicts, setAutoResolveConflicts] = useState(false);

  // Refs
  const originalOrder = useRef<PhotoGroup[]>([]);

  // Real-time subscription
  const { subscribe, unsubscribe } = useSupabaseRealtime();

  // Initialize groups sorted by priority
  useEffect(() => {
    const sortedGroups = [...photoGroups].sort(
      (a, b) => a.priority - b.priority,
    );
    setGroups(sortedGroups);
    originalOrder.current = sortedGroups;
  }, [photoGroups]);

  // Real-time updates
  useEffect(() => {
    if (groups.length === 0) return;

    const channel = subscribe(
      `photo-group-priority:${groups[0]?.couple_id}`,
      'broadcast',
      { event: 'priority_updated' },
      (payload) => {
        // Handle real-time priority updates from other users
        if (payload.group_priorities) {
          const updatedGroups = groups
            .map((group) => {
              const newPriority = payload.group_priorities[group.id];
              return newPriority !== undefined
                ? { ...group, priority: newPriority }
                : group;
            })
            .sort((a, b) => a.priority - b.priority);

          setGroups(updatedGroups);
        }
      },
    );

    return () => {
      if (channel) unsubscribe(channel);
    };
  }, [groups, subscribe, unsubscribe]);

  // Analyze priority conflicts
  const analyzePriorityConflicts = useCallback(() => {
    const newConflicts: PriorityConflict[] = [];

    groups.forEach((group, index) => {
      // Check timing conflicts based on priority order
      const nextGroup = groups[index + 1];
      if (nextGroup && group.timeline_slot === nextGroup.timeline_slot) {
        newConflicts.push({
          groupId: group.id,
          type: 'timing_issue',
          message: `Same timeline slot as ${nextGroup.name}`,
          severity: 'error',
          suggested_priority: nextGroup.priority + 1,
        });
      }

      // Check if high-priority groups are scheduled too late
      if (group.photo_type === 'children' && index > 2) {
        newConflicts.push({
          groupId: group.id,
          type: 'timing_issue',
          message: 'Children photos work best earlier in the day',
          severity: 'warning',
          suggested_priority: 1,
        });
      }

      // Check venue conflicts
      if (
        group.location &&
        groups.some(
          (g, i) =>
            i !== index &&
            g.location === group.location &&
            Math.abs(g.priority - group.priority) === 1,
        )
      ) {
        newConflicts.push({
          groupId: group.id,
          type: 'venue_conflict',
          message: 'Back-to-back sessions at same location may cause delays',
          severity: 'warning',
          suggested_priority: group.priority + 2,
        });
      }
    });

    setConflicts(newConflicts);
  }, [groups]);

  // Analyze conflicts when groups change
  useEffect(() => {
    if (showConflicts && groups.length > 0) {
      analyzePriorityConflicts();
    }
  }, [groups, showConflicts, analyzePriorityConflicts]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Handle drag start
  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const draggedItem = groups.find((group) => group.id === event.active.id);
      setDraggedGroup(draggedItem || null);
    },
    [groups],
  );

  // Handle drag end
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setDraggedGroup(null);

    if (active.id !== over?.id) {
      setGroups((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over?.id);

        const newOrder = arrayMove(items, oldIndex, newIndex);

        // Update pending changes
        const updates = new Map<string, number>();
        newOrder.forEach((group, index) => {
          const newPriority = index + 1;
          if (group.priority !== newPriority) {
            updates.set(group.id, newPriority);
          }
        });
        setPendingChanges(updates);

        return newOrder;
      });
    }
  }, []);

  // Quick priority change
  const handleQuickPriority = useCallback(
    (groupId: string, direction: 'up' | 'down') => {
      const currentIndex = groups.findIndex((g) => g.id === groupId);
      if (currentIndex === -1) return;

      const newIndex =
        direction === 'up'
          ? Math.max(0, currentIndex - 1)
          : Math.min(groups.length - 1, currentIndex + 1);

      if (currentIndex === newIndex) return;

      const newGroups = arrayMove(groups, currentIndex, newIndex);
      setGroups(newGroups);

      // Update pending changes
      const updates = new Map<string, number>();
      newGroups.forEach((group, index) => {
        const newPriority = index + 1;
        if (group.priority !== newPriority) {
          updates.set(group.id, newPriority);
        }
      });
      setPendingChanges(updates);
    },
    [groups],
  );

  // Save changes
  const handleSaveChanges = useCallback(async () => {
    if (pendingChanges.size === 0) return;

    setLoading(true);
    try {
      const updates = Array.from(pendingChanges.entries()).map(
        ([groupId, priority]) => ({
          groupId,
          priority,
        }),
      );

      await onPriorityUpdate(updates);

      // Broadcast changes to other users
      if (groups.length > 0) {
        const channel = subscribe(
          `photo-group-priority:${groups[0].couple_id}`,
          'broadcast',
          { event: 'priority_updated' },
          () => {},
        );

        if (channel) {
          const groupPriorities = Object.fromEntries(pendingChanges);
          await channel.send({
            type: 'broadcast',
            event: 'priority_updated',
            payload: { group_priorities: groupPriorities },
          });
        }
      }

      setPendingChanges(new Map());
      originalOrder.current = groups;
    } catch (error) {
      console.error('Failed to update priorities:', error);
    } finally {
      setLoading(false);
    }
  }, [pendingChanges, onPriorityUpdate, groups, subscribe]);

  // Revert changes
  const handleRevert = useCallback(() => {
    setGroups(originalOrder.current);
    setPendingChanges(new Map());
  }, []);

  // Auto-resolve conflicts
  const handleAutoResolve = useCallback(async () => {
    const resolutions = conflicts
      .filter((c) => c.severity === 'error' || autoResolveConflicts)
      .map((conflict) => ({
        groupId: conflict.groupId,
        priority: conflict.suggested_priority,
      }));

    if (resolutions.length === 0) return;

    setLoading(true);
    try {
      await onPriorityUpdate(resolutions);

      // Update local state
      const updatedGroups = groups
        .map((group) => {
          const resolution = resolutions.find((r) => r.groupId === group.id);
          return resolution
            ? { ...group, priority: resolution.priority }
            : group;
        })
        .sort((a, b) => a.priority - b.priority);

      setGroups(updatedGroups);
      setPendingChanges(new Map());
    } catch (error) {
      console.error('Failed to auto-resolve conflicts:', error);
    } finally {
      setLoading(false);
    }
  }, [conflicts, autoResolveConflicts, onPriorityUpdate, groups]);

  const hasUnsavedChanges = pendingChanges.size > 0;
  const hasConflicts = conflicts.length > 0;
  const hasErrors = conflicts.some((c) => c.severity === 'error');

  return (
    <div
      className={`bg-white border border-gray-200 rounded-xl overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Target className="w-5 h-5 mr-2 text-primary-600" />
              Priority Management
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Drag to reorder photo groups by priority
              {hasConflicts && (
                <span
                  className={`ml-2 ${hasErrors ? 'text-red-600' : 'text-amber-600'}`}
                >
                  • {conflicts.length} conflict
                  {conflicts.length !== 1 ? 's' : ''} detected
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {hasConflicts && (
              <div className="flex items-center gap-2">
                <label className="flex items-center text-sm">
                  <input
                    type="checkbox"
                    checked={autoResolveConflicts}
                    onChange={(e) => setAutoResolveConflicts(e.target.checked)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2">Auto-resolve warnings</span>
                </label>
                <button
                  onClick={handleAutoResolve}
                  disabled={
                    loading ||
                    conflicts.every(
                      (c) => c.severity === 'warning' && !autoResolveConflicts,
                    )
                  }
                  className="px-3 py-1.5 text-sm bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors disabled:opacity-50 inline-flex items-center gap-1"
                >
                  <Zap className="w-3 h-3" />
                  Auto-resolve
                </button>
              </div>
            )}

            {hasUnsavedChanges && (
              <>
                <button
                  onClick={handleRevert}
                  disabled={loading}
                  className="px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 inline-flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  Revert
                </button>
                <button
                  onClick={handleSaveChanges}
                  disabled={loading}
                  className="px-4 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-sm rounded-lg transition-colors disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />
                  ) : (
                    <CheckCircle className="w-3 h-3" />
                  )}
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Priority List */}
      <div className="p-6">
        {groups.length === 0 ? (
          <div className="text-center py-12">
            <Hash className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No photo groups
            </h3>
            <p className="text-gray-600">
              Create photo groups to manage their priority order.
            </p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={groups.map((g) => g.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {groups.map((group, index) => (
                  <SortableGroupItem
                    key={group.id}
                    group={group}
                    index={index}
                    conflicts={conflicts}
                    onQuickPriority={handleQuickPriority}
                    readonly={readonly}
                  />
                ))}
              </div>
            </SortableContext>

            <DragOverlay>
              {draggedGroup ? (
                <div className="bg-white border-2 border-primary-300 rounded-lg shadow-xl p-4 rotate-2">
                  <div className="flex items-center gap-4">
                    <GripVertical className="w-5 h-5 text-gray-400" />
                    <div className="w-10 h-10 rounded-full border-2 border-primary-300 bg-primary-50 flex items-center justify-center font-semibold text-primary-700">
                      ?
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        {draggedGroup.name}
                      </h4>
                      <div className="text-sm text-gray-600">
                        Moving to new position...
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      {/* Footer Status */}
      {(hasUnsavedChanges || hasConflicts) && (
        <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              {hasUnsavedChanges && (
                <span className="text-amber-600 flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-1" />
                  {pendingChanges.size} unsaved change
                  {pendingChanges.size !== 1 ? 's' : ''}
                </span>
              )}
              {hasErrors && (
                <span className="text-red-600 flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-1" />
                  {conflicts.filter((c) => c.severity === 'error').length} error
                  {conflicts.filter((c) => c.severity === 'error').length !== 1
                    ? 's'
                    : ''}{' '}
                  need attention
                </span>
              )}
            </div>

            <div className="text-gray-500">
              Tip: Drag groups to reorder, or use the arrow buttons for quick
              adjustments
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GroupPriorityManager;
