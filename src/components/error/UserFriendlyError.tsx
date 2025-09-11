/**
 * WS-198 User Friendly Error - User-facing error displays
 * Context-aware error messaging with recovery guidance
 */

'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  Info,
  AlertCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface ErrorSeverity {
  level: 'info' | 'warning' | 'error' | 'critical';
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ReactNode;
}

interface ErrorContext {
  userType?: 'supplier' | 'couple' | 'admin';
  weddingPhase?: 'planning' | 'final_week' | 'wedding_day' | 'post_wedding';
  supplierType?: 'photographer' | 'venue' | 'florist' | 'catering' | 'other';
  isWeddingDay?: boolean;
  canRetry?: boolean;
  hasAlternative?: boolean;
  needsSupport?: boolean;
  estimatedFixTime?: string;
}

interface UserFriendlyErrorProps {
  error: WedSyncError;
  userType: 'supplier' | 'couple' | 'admin';
  context: WeddingWorkflowContext;
  onRetry?: () => void;
  onAlternative?: () => void;
  onContactSupport?: () => void;
  className?: string;
}

interface WedSyncError {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  context?: ErrorContext;
  timestamp: Date;
  canRetry: boolean;
  hasAlternative: boolean;
}

interface WeddingWorkflowContext {
  page: string;
  action: string;
  weddingDate?: Date;
  clientId?: string;
}

const errorSeverities: Record<string, ErrorSeverity> = {
  info: {
    level: 'info',
    color: 'text-blue-800',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    icon: <Info className="h-5 w-5 text-blue-600" />,
  },
  warning: {
    level: 'warning',
    color: 'text-yellow-800',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    icon: <AlertTriangle className="h-5 w-5 text-yellow-600" />,
  },
  error: {
    level: 'error',
    color: 'text-red-800',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    icon: <AlertCircle className="h-5 w-5 text-red-600" />,
  },
  critical: {
    level: 'critical',
    color: 'text-red-900',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-300',
    icon: <XCircle className="h-5 w-5 text-red-700" />,
  },
};

