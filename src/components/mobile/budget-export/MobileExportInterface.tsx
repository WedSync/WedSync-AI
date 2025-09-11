/**
 * WS-166 Mobile Export Interface Component
 * Team D - Round 1 Implementation
 *
 * Touch-friendly export interface with gesture support and mobile optimizations
 */

'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, PanInfo, AnimatePresence } from 'framer-motion';
import {
  Download,
  Share2,
  FileText,
  Table,
  FileSpreadsheet,
  ChevronDown,
  X,
  Clock,
  Wifi,
  WifiOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Battery,
  Smartphone,
} from 'lucide-react';

import {
  ExportRequest,
  DeviceInfo,
} from '@/lib/performance/budget-export/export-optimizer';
import {
  ExportQueueItem,
  ExportStatus,
} from '@/lib/performance/budget-export/mobile-export-queue';
import { QuickExportOptions } from '@/lib/performance/budget-export/wedme-export-integration';

interface MobileExportInterfaceProps {
  weddingId: string;
  onExportStart: (request: ExportRequest) => Promise<string>;
  onExportCancel: (exportId: string) => Promise<void>;
  className?: string;
}

interface TouchGesture {
  startX: number;
  startY: number;
  deltaX: number;
  deltaY: number;
  velocity: number;
  direction: 'up' | 'down' | 'left' | 'right' | 'none';
}

interface ExportProgress {
  exportId: string;
  progress: number;
  phase: 'preparing' | 'collecting' | 'generating' | 'completing';
  estimatedTimeRemaining: number;
  canCancel: boolean;
}

const EXPORT_FORMATS = [
  {
    value: 'csv' as const,
    label: 'CSV Spreadsheet',
    icon: Table,
    size: 'Small',
    description: 'Basic data for Excel/Sheets',
    optimized: true,
  },
  {
    value: 'pdf' as const,
    label: 'PDF Report',
    icon: FileText,
    size: 'Medium',
    description: 'Professional report format',
    optimized: false,
  },
  {
    value: 'excel' as const,
    label: 'Excel Workbook',
    icon: FileSpreadsheet,
    size: 'Large',
    description: 'Full-featured spreadsheet',
    optimized: false,
  },
  {
    value: 'json' as const,
    label: 'JSON Data',
    icon: Download,
    size: 'Small',
    description: 'Raw data for developers',
    optimized: true,
  },
];

const QUICK_EXPORT_TEMPLATES = [
  {
    id: 'vendor-share',
    name: 'Share with Vendor',
    description: 'Quick PDF for vendor meetings',
    icon: Share2,
    format: 'pdf' as const,
    includePersonal: false,
  },
  {
    id: 'monthly-summary',
    name: 'Monthly Summary',
    description: "This month's spending",
    icon: Clock,
    format: 'csv' as const,
    includePersonal: true,
  },
  {
    id: 'full-report',
    name: 'Complete Report',
    description: 'All budget data',
    icon: FileText,
    format: 'excel' as const,
    includePersonal: true,
  },
];

