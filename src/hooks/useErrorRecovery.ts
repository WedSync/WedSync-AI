/**
 * React Hook for Error Recovery and Connection Monitoring
 * WS-172 Round 3: Comprehensive error handling integration
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  offlineErrorHandler,
  OfflineError,
} from '@/lib/offline/offline-error-handler';
import {
  connectionMonitor,
  ConnectionState,
  ConnectionEvent,
} from '@/lib/offline/connection-monitor';
import { syncManager } from '@/lib/offline/sync-manager';

export interface ErrorRecoveryState {
  // Error tracking
  errors: OfflineError[];
  activeErrorCount: number;
  criticalErrorCount: number;
  lastError: OfflineError | null;

  // Connection state
  connectionState: ConnectionState | null;
  isOnline: boolean;
  connectionQuality: ConnectionState['quality'];
  isStableConnection: boolean;

  // Recovery status
  isRecovering: boolean;
  recoveryProgress: number;
  lastRecoveryAttempt: Date | null;

  // Statistics
  errorStats: {
    total: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    resolved: number;
    pending: number;
  };
}

export interface ErrorRecoveryActions {
  // Error management
  resolveError: (errorId: string) => Promise<void>;
  retryError: (errorId: string) => Promise<void>;
  clearResolvedErrors: () => Promise<void>;

  // Connection management
  testConnection: () => Promise<boolean>;
  forceReconnection: () => Promise<void>;

  // Recovery operations
  startRecovery: () => Promise<void>;
  cancelRecovery: () => void;

  // Manual interventions
  reportIssue: (description: string) => void;
  requestHelp: () => void;
}

export interface UseErrorRecoveryOptions {
  // Monitoring options
  autoRecovery?: boolean;
  monitorConnection?: boolean;
  trackErrorHistory?: boolean;

  // Recovery configuration
  maxAutoRetries?: number;
  recoveryTimeout?: number;
  aggressiveRecovery?: boolean;

  // Wedding-specific options
  weddingContext?: {
    weddingId: string;
    weddingDate: string;
    isWeddingDay: boolean;
  };

  // Callbacks
  onError?: (error: OfflineError) => void;
  onRecovery?: (errorId: string) => void;
  onConnectionChange?: (state: ConnectionState) => void;
  onCriticalError?: (error: OfflineError) => void;
}

export const useErrorRecovery = (
  options: UseErrorRecoveryOptions = {},
): [ErrorRecoveryState, ErrorRecoveryActions] => {
  const {
    autoRecovery = true,
    monitorConnection = true,
    trackErrorHistory = true,
    maxAutoRetries = 3,
    recoveryTimeout = 30000,
    aggressiveRecovery = false,
    weddingContext,
    onError,
    onRecovery,
    onConnectionChange,
    onCriticalError,
  } = options;

  // State management
  const [state, setState] = useState<ErrorRecoveryState>({
    errors: [],
    activeErrorCount: 0,
    criticalErrorCount: 0,
    lastError: null,
    connectionState: null,
    isOnline: false,
    connectionQuality: 'unknown',
    isStableConnection: false,
    isRecovering: false,
    recoveryProgress: 0,
    lastRecoveryAttempt: null,
    errorStats: {
      total: 0,
      byType: {},
      bySeverity: {},
      resolved: 0,
      pending: 0,
    },
  });

  // Refs for cleanup
  const recoveryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef<Map<string, number>>(new Map());

  // Update state helper
  const updateState = useCallback((updates: Partial<ErrorRecoveryState>) => {
    setState((prevState) => ({ ...prevState, ...updates }));
  }, []);

  // Error handler
  const handleNewError = useCallback(
    (error: OfflineError) => {
      setState((prevState) => {
        const updatedErrors = trackErrorHistory
          ? [...prevState.errors.filter((e) => e.id !== error.id), error]
          : [error];

        const activeErrors = updatedErrors.filter((e) => !e.resolved);
        const criticalErrors = activeErrors.filter(
          (e) => e.severity === 'critical',
        );

        return {
          ...prevState,
          errors: updatedErrors,
          activeErrorCount: activeErrors.length,
          criticalErrorCount: criticalErrors.length,
          lastError: error,
          errorStats: offlineErrorHandler.getErrorStats(),
        };
      });

      // Call error callback
      if (onError) {
        onError(error);
      }

      // Call critical error callback for critical errors
      if (error.severity === 'critical' && onCriticalError) {
        onCriticalError(error);
      }

      // Auto-recovery for certain error types
      if (autoRecovery && shouldAttemptAutoRecovery(error)) {
        setTimeout(() => {
          retryError(error.id);
        }, getRetryDelay(error.severity));
      }
    },
    [trackErrorHistory, onError, onCriticalError, autoRecovery],
  );

  // Connection change handler
  const handleConnectionChange = useCallback(
    (event: ConnectionEvent) => {
      const { currentState } = event;

      updateState({
        connectionState: currentState,
        isOnline: currentState.isOnline,
        connectionQuality: currentState.quality,
        isStableConnection: connectionMonitor.isConnectionStable(),
      });

      // Call connection change callback
      if (onConnectionChange) {
        onConnectionChange(currentState);
      }

      // Handle connection recovery
      if (event.type === 'online') {
        handleConnectionRecovery();
      }
    },
    [onConnectionChange],
  );

  // Connection recovery
  const handleConnectionRecovery = useCallback(async () => {
    if (!autoRecovery) return;

    try {
      updateState({ isRecovering: true, recoveryProgress: 0 });

      // Wait a moment for connection to stabilize
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Test connection quality
      const connectionState = connectionMonitor.getCurrentState();
      if (!connectionState?.isOnline) return;

      updateState({ recoveryProgress: 25 });

      // Retry network-related errors
      const networkErrors = state.errors.filter(
        (error) => !error.resolved && error.type === 'network',
      );

      for (let i = 0; i < networkErrors.length; i++) {
        const error = networkErrors[i];

        try {
          await offlineErrorHandler.resolveError(error.id);
          updateState({
            recoveryProgress: 25 + (50 * (i + 1)) / networkErrors.length,
          });
        } catch (retryError) {
          console.error(`Failed to recover error ${error.id}:`, retryError);
        }
      }

      // Force sync to clear pending items
      await syncManager.forceSync();
      updateState({ recoveryProgress: 90 });

      // Final state update
      updateState({
        recoveryProgress: 100,
        lastRecoveryAttempt: new Date(),
      });

      // Reset recovery state after a moment
      setTimeout(() => {
        updateState({ isRecovering: false, recoveryProgress: 0 });
      }, 2000);
    } catch (recoveryError) {
      console.error('Connection recovery failed:', recoveryError);
      updateState({
        isRecovering: false,
        recoveryProgress: 0,
        lastRecoveryAttempt: new Date(),
      });
    }
  }, [autoRecovery, state.errors]);

  // Initialize monitoring
  useEffect(() => {
    // Error monitoring
    offlineErrorHandler.onError(handleNewError);

    // Connection monitoring
    if (monitorConnection) {
      connectionMonitor.addEventListener(handleConnectionChange);

      // Get initial connection state
      const initialState = connectionMonitor.getCurrentState();
      if (initialState) {
        updateState({
          connectionState: initialState,
          isOnline: initialState.isOnline,
          connectionQuality: initialState.quality,
          isStableConnection: connectionMonitor.isConnectionStable(),
        });
      }
    }

    // Initial error stats
    updateState({
      errorStats: offlineErrorHandler.getErrorStats(),
    });

    return () => {
      offlineErrorHandler.removeErrorListener(handleNewError);
      if (monitorConnection) {
        connectionMonitor.removeEventListener(handleConnectionChange);
      }

      // Cleanup timeouts
      if (recoveryTimeoutRef.current) {
        clearTimeout(recoveryTimeoutRef.current);
      }
    };
  }, [handleNewError, handleConnectionChange, monitorConnection]);

  // Actions implementation
  const resolveError = useCallback(
    async (errorId: string): Promise<void> => {
      try {
        await offlineErrorHandler.resolveError(errorId);

        setState((prevState) => ({
          ...prevState,
          errors: prevState.errors.map((e) =>
            e.id === errorId ? { ...e, resolved: true } : e,
          ),
          errorStats: offlineErrorHandler.getErrorStats(),
        }));

        if (onRecovery) {
          onRecovery(errorId);
        }
      } catch (error) {
        console.error('Failed to resolve error:', error);
        throw error;
      }
    },
    [onRecovery],
  );

  const retryError = useCallback(
    async (errorId: string): Promise<void> => {
      const error = state.errors.find((e) => e.id === errorId);
      if (!error || error.resolved) return;

      const currentRetries = retryCountRef.current.get(errorId) || 0;

      if (currentRetries >= maxAutoRetries) {
        console.log(`Max retries exceeded for error ${errorId}`);
        return;
      }

      try {
        retryCountRef.current.set(errorId, currentRetries + 1);

        // Attempt to resolve the error through recovery mechanisms
        await offlineErrorHandler.handleError({
          ...error,
          recovery: {
            ...error.recovery,
            attempts: currentRetries + 1,
            strategy: 'retry',
          },
        });
      } catch (retryError) {
        console.error(`Retry failed for error ${errorId}:`, retryError);
      }
    },
    [state.errors, maxAutoRetries],
  );

  const clearResolvedErrors = useCallback(async (): Promise<void> => {
    try {
      await offlineErrorHandler.clearResolvedErrors();

      setState((prevState) => ({
        ...prevState,
        errors: prevState.errors.filter((e) => !e.resolved),
        errorStats: offlineErrorHandler.getErrorStats(),
      }));
    } catch (error) {
      console.error('Failed to clear resolved errors:', error);
      throw error;
    }
  }, []);

  const testConnection = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/health', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }, []);

  const forceReconnection = useCallback(async (): Promise<void> => {
    try {
      // Force a connection state check
      await connectionMonitor['checkStateChange']();

      // If still online, force sync
      const currentState = connectionMonitor.getCurrentState();
      if (currentState?.isOnline) {
        await syncManager.forceSync({ expedite: true });
      }
    } catch (error) {
      console.error('Force reconnection failed:', error);
      throw error;
    }
  }, []);

  const startRecovery = useCallback(async (): Promise<void> => {
    if (state.isRecovering) return;

    try {
      updateState({
        isRecovering: true,
        recoveryProgress: 0,
        lastRecoveryAttempt: new Date(),
      });

      // Set recovery timeout
      recoveryTimeoutRef.current = setTimeout(() => {
        updateState({
          isRecovering: false,
          recoveryProgress: 0,
        });
      }, recoveryTimeout);

      // Attempt to recover all active errors
      const activeErrors = state.errors.filter((e) => !e.resolved);

      for (let i = 0; i < activeErrors.length; i++) {
        const error = activeErrors[i];

        try {
          await retryError(error.id);
          updateState({
            recoveryProgress: Math.round(((i + 1) / activeErrors.length) * 80),
          });
        } catch (recoveryError) {
          console.error(
            `Recovery failed for error ${error.id}:`,
            recoveryError,
          );
        }
      }

      // Final sync attempt
      if (state.isOnline) {
        await syncManager.forceSync({ expedite: aggressiveRecovery });
      }

      updateState({ recoveryProgress: 100 });

      // Complete recovery
      setTimeout(() => {
        updateState({
          isRecovering: false,
          recoveryProgress: 0,
        });
      }, 1000);
    } catch (error) {
      console.error('Recovery process failed:', error);
      updateState({
        isRecovering: false,
        recoveryProgress: 0,
      });
      throw error;
    }
  }, [
    state.isRecovering,
    state.errors,
    state.isOnline,
    recoveryTimeout,
    aggressiveRecovery,
    retryError,
  ]);

  const cancelRecovery = useCallback((): void => {
    if (recoveryTimeoutRef.current) {
      clearTimeout(recoveryTimeoutRef.current);
      recoveryTimeoutRef.current = null;
    }

    updateState({
      isRecovering: false,
      recoveryProgress: 0,
    });
  }, []);

  const reportIssue = useCallback(
    (description: string): void => {
      // Create a manual intervention error
      offlineErrorHandler.handleError({
        type: 'validation',
        severity: 'medium',
        message: 'User reported issue',
        details: {
          userDescription: description,
          timestamp: new Date().toISOString(),
          context: weddingContext,
        },
        context: {
          operation: 'user_report',
          weddingContext,
        },
      });
    },
    [weddingContext],
  );

  const requestHelp = useCallback((): void => {
    // Create help request
    const criticalErrors = state.errors.filter(
      (e) => e.severity === 'critical' && !e.resolved,
    );

    offlineErrorHandler.handleError({
      type: 'validation',
      severity: 'high',
      message: 'User requested help',
      details: {
        criticalErrorCount: criticalErrors.length,
        connectionQuality: state.connectionQuality,
        weddingContext,
        timestamp: new Date().toISOString(),
      },
      context: {
        operation: 'help_request',
        weddingContext,
      },
    });
  }, [state.errors, state.connectionQuality, weddingContext]);

  // Helper functions
  const shouldAttemptAutoRecovery = (error: OfflineError): boolean => {
    if (!autoRecovery) return false;

    // Don't auto-retry if already at max attempts
    const currentRetries = retryCountRef.current.get(error.id) || 0;
    if (currentRetries >= maxAutoRetries) return false;

    // Auto-retry network errors when connection is available
    if (error.type === 'network' && state.isOnline) return true;

    // Auto-retry storage errors with low attempts
    if (error.type === 'storage' && currentRetries < 2) return true;

    // Auto-retry wedding day errors more aggressively
    if (weddingContext?.isWeddingDay && error.severity !== 'low') return true;

    return false;
  };

  const getRetryDelay = (severity: OfflineError['severity']): number => {
    switch (severity) {
      case 'critical':
        return 1000; // 1 second
      case 'high':
        return 3000; // 3 seconds
      case 'medium':
        return 5000; // 5 seconds
      default:
        return 10000; // 10 seconds
    }
  };

  return [
    state,
    {
      resolveError,
      retryError,
      clearResolvedErrors,
      testConnection,
      forceReconnection,
      startRecovery,
      cancelRecovery,
      reportIssue,
      requestHelp,
    },
  ];
};

export default useErrorRecovery;