export const UserFriendlyError: React.FC<UserFriendlyErrorProps> = ({
  error,
  userType,
  context,
  onRetry,
  onAlternative,
  onContactSupport,
  className = '',
}) => {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const severity = errorSeverities[error.severity] || errorSeverities.error;

  // Get wedding-specific messaging
  const weddingMessage = getWeddingMessage(error, userType, context);

  return (
    <div
      className={`rounded-lg border p-4 ${severity.bgColor} ${severity.borderColor} ${className}`}
    >
      {/* Wedding Day Emergency Banner */}
      {error.context?.isWeddingDay && error.severity === 'critical' && (
        <div className="mb-4 p-3 bg-red-600 text-white rounded-lg">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2 animate-pulse" />
            <strong>
              Wedding Day Emergency - Immediate Attention Required
            </strong>
          </div>
        </div>
      )}

      {/* Error Header */}
      <div className="flex items-start">
        <div className="flex-shrink-0 pt-0.5">{severity.icon}</div>
        <div className="ml-3 flex-1">
          <h3 className={`text-sm font-medium ${severity.color}`}>
            {error.title}
          </h3>

          {/* Wedding-specific context message */}
          <div className="mt-1">
            <p className={`text-sm ${severity.color}`}>
              {weddingMessage.primaryMessage}
            </p>

            {weddingMessage.weddingContext && (
              <p className="text-sm text-purple-700 font-medium mt-2 bg-purple-50 p-2 rounded border border-purple-200">
                🏰 Wedding Context: {weddingMessage.weddingContext}
              </p>
            )}
          </div>

          {/* Recovery Actions */}
          <div className="mt-4 flex flex-wrap gap-2">
            {error.canRetry && onRetry && (
              <button
                onClick={onRetry}
                className="inline-flex items-center px-3 py-2 border border-transparent text-xs font-medium rounded text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                Try Again
              </button>
            )}

            {error.hasAlternative && onAlternative && (
              <button
                onClick={onAlternative}
                className="inline-flex items-center px-3 py-2 border border-transparent text-xs font-medium rounded text-purple-700 bg-purple-100 hover:bg-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {weddingMessage.alternativeLabel}
              </button>
            )}

            {(error.context?.needsSupport || error.severity === 'critical') &&
              onContactSupport && (
                <button
                  onClick={onContactSupport}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  Contact Support
                </button>
              )}
          </div>

          {/* Estimated Fix Time */}
          {error.context?.estimatedFixTime && (
            <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
              <span className="font-medium text-blue-800">
                Estimated resolution:
              </span>
              <span className="text-blue-700 ml-1">
                {error.context.estimatedFixTime}
              </span>
            </div>
          )}

          {/* Technical Details Disclosure */}
          <div className="mt-4">
            <button
              onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
              className="inline-flex items-center text-xs text-gray-600 hover:text-gray-800"
            >
              <span>Technical Details</span>
              {showTechnicalDetails ? (
                <ChevronUp className="ml-1 h-4 w-4" />
              ) : (
                <ChevronDown className="ml-1 h-4 w-4" />
              )}
            </button>

            {showTechnicalDetails && (
              <div className="mt-2 p-3 bg-gray-100 rounded text-xs text-gray-700">
                <div className="space-y-1">
                  <div>
                    <strong>Error ID:</strong> {error.id}
                  </div>
                  <div>
                    <strong>Type:</strong> {error.type}
                  </div>
                  <div>
                    <strong>Time:</strong> {error.timestamp.toLocaleString()}
                  </div>
                  <div>
                    <strong>Message:</strong> {error.message}
                  </div>
                  <div>
                    <strong>Context:</strong> {context.page} → {context.action}
                  </div>
                  {context.clientId && (
                    <div>
                      <strong>Client:</strong> {context.clientId}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function to get wedding-specific messaging
function getWeddingMessage(
  error: WedSyncError,
  userType: string,
  context: WeddingWorkflowContext,
) {
  const isWeddingDay = error.context?.isWeddingDay || false;
  const supplierType = error.context?.supplierType || 'other';

  let primaryMessage = error.message;
  let weddingContext = '';
  let alternativeLabel = 'Try Alternative';

  // Customize messages based on error type and user type
  switch (error.type) {
    case 'network':
      primaryMessage = isWeddingDay
        ? 'Connection issues detected at wedding venue. Your work is being saved automatically.'
        : 'Network connectivity issue. Your data is safe and will sync when connection improves.';
      weddingContext = isWeddingDay
        ? 'Wedding venues often have limited WiFi. This is normal and expected.'
        : 'Your wedding planning work continues to be saved offline.';
      alternativeLabel = 'Work Offline';
      break;

    case 'upload':
      primaryMessage =
        userType === 'supplier' && supplierType === 'photographer'
          ? 'Photo upload temporarily paused. Your wedding photos are being processed securely.'
          : 'File upload issue detected. Your documents are safe and being processed.';
      weddingContext =
        'Wedding photos and documents are precious - we take extra care with them.';
      alternativeLabel = 'Try Different Format';
      break;

    case 'payment':
      primaryMessage =
        'Payment processing protected. No charges were made and your information is secure.';
      weddingContext =
        'Wedding payments require extra security verification for your protection.';
      alternativeLabel = 'Try Different Card';
      break;

    case 'form':
      primaryMessage =
        userType === 'couple'
          ? 'Your wedding form responses are saved. Continue from where you left off.'
          : 'Client form data is protected and automatically backed up.';
      weddingContext =
        'Wedding planning involves lots of details - we never lose your progress.';
      alternativeLabel = 'Save & Continue Later';
      break;

    case 'calendar':
      primaryMessage =
        'Calendar sync issue detected. Your wedding timeline is safe and accessible.';
      weddingContext = isWeddingDay
        ? 'Wedding day schedules are critical - accessing backup timeline.'
        : 'Your wedding timeline and appointments are secure.';
      alternativeLabel = 'View Offline Schedule';
      break;

    case 'vendor':
      primaryMessage =
        userType === 'supplier'
          ? 'Vendor communication temporarily interrupted. Client connections are being restored.'
          : 'Supplier connection issue. Your vendors are being notified automatically.';
      weddingContext =
        'Wedding vendors are coordinated automatically even during technical issues.';
      alternativeLabel = 'Send Manual Message';
      break;

    default:
      // Keep the original message for unknown error types
      weddingContext =
        'Your wedding planning data and progress are always protected.';
      break;
  }

  return {
    primaryMessage,
    weddingContext,
    alternativeLabel,
  };
}

// Pre-built error factories for common wedding scenarios
export const weddingErrors = {
  photoUploadFailed: (context?: ErrorContext) =>
    createUserError(
      'error',
      'upload',
      'Photo Upload Failed',
      "We couldn't upload your wedding photos right now.",
      { context, canRetry: true, hasAlternative: true },
    ),

  weddingDayEmergency: (context?: ErrorContext) =>
    createUserError(
      'critical',
      'network',
      'Wedding Day Technical Issue',
      'We detected a technical issue that needs immediate attention.',
      {
        context: { ...context, isWeddingDay: true },
        needsSupport: true,
        canRetry: false,
      },
    ),

  paymentProcessingError: (context?: ErrorContext) =>
    createUserError(
      'error',
      'payment',
      'Payment Processing Issue',
      "Your payment couldn't be processed at this time.",
      { context, canRetry: true, hasAlternative: true },
    ),

  formDataLost: (context?: ErrorContext) =>
    createUserError(
      'warning',
      'form',
      'Form Progress Saved',
      'Your form encountered an issue but all responses are saved.',
      { context, canRetry: true, hasAlternative: false },
    ),

  vendorConnectionFailed: (context?: ErrorContext) =>
    createUserError(
      'warning',
      'vendor',
      'Vendor Communication Issue',
      'Temporary issue connecting with your wedding vendors.',
      { context, canRetry: true, hasAlternative: true },
    ),

  calendarSyncError: (context?: ErrorContext) =>
    createUserError(
      'error',
      'calendar',
      'Calendar Sync Issue',
      "Your wedding timeline couldn't sync with your calendar.",
      { context, canRetry: true, hasAlternative: true },
    ),

  offlineMode: (context?: ErrorContext) =>
    createUserError(
      'info',
      'network',
      'Working Offline',
      "You're working offline. Changes will sync when connection returns.",
      {
        context,
        canRetry: false,
        hasAlternative: false,
        estimatedFixTime: 'When internet returns',
      },
    ),
};

// Helper function to create standardized error objects
function createUserError(
  severity: 'info' | 'warning' | 'error' | 'critical',
  type: string,
  title: string,
  message: string,
  options: {
    context?: ErrorContext;
    canRetry?: boolean;
    hasAlternative?: boolean;
    needsSupport?: boolean;
    estimatedFixTime?: string;
  } = {},
): WedSyncError {
  return {
    id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    title,
    message,
    severity,
    context: options.context,
    timestamp: new Date(),
    canRetry: options.canRetry || false,
    hasAlternative: options.hasAlternative || false,
  };
}
