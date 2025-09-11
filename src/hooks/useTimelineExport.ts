// =====================================================
// TIMELINE EXPORT HOOK
// =====================================================
// React hook for timeline export functionality with progress tracking
// Handles client-side export requests and progress monitoring
// Feature ID: WS-160 - Timeline Builder UI
// Created: 2025-08-27
// =====================================================

'use client';

import { useState, useCallback } from 'react';
import type {
  ExportOptions,
  ExportProgress,
  ExportResult,
} from '@/lib/services/timelineExportService';
import { validateExportOptions } from '@/lib/services/timelineExportService';

// =====================================================
// TYPES
// =====================================================

interface UseTimelineExportState {
  isExporting: boolean;
  progress: ExportProgress | null;
  error: string | null;
  lastExport: ExportResult | null;
}

interface UseTimelineExportReturn extends UseTimelineExportState {
  exportTimeline: (
    timelineId: string,
    options: ExportOptions,
  ) => Promise<ExportResult>;
  downloadExport: (exportId: string, filename?: string) => Promise<void>;
  clearError: () => void;
  reset: () => void;
}

interface SecureExportResponse {
  success: boolean;
  export_id: string;
  secure_url: string;
  filename: string;
  expires_at: string;
  download_limit?: number;
  file_size?: number;
  error?: string;
  progress?: ExportProgress;
}

// =====================================================
// HOOK IMPLEMENTATION
// =====================================================

export function useTimelineExport(): UseTimelineExportReturn {
  const [state, setState] = useState<UseTimelineExportState>({
    isExporting: false,
    progress: null,
    error: null,
    lastExport: null,
  });

  // Clear error state
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  // Reset all state
  const reset = useCallback(() => {
    setState({
      isExporting: false,
      progress: null,
      error: null,
      lastExport: null,
    });
  }, []);

  // Main export function
  const exportTimeline = useCallback(
    async (
      timelineId: string,
      options: ExportOptions,
    ): Promise<ExportResult> => {
      // Validate options
      const validation = validateExportOptions(options);
      if (!validation.valid) {
        const errorMsg = `Invalid export options: ${validation.errors.join(', ')}`;
        setState((prev) => ({ ...prev, error: errorMsg }));
        return {
          success: false,
          filename: 'export_error.txt',
          error: errorMsg,
        };
      }

      setState((prev) => ({
        ...prev,
        isExporting: true,
        error: null,
        progress: {
          stage: 'preparing',
          progress: 0,
          message: 'Starting export...',
        },
      }));

      try {
        // Simulate initial progress update
        setState((prev) => ({
          ...prev,
          progress: {
            stage: 'preparing',
            progress: 10,
            message: 'Validating timeline data...',
          },
        }));

        // Make API request to export endpoint
        const response = await fetch(`/api/timeline/${timelineId}/export`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(options),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || `Export failed with status ${response.status}`,
          );
        }

        const exportResponse: SecureExportResponse = await response.json();

        if (!exportResponse.success) {
          throw new Error(exportResponse.error || 'Export failed');
        }

        // Update progress to complete
        setState((prev) => ({
          ...prev,
          progress: {
            stage: 'complete',
            progress: 100,
            message: 'Export completed successfully!',
          },
        }));

        // Create result object
        const result: ExportResult = {
          success: true,
          filename: exportResponse.filename,
          downloadUrl: exportResponse.secure_url,
          size: exportResponse.file_size,
          secureUrl: exportResponse.secure_url,
          expiresAt: exportResponse.expires_at,
          fileId: exportResponse.export_id,
          sharing: {
            email_enabled: true,
            password_required: false,
            download_limit: exportResponse.download_limit,
          },
        };

        setState((prev) => ({
          ...prev,
          isExporting: false,
          lastExport: result,
        }));

        return result;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown export error';

        setState((prev) => ({
          ...prev,
          isExporting: false,
          error: errorMessage,
          progress: null,
        }));

        return {
          success: false,
          filename: 'export_error.txt',
          error: errorMessage,
        };
      }
    },
    [],
  );

  // Download export using secure URL or download endpoint
  const downloadExport = useCallback(
    async (exportId: string, filename?: string): Promise<void> => {
      try {
        setState((prev) => ({ ...prev, error: null }));

        // If we have a secure URL from the last export, use it directly
        if (
          state.lastExport?.secureUrl &&
          state.lastExport.fileId === exportId
        ) {
          window.open(state.lastExport.secureUrl, '_blank');
          return;
        }

        // Otherwise, use the download endpoint
        const downloadUrl = `/api/timeline/export/download?export_id=${exportId}`;

        // Create a temporary link and click it to trigger download
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = filename || 'timeline_export';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Download failed';
        setState((prev) => ({ ...prev, error: errorMessage }));
      }
    },
    [state.lastExport],
  );

  return {
    ...state,
    exportTimeline,
    downloadExport,
    clearError,
    reset,
  };
}

