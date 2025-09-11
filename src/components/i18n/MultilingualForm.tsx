'use client';

import React, { forwardRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircleIcon,
  CheckCircleIcon,
  EyeIcon,
  EyeOffIcon,
} from 'lucide-react';
import {
  type WeddingMarketLocale,
  type TextDirection,
  type AddressFormatType,
  type NumberFormatConfig,
} from '@/types/i18n';

// =============================================================================
// FORM FIELD TYPES & INTERFACES
// =============================================================================

export interface MultilingualFormField {
  id: string;
  name: string;
  type:
    | 'text'
    | 'email'
    | 'tel'
    | 'password'
    | 'textarea'
    | 'select'
    | 'multiselect'
    | 'radio'
    | 'checkbox'
    | 'date'
    | 'number'
    | 'currency';
  label: string;
  placeholder?: string;
  value?: string | string[] | number | boolean;
  required?: boolean;
  disabled?: boolean;
  options?: Array<{ value: string; label: string; disabled?: boolean }>;
  validation?: {
    pattern?: RegExp;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    custom?: (value: any) => string | null;
  };
  culturalRules?: {
    phoneFormat?: string;
    addressFormat?: AddressFormatType;
    dateFormat?: string;
    currencyCode?: string;
    numberFormat?: NumberFormatConfig;
  };
  ariaLabel?: string;
  helpText?: string;
  dependencies?: {
    field: string;
    value: any;
    action: 'show' | 'hide' | 'enable' | 'disable';
  }[];
}

export interface MultilingualFormProps {
  fields: MultilingualFormField[];
  locale: WeddingMarketLocale;
  direction?: TextDirection;
  onSubmit?: (values: Record<string, any>) => void;
  onChange?: (values: Record<string, any>) => void;
  onFieldChange?: (fieldId: string, value: any) => void;
  initialValues?: Record<string, any>;
  errors?: Record<string, string>;
  loading?: boolean;
  className?: string;
  submitLabel?: string;
  resetLabel?: string;
  showReset?: boolean;
  autoSave?: boolean;
  autoSaveDelay?: number;
  validationMode?: 'onChange' | 'onBlur' | 'onSubmit';
  culturalValidation?: boolean;
  weddingContext?: {
    role: 'supplier' | 'couple' | 'guest' | 'admin';
    weddingDate?: string;
    tradition?: string;
    location?: string;
  };
}

export interface FormValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

// =============================================================================
// CULTURAL VALIDATION UTILITIES
// =============================================================================

const validatePhoneNumber = (
  phone: string,
  locale: WeddingMarketLocale,
): boolean => {
  const patterns: Record<string, RegExp> = {
    'en-US': /^\+?1?[\s.-]?\(?[0-9]{3}\)?[\s.-]?[0-9]{3}[\s.-]?[0-9]{4}$/,
    'en-GB': /^\+?44[\s.-]?[0-9]{4}[\s.-]?[0-9]{6}$/,
    'fr-FR':
      /^\+?33[\s.-]?[0-9]{1}[\s.-]?[0-9]{2}[\s.-]?[0-9]{2}[\s.-]?[0-9]{2}[\s.-]?[0-9]{2}$/,
    'de-DE': /^\+?49[\s.-]?[0-9]{3}[\s.-]?[0-9]{7,8}$/,
    'es-ES': /^\+?34[\s.-]?[0-9]{3}[\s.-]?[0-9]{3}[\s.-]?[0-9]{3}$/,
    'it-IT': /^\+?39[\s.-]?[0-9]{3}[\s.-]?[0-9]{3}[\s.-]?[0-9]{4}$/,
    'ar-AE': /^\+?971[\s.-]?[0-9]{1}[\s.-]?[0-9]{3}[\s.-]?[0-9]{4}$/,
    'hi-IN': /^\+?91[\s.-]?[0-9]{5}[\s.-]?[0-9]{5}$/,
    'zh-CN': /^\+?86[\s.-]?[0-9]{3}[\s.-]?[0-9]{4}[\s.-]?[0-9]{4}$/,
  };

  const pattern = patterns[locale] || patterns['en-US'];
  return pattern.test(phone);
};

