'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  ExclamationCircleIcon,
  CheckCircleIcon,
  ClockIcon,
  EyeIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/outline';
import { TouchButton } from '../touch/TouchButton';
import { useDebounce } from '@/hooks/useDebounce';

interface CoreField {
  key: string;
  value: any;
  status: 'completed' | 'partial' | 'pending' | 'not_applicable';
  lastUpdated: string;
  updatedBy: 'couple' | 'supplier';
  isLocked: boolean;
  lockReason?: string;
  definition: {
    fieldName: string;
    fieldDescription: string;
    fieldType:
      | 'text'
      | 'email'
      | 'phone'
      | 'date'
      | 'number'
      | 'address'
      | 'enum'
      | 'array';
    validationSchema: any;
    isRequired: boolean;
    category: string;
    propagatesTo: string[];
  };
  validationErrors?: ValidationError[];
}

interface ValidationError {
  code: string;
  message: string;
  field: string;
  value: any;
}

interface MobileFieldEditorProps {
  field: CoreField;
  onUpdate: (value: any, reason?: string) => void;
  isPending?: boolean;
  className?: string;
}

export function MobileFieldEditor({
  field,
  onUpdate,
  isPending = false,
  className = '',
}: MobileFieldEditorProps) {
  const [localValue, setLocalValue] = useState(field.value || '');
  const [hasChanged, setHasChanged] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>(
    field.validationErrors || [],
  );
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  const debouncedValue = useDebounce(localValue, 1500); // Faster for mobile

  // Auto-save when value changes
  useEffect(() => {
    if (hasChanged && debouncedValue !== field.value && !field.isLocked) {
      onUpdate(debouncedValue);
      setHasChanged(false);
    }
  }, [debouncedValue, hasChanged, field.value, field.isLocked, onUpdate]);

  // Update local value when field value changes externally
  useEffect(() => {
    if (field.value !== localValue && !hasChanged) {
      setLocalValue(field.value || '');
    }
  }, [field.value, localValue, hasChanged]);

  // Update validation errors
  useEffect(() => {
    setValidationErrors(field.validationErrors || []);
  }, [field.validationErrors]);

  const handleValueChange = (newValue: any) => {
    setLocalValue(newValue);
    setHasChanged(true);
    setValidationErrors([]); // Clear errors on change
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  const formatInputValue = (value: any, fieldType: string) => {
    if (fieldType === 'phone' && value) {
      // Format phone number as user types
      const cleaned = value.replace(/\D/g, '');
      const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
      if (match) {
        return !match[2]
          ? match[1]
          : `(${match[1]}) ${match[2]}${match[3] ? `-${match[3]}` : ''}`;
      }
    }
    return value;
  };

  const getInputType = (fieldType: string) => {
    switch (fieldType) {
      case 'email':
        return 'email';
      case 'phone':
        return 'tel';
      case 'date':
        return 'date';
      case 'number':
        return 'number';
      default:
        return 'text';
    }
  };

  const getKeyboardType = (fieldType: string) => {
    // Mobile keyboard optimization
    const keyboardTypes = {
      email: 'email',
      phone: 'numeric',
      number: 'numeric',
      date: 'default',
      address: 'default',
      text: 'default',
    };
    return keyboardTypes[fieldType as keyof typeof keyboardTypes] || 'default';
  };

  const renderFieldInput = () => {
    const { fieldType, validationSchema } = field.definition;
    const hasError = validationErrors.length > 0;
    const displayValue = formatInputValue(localValue, fieldType);

    const baseClasses = `
      w-full px-4 py-4 text-base rounded-xl border-2 transition-all duration-200
      ${
        field.isLocked
          ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
          : 'bg-white text-gray-900'
      }
      ${
        hasError
          ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
          : isFocused
            ? 'border-blue-500 focus:border-blue-500 focus:ring-blue-500'
            : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
      }
      ${hasChanged && !isPending ? 'border-orange-300' : ''}
      touch-manipulation
    `.trim();

    switch (fieldType) {
      case 'email':
        return (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="email"
            value={displayValue}
            onChange={(e) => handleValueChange(e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            className={baseClasses}
            disabled={field.isLocked}
            placeholder={`Enter ${field.definition.fieldName.toLowerCase()}`}
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck="false"
          />
        );

      case 'phone':
        return (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="tel"
            value={displayValue}
            onChange={(e) => handleValueChange(e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            className={baseClasses}
            disabled={field.isLocked}
            placeholder="(555) 123-4567"
            autoComplete="tel"
          />
        );

      case 'date':
        return (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="date"
            value={localValue}
            onChange={(e) => handleValueChange(e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            className={baseClasses}
            disabled={field.isLocked}
            min={
              validationSchema.min === 'today+30'
                ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                    .toISOString()
                    .split('T')[0]
                : validationSchema.min
            }
            max={validationSchema.max}
          />
        );

      case 'number':
        return (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="number"
            value={localValue}
            onChange={(e) => handleValueChange(parseInt(e.target.value) || 0)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            className={baseClasses}
            disabled={field.isLocked}
            min={validationSchema.min}
            max={validationSchema.max}
            step="1"
            pattern="[0-9]*"
            inputMode="numeric"
          />
        );

      case 'address':
        return (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={localValue}
            onChange={(e) => handleValueChange(e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            className={`${baseClasses} min-h-[120px] resize-none`}
            disabled={field.isLocked}
            rows={4}
            placeholder="Enter full address"
            autoComplete="address-line1"
          />
        );

      default:
        return (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="text"
            value={localValue}
            onChange={(e) => handleValueChange(e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            className={baseClasses}
            disabled={field.isLocked}
            placeholder={`Enter ${field.definition.fieldName.toLowerCase()}`}
            autoComplete="off"
          />
        );
    }
  };

  const getStatusColor = () => {
    if (isPending) return 'text-orange-500';
    switch (field.status) {
      case 'completed':
        return 'text-green-500';
      case 'partial':
        return 'text-yellow-500';
      case 'pending':
        return 'text-gray-400';
      default:
        return 'text-gray-300';
    }
  };

  const getStatusIcon = () => {
    if (isPending) return <ClockIcon className="h-5 w-5" />;
    switch (field.status) {
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5" />;
      case 'partial':
      case 'pending':
        return <div className="h-5 w-5 border-2 border-current rounded-full" />;
      default:
        return (
          <div className="h-5 w-5 border-2 border-current rounded-full opacity-50" />
        );
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Field Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <label className="text-base font-medium text-gray-900">
              {field.definition.fieldName}
            </label>
            {field.definition.isRequired && (
              <span className="text-red-500 text-sm">*</span>
            )}
            {field.isLocked && (
              <span
                className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full"
                title={field.lockReason}
              >
                🔒 Locked
              </span>
            )}
          </div>
          {field.definition.fieldDescription && (
            <p className="text-sm text-gray-500 mt-1">
              {field.definition.fieldDescription}
            </p>
          )}
        </div>

        <div className={`flex items-center space-x-2 ${getStatusColor()}`}>
          {getStatusIcon()}
        </div>
      </div>

      {/* Field Input */}
      <div className="relative">
        {renderFieldInput()}

        {/* Sync Status Indicator */}
        {(isPending || hasChanged) && (
          <div className="absolute -top-1 -right-1">
            <div
              className={`h-3 w-3 rounded-full ${
                isPending ? 'bg-orange-400 animate-pulse' : 'bg-blue-400'
              }`}
            />
          </div>
        )}
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="space-y-2">
          {validationErrors.map((error, index) => (
            <div
              key={index}
              className="flex items-start space-x-2 p-3 bg-red-50 rounded-lg border border-red-200"
            >
              <ExclamationCircleIcon className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700">{error.message}</p>
            </div>
          ))}
        </div>
      )}

      {/* Field Info */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center space-x-3">
          {field.lastUpdated && (
            <span>
              Updated {new Date(field.lastUpdated).toLocaleDateString()}
            </span>
          )}
          {isPending && (
            <span className="text-orange-600 flex items-center space-x-1">
              <ClockIcon className="h-3 w-3" />
              <span>Syncing...</span>
            </span>
          )}
        </div>

        {field.definition.propagatesTo.length > 0 && (
          <TouchButton
            onClick={() => {
              /* Show propagation details */
            }}
            className="text-blue-600 underline"
          >
            Syncs to {field.definition.propagatesTo.length} vendor
            {field.definition.propagatesTo.length !== 1 ? 's' : ''}
          </TouchButton>
        )}
      </div>
    </div>
  );
}
