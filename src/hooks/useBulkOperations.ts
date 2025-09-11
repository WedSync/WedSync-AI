'use client';

import { useState, useCallback, useRef } from 'react';
import {
  BulkOperationProgress,
  bulkOperationsService,
} from '@/lib/bulk/bulk-operations';
import { ClientData } from '@/components/clients/ClientListViews';

interface UseBulkOperationsReturn {
  progress: BulkOperationProgress | null;
  isProcessing: boolean;
  error: string | null;
  executeOperation: (
    operation: string,
    clientIds: string[],
    parameters: any,
    options?: {
      enableRollback?: boolean;
      validateBeforeOperation?: boolean;
    },
  ) => Promise<BulkOperationProgress>;
  cancelOperation: () => Promise<boolean>;
  clearProgress: () => void;
  retryLastOperation: () => Promise<BulkOperationProgress | null>;
  getPerformanceMetrics: (
    operation: string,
    itemCount: number,
  ) => Promise<{
    estimatedDuration: number;
    memoryRequirement: number;
    recommendedBatchSize: number;
  }>;
  exportClients: (
    clientIds: string[],
    format: 'csv' | 'excel',
    fields: string[],
  ) => Promise<void>;
}

interface LastOperation {
  operation: string;
  clientIds: string[];
  parameters: any;
  options?: any;
}

export function useBulkOperations(): UseBulkOperationsReturn {
  const [progress, setProgress] = useState<BulkOperationProgress | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastOperation, setLastOperation] = useState<LastOperation | null>(
    null,
  );
  const operationIdRef = useRef<string | null>(null);

  const executeOperation = useCallback(
    async (
      operation: string,
      clientIds: string[],
      parameters: any,
      options: {
        enableRollback?: boolean;
        validateBeforeOperation?: boolean;
      } = {},
    ): Promise<BulkOperationProgress> => {
      if (isProcessing) {
        throw new Error('Another operation is already in progress');
      }

      setIsProcessing(true);
      setError(null);
      setProgress(null);

      // Store operation for retry
      setLastOperation({ operation, clientIds, parameters, options });

      // Generate operation ID for cancellation
      operationIdRef.current = `bulk_${operation}_${Date.now()}`;

      try {
        const progressCallback = (progressUpdate: BulkOperationProgress) => {
          setProgress(progressUpdate);
        };

        const finalProgress = await bulkOperationsService.executeBulkOperation(
          operation,
          clientIds,
          parameters,
          {
            batchSize: await getOptimalBatchSize(operation, clientIds.length),
            progressCallback,
            enableRollback: options.enableRollback || false,
            validateBeforeOperation: options.validateBeforeOperation || true,
          },
        );

        setProgress(finalProgress);
        return finalProgress;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errorMessage);
        throw err;
      } finally {
        setIsProcessing(false);
        operationIdRef.current = null;
      }
    },
    [isProcessing],
  );

  const cancelOperation = useCallback(async (): Promise<boolean> => {
    if (!operationIdRef.current) return false;

    try {
      const success = await bulkOperationsService.cancelOperation(
        operationIdRef.current,
      );
      if (success) {
        setIsProcessing(false);
        setError('Operation cancelled by user');
        operationIdRef.current = null;
      }
      return success;
    } catch (err) {
      console.error('Failed to cancel operation:', err);
      return false;
    }
  }, []);

  const clearProgress = useCallback(() => {
    setProgress(null);
    setError(null);
  }, []);

  const retryLastOperation =
    useCallback(async (): Promise<BulkOperationProgress | null> => {
      if (!lastOperation) {
        throw new Error('No previous operation to retry');
      }

      // Filter out failed items from last operation
      const failedIds = progress?.errors?.map((e) => e.id) || [];
      if (failedIds.length === 0) {
        throw new Error('No failed items to retry');
      }

      return executeOperation(
        lastOperation.operation,
        failedIds,
        lastOperation.parameters,
        lastOperation.options,
      );
    }, [lastOperation, progress, executeOperation]);

  const getPerformanceMetrics = useCallback(
    async (operation: string, itemCount: number) => {
      return bulkOperationsService.getPerformanceMetrics(operation, itemCount);
    },
    [],
  );

  const exportClients = useCallback(
    async (
      clientIds: string[],
      format: 'csv' | 'excel' = 'csv',
      fields: string[],
    ) => {
      try {
        setIsProcessing(true);
        setError(null);

        // Create download link
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `clients_export_${timestamp}.${format}`;

        if (format === 'csv') {
          // Use streaming export for large datasets
          const stream = bulkOperationsService.streamingExport(
            clientIds,
            fields,
            'csv',
          );
          let csvContent = '';

          for await (const chunk of stream) {
            csvContent += chunk;
          }

          // Create and trigger download
          const blob = new Blob([csvContent], {
            type: 'text/csv;charset=utf-8;',
          });
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(link.href);
        } else {
          // For Excel format, use API endpoint
          const response = await fetch('/api/clients/export', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              clientIds,
              format,
              fields,
            }),
          });

          if (!response.ok) {
            throw new Error('Export failed');
          }

          const blob = await response.blob();
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(link.href);
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Export failed';
        setError(errorMessage);
        throw err;
      } finally {
        setIsProcessing(false);
      }
    },
    [],
  );

  return {
    progress,
    isProcessing,
    error,
    executeOperation,
    cancelOperation,
    clearProgress,
    retryLastOperation,
    getPerformanceMetrics,
    exportClients,
  };
}

