'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  WifiOff,
  Wifi,
  RefreshCw,
  Clock,
  AlertCircle,
  CheckCircle,
  X,
  Upload,
  MessageSquare,
  Zap,
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { toast } from 'sonner';

interface QueuedAction {
  id: string;
  type: 'create_ticket' | 'add_comment' | 'update_status' | 'upload_attachment';
  data: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
}

interface OfflineQueueManagerProps {
  className?: string;
  showWhenEmpty?: boolean;
}

export const OfflineQueueManager: React.FC<OfflineQueueManagerProps> = ({
  className = '',
  showWhenEmpty = false,
}) => {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queue, setQueue] = useState<QueuedAction[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);

  // Load queue from localStorage on mount
  useEffect(() => {
    loadQueueFromStorage();

    // Set up online/offline listeners
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Connection restored');
      processQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('Connection lost - actions will be queued');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-process queue when online
  useEffect(() => {
    if (isOnline && queue.some((item) => item.status === 'pending')) {
      processQueue();
    }
  }, [isOnline, queue]);

  // Load queue from localStorage
  const loadQueueFromStorage = useCallback(() => {
    try {
      const stored = localStorage.getItem('wedsync_offline_queue');
      if (stored) {
        const parsedQueue: QueuedAction[] = JSON.parse(stored);
        setQueue(parsedQueue.filter((item) => item.status !== 'completed'));
      }
    } catch (error) {
      console.error('Error loading queue from storage:', error);
    }
  }, []);

  // Save queue to localStorage
  const saveQueueToStorage = useCallback((queueData: QueuedAction[]) => {
    try {
      localStorage.setItem('wedsync_offline_queue', JSON.stringify(queueData));
    } catch (error) {
      console.error('Error saving queue to storage:', error);
    }
  }, []);

  // Add action to queue
  const queueAction = useCallback(
    (
      type: QueuedAction['type'],
      data: any,
      options: { maxRetries?: number; priority?: boolean } = {},
    ): string => {
      const actionId = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const newAction: QueuedAction = {
        id: actionId,
        type,
        data,
        timestamp: Date.now(),
        retryCount: 0,
        maxRetries: options.maxRetries || 3,
        status: 'pending',
      };

      setQueue((current) => {
        const updated = options.priority
          ? [newAction, ...current]
          : [...current, newAction];

        saveQueueToStorage(updated);
        return updated;
      });

      // Try to process immediately if online
      if (isOnline) {
        setTimeout(() => processQueue(), 100);
      } else {
        toast.info('Action queued for when connection is restored');
      }

      return actionId;
    },
    [isOnline, saveQueueToStorage],
  );

  // Remove action from queue
  const removeFromQueue = useCallback(
    (actionId: string) => {
      setQueue((current) => {
        const updated = current.filter((item) => item.id !== actionId);
        saveQueueToStorage(updated);
        return updated;
      });
    },
    [saveQueueToStorage],
  );

  // Process queued actions
  const processQueue = useCallback(async () => {
    if (!isOnline || isProcessing || queue.length === 0) return;

    setIsProcessing(true);
    setSyncProgress(0);

    const pendingActions = queue.filter(
      (item) =>
        item.status === 'pending' ||
        (item.status === 'failed' && item.retryCount < item.maxRetries),
    );

    if (pendingActions.length === 0) {
      setIsProcessing(false);
      return;
    }

    let processedCount = 0;
    const totalActions = pendingActions.length;

    for (const action of pendingActions) {
      try {
        // Update action status to processing
        setQueue((current) =>
          current.map((item) =>
            item.id === action.id
              ? { ...item, status: 'processing' as const }
              : item,
          ),
        );

        // Process the action
        await processAction(action);

        // Mark as completed
        setQueue((current) =>
          current.map((item) =>
            item.id === action.id
              ? { ...item, status: 'completed' as const }
              : item,
          ),
        );

        processedCount++;
        setSyncProgress((processedCount / totalActions) * 100);
      } catch (error) {
        console.error(`Error processing action ${action.id}:`, error);

        // Update retry count and status
        setQueue((current) =>
          current.map((item) =>
            item.id === action.id
              ? {
                  ...item,
                  status:
                    item.retryCount >= item.maxRetries
                      ? ('failed' as const)
                      : ('pending' as const),
                  retryCount: item.retryCount + 1,
                  error:
                    error instanceof Error ? error.message : 'Unknown error',
                }
              : item,
          ),
        );

        if (action.retryCount >= action.maxRetries) {
          toast.error(`Failed to sync ${getActionDisplayName(action.type)}`);
        }
      }

      // Small delay between actions to prevent overwhelming the API
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // Clean up completed actions after a delay
    setTimeout(() => {
      setQueue((current) => {
        const updated = current.filter((item) => item.status !== 'completed');
        saveQueueToStorage(updated);
        return updated;
      });
    }, 2000);

    setIsProcessing(false);
    setSyncProgress(0);

    if (processedCount > 0) {
      toast.success(
        `${processedCount} action${processedCount > 1 ? 's' : ''} synced successfully`,
      );
    }
  }, [isOnline, isProcessing, queue, saveQueueToStorage]);

  // Process individual action
  const processAction = async (action: QueuedAction): Promise<void> => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    switch (action.type) {
      case 'create_ticket':
        const { data: ticket, error: ticketError } = await supabase
          .from('support_tickets')
          .insert({
            ...action.data,
            user_id: user.id,
          })
          .select('id, ticket_number')
          .single();

        if (ticketError) throw ticketError;

        // Update local reference if needed
        if (action.data._localId) {
          localStorage.setItem(`ticket_${action.data._localId}`, ticket.id);
        }
        break;

      case 'add_comment':
        const { error: commentError } = await supabase
          .from('support_ticket_comments')
          .insert({
            ...action.data,
            author_id: user.id,
          });

        if (commentError) throw commentError;
        break;

      case 'update_status':
        const { error: updateError } = await supabase
          .from('support_tickets')
          .update(action.data.updates)
          .eq('id', action.data.ticketId);

        if (updateError) throw updateError;
        break;

      case 'upload_attachment':
        // Handle file upload
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('support-attachments')
          .upload(action.data.filePath, action.data.file);

        if (uploadError) throw uploadError;

        // Create attachment record
        const { error: attachmentError } = await supabase
          .from('support_ticket_attachments')
          .insert({
            ticket_id: action.data.ticketId,
            filename: action.data.filename,
            file_type: action.data.fileType,
            file_size: action.data.fileSize,
            storage_path: uploadData.path,
            captured_on_mobile: action.data.capturedOnMobile || false,
            uploaded_by: user.id,
          });

        if (attachmentError) throw attachmentError;
        break;

      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  };

  // Get display name for action type
  const getActionDisplayName = (type: string): string => {
    switch (type) {
      case 'create_ticket':
        return 'ticket creation';
      case 'add_comment':
        return 'comment';
      case 'update_status':
        return 'status update';
      case 'upload_attachment':
        return 'file upload';
      default:
        return 'action';
    }
  };

  // Get action icon
  const getActionIcon = (type: string) => {
    switch (type) {
      case 'create_ticket':
        return <AlertCircle className="h-3 w-3" />;
      case 'add_comment':
        return <MessageSquare className="h-3 w-3" />;
      case 'update_status':
        return <RefreshCw className="h-3 w-3" />;
      case 'upload_attachment':
        return <Upload className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  // Force retry all failed actions
  const retryFailedActions = () => {
    setQueue((current) =>
      current.map((item) =>
        item.status === 'failed'
          ? {
              ...item,
              status: 'pending' as const,
              retryCount: 0,
              error: undefined,
            }
          : item,
      ),
    );

    if (isOnline) {
      processQueue();
    }
  };

  // Clear all completed/failed actions
  const clearQueue = () => {
    setQueue((current) => {
      const updated = current.filter(
        (item) => item.status !== 'completed' && item.status !== 'failed',
      );
      saveQueueToStorage(updated);
      return updated;
    });
    toast.success('Queue cleared');
  };

  const pendingCount = queue.filter((item) => item.status === 'pending').length;
  const failedCount = queue.filter((item) => item.status === 'failed').length;
  const processingCount = queue.filter(
    (item) => item.status === 'processing',
  ).length;

  // Don't show if empty and showWhenEmpty is false
  if (!showWhenEmpty && queue.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Connection Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isOnline ? (
            <Wifi className="h-4 w-4 text-green-600" />
          ) : (
            <WifiOff className="h-4 w-4 text-red-600" />
          )}
          <span
            className={`text-sm font-medium ${isOnline ? 'text-green-600' : 'text-red-600'}`}
          >
            {isOnline ? 'Online' : 'Offline'}
          </span>

          {queue.length > 0 && (
            <Badge variant={pendingCount > 0 ? 'default' : 'secondary'}>
              {queue.length} queued
            </Badge>
          )}
        </div>

        {queue.length > 0 && (
          <div className="flex items-center gap-1">
            {isOnline && pendingCount > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={processQueue}
                disabled={isProcessing}
              >
                <RefreshCw
                  className={`h-3 w-3 ${isProcessing ? 'animate-spin' : ''}`}
                />
              </Button>
            )}

            <Button size="sm" variant="ghost" onClick={clearQueue}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      {/* Sync Progress */}
      {isProcessing && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Syncing actions...</span>
            <span className="text-gray-500">{Math.round(syncProgress)}%</span>
          </div>
          <Progress value={syncProgress} className="h-1" />
        </div>
      )}

      {/* Queue Items */}
      {queue.length > 0 && (
        <Card className="border-gray-200">
          <CardContent className="p-3">
            <div className="space-y-2">
              {/* Queue Summary */}
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-700">
                  Queued Actions
                </span>
                <div className="flex items-center gap-2">
                  {pendingCount > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {pendingCount} pending
                    </Badge>
                  )}
                  {processingCount > 0 && (
                    <Badge variant="default" className="text-xs">
                      {processingCount} processing
                    </Badge>
                  )}
                  {failedCount > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {failedCount} failed
                    </Badge>
                  )}
                </div>
              </div>

              {/* Action Items */}
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {queue.map((action) => (
                  <div
                    key={action.id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {getActionIcon(action.type)}
                      <span className="truncate">
                        {getActionDisplayName(action.type)}
                      </span>
                      {action.data.priority && (
                        <Zap className="h-3 w-3 text-red-500" />
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {action.status === 'pending' && (
                        <Clock className="h-3 w-3 text-gray-400" />
                      )}
                      {action.status === 'processing' && (
                        <RefreshCw className="h-3 w-3 text-blue-500 animate-spin" />
                      )}
                      {action.status === 'completed' && (
                        <CheckCircle className="h-3 w-3 text-green-500" />
                      )}
                      {action.status === 'failed' && (
                        <AlertCircle className="h-3 w-3 text-red-500" />
                      )}

                      {action.retryCount > 0 && (
                        <span className="text-gray-500">
                          ({action.retryCount}/{action.maxRetries})
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Retry Failed Actions */}
              {failedCount > 0 && isOnline && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={retryFailedActions}
                  className="w-full"
                  disabled={isProcessing}
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Retry Failed Actions ({failedCount})
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Offline Message */}
      {!isOnline && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-3">
            <div className="flex items-start gap-2">
              <WifiOff className="h-4 w-4 text-amber-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-800">Working offline</p>
                <p className="text-amber-700 text-xs mt-1">
                  Your actions are being saved and will sync automatically when
                  connection is restored.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Export utility functions for other components to use
export const useOfflineQueue = () => {
  const queueAction = (
    type: QueuedAction['type'],
    data: any,
    options: { maxRetries?: number; priority?: boolean } = {},
  ): string => {
    // Get the queue manager instance if it exists
    const event = new CustomEvent('queueAction', {
      detail: { type, data, options },
    });
    window.dispatchEvent(event);

    // Return a temporary ID for tracking
    return `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  return { queueAction };
};
