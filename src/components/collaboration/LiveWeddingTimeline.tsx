'use client';

/**
 * WS-342 Live Wedding Timeline - Real-time Collaborative Timeline
 * Team A - Frontend/UI Development - Timeline Collaboration Interface
 *
 * Real-time collaborative wedding timeline with drag-and-drop reordering,
 * conflict detection, and live editing capabilities
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from '@hello-pangea/dnd';
import { cn } from '@/lib/utils';
import { useRealTimeCollaboration } from '@/hooks/collaboration/useRealTimeCollaboration';
import {
  WeddingTimelineItem,
  TimelineUpdate,
  TimelineConflict,
  TimelineAction,
  Collaborator,
  Priority,
  TimelineItemStatus,
  TimelineItemType,
  Comment,
} from '@/types/collaboration';

// Icons
import {
  Plus,
  GripVertical,
  Clock,
  MapPin,
  Users,
  AlertTriangle,
  Eye,
  Edit3,
  Save,
  X,
  Calendar,
  CheckCircle,
  AlertCircle,
  Trash2,
} from 'lucide-react';

// UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';

export interface LiveWeddingTimelineProps {
  weddingId: string;
  collaborators: Collaborator[];
  onTimelineUpdate: (update: TimelineUpdate) => void;
  realTimeMode: boolean;
  initialTimeline?: WeddingTimelineItem[];
  permissions?: {
    canEdit: boolean;
    canAdd: boolean;
    canDelete: boolean;
    canReorder: boolean;
  };
  className?: string;
}

interface LiveTimelineItemProps {
  item: WeddingTimelineItem;
  dragHandleProps?: any;
  isDragging: boolean;
  isEditing: boolean;
  collaborators: Collaborator[];
  onEdit: (itemId: string, changes: Partial<WeddingTimelineItem>) => void;
  onStartEdit: () => void;
  onEndEdit: () => void;
  onDelete: (itemId: string) => void;
  conflicts: TimelineConflict[];
  realTimeMode: boolean;
  permissions: {
    canEdit: boolean;
    canDelete: boolean;
  };
}

interface ConflictAlertBannerProps {
  conflicts: TimelineConflict[];
  onResolveConflict: (conflictId: string, resolution: string) => void;
}

interface TimelineStatsProps {
  totalItems: number;
  completedItems: number;
  overdue: number;
  upcomingDeadlines: any[];
}

/**
 * Live Wedding Timeline Component
 */
