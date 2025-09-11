/**
 * Enhanced Error Handling for Offline/Online Transitions
 * WS-172 Round 3: Comprehensive error recovery and resilience
 */

import { offlineDB } from './offline-database';
import { syncManager } from './sync-manager';

export interface OfflineError {
  id: string;
  type:
    | 'network'
    | 'sync'
    | 'storage'
    | 'validation'
    | 'auth'
    | 'quota'
    | 'corruption';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details: any;
  timestamp: string;
  context?: {
    operation?: string;
    itemId?: string;
    weddingContext?: {
      weddingId: string;
      weddingDate: string;
      isWeddingDay: boolean;
    };
  };
  recovery?: {
    strategy: 'retry' | 'fallback' | 'manual' | 'ignore';
    attempts: number;
    maxAttempts: number;
    nextAttempt?: string;
  };
  resolved: boolean;
}

export interface ErrorRecoveryStrategy {
  canRecover: (error: OfflineError) => boolean;
  recover: (error: OfflineError) => Promise<boolean>;
  fallback?: (error: OfflineError) => Promise<void>;
}

export class OfflineErrorHandler {
  private errorLog: OfflineError[] = [];
  private recoveryStrategies: Map<string, ErrorRecoveryStrategy> = new Map();
  private retryTimers: Map<string, NodeJS.Timeout> = new Map();
  private listeners: Array<(error: OfflineError) => void> = [];

  constructor() {
    this.initializeRecoveryStrategies();
    this.setupGlobalErrorHandling();
  }

  // Initialize built-in recovery strategies
  private initializeRecoveryStrategies(): void {
    // Network error recovery
    this.addRecoveryStrategy('network', {
      canRecover: (error) => error.type === 'network' && navigator.onLine,
      recover: async (error) => {
        try {
          // Test network connectivity
          await fetch('/api/ping', { method: 'HEAD' });

          // If network is back, retry failed operation
          if (error.context?.operation === 'sync') {
            await syncManager.forceSync();
          }

          return true;
        } catch {
          return false;
        }
      },
    });

    // Storage quota error recovery
    this.addRecoveryStrategy('quota', {
      canRecover: (error) => error.type === 'quota',
      recover: async (error) => {
        try {
          // Clear old cached data
          await this.clearOldCacheData();

          // Clean up completed sync items
          await this.cleanupSyncHistory();

          // Try the original operation again
          return await this.retryOriginalOperation(error);
        } catch {
          return false;
        }
      },
      fallback: async (error) => {
        // Notify user about storage issues
        this.notifyUser({
          type: 'storage',
          message: 'Storage space is limited. Some features may be affected.',
          action: 'cleanup',
        });
      },
    });

    // Data corruption recovery
    this.addRecoveryStrategy('corruption', {
      canRecover: (error) => error.type === 'corruption',
      recover: async (error) => {
        try {
          // Attempt to recover corrupted data
          if (error.context?.itemId) {
            await this.recoverCorruptedData(error.context.itemId);
            return true;
          }

          // If unable to recover specific data, clear and resync
          await this.clearCorruptedData(error.details.table);
          await syncManager.forceSync();
          return true;
        } catch {
          return false;
        }
      },
    });

    // Authentication error recovery
    this.addRecoveryStrategy('auth', {
      canRecover: (error) => error.type === 'auth',
      recover: async (error) => {
        try {
          // Attempt token refresh
          const newToken = await this.refreshAuthToken();
          if (newToken) {
            // Update stored token
            localStorage.setItem('auth_token', newToken);
            return true;
          }
          return false;
        } catch {
          return false;
        }
      },
      fallback: async (error) => {
        // Redirect to login with context preservation
        this.preserveContextForReauth(error.context);
        window.location.href = '/auth/login?reason=session_expired';
      },
    });

    // Sync conflict recovery
    this.addRecoveryStrategy('sync_conflict', {
      canRecover: (error) => error.details?.conflict === true,
      recover: async (error) => {
        try {
          // Implement intelligent conflict resolution
          const resolved = await this.resolveDataConflict(error.details);
          return resolved;
        } catch {
          return false;
        }
      },
    });

    // Wedding day priority error recovery
    this.addRecoveryStrategy('wedding_day', {
      canRecover: (error) =>
        error.context?.weddingContext?.isWeddingDay === true,
      recover: async (error) => {
        try {
          // Prioritize wedding day operations
          await this.prioritizeWeddingDayRecovery(error);
          return true;
        } catch {
          return false;
        }
      },
      fallback: async (error) => {
        // Create emergency backup for wedding day data
        await this.createEmergencyBackup(
          error.context?.weddingContext?.weddingId,
        );

        // Notify wedding coordinator
        this.notifyUser({
          type: 'emergency',
          message: 'Wedding day data issue detected. Emergency backup created.',
          priority: 'critical',
        });
      },
    });
  }

