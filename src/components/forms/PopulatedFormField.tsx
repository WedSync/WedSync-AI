'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye,
  EyeOff,
  Shield,
  Sparkles,
  Check,
  X,
  Clock,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

// Untitled UI components
import { Button } from '@/components/untitled-ui/button';
import { Input } from '@/components/untitled-ui/input';
import { Label } from '@/components/untitled-ui/label';
import { Badge } from '@/components/untitled-ui/badge';

// UI components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Context and types
import { useAutoPopulationContext } from './AutoPopulationProvider';
import {
  type FieldType,
  type PopulationSource,
  type ConfidenceLevel,
  type AccessibilityProps,
} from '@/types/auto-population';

// Utility functions
import { cn } from '@/lib/utils';

interface PopulatedFormFieldProps extends AccessibilityProps {
  fieldId: string;
  fieldType: FieldType;
  fieldName: string;
  value: string;
  onChange: (value: string) => void;
  source?: PopulationSource;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'filled' | 'outlined';
  autoRequestPopulation?: boolean;
  showConfidenceDetails?: boolean;
  enableSparkleAnimation?: boolean;
  onPopulationAccepted?: (value: string, fieldId: string) => void;
  onPopulationRejected?: (reason: string, fieldId: string) => void;
  onValidationChange?: (isValid: boolean, errors: string[]) => void;
}

// Wedding-specific field validation
const validateFieldValue = (
  value: string,
  fieldType: FieldType,
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!value.trim()) {
    return { isValid: true, errors: [] }; // Empty is valid (let required prop handle it)
  }

  switch (fieldType) {
    case 'email':
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        errors.push('Please enter a valid email address');
      }
      break;

    case 'phone':
      const phoneRegex = /^[\+]?[1-9][\d\s\-\(\)]{7,15}$/;
      if (!phoneRegex.test(value.replace(/\s/g, ''))) {
        errors.push('Please enter a valid phone number');
      }
      break;

    case 'name':
      if (value.length < 2) {
        errors.push('Name must be at least 2 characters');
      }
      if (!/^[a-zA-Z\s'-]+$/.test(value)) {
        errors.push(
          'Name can only contain letters, spaces, hyphens, and apostrophes',
        );
      }
      break;

    case 'date':
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        errors.push('Please enter a valid date');
      }
      break;

    case 'number':
      if (isNaN(Number(value))) {
        errors.push('Please enter a valid number');
      }
      break;

    case 'currency':
      const currencyRegex = /^\$?[\d,]+\.?\d{0,2}$/;
      if (!currencyRegex.test(value)) {
        errors.push('Please enter a valid amount (e.g., $1,234.56)');
      }
      break;
  }

  return { isValid: errors.length === 0, errors };
};

// Mask sensitive data
const maskSensitiveValue = (
  value: string,
  fieldType: FieldType,
  shouldMask: boolean,
): string => {
  if (!shouldMask || !value) return value;

  switch (fieldType) {
    case 'ssn':
      return value.replace(/\d(?=\d{4})/g, '*');
    case 'creditCard':
      return value.replace(/\d(?=\d{4})/g, '*');
    case 'email':
      const [local, domain] = value.split('@');
      if (!local || !domain) return value;
      return `${local.slice(0, 2)}***@${domain}`;
    default:
      if (value.length > 6) {
        return `${value.slice(0, 2)}${'*'.repeat(value.length - 4)}${value.slice(-2)}`;
      }
      return '*'.repeat(value.length);
  }
};

// Get confidence level color
const getConfidenceColor = (level: ConfidenceLevel): string => {
  switch (level) {
    case 'high':
      return 'bg-green-500 text-white border-green-600';
    case 'medium':
      return 'bg-yellow-500 text-white border-yellow-600';
    case 'low':
      return 'bg-orange-500 text-white border-orange-600';
    default:
      return 'bg-gray-500 text-white border-gray-600';
  }
};

// Convert confidence score to level
const getConfidenceLevel = (score: number): ConfidenceLevel => {
  if (score >= 0.9) return 'high';
  if (score >= 0.7) return 'medium';
  return 'low';
};

// Check if field type is sensitive
const isSensitiveField = (fieldType: FieldType): boolean => {
  return ['ssn', 'creditCard', 'email'].includes(fieldType);
};