// Helper function to get optimal batch size based on operation and count
async function getOptimalBatchSize(
  operation: string,
  itemCount: number,
): Promise<number> {
  const metrics = await bulkOperationsService.getPerformanceMetrics(
    operation,
    itemCount,
  );
  return metrics.recommendedBatchSize;
}

// Hook for handling bulk email operations specifically
export function useBulkEmail() {
  const { executeOperation, isProcessing, progress, error } =
    useBulkOperations();

  const sendBulkEmail = useCallback(
    async (clientIds: string[], template: string, customMessage?: string) => {
      const parameters = {
        template,
        ...(customMessage && { custom_message: customMessage }),
      };

      return executeOperation('email', clientIds, parameters, {
        validateBeforeOperation: true,
        enableRollback: false,
      });
    },
    [executeOperation],
  );

  return {
    sendBulkEmail,
    isProcessing,
    progress,
    error,
  };
}

// Hook for handling bulk form operations specifically
export function useBulkForm() {
  const { executeOperation, isProcessing, progress, error } =
    useBulkOperations();

  const sendBulkForm = useCallback(
    async (clientIds: string[], formId: string) => {
      const parameters = { form_id: formId };

      return executeOperation('form', clientIds, parameters, {
        validateBeforeOperation: true,
        enableRollback: false,
      });
    },
    [executeOperation],
  );

  return {
    sendBulkForm,
    isProcessing,
    progress,
    error,
  };
}

// Hook for mobile-optimized bulk operations
export function useMobileBulkOperations() {
  const bulkOps = useBulkOperations();
  const [showMobileActions, setShowMobileActions] = useState(false);
  const [pendingOperation, setPendingOperation] = useState<{
    operation: string;
    parameters: any;
  } | null>(null);

  const executeMobileAction = useCallback(
    async (action: string, clientIds: string[], parameters: any) => {
      // Show loading state immediately for mobile UX
      setShowMobileActions(false);

      try {
        switch (action) {
          case 'email':
            return bulkOps.executeOperation('email', clientIds, parameters);
          case 'form':
            return bulkOps.executeOperation('form', clientIds, parameters);
          case 'status':
            return bulkOps.executeOperation(
              'status_update',
              clientIds,
              parameters,
            );
          case 'tag':
            return bulkOps.executeOperation('tag_add', clientIds, parameters);
          case 'export':
            const fields = [
              'first_name',
              'last_name',
              'email',
              'phone',
              'wedding_date',
              'status',
            ];
            await bulkOps.exportClients(clientIds, 'csv', fields);
            break;
          default:
            throw new Error(`Unknown action: ${action}`);
        }
      } catch (error) {
        // Re-show actions on error for retry
        setShowMobileActions(true);
        throw error;
      }
    },
    [bulkOps],
  );

  return {
    ...bulkOps,
    showMobileActions,
    setShowMobileActions,
    executeMobileAction,
    pendingOperation,
    setPendingOperation,
  };
}
