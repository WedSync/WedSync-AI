'use client';

import React, { useState, useCallback } from 'react';
import { useErrorRecovery } from '@/hooks/useErrorRecovery';
import { OfflineError } from '@/lib/offline/offline-error-handler';
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Wifi,
  WifiOff,
  Settings,
  HelpCircle,
  MessageSquare,
  X,
  ChevronDown,
  ChevronUp,
  Zap,
  Clock,
  Shield,
  ExternalLink,
  Loader2,
  Calendar,
  Users,
} from 'lucide-react';

interface ErrorRecoveryPanelProps {
  className?: string;
  variant?: 'compact' | 'detailed' | 'modal';
  autoHide?: boolean;
  weddingContext?: {
    weddingId: string;
    weddingDate: string;
    isWeddingDay: boolean;
  };
  onClose?: () => void;
  onErrorResolved?: (errorId: string) => void;
}

export const ErrorRecoveryPanel: React.FC<ErrorRecoveryPanelProps> = ({
  className = '',
  variant = 'detailed',
  autoHide = false,
  weddingContext,
  onClose,
  onErrorResolved,
}) => {
  const [isExpanded, setIsExpanded] = useState(variant === 'detailed');
  const [selectedError, setSelectedError] = useState<string | null>(null);
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportDescription, setReportDescription] = useState('');

  const [state, actions] = useErrorRecovery({
    autoRecovery: true,
    monitorConnection: true,
    trackErrorHistory: true,
    weddingContext,
    onRecovery: (errorId) => {
      if (onErrorResolved) {
        onErrorResolved(errorId);
      }
      if (autoHide && state.activeErrorCount <= 1) {
        onClose?.();
      }
    },
  });

  const {
    errors,
    activeErrorCount,
    criticalErrorCount,
    connectionState,
    isOnline,
    connectionQuality,
    isStableConnection,
    isRecovering,
    recoveryProgress,
    errorStats,
  } = state;

  const {
    resolveError,
    retryError,
    clearResolvedErrors,
    testConnection,
    forceReconnection,
    startRecovery,
    cancelRecovery,
    reportIssue,
    requestHelp,
  } = actions;

  // Filter active errors for display
  const activeErrors = errors.filter((error) => !error.resolved).slice(0, 10);
  const selectedErrorDetail = selectedError
    ? errors.find((e) => e.id === selectedError)
    : null;

  // Don't render if no errors and auto-hide is enabled
  if (autoHide && activeErrorCount === 0) {
    return null;
  }

  const getErrorIcon = (error: OfflineError) => {
    switch (error.severity) {
      case 'critical':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'high':
        return <AlertCircle className="w-4 h-4 text-orange-500" />;
      case 'medium':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-blue-500" />;
    }
  };

  const getErrorColor = (error: OfflineError) => {
    switch (error.severity) {
      case 'critical':
        return 'border-red-200 bg-red-50';
      case 'high':
        return 'border-orange-200 bg-orange-50';
      case 'medium':
        return 'border-yellow-200 bg-yellow-50';
      default:
        return 'border-blue-200 bg-blue-50';
    }
  };

  const getConnectionIcon = () => {
    if (!isOnline) return <WifiOff className="w-4 h-4 text-red-500" />;

    switch (connectionQuality) {
      case 'excellent':
        return <Wifi className="w-4 h-4 text-green-500" />;
      case 'good':
        return <Wifi className="w-4 h-4 text-green-400" />;
      case 'fair':
        return <Wifi className="w-4 h-4 text-yellow-500" />;
      case 'poor':
        return <Wifi className="w-4 h-4 text-orange-500" />;
      default:
        return <Wifi className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  const handleErrorAction = async (
    action: 'resolve' | 'retry',
    errorId: string,
  ) => {
    try {
      if (action === 'resolve') {
        await resolveError(errorId);
      } else {
        await retryError(errorId);
      }
    } catch (error) {
      console.error(`Failed to ${action} error:`, error);
    }
  };

  const handleReportSubmit = async () => {
    if (!reportDescription.trim()) return;

    try {
      reportIssue(reportDescription);
      setReportDescription('');
      setShowReportForm(false);
    } catch (error) {
      console.error('Failed to report issue:', error);
    }
  };

  const renderCompactVariant = () => (
    <div
      className={`inline-flex items-center gap-2 px-3 py-2 bg-white border rounded-lg shadow-sm ${
        criticalErrorCount > 0
          ? 'border-red-200 bg-red-50'
          : 'border-yellow-200 bg-yellow-50'
      } ${className}`}
    >
      {/* Status Icon */}
      {isRecovering ? (
        <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
      ) : criticalErrorCount > 0 ? (
        <AlertTriangle className="w-4 h-4 text-red-500" />
      ) : (
        <AlertCircle className="w-4 h-4 text-yellow-500" />
      )}

      {/* Error Count */}
      <span className="text-sm font-medium">
        {activeErrorCount} issue{activeErrorCount !== 1 ? 's' : ''}
      </span>

      {/* Quick Actions */}
      <div className="flex items-center gap-1 ml-2">
        {isRecovering ? (
          <button
            onClick={cancelRecovery}
            className="p-1 text-gray-500 hover:text-gray-700 rounded"
          >
            <X className="w-3 h-3" />
          </button>
        ) : (
          <button
            onClick={startRecovery}
            className="p-1 text-blue-500 hover:text-blue-700 rounded"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        )}

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 text-gray-500 hover:text-gray-700 rounded"
        >
          {isExpanded ? (
            <ChevronUp className="w-3 h-3" />
          ) : (
            <ChevronDown className="w-3 h-3" />
          )}
        </button>
      </div>
    </div>
  );

  const renderHeader = () => (
    <div className="flex items-center justify-between p-4 border-b border-gray-200">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          {isRecovering ? (
            <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
          ) : criticalErrorCount > 0 ? (
            <AlertTriangle className="w-5 h-5 text-red-500" />
          ) : (
            <AlertCircle className="w-5 h-5 text-yellow-500" />
          )}

          <h3 className="text-lg font-semibold text-gray-900">
            {isRecovering ? 'Recovering...' : 'System Status'}
          </h3>
        </div>

        {/* Wedding day indicator */}
        {weddingContext?.isWeddingDay && (
          <div className="flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded">
            <Calendar className="w-3 h-3" />
            Wedding Day
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Connection Status */}
        <div className="flex items-center gap-1 text-sm text-gray-600">
          {getConnectionIcon()}
          <span className="capitalize">{connectionQuality}</span>
        </div>

        {/* Close Button */}
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );

  const renderRecoveryProgress = () => {
    if (!isRecovering) return null;

    return (
      <div className="p-4 bg-blue-50 border-b border-blue-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-blue-900">
            Recovery in progress...
          </span>
          <span className="text-sm text-blue-700">{recoveryProgress}%</span>
        </div>

        <div className="w-full bg-blue-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${recoveryProgress}%` }}
          />
        </div>

        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-blue-700">
            Attempting to resolve {activeErrorCount} issues
          </span>
          <button
            onClick={cancelRecovery}
            className="text-xs text-blue-600 hover:text-blue-800 underline"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  };

  const renderStats = () => (
    <div className="p-4 bg-gray-50 border-b border-gray-200">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">
            {criticalErrorCount}
          </div>
          <div className="text-xs text-gray-600">Critical</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600">
            {activeErrorCount}
          </div>
          <div className="text-xs text-gray-600">Active</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">
            {errorStats.resolved}
          </div>
          <div className="text-xs text-gray-600">Resolved</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">
            {isStableConnection ? 'Stable' : 'Unstable'}
          </div>
          <div className="text-xs text-gray-600">Connection</div>
        </div>
      </div>
    </div>
  );

  const renderErrorList = () => (
    <div className="max-h-96 overflow-y-auto">
      {activeErrors.length === 0 ? (
        <div className="p-8 text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <h4 className="text-lg font-medium text-gray-900 mb-1">All Clear!</h4>
          <p className="text-sm text-gray-600">No active issues detected</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-200">
          {activeErrors.map((error) => (
            <div key={error.id} className="p-4 hover:bg-gray-50">
              <div className="flex items-start gap-3">
                {getErrorIcon(error)}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-medium text-gray-900 truncate">
                      {error.message}
                    </h4>

                    <div className="flex items-center gap-1">
                      {/* Priority indicators */}
                      {error.severity === 'critical' && (
                        <Zap className="w-3 h-3 text-red-500" />
                      )}

                      {error.context?.weddingContext?.isWeddingDay && (
                        <Calendar className="w-3 h-3 text-purple-500" />
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
                    <span className="capitalize">{error.type}</span>
                    <span className="capitalize">{error.severity}</span>
                    <span>{formatTimestamp(error.timestamp)}</span>
                    {error.recovery && (
                      <span>
                        {error.recovery.attempts}/{error.recovery.maxAttempts}{' '}
                        attempts
                      </span>
                    )}
                  </div>

                  {/* Error details */}
                  {selectedError === error.id && selectedErrorDetail && (
                    <div className="mt-2 p-2 bg-gray-100 rounded text-xs">
                      <pre className="whitespace-pre-wrap font-mono text-gray-700">
                        {JSON.stringify(selectedErrorDetail.details, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleErrorAction('retry', error.id)}
                    className="p-1 text-blue-500 hover:text-blue-700 rounded"
                    title="Retry"
                  >
                    <RefreshCw className="w-3 h-3" />
                  </button>

                  <button
                    onClick={() => handleErrorAction('resolve', error.id)}
                    className="p-1 text-green-500 hover:text-green-700 rounded"
                    title="Mark as resolved"
                  >
                    <CheckCircle className="w-3 h-3" />
                  </button>

                  <button
                    onClick={() =>
                      setSelectedError(
                        selectedError === error.id ? null : error.id,
                      )
                    }
                    className="p-1 text-gray-500 hover:text-gray-700 rounded"
                    title="View details"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderActions = () => (
    <div className="p-4 bg-gray-50 border-t border-gray-200">
      <div className="flex flex-wrap items-center gap-2">
        {/* Primary Actions */}
        {!isRecovering ? (
          <button
            onClick={startRecovery}
            disabled={activeErrorCount === 0}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className="w-4 h-4" />
            Auto Recovery
          </button>
        ) : (
          <button
            onClick={cancelRecovery}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
        )}

        {/* Connection Actions */}
        <button
          onClick={forceReconnection}
          disabled={!isOnline}
          className="flex items-center gap-2 px-3 py-2 bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:opacity-50"
        >
          <Wifi className="w-4 h-4" />
          Test Connection
        </button>

        {/* Clear Resolved */}
        {errorStats.resolved > 0 && (
          <button
            onClick={clearResolvedErrors}
            className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
          >
            <CheckCircle className="w-4 h-4" />
            Clear Resolved
          </button>
        )}

        {/* Help Actions */}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setShowReportForm(!showReportForm)}
            className="flex items-center gap-2 px-3 py-2 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
          >
            <MessageSquare className="w-4 h-4" />
            Report Issue
          </button>

          <button
            onClick={requestHelp}
            className="flex items-center gap-2 px-3 py-2 bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
          >
            <HelpCircle className="w-4 h-4" />
            Get Help
          </button>
        </div>
      </div>

      {/* Report Form */}
      {showReportForm && (
        <div className="mt-4 p-3 bg-white border border-gray-200 rounded">
          <textarea
            value={reportDescription}
            onChange={(e) => setReportDescription(e.target.value)}
            placeholder="Describe the issue you're experiencing..."
            className="w-full p-2 border border-gray-300 rounded text-sm resize-none"
            rows={3}
          />
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={handleReportSubmit}
              disabled={!reportDescription.trim()}
              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              Submit Report
            </button>
            <button
              onClick={() => setShowReportForm(false)}
              className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // Compact variant
  if (variant === 'compact') {
    return (
      <div>
        {renderCompactVariant()}
        {isExpanded && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
            {renderHeader()}
            {renderRecoveryProgress()}
            {renderErrorList()}
            {renderActions()}
          </div>
        )}
      </div>
    );
  }

  // Modal variant
  if (variant === 'modal') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          {renderHeader()}
          {renderRecoveryProgress()}
          {renderStats()}
          {renderErrorList()}
          {renderActions()}
        </div>
      </div>
    );
  }

  // Default detailed variant
  return (
    <div
      className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}
    >
      {renderHeader()}
      {renderRecoveryProgress()}
      {renderStats()}
      {renderErrorList()}
      {renderActions()}
    </div>
  );
};

export default ErrorRecoveryPanel;
