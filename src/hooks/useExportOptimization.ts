/**
 * WS-166 Export Optimization Hook
 * Team D - Round 1 Implementation
 *
 * React hook for managing optimized budget exports with performance monitoring
 */

'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  ExportPerformanceOptimizer,
  DeviceCapabilityDetector,
  BudgetData,
  ExportRequest,
  PerformanceMetrics,
  DeviceInfo,
  OptimizedBudgetData,
} from '@/lib/performance/budget-export/export-optimizer';
import {
  MobileExportQueue,
  ExportQueueItem,
  ExportStatus,
  QueueStatistics,
} from '@/lib/performance/budget-export/mobile-export-queue';
import {
  WedMeExportIntegration,
  WedMeExportData,
  ExportShortcut,
  QuickExportOptions,
} from '@/lib/performance/budget-export/wedme-export-integration';

interface UseExportOptimizationOptions {
  weddingId: string;
  autoOptimizeForDevice?: boolean;
  enableOfflineQueue?: boolean;
  enablePerformanceMonitoring?: boolean;
  wedmeIntegration?: boolean;
  preloadCriticalData?: boolean;
}

interface ExportState {
  isInitialized: boolean;
  isExporting: boolean;
  currentExportId: string | null;
  queuedExports: ExportQueueItem[];
  exportHistory: ExportHistoryItem[];
  error: string | null;
  isOnline: boolean;
}

interface ExportHistoryItem {
  exportId: string;
  format: string;
  timestamp: Date;
  fileSize: number;
  duration: number;
  status: 'completed' | 'failed' | 'cancelled';
  downloadUrl?: string;
  metrics?: PerformanceMetrics;
}

interface OptimizationState {
  deviceCapabilities: DeviceInfo | null;
  optimizationCache: Map<string, OptimizedBudgetData>;
  performanceMetrics: PerformanceMetrics | null;
  memoryUsage: number;
  batteryImpact: number;
  thermalState: 'normal' | 'fair' | 'serious' | 'critical';
}

interface ExportProgress {
  exportId: string;
  status: ExportStatus['status'];
  progress: number;
  phase:
    | 'preparing'
    | 'collecting'
    | 'processing'
    | 'generating'
    | 'completing';
  estimatedTimeRemaining: number;
  metrics?: Partial<PerformanceMetrics>;
  canCancel: boolean;
}

interface UseExportOptimizationReturn {
  // State
  exportState: ExportState;
  optimizationState: OptimizationState;
  currentProgress: ExportProgress | null;
  queueStatistics: QueueStatistics | null;
  exportShortcuts: ExportShortcut[];

  // Export operations
  startExport: (
    request: ExportRequest,
    options?: QuickExportOptions,
  ) => Promise<string>;
  cancelExport: (exportId: string) => Promise<boolean>;
  pauseExport: (exportId: string) => Promise<boolean>;
  resumeExport: (exportId: string) => Promise<boolean>;
  retryExport: (exportId: string) => Promise<string>;

  // Queue management
  processOfflineQueue: () => Promise<void>;
  clearExportHistory: () => Promise<void>;
  getExportStatus: (exportId: string) => Promise<ExportStatus | null>;

  // Optimization
  optimizeForDevice: (budgetData: BudgetData) => Promise<OptimizedBudgetData>;
  preloadData: () => Promise<void>;
  measurePerformance: (
    exportType: string,
    dataSize: number,
  ) => Promise<PerformanceMetrics>;

  // WedMe integration
  shareWithVendor: (exportId: string, vendorId: string) => Promise<string>;
  syncWithWedMe: (exportData: BudgetData) => Promise<boolean>;
  createExportShortcut: (
    name: string,
    request: ExportRequest,
  ) => Promise<string>;

  // Utility functions
  isLowEndDevice: boolean;
  estimateExportSize: (request: ExportRequest) => number;
  getRecommendedFormat: (dataSize: number) => 'csv' | 'pdf' | 'excel' | 'json';
  downloadExport: (exportId: string) => Promise<void>;
}

