'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  wedMeIntegration,
  WedMeDevice,
  WedMeSyncItem,
} from '@/lib/integrations/WedMeIntegration';

export interface WedMeSyncStatus {
  isAuthenticated: boolean;
  isConnected: boolean;
  syncInProgress: boolean;
  queueSize: number;
  conflictCount: number;
  lastSync: Date | null;
  connectedDevices: WedMeDevice[];
  error: string | null;
}

export interface UseWedMeOfflineSyncReturn {
  status: WedMeSyncStatus;
  authenticate: (credentials: {
    username: string;
    password: string;
  }) => Promise<boolean>;
  syncWithWedMe: (weddingId: string, data: any) => Promise<void>;
  syncPortfolio: (portfolioData: any) => Promise<void>;
  sendOfflineMessage: (recipientId: string, message: any) => Promise<void>;
  generateDeepLink: (action: string, params: Record<string, any>) => string;
  retryFailedSyncs: () => Promise<void>;
  clearErrors: () => void;
}

export const useWedMeOfflineSync = (): UseWedMeOfflineSyncReturn => {
  const [status, setStatus] = useState<WedMeSyncStatus>({
    isAuthenticated: false,
    isConnected: false,
    syncInProgress: false,
    queueSize: 0,
    conflictCount: 0,
    lastSync: null,
    connectedDevices: [],
    error: null,
  });

  // Initialize and update status
  const updateStatus = useCallback(() => {
    setStatus((prev) => ({
      ...prev,
      isAuthenticated: wedMeIntegration.isAuthenticated(),
      queueSize: wedMeIntegration.getSyncQueueSize(),
      conflictCount: wedMeIntegration.getConflictCount(),
      connectedDevices: wedMeIntegration.getConnectedDevices(),
      isConnected: wedMeIntegration.getConnectedDevices().length > 0,
    }));
  }, []);

  // Authentication
  const authenticate = useCallback(
    async (credentials: {
      username: string;
      password: string;
    }): Promise<boolean> => {
      try {
        setStatus((prev) => ({ ...prev, error: null }));
        await wedMeIntegration.authenticate(credentials);
        updateStatus();
        return true;
      } catch (error) {
        setStatus((prev) => ({
          ...prev,
          error:
            error instanceof Error ? error.message : 'Authentication failed',
        }));
        return false;
      }
    },
    [updateStatus],
  );

  // Sync functions
  const syncWithWedMe = useCallback(
    async (weddingId: string, data: any): Promise<void> => {
      try {
        setStatus((prev) => ({ ...prev, syncInProgress: true, error: null }));
        await wedMeIntegration.syncWithWedMe(weddingId, data);
        setStatus((prev) => ({ ...prev, lastSync: new Date() }));
      } catch (error) {
        setStatus((prev) => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Sync failed',
        }));
        throw error;
      } finally {
        setStatus((prev) => ({ ...prev, syncInProgress: false }));
        updateStatus();
      }
    },
    [updateStatus],
  );

  const syncPortfolio = useCallback(
    async (portfolioData: any): Promise<void> => {
      try {
        setStatus((prev) => ({ ...prev, syncInProgress: true, error: null }));
        await wedMeIntegration.syncPortfolio(portfolioData);
        setStatus((prev) => ({ ...prev, lastSync: new Date() }));
      } catch (error) {
        setStatus((prev) => ({
          ...prev,
          error:
            error instanceof Error ? error.message : 'Portfolio sync failed',
        }));
        throw error;
      } finally {
        setStatus((prev) => ({ ...prev, syncInProgress: false }));
        updateStatus();
      }
    },
    [updateStatus],
  );

  const sendOfflineMessage = useCallback(
    async (recipientId: string, message: any): Promise<void> => {
      try {
        await wedMeIntegration.sendOfflineMessage(recipientId, message);
        updateStatus();
      } catch (error) {
        setStatus((prev) => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Message send failed',
        }));
        throw error;
      }
    },
    [updateStatus],
  );

  const generateDeepLink = useCallback(
    (action: string, params: Record<string, any>): string => {
      return wedMeIntegration.generateDeepLink(action, params);
    },
    [],
  );

  const retryFailedSyncs = useCallback(async (): Promise<void> => {
    try {
      setStatus((prev) => ({ ...prev, syncInProgress: true, error: null }));

      // Retry offline message sync
      await wedMeIntegration.syncOfflineMessages();

      setStatus((prev) => ({ ...prev, lastSync: new Date() }));
    } catch (error) {
      setStatus((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Retry failed',
      }));
    } finally {
      setStatus((prev) => ({ ...prev, syncInProgress: false }));
      updateStatus();
    }
  }, [updateStatus]);

  const clearErrors = useCallback(() => {
    setStatus((prev) => ({ ...prev, error: null }));
  }, []);

  // Setup event listeners
  useEffect(() => {
    const handleAuthReady = () => updateStatus();
    const handleAuthSuccess = () => updateStatus();
    const handleAuthError = (error: any) => {
      setStatus((prev) => ({
        ...prev,
        error: error?.message || 'Authentication error',
        isAuthenticated: false,
      }));
    };

    const handleSyncQueued = () => updateStatus();
    const handleSyncCompleted = (item: WedMeSyncItem) => {
      setStatus((prev) => ({ ...prev, lastSync: new Date() }));
      updateStatus();
    };
    const handleSyncError = ({ error }: any) => {
      setStatus((prev) => ({
        ...prev,
        error: error?.message || 'Sync error',
      }));
      updateStatus();
    };

    const handleDevicesDiscovered = () => updateStatus();

    const handlePortfolioSynced = () => {
      setStatus((prev) => ({ ...prev, lastSync: new Date() }));
      updateStatus();
    };
    const handlePortfolioError = ({ error }: any) => {
      setStatus((prev) => ({
        ...prev,
        error: error?.message || 'Portfolio sync error',
      }));
    };

    const handleMessageQueued = () => updateStatus();
    const handleMessageSent = () => updateStatus();
    const handleMessageError = ({ error }: any) => {
      setStatus((prev) => ({
        ...prev,
        error: error?.message || 'Message error',
      }));
    };

    const handleDeepLink = ({ action, params }: any) => {
      console.log('Deep link received:', action, params);
      // Handle deep link navigation here
    };

    // Register listeners
    wedMeIntegration.on('auth:ready', handleAuthReady);
    wedMeIntegration.on('auth:success', handleAuthSuccess);
    wedMeIntegration.on('auth:error', handleAuthError);

    wedMeIntegration.on('sync:queued', handleSyncQueued);
    wedMeIntegration.on('sync:completed', handleSyncCompleted);
    wedMeIntegration.on('sync:error', handleSyncError);

    wedMeIntegration.on('devices:discovered', handleDevicesDiscovered);

    wedMeIntegration.on('portfolio:synced', handlePortfolioSynced);
    wedMeIntegration.on('portfolio:error', handlePortfolioError);

    wedMeIntegration.on('message:queued', handleMessageQueued);
    wedMeIntegration.on('message:sent', handleMessageSent);
    wedMeIntegration.on('message:error', handleMessageError);

    wedMeIntegration.on('deeplink:received', handleDeepLink);

    // Initial status update
    updateStatus();

    // Cleanup listeners on unmount
    return () => {
      wedMeIntegration.off('auth:ready', handleAuthReady);
      wedMeIntegration.off('auth:success', handleAuthSuccess);
      wedMeIntegration.off('auth:error', handleAuthError);

      wedMeIntegration.off('sync:queued', handleSyncQueued);
      wedMeIntegration.off('sync:completed', handleSyncCompleted);
      wedMeIntegration.off('sync:error', handleSyncError);

      wedMeIntegration.off('devices:discovered', handleDevicesDiscovered);

      wedMeIntegration.off('portfolio:synced', handlePortfolioSynced);
      wedMeIntegration.off('portfolio:error', handlePortfolioError);

      wedMeIntegration.off('message:queued', handleMessageQueued);
      wedMeIntegration.off('message:sent', handleMessageSent);
      wedMeIntegration.off('message:error', handleMessageError);

      wedMeIntegration.off('deeplink:received', handleDeepLink);
    };
  }, [updateStatus]);

  // Auto-retry failed syncs periodically
  useEffect(() => {
    if (!status.isAuthenticated) return;

    const interval = setInterval(() => {
      if (status.queueSize > 0 || status.conflictCount > 0) {
        retryFailedSyncs().catch(console.error);
      }
    }, 30000); // Retry every 30 seconds

    return () => clearInterval(interval);
  }, [
    status.isAuthenticated,
    status.queueSize,
    status.conflictCount,
    retryFailedSyncs,
  ]);

  return {
    status,
    authenticate,
    syncWithWedMe,
    syncPortfolio,
    sendOfflineMessage,
    generateDeepLink,
    retryFailedSyncs,
    clearErrors,
  };
};
