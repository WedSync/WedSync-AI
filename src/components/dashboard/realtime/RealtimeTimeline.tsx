'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRealtimeConnection } from '@/hooks/useRealtime';
import { formatDistanceToNow, format } from 'date-fns';
import {
  Clock,
  CheckCircle,
  AlertCircle,
  User,
  MapPin,
  Activity,
  Loader2,
  WifiOff,
  Wifi,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimelineItem {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  status: 'pending' | 'in-progress' | 'completed' | 'delayed';
  vendor?: string;
  location?: string;
  notes?: string;
  delayMinutes?: number;
}

interface VendorStatus {
  status: 'preparing' | 'on-route' | 'on-site' | 'completed';
  lastUpdate: number;
  eta?: string;
}

interface Timeline {
  id: string;
  items: TimelineItem[];
  vendorStatuses?: Record<string, VendorStatus>;
}

interface RealtimeTimelineProps {
  timeline: Timeline;
  onUpdate?: (update: any) => void;
  onReorder?: (newOrder: string[]) => void;
  onVendorUpdate?: (update: any) => void;
  onConflict?: (conflict: any) => void;
  onRollback?: (update: any) => void;
  onBatchUpdate?: (updates: any[]) => void;
  allowReorder?: boolean;
  optimisticUpdates?: boolean;
  pendingUpdates?: any[];
  pendingChanges?: any[];
  failedUpdates?: any[];
  showNotifications?: boolean;
  enableAnimations?: boolean;
  batchInterval?: number;
  debounceDelay?: number;
  className?: string;
}

export function RealtimeTimeline({
  timeline: initialTimeline,
  onUpdate,
  onReorder,
  onVendorUpdate,
  onConflict,
  onRollback,
  onBatchUpdate,
  allowReorder = false,
  optimisticUpdates = true,
  pendingUpdates = [],
  pendingChanges = [],
  failedUpdates = [],
  showNotifications = true,
  enableAnimations = true,
  batchInterval = 100,
  debounceDelay = 300,
  className,
}: RealtimeTimelineProps) {
  const [timeline, setTimeline] = useState(initialTimeline);
  const [notifications, setNotifications] = useState<string[]>([]);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [updateQueue, setUpdateQueue] = useState<any[]>([]);
  const batchTimeoutRef = useRef<NodeJS.Timeout>();
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();

  // Set up realtime connection
  const { isConnected, connectionState, send, latency } = useRealtimeConnection(
    `timeline-${initialTimeline.id}`,
    {
      onMessage: handleRealtimeUpdate,
      onConnect: () => addNotification('Timeline synced'),
      onDisconnect: () => addNotification('Connection lost - working offline'),
      onReconnect: () => addNotification('Connection restored'),
    },
  );

  // Handle realtime updates
  function handleRealtimeUpdate(payload: any) {
    const { type, data } = payload;

    switch (type) {
      case 'timeline_update':
        handleTimelineUpdate(data);
        break;
      case 'vendor_status':
        handleVendorStatusUpdate(data);
        break;
      case 'timeline_reorder':
        handleTimelineReorder(data);
        break;
      default:
        break;
    }
  }

  // Handle timeline item updates
  const handleTimelineUpdate = useCallback(
    (update: any) => {
      const { itemId, changes } = update;

      setTimeline((prev) => ({
        ...prev,
        items: prev.items.map((item) =>
          item.id === itemId ? { ...item, ...changes } : item,
        ),
      }));

      // Show notification for important changes
      if (changes.status === 'delayed' && showNotifications) {
        const item = timeline.items.find((i) => i.id === itemId);
        if (item) {
          const message = changes.delayMinutes
            ? `${item.title} has been delayed by ${changes.delayMinutes} minutes`
            : `${item.title} has been delayed`;
          addNotification(message);
        }
      }
    },
    [timeline.items, showNotifications],
  );

  // Handle vendor status updates
  const handleVendorStatusUpdate = useCallback(
    (update: any) => {
      const { vendor, status, timestamp, eta } = update;

      setTimeline((prev) => ({
        ...prev,
        vendorStatuses: {
          ...prev.vendorStatuses,
          [vendor]: {
            status,
            lastUpdate: timestamp,
            eta,
          },
        },
      }));

      if (showNotifications) {
        if (status === 'on-site') {
          addNotification(`${vendor} has arrived`);
        } else if (status === 'on-route' && eta) {
          addNotification(`${vendor} is on the way (ETA: ${eta})`);
        }
      }

      onVendorUpdate?.(update);
    },
    [showNotifications, onVendorUpdate],
  );

  // Handle timeline reordering
  const handleTimelineReorder = useCallback((newOrder: string[]) => {
    setTimeline((prev) => {
      const itemMap = new Map(prev.items.map((item) => [item.id, item]));
      const reorderedItems = newOrder
        .map((id) => itemMap.get(id))
        .filter(Boolean) as TimelineItem[];

      return {
        ...prev,
        items: reorderedItems,
      };
    });
  }, []);

  // Batch updates for performance
  const batchUpdate = useCallback(
    (update: any) => {
      setUpdateQueue((prev) => [...prev, update]);

      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
      }

      batchTimeoutRef.current = setTimeout(() => {
        if (updateQueue.length > 0) {
          onBatchUpdate?.(updateQueue);
          setUpdateQueue([]);
        }
      }, batchInterval);
    },
    [updateQueue, batchInterval, onBatchUpdate],
  );

  // Debounced update handler
  const debouncedUpdate = useCallback(
    (itemId: string, field: string, value: any) => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      debounceTimeoutRef.current = setTimeout(() => {
        const update = { itemId, field, value };

        if (optimisticUpdates) {
          // Apply update optimistically
          handleTimelineUpdate({ itemId, changes: { [field]: value } });
        }

        // Send update
        send({ type: 'timeline_update', data: update });
        onUpdate?.(update);
      }, debounceDelay);
    },
    [debounceDelay, optimisticUpdates, send, onUpdate, handleTimelineUpdate],
  );

  // Add notification
  const addNotification = useCallback(
    (message: string) => {
      if (!showNotifications) return;

      const id = Date.now().toString();
      setNotifications((prev) => [...prev, message]);

      // Auto-remove after 5 seconds
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n !== message));
      }, 5000);
    },
    [showNotifications],
  );

  // Handle drag and drop
  const handleDragStart = (itemId: string) => {
    setDraggedItem(itemId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();

    if (!draggedItem || draggedItem === targetId) return;

    const currentIndex = timeline.items.findIndex(
      (item) => item.id === draggedItem,
    );
    const targetIndex = timeline.items.findIndex(
      (item) => item.id === targetId,
    );

    if (currentIndex === -1 || targetIndex === -1) return;

    const newItems = [...timeline.items];
    const [movedItem] = newItems.splice(currentIndex, 1);
    newItems.splice(targetIndex, 0, movedItem);

    const newOrder = newItems.map((item) => item.id);
    handleTimelineReorder(newOrder);
    onReorder?.(newOrder);

    // Send realtime update
    send({ type: 'timeline_reorder', data: newOrder });

    setDraggedItem(null);
  };

  // Handle vendor check-in
  const handleVendorCheckIn = useCallback(
    (vendor: string) => {
      const update = {
        vendor,
        status: 'arrived' as const,
        timestamp: Date.now(),
      };

      handleVendorStatusUpdate(update);
      send({ type: 'vendor_status', data: update });
    },
    [handleVendorStatusUpdate, send],
  );

  // Process pending updates
  useEffect(() => {
    pendingUpdates.forEach((update) => {
      const existingUpdate = pendingUpdates.find(
        (u) =>
          u.itemId === update.itemId &&
          u.field === update.field &&
          u.userId !== update.userId,
      );

      if (existingUpdate) {
        // Conflict detected
        onConflict?.({
          item: update.itemId,
          conflicts: [existingUpdate, update],
        });
      } else {
        handleTimelineUpdate({
          itemId: update.itemId,
          changes: { [update.field]: update.value },
        });
      }
    });
  }, [pendingUpdates, onConflict, handleTimelineUpdate]);

  // Process failed updates
  useEffect(() => {
    failedUpdates.forEach((update) => {
      // Rollback optimistic update
      if (optimisticUpdates) {
        onRollback?.(update);
      }

      addNotification(`Failed to update ${update.itemId}: ${update.error}`);
    });
  }, [failedUpdates, optimisticUpdates, onRollback]);

  // Get item status classes
  const getItemStatusClass = (
    status: TimelineItem['status'],
    isPending = false,
  ) => {
    const baseClasses = 'transition-all duration-300';

    if (isPending) {
      return cn(baseClasses, 'opacity-60 animate-pulse');
    }

    switch (status) {
      case 'completed':
        return cn(baseClasses, 'bg-green-50 border-green-200');
      case 'in-progress':
        return cn(
          baseClasses,
          'bg-blue-50 border-blue-200 timeline-item--in-progress',
        );
      case 'delayed':
        return cn(baseClasses, 'bg-red-50 border-red-200');
      default:
        return cn(baseClasses, 'bg-gray-50 border-gray-200');
    }
  };

  // Get vendor status badge
  const getVendorStatusBadge = (vendor: string) => {
    const status = timeline.vendorStatuses?.[vendor];
    if (!status) return null;

    const statusColors = {
      preparing: 'bg-gray-100 text-gray-700',
      'on-route': 'bg-blue-100 text-blue-700',
      'on-site': 'bg-green-100 text-green-700',
      completed: 'bg-purple-100 text-purple-700',
    };

    return (
      <span
        data-testid={`vendor-status-${vendor}`}
        className={cn(
          'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
          statusColors[status.status],
        )}
      >
        {status.status}
        {status.eta && ` (${status.eta})`}
      </span>
    );
  };

  return (
    <div
      data-testid="timeline-container"
      className={cn('space-y-4', className)}
    >
      {/* Connection Status */}
      <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
        <div className="flex items-center gap-2">
          {connectionState === 'connected' ? (
            <>
              <Wifi className="w-4 h-4 text-green-500" />
              <span className="text-sm text-gray-600">Live</span>
              {latency && (
                <span className="text-xs text-gray-400">({latency}ms)</span>
              )}
            </>
          ) : connectionState === 'reconnecting' ? (
            <>
              <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />
              <span className="text-sm text-gray-600">Reconnecting...</span>
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4 text-red-500" />
              <span className="text-sm text-gray-600">Offline</span>
            </>
          )}
        </div>
      </div>

      {/* Timeline Items */}
      <div className="space-y-2">
        {timeline.items.map((item, index) => {
          const isPending = pendingChanges.some(
            (c) => c.itemId === item.id && c.isPending,
          );

          return (
            <div
              key={item.id}
              data-testid={`timeline-item-${index + 1}`}
              data-status={item.status}
              className={cn(
                'p-4 rounded-lg border',
                getItemStatusClass(item.status, isPending),
                isPending && 'timeline-item--pending',
                enableAnimations && 'transition-all duration-300',
                draggedItem === item.id && 'opacity-50',
              )}
              draggable={allowReorder}
              onDragStart={() => handleDragStart(item.id)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, item.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {allowReorder && (
                      <div
                        data-testid={`drag-handle-${item.id}`}
                        className="cursor-move p-1"
                      >
                        ⋮⋮
                      </div>
                    )}
                    <input
                      data-testid={`timeline-item-${index + 1}-title`}
                      type="text"
                      value={item.title}
                      onChange={(e) =>
                        debouncedUpdate(item.id, 'title', e.target.value)
                      }
                      className="text-lg font-semibold bg-transparent border-none focus:outline-none"
                    />
                    {item.status === 'completed' && (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    )}
                    {item.status === 'delayed' && (
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    )}
                  </div>

                  <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>
                        {item.startTime} - {item.endTime}
                      </span>
                    </div>

                    {item.vendor && (
                      <div className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        <span>{item.vendor}</span>
                        {getVendorStatusBadge(item.vendor)}
                      </div>
                    )}

                    {item.location && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        <span>{item.location}</span>
                      </div>
                    )}
                  </div>

                  {item.notes && (
                    <p className="mt-2 text-sm text-gray-500">{item.notes}</p>
                  )}

                  {item.delayMinutes && (
                    <p className="mt-2 text-sm text-red-600">
                      Delayed by {item.delayMinutes} minutes
                    </p>
                  )}
                </div>

                {item.vendor && item.status === 'pending' && (
                  <button
                    data-testid={`vendor-checkin-${item.vendor}`}
                    onClick={() => handleVendorCheckIn(item.vendor!)}
                    className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                  >
                    Check In
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Notifications */}
      {showNotifications && notifications.length > 0 && (
        <div className="fixed bottom-4 right-4 space-y-2 z-50">
          {notifications.map((notification, index) => (
            <div
              key={index}
              role="alert"
              className={cn(
                'px-4 py-3 bg-white rounded-lg shadow-lg border-l-4 border-blue-500',
                enableAnimations && 'animate-fadeIn',
              )}
            >
              {notification}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