export function LiveWeddingTimeline({
  weddingId,
  collaborators,
  onTimelineUpdate,
  realTimeMode,
  initialTimeline = [],
  permissions = {
    canEdit: true,
    canAdd: true,
    canDelete: true,
    canReorder: true,
  },
  className,
}: LiveWeddingTimelineProps) {
  // Real-time collaboration
  const { subscribeToTimelineUpdates, sendTimelineUpdate } =
    useRealTimeCollaboration(weddingId);

  // Local state
  const [timeline, setTimeline] =
    useState<WeddingTimelineItem[]>(initialTimeline);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<TimelineConflict[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [draggedItem, setDraggedItem] = useState<WeddingTimelineItem | null>(
    null,
  );

  // Subscribe to real-time timeline updates
  useEffect(() => {
    if (!realTimeMode) return;

    const unsubscribe = subscribeToTimelineUpdates((update: TimelineUpdate) => {
      handleRealTimeTimelineUpdate(update);
    });

    return unsubscribe;
  }, [realTimeMode, subscribeToTimelineUpdates]);

  // Handle real-time timeline updates
  const handleRealTimeTimelineUpdate = useCallback((update: TimelineUpdate) => {
    switch (update.action) {
      case TimelineAction.ITEM_UPDATED:
        setTimeline((prev) =>
          prev.map((item) =>
            item.id === update.itemId
              ? { ...item, ...update.changes, lastEditedBy: update.userId }
              : item,
          ),
        );
        break;

      case TimelineAction.ITEM_ADDED:
        if (update.data?.item) {
          setTimeline((prev) => [...prev, update.data.item]);
        }
        break;

      case TimelineAction.ITEM_DELETED:
        setTimeline((prev) => prev.filter((item) => item.id !== update.itemId));
        break;

      case TimelineAction.ITEM_MOVED:
        if (update.newIndex !== undefined) {
          setTimeline((prev) => {
            const newTimeline = [...prev];
            const itemIndex = newTimeline.findIndex(
              (item) => item.id === update.itemId,
            );
            if (itemIndex !== -1) {
              const [movedItem] = newTimeline.splice(itemIndex, 1);
              newTimeline.splice(update.newIndex!, 0, {
                ...movedItem,
                ...update.changes,
              });
            }
            return newTimeline;
          });
        }
        break;

      case TimelineAction.CONFLICT_DETECTED:
        if (update.conflict) {
          setConflicts((prev) => [...prev, update.conflict!]);
        }
        break;

      case TimelineAction.CONFLICT_RESOLVED:
        setConflicts((prev) =>
          prev.filter((c) => c.id !== update.data?.conflictId),
        );
        break;
    }
  }, []);

  // Handle timeline item edit
  const handleTimelineItemEdit = useCallback(
    async (itemId: string, changes: Partial<WeddingTimelineItem>) => {
      if (!permissions.canEdit) return;

      // Optimistic update
      setTimeline((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, ...changes } : item,
        ),
      );

      // Create timeline update
      const update: TimelineUpdate = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'UPDATE',
        entityType: 'TIMELINE_ITEM',
        entityId: itemId,
        userId: 'current-user-id', // Should come from auth context
        timestamp: new Date(),
        data: changes,
        weddingId,
        action: TimelineAction.ITEM_UPDATED,
        itemId,
        changes,
      };

      sendTimelineUpdate(update);
      onTimelineUpdate(update);

      // Check for conflicts (simplified conflict detection)
      await checkForConflicts(itemId, changes);
    },
    [permissions.canEdit, sendTimelineUpdate, onTimelineUpdate, weddingId],
  );

  // Handle drag and drop
  const handleDragEnd = useCallback(
    (result: DropResult) => {
      if (!permissions.canReorder) return;
      if (!result.destination) return;

      const sourceIndex = result.source.index;
      const destinationIndex = result.destination.index;

      if (sourceIndex === destinationIndex) return;

      const newTimeline = Array.from(timeline);
      const [reorderedItem] = newTimeline.splice(sourceIndex, 1);
      newTimeline.splice(destinationIndex, 0, reorderedItem);

      setTimeline(newTimeline);

      // Send real-time update
      const update: TimelineUpdate = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'MOVE',
        entityType: 'TIMELINE_ITEM',
        entityId: reorderedItem.id,
        userId: 'current-user-id',
        timestamp: new Date(),
        data: { order: destinationIndex },
        weddingId,
        action: TimelineAction.ITEM_MOVED,
        itemId: reorderedItem.id,
        changes: { order: destinationIndex },
        newIndex: destinationIndex,
      };

      sendTimelineUpdate(update);
      onTimelineUpdate(update);
    },
    [
      permissions.canReorder,
      timeline,
      sendTimelineUpdate,
      onTimelineUpdate,
      weddingId,
    ],
  );

  // Add new timeline item
  const handleAddTimelineItem = useCallback(() => {
    if (!permissions.canAdd) return;

    const newItem: WeddingTimelineItem = {
      id: `timeline-${Date.now()}`,
      title: 'New Timeline Item',
      description: '',
      startTime: new Date(),
      endTime: new Date(Date.now() + 60 * 60 * 1000), // 1 hour later
      type: TimelineItemType.OTHER,
      status: TimelineItemStatus.DRAFT,
      priority: Priority.MEDIUM,
      assignedTo: [],
      relatedVendors: [],
      dependencies: [],
      comments: [],
      order: timeline.length,
    };

    setTimeline((prev) => [...prev, newItem]);

    // Send real-time update
    const update: TimelineUpdate = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'CREATE',
      entityType: 'TIMELINE_ITEM',
      entityId: newItem.id,
      userId: 'current-user-id',
      timestamp: new Date(),
      data: { item: newItem },
      weddingId,
      action: TimelineAction.ITEM_ADDED,
      itemId: newItem.id,
      changes: newItem,
    };

    sendTimelineUpdate(update);
    onTimelineUpdate(update);

    // Start editing the new item
    setEditingItem(newItem.id);
  }, [
    permissions.canAdd,
    timeline.length,
    sendTimelineUpdate,
    onTimelineUpdate,
    weddingId,
  ]);

  // Delete timeline item
  const handleDeleteItem = useCallback(
    (itemId: string) => {
      if (!permissions.canDelete) return;

      setTimeline((prev) => prev.filter((item) => item.id !== itemId));

      const update: TimelineUpdate = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'DELETE',
        entityType: 'TIMELINE_ITEM',
        entityId: itemId,
        userId: 'current-user-id',
        timestamp: new Date(),
        data: { itemId },
        weddingId,
        action: TimelineAction.ITEM_DELETED,
        itemId,
        changes: {},
      };

      sendTimelineUpdate(update);
      onTimelineUpdate(update);
    },
    [permissions.canDelete, sendTimelineUpdate, onTimelineUpdate, weddingId],
  );

  // Simplified conflict detection
  const checkForConflicts = useCallback(
    async (itemId: string, changes: Partial<WeddingTimelineItem>) => {
      // This would normally be more sophisticated
      if (changes.startTime || changes.endTime) {
        const item = timeline.find((t) => t.id === itemId);
        const overlapping = timeline.filter(
          (t) =>
            t.id !== itemId &&
            t.startTime < (changes.endTime || item?.endTime || new Date()) &&
            t.endTime > (changes.startTime || item?.startTime || new Date()),
        );

        if (overlapping.length > 0) {
          const conflict: TimelineConflict = {
            id: `conflict-${Date.now()}`,
            type: 'TIME_OVERLAP',
            itemId,
            conflictingItems: overlapping.map((t) => t.id),
            description: `Time overlap detected with ${overlapping.length} other item(s)`,
            severity: Priority.HIGH,
            suggestions: ['Adjust timing', 'Move to different time slot'],
            detectedAt: new Date(),
          };

          setConflicts((prev) => [...prev, conflict]);
        }
      }
    },
    [timeline],
  );

  // Handle conflict resolution
  const handleConflictResolution = useCallback(
    (conflictId: string, resolution: string) => {
      setConflicts((prev) => prev.filter((c) => c.id !== conflictId));

      // Send resolution update
      const update: TimelineUpdate = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'UPDATE',
        entityType: 'TIMELINE_ITEM',
        entityId: conflictId,
        userId: 'current-user-id',
        timestamp: new Date(),
        data: { conflictId, resolution },
        weddingId,
        action: TimelineAction.CONFLICT_RESOLVED,
        itemId: conflictId,
        changes: {},
      };

      sendTimelineUpdate(update);
    },
    [sendTimelineUpdate, weddingId],
  );

  // Calculate timeline statistics
  const timelineStats = useMemo(() => {
    const completedItems = timeline.filter(
      (item) => item.status === TimelineItemStatus.COMPLETED,
    );
    const overdueItems = timeline.filter(
      (item) =>
        item.endTime < new Date() &&
        item.status !== TimelineItemStatus.COMPLETED,
    );
    const upcomingDeadlines = timeline
      .filter((item) => item.endTime > new Date())
      .sort((a, b) => a.endTime.getTime() - b.endTime.getTime())
      .slice(0, 5);

    return {
      totalItems: timeline.length,
      completedItems: completedItems.length,
      overdue: overdueItems.length,
      upcomingDeadlines,
    };
  }, [timeline]);

  return (
    <TooltipProvider>
      <div className={cn('live-wedding-timeline space-y-6', className)}>
        {/* Timeline Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Live Wedding Timeline
            </h2>
            <p className="text-gray-600">
              Collaborate in real-time with your wedding team
            </p>
          </div>

          <div className="flex items-center space-x-4">
            <TimelineStats {...timelineStats} />
            {permissions.canAdd && (
              <Button
                onClick={handleAddTimelineItem}
                className="bg-purple-600 text-white hover:bg-purple-700"
                disabled={isLoading}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Timeline Item
              </Button>
            )}
          </div>
        </div>

        {/* Conflict Alerts */}
        {conflicts.length > 0 && (
          <ConflictAlertBanner
            conflicts={conflicts}
            onResolveConflict={handleConflictResolution}
          />
        )}

        {/* Timeline Progress */}
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Timeline Progress</span>
            <span className="text-sm text-gray-600">
              {timelineStats.completedItems} of {timelineStats.totalItems}{' '}
              completed
            </span>
          </div>
          <Progress
            value={
              timelineStats.totalItems > 0
                ? (timelineStats.completedItems / timelineStats.totalItems) *
                  100
                : 0
            }
            className="h-2"
          />
        </div>

        {/* Drag and Drop Timeline */}
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="timeline">
            {(provided, snapshot) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className={cn(
                  'space-y-4 transition-colors rounded-lg p-4',
                  snapshot.isDraggingOver
                    ? 'bg-purple-50 border-2 border-dashed border-purple-300'
                    : '',
                )}
              >
                {timeline.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium">No timeline items yet</p>
                    <p>Add your first timeline item to get started</p>
                  </div>
                ) : (
                  timeline.map((item, index) => (
                    <Draggable
                      key={item.id}
                      draggableId={item.id}
                      index={index}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                        >
                          <LiveTimelineItem
                            item={item}
                            dragHandleProps={provided.dragHandleProps}
                            isDragging={snapshot.isDragging}
                            isEditing={editingItem === item.id}
                            collaborators={collaborators}
                            onEdit={handleTimelineItemEdit}
                            onStartEdit={() => setEditingItem(item.id)}
                            onEndEdit={() => setEditingItem(null)}
                            onDelete={handleDeleteItem}
                            conflicts={conflicts.filter(
                              (c) => c.itemId === item.id,
                            )}
                            realTimeMode={realTimeMode}
                            permissions={{
                              canEdit: permissions.canEdit,
                              canDelete: permissions.canDelete,
                            }}
                          />
                        </div>
                      )}
                    </Draggable>
                  ))
                )}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>
    </TooltipProvider>
  );
}