const formatCurrency = (
  amount: number,
  locale: WeddingMarketLocale,
): string => {
  const formatters: Record<string, Intl.NumberFormatOptions> = {
    'en-US': { style: 'currency', currency: 'USD' },
    'en-GB': { style: 'currency', currency: 'GBP' },
    'fr-FR': { style: 'currency', currency: 'EUR' },
    'de-DE': { style: 'currency', currency: 'EUR' },
    'es-ES': { style: 'currency', currency: 'EUR' },
    'it-IT': { style: 'currency', currency: 'EUR' },
    'ar-AE': { style: 'currency', currency: 'AED' },
    'hi-IN': { style: 'currency', currency: 'INR' },
    'zh-CN': { style: 'currency', currency: 'CNY' },
  };

  const formatter = new Intl.NumberFormat(
    locale,
    formatters[locale] || formatters['en-US'],
  );
  return formatter.format(amount);
};

const getDirectionalClasses = (
  direction: TextDirection,
  base: string,
): string => {
  const rtlClasses =
    direction === 'rtl' ? 'text-right dir-rtl' : 'text-left dir-ltr';
  return `${base} ${rtlClasses}`;
};

// =============================================================================
// FIELD COMPONENTS
// =============================================================================

interface FormFieldProps {
  field: MultilingualFormField;
  value: any;
  error?: string;
  direction: TextDirection;
  locale: WeddingMarketLocale;
  onChange: (value: any) => void;
  onBlur?: () => void;
  disabled?: boolean;
}

