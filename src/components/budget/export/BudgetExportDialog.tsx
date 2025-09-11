'use client';

import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { useToast } from '@/hooks/use-toast';
import { useBudgetExport } from '@/hooks/useBudgetExport';
import { ExportFormatSelector } from './ExportFormatSelector';
import { ExportFilters } from './ExportFilters';
import { ExportProgress } from './ExportProgress';
import { ExportHistory } from './ExportHistory';
import { Download, History, Settings, AlertTriangle } from 'lucide-react';
import type {
  BudgetExportDialogProps,
  ExportOptions,
  DEFAULT_EXPORT_OPTIONS,
} from '@/types/budget-export';

/**
 * BudgetExportDialog - Main export interface with format selection, filters, and options
 * Follows existing WedSync patterns for dialogs, error handling, and accessibility
 */
export function BudgetExportDialog({
  isOpen,
  onClose,
  coupleId,
  budgetData,
  onExportComplete,
}: BudgetExportDialogProps) {
  const [exportOptions, setExportOptions] = useState<ExportOptions>(
    DEFAULT_EXPORT_OPTIONS,
  );
  const [activeTab, setActiveTab] = useState<'export' | 'history'>('export');
  const [isExporting, setIsExporting] = useState(false);

  const { toast } = useToast();

  const {
    currentExport,
    isExporting: hookIsExporting,
    exportHistory,
    historyLoading,
    startExport,
    cancelExport,
    downloadExport,
    deleteHistoryRecord,
    refreshHistory,
    validateFilters,
  } = useBudgetExport({
    clientId: coupleId,
    onExportComplete: (exportId, downloadUrl) => {
      toast({
        title: 'Export completed',
        description: 'Your budget report is ready for download.',
      });
      onExportComplete?.(exportId);
    },
    onExportError: (error) => {
      toast({
        title: 'Export failed',
        description: error,
        variant: 'destructive',
      });
    },
  });

  // Get available categories from budget data
  const availableCategories = budgetData.categories.map((cat) => cat.name);

  const handleExportOptionsChange = useCallback(
    (newOptions: Partial<ExportOptions>) => {
      setExportOptions((prev) => ({ ...prev, ...newOptions }));
    },
    [],
  );

  const handleStartExport = useCallback(async () => {
    try {
      setIsExporting(true);

      // Validate filters
      const validationErrors = validateFilters(exportOptions.filters);
      if (validationErrors.length > 0) {
        toast({
          title: 'Invalid export settings',
          description: validationErrors.join(', '),
          variant: 'destructive',
        });
        return;
      }

      // Start the export process
      await startExport(exportOptions);

      toast({
        title: 'Export started',
        description:
          'Your budget report is being generated. This may take a few moments.',
      });
    } catch (error) {
      toast({
        title: 'Failed to start export',
        description:
          error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  }, [exportOptions, startExport, validateFilters, toast]);

  const handleCancelExport = useCallback(async () => {
    if (currentExport) {
      try {
        await cancelExport(currentExport.exportId);
        toast({
          title: 'Export cancelled',
          description: 'Your export has been cancelled.',
        });
      } catch (error) {
        toast({
          title: 'Failed to cancel export',
          description: error instanceof Error ? error.message : 'Unknown error',
          variant: 'destructive',
        });
      }
    }
  }, [currentExport, cancelExport, toast]);

  const handleDownloadFromHistory = useCallback(
    async (record: any) => {
      try {
        await downloadExport(record.id);
      } catch (error) {
        toast({
          title: 'Download failed',
          description:
            error instanceof Error
              ? error.message
              : 'Failed to download export',
          variant: 'destructive',
        });
      }
    },
    [downloadExport, toast],
  );

  const handleDeleteFromHistory = useCallback(
    async (recordId: string) => {
      try {
        await deleteHistoryRecord(recordId);
        toast({
          title: 'Export deleted',
          description: 'The export has been removed from your history.',
        });
      } catch (error) {
        toast({
          title: 'Failed to delete',
          description: error instanceof Error ? error.message : 'Unknown error',
          variant: 'destructive',
        });
      }
    },
    [deleteHistoryRecord, toast],
  );

  // Check if we have data to export
  const hasData =
    budgetData.categories.length > 0 || budgetData.transactions.length > 0;

  return (
    <ErrorBoundary
      fallback={<div>Something went wrong with the export dialog.</div>}
    >
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent
          className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
          aria-label="Budget export dialog"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Export Budget Report
            </DialogTitle>
            <DialogDescription>
              Generate and download your wedding budget in various formats.
              Choose your preferred format and customize the export settings.
            </DialogDescription>
          </DialogHeader>

          {!hasData && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                No budget data available to export. Add some categories or
                transactions first.
              </AlertDescription>
            </Alert>
          )}

          {/* Tab Navigation */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('export')}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg ${
                activeTab === 'export'
                  ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              aria-label="Export settings tab"
            >
              <Download className="h-4 w-4 inline mr-2" />
              New Export
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg ${
                activeTab === 'history'
                  ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              aria-label="Export history tab"
            >
              <History className="h-4 w-4 inline mr-2" />
              History ({exportHistory.length})
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {activeTab === 'export' && (
              <div className="space-y-6 p-4">
                {/* Current export progress */}
                {(currentExport || hookIsExporting) && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-medium text-blue-900 mb-2">
                      Export in Progress
                    </h3>
                    <ExportProgress
                      exportId={currentExport?.exportId || ''}
                      status={currentExport?.status || 'preparing'}
                      progress={currentExport?.progress}
                      message={currentExport?.message}
                      onComplete={() => {
                        refreshHistory();
                        setActiveTab('history');
                      }}
                      onCancel={handleCancelExport}
                    />
                  </div>
                )}

                {/* Format Selection */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Choose Export Format
                  </h3>
                  <ExportFormatSelector
                    selectedFormat={exportOptions.format}
                    onFormatChange={(format) =>
                      handleExportOptionsChange({ format })
                    }
                    isDisabled={hookIsExporting || !hasData}
                  />
                </div>

                {/* Export Filters */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">
                    Filter Options
                  </h3>
                  <ExportFilters
                    filters={exportOptions.filters}
                    onFiltersChange={(filters) =>
                      handleExportOptionsChange({ filters })
                    }
                    availableCategories={availableCategories}
                    isLoading={hookIsExporting}
                  />
                </div>

                {/* Additional Options */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">
                    Additional Options
                  </h3>
                  <div className="space-y-3">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={exportOptions.includeCharts}
                        onChange={(e) =>
                          handleExportOptionsChange({
                            includeCharts: e.target.checked,
                          })
                        }
                        disabled={hookIsExporting || !hasData}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">
                        Include charts and graphs
                      </span>
                    </label>

                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={exportOptions.includeSummary}
                        onChange={(e) =>
                          handleExportOptionsChange({
                            includeSummary: e.target.checked,
                          })
                        }
                        disabled={hookIsExporting || !hasData}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">
                        Include summary section
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="p-4">
                <ExportHistory
                  userId={coupleId}
                  clientId={coupleId}
                  onDownload={handleDownloadFromHistory}
                  onDelete={handleDeleteFromHistory}
                  maxRecords={20}
                />
                {historyLoading && (
                  <div className="flex justify-center py-4">
                    <LoadingSpinner size="sm" />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex justify-between items-center pt-4 border-t border-gray-200">
            <div className="text-sm text-gray-500">
              {hasData && (
                <>
                  {budgetData.categories.length} categories,{' '}
                  {budgetData.transactions.length} transactions
                </>
              )}
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={hookIsExporting}
              >
                {hookIsExporting ? 'Exporting...' : 'Close'}
              </Button>

              {activeTab === 'export' && (
                <Button
                  onClick={handleStartExport}
                  disabled={isExporting || hookIsExporting || !hasData}
                  className="min-w-[120px]"
                >
                  {isExporting || hookIsExporting ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Start Export
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </ErrorBoundary>
  );
}

export default BudgetExportDialog;