/**
 * Live Timeline Item Component
 */
function LiveTimelineItem({
  item,
  dragHandleProps,
  isDragging,
  isEditing,
  collaborators,
  onEdit,
  onStartEdit,
  onEndEdit,
  onDelete,
  conflicts,
  realTimeMode,
  permissions,
}: LiveTimelineItemProps) {
  const [localChanges, setLocalChanges] = useState<
    Partial<WeddingTimelineItem>
  >({});
  const hasConflicts = conflicts.length > 0;
  const lastEditedBy = collaborators.find((c) => c.id === item.lastEditedBy);

  // Handle field changes with debounced updates in real-time mode
  const handleFieldChange = useCallback(
    (field: string, value: any) => {
      const changes = { [field]: value };
      setLocalChanges((prev) => ({ ...prev, ...changes }));

      if (realTimeMode) {
        // Debounced real-time update would go here
        const timeoutId = setTimeout(() => {
          onEdit(item.id, changes);
        }, 500);

        return () => clearTimeout(timeoutId);
      }
    },
    [realTimeMode, onEdit, item.id],
  );

  // Save changes when editing ends
  const handleSave = useCallback(() => {
    if (Object.keys(localChanges).length > 0) {
      onEdit(item.id, localChanges);
      setLocalChanges({});
    }
    onEndEdit();
  }, [localChanges, onEdit, item.id, onEndEdit]);

  // Get current field value (local changes take precedence)
  const getValue = useCallback(
    (field: keyof WeddingTimelineItem) => {
      return localChanges[field] !== undefined
        ? localChanges[field]
        : item[field];
    },
    [localChanges, item],
  );

  // Get status color
  const getStatusColor = (status: TimelineItemStatus) => {
    switch (status) {
      case TimelineItemStatus.COMPLETED:
        return 'text-green-600 bg-green-50';
      case TimelineItemStatus.IN_PROGRESS:
        return 'text-blue-600 bg-blue-50';
      case TimelineItemStatus.DELAYED:
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  // Get priority color
  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case Priority.CRITICAL:
        return 'text-red-600 bg-red-50';
      case Priority.HIGH:
        return 'text-orange-600 bg-orange-50';
      case Priority.MEDIUM:
        return 'text-yellow-600 bg-yellow-50';
      case Priority.LOW:
        return 'text-green-600 bg-green-50';
    }
  };

  return (
    <Card
      className={cn(
        'transition-all duration-200',
        isDragging ? 'shadow-xl border-purple-400 rotate-1 scale-105' : '',
        hasConflicts ? 'border-red-300 bg-red-50' : 'border-gray-200',
        isEditing ? 'ring-2 ring-purple-400' : '',
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3 flex-1">
            {dragHandleProps && (
              <div
                {...dragHandleProps}
                className="cursor-grab hover:cursor-grabbing text-gray-400 hover:text-gray-600"
              >
                <GripVertical className="w-5 h-5" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              {isEditing ? (
                <Input
                  value={getValue('title') as string}
                  onChange={(e) => handleFieldChange('title', e.target.value)}
                  className="text-lg font-semibold"
                  placeholder="Timeline item title..."
                  autoFocus
                />
              ) : (
                <h3
                  className="text-lg font-semibold text-gray-900 cursor-pointer hover:text-purple-600"
                  onClick={permissions.canEdit ? onStartEdit : undefined}
                >
                  {item.title}
                </h3>
              )}

              <div className="flex items-center space-x-4 mt-1">
                <Badge className={cn('text-xs', getStatusColor(item.status))}>
                  {item.status}
                </Badge>
                <Badge
                  className={cn('text-xs', getPriorityColor(item.priority))}
                >
                  {item.priority}
                </Badge>
                <div className="flex items-center text-sm text-gray-500">
                  <Clock className="w-4 h-4 mr-1" />
                  {new Date(item.startTime).toLocaleTimeString()}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {hasConflicts && (
              <Tooltip>
                <TooltipTrigger>
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>{conflicts.length} conflict(s) detected</p>
                </TooltipContent>
              </Tooltip>
            )}

            {lastEditedBy && (
              <Tooltip>
                <TooltipTrigger>
                  <div className="flex items-center space-x-1 text-xs text-gray-500">
                    <Avatar className="w-4 h-4">
                      <AvatarImage src={lastEditedBy.avatar} />
                      <AvatarFallback>{lastEditedBy.name[0]}</AvatarFallback>
                    </Avatar>
                    <span>edited</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Last edited by {lastEditedBy.name}</p>
                </TooltipContent>
              </Tooltip>
            )}

            <div className="flex items-center space-x-1">
              {permissions.canEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={isEditing ? handleSave : onStartEdit}
                >
                  {isEditing ? (
                    <Save className="w-4 h-4" />
                  ) : (
                    <Edit3 className="w-4 h-4" />
                  )}
                </Button>
              )}

              {permissions.canDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(item.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {isEditing ? (
          <div className="space-y-4">
            <Textarea
              value={(getValue('description') as string) || ''}
              onChange={(e) => handleFieldChange('description', e.target.value)}
              placeholder="Add description..."
              rows={3}
            />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Start Time
                </label>
                <Input
                  type="datetime-local"
                  value={new Date(getValue('startTime') as Date)
                    .toISOString()
                    .slice(0, 16)}
                  onChange={(e) =>
                    handleFieldChange('startTime', new Date(e.target.value))
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  End Time
                </label>
                <Input
                  type="datetime-local"
                  value={new Date(getValue('endTime') as Date)
                    .toISOString()
                    .slice(0, 16)}
                  onChange={(e) =>
                    handleFieldChange('endTime', new Date(e.target.value))
                  }
                />
              </div>
            </div>

            <div className="flex space-x-2">
              <Button onClick={handleSave} size="sm">
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
              <Button variant="outline" onClick={onEndEdit} size="sm">
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {item.description && (
              <p className="text-gray-600">{item.description}</p>
            )}

            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <div className="flex items-center">
                <Clock className="w-4 h-4 mr-1" />
                {new Date(item.startTime).toLocaleDateString()} -{' '}
                {new Date(item.endTime).toLocaleDateString()}
              </div>

              {item.location && (
                <div className="flex items-center">
                  <MapPin className="w-4 h-4 mr-1" />
                  {item.location}
                </div>
              )}

              {item.assignedTo.length > 0 && (
                <div className="flex items-center">
                  <Users className="w-4 h-4 mr-1" />
                  {item.assignedTo.length} assigned
                </div>
              )}
            </div>

            {/* Conflict alerts */}
            {hasConflicts && (
              <div className="mt-2 space-y-1">
                {conflicts.map((conflict) => (
                  <Alert
                    key={conflict.id}
                    variant="destructive"
                    className="py-2"
                  >
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      {conflict.description}
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Conflict Alert Banner
 */
function ConflictAlertBanner({
  conflicts,
  onResolveConflict,
}: ConflictAlertBannerProps) {
  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Timeline Conflicts Detected ({conflicts.length})</AlertTitle>
      <AlertDescription>
        <div className="mt-2 space-y-2">
          {conflicts.slice(0, 3).map((conflict) => (
            <div
              key={conflict.id}
              className="flex items-center justify-between"
            >
              <span className="text-sm">{conflict.description}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onResolveConflict(conflict.id, 'auto_resolve')}
              >
                Auto-resolve
              </Button>
            </div>
          ))}
          {conflicts.length > 3 && (
            <p className="text-sm text-gray-600">
              And {conflicts.length - 3} more conflicts...
            </p>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}

/**
 * Timeline Statistics
 */
function TimelineStats({
  totalItems,
  completedItems,
  overdue,
  upcomingDeadlines,
}: TimelineStatsProps) {
  return (
    <div className="flex items-center space-x-4 text-sm">
      <div className="flex items-center space-x-1">
        <CheckCircle className="w-4 h-4 text-green-500" />
        <span className="font-medium">{completedItems}</span>
        <span className="text-gray-500">completed</span>
      </div>

      {overdue > 0 && (
        <div className="flex items-center space-x-1">
          <AlertCircle className="w-4 h-4 text-red-500" />
          <span className="font-medium text-red-600">{overdue}</span>
          <span className="text-gray-500">overdue</span>
        </div>
      )}

      <div className="flex items-center space-x-1">
        <Calendar className="w-4 h-4 text-blue-500" />
        <span className="font-medium">{upcomingDeadlines.length}</span>
        <span className="text-gray-500">upcoming</span>
      </div>
    </div>
  );
}

export default LiveWeddingTimeline;
