/**
 * WS-198 Error Recovery Actions - Interactive retry mechanisms and workflow alternatives
 * Provides progressive recovery options with wedding workflow context
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  MessageCircle,
  Phone,
  Mail,
  FileText,
  Calendar,
  Camera,
  CreditCard,
  Wifi,
  CheckCircle,
  AlertTriangle,
  Clock,
} from 'lucide-react';

interface RecoveryOption {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  action: () => void | Promise<void>;
  isPrimary?: boolean;
  isDestructive?: boolean;
  requiresConfirmation?: boolean;
  estimatedTime?: string;
  successRate?: number;
}

interface RecoveryAction {
  type: 'retry' | 'alternative' | 'support' | 'fallback' | 'emergency';
  priority: number;
  condition?: (context: any) => boolean;
}

interface ErrorRecoveryActionsProps {
  errorType: ErrorType;
  recoveryOptions: RecoveryOption[];
  onRecoveryAction: (action: RecoveryAction) => void;
  context?: WeddingRecoveryContext;
  disabled?: boolean;
}

interface ErrorType {
  category:
    | 'network'
    | 'upload'
    | 'payment'
    | 'form'
    | 'vendor'
    | 'calendar'
    | 'system';
  severity: 'low' | 'medium' | 'high' | 'critical';
  isWeddingDay?: boolean;
}

interface WeddingRecoveryContext {
  userType: 'supplier' | 'couple' | 'admin';
  supplierType?: 'photographer' | 'venue' | 'florist' | 'catering' | 'other';
  weddingPhase: 'planning' | 'final_week' | 'wedding_day' | 'post_wedding';
  clientId?: string;
  weddingDate?: Date;
}

export const ErrorRecoveryActions: React.FC<ErrorRecoveryActionsProps> = ({
  errorType,
  recoveryOptions,
  onRecoveryAction,
  context,
  disabled = false,
}) => {
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [lastAttempt, setLastAttempt] = useState<Date | null>(null);
  const [showConfirmation, setShowConfirmation] = useState<string | null>(null);

  // Generate contextual recovery options based on error type and wedding context
  const contextualOptions = generateContextualRecoveryOptions(
    errorType,
    context,
  );
  const allOptions = [...recoveryOptions, ...contextualOptions];

  const handleRecoveryAction = async (
    option: RecoveryOption,
    actionType: RecoveryAction['type'],
  ) => {
    if (disabled) return;

    // Check if confirmation is required
    if (option.requiresConfirmation && showConfirmation !== option.id) {
      setShowConfirmation(option.id);
      return;
    }

    setShowConfirmation(null);

    // Handle retry actions with exponential backoff
    if (actionType === 'retry') {
      if (isRetrying) return;

      const timeSinceLastAttempt = lastAttempt
        ? Date.now() - lastAttempt.getTime()
        : 0;
      const minimumDelay = Math.min(2000 * Math.pow(2, retryCount), 30000); // Cap at 30 seconds

      if (timeSinceLastAttempt < minimumDelay) {
        console.log('Retry attempted too soon, please wait');
        return;
      }

      setIsRetrying(true);
      setLastAttempt(new Date());
      setRetryCount((prev) => prev + 1);
    }

    try {
      await option.action();

      // Call the recovery action handler
      onRecoveryAction({
        type: actionType,
        priority: option.isPrimary ? 1 : 2,
        condition: () => true,
      });
    } catch (error) {
      console.error('Recovery action failed:', error);
    } finally {
      if (actionType === 'retry') {
        setIsRetrying(false);
      }
    }
  };

  const getActionType = (option: RecoveryOption): RecoveryAction['type'] => {
    if (option.id.includes('retry')) return 'retry';
    if (option.id.includes('support') || option.id.includes('emergency'))
      return 'support';
    if (option.id.includes('alternative') || option.id.includes('fallback'))
      return 'alternative';
    if (errorType.isWeddingDay && errorType.severity === 'critical')
      return 'emergency';
    return 'fallback';
  };

  // Sort options by priority and wedding day urgency
  const sortedOptions = allOptions.sort((a, b) => {
    if (errorType.isWeddingDay) {
      // On wedding day, prioritize emergency and support options
      if (a.id.includes('emergency')) return -1;
      if (b.id.includes('emergency')) return 1;
      if (a.id.includes('support')) return -1;
      if (b.id.includes('support')) return 1;
    }

    if (a.isPrimary && !b.isPrimary) return -1;
    if (!a.isPrimary && b.isPrimary) return 1;
    return 0;
  });

  return (
    <div className="space-y-4">
      {/* Wedding Day Emergency Banner */}
      {errorType.isWeddingDay && errorType.severity === 'critical' && (
        <div className="bg-red-600 text-white p-4 rounded-lg">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2 animate-pulse" />
            <div>
              <h3 className="font-semibold">
                Wedding Day Emergency Protocol Active
              </h3>
              <p className="text-sm mt-1">
                Priority support engaged. Response time: &lt;15 minutes.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Recovery Options */}
      <div className="grid gap-3">
        {sortedOptions.map((option) => {
          const actionType = getActionType(option);
          const isRetryAction = actionType === 'retry';
          const canRetry = !isRetryAction || (!isRetrying && retryCount < 5);

          return (
            <div
              key={option.id}
              className="border rounded-lg p-4 bg-white hover:bg-gray-50 transition-colors"
            >
              {/* Option Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 pt-1">{option.icon}</div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-900 flex items-center">
                      {option.label}
                      {option.successRate && (
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {option.successRate}% success rate
                        </span>
                      )}
                    </h4>
                    <p className="text-sm text-gray-500 mt-1">
                      {option.description}
                    </p>

                    {/* Estimated Time */}
                    {option.estimatedTime && (
                      <div className="flex items-center mt-2 text-xs text-gray-400">
                        <Clock className="h-3 w-3 mr-1" />
                        {option.estimatedTime}
                      </div>
                    )}

                    {/* Retry Information */}
                    {isRetryAction && retryCount > 0 && (
                      <div className="mt-2 text-xs text-gray-500">
                        Attempted {retryCount} time{retryCount > 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 flex items-center justify-between">
                <div className="flex space-x-2">
                  {/* Primary Action Button */}
                  {showConfirmation === option.id ? (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleRecoveryAction(option, actionType)}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-xs font-medium rounded text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Confirm
                      </button>
                      <button
                        onClick={() => setShowConfirmation(null)}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleRecoveryAction(option, actionType)}
                      disabled={disabled || (isRetryAction && !canRetry)}
                      className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                        option.isPrimary
                          ? 'text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                          : option.isDestructive
                            ? 'text-white bg-red-600 hover:bg-red-700 focus:ring-red-500'
                            : 'text-blue-700 bg-blue-100 hover:bg-blue-200 focus:ring-blue-500'
                      } ${
                        disabled || (isRetryAction && !canRetry)
                          ? 'opacity-50 cursor-not-allowed'
                          : ''
                      }`}
                    >
                      {isRetrying && actionType === 'retry' ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Retrying...
                        </>
                      ) : (
                        <>
                          {option.icon}
                          {option.label}
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Status Indicator */}
                {isRetryAction && (
                  <div className="text-xs text-gray-500">
                    {retryCount === 0
                      ? 'Ready'
                      : retryCount < 3
                        ? 'Retrying...'
                        : retryCount < 5
                          ? 'Multiple attempts'
                          : 'Max attempts reached'}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Emergency Contact Information for Wedding Day */}
      {errorType.isWeddingDay && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <Phone className="h-5 w-5 text-yellow-600 mr-2" />
            <div>
              <h4 className="text-sm font-medium text-yellow-800">
                Wedding Day Emergency Support
              </h4>
              <p className="text-sm text-yellow-700 mt-1">
                24/7 Wedding Day Hotline: <strong>1-800-WEDDING</strong>
              </p>
              <p className="text-xs text-yellow-600 mt-1">
                Our wedding specialists are standing by to ensure your special
                day goes smoothly.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Generate contextual recovery options based on error type and wedding context
function generateContextualRecoveryOptions(
  errorType: ErrorType,
  context?: WeddingRecoveryContext,
): RecoveryOption[] {
  const options: RecoveryOption[] = [];

  switch (errorType.category) {
    case 'network':
      options.push({
        id: 'retry_connection',
        label: 'Retry Connection',
        description: 'Attempt to reconnect to the network',
        icon: <Wifi className="h-4 w-4" />,
        action: async () => {
          // Implement network retry logic
          await new Promise((resolve) => setTimeout(resolve, 2000));
        },
        isPrimary: true,
        estimatedTime: '10-30 seconds',
        successRate: 75,
      });

      if (context?.userType === 'supplier') {
        options.push({
          id: 'work_offline',
          label: 'Work Offline',
          description: 'Continue working offline, changes will sync later',
          icon: <FileText className="h-4 w-4" />,
          action: async () => {
            // Enable offline mode
            localStorage.setItem('offline_mode', 'true');
          },
          estimatedTime: 'Immediate',
        });
      }
      break;

    case 'upload':
      if (context?.supplierType === 'photographer') {
        options.push({
          id: 'retry_photo_upload',
          label: 'Retry Photo Upload',
          description: 'Retry uploading wedding photos with compression',
          icon: <Camera className="h-4 w-4" />,
          action: async () => {
            // Implement photo upload retry with compression
          },
          isPrimary: true,
          estimatedTime: '2-5 minutes',
          successRate: 85,
        });
      }

      options.push({
        id: 'alternative_upload',
        label: 'Try Different Format',
        description: 'Convert and retry with different file format',
        icon: <FileText className="h-4 w-4" />,
        action: async () => {
          // Implement format conversion
        },
        estimatedTime: '1-2 minutes',
      });
      break;

    case 'payment':
      options.push({
        id: 'retry_payment',
        label: 'Retry Payment',
        description: 'Attempt payment processing again',
        icon: <CreditCard className="h-4 w-4" />,
        action: async () => {
          // Implement payment retry logic
        },
        isPrimary: true,
        requiresConfirmation: true,
        estimatedTime: '30 seconds',
        successRate: 80,
      });

      options.push({
        id: 'alternative_payment',
        label: 'Try Different Card',
        description: 'Use a different payment method',
        icon: <CreditCard className="h-4 w-4" />,
        action: async () => {
          // Redirect to payment method selection
          window.location.href = '/payment/methods';
        },
        estimatedTime: '1-2 minutes',
      });
      break;

    case 'calendar':
      options.push({
        id: 'refresh_calendar',
        label: 'Refresh Calendar',
        description: 'Reload wedding timeline and appointments',
        icon: <Calendar className="h-4 w-4" />,
        action: async () => {
          // Implement calendar refresh
        },
        isPrimary: true,
        estimatedTime: '15 seconds',
        successRate: 90,
      });
      break;

    default:
      options.push({
        id: 'general_retry',
        label: 'Try Again',
        description: 'Retry the operation',
        icon: <RefreshCw className="h-4 w-4" />,
        action: async () => {
          // Generic retry logic
          window.location.reload();
        },
        isPrimary: true,
        estimatedTime: '30 seconds',
      });
      break;
  }

  // Add support option for all error types
  options.push({
    id: 'contact_support',
    label: errorType.isWeddingDay ? 'Emergency Support' : 'Contact Support',
    description: errorType.isWeddingDay
      ? 'Get immediate wedding day assistance'
      : 'Get help from our support team',
    icon: errorType.isWeddingDay ? (
      <Phone className="h-4 w-4" />
    ) : (
      <MessageCircle className="h-4 w-4" />
    ),
    action: async () => {
      const supportUrl = errorType.isWeddingDay
        ? '/support/emergency?type=wedding_day'
        : '/support?type=' + errorType.category;
      window.open(supportUrl, '_blank');
    },
    estimatedTime: errorType.isWeddingDay ? '<15 minutes' : '2-24 hours',
  });

  return options;
}
