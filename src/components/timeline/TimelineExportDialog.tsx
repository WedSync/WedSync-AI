// =====================================================
// TIMELINE EXPORT DIALOG COMPONENT
// =====================================================
// Advanced export dialog with format selection and options
// Feature ID: WS-160 - Timeline Builder UI
// Created: 2025-01-20
// =====================================================

'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  FileSpreadsheet,
  Calendar,
  Download,
  Settings,
  CheckCircle,
  AlertCircle,
  X,
  Info,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import type {
  WeddingTimeline,
  TimelineEvent,
  TimelineExport,
} from '@/types/timeline';
import type {
  ExportOptions,
  ExportProgress,
  ExportResult,
} from '@/lib/services/timelineExportService';
import {
  TimelineExportService,
  downloadBlob,
  getExportFormatLabel,
  getExportFormatDescription,
  validateExportOptions,
} from '@/lib/services/timelineExportService';

// =====================================================
// COMPONENT TYPES
// =====================================================

interface TimelineExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  timeline: WeddingTimeline;
  events: TimelineEvent[];
  className?: string;
}

interface ExportFormat {
  key: TimelineExport['format'];
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  recommended?: boolean;
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export function TimelineExportDialog({
  isOpen,
  onClose,
  timeline,
  events,
  className = '',
}: TimelineExportDialogProps) {
  const [selectedFormat, setSelectedFormat] =
    useState<TimelineExport['format']>('pdf');
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'pdf',
    include_vendor_details: true,
    include_internal_notes: false,
    timezone: timeline.timezone,
    includeColors: true,
    includeNotes: true,
    pageOrientation: 'portrait',
    fontSize: 'medium',
    groupByCategory: false,
    showBufferTimes: false,
    showTravelTimes: false,
    includeEmptyEvents: false,
  });

  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(
    null,
  );
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // =====================================================
  // EXPORT FORMATS CONFIGURATION
  // =====================================================

  const exportFormats: ExportFormat[] = [
    {
      key: 'pdf',
      label: 'PDF Document',
      description:
        'Professional timeline document, perfect for printing and sharing',
      icon: FileText,
      recommended: true,
    },
    {
      key: 'excel',
      label: 'Excel Workbook',
      description:
        'Detailed spreadsheet with multiple sheets and advanced data',
      icon: FileSpreadsheet,
    },
    {
      key: 'csv',
      label: 'CSV File',
      description: 'Simple spreadsheet format compatible with all applications',
      icon: FileSpreadsheet,
    },
    {
      key: 'ical',
      label: 'iCal Calendar',
      description: 'Standard calendar format for Outlook, Apple Calendar, etc.',
      icon: Calendar,
    },
    {
      key: 'google',
      label: 'Google Calendar',
      description: 'Import directly into Google Calendar',
      icon: Calendar,
    },
  ];

  // =====================================================
  // EXPORT HANDLING
  // =====================================================

  const handleExport = useCallback(async () => {
    // Validate options
    const validation = validateExportOptions(exportOptions);
    if (!validation.valid) {
      setValidationErrors(validation.errors);
      return;
    }

    setValidationErrors([]);
    setIsExporting(true);
    setExportProgress(null);
    setExportResult(null);

    try {
      const exportService = new TimelineExportService(setExportProgress);
      const result = await exportService.exportTimeline(
        timeline,
        events,
        exportOptions,
      );

      setExportResult(result);

      if (result.success && result.blob) {
        // Auto-download the file
        downloadBlob(result.blob, result.filename);

        // Close dialog after successful export
        setTimeout(() => {
          onClose();
          setExportResult(null);
          setExportProgress(null);
        }, 2000);
      }
    } catch (error) {
      console.error('Export failed:', error);
      setExportResult({
        success: false,
        filename: 'export_error.txt',
        error: error instanceof Error ? error.message : 'Unknown export error',
      });
    } finally {
      setIsExporting(false);
    }
  }, [timeline, events, exportOptions, onClose]);

  // =====================================================
  // OPTION HANDLERS
  // =====================================================

  const handleFormatChange = (format: TimelineExport['format']) => {
    setSelectedFormat(format);
    setExportOptions((prev) => ({ ...prev, format }));
  };

  const handleOptionChange = <K extends keyof ExportOptions>(
    key: K,
    value: ExportOptions[K],
  ) => {
    setExportOptions((prev) => ({ ...prev, [key]: value }));
  };

  // Update selected format when options change
  useEffect(() => {
    setSelectedFormat(exportOptions.format);
  }, [exportOptions.format]);

  // =====================================================
  // RENDER HELPERS
  // =====================================================

  const renderFormatCard = (format: ExportFormat) => {
    const Icon = format.icon;
    const isSelected = selectedFormat === format.key;

    return (
      <motion.button
        key={format.key}
        onClick={() => handleFormatChange(format.key)}
        className={`
          relative w-full p-4 rounded-lg border-2 text-left transition-all duration-200
          ${
            isSelected
              ? 'border-blue-500 bg-blue-50 shadow-md'
              : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
          }
        `}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="flex items-start space-x-3">
          <div
            className={`
            p-2 rounded-lg
            ${isSelected ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}
          `}
          >
            <Icon className="h-5 w-5" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <h4
                className={`font-medium ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}
              >
                {format.label}
              </h4>
              {format.recommended && (
                <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full font-medium">
                  Recommended
                </span>
              )}
            </div>
            <p
              className={`text-sm mt-1 ${isSelected ? 'text-blue-700' : 'text-gray-600'}`}
            >
              {format.description}
            </p>
          </div>

          {isSelected && (
            <CheckCircle className="h-5 w-5 text-blue-500 flex-shrink-0" />
          )}
        </div>
      </motion.button>
    );
  };

  const renderExportOptions = () => {
    return (
      <div className="space-y-6">
        {/* Content Options */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Content Options</h4>
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={exportOptions.include_vendor_details}
                onChange={(e) =>
                  handleOptionChange('include_vendor_details', e.target.checked)
                }
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-3 text-sm text-gray-700">
                Include vendor details
              </span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={exportOptions.include_internal_notes}
                onChange={(e) =>
                  handleOptionChange('include_internal_notes', e.target.checked)
                }
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-3 text-sm text-gray-700">
                Include internal notes
              </span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={exportOptions.includeNotes || false}
                onChange={(e) =>
                  handleOptionChange('includeNotes', e.target.checked)
                }
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-3 text-sm text-gray-700">
                Include event descriptions
              </span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={exportOptions.showBufferTimes || false}
                onChange={(e) =>
                  handleOptionChange('showBufferTimes', e.target.checked)
                }
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-3 text-sm text-gray-700">
                Show buffer times
              </span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={exportOptions.groupByCategory || false}
                onChange={(e) =>
                  handleOptionChange('groupByCategory', e.target.checked)
                }
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-3 text-gray-700">
                Group events by category
              </span>
            </label>
          </div>
        </div>

        {/* PDF-specific options */}
        {selectedFormat === 'pdf' && (
          <div>
            <h4 className="font-medium text-gray-900 mb-3">PDF Options</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Page Orientation
                </label>
                <select
                  value={exportOptions.pageOrientation || 'portrait'}
                  onChange={(e) =>
                    handleOptionChange(
                      'pageOrientation',
                      e.target.value as 'portrait' | 'landscape',
                    )
                  }
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="portrait">Portrait</option>
                  <option value="landscape">Landscape</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Font Size
                </label>
                <select
                  value={exportOptions.fontSize || 'medium'}
                  onChange={(e) =>
                    handleOptionChange(
                      'fontSize',
                      e.target.value as 'small' | 'medium' | 'large',
                    )
                  }
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Custom Footer */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Custom Footer (Optional)
          </label>
          <input
            type="text"
            value={exportOptions.customFooter || ''}
            onChange={(e) => handleOptionChange('customFooter', e.target.value)}
            placeholder="e.g., Created by Your Wedding Planner"
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className={`
            relative w-full max-w-4xl max-h-[90vh] mx-4 bg-white rounded-xl shadow-xl
            overflow-hidden ${className}
          `}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Export Timeline
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Export "{timeline.name}" (
                {format(new Date(timeline.wedding_date), 'MMM dd, yyyy')})
              </p>
            </div>

            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {!isExporting && !exportResult && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Format Selection */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Choose Format
                  </h3>
                  <div className="space-y-3">
                    {exportFormats.map(renderFormatCard)}
                  </div>
                </div>

                {/* Export Options */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <Settings className="h-5 w-5 mr-2" />
                    Export Options
                  </h3>
                  {renderExportOptions()}
                </div>
              </div>
            )}

            {/* Export Progress */}
            {isExporting && exportProgress && (
              <div className="text-center py-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4"
                >
                  <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
                </motion.div>

                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Exporting Timeline
                </h3>

                <p className="text-gray-600 mb-4">{exportProgress.message}</p>

                <div className="max-w-xs mx-auto">
                  <div className="bg-gray-200 rounded-full h-2">
                    <motion.div
                      className="bg-blue-600 h-2 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${exportProgress.progress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    {exportProgress.progress}% complete
                    {exportProgress.estimatedTimeRemaining &&
                      ` • ${Math.round(exportProgress.estimatedTimeRemaining / 1000)}s remaining`}
                  </p>
                </div>
              </div>
            )}

            {/* Export Result */}
            {exportResult && (
              <div className="text-center py-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className={`
                    inline-flex items-center justify-center w-16 h-16 rounded-full mb-4
                    ${
                      exportResult.success
                        ? 'bg-green-100 text-green-600'
                        : 'bg-red-100 text-red-600'
                    }
                  `}
                >
                  {exportResult.success ? (
                    <CheckCircle className="h-8 w-8" />
                  ) : (
                    <AlertCircle className="h-8 w-8" />
                  )}
                </motion.div>

                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {exportResult.success ? 'Export Complete!' : 'Export Failed'}
                </h3>

                <p className="text-gray-600 mb-4">
                  {exportResult.success
                    ? `Your timeline has been exported as ${exportResult.filename}`
                    : `Error: ${exportResult.error}`}
                </p>

                {exportResult.success && exportResult.size && (
                  <p className="text-sm text-gray-500">
                    File size: {Math.round(exportResult.size / 1024)} KB
                  </p>
                )}
              </div>
            )}

            {/* Validation Errors */}
            {validationErrors.length > 0 && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start">
                  <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <div className="ml-3">
                    <h4 className="font-medium text-red-900">
                      Export Configuration Errors
                    </h4>
                    <ul className="mt-2 text-sm text-red-700 list-disc list-inside space-y-1">
                      {validationErrors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          {!isExporting && !exportResult && (
            <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center text-sm text-gray-600">
                <Info className="h-4 w-4 mr-2" />
                {events.length} events will be exported
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>

                <button
                  onClick={handleExport}
                  disabled={validationErrors.length > 0}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export {getExportFormatLabel(selectedFormat)}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
