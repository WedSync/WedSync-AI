'use client';

// WS-157 Touch-Optimized Drag and Drop for Task Reassignment
// Mobile-first drag and drop with touch gestures and haptic feedback

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  GripVertical,
  ArrowUpDown,
  User,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronDown,
  Zap,
} from 'lucide-react';

interface DragItem {
  id: string;
  type: 'task' | 'helper';
  title: string;
  subtitle?: string;
  status?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  assignedTo?: string;
  category?: string;
}

interface DropZone {
  id: string;
  title: string;
  type: 'helper' | 'status' | 'priority';
  accepts: string[];
  items: DragItem[];
  maxItems?: number;
  color?: string;
}

interface TouchPoint {
  x: number;
  y: number;
  timestamp: number;
}

interface DragState {
  isDragging: boolean;
  dragItem: DragItem | null;
  startPosition: TouchPoint | null;
  currentPosition: TouchPoint | null;
  dropZone: string | null;
  offset: { x: number; y: number };
}

export default function TouchDragAndDrop() {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    dragItem: null,
    startPosition: null,
    currentPosition: null,
    dropZone: null,
    offset: { x: 0, y: 0 },
  });

  const [dropZones, setDropZones] = useState<DropZone[]>([
    {
      id: 'unassigned',
      title: 'Unassigned Tasks',
      type: 'helper',
      accepts: ['task'],
      color: 'gray',
      items: [
        {
          id: 'task-1',
          type: 'task',
          title: 'Setup ceremony chairs',
          subtitle: 'Due in 2 hours',
          status: 'todo',
          priority: 'high',
          category: 'Setup',
        },
        {
          id: 'task-2',
          type: 'task',
          title: 'Arrange flower centerpieces',
          subtitle: 'Due in 4 hours',
          status: 'todo',
          priority: 'medium',
          category: 'Decoration',
        },
      ],
    },
    {
      id: 'sarah',
      title: 'Sarah Johnson',
      type: 'helper',
      accepts: ['task'],
      color: 'blue',
      maxItems: 3,
      items: [
        {
          id: 'task-3',
          type: 'task',
          title: 'Coordinate with photographer',
          subtitle: 'In progress',
          status: 'in_progress',
          priority: 'high',
          category: 'Coordination',
        },
      ],
    },
    {
      id: 'mike',
      title: 'Mike Chen',
      type: 'helper',
      accepts: ['task'],
      color: 'green',
      maxItems: 2,
      items: [
        {
          id: 'task-4',
          type: 'task',
          title: 'Setup audio equipment',
          subtitle: 'Due in 1 hour',
          status: 'todo',
          priority: 'critical',
          category: 'Audio/Visual',
        },
      ],
    },
  ]);

  const [showReorderMode, setShowReorderMode] = useState(false);
  const dragElementRef = useRef<HTMLDivElement>(null);
  const longPressTimeout = useRef<NodeJS.Timeout | null>(null);

  // Touch event handlers
  const handleTouchStart = useCallback(
    (e: React.TouchEvent, item: DragItem) => {
      e.preventDefault();
      const touch = e.touches[0];
      const element = e.currentTarget as HTMLElement;
      const rect = element.getBoundingClientRect();

      const startPosition: TouchPoint = {
        x: touch.clientX,
        y: touch.clientY,
        timestamp: Date.now(),
      };

      const offset = {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };

      // Start long press detection for drag initiation
      longPressTimeout.current = setTimeout(() => {
        startDrag(item, startPosition, offset);
      }, 500); // 500ms long press

      setDragState((prev) => ({
        ...prev,
        startPosition,
        offset,
      }));
    },
    [],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!dragState.isDragging) {
        // Check if we've moved too far for long press
        if (longPressTimeout.current && dragState.startPosition) {
          const touch = e.touches[0];
          const deltaX = Math.abs(touch.clientX - dragState.startPosition.x);
          const deltaY = Math.abs(touch.clientY - dragState.startPosition.y);

          if (deltaX > 10 || deltaY > 10) {
            clearTimeout(longPressTimeout.current);
            longPressTimeout.current = null;
          }
        }
        return;
      }

      e.preventDefault();
      const touch = e.touches[0];

      const currentPosition: TouchPoint = {
        x: touch.clientX,
        y: touch.clientY,
        timestamp: Date.now(),
      };

      // Update drag element position
      if (dragElementRef.current) {
        const x = touch.clientX - dragState.offset.x;
        const y = touch.clientY - dragState.offset.y;

        dragElementRef.current.style.transform = `translate(${x}px, ${y}px)`;
      }

      // Check for drop zone
      const dropZone = getDropZoneAtPosition(touch.clientX, touch.clientY);

      setDragState((prev) => ({
        ...prev,
        currentPosition,
        dropZone,
      }));
    },
    [dragState.isDragging, dragState.startPosition, dragState.offset],
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      // Clear long press timeout
      if (longPressTimeout.current) {
        clearTimeout(longPressTimeout.current);
        longPressTimeout.current = null;
      }

      if (!dragState.isDragging) return;

      e.preventDefault();

      // Handle drop
      if (dragState.dropZone && dragState.dragItem) {
        handleDrop(dragState.dragItem, dragState.dropZone);
      }

      endDrag();
    },
    [dragState.isDragging, dragState.dropZone, dragState.dragItem],
  );

  const startDrag = useCallback(
    (
      item: DragItem,
      position: TouchPoint,
      offset: { x: number; y: number },
    ) => {
      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }

      setDragState((prev) => ({
        ...prev,
        isDragging: true,
        dragItem: item,
        startPosition: position,
        offset,
      }));

      // Create floating drag element
      if (dragElementRef.current) {
        const x = position.x - offset.x;
        const y = position.y - offset.y;
        dragElementRef.current.style.transform = `translate(${x}px, ${y}px)`;
        dragElementRef.current.style.opacity = '1';
        dragElementRef.current.style.pointerEvents = 'none';
      }

      // Add visual feedback to drop zones
      setDropZones((prev) =>
        prev.map((zone) => ({
          ...zone,
          isHighlighted: zone.accepts.includes(item.type),
        })),
      );
    },
    [],
  );

  const endDrag = useCallback(() => {
    setDragState({
      isDragging: false,
      dragItem: null,
      startPosition: null,
      currentPosition: null,
      dropZone: null,
      offset: { x: 0, y: 0 },
    });

    // Hide floating drag element
    if (dragElementRef.current) {
      dragElementRef.current.style.opacity = '0';
      dragElementRef.current.style.transform = 'translate(-999px, -999px)';
    }

    // Remove drop zone highlights
    setDropZones((prev) =>
      prev.map((zone) => ({
        ...zone,
        isHighlighted: false,
      })),
    );
  }, []);

  const handleDrop = useCallback(
    (item: DragItem, dropZoneId: string) => {
      const sourceZone = dropZones.find((zone) =>
        zone.items.some((zoneItem) => zoneItem.id === item.id),
      );
      const targetZone = dropZones.find((zone) => zone.id === dropZoneId);

      if (!sourceZone || !targetZone) return;

      // Check if drop is valid
      if (!targetZone.accepts.includes(item.type)) return;
      if (targetZone.maxItems && targetZone.items.length >= targetZone.maxItems)
        return;

      // Move item between zones
      setDropZones((prev) =>
        prev.map((zone) => {
          if (zone.id === sourceZone.id) {
            return {
              ...zone,
              items: zone.items.filter((zoneItem) => zoneItem.id !== item.id),
            };
          }
          if (zone.id === targetZone.id) {
            return {
              ...zone,
              items: [...zone.items, item],
            };
          }
          return zone;
        }),
      );

      // Haptic feedback for successful drop
      if (navigator.vibrate) {
        navigator.vibrate([30, 10, 30]);
      }

      // Show success animation (could be implemented with CSS animations)
      showDropSuccess(targetZone.title);
    },
    [dropZones],
  );

  const getDropZoneAtPosition = useCallback(
    (x: number, y: number): string | null => {
      const elements = document.elementsFromPoint(x, y);
      const dropZoneElement = elements.find((el) =>
        el.hasAttribute('data-drop-zone'),
      );

      return dropZoneElement?.getAttribute('data-drop-zone') || null;
    },
    [],
  );

  const showDropSuccess = (zoneName: string) => {
    // This could trigger a toast notification or animation
    console.log(`Successfully moved to ${zoneName}`);
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'critical':
        return 'border-l-error-500 bg-error-50';
      case 'high':
        return 'border-l-warning-500 bg-warning-50';
      case 'medium':
        return 'border-l-blue-500 bg-blue-50';
      case 'low':
        return 'border-l-success-500 bg-success-50';
      default:
        return 'border-l-gray-500 bg-gray-50';
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-success-600" />;
      case 'in_progress':
        return <Clock className="w-4 h-4 text-blue-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getZoneColor = (color?: string, isHighlighted?: boolean) => {
    if (isHighlighted) {
      return 'bg-primary-100 border-primary-300';
    }

    switch (color) {
      case 'blue':
        return 'bg-blue-50 border-blue-200';
      case 'green':
        return 'bg-success-50 border-success-200';
      case 'red':
        return 'bg-error-50 border-error-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Task Assignment</h2>
          <p className="text-sm text-gray-600">
            Long press and drag tasks to reassign them
          </p>
        </div>
        <button
          onClick={() => setShowReorderMode(!showReorderMode)}
          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
            showReorderMode
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <ArrowUpDown className="w-4 h-4 inline mr-2" />
          Reorder
        </button>
      </div>

      {/* Instructions */}
      {!dragState.isDragging && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Zap className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-900 mb-1">
                Quick Start Guide
              </p>
              <ul className="text-blue-700 space-y-1">
                <li>• Long press a task card to start dragging</li>
                <li>• Drop on a helper's zone to reassign</li>
                <li>• Green zones are available, red are at capacity</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Drag Status */}
      {dragState.isDragging && (
        <div className="bg-primary-50 border border-primary-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <GripVertical className="w-5 h-5 text-primary-600 animate-pulse" />
            <div>
              <p className="font-medium text-primary-900">
                Dragging: {dragState.dragItem?.title}
              </p>
              <p className="text-sm text-primary-700">
                {dragState.dropZone
                  ? `Drop on ${dropZones.find((z) => z.id === dragState.dropZone)?.title}`
                  : 'Move to a drop zone'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Drop Zones */}
      <div className="space-y-4">
        {dropZones.map((zone) => (
          <div
            key={zone.id}
            data-drop-zone={zone.id}
            className={`rounded-xl border-2 border-dashed p-4 transition-all duration-200 ${getZoneColor(
              zone.color,
              (zone as any).isHighlighted,
            )} ${
              dragState.isDragging &&
              zone.accepts.includes(dragState.dragItem?.type || '')
                ? 'scale-102 shadow-lg'
                : ''
            }`}
          >
            {/* Zone Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-gray-600" />
                <div>
                  <h3 className="font-semibold text-gray-900">{zone.title}</h3>
                  <p className="text-sm text-gray-600">
                    {zone.items.length} task{zone.items.length !== 1 ? 's' : ''}
                    {zone.maxItems && ` / ${zone.maxItems} max`}
                  </p>
                </div>
              </div>

              {zone.maxItems && (
                <div className="text-sm">
                  <div
                    className={`px-2 py-1 rounded-full ${
                      zone.items.length >= zone.maxItems
                        ? 'bg-error-100 text-error-700'
                        : 'bg-success-100 text-success-700'
                    }`}
                  >
                    {zone.items.length >= zone.maxItems ? 'Full' : 'Available'}
                  </div>
                </div>
              )}
            </div>

            {/* Task Items */}
            <div className="space-y-3">
              {zone.items.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-2">
                    <ChevronDown className="w-6 h-6" />
                  </div>
                  <p className="text-sm">Drop tasks here</p>
                </div>
              ) : (
                zone.items.map((item) => (
                  <div
                    key={item.id}
                    onTouchStart={(e) => handleTouchStart(e, item)}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    className={`bg-white rounded-lg border-l-4 p-4 shadow-sm transition-all duration-200 ${getPriorityColor(
                      item.priority,
                    )} ${
                      dragState.dragItem?.id === item.id
                        ? 'opacity-50 scale-95'
                        : 'hover:shadow-md active:scale-98'
                    }`}
                    style={{
                      touchAction: 'none',
                      userSelect: 'none',
                    }}
                  >
                    <div className="flex items-start gap-3">
                      {/* Drag Handle */}
                      <div className="flex-shrink-0 mt-1">
                        <GripVertical className="w-4 h-4 text-gray-400" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {getStatusIcon(item.status)}
                          <h4 className="font-semibold text-gray-900 truncate">
                            {item.title}
                          </h4>
                        </div>

                        {item.subtitle && (
                          <p className="text-sm text-gray-600 mb-2">
                            {item.subtitle}
                          </p>
                        )}

                        <div className="flex items-center gap-2">
                          {item.priority && (
                            <span
                              className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                                item.priority === 'critical'
                                  ? 'bg-error-100 text-error-700'
                                  : item.priority === 'high'
                                    ? 'bg-warning-100 text-warning-700'
                                    : item.priority === 'medium'
                                      ? 'bg-blue-100 text-blue-700'
                                      : 'bg-success-100 text-success-700'
                              }`}
                            >
                              {item.priority}
                            </span>
                          )}

                          {item.category && (
                            <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded-full">
                              {item.category}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Floating Drag Element */}
      <div
        ref={dragElementRef}
        className="fixed top-0 left-0 z-50 pointer-events-none opacity-0 transition-opacity duration-200"
        style={{ transform: 'translate(-999px, -999px)' }}
      >
        {dragState.dragItem && (
          <div
            className={`bg-white rounded-lg border-l-4 p-3 shadow-xl scale-105 ${getPriorityColor(
              dragState.dragItem.priority,
            )}`}
          >
            <div className="flex items-start gap-2">
              {getStatusIcon(dragState.dragItem.status)}
              <div>
                <h4 className="font-semibold text-gray-900 text-sm">
                  {dragState.dragItem.title}
                </h4>
                {dragState.dragItem.subtitle && (
                  <p className="text-xs text-gray-600">
                    {dragState.dragItem.subtitle}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