const FormField: React.FC<FormFieldProps> = ({
  field,
  value,
  error,
  direction,
  locale,
  onChange,
  onBlur,
  disabled,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [internalValue, setInternalValue] = useState(value || '');

  const baseInputClasses = getDirectionalClasses(
    direction,
    `w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200
     ${error ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white hover:border-gray-400'}
     ${disabled ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''}`,
  );

  const labelClasses = getDirectionalClasses(
    direction,
    `block text-sm font-medium text-gray-700 mb-2
     ${field.required ? "after:content-['*'] after:text-red-500 after:ml-1" : ''}`,
  );

  const handleChange = (newValue: any) => {
    setInternalValue(newValue);
    onChange(newValue);
  };

  const renderField = () => {
    switch (field.type) {
      case 'text':
      case 'email':
      case 'tel':
        return (
          <input
            id={field.id}
            name={field.name}
            type={field.type}
            value={internalValue}
            placeholder={field.placeholder}
            className={baseInputClasses}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={onBlur}
            disabled={disabled || field.disabled}
            required={field.required}
            aria-label={field.ariaLabel || field.label}
            aria-describedby={field.helpText ? `${field.id}-help` : undefined}
            autoComplete={
              field.type === 'email'
                ? 'email'
                : field.type === 'tel'
                  ? 'tel'
                  : field.name === 'firstName'
                    ? 'given-name'
                    : field.name === 'lastName'
                      ? 'family-name'
                      : 'off'
            }
          />
        );

      case 'password':
        return (
          <div className="relative">
            <input
              id={field.id}
              name={field.name}
              type={showPassword ? 'text' : 'password'}
              value={internalValue}
              placeholder={field.placeholder}
              className={`${baseInputClasses} pr-10`}
              onChange={(e) => handleChange(e.target.value)}
              onBlur={onBlur}
              disabled={disabled || field.disabled}
              required={field.required}
              aria-label={field.ariaLabel || field.label}
              autoComplete="current-password"
            />
            <button
              type="button"
              className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <EyeOffIcon className="w-4 h-4" />
              ) : (
                <EyeIcon className="w-4 h-4" />
              )}
            </button>
          </div>
        );

      case 'textarea':
        return (
          <textarea
            id={field.id}
            name={field.name}
            value={internalValue}
            placeholder={field.placeholder}
            className={`${baseInputClasses} min-h-[100px] resize-vertical`}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={onBlur}
            disabled={disabled || field.disabled}
            required={field.required}
            aria-label={field.ariaLabel || field.label}
            rows={4}
          />
        );

      case 'select':
        return (
          <select
            id={field.id}
            name={field.name}
            value={internalValue}
            className={baseInputClasses}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={onBlur}
            disabled={disabled || field.disabled}
            required={field.required}
            aria-label={field.ariaLabel || field.label}
          >
            {field.placeholder && (
              <option value="" disabled>
                {field.placeholder}
              </option>
            )}
            {field.options?.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'multiselect':
        return (
          <div className="space-y-2">
            {field.options?.map((option) => (
              <label
                key={option.value}
                className={getDirectionalClasses(
                  direction,
                  'flex items-center gap-2 cursor-pointer',
                )}
              >
                <input
                  type="checkbox"
                  checked={
                    Array.isArray(internalValue) &&
                    internalValue.includes(option.value)
                  }
                  onChange={(e) => {
                    const currentValues = Array.isArray(internalValue)
                      ? internalValue
                      : [];
                    if (e.target.checked) {
                      handleChange([...currentValues, option.value]);
                    } else {
                      handleChange(
                        currentValues.filter((v) => v !== option.value),
                      );
                    }
                  }}
                  disabled={disabled || field.disabled || option.disabled}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">{option.label}</span>
              </label>
            ))}
          </div>
        );

      case 'radio':
        return (
          <div className="space-y-2">
            {field.options?.map((option) => (
              <label
                key={option.value}
                className={getDirectionalClasses(
                  direction,
                  'flex items-center gap-2 cursor-pointer',
                )}
              >
                <input
                  type="radio"
                  name={field.name}
                  value={option.value}
                  checked={internalValue === option.value}
                  onChange={(e) => handleChange(e.target.value)}
                  disabled={disabled || field.disabled || option.disabled}
                  className="w-4 h-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">{option.label}</span>
              </label>
            ))}
          </div>
        );

      case 'checkbox':
        return (
          <label
            className={getDirectionalClasses(
              direction,
              'flex items-center gap-2 cursor-pointer',
            )}
          >
            <input
              type="checkbox"
              checked={Boolean(internalValue)}
              onChange={(e) => handleChange(e.target.checked)}
              disabled={disabled || field.disabled}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700">{field.label}</span>
          </label>
        );

      case 'date':
        return (
          <input
            id={field.id}
            name={field.name}
            type="date"
            value={internalValue}
            className={baseInputClasses}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={onBlur}
            disabled={disabled || field.disabled}
            required={field.required}
            aria-label={field.ariaLabel || field.label}
          />
        );

      case 'number':
        return (
          <input
            id={field.id}
            name={field.name}
            type="number"
            value={internalValue}
            placeholder={field.placeholder}
            className={baseInputClasses}
            onChange={(e) => handleChange(parseFloat(e.target.value) || 0)}
            onBlur={onBlur}
            disabled={disabled || field.disabled}
            required={field.required}
            min={field.validation?.min}
            max={field.validation?.max}
            aria-label={field.ariaLabel || field.label}
          />
        );

      case 'currency':
        return (
          <div className="relative">
            <input
              id={field.id}
              name={field.name}
              type="number"
              value={internalValue}
              placeholder={field.placeholder}
              className={`${baseInputClasses} ${direction === 'rtl' ? 'pl-12' : 'pr-12'}`}
              onChange={(e) => handleChange(parseFloat(e.target.value) || 0)}
              onBlur={onBlur}
              disabled={disabled || field.disabled}
              required={field.required}
              min={0}
              step="0.01"
              aria-label={field.ariaLabel || field.label}
            />
            <div
              className={`absolute inset-y-0 ${direction === 'rtl' ? 'left-3' : 'right-3'} flex items-center text-gray-500`}
            >
              {field.culturalRules?.currencyCode || '$'}
            </div>
            {internalValue > 0 && (
              <div className="mt-1 text-xs text-gray-500">
                {formatCurrency(internalValue, locale)}
              </div>
            )}
          </div>
        );

      default:
        return (
          <input
            id={field.id}
            name={field.name}
            type="text"
            value={internalValue}
            placeholder={field.placeholder}
            className={baseInputClasses}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={onBlur}
            disabled={disabled || field.disabled}
            required={field.required}
            aria-label={field.ariaLabel || field.label}
          />
        );
    }
  };

  return (
    <div className="space-y-1">
      {field.type !== 'checkbox' && (
        <label htmlFor={field.id} className={labelClasses}>
          {field.label}
        </label>
      )}

      {renderField()}

      {field.helpText && (
        <p id={`${field.id}-help`} className="text-xs text-gray-500">
          {field.helpText}
        </p>
      )}

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 text-sm text-red-600"
          >
            <AlertCircleIcon className="w-4 h-4" />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// =============================================================================
// MAIN MULTILINGUAL FORM COMPONENT
// =============================================================================

export const MultilingualForm: React.FC<MultilingualFormProps> = ({
  fields,
  locale,
  direction = 'ltr',
  onSubmit,
  onChange,
  onFieldChange,
  initialValues = {},
  errors = {},
  loading = false,
  className = '',
  submitLabel = 'Submit',
  resetLabel = 'Reset',
  showReset = false,
  autoSave = false,
  autoSaveDelay = 1000,
  validationMode = 'onBlur',
  culturalValidation = true,
  weddingContext,
}) => {
  // State management
  const [formValues, setFormValues] =
    useState<Record<string, any>>(initialValues);
  const [formErrors, setFormErrors] = useState<Record<string, string>>(errors);
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  const [isValidating, setIsValidating] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle');

  // Auto-save functionality
  useEffect(() => {
    if (!autoSave || Object.keys(formValues).length === 0) return;

    const timeoutId = setTimeout(() => {
      setAutoSaveStatus('saving');
      onChange?.(formValues);

      // Simulate async save
      setTimeout(() => {
        setAutoSaveStatus('saved');
        setTimeout(() => setAutoSaveStatus('idle'), 2000);
      }, 500);
    }, autoSaveDelay);

    return () => clearTimeout(timeoutId);
  }, [formValues, autoSave, autoSaveDelay, onChange]);

  // Field validation
  const validateField = (
    field: MultilingualFormField,
    value: any,
  ): string | null => {
    if (
      field.required &&
      (!value || (typeof value === 'string' && value.trim() === ''))
    ) {
      return `${field.label} is required`;
    }

    if (field.validation) {
      const { pattern, minLength, maxLength, min, max, custom } =
        field.validation;

      if (pattern && typeof value === 'string' && !pattern.test(value)) {
        return `${field.label} format is invalid`;
      }

      if (minLength && typeof value === 'string' && value.length < minLength) {
        return `${field.label} must be at least ${minLength} characters`;
      }

      if (maxLength && typeof value === 'string' && value.length > maxLength) {
        return `${field.label} must be no more than ${maxLength} characters`;
      }

      if (min !== undefined && typeof value === 'number' && value < min) {
        return `${field.label} must be at least ${min}`;
      }

      if (max !== undefined && typeof value === 'number' && value > max) {
        return `${field.label} must be no more than ${max}`;
      }

      if (custom) {
        const customError = custom(value);
        if (customError) return customError;
      }
    }

    // Cultural validation
    if (culturalValidation) {
      if (
        field.type === 'tel' &&
        value &&
        !validatePhoneNumber(value, locale)
      ) {
        return `Please enter a valid phone number for ${locale}`;
      }
    }

    return null;
  };

  // Form validation
  const validateForm = (): FormValidationResult => {
    const newErrors: Record<string, string> = {};
    let isValid = true;

    fields.forEach((field) => {
      const error = validateField(field, formValues[field.id]);
      if (error) {
        newErrors[field.id] = error;
        isValid = false;
      }
    });

    return { isValid, errors: newErrors };
  };

  // Handle field change
  const handleFieldChange = (fieldId: string, value: any) => {
    const newValues = { ...formValues, [fieldId]: value };
    setFormValues(newValues);
    onFieldChange?.(fieldId, value);

    // Validate on change if mode is onChange
    if (validationMode === 'onChange') {
      const field = fields.find((f) => f.id === fieldId);
      if (field) {
        const error = validateField(field, value);
        setFormErrors((prev) => ({
          ...prev,
          [fieldId]: error || '',
        }));
      }
    }

    // Clear error when user starts typing
    if (formErrors[fieldId]) {
      setFormErrors((prev) => ({
        ...prev,
        [fieldId]: '',
      }));
    }
  };

  // Handle field blur
  const handleFieldBlur = (fieldId: string) => {
    setTouchedFields((prev) => new Set(prev).add(fieldId));

    if (validationMode === 'onBlur') {
      const field = fields.find((f) => f.id === fieldId);
      if (field) {
        const error = validateField(field, formValues[fieldId]);
        setFormErrors((prev) => ({
          ...prev,
          [fieldId]: error || '',
        }));
      }
    }
  };

  // Handle form submit
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsValidating(true);

    const validation = validateForm();
    setFormErrors(validation.errors);

    if (validation.isValid) {
      onSubmit?.(formValues);
    }

    setIsValidating(false);
  };

  // Handle form reset
  const handleReset = () => {
    setFormValues(initialValues);
    setFormErrors({});
    setTouchedFields(new Set());
    setAutoSaveStatus('idle');
  };

  // Filter visible fields based on dependencies
  const visibleFields = fields.filter((field) => {
    if (!field.dependencies) return true;

    return field.dependencies.every((dep) => {
      const depValue = formValues[dep.field];
      const matches = depValue === dep.value;

      return (
        (dep.action === 'show' && matches) ||
        (dep.action === 'hide' && !matches) ||
        dep.action === 'enable' ||
        dep.action === 'disable'
      );
    });
  });

  const formClasses = getDirectionalClasses(
    direction,
    `space-y-6 ${className}`,
  );

  return (
    <form onSubmit={handleSubmit} className={formClasses} noValidate>
      {/* Auto-save status */}
      {autoSave && autoSaveStatus !== 'idle' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 text-sm text-gray-600 mb-4"
        >
          {autoSaveStatus === 'saving' && (
            <>
              <div className="w-4 h-4 border-2 border-gray-300 border-t-primary-500 rounded-full animate-spin" />
              <span>Saving...</span>
            </>
          )}
          {autoSaveStatus === 'saved' && (
            <>
              <CheckCircleIcon className="w-4 h-4 text-green-500" />
              <span>Saved automatically</span>
            </>
          )}
          {autoSaveStatus === 'error' && (
            <>
              <AlertCircleIcon className="w-4 h-4 text-red-500" />
              <span>Failed to save</span>
            </>
          )}
        </motion.div>
      )}

      {/* Form fields */}
      {visibleFields.map((field) => {
        const isDisabled = field.dependencies?.some((dep) => {
          const depValue = formValues[dep.field];
          return dep.action === 'disable' && depValue === dep.value;
        });

        return (
          <FormField
            key={field.id}
            field={field}
            value={formValues[field.id]}
            error={formErrors[field.id] || errors[field.id]}
            direction={direction}
            locale={locale}
            onChange={(value) => handleFieldChange(field.id, value)}
            onBlur={() => handleFieldBlur(field.id)}
            disabled={loading || isDisabled}
          />
        );
      })}

      {/* Form actions */}
      <div
        className={`flex gap-4 pt-4 ${direction === 'rtl' ? 'flex-row-reverse' : ''}`}
      >
        <button
          type="submit"
          disabled={loading || isValidating}
          className="flex-1 bg-primary-600 text-white py-3 px-6 rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
        >
          {loading || isValidating ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Processing...</span>
            </div>
          ) : (
            submitLabel
          )}
        </button>

        {showReset && (
          <button
            type="button"
            onClick={handleReset}
            disabled={loading || isValidating}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {resetLabel}
          </button>
        )}
      </div>
    </form>
  );
};

export default MultilingualForm;