  // Add custom recovery strategy
  addRecoveryStrategy(name: string, strategy: ErrorRecoveryStrategy): void {
    this.recoveryStrategies.set(name, strategy);
  }

  // Handle errors with automatic recovery attempts
  async handleError(error: Partial<OfflineError>): Promise<string> {
    const errorId = `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const fullError: OfflineError = {
      id: errorId,
      type: error.type || 'network',
      severity: error.severity || 'medium',
      message: error.message || 'Unknown error occurred',
      details: error.details || {},
      timestamp: new Date().toISOString(),
      context: error.context,
      recovery: {
        strategy: 'retry',
        attempts: 0,
        maxAttempts: this.getMaxAttempts(error.severity || 'medium'),
        nextAttempt: undefined,
      },
      resolved: false,
    };

    // Add to error log
    this.errorLog.push(fullError);

    // Store in IndexedDB for persistence
    await this.persistError(fullError);

    // Notify listeners
    this.notifyListeners(fullError);

    // Attempt automatic recovery
    this.attemptRecovery(fullError);

    return errorId;
  }

  // Attempt to recover from error
  private async attemptRecovery(error: OfflineError): Promise<void> {
    try {
      // Try each applicable recovery strategy
      for (const [name, strategy] of this.recoveryStrategies) {
        if (strategy.canRecover(error)) {
          console.log(
            `Attempting recovery strategy: ${name} for error ${error.id}`,
          );

          const recovered = await strategy.recover(error);

          if (recovered) {
            // Mark error as resolved
            await this.resolveError(error.id);
            console.log(`Recovery successful with strategy: ${name}`);
            return;
          }
        }
      }

      // If no strategy worked, schedule retry or use fallback
      await this.scheduleRetryOrFallback(error);
    } catch (recoveryError) {
      console.error('Error during recovery attempt:', recoveryError);

      // Escalate error severity
      await this.escalateError(error.id);
    }
  }

  // Schedule retry or execute fallback
  private async scheduleRetryOrFallback(error: OfflineError): Promise<void> {
    if (!error.recovery) return;

    error.recovery.attempts++;

    if (error.recovery.attempts < error.recovery.maxAttempts) {
      // Schedule retry with exponential backoff
      const delay = Math.pow(2, error.recovery.attempts) * 1000; // 2s, 4s, 8s, etc.
      const nextAttempt = new Date(Date.now() + delay).toISOString();

      error.recovery.nextAttempt = nextAttempt;
      await this.updateError(error);

      // Set retry timer
      const timer = setTimeout(() => {
        this.attemptRecovery(error);
        this.retryTimers.delete(error.id);
      }, delay);

      this.retryTimers.set(error.id, timer);

      console.log(
        `Scheduled retry ${error.recovery.attempts}/${error.recovery.maxAttempts} for error ${error.id} in ${delay}ms`,
      );
    } else {
      // Max attempts reached, try fallback strategies
      await this.executeFallbackStrategies(error);
    }
  }

  // Execute fallback strategies when recovery fails
  private async executeFallbackStrategies(error: OfflineError): Promise<void> {
    try {
      // Try fallback strategies
      for (const [name, strategy] of this.recoveryStrategies) {
        if (strategy.canRecover(error) && strategy.fallback) {
          console.log(
            `Executing fallback strategy: ${name} for error ${error.id}`,
          );
          await strategy.fallback(error);
        }
      }

      // Mark as requiring manual intervention
      error.recovery!.strategy = 'manual';
      await this.updateError(error);

      // Create user notification for manual intervention
      this.notifyUser({
        type: 'manual_intervention',
        message: `Unable to automatically recover from ${error.type} error. Manual intervention required.`,
        priority: error.severity === 'critical' ? 'emergency' : 'high',
        errorId: error.id,
      });
    } catch (fallbackError) {
      console.error('Fallback strategy failed:', fallbackError);
      await this.escalateError(error.id, 'critical');
    }
  }

  // Resolve error
  async resolveError(errorId: string): Promise<void> {
    const error = this.errorLog.find((e) => e.id === errorId);
    if (error) {
      error.resolved = true;
      await this.updateError(error);

      // Clear any pending retry timer
      const timer = this.retryTimers.get(errorId);
      if (timer) {
        clearTimeout(timer);
        this.retryTimers.delete(errorId);
      }

      // Notify listeners
      this.notifyListeners(error);

      console.log(`Error ${errorId} resolved successfully`);
    }
  }

  // Escalate error severity
  async escalateError(
    errorId: string,
    newSeverity?: OfflineError['severity'],
  ): Promise<void> {
    const error = this.errorLog.find((e) => e.id === errorId);
    if (error) {
      const oldSeverity = error.severity;
      error.severity = newSeverity || this.getNextSeverityLevel(error.severity);

      // Increase max attempts for escalated errors
      if (error.recovery) {
        error.recovery.maxAttempts = this.getMaxAttempts(error.severity);
      }

      await this.updateError(error);

      console.log(
        `Error ${errorId} escalated from ${oldSeverity} to ${error.severity}`,
      );

      // Create escalation notification
      if (error.severity === 'critical') {
        this.notifyUser({
          type: 'critical_error',
          message: `Critical error detected: ${error.message}`,
          priority: 'emergency',
          errorId: errorId,
        });
      }
    }
  }

  // Get error statistics
  getErrorStats(): {
    total: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    resolved: number;
    pending: number;
  } {
    const stats = {
      total: this.errorLog.length,
      byType: {} as Record<string, number>,
      bySeverity: {} as Record<string, number>,
      resolved: 0,
      pending: 0,
    };

    this.errorLog.forEach((error) => {
      // Count by type
      stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;

      // Count by severity
      stats.bySeverity[error.severity] =
        (stats.bySeverity[error.severity] || 0) + 1;

      // Count resolved vs pending
      if (error.resolved) {
        stats.resolved++;
      } else {
        stats.pending++;
      }
    });

    return stats;
  }

  // Get recent errors
  getRecentErrors(limit: number = 10): OfflineError[] {
    return this.errorLog
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      )
      .slice(0, limit);
  }

  // Clear resolved errors
  async clearResolvedErrors(): Promise<void> {
    const resolvedErrorIds = this.errorLog
      .filter((error) => error.resolved)
      .map((error) => error.id);

    // Remove from memory
    this.errorLog = this.errorLog.filter((error) => !error.resolved);

    // Remove from storage
    await this.removePersistedErrors(resolvedErrorIds);

    console.log(`Cleared ${resolvedErrorIds.length} resolved errors`);
  }

  // Add error listener
  onError(listener: (error: OfflineError) => void): void {
    this.listeners.push(listener);
  }

  // Remove error listener
  removeErrorListener(listener: (error: OfflineError) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  // Private helper methods
  private getMaxAttempts(severity: OfflineError['severity']): number {
    switch (severity) {
      case 'critical':
        return 10;
      case 'high':
        return 7;
      case 'medium':
        return 5;
      default:
        return 3;
    }
  }

  private getNextSeverityLevel(
    current: OfflineError['severity'],
  ): OfflineError['severity'] {
    switch (current) {
      case 'low':
        return 'medium';
      case 'medium':
        return 'high';
      case 'high':
        return 'critical';
      default:
        return 'critical';
    }
  }

  private async persistError(error: OfflineError): Promise<void> {
    try {
      await offlineDB.errorLog.put(error);
    } catch (persistError) {
      console.error('Failed to persist error:', persistError);
    }
  }

  private async updateError(error: OfflineError): Promise<void> {
    try {
      await offlineDB.errorLog.put(error);

      // Update in memory
      const index = this.errorLog.findIndex((e) => e.id === error.id);
      if (index > -1) {
        this.errorLog[index] = error;
      }
    } catch (updateError) {
      console.error('Failed to update error:', updateError);
    }
  }

  private async removePersistedErrors(errorIds: string[]): Promise<void> {
    try {
      await offlineDB.errorLog.where('id').anyOf(errorIds).delete();
    } catch (removeError) {
      console.error('Failed to remove persisted errors:', removeError);
    }
  }

  private notifyListeners(error: OfflineError): void {
    this.listeners.forEach((listener) => {
      try {
        listener(error);
      } catch (listenerError) {
        console.error('Error in error listener:', listenerError);
      }
    });
  }

  // Utility methods for specific recovery operations
  private async clearOldCacheData(): Promise<void> {
    const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

    try {
      await offlineDB.formDrafts
        .where('autoSaveTime')
        .below(cutoffDate.toISOString())
        .delete();

      await offlineDB.syncQueue
        .where('timestamp')
        .below(cutoffDate.toISOString())
        .and((item) => item.status === 'completed')
        .delete();

      console.log('Old cache data cleared successfully');
    } catch (error) {
      console.error('Failed to clear old cache data:', error);
      throw error;
    }
  }

  private async cleanupSyncHistory(): Promise<void> {
    try {
      // Keep only last 100 completed sync items
      const completedItems = await offlineDB.syncQueue
        .where('status')
        .equals('completed')
        .reverse()
        .sortBy('timestamp');

      if (completedItems.length > 100) {
        const itemsToDelete = completedItems.slice(100);
        const idsToDelete = itemsToDelete
          .map((item) => item.id!)
          .filter(Boolean);

        await offlineDB.syncQueue.bulkDelete(idsToDelete);
        console.log(`Cleaned up ${idsToDelete.length} old sync items`);
      }
    } catch (error) {
      console.error('Failed to cleanup sync history:', error);
      throw error;
    }
  }

  private async retryOriginalOperation(error: OfflineError): Promise<boolean> {
    try {
      if (error.context?.operation === 'sync') {
        await syncManager.forceSync();
        return true;
      }

      // Add more operation types as needed
      return false;
    } catch {
      return false;
    }
  }

  private async recoverCorruptedData(itemId: string): Promise<void> {
    try {
      // Attempt to recover from backup or re-fetch from server
      console.log(`Attempting to recover corrupted data for item: ${itemId}`);

      // Implementation would depend on specific data recovery strategy
      // For now, just remove the corrupted item
      await offlineDB.transaction(
        'rw',
        [offlineDB.formDrafts, offlineDB.syncQueue],
        async () => {
          await offlineDB.formDrafts.where('id').equals(itemId).delete();
          await offlineDB.syncQueue.where('data.id').equals(itemId).delete();
        },
      );

      console.log(`Corrupted data removed for item: ${itemId}`);
    } catch (error) {
      console.error('Failed to recover corrupted data:', error);
      throw error;
    }
  }

  private async clearCorruptedData(tableName: string): Promise<void> {
    try {
      switch (tableName) {
        case 'formDrafts':
          await offlineDB.formDrafts.clear();
          break;
        case 'syncQueue':
          await offlineDB.syncQueue.clear();
          break;
        default:
          console.warn(`Unknown table for corruption cleanup: ${tableName}`);
      }

      console.log(`Cleared corrupted data from table: ${tableName}`);
    } catch (error) {
      console.error('Failed to clear corrupted data:', error);
      throw error;
    }
  }

  private async refreshAuthToken(): Promise<string | null> {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) return null;

      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.accessToken;
      }

      return null;
    } catch {
      return null;
    }
  }

  private preserveContextForReauth(context: any): void {
    if (context) {
      localStorage.setItem('preserved_context', JSON.stringify(context));
    }
  }

  private async resolveDataConflict(conflictDetails: any): Promise<boolean> {
    try {
      // Implement conflict resolution logic based on wedding context
      console.log('Resolving data conflict:', conflictDetails);

      // For wedding day operations, prefer local data
      if (conflictDetails.weddingContext?.isWeddingDay) {
        return true; // Local data wins
      }

      // For other cases, might need user intervention
      return false;
    } catch {
      return false;
    }
  }

  private async prioritizeWeddingDayRecovery(
    error: OfflineError,
  ): Promise<void> {
    try {
      // Move wedding day related items to high priority
      if (error.context?.weddingContext?.weddingId) {
        await offlineDB.syncQueue
          .where('data.weddingId')
          .equals(error.context.weddingContext.weddingId)
          .modify({ priority: 9 });

        console.log('Prioritized wedding day sync items for recovery');
      }
    } catch (priorityError) {
      console.error(
        'Failed to prioritize wedding day recovery:',
        priorityError,
      );
      throw priorityError;
    }
  }

  private async createEmergencyBackup(weddingId?: string): Promise<void> {
    try {
      if (!weddingId) return;

      // Create emergency backup of wedding data
      const backupData = {
        weddingId,
        timestamp: new Date().toISOString(),
        formDrafts: await offlineDB.formDrafts
          .where('data.weddingId')
          .equals(weddingId)
          .toArray(),
        syncQueue: await offlineDB.syncQueue
          .where('data.weddingId')
          .equals(weddingId)
          .toArray(),
      };

      // Store in emergency backup location
      localStorage.setItem(
        `emergency_backup_${weddingId}`,
        JSON.stringify(backupData),
      );

      console.log(`Emergency backup created for wedding: ${weddingId}`);
    } catch (backupError) {
      console.error('Failed to create emergency backup:', backupError);
    }
  }

  private notifyUser(notification: {
    type: string;
    message: string;
    priority?: string;
    errorId?: string;
    action?: string;
  }): void {
    // This would integrate with the toast notification system
    console.log('User notification:', notification);

    // Emit custom event for UI components to handle
    window.dispatchEvent(
      new CustomEvent('offline-error-notification', {
        detail: notification,
      }),
    );
  }

  private setupGlobalErrorHandling(): void {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError({
        type: 'network',
        severity: 'high',
        message: 'Unhandled promise rejection',
        details: { error: event.reason },
      });
    });

    // Handle general errors
    window.addEventListener('error', (event) => {
      this.handleError({
        type: 'network',
        severity: 'medium',
        message: event.message || 'JavaScript error',
        details: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          error: event.error,
        },
      });
    });

    // Handle network status changes
    window.addEventListener('online', () => {
      console.log('Network connection restored');
      // Attempt to recover network-related errors
      this.errorLog
        .filter((error) => error.type === 'network' && !error.resolved)
        .forEach((error) => this.attemptRecovery(error));
    });

    window.addEventListener('offline', () => {
      console.log('Network connection lost');
      this.handleError({
        type: 'network',
        severity: 'high',
        message: 'Network connection lost',
        details: { timestamp: new Date().toISOString() },
      });
    });
  }

  // Cleanup method
  cleanup(): void {
    // Clear all retry timers
    this.retryTimers.forEach((timer) => clearTimeout(timer));
    this.retryTimers.clear();

    // Clear listeners
    this.listeners = [];

    console.log('OfflineErrorHandler cleanup completed');
  }
}

// Export singleton instance
export const offlineErrorHandler = new OfflineErrorHandler();

// Export error types for use in other modules
export const ErrorTypes = {
  NETWORK: 'network' as const,
  SYNC: 'sync' as const,
  STORAGE: 'storage' as const,
  VALIDATION: 'validation' as const,
  AUTH: 'auth' as const,
  QUOTA: 'quota' as const,
  CORRUPTION: 'corruption' as const,
};

export const ErrorSeverity = {
  LOW: 'low' as const,
  MEDIUM: 'medium' as const,
  HIGH: 'high' as const,
  CRITICAL: 'critical' as const,
};
