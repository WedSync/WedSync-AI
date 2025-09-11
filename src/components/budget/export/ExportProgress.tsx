'use client';

import React, { useEffect, useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import {
  Download,
  X,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ExportProgressProps, ExportStatus } from '@/types/budget-export';

/**
 * ExportProgress - Real-time progress tracking for export generation
 * Shows progress bar, status messages, and action buttons based on export state
 */
export function ExportProgress({
  exportId,
  status,
  progress = 0,
  message = '',
  onComplete,
  onCancel,
  onRetry,
}: ExportProgressProps) {
  const [displayProgress, setDisplayProgress] = useState(progress);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<
    number | null
  >(null);

  // Smooth progress animation
  useEffect(() => {
    if (progress > displayProgress) {
      const increment = (progress - displayProgress) / 10;
      const timer = setInterval(() => {
        setDisplayProgress((prev) => {
          const next = prev + increment;
          if (next >= progress) {
            clearInterval(timer);
            return progress;
          }
          return next;
        });
      }, 50);

      return () => clearInterval(timer);
    } else {
      setDisplayProgress(progress);
    }
  }, [progress, displayProgress]);

  // Calculate estimated time remaining based on progress
  useEffect(() => {
    if (status === 'generating' && progress > 0 && progress < 100) {
      const elapsed = Date.now(); // This would need to be calculated from actual start time
      const estimated = (elapsed / progress) * (100 - progress);
      setEstimatedTimeRemaining(estimated);
    } else {
      setEstimatedTimeRemaining(null);
    }
  }, [status, progress]);

  const getStatusConfig = (currentStatus: ExportStatus) => {
    switch (currentStatus) {
      case 'idle':
        return {
          icon: Clock,
          color: 'text-gray-500',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          title: 'Ready to Export',
          canCancel: false,
          canRetry: false,
        };
      case 'preparing':
        return {
          icon: Loader2,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          title: 'Preparing Export',
          canCancel: true,
          canRetry: false,
        };
      case 'generating':
        return {
          icon: Loader2,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          title: 'Generating Report',
          canCancel: true,
          canRetry: false,
        };
      case 'completed':
        return {
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          title: 'Export Complete',
          canCancel: false,
          canRetry: false,
        };
      case 'failed':
        return {
          icon: AlertCircle,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          title: 'Export Failed',
          canCancel: false,
          canRetry: true,
        };
      case 'cancelled':
        return {
          icon: X,
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          title: 'Export Cancelled',
          canCancel: false,
          canRetry: true,
        };
      default:
        return {
          icon: Clock,
          color: 'text-gray-500',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          title: 'Unknown Status',
          canCancel: false,
          canRetry: false,
        };
    }
  };

  const statusConfig = getStatusConfig(status);
  const StatusIcon = statusConfig.icon;
  const isAnimating = status === 'preparing' || status === 'generating';

  const formatTimeRemaining = (milliseconds: number): string => {
    const seconds = Math.ceil(milliseconds / 1000);
    if (seconds < 60) {
      return `${seconds}s remaining`;
    }
    const minutes = Math.ceil(seconds / 60);
    return `${minutes}m remaining`;
  };

  return (
    <div
      className={cn(
        'rounded-lg border p-4 space-y-4',
        statusConfig.bgColor,
        statusConfig.borderColor,
      )}
    >
      {/* Status Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StatusIcon
            className={cn(
              'h-5 w-5',
              statusConfig.color,
              isAnimating && 'animate-spin',
            )}
          />
          <h3 className="font-medium text-gray-900">{statusConfig.title}</h3>
        </div>

        <div className="flex items-center gap-2">
          {status === 'completed' && (
            <Button
              size="sm"
              onClick={() => onComplete('download-url-here')} // This would come from API
              className="flex items-center gap-1"
            >
              <Download className="h-4 w-4" />
              Download
            </Button>
          )}

          {statusConfig.canCancel && onCancel && (
            <Button
              variant="outline"
              size="sm"
              onClick={onCancel}
              className="flex items-center gap-1"
            >
              <X className="h-4 w-4" />
              Cancel
            </Button>
          )}

          {statusConfig.canRetry && onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="flex items-center gap-1"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
          )}
        </div>
      </div>

      {/* Progress Bar (for generating states) */}
      {(status === 'preparing' || status === 'generating') && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Progress</span>
            <span className="font-medium">{Math.round(displayProgress)}%</span>
          </div>
          <Progress
            value={displayProgress}
            className="h-2"
            aria-label={`Export progress: ${Math.round(displayProgress)}%`}
          />
          {estimatedTimeRemaining && (
            <div className="text-xs text-gray-500 text-right">
              {formatTimeRemaining(estimatedTimeRemaining)}
            </div>
          )}
        </div>
      )}

      {/* Status Message */}
      {message && (
        <div className="text-sm text-gray-700 bg-white bg-opacity-50 rounded p-2">
          {message}
        </div>
      )}

      {/* Export Details */}
      <div className="text-xs text-gray-500 space-y-1">
        <div>Export ID: {exportId}</div>
        {status === 'generating' && (
          <div className="flex items-center gap-2">
            <LoadingSpinner size="sm" />
            <span>Processing your budget data...</span>
          </div>
        )}
      </div>

      {/* Completion Success */}
      {status === 'completed' && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Your budget report has been generated successfully. Click the
            download button to save it to your device.
          </AlertDescription>
        </Alert>
      )}

      {/* Error State */}
      {status === 'failed' && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {message ||
              'The export failed due to an unexpected error. Please try again or contact support if the problem persists.'}
          </AlertDescription>
        </Alert>
      )}

      {/* Cancelled State */}
      {status === 'cancelled' && (
        <Alert className="border-orange-200 bg-orange-50">
          <X className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            The export was cancelled. You can start a new export at any time.
          </AlertDescription>
        </Alert>
      )}

      {/* Progress Steps for detailed status */}
      {(status === 'preparing' || status === 'generating') && (
        <div className="space-y-2 pt-2 border-t border-gray-200">
          <div className="text-xs font-medium text-gray-600">Export Steps:</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <div
              className={cn(
                'flex items-center gap-1 p-2 rounded',
                progress >= 0
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-500',
              )}
            >
              <CheckCircle className="h-3 w-3" />
              <span>Data Collection</span>
            </div>
            <div
              className={cn(
                'flex items-center gap-1 p-2 rounded',
                progress >= 50
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-500',
              )}
            >
              {progress >= 50 ? (
                <CheckCircle className="h-3 w-3" />
              ) : (
                <Clock className="h-3 w-3" />
              )}
              <span>Report Generation</span>
            </div>
            <div
              className={cn(
                'flex items-center gap-1 p-2 rounded',
                progress >= 90
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-500',
              )}
            >
              {progress >= 90 ? (
                <CheckCircle className="h-3 w-3" />
              ) : (
                <Clock className="h-3 w-3" />
              )}
              <span>File Preparation</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ExportProgress;
