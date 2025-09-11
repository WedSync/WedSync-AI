'use client';

import { useState, useEffect, useCallback } from 'react';
import { BroadcastToast } from './BroadcastToast';
import { useBroadcastSubscription } from '@/hooks/useBroadcastSubscription';
import {
  BroadcastPriorityQueue,
  createWeddingBroadcastQueue,
  BroadcastMessage,
} from '@/lib/broadcast/priority-queue';
import { cn } from '@/lib/utils';

interface BroadcastCenterProps {
  userId: string;
  position?: 'top-right' | 'bottom-right' | 'top-center';
  maxVisible?: number;
  weddingId?: string;
  userRole?: 'couple' | 'coordinator' | 'supplier' | 'photographer';
}

interface DisplayedBroadcast {
  id: string;
  broadcast: BroadcastMessage;
  options: {
    autoHide: boolean;
    duration?: number;
    requiresAck: boolean;
  };
  key: string;
}

export function BroadcastCenter({
  userId,
  position = 'top-right',
  maxVisible = 3,
  weddingId,
  userRole,
}: BroadcastCenterProps) {
  const [displayedBroadcasts, setDisplayedBroadcasts] = useState<
    DisplayedBroadcast[]
  >([]);
  const [queue] = useState<BroadcastPriorityQueue>(
    createWeddingBroadcastQueue(),
  );
  const [processingQueue, setProcessingQueue] = useState(false);

  const {
    broadcasts,
    unreadCount,
    markAsRead,
    connectionStatus,
    getNextMessage,
  } = useBroadcastSubscription(userId, weddingId, {
    userRole,
    onMessage: (message) => {
      // When a new message arrives, add to queue and process
      if (shouldShowBroadcast(message, userRole, weddingId)) {
        queue.enqueue(message);
        processQueue();
      }
    },
  });

  // Wedding industry specific broadcast filtering
  const shouldShowBroadcast = (
    broadcast: BroadcastMessage,
    role?: string,
    contextWeddingId?: string,
  ) => {
    // Wedding context filtering
    if (contextWeddingId && broadcast.weddingContext) {
      if (broadcast.weddingContext.weddingId !== contextWeddingId) {
        return false;
      }
    }

    // Role-based filtering
    if (role === 'couple' && broadcast.type.startsWith('supplier.')) {
      return false; // Couples don't need internal supplier notifications
    }

    if (role === 'supplier' && broadcast.type.startsWith('admin.')) {
      return false; // Suppliers don't need admin notifications
    }

    // Photographer specific filtering
    if (role === 'photographer') {
      const photographerTypes = [
        'timeline.changed',
        'wedding.cancelled',
        'payment.required',
        'venue.changed',
        'weather.alert',
        'maintenance.scheduled',
      ];
      return (
        photographerTypes.includes(broadcast.type) ||
        broadcast.priority === 'critical'
      );
    }

    // Check target roles if specified
    if (
      broadcast.targetRoles &&
      role &&
      !broadcast.targetRoles.includes(role)
    ) {
      return false;
    }

    return true;
  };

  // Process priority queue and display broadcasts
  const processQueue = useCallback(async () => {
    if (processingQueue || displayedBroadcasts.length >= maxVisible) {
      return;
    }

    setProcessingQueue(true);

    try {
      const nextBroadcast = queue.dequeue();
      if (!nextBroadcast) {
        setProcessingQueue(false);
        return;
      }

      const displayOptions = getDisplayOptions(nextBroadcast);
      const displayBroadcast: DisplayedBroadcast = {
        id: nextBroadcast.id,
        broadcast: nextBroadcast,
        options: displayOptions,
        key: `${nextBroadcast.id}-${Date.now()}`,
      };

      setDisplayedBroadcasts((prev) => [...prev, displayBroadcast]);

      // Mark as read immediately when displayed
      await markAsRead(nextBroadcast.id);

      // Auto-process next if available after a short delay
      setTimeout(() => {
        setProcessingQueue(false);
        if (queue.hasNext() && displayedBroadcasts.length < maxVisible - 1) {
          processQueue();
        }
      }, 500);
    } catch (error) {
      console.error('Error processing broadcast queue:', error);
      setProcessingQueue(false);
    }
  }, [displayedBroadcasts.length, maxVisible, queue, markAsRead]);

  // Get display options based on priority
  const getDisplayOptions = (broadcast: BroadcastMessage) => {
    const priorityConfig = {
      critical: {
        autoHide: false,
        requiresAck: true,
        duration: undefined,
      },
      high: {
        autoHide: true,
        requiresAck: false,
        duration: 10000, // 10 seconds
      },
      normal: {
        autoHide: true,
        requiresAck: false,
        duration: 5000, // 5 seconds
      },
      low: {
        autoHide: true,
        requiresAck: false,
        duration: 3000, // 3 seconds
      },
    };

    const baseConfig =
      priorityConfig[broadcast.priority] || priorityConfig.normal;

    // Wedding industry specific adjustments
    if (broadcast.weddingContext) {
      const weddingDate = new Date(broadcast.weddingContext.weddingDate);
      const daysUntilWedding = Math.ceil(
        (weddingDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      );

      // Extend display time for weddings happening soon
      if (daysUntilWedding <= 7 && baseConfig.duration) {
        baseConfig.duration *= 2;
      }

      // Saturday weddings (wedding day) never auto-hide
      if (weddingDate.getDay() === 6 && Math.abs(daysUntilWedding) <= 1) {
        baseConfig.autoHide = false;
        baseConfig.requiresAck = true;
      }
    }

    return baseConfig;
  };

  // Handle broadcast dismissal
  const handleDismiss = useCallback(
    (broadcastId: string) => {
      setDisplayedBroadcasts((prev) =>
        prev.filter((db) => db.id !== broadcastId),
      );

      // Process next in queue after dismissal
      setTimeout(() => {
        if (queue.hasNext() && displayedBroadcasts.length <= maxVisible) {
          processQueue();
        }
      }, 300);
    },
    [queue, displayedBroadcasts.length, maxVisible, processQueue],
  );

  // Handle action clicks
  const handleAction = useCallback((url: string) => {
    // Navigate to action URL
    if (url.startsWith('/')) {
      // Internal link
      window.location.href = url;
    } else {
      // External link
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }, []);

  // Handle acknowledgment
  const handleAcknowledge = useCallback(
    async (broadcastId: string) => {
      try {
        await fetch('/api/broadcast/acknowledge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            broadcastId,
            action: 'acknowledged',
            timestamp: new Date().toISOString(),
          }),
        });

        // Track acknowledgment for wedding industry analytics
        if (typeof window !== 'undefined' && (window as any).gtag) {
          (window as any).gtag('event', 'wedding_broadcast_acknowledged', {
            broadcast_id: broadcastId,
            user_role: userRole,
            wedding_id: weddingId,
          });
        }
      } catch (error) {
        console.error('Failed to acknowledge broadcast:', error);
      }
    },
    [userRole, weddingId],
  );

  // Initial queue processing when component mounts
  useEffect(() => {
    if (queue.hasNext() && displayedBroadcasts.length < maxVisible) {
      processQueue();
    }
  }, [queue, displayedBroadcasts.length, maxVisible, processQueue]);

  // Clean up expired messages periodically
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const removedCount = queue.cleanExpired();
      if (removedCount > 0) {
        console.log(`Cleaned ${removedCount} expired broadcast messages`);
      }
    }, 60000); // Clean every minute

    return () => clearInterval(cleanupInterval);
  }, [queue]);

  // Position-based container classes
  const containerClasses = {
    'top-right': 'top-4 right-4 flex-col-reverse',
    'bottom-right': 'bottom-4 right-4 flex-col',
    'top-center': 'top-4 left-1/2 transform -translate-x-1/2 flex-col-reverse',
  };

  return (
    <>
      {/* Connection status indicator for critical contexts */}
      {connectionStatus !== 'connected' && userRole === 'coordinator' && (
        <div
          className="fixed top-2 left-2 z-40 px-2 py-1 bg-red-500 text-white text-xs rounded"
          role="alert"
          aria-live="assertive"
        >
          Broadcast connection: {connectionStatus}
        </div>
      )}

      {/* Wedding day warning for Saturday issues */}
      {weddingId &&
        new Date().getDay() === 6 &&
        connectionStatus !== 'connected' && (
          <div
            className="fixed top-2 left-1/2 transform -translate-x-1/2 z-40 px-4 py-2 bg-red-600 text-white text-sm rounded-lg shadow-lg"
            role="alert"
            aria-live="assertive"
          >
            ⚠️ Wedding Day Alert: Connection issues detected. Contact support
            immediately.
          </div>
        )}

      {/* Broadcast container */}
      <div
        className={cn(
          'fixed z-50 flex gap-2 pointer-events-none',
          containerClasses[position],
        )}
        aria-live="polite"
        aria-label="Broadcast notifications"
      >
        {displayedBroadcasts.map((db) => (
          <BroadcastToast
            key={db.key}
            broadcast={db.broadcast}
            onDismiss={() => handleDismiss(db.id)}
            onAction={handleAction}
            onAcknowledge={handleAcknowledge}
            autoHideDuration={
              db.options.autoHide ? db.options.duration : undefined
            }
            position={position}
          />
        ))}
      </div>

      {/* Queue size indicator for debugging (development only) */}
      {process.env.NODE_ENV === 'development' && queue.size() > 0 && (
        <div className="fixed bottom-2 left-2 z-40 px-2 py-1 bg-blue-500 text-white text-xs rounded">
          Queue: {queue.size()} pending
        </div>
      )}

      {/* Wedding industry specific overload warning */}
      {queue.size() > 10 && weddingId && (
        <div
          className="fixed bottom-2 right-2 z-40 px-3 py-2 bg-orange-500 text-white text-sm rounded-lg"
          role="alert"
        >
          High notification volume detected. Check inbox for full history.
        </div>
      )}
    </>
  );
}
