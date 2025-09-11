'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useToast } from '@/components/ui/use-toast';
import type {
  ExportOptions,
  ExportProgress,
  ExportHistoryRecord,
  ExportStatusResponse,
  UseBudgetExportOptions,
  UseBudgetExportReturn,
  ExportFilters,
} from '@/types/budget-export';

/**
 * useBudgetExport - Custom hook for managing budget export functionality
 * Handles export creation, progress tracking, and history management
 * Follows existing WedSync patterns for hooks with Supabase integration
 */
export function useBudgetExport(
  options: UseBudgetExportOptions = {},
): UseBudgetExportReturn {
  const {
    clientId,
    onExportComplete,
    onExportError,
    pollInterval = 2000, // 2 seconds
  } = options;

  // State
  const [currentExport, setCurrentExport] = useState<ExportProgress | null>(
    null,
  );
  const [isExporting, setIsExporting] = useState(false);
  const [exportHistory, setExportHistory] = useState<ExportHistoryRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Refs for polling
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const supabase = createClientComponentClient();
  const { toast } = useToast();

  // Clear polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Start export process
  const startExport = useCallback(
    async (exportOptions: ExportOptions): Promise<string> => {
      try {
        setIsExporting(true);

        // Create abort controller for this request
        abortControllerRef.current = new AbortController();

        // Get current user session
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();
        if (sessionError || !session) {
          throw new Error('User not authenticated');
        }

        // Prepare export request
        const exportRequest = {
          clientId: clientId || session.user.id,
          format: exportOptions.format,
          filters: exportOptions.filters,
          options: {
            includeCharts: exportOptions.includeCharts,
            includeSummary: exportOptions.includeSummary,
            customTitle: exportOptions.customTitle,
          },
        };

        // Make API call to start export
        const response = await fetch('/api/budget/export', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(exportRequest),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || `Export failed with status ${response.status}`,
          );
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Export request failed');
        }

        const exportId = result.exportId;

        // Initialize export progress
        const initialProgress: ExportProgress = {
          exportId,
          status: 'preparing',
          progress: 0,
          message: 'Starting export...',
          startedAt: new Date(),
        };

        setCurrentExport(initialProgress);

        // Start polling for progress updates
        startProgressPolling(exportId);

        return exportId;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error occurred';
        onExportError?.(errorMessage);
        throw error;
      } finally {
        setIsExporting(false);
      }
    },
    [supabase, clientId, onExportError],
  );

  // Start polling for export progress
  const startProgressPolling = useCallback(
    (exportId: string) => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }

      const pollProgress = async () => {
        try {
          const status = await getExportStatus(exportId);

          const updatedProgress: ExportProgress = {
            exportId: status.exportId,
            status: status.status,
            progress: status.progress,
            message: status.downloadUrl
              ? 'Export completed successfully'
              : 'Processing...',
            startedAt: currentExport?.startedAt || new Date(),
            completedAt: status.status === 'completed' ? new Date() : undefined,
            error: status.error,
          };

          setCurrentExport(updatedProgress);

          // Handle completion
          if (status.status === 'completed' && status.downloadUrl) {
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
            onExportComplete?.(exportId, status.downloadUrl);
            refreshHistory();
          }

          // Handle failure
          if (status.status === 'failed') {
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
            onExportError?.(status.error || 'Export failed');
          }
        } catch (error) {
          console.error('Failed to poll export status:', error);
        }
      };

      // Initial poll
      pollProgress();

      // Set up interval polling
      pollingIntervalRef.current = setInterval(pollProgress, pollInterval);
    },
    [pollInterval, onExportComplete, onExportError, currentExport?.startedAt],
  );

  // Get export status
  const getExportStatus = useCallback(
    async (exportId: string): Promise<ExportStatusResponse> => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('User not authenticated');
      }

      const response = await fetch(`/api/budget/export/${exportId}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get export status: ${response.status}`);
      }

      return await response.json();
    },
    [supabase],
  );

  // Cancel export
  const cancelExport = useCallback(
    async (exportId: string): Promise<void> => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          throw new Error('User not authenticated');
        }

        const response = await fetch(`/api/budget/export/${exportId}/cancel`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to cancel export');
        }

        // Stop polling
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }

        // Update current export status
        if (currentExport?.exportId === exportId) {
          setCurrentExport((prev) =>
            prev
              ? {
                  ...prev,
                  status: 'cancelled',
                  message: 'Export was cancelled',
                }
              : null,
          );
        }

        toast({
          title: 'Export cancelled',
          description: 'The export has been successfully cancelled.',
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to cancel export';
        toast({
          title: 'Failed to cancel',
          description: errorMessage,
          variant: 'destructive',
        });
        throw error;
      }
    },
    [supabase, currentExport, toast],
  );

  // Retry export
  const retryExport = useCallback(
    async (exportId: string): Promise<void> => {
      // For retry, we'll need to get the original export options
      // This is a simplified implementation - in practice, you'd store the options
      // or reconstruct them from the export record
      toast({
        title: 'Retry not implemented',
        description: 'Please start a new export with your desired settings.',
        variant: 'destructive',
      });
    },
    [toast],
  );

  // Download export
  const downloadExport = useCallback(
    async (exportId: string): Promise<void> => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          throw new Error('User not authenticated');
        }

        const response = await fetch(
          `/api/budget/export/${exportId}/download`,
          {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          },
        );

        if (!response.ok) {
          throw new Error('Failed to download export');
        }

        // Create download link
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `budget-export-${exportId}.${currentExport?.exportId === exportId ? 'pdf' : 'unknown'}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        toast({
          title: 'Download started',
          description: 'Your budget export is being downloaded.',
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Download failed';
        toast({
          title: 'Download failed',
          description: errorMessage,
          variant: 'destructive',
        });
        throw error;
      }
    },
    [supabase, currentExport, toast],
  );

  // Delete history record
  const deleteHistoryRecord = useCallback(
    async (recordId: string): Promise<void> => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          throw new Error('User not authenticated');
        }

        const response = await fetch(`/api/budget/export/${recordId}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to delete export');
        }

        // Remove from local state
        setExportHistory((prev) =>
          prev.filter((record) => record.id !== recordId),
        );

        toast({
          title: 'Export deleted',
          description: 'The export has been removed from your history.',
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to delete export';
        toast({
          title: 'Delete failed',
          description: errorMessage,
          variant: 'destructive',
        });
        throw error;
      }
    },
    [supabase, toast],
  );

  // Refresh export history
  const refreshHistory = useCallback(async (): Promise<void> => {
    try {
      setHistoryLoading(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('User not authenticated');
      }

      const response = await fetch('/api/budget/export/history', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch export history');
      }

      const result = await response.json();

      if (result.success) {
        setExportHistory(result.records || []);
      } else {
        throw new Error(result.error || 'Failed to load history');
      }
    } catch (error) {
      console.error('Failed to refresh export history:', error);
    } finally {
      setHistoryLoading(false);
    }
  }, [supabase]);

  // Validate export filters
  const validateFilters = useCallback((filters: ExportFilters): string[] => {
    const errors: string[] = [];

    // Validate date range
    if (filters.dateRange) {
      const { start, end } = filters.dateRange;
      const now = new Date();

      if (start > end) {
        errors.push('Start date must be before end date');
      }

      if (start > now || end > now) {
        errors.push('Date range cannot be in the future');
      }

      const daysDiff =
        Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
      if (daysDiff > 730) {
        // 2 years
        errors.push('Date range cannot exceed 2 years');
      }
    }

    // Validate categories
    if (filters.categories.length > 50) {
      errors.push('Cannot select more than 50 categories');
    }

    return errors;
  }, []);

  // Load initial history
  useEffect(() => {
    refreshHistory();
  }, [refreshHistory]);

  return {
    // State
    currentExport,
    isExporting,
    exportHistory,
    historyLoading,

    // Actions
    startExport,
    cancelExport,
    retryExport,
    downloadExport,
    deleteHistoryRecord,
    refreshHistory,

    // Helpers
    getExportStatus,
    validateFilters,
  };
}

export default useBudgetExport;