export const useExportOptimization = (
  options: UseExportOptimizationOptions,
): UseExportOptimizationReturn => {
  const {
    weddingId,
    autoOptimizeForDevice = true,
    enableOfflineQueue = true,
    enablePerformanceMonitoring = true,
    wedmeIntegration = false,
    preloadCriticalData = true,
  } = options;

  // State management
  const [exportState, setExportState] = useState<ExportState>({
    isInitialized: false,
    isExporting: false,
    currentExportId: null,
    queuedExports: [],
    exportHistory: [],
    error: null,
    isOnline: navigator.onLine,
  });

  const [optimizationState, setOptimizationState] = useState<OptimizationState>(
    {
      deviceCapabilities: null,
      optimizationCache: new Map(),
      performanceMetrics: null,
      memoryUsage: 0,
      batteryImpact: 0,
      thermalState: 'normal',
    },
  );

  const [currentProgress, setCurrentProgress] = useState<ExportProgress | null>(
    null,
  );
  const [queueStatistics, setQueueStatistics] =
    useState<QueueStatistics | null>(null);
  const [exportShortcuts, setExportShortcuts] = useState<ExportShortcut[]>([]);

  // Refs for cleanup
  const progressMonitor = useRef<NodeJS.Timeout | null>(null);
  const performanceMonitor = useRef<NodeJS.Timeout | null>(null);
  const statusListeners = useRef<Map<string, (status: ExportStatus) => void>>(
    new Map(),
  );

  // Initialize the hook
  useEffect(() => {
    const initialize = async () => {
      try {
        // Initialize device capabilities
        if (autoOptimizeForDevice) {
          const capabilities =
            await DeviceCapabilityDetector.detectCapabilities();
          setOptimizationState((prev) => ({
            ...prev,
            deviceCapabilities: capabilities,
          }));
        }

        // Initialize export queue
        if (enableOfflineQueue) {
          await MobileExportQueue.initialize();

          // Load queued exports
          const statistics = await MobileExportQueue.getQueueStatistics();
          setQueueStatistics(statistics);
        }

        // Initialize WedMe integration
        if (wedmeIntegration) {
          await WedMeExportIntegration.integrateWithBudgetDashboard();
          await WedMeExportIntegration.addExportShortcuts();

          // Load export shortcuts
          // This would typically come from an API call
          setExportShortcuts([]);
        }

        // Preload critical data
        if (preloadCriticalData) {
          await ExportPerformanceOptimizer.preloadCriticalData(weddingId);
        }

        // Set up online/offline listeners
        const handleOnline = () => {
          setExportState((prev) => ({ ...prev, isOnline: true }));
          if (enableOfflineQueue) {
            MobileExportQueue.processOfflineQueue();
          }
        };

        const handleOffline = () => {
          setExportState((prev) => ({ ...prev, isOnline: false }));
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        setExportState((prev) => ({ ...prev, isInitialized: true }));

        // Cleanup function
        return () => {
          window.removeEventListener('online', handleOnline);
          window.removeEventListener('offline', handleOffline);
        };
      } catch (error) {
        console.error('Error initializing export optimization:', error);
        setExportState((prev) => ({
          ...prev,
          error: 'Failed to initialize export system',
          isInitialized: true,
        }));
      }
    };

    initialize();
  }, [
    weddingId,
    autoOptimizeForDevice,
    enableOfflineQueue,
    wedmeIntegration,
    preloadCriticalData,
  ]);

  // Performance monitoring
  useEffect(() => {
    if (!enablePerformanceMonitoring || !exportState.isInitialized) return;

    performanceMonitor.current = setInterval(async () => {
      try {
        const memoryInfo = (performance as any).memory;
        const battery = await (navigator as any).getBattery?.();

        setOptimizationState((prev) => ({
          ...prev,
          memoryUsage: memoryInfo?.usedJSHeapSize || 0,
          batteryImpact: battery ? (1 - battery.level) * 100 : 0,
          thermalState:
            prev.memoryUsage > 100 * 1024 * 1024 ? 'serious' : 'normal', // 100MB threshold
        }));
      } catch (error) {
        console.error('Error monitoring performance:', error);
      }
    }, 5000); // Every 5 seconds

    return () => {
      if (performanceMonitor.current) {
        clearInterval(performanceMonitor.current);
      }
    };
  }, [enablePerformanceMonitoring, exportState.isInitialized]);

  // Start export operation
  const startExport = useCallback(
    async (
      request: ExportRequest,
      quickOptions?: QuickExportOptions,
    ): Promise<string> => {
      try {
        setExportState((prev) => ({ ...prev, isExporting: true, error: null }));

        let exportId: string;

        if (exportState.isOnline) {
          // Direct export
          const response = await fetch('/api/budget/export', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...request, quickOptions }),
          });

          if (!response.ok) {
            throw new Error(`Export failed: ${response.statusText}`);
          }

          const result = await response.json();
          exportId = result.exportId;

          // Start progress monitoring
          const statusListener = (status: ExportStatus) => {
            setCurrentProgress({
              exportId: status.exportId,
              status: status.status,
              progress: status.progress,
              phase: 'processing',
              estimatedTimeRemaining: status.estimatedTimeRemaining || 0,
              canCancel: status.status === 'processing',
            });

            if (status.status === 'completed' || status.status === 'failed') {
              setExportState((prev) => ({
                ...prev,
                isExporting: false,
                currentExportId: null,
              }));
              setCurrentProgress(null);
              MobileExportQueue.removeStatusListener(exportId);
            }
          };

          MobileExportQueue.addStatusListener(exportId, statusListener);
        } else {
          // Queue export for offline processing
          if (!enableOfflineQueue) {
            throw new Error(
              'Cannot export while offline - offline queue is disabled',
            );
          }

          exportId = await MobileExportQueue.queueExportRequest(
            request,
            'normal',
          );

          setExportState((prev) => ({
            ...prev,
            isExporting: false,
            queuedExports: [
              ...prev.queuedExports,
              {
                exportId,
                weddingId: request.weddingId,
                format: request.format,
                filters: {
                  categories: request.categories,
                  dateRange: request.dateRange,
                  includeMetadata: true,
                  transactionTypes: ['expense', 'payment', 'refund'],
                },
                priority: 'normal',
                timestamp: new Date(),
                status: 'pending',
                retryCount: 0,
                maxRetries: 3,
                estimatedSize: estimateExportSize(request),
                progress: 0,
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
              } as ExportQueueItem,
            ],
          }));
        }

        setExportState((prev) => ({ ...prev, currentExportId: exportId }));

        return exportId;
      } catch (error) {
        setExportState((prev) => ({
          ...prev,
          isExporting: false,
          error: error instanceof Error ? error.message : 'Export failed',
        }));
        throw error;
      }
    },
    [exportState.isOnline, enableOfflineQueue],
  );

  // Cancel export
  const cancelExport = useCallback(
    async (exportId: string): Promise<boolean> => {
      try {
        const success = await MobileExportQueue.cancelExport(exportId);

        if (success && exportId === exportState.currentExportId) {
          setExportState((prev) => ({
            ...prev,
            isExporting: false,
            currentExportId: null,
          }));
          setCurrentProgress(null);
        }

        return success;
      } catch (error) {
        console.error('Error cancelling export:', error);
        return false;
      }
    },
    [exportState.currentExportId],
  );

  // Optimize budget data for device
  const optimizeForDevice = useCallback(
    async (budgetData: BudgetData): Promise<OptimizedBudgetData> => {
      if (!optimizationState.deviceCapabilities) {
        throw new Error('Device capabilities not detected');
      }

      try {
        const optimized = await ExportPerformanceOptimizer.optimizeForMobile(
          budgetData,
          optimizationState.deviceCapabilities,
        );

        // Cache the optimized data
        const cacheKey = `${budgetData.metadata.weddingId}_${budgetData.metadata.lastUpdated.getTime()}`;
        setOptimizationState((prev) => {
          const newCache = new Map(prev.optimizationCache);
          newCache.set(cacheKey, optimized);
          return { ...prev, optimizationCache: newCache };
        });

        return optimized;
      } catch (error) {
        console.error('Error optimizing data for device:', error);
        throw error;
      }
    },
    [optimizationState.deviceCapabilities],
  );

  // Measure export performance
  const measurePerformance = useCallback(
    async (
      exportType: string,
      dataSize: number,
    ): Promise<PerformanceMetrics> => {
      try {
        const metrics =
          await ExportPerformanceOptimizer.measureExportPerformance(
            exportType,
            dataSize,
          );

        setOptimizationState((prev) => ({
          ...prev,
          performanceMetrics: metrics,
        }));

        return metrics;
      } catch (error) {
        console.error('Error measuring performance:', error);
        throw error;
      }
    },
    [],
  );

  // Sync with WedMe platform
  const syncWithWedMe = useCallback(
    async (exportData: BudgetData): Promise<boolean> => {
      if (!wedmeIntegration) {
        throw new Error('WedMe integration is not enabled');
      }

      try {
        const wedmeData = await WedMeExportIntegration.transformToWedMeFormat(
          exportData,
          weddingId,
        );

        return await WedMeExportIntegration.syncWithWedMe(wedmeData);
      } catch (error) {
        console.error('Error syncing with WedMe:', error);
        return false;
      }
    },
    [wedmeIntegration, weddingId],
  );

  // Share with vendor
  const shareWithVendor = useCallback(
    async (exportId: string, vendorId: string): Promise<string> => {
      if (!wedmeIntegration) {
        throw new Error('WedMe integration is not enabled');
      }

      try {
        return await WedMeExportIntegration.shareWithVendor(
          exportId,
          vendorId,
          {
            includePersonalInfo: false,
            accessDuration: 7, // 7 days
            permissions: ['view', 'download'],
          },
        );
      } catch (error) {
        console.error('Error sharing with vendor:', error);
        throw error;
      }
    },
    [wedmeIntegration],
  );

  // Process offline queue
  const processOfflineQueue = useCallback(async (): Promise<void> => {
    if (!enableOfflineQueue) return;

    try {
      await MobileExportQueue.processOfflineQueue();
      const statistics = await MobileExportQueue.getQueueStatistics();
      setQueueStatistics(statistics);
    } catch (error) {
      console.error('Error processing offline queue:', error);
    }
  }, [enableOfflineQueue]);

  // Get export status
  const getExportStatus = useCallback(
    async (exportId: string): Promise<ExportStatus | null> => {
      try {
        const response = await fetch(`/api/budget/export/status/${exportId}`);
        if (!response.ok) return null;

        return await response.json();
      } catch (error) {
        console.error('Error getting export status:', error);
        return null;
      }
    },
    [],
  );

  // Utility functions
  const estimateExportSize = useCallback((request: ExportRequest): number => {
    const baseSize = 1024; // 1KB
    const formatMultiplier = {
      csv: 1,
      json: 2,
      excel: 3,
      pdf: 5,
    };

    const categoryMultiplier = request.categories?.length || 1;
    const transactionMultiplier = request.includeTransactions ? 10 : 1;

    return (
      baseSize *
      formatMultiplier[request.format] *
      categoryMultiplier *
      transactionMultiplier
    );
  }, []);

  const getRecommendedFormat = useCallback(
    (dataSize: number): 'csv' | 'pdf' | 'excel' | 'json' => {
      if (!optimizationState.deviceCapabilities) return 'csv';

      const isLowEnd = optimizationState.deviceCapabilities.isLowEndDevice;
      const isLargeData = dataSize > 100 * 1024; // 100KB

      if (isLowEnd || isLargeData) {
        return 'csv'; // Most efficient format
      }

      if (dataSize < 50 * 1024) {
        return 'pdf'; // Good for small data
      }

      return 'excel'; // Full featured for medium data
    },
    [optimizationState.deviceCapabilities],
  );

  const downloadExport = useCallback(
    async (exportId: string): Promise<void> => {
      try {
        const response = await fetch(`/api/budget/export/${exportId}/download`);
        if (!response.ok) {
          throw new Error(`Download failed: ${response.statusText}`);
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `budget-export-${exportId}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } catch (error) {
        console.error('Error downloading export:', error);
        throw error;
      }
    },
    [],
  );

  // Computed values
  const isLowEndDevice = useMemo(() => {
    return optimizationState.deviceCapabilities?.isLowEndDevice || false;
  }, [optimizationState.deviceCapabilities]);

  // Preload data
  const preloadData = useCallback(async (): Promise<void> => {
    try {
      await ExportPerformanceOptimizer.preloadCriticalData(weddingId);
    } catch (error) {
      console.error('Error preloading data:', error);
    }
  }, [weddingId]);

  // Create export shortcut
  const createExportShortcut = useCallback(
    async (name: string, request: ExportRequest): Promise<string> => {
      if (!wedmeIntegration) {
        throw new Error('WedMe integration is not enabled');
      }

      try {
        return await WedMeExportIntegration.createExportTemplate(
          name,
          request,
          {
            template: 'custom',
            format: request.format,
            delivery: 'download',
          },
        );
      } catch (error) {
        console.error('Error creating export shortcut:', error);
        throw error;
      }
    },
    [wedmeIntegration],
  );

  // Placeholder implementations for missing functions
  const pauseExport = useCallback(
    async (exportId: string): Promise<boolean> => {
      console.log('Pause export not implemented:', exportId);
      return false;
    },
    [],
  );

  const resumeExport = useCallback(
    async (exportId: string): Promise<boolean> => {
      console.log('Resume export not implemented:', exportId);
      return false;
    },
    [],
  );

  const retryExport = useCallback(async (exportId: string): Promise<string> => {
    console.log('Retry export not implemented:', exportId);
    return exportId;
  }, []);

  const clearExportHistory = useCallback(async (): Promise<void> => {
    setExportState((prev) => ({ ...prev, exportHistory: [] }));
  }, []);

  return {
    // State
    exportState,
    optimizationState,
    currentProgress,
    queueStatistics,
    exportShortcuts,

    // Export operations
    startExport,
    cancelExport,
    pauseExport,
    resumeExport,
    retryExport,

    // Queue management
    processOfflineQueue,
    clearExportHistory,
    getExportStatus,

    // Optimization
    optimizeForDevice,
    preloadData,
    measurePerformance,

    // WedMe integration
    shareWithVendor,
    syncWithWedMe,
    createExportShortcut,

    // Utility functions
    isLowEndDevice,
    estimateExportSize,
    getRecommendedFormat,
    downloadExport,
  };
};
