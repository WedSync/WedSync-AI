'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Download,
  X,
} from 'lucide-react';
import { BulkOperationProgress } from '@/lib/bulk/bulk-operations';

interface BulkProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  operation: string;
  progress: BulkOperationProgress | null;
  onRetry?: () => void;
  onDownloadReport?: () => void;
}

export function BulkProgressModal({
  isOpen,
  onClose,
  operation,
  progress,
  onRetry,
  onDownloadReport,
}: BulkProgressModalProps) {
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<
    number | null
  >(null);
  const [startTime] = useState(Date.now());

  // Calculate estimated time remaining
  useEffect(() => {
    if (!progress || progress.percentage === 0) {
      setEstimatedTimeRemaining(null);
      return;
    }

    const elapsed = Date.now() - startTime;
    const rate = progress.percentage / 100;
    const totalEstimated = elapsed / rate;
    const remaining = totalEstimated - elapsed;

    setEstimatedTimeRemaining(Math.max(0, Math.round(remaining / 1000)));
  }, [progress, startTime]);

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getOperationLabel = () => {
    switch (operation) {
      case 'status_update':
        return 'Updating Status';
      case 'tag_add':
        return 'Adding Tags';
      case 'tag_remove':
        return 'Removing Tags';
      case 'delete':
        return 'Deleting Clients';
      case 'export':
        return 'Exporting Data';
      case 'email':
        return 'Sending Emails';
      case 'form':
        return 'Sending Forms';
      default:
        return 'Processing';
    }
  };

  const isComplete = progress?.percentage === 100;
  const hasFailed = progress && progress.failed > 0;
  const isProcessing = progress && !isComplete;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm"
          onClick={isComplete ? onClose : undefined}
        />

        {/* Modal */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="relative w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              {getOperationLabel()}
            </h3>
            {isComplete && (
              <button
                onClick={onClose}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            )}
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Progress Circle */}
            <div className="flex justify-center">
              <div className="relative w-32 h-32">
                <svg className="w-32 h-32 transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="currentColor"
                    strokeWidth="12"
                    fill="none"
                    className="text-gray-200"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="currentColor"
                    strokeWidth="12"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 56}`}
                    strokeDashoffset={`${2 * Math.PI * 56 * (1 - (progress?.percentage || 0) / 100)}`}
                    className={
                      hasFailed
                        ? 'text-amber-500'
                        : isComplete
                          ? 'text-green-500'
                          : 'text-blue-500'
                    }
                    style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  {isComplete ? (
                    hasFailed ? (
                      <AlertTriangle className="w-8 h-8 text-amber-500" />
                    ) : (
                      <CheckCircle className="w-8 h-8 text-green-500" />
                    )
                  ) : (
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">
                        {progress?.percentage || 0}%
                      </div>
                      {estimatedTimeRemaining !== null && (
                        <div className="text-xs text-gray-500">
                          ~{formatTime(estimatedTimeRemaining)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Progress Details */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Total Items</span>
                <span className="font-medium text-gray-900">
                  {progress?.total || 0}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Completed</span>
                <span className="font-medium text-green-600">
                  {progress?.completed || 0}
                </span>
              </div>

              {hasFailed && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Failed</span>
                  <span className="font-medium text-red-600">
                    {progress?.failed || 0}
                  </span>
                </div>
              )}

              {isProcessing && progress && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Batch</span>
                  <span className="font-medium text-gray-900">
                    {progress.currentBatch} of {progress.totalBatches}
                  </span>
                </div>
              )}
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress?.percentage || 0}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className={
                    hasFailed
                      ? 'bg-amber-500'
                      : isComplete
                        ? 'bg-green-500'
                        : 'bg-blue-500'
                  }
                  style={{ height: '100%' }}
                />
              </div>

              {isProcessing && (
                <p className="text-xs text-center text-gray-500">
                  Processing in batches for optimal performance...
                </p>
              )}
            </div>

            {/* Error Details */}
            {hasFailed && progress?.errors && progress.errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-red-500 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-red-900 mb-2">
                      {progress.errors.length} Error
                      {progress.errors.length !== 1 ? 's' : ''} Occurred
                    </h4>
                    <div className="max-h-24 overflow-y-auto space-y-1">
                      {progress.errors.slice(0, 3).map((error, index) => (
                        <p key={index} className="text-xs text-red-700">
                          • {error.error}
                        </p>
                      ))}
                      {progress.errors.length > 3 && (
                        <p className="text-xs text-red-600 font-medium">
                          ... and {progress.errors.length - 3} more
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Success Message */}
            {isComplete && !hasFailed && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-green-900 mb-1">
                      Operation Completed Successfully
                    </h4>
                    <p className="text-xs text-green-700">
                      All {progress?.total} items were processed successfully.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          {isComplete && (
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              {hasFailed && onRetry && (
                <button
                  onClick={onRetry}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span className="text-sm font-medium">Retry Failed</span>
                </button>
              )}

              {onDownloadReport && (
                <button
                  onClick={onDownloadReport}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span className="text-sm font-medium">Download Report</span>
                </button>
              )}

              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                <span className="text-sm font-medium">Close</span>
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

// Mobile-optimized progress indicator (bottom sheet style)
export function MobileBulkProgress({
  operation,
  progress,
}: {
  operation: string;
  progress: BulkOperationProgress | null;
}) {
  if (!progress || progress.percentage === 100) return null;

  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      exit={{ y: 100 }}
      className="fixed bottom-20 left-4 right-4 z-30 md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4">
        <div className="flex items-center gap-4">
          {/* Spinner */}
          <div className="relative w-10 h-10">
            <div className="absolute inset-0 border-4 border-gray-200 rounded-full" />
            <div className="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent animate-spin" />
          </div>

          {/* Progress Info */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-medium text-gray-900">
                {getOperationLabel(operation)}
              </p>
              <span className="text-sm font-bold text-blue-600">
                {progress.percentage}%
              </span>
            </div>

            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>

            <p className="text-xs text-gray-500 mt-1">
              {progress.completed} of {progress.total} processed
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function getOperationLabel(operation: string): string {
  switch (operation) {
    case 'status_update':
      return 'Updating Status';
    case 'tag_add':
      return 'Adding Tags';
    case 'tag_remove':
      return 'Removing Tags';
    case 'delete':
      return 'Deleting Clients';
    case 'export':
      return 'Exporting Data';
    case 'email':
      return 'Sending Emails';
    case 'form':
      return 'Sending Forms';
    default:
      return 'Processing';
  }
}
