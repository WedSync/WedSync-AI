'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { syncManager, SyncStatus } from '@/lib/offline/sync-manager';
import {
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Wifi,
  WifiOff,
  Upload,
  Download,
  RefreshCw,
  X,
  Zap,
  Calendar,
} from 'lucide-react';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info' | 'sync';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'emergency';
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  persistent?: boolean;
  weddingContext?: boolean;
  timestamp: Date;
}

interface SyncToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id' | 'timestamp'>) => string;
  removeToast: (id: string) => void;
  clearAllToasts: () => void;
}

const SyncToastContext = createContext<SyncToastContextType | null>(null);

export const useSyncToasts = () => {
  const context = useContext(SyncToastContext);
  if (!context) {
    throw new Error('useSyncToasts must be used within a SyncToastProvider');
  }
  return context;
};

interface SyncToastProviderProps {
  children: React.ReactNode;
  maxToasts?: number;
  defaultDuration?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export const SyncToastProvider: React.FC<SyncToastProviderProps> = ({
  children,
  maxToasts = 5,
  defaultDuration = 5000,
  position = 'top-right',
}) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [lastStatus, setLastStatus] = useState<SyncStatus | null>(null);
  const [connectionState, setConnectionState] = useState<
    'online' | 'offline' | 'unknown'
  >('unknown');

  const addToast = useCallback(
    (toastData: Omit<Toast, 'id' | 'timestamp'>): string => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newToast: Toast = {
        ...toastData,
        id,
        timestamp: new Date(),
        duration: toastData.duration ?? defaultDuration,
      };

      setToasts((prev) => {
        // Remove oldest toasts if we exceed maxToasts
        const filtered = prev.slice(-(maxToasts - 1));
        return [...filtered, newToast];
      });

      // Auto-remove toast after duration (unless persistent)
      if (!newToast.persistent && newToast.duration && newToast.duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, newToast.duration);
      }