export function PopulatedFormField({
  fieldId,
  fieldType,
  fieldName,
  value,
  onChange,
  source = 'ml_suggestion',
  required = false,
  disabled = false,
  placeholder,
  className,
  size = 'md',
  variant = 'default',
  autoRequestPopulation = true,
  showConfidenceDetails = true,
  enableSparkleAnimation = true,
  onPopulationAccepted,
  onPopulationRejected,
  onValidationChange,
  ariaLabel,
  ariaDescribedBy,
  role,
  tabIndex,
  onKeyDown,
  screenReaderText,
}: PopulatedFormFieldProps) {
  // Context
  const {
    session,
    populationData,
    isLoading,
    error,
    requestPopulation,
    acceptPopulation,
    rejectPopulation,
    grantConsent,
    isSessionValid,
  } = useAutoPopulationContext();

  // Local state
  const [showSensitiveValue, setShowSensitiveValue] = useState(false);
  const [hasRequestedPopulation, setHasRequestedPopulation] = useState(false);
  const [validationState, setValidationState] = useState<{
    isValid: boolean;
    errors: string[];
  }>({
    isValid: true,
    errors: [],
  });
  const [showDetails, setShowDetails] = useState(false);
  const [hasBeenFocused, setHasBeenFocused] = useState(false);

  // Get population data for this field
  const fieldPopulationData = populationData.get(fieldId);

  // Determine if field is sensitive
  const isSensitive = isSensitiveField(fieldType);

  // Validate input value
  const handleValidation = useCallback(
    (newValue: string) => {
      const validation = validateFieldValue(newValue, fieldType);
      setValidationState(validation);
      onValidationChange?.(validation.isValid, validation.errors);
      return validation.isValid;
    },
    [fieldType, onValidationChange],
  );

  // Handle input change
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      handleValidation(newValue);
      onChange(newValue);
    },
    [onChange, handleValidation],
  );

  // Request auto-population
  const handleRequestPopulation = useCallback(async () => {
    if (
      !session?.hasUserConsent ||
      hasRequestedPopulation ||
      fieldPopulationData
    ) {
      return;
    }

    setHasRequestedPopulation(true);

    try {
      const result = await requestPopulation({
        fieldId,
        fieldType,
        fieldName,
        currentValue: value,
        source,
        organizationId: session.organizationId,
      });

      if (result && enableSparkleAnimation) {
        // Trigger sparkle animation
        const fieldElement = document.getElementById(fieldId);
        if (fieldElement) {
          fieldElement.classList.add('animate-pulse');
          setTimeout(() => {
            fieldElement.classList.remove('animate-pulse');
          }, 1000);
        }
      }
    } catch (error) {
      console.error('Population request failed:', error);
      setHasRequestedPopulation(false);
    }
  }, [
    session,
    hasRequestedPopulation,
    fieldPopulationData,
    requestPopulation,
    fieldId,
    fieldType,
    fieldName,
    value,
    source,
    enableSparkleAnimation,
  ]);

  // Accept population suggestion
  const handleAcceptPopulation = useCallback(() => {
    if (!fieldPopulationData) return;

    const newValue = fieldPopulationData.populatedValue;
    const isValid = handleValidation(newValue);

    if (isValid) {
      onChange(newValue);
      acceptPopulation(fieldId);
      onPopulationAccepted?.(newValue, fieldId);

      // Screen reader announcement
      const announcement = `Field ${fieldName} auto-filled with ${isSensitive ? 'secure data' : newValue}`;
      const ariaLive = document.createElement('div');
      ariaLive.setAttribute('aria-live', 'polite');
      ariaLive.setAttribute('aria-atomic', 'true');
      ariaLive.className = 'sr-only';
      ariaLive.textContent = announcement;
      document.body.appendChild(ariaLive);
      setTimeout(() => document.body.removeChild(ariaLive), 1000);
    }
  }, [
    fieldPopulationData,
    handleValidation,
    onChange,
    acceptPopulation,
    fieldId,
    onPopulationAccepted,
    fieldName,
    isSensitive,
  ]);

  // Reject population suggestion
  const handleRejectPopulation = useCallback(
    (reason: string) => {
      rejectPopulation(fieldId, reason);
      onPopulationRejected?.(reason, fieldId);
    },
    [rejectPopulation, fieldId, onPopulationRejected],
  );

  // Auto-request population when appropriate
  useEffect(() => {
    if (
      autoRequestPopulation &&
      !value &&
      !fieldPopulationData &&
      !hasRequestedPopulation &&
      session?.hasUserConsent &&
      isSessionValid()
    ) {
      handleRequestPopulation();
    }
  }, [
    autoRequestPopulation,
    value,
    fieldPopulationData,
    hasRequestedPopulation,
    session?.hasUserConsent,
    isSessionValid,
    handleRequestPopulation,
  ]);

  // Initial validation
  useEffect(() => {
    if (value) {
      handleValidation(value);
    }
  }, [value, handleValidation]);

  // Memoized display values
  const displayValue = useMemo(() => {
    if (isSensitive && !showSensitiveValue) {
      return maskSensitiveValue(value, fieldType, true);
    }
    return value;
  }, [value, isSensitive, showSensitiveValue, fieldType]);

  const displayPopulatedValue = useMemo(() => {
    if (!fieldPopulationData) return '';

    if (isSensitive && !showSensitiveValue) {
      return maskSensitiveValue(
        fieldPopulationData.populatedValue,
        fieldType,
        true,
      );
    }
    return fieldPopulationData.populatedValue;
  }, [fieldPopulationData, isSensitive, showSensitiveValue, fieldType]);

  // Confidence level and styling
  const confidenceLevel = fieldPopulationData
    ? getConfidenceLevel(fieldPopulationData.confidenceScore)
    : 'low';
  const confidenceColor = getConfidenceColor(confidenceLevel);

  // Size and variant classes
  const sizeClasses = {
    sm: 'text-sm px-3 py-1.5',
    md: 'text-base px-3.5 py-2.5',
    lg: 'text-lg px-4 py-3',
  };

  const variantClasses = {
    default: 'border-gray-300 bg-white',
    filled: 'border-gray-200 bg-gray-50',
    outlined: 'border-2 border-gray-300 bg-transparent',
  };

  // Animation variants
  const sparkleVariants = {
    hidden: { scale: 0, opacity: 0 },
    visible: {
      scale: [0, 1.2, 1],
      opacity: [0, 1, 0.8],
      transition: { duration: 0.6, ease: 'easeOut' },
    },
  };

  return (
    <TooltipProvider>
      <div className={cn('space-y-3', className)}>
        {/* Field Header */}
        <div className="flex items-center justify-between">
          <Label
            htmlFor={fieldId}
            className="flex items-center gap-2 text-sm font-medium text-gray-700"
          >
            {fieldName}
            {required && <span className="text-red-500">*</span>}

            {isSensitive && (
              <Tooltip>
                <TooltipTrigger>
                  <Shield className="h-4 w-4 text-amber-500" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Sensitive field - data is encrypted and audited</p>
                </TooltipContent>
              </Tooltip>
            )}

            {fieldPopulationData && enableSparkleAnimation && (
              <motion.div
                variants={sparkleVariants}
                initial="hidden"
                animate="visible"
                className="text-blue-500"
              >
                <Sparkles className="h-4 w-4" />
              </motion.div>
            )}
          </Label>

          {isSensitive && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowSensitiveValue(!showSensitiveValue)}
              className="h-8 w-8 p-0"
              aria-label={
                showSensitiveValue
                  ? 'Hide sensitive data'
                  : 'Show sensitive data'
              }
            >
              {showSensitiveValue ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>

        {/* Input Field */}
        <div className="relative">
          <Input
            id={fieldId}
            type={isSensitive && !showSensitiveValue ? 'password' : 'text'}
            value={displayValue}
            onChange={handleInputChange}
            onFocus={() => setHasBeenFocused(true)}
            placeholder={placeholder}
            disabled={disabled || isLoading}
            required={required}
            className={cn(
              sizeClasses[size],
              variantClasses[variant],
              'transition-all duration-200',
              validationState.errors.length > 0 &&
                'border-red-500 focus:ring-red-500',
              validationState.isValid &&
                hasBeenFocused &&
                value &&
                'border-green-500 focus:ring-green-500',
              fieldPopulationData &&
                !fieldPopulationData.isVerified &&
                'border-blue-300 bg-blue-50',
              isLoading && 'opacity-50 cursor-not-allowed',
            )}
            autoComplete="off"
            spellCheck={false}
            aria-label={ariaLabel || `${fieldName} input field`}
            aria-describedby={ariaDescribedBy}
            role={role}
            tabIndex={tabIndex}
            onKeyDown={onKeyDown}
          />

          {/* Status Icons */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {isLoading && (
              <Clock className="h-4 w-4 animate-spin text-blue-500" />
            )}

            {validationState.isValid &&
              hasBeenFocused &&
              value &&
              !isLoading && <Check className="h-4 w-4 text-green-500" />}

            {validationState.errors.length > 0 && (
              <AlertTriangle className="h-4 w-4 text-red-500" />
            )}
          </div>
        </div>

        {/* Validation Errors */}
        <AnimatePresence>
          {validationState.errors.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {validationState.errors.join(', ')}
                </AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Consent Request */}
        <AnimatePresence>
          {!session?.hasUserConsent &&
            isSessionValid() &&
            !fieldPopulationData && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <Card className="border-blue-200 bg-blue-50">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm text-blue-900">
                      <Info className="h-4 w-4" />
                      Smart Auto-Fill Available
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    <p className="text-sm text-blue-700">
                      We can suggest a value for this field based on your
                      wedding details and {source.replace('_', ' ')} data. Would
                      you like to enable auto-fill suggestions?
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          grantConsent();
                          setTimeout(handleRequestPopulation, 100); // Small delay to ensure consent is registered
                        }}
                        disabled={isLoading}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {isLoading ? 'Loading...' : 'Enable Auto-Fill'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleRejectPopulation('User declined consent')
                        }
                        disabled={isLoading}
                      >
                        No, thanks
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
        </AnimatePresence>

        {/* Population Suggestion */}
        <AnimatePresence>
          {fieldPopulationData && !fieldPopulationData.isVerified && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              <Card className="border-green-200 bg-green-50">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-sm text-green-900">
                      <Sparkles className="h-4 w-4" />
                      Suggestion: {displayPopulatedValue}
                    </CardTitle>

                    <div className="flex items-center gap-2">
                      <Badge className={cn('text-xs', confidenceColor)}>
                        {Math.round(fieldPopulationData.confidenceScore * 100)}%
                        confident
                      </Badge>

                      {showConfidenceDetails && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowDetails(!showDetails)}
                          className="h-6 w-6 p-0 text-green-700"
                        >
                          {showDetails ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0 space-y-3">
                  <div className="text-xs text-green-700">
                    From {fieldPopulationData.source.replace('_', ' ')} •
                    {fieldPopulationData.metadata.sourceType} • Processed in{' '}
                    {fieldPopulationData.metadata.processingTime}ms
                  </div>

                  {/* Detailed Information */}
                  <AnimatePresence>
                    {showDetails && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-2 text-xs text-green-600"
                      >
                        <div>
                          <strong>Confidence Level:</strong>{' '}
                          {confidenceLevel.toUpperCase()}
                        </div>
                        <div>
                          <strong>Validation:</strong>{' '}
                          {fieldPopulationData.metadata.validation.passed ? (
                            <span className="text-green-700">✓ Passed</span>
                          ) : (
                            <span className="text-red-600">
                              ✗ Failed:{' '}
                              {fieldPopulationData.metadata.validation.errors.join(
                                ', ',
                              )}
                            </span>
                          )}
                        </div>
                        <div>
                          <strong>Source Type:</strong>{' '}
                          {fieldPopulationData.metadata.sourceType}
                        </div>
                        {fieldPopulationData.isSensitive && (
                          <div className="text-amber-600">
                            <Shield className="h-3 w-3 inline mr-1" />
                            Sensitive data - encrypted and audited
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleAcceptPopulation}
                      disabled={!fieldPopulationData.metadata.validation.passed}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Check className="h-3 w-3 mr-1" />
                      Use This
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleRejectPopulation('User preferred manual entry')
                      }
                    >
                      <X className="h-3 w-3 mr-1" />
                      Decline
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error Display */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Security Status */}
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Shield className="h-3 w-3" />
          <span>
            {isSensitive ? 'Encrypted' : 'Standard'} •
            {isSessionValid() ? 'Session active' : 'Session expired'} • Field
            secured
          </span>
        </div>

        {/* Screen Reader Text */}
        {screenReaderText && (
          <div className="sr-only" aria-live="polite" aria-atomic="true">
            {screenReaderText}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
