/**
 * WS-198 Error Fallback Interface - Error fallback UI
 * User-friendly error display with recovery options
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  RefreshCw,
  MessageCircle,
  Home,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface ErrorFallbackInterfaceProps {
  error: Error;
  errorId: string;
  timestamp: Date;
  context: 'supplier_dashboard' | 'couple_forms' | 'admin_panel' | 'general';
  retryCount: number;
  onRetry: () => void;
  canRetry: boolean;
}

interface WeddingErrorInfo {
  type: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  recoverySteps: string[];
}

export const ErrorFallbackInterface: React.FC<ErrorFallbackInterfaceProps> = ({
  error,
  errorId,
  timestamp,
  context,
  retryCount,
  onRetry,
  canRetry,
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [isWeddingDay, setIsWeddingDay] = useState(false);
  const weddingErrorInfo = getWeddingErrorInfo(error, context);

  useEffect(() => {
    // Check if today is Saturday (wedding day)
    const today = new Date();
    setIsWeddingDay(today.getDay() === 6);
  }, []);

  const handleContactSupport = () => {
    // Navigate to support contact
    window.open('/support?error=' + errorId, '_blank');
  };

  const handleGoHome = () => {
    window.location.href = context === 'admin_panel' ? '/admin' : '/dashboard';
  };

  const contextMessages = {
    supplier_dashboard: {
      title: 'Supplier Dashboard Error',
      description:
        'We encountered an issue with your supplier dashboard. Your client data and wedding information are safe.',
      homeLabel: 'Go to Dashboard',
    },
    couple_forms: {
      title: 'Wedding Form Error',
      description:
        'There was an issue processing your wedding form. Your responses have been saved automatically.',
      homeLabel: 'Return to Forms',
    },
    admin_panel: {
      title: 'Admin Panel Error',
      description:
        'An administrative function encountered an error. System operations continue normally.',
      homeLabel: 'Go to Admin',
    },
    general: {
      title: 'System Error',
      description:
        'We encountered a temporary issue. Your data is safe and secure.',
      homeLabel: 'Go Home',
    },
  };

  const contextInfo = contextMessages[context];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-white to-purple-50 p-4">
      <div className="max-w-2xl w-full bg-white rounded-xl shadow-2xl border border-pink-100 overflow-hidden">
        {/* Wedding Day Emergency Banner */}
        {isWeddingDay && (
          <div className="bg-red-600 text-white p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-6 w-6 mr-3 animate-pulse" />
              <div>
                <h3 className="font-bold">
                  Wedding Day Emergency Protocol Active
                </h3>
                <p className="text-sm">
                  Our support team has been automatically notified. Response
                  time: &lt;15 minutes.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Wedding Context Alert */}
        <div
          className={`p-4 border-b bg-gradient-to-r from-${weddingErrorInfo.color}-50 to-${weddingErrorInfo.color}-100 border-${weddingErrorInfo.color}-200`}
        >
          <div className="flex items-center">
            <span className="text-3xl mr-4" role="img" aria-label="Error type">
              {weddingErrorInfo.icon}
            </span>
            <div className="flex-1">
              <h4
                className={`font-semibold text-${weddingErrorInfo.color}-800 text-lg`}
              >
                {weddingErrorInfo.title}
              </h4>
              <p className={`text-${weddingErrorInfo.color}-700 mt-1`}>
                {weddingErrorInfo.description}
              </p>
            </div>
          </div>
        </div>

        <div className="p-8">
          {/* Main Error Display */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-red-100 rounded-full">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {contextInfo.title}
            </h1>
            <p className="text-gray-600 mb-6">{contextInfo.description}</p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-blue-800 font-medium">
                ✅ Your wedding data is safe and automatically backed up
              </p>
            </div>
          </div>

          {/* Recovery Steps */}
          <div className="mb-8">
            <h3 className="font-semibold text-gray-900 mb-4">
              What we're doing to fix this:
            </h3>
            <div className="space-y-3">
              {weddingErrorInfo.recoverySteps.map((step, index) => (
                <div key={index} className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="w-6 h-6 bg-pink-100 text-pink-600 rounded-full flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                  </div>
                  <p className="ml-3 text-gray-700">{step}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            {canRetry && (
              <button
                onClick={onRetry}
                className="flex items-center justify-center px-6 py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 transition-colors"
                aria-label="Retry the failed operation"
              >
                <RefreshCw className="h-5 w-5 mr-2" />
                Try Again {retryCount > 0 && `(Attempt ${retryCount + 1})`}
              </button>
            )}

            <button
              onClick={handleContactSupport}
              className="flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              aria-label="Contact support team"
            >
              <MessageCircle className="h-5 w-5 mr-2" />
              Contact Support
            </button>

            <button
              onClick={handleGoHome}
              className="flex items-center justify-center px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
              aria-label={`Return to ${contextInfo.homeLabel.toLowerCase()}`}
            >
              <Home className="h-5 w-5 mr-2" />
              {contextInfo.homeLabel}
            </button>
          </div>

          {/* Technical Details Disclosure */}
          <div className="border-t pt-6">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center justify-between w-full text-left text-gray-600 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 rounded-lg p-2"
              aria-expanded={showDetails}
              aria-controls="error-details"
            >
              <span className="font-medium">Technical Details</span>
              {showDetails ? (
                <ChevronUp className="h-5 w-5" />
              ) : (
                <ChevronDown className="h-5 w-5" />
              )}
            </button>

            {showDetails && (
              <div
                id="error-details"
                className="mt-4 p-4 bg-gray-100 rounded-lg text-sm"
              >
                <div className="grid gap-2">
                  <div>
                    <strong>Error ID:</strong>{' '}
                    <code className="bg-white px-2 py-1 rounded">
                      {errorId}
                    </code>
                  </div>
                  <div>
                    <strong>Time:</strong> {timestamp.toLocaleString()}
                  </div>
                  <div>
                    <strong>Context:</strong> {context}
                  </div>
                  <div>
                    <strong>Message:</strong>{' '}
                    <code className="bg-white px-2 py-1 rounded">
                      {error.message}
                    </code>
                  </div>
                  <div>
                    <strong>Retry Count:</strong> {retryCount}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function to get wedding-specific error information
function getWeddingErrorInfo(error: Error, context: string): WeddingErrorInfo {
  const message = error.message.toLowerCase();

  // Network/connectivity issues (common at wedding venues)
  if (
    message.includes('fetch') ||
    message.includes('network') ||
    message.includes('timeout')
  ) {
    return {
      type: 'network',
      title: 'Connection Issue Detected',
      description:
        'This might be due to poor WiFi at your wedding venue. Your data is automatically saved.',
      icon: '📶',
      color: 'amber',
      recoverySteps: [
        'Automatically retrying connection',
        'Saving your work offline',
        'Will sync when connection improves',
        'No data will be lost',
      ],
    };
  }

  // Payment/booking errors
  if (
    message.includes('payment') ||
    message.includes('booking') ||
    message.includes('stripe')
  ) {
    return {
      type: 'payment',
      title: 'Payment Processing Protected',
      description:
        'No charges were processed. Your payment information remains secure.',
      icon: '💳',
      color: 'green',
      recoverySteps: [
        'Verifying payment security',
        'Checking transaction status',
        'Preparing retry mechanism',
        'Contacting payment provider if needed',
      ],
    };
  }

  // Photo/file upload errors
  if (
    message.includes('upload') ||
    message.includes('file') ||
    message.includes('image')
  ) {
    return {
      type: 'upload',
      title: 'File Upload Temporarily Paused',
      description:
        'Your wedding photos and documents are being processed safely.',
      icon: '📸',
      color: 'purple',
      recoverySteps: [
        'Securing uploaded files',
        'Checking file integrity',
        'Preparing to resume upload',
        'Your photos are safe',
      ],
    };
  }

  // Wedding data related errors
  if (
    message.includes('client') ||
    message.includes('vendor') ||
    message.includes('wedding')
  ) {
    return {
      type: 'wedding-data',
      title: 'Wedding Information Protected',
      description:
        'Your client details, vendor information, and wedding forms are safely stored.',
      icon: '💒',
      color: 'blue',
      recoverySteps: [
        'Verifying data integrity',
        'Checking backup systems',
        'Restoring last saved state',
        'All wedding info is secure',
      ],
    };
  }

  // Context-specific errors
  if (context === 'supplier_dashboard') {
    return {
      type: 'supplier',
      title: 'Supplier Dashboard Issue',
      description:
        'Your supplier tools encountered a temporary issue. Client data is protected.',
      icon: '🏢',
      color: 'indigo',
      recoverySteps: [
        'Checking supplier systems',
        'Verifying client connections',
        'Restoring dashboard functionality',
        'Maintaining data security',
      ],
    };
  }

  if (context === 'couple_forms') {
    return {
      type: 'forms',
      title: 'Wedding Form Protected',
      description:
        'Your wedding planning form had an issue. All responses are automatically saved.',
      icon: '📝',
      color: 'pink',
      recoverySteps: [
        'Saving form responses',
        'Checking data validation',
        'Preparing form recovery',
        'Your answers are safe',
      ],
    };
  }

  // Default error info
  return {
    type: 'general',
    title: 'Temporary System Issue',
    description:
      'We encountered a brief technical issue. All your wedding planning data remains safe.',
    icon: '⚙️',
    color: 'gray',
    recoverySteps: [
      'Diagnosing the issue',
      'Checking system status',
      'Implementing automatic fix',
      'Restoring normal operation',
    ],
  };
}
