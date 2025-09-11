'use client';

import React, { useState } from 'react';
import {
  ExclamationCircleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { TouchButton } from '../touch/TouchButton';

export interface ValidationError {
  code: string;
  message: string;
  field: string;
  value: any;
  severity: 'error' | 'warning' | 'info';
}

interface MobileFieldValidatorProps {
  errors: ValidationError[];
  warnings?: ValidationError[];
  suggestions?: ValidationError[];
  onDismiss?: (error: ValidationError) => void;
  onFixAttempt?: (error: ValidationError) => void;
  className?: string;
  compact?: boolean;
}

export function MobileFieldValidator({
  errors,
  warnings = [],
  suggestions = [],
  onDismiss,
  onFixAttempt,
  className = '',
  compact = false,
}: MobileFieldValidatorProps) {
  const [expandedError, setExpandedError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const allIssues = [
    ...errors.map((e) => ({ ...e, severity: 'error' as const })),
    ...warnings.map((w) => ({ ...w, severity: 'warning' as const })),
    ...suggestions.map((s) => ({ ...s, severity: 'info' as const })),
  ].filter((issue) => !dismissed.has(issue.code));

  const handleDismiss = (error: ValidationError) => {
    setDismissed((prev) => new Set([...prev, error.code]));
    onDismiss?.(error);
  };

  const getIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return <ExclamationCircleIcon className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <ExclamationTriangleIcon className="h-5 w-5 text-orange-500" />;
      case 'info':
        return <InformationCircleIcon className="h-5 w-5 text-blue-500" />;
      default:
        return <InformationCircleIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getBackgroundColor = (severity: string) => {
    switch (severity) {
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-orange-50 border-orange-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getTextColor = (severity: string) => {
    switch (severity) {
      case 'error':
        return 'text-red-800';
      case 'warning':
        return 'text-orange-800';
      case 'info':
        return 'text-blue-800';
      default:
        return 'text-gray-800';
    }
  };

  const getFixSuggestion = (error: ValidationError): string | null => {
    switch (error.code) {
      case 'REQUIRED_FIELD_EMPTY':
        return 'This field is required for your wedding profile.';
      case 'INVALID_EMAIL_FORMAT':
        return 'Please enter a valid email address (e.g., name@example.com).';
      case 'INVALID_PHONE_FORMAT':
        return 'Please enter a valid phone number (e.g., (555) 123-4567).';
      case 'DATE_TOO_EARLY':
        return 'Wedding date must be at least 30 days from today.';
      case 'DATE_TOO_LATE':
        return 'Wedding date must be within the next 3 years.';
      case 'GUEST_COUNT_TOO_LOW':
        return 'Guest count must be at least 2 people.';
      case 'GUEST_COUNT_TOO_HIGH':
        return 'Guest count cannot exceed 500 people.';
      case 'ADDRESS_INCOMPLETE':
        return 'Please include street, city, state, and ZIP code.';
      case 'TIME_FORMAT_INVALID':
        return 'Please use format like "2:30 PM" or "14:30".';
      default:
        return null;
    }
  };

  if (allIssues.length === 0) {
    return (
      <div
        className={`flex items-center justify-center p-4 bg-green-50 rounded-lg border border-green-200 ${className}`}
      >
        <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
        <span className="text-sm text-green-800 font-medium">
          All fields are valid
        </span>
      </div>
    );
  }

  if (compact) {
    const errorCount = allIssues.filter((i) => i.severity === 'error').length;
    const warningCount = allIssues.filter(
      (i) => i.severity === 'warning',
    ).length;

    return (
      <div
        className={`flex items-center space-x-3 p-3 bg-white rounded-lg border ${className}`}
      >
        {errorCount > 0 && (
          <div className="flex items-center space-x-2">
            <ExclamationCircleIcon className="h-4 w-4 text-red-500" />
            <span className="text-sm text-red-600 font-medium">
              {errorCount} error{errorCount !== 1 ? 's' : ''}
            </span>
          </div>
        )}
        {warningCount > 0 && (
          <div className="flex items-center space-x-2">
            <ExclamationTriangleIcon className="h-4 w-4 text-orange-500" />
            <span className="text-sm text-orange-600 font-medium">
              {warningCount} warning{warningCount !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {allIssues.map((issue, index) => {
        const isExpanded = expandedError === issue.code;
        const fixSuggestion = getFixSuggestion(issue);

        return (
          <div
            key={`${issue.code}-${index}`}
            className={`rounded-lg border ${getBackgroundColor(issue.severity)} overflow-hidden`}
          >
            <TouchButton
              onClick={() => setExpandedError(isExpanded ? null : issue.code)}
              className="w-full p-4 text-left"
            >
              <div className="flex items-start space-x-3">
                {getIcon(issue.severity)}
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium ${getTextColor(issue.severity)}`}
                  >
                    {issue.message}
                  </p>
                  {fixSuggestion && !isExpanded && (
                    <p
                      className={`text-xs mt-1 ${getTextColor(issue.severity)} opacity-75`}
                    >
                      Tap for suggestions
                    </p>
                  )}
                </div>
                <div className="flex-shrink-0">
                  <div
                    className={`w-2 h-2 rounded-full transform transition-transform ${
                      isExpanded ? 'rotate-90' : ''
                    } ${
                      issue.severity === 'error'
                        ? 'bg-red-400'
                        : issue.severity === 'warning'
                          ? 'bg-orange-400'
                          : 'bg-blue-400'
                    }`}
                  />
                </div>
              </div>
            </TouchButton>

            {isExpanded && (
              <div className="px-4 pb-4 border-t border-opacity-20">
                {fixSuggestion && (
                  <div className="mt-3 p-3 bg-white bg-opacity-50 rounded-md">
                    <p className={`text-sm ${getTextColor(issue.severity)}`}>
                      <strong>How to fix:</strong> {fixSuggestion}
                    </p>
                  </div>
                )}

                <div className="mt-3 text-xs text-gray-600 space-y-1">
                  <p>
                    <strong>Field:</strong> {issue.field}
                  </p>
                  <p>
                    <strong>Current value:</strong> {issue.value || '(empty)'}
                  </p>
                  <p>
                    <strong>Error code:</strong> {issue.code}
                  </p>
                </div>

                <div className="mt-4 flex space-x-2">
                  {onFixAttempt && (
                    <TouchButton
                      onClick={() => onFixAttempt(issue)}
                      className={`flex-1 py-2 px-4 rounded-md text-sm font-medium ${
                        issue.severity === 'error'
                          ? 'bg-red-600 text-white hover:bg-red-700'
                          : issue.severity === 'warning'
                            ? 'bg-orange-600 text-white hover:bg-orange-700'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      Try to Fix
                    </TouchButton>
                  )}

                  {issue.severity !== 'error' && (
                    <TouchButton
                      onClick={() => handleDismiss(issue)}
                      className="flex-1 py-2 px-4 rounded-md text-sm font-medium bg-gray-200 text-gray-700 hover:bg-gray-300"
                    >
                      Dismiss
                    </TouchButton>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Validation utility functions for mobile
export class MobileFieldValidationUtils {
  static validateEmail(email: string): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!email) {
      errors.push({
        code: 'REQUIRED_FIELD_EMPTY',
        message: 'Email address is required',
        field: 'email',
        value: email,
        severity: 'error',
      });
      return errors;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.push({
        code: 'INVALID_EMAIL_FORMAT',
        message: 'Please enter a valid email address',
        field: 'email',
        value: email,
        severity: 'error',
      });
    }

    return errors;
  }

  static validatePhone(phone: string): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!phone) {
      return errors; // Phone might be optional
    }

    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length !== 10) {
      errors.push({
        code: 'INVALID_PHONE_FORMAT',
        message: 'Phone number must be 10 digits',
        field: 'phone',
        value: phone,
        severity: 'error',
      });
    }

    return errors;
  }

  static validateWeddingDate(date: string): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!date) {
      errors.push({
        code: 'REQUIRED_FIELD_EMPTY',
        message: 'Wedding date is required',
        field: 'wedding_date',
        value: date,
        severity: 'error',
      });
      return errors;
    }

    const weddingDate = new Date(date);
    const today = new Date();
    const minDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
    const maxDate = new Date(today.getTime() + 3 * 365 * 24 * 60 * 60 * 1000); // 3 years from now

    if (weddingDate < minDate) {
      errors.push({
        code: 'DATE_TOO_EARLY',
        message: 'Wedding date must be at least 30 days away',
        field: 'wedding_date',
        value: date,
        severity: 'error',
      });
    }

    if (weddingDate > maxDate) {
      errors.push({
        code: 'DATE_TOO_LATE',
        message: 'Wedding date must be within 3 years',
        field: 'wedding_date',
        value: date,
        severity: 'warning',
      });
    }

    return errors;
  }

  static validateGuestCount(count: number): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!count || count < 2) {
      errors.push({
        code: 'GUEST_COUNT_TOO_LOW',
        message: 'Guest count must be at least 2',
        field: 'guest_count',
        value: count,
        severity: 'error',
      });
    }

    if (count > 500) {
      errors.push({
        code: 'GUEST_COUNT_TOO_HIGH',
        message: 'Guest count cannot exceed 500',
        field: 'guest_count',
        value: count,
        severity: 'warning',
      });
    }

    return errors;
  }
}