// =====================================================
// UTILITY HOOKS
// =====================================================

// Hook for getting export format recommendations
export function useExportRecommendations() {
  return useCallback((userType: 'client' | 'vendor' | 'admin' = 'client') => {
    const recommendations = {
      client: {
        pdf: 'Perfect for printing and sharing with venues - clean, professional layout',
        ical: 'Add all events to your personal calendar with automatic reminders',
        google:
          'Quick import to Google Calendar for easy access on mobile devices',
      },
      vendor: {
        pdf: 'Detailed timeline with setup times, contact info, and responsibilities',
        excel: 'Full data export for analysis, scheduling, and coordination',
        csv: 'Import into your existing vendor management systems',
      },
      admin: {
        excel: 'Complete data export with statistics and analytics',
        pdf: 'Professional client presentation with full details',
        ical: 'Master calendar with all events and vendor information',
      },
    };

    return recommendations[userType] || recommendations.client;
  }, []);
}

// Hook for export format validation
export function useExportValidation() {
  return useCallback((options: Partial<ExportOptions>) => {
    // Basic validation
    if (!options.format) {
      return { valid: false, error: 'Export format is required' };
    }

    // Format-specific validation
    if (options.format === 'ical' && !options.reminderSettings) {
      return {
        valid: true,
        warning: 'Consider enabling reminder settings for calendar exports',
      };
    }

    if (
      options.format === 'pdf' &&
      options.vendorDetailedVersion &&
      !options.printOptimized
    ) {
      return {
        valid: true,
        warning:
          'Consider enabling print optimization for vendor detailed PDFs',
      };
    }

    if (options.clientFriendlyVersion && options.include_internal_notes) {
      return {
        valid: true,
        warning: 'Client-friendly versions typically exclude internal notes',
      };
    }

    return { valid: true };
  }, []);
}

// Hook for progress tracking with enhanced messages
export function useExportProgressMessages() {
  return useCallback((progress: ExportProgress | null) => {
    if (!progress) return null;

    const messages = {
      preparing: {
        0: 'Initializing export...',
        20: 'Validating timeline data...',
        40: 'Processing events and vendors...',
        60: 'Applying export filters...',
        80: 'Preparing file generation...',
      },
      processing: {
        0: 'Generating export content...',
        25: 'Formatting timeline events...',
        50: 'Adding vendor information...',
        75: 'Applying styling and layout...',
      },
      generating: {
        0: 'Creating export file...',
        50: 'Optimizing file size...',
        90: 'Finalizing export...',
      },
      complete: {
        100: 'Export completed successfully!',
      },
    };

    const stageMessages = messages[progress.stage] || {};
    const closest = Object.keys(stageMessages)
      .map(Number)
      .reduce((prev, curr) =>
        Math.abs(curr - progress.progress) < Math.abs(prev - progress.progress)
          ? curr
          : prev,
      );

    return stageMessages[closest] || progress.message;
  }, []);
}