      return id;
    },
    [defaultDuration, maxToasts],
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  // Monitor sync status changes and generate appropriate toasts
  useEffect(() => {
    const handleStatusChange = (status: SyncStatus) => {
      const previousStatus = lastStatus;

      // Connection state changes
      if (previousStatus && previousStatus.isOnline !== status.isOnline) {
        if (status.isOnline) {
          setConnectionState('online');
          addToast({
            type: 'success',
            title: 'Connection Restored',
            message:
              status.pendingCount > 0
                ? `Back online. ${status.pendingCount} items will now sync.`
                : 'Connection restored. All data is up to date.',
            priority: 'medium',
            duration: 4000,
          });
        } else {
          setConnectionState('offline');
          addToast({
            type: 'warning',
            title: 'Connection Lost',
            message:
              'Working offline. Changes will be saved locally and synced when connection returns.',
            priority: 'high',
            persistent: true,
          });
        }
      }

      // Sync completion notifications
      if (previousStatus && previousStatus.isSyncing && !status.isSyncing) {
        const syncedCount =
          (previousStatus.pendingCount || 0) - (status.pendingCount || 0);

        if (syncedCount > 0) {
          const weddingDayItems = status.weddingDayItems || 0;
          const emergencyItems = status.priorityBreakdown?.emergency || 0;

          let message = `Successfully synced ${syncedCount} item${syncedCount > 1 ? 's' : ''}.`;

          if (weddingDayItems > 0) {
            message += ` ${weddingDayItems} wedding day update${weddingDayItems > 1 ? 's' : ''} processed.`;
          }

          if (emergencyItems > 0) {
            message += ` ${emergencyItems} emergency item${emergencyItems > 1 ? 's' : ''} handled.`;
          }

          addToast({
            type: 'success',
            title: 'Sync Complete',
            message,
            priority:
              emergencyItems > 0
                ? 'high'
                : weddingDayItems > 0
                  ? 'medium'
                  : 'low',
            duration: 4000,
            weddingContext: weddingDayItems > 0 || emergencyItems > 0,
          });
        }
      }

      // Emergency items detected
      if (
        status.priorityBreakdown?.emergency > 0 &&
        (!previousStatus || previousStatus.priorityBreakdown?.emergency === 0)
      ) {
        addToast({
          type: 'error',
          title: 'Emergency Items Detected',
          message: `${status.priorityBreakdown.emergency} emergency item${status.priorityBreakdown.emergency > 1 ? 's' : ''} require${status.priorityBreakdown.emergency === 1 ? 's' : ''} immediate attention.`,
          priority: 'emergency',
          persistent: true,
          action: status.isOnline
            ? {
                label: 'Sync Now',
                onClick: () =>
                  syncManager.forceSync({ expedite: true, priority: 9 }),
              }
            : undefined,
        });
      }

      // Sync failures
      if (
        status.failedCount > 0 &&
        (!previousStatus || status.failedCount > previousStatus.failedCount)
      ) {
        const newFailures =
          status.failedCount - (previousStatus?.failedCount || 0);

        addToast({
          type: 'error',
          title: 'Sync Failures',
          message: `${newFailures} item${newFailures > 1 ? 's' : ''} failed to sync. They will be retried automatically.`,
          priority: 'high',
          action: {
            label: 'Clear Failed',
            onClick: () => syncManager.clearFailedItems(),
          },
        });
      }

      // Wedding day items pending
      if (
        status.weddingDayItems > 0 &&
        !status.isSyncing &&
        (!previousStatus ||
          previousStatus.weddingDayItems !== status.weddingDayItems)
      ) {
        addToast({
          type: 'warning',
          title: 'Wedding Day Updates Pending',
          message: `${status.weddingDayItems} wedding day item${status.weddingDayItems > 1 ? 's' : ''} waiting to sync.`,
          priority: 'high',
          weddingContext: true,
          action: status.isOnline
            ? {
                label: 'Priority Sync',
                onClick: () => syncManager.forceSync({ expedite: true }),
              }
            : undefined,
        });
      }

      setLastStatus(status);
    };

    // Listen for sync status changes
    syncManager.onStatusChange(handleStatusChange);

    // Initial status load
    syncManager.getStatus().then(handleStatusChange);

    return () => {
      syncManager.removeStatusListener(handleStatusChange);
    };
  }, [lastStatus, addToast]);

  // Toast component
  const ToastComponent: React.FC<{ toast: Toast }> = ({ toast }) => {
    const getIcon = () => {
      switch (toast.type) {
        case 'success':
          return <CheckCircle className="w-5 h-5 text-green-500" />;
        case 'error':
          return <AlertCircle className="w-5 h-5 text-red-500" />;
        case 'warning':
          return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
        case 'sync':
          return <RefreshCw className="w-5 h-5 text-blue-500" />;
        default:
          return <AlertCircle className="w-5 h-5 text-blue-500" />;
      }
    };

    const getBorderColor = () => {
      if (toast.priority === 'emergency') return 'border-l-red-600';
      if (toast.priority === 'high') return 'border-l-orange-500';
      if (toast.weddingContext) return 'border-l-purple-500';
      return 'border-l-blue-500';
    };

    const getBackgroundColor = () => {
      if (toast.priority === 'emergency') return 'bg-red-50';
      if (toast.weddingContext) return 'bg-purple-50';
      return 'bg-white';
    };

    return (
      <div
        className={`
        max-w-sm w-full shadow-lg rounded-lg pointer-events-auto border-l-4 ${getBorderColor()} ${getBackgroundColor()}
        transform transition-all duration-300 ease-in-out
      `}
      >
        <div className="p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">{getIcon()}</div>

            <div className="ml-3 w-0 flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 flex items-center gap-2">
                    {toast.title}
                    {toast.priority === 'emergency' && (
                      <Zap className="w-4 h-4 text-red-500" />
                    )}
                    {toast.weddingContext && (
                      <Calendar className="w-4 h-4 text-purple-500" />
                    )}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">{toast.message}</p>

                  {toast.action && (
                    <div className="mt-3">
                      <button
                        onClick={() => {
                          toast.action!.onClick();
                          removeToast(toast.id);
                        }}
                        className={`text-sm font-medium rounded px-3 py-1 transition-colors ${
                          toast.priority === 'emergency'
                            ? 'bg-red-600 text-white hover:bg-red-700'
                            : toast.weddingContext
                              ? 'bg-purple-600 text-white hover:bg-purple-700'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {toast.action.label}
                      </button>
                    </div>
                  )}
                </div>

                <div className="ml-4 flex-shrink-0 flex">
                  <button
                    className="rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none"
                    onClick={() => removeToast(toast.id)}
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const getPositionClasses = () => {
    const base = 'fixed z-50 flex flex-col space-y-4';

    switch (position) {
      case 'top-left':
        return `${base} top-0 left-0 p-6`;
      case 'bottom-right':
        return `${base} bottom-0 right-0 p-6`;
      case 'bottom-left':
        return `${base} bottom-0 left-0 p-6`;
      default: // top-right
        return `${base} top-0 right-0 p-6`;
    }
  };

  return (
    <SyncToastContext.Provider
      value={{ toasts, addToast, removeToast, clearAllToasts }}
    >
      {children}

      {/* Toast Container */}
      <div
        className={getPositionClasses()}
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((toast) => (
          <ToastComponent key={toast.id} toast={toast} />
        ))}
      </div>
    </SyncToastContext.Provider>
  );
};

// Hook for manual toast creation
export const useCreateSyncToast = () => {
  const { addToast } = useSyncToasts();

  return {
    showSyncSuccess: (
      message: string,
      options?: Partial<Pick<Toast, 'title' | 'action' | 'weddingContext'>>,
    ) =>
      addToast({
        type: 'success',
        title: options?.title || 'Sync Complete',
        message,
        priority: 'medium',
        ...options,
      }),

    showSyncError: (
      message: string,
      options?: Partial<Pick<Toast, 'title' | 'action' | 'persistent'>>,
    ) =>
      addToast({
        type: 'error',
        title: options?.title || 'Sync Failed',
        message,
        priority: 'high',
        ...options,
      }),

    showOfflineNotice: (message: string) =>
      addToast({
        type: 'warning',
        title: 'Working Offline',
        message,
        priority: 'medium',
        persistent: true,
      }),

    showEmergencyAlert: (message: string, action?: Toast['action']) =>
      addToast({
        type: 'error',
        title: 'Emergency Alert',
        message,
        priority: 'emergency',
        persistent: true,
        action,
      }),

    showWeddingDayUpdate: (message: string, action?: Toast['action']) =>
      addToast({
        type: 'info',
        title: 'Wedding Day Update',
        message,
        priority: 'high',
        weddingContext: true,
        action,
      }),
  };
};

export default SyncToastProvider;