export const MobileExportInterface: React.FC<MobileExportInterfaceProps> = ({
  weddingId,
  onExportStart,
  onExportCancel,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<
    'csv' | 'pdf' | 'excel' | 'json'
  >('csv');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(
    null,
  );
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [panelHeight, setPanelHeight] = useState(0);
  const [dragConstraints, setDragConstraints] = useState({ top: 0, bottom: 0 });

  // Touch gesture handling
  const [touchGesture, setTouchGesture] = useState<TouchGesture | null>(null);
  const [hapticSupport, setHapticSupport] = useState(false);

  // Initialize device capabilities
  useEffect(() => {
    const initializeDevice = async () => {
      try {
        // Detect device capabilities
        const memory = (navigator as any).deviceMemory || 4;
        const connection = (navigator as any).connection;
        const isLowEnd = memory <= 2 || window.innerWidth <= 375;

        const info: DeviceInfo = {
          memory,
          connectionType: connection?.effectiveType || '4g',
          screenWidth: window.innerWidth,
          userAgent: navigator.userAgent,
          isLowEndDevice: isLowEnd,
        };

        setDeviceInfo(info);

        // Check for haptic feedback support
        setHapticSupport('vibrate' in navigator);

        // Monitor battery if available
        if ('getBattery' in navigator) {
          const battery = await (navigator as any).getBattery();
          setBatteryLevel(battery.level);

          battery.addEventListener('levelchange', () => {
            setBatteryLevel(battery.level);
          });
        }
      } catch (error) {
        console.error('Error initializing device capabilities:', error);
      }
    };

    initializeDevice();
  }, []);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Haptic feedback helper
  const triggerHapticFeedback = useCallback(
    (type: 'light' | 'medium' | 'heavy' = 'light') => {
      if (hapticSupport) {
        const patterns = {
          light: [10],
          medium: [20],
          heavy: [50],
        };
        navigator.vibrate(patterns[type]);
      }
    },
    [hapticSupport],
  );

  // Handle touch gestures
  const handlePanStart = useCallback((event: any, info: PanInfo) => {
    setTouchGesture({
      startX: info.point.x,
      startY: info.point.y,
      deltaX: 0,
      deltaY: 0,
      velocity: 0,
      direction: 'none',
    });
  }, []);

  const handlePanEnd = useCallback(
    (event: any, info: PanInfo) => {
      if (!touchGesture) return;

      const deltaY = info.point.y - touchGesture.startY;
      const velocity = Math.abs(info.velocity.y);

      // Swipe down to close
      if (deltaY > 100 && velocity > 500) {
        setIsOpen(false);
        triggerHapticFeedback('medium');
      }

      setTouchGesture(null);
    },
    [touchGesture, triggerHapticFeedback],
  );

  // Handle export initiation
  const handleExport = useCallback(
    async (
      format: typeof selectedFormat,
      template?: (typeof QUICK_EXPORT_TEMPLATES)[0],
    ) => {
      if (isExporting) return;

      try {
        setIsExporting(true);
        triggerHapticFeedback('medium');

        const exportRequest: ExportRequest = {
          weddingId,
          format,
          includeVendors: true,
          includeTransactions: true,
          ...(template && {
            groupBy: 'category',
          }),
        };

        const exportId = await onExportStart(exportRequest);

        // Start progress tracking
        setExportProgress({
          exportId,
          progress: 0,
          phase: 'preparing',
          estimatedTimeRemaining: 30,
          canCancel: true,
        });

        // Close interface after starting
        setTimeout(() => setIsOpen(false), 1000);
      } catch (error) {
        console.error('Error starting export:', error);
        setIsExporting(false);
        triggerHapticFeedback('heavy');
      }
    },
    [weddingId, isExporting, onExportStart, triggerHapticFeedback],
  );

  // Handle export cancellation
  const handleCancel = useCallback(async () => {
    if (!exportProgress || !exportProgress.canCancel) return;

    try {
      await onExportCancel(exportProgress.exportId);
      setExportProgress(null);
      setIsExporting(false);
      triggerHapticFeedback('medium');
    } catch (error) {
      console.error('Error cancelling export:', error);
    }
  }, [exportProgress, onExportCancel, triggerHapticFeedback]);

  // Optimized format recommendations
  const recommendedFormats = useMemo(() => {
    if (!deviceInfo) return EXPORT_FORMATS;

    return EXPORT_FORMATS.map((format) => ({
      ...format,
      recommended: deviceInfo.isLowEndDevice ? format.optimized : true,
      disabled: deviceInfo.isLowEndDevice && !format.optimized && !isOnline,
    }));
  }, [deviceInfo, isOnline]);

  // Render export progress
  const renderExportProgress = () => {
    if (!exportProgress) return null;

    const phaseLabels = {
      preparing: 'Preparing export...',
      collecting: 'Collecting data...',
      generating: 'Generating file...',
      completing: 'Finalizing...',
    };

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed bottom-4 left-4 right-4 z-50 bg-white rounded-xl shadow-2xl border border-gray-200 p-4"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
            <span className="text-sm font-medium text-gray-900">
              {phaseLabels[exportProgress.phase]}
            </span>
          </div>
          {exportProgress.canCancel && (
            <button
              onClick={handleCancel}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Cancel export"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          )}
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
          <motion.div
            className="bg-blue-600 h-2 rounded-full"
            initial={{ width: '0%' }}
            animate={{ width: `${exportProgress.progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>

        <div className="flex justify-between text-xs text-gray-600">
          <span>{exportProgress.progress}% complete</span>
          <span>{exportProgress.estimatedTimeRemaining}s remaining</span>
        </div>
      </motion.div>
    );
  };

  // Render device status indicators
  const renderDeviceStatus = () => (
    <div className="flex items-center space-x-3 mb-4 p-3 bg-gray-50 rounded-lg">
      {/* Network status */}
      <div className="flex items-center space-x-1">
        {isOnline ? (
          <Wifi className="w-4 h-4 text-green-600" />
        ) : (
          <WifiOff className="w-4 h-4 text-red-600" />
        )}
        <span className="text-xs text-gray-600">
          {isOnline ? 'Online' : 'Offline'}
        </span>
      </div>

      {/* Battery status */}
      {batteryLevel !== null && (
        <div className="flex items-center space-x-1">
          <Battery className="w-4 h-4 text-gray-600" />
          <span className="text-xs text-gray-600">
            {Math.round(batteryLevel * 100)}%
          </span>
        </div>
      )}

      {/* Device type indicator */}
      {deviceInfo?.isLowEndDevice && (
        <div className="flex items-center space-x-1">
          <Smartphone className="w-4 h-4 text-orange-600" />
          <span className="text-xs text-orange-600">Low-end device</span>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Floating action button */}
      <motion.button
        onClick={() => {
          setIsOpen(true);
          triggerHapticFeedback('light');
        }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`fixed bottom-6 right-6 z-40 bg-blue-600 text-white rounded-full p-4 shadow-lg hover:bg-blue-700 transition-colors ${className}`}
        aria-label="Export budget data"
      >
        <Download className="w-6 h-6" />
      </motion.button>

      {/* Export interface modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black bg-opacity-50"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              drag="y"
              dragConstraints={dragConstraints}
              onPanStart={handlePanStart}
              onPanEnd={handlePanEnd}
              className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Handle bar */}
              <div className="flex justify-center py-3 bg-gray-50 rounded-t-3xl">
                <div className="w-12 h-1 bg-gray-300 rounded-full" />
              </div>

              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Export Budget Data
                  </h3>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>

              <div className="px-6 py-4 overflow-y-auto max-h-[70vh]">
                {renderDeviceStatus()}

                {/* Quick export templates */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">
                    Quick Export
                  </h4>
                  <div className="grid grid-cols-1 gap-3">
                    {QUICK_EXPORT_TEMPLATES.map((template) => (
                      <motion.button
                        key={template.id}
                        onClick={() => handleExport(template.format, template)}
                        disabled={isExporting}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="flex items-center p-4 bg-blue-50 hover:bg-blue-100 rounded-xl border border-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        <template.icon className="w-5 h-5 text-blue-600 mr-3" />
                        <div className="flex-1 text-left">
                          <div className="text-sm font-medium text-gray-900">
                            {template.name}
                          </div>
                          <div className="text-xs text-gray-600">
                            {template.description}
                          </div>
                        </div>
                        <ChevronDown className="w-4 h-4 text-gray-400 rotate-[-90deg]" />
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Format selection */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">
                    Choose Format
                  </h4>
                  <div className="space-y-3">
                    {recommendedFormats.map((format) => (
                      <motion.label
                        key={format.value}
                        whileHover={{ scale: format.disabled ? 1 : 1.02 }}
                        whileTap={{ scale: format.disabled ? 1 : 0.98 }}
                        className={`flex items-center p-4 rounded-xl border cursor-pointer transition-all ${
                          format.disabled
                            ? 'bg-gray-50 border-gray-200 cursor-not-allowed opacity-60'
                            : selectedFormat === format.value
                              ? 'bg-blue-50 border-blue-300'
                              : 'bg-white border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="format"
                          value={format.value}
                          checked={selectedFormat === format.value}
                          onChange={(e) => {
                            if (!format.disabled) {
                              setSelectedFormat(e.target.value as any);
                              triggerHapticFeedback('light');
                            }
                          }}
                          disabled={format.disabled}
                          className="sr-only"
                        />
                        <format.icon
                          className={`w-5 h-5 mr-3 ${
                            format.disabled
                              ? 'text-gray-400'
                              : selectedFormat === format.value
                                ? 'text-blue-600'
                                : 'text-gray-600'
                          }`}
                        />
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span
                              className={`text-sm font-medium ${
                                format.disabled
                                  ? 'text-gray-400'
                                  : 'text-gray-900'
                              }`}
                            >
                              {format.label}
                            </span>
                            <span
                              className={`text-xs px-2 py-1 rounded-full ${
                                format.optimized
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}
                            >
                              {format.optimized ? 'Optimized' : format.size}
                            </span>
                          </div>
                          <div
                            className={`text-xs mt-1 ${
                              format.disabled
                                ? 'text-gray-400'
                                : 'text-gray-600'
                            }`}
                          >
                            {format.description}
                          </div>
                        </div>
                        {selectedFormat === format.value && (
                          <CheckCircle2 className="w-5 h-5 text-blue-600" />
                        )}
                      </motion.label>
                    ))}
                  </div>
                </div>

                {/* Export button */}
                <motion.button
                  onClick={() => handleExport(selectedFormat)}
                  disabled={isExporting}
                  whileHover={{ scale: isExporting ? 1 : 1.02 }}
                  whileTap={{ scale: isExporting ? 1 : 0.98 }}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-xl py-4 px-6 font-medium text-center disabled:cursor-not-allowed transition-all"
                >
                  {isExporting ? (
                    <div className="flex items-center justify-center space-x-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Starting Export...</span>
                    </div>
                  ) : (
                    `Export as ${EXPORT_FORMATS.find((f) => f.value === selectedFormat)?.label}`
                  )}
                </motion.button>

                {/* Offline notice */}
                {!isOnline && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 text-yellow-600" />
                      <span className="text-xs text-yellow-800">
                        You're offline. Exports will be queued until connection
                        is restored.
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Export progress */}
      <AnimatePresence>{renderExportProgress()}</AnimatePresence>
    </>
  );
};
