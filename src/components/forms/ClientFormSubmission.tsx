'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useFormAnalytics } from '@/hooks/useFormAnalytics';
import { useFormAutoSave } from '@/hooks/useFormAutoSave';
import { AutoSaveFormWrapper } from '@/components/forms/AutoSaveFormWrapper';
import {
  Save,
  Send,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Clock,
  Shield,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ClientFormSubmissionProps {
  form: any;
  existingSubmission: any;
  coreFieldsData: any;
  vendorBranding?: {
    primary?: string;
    secondary?: string;
    text?: string;
    accent?: string;
  };
}

export default function ClientFormSubmission({
  form,
  existingSubmission,
  coreFieldsData,
  vendorBranding,
}: ClientFormSubmissionProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState(existingSubmission?.form_data || {});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const [fieldFocusTime, setFieldFocusTime] = useState<Record<string, number>>(
    {},
  );

  const analytics = useFormAnalytics(form.id);
  const steps = form.form_data?.steps || [
    { fields: form.form_data?.fields || [] },
  ];
  const currentStepData = steps[currentStep] || { fields: [] };

  // Pre-populate with core fields data
  useEffect(() => {
    if (coreFieldsData && !existingSubmission) {
      const preFilledData = { ...formData };

      // Map core fields to form fields
      currentStepData.fields?.forEach((field: any) => {
        const coreFieldMapping = field.coreFieldMapping;
        if (coreFieldMapping && coreFieldsData[coreFieldMapping]) {
          preFilledData[field.id] = coreFieldsData[coreFieldMapping];
        }
      });

      setFormData(preFilledData);

      // Track core field usage
      analytics.trackProgress(
        currentStep + 1,
        calculateCompletionPercentage(preFilledData),
        Object.keys(preFilledData).length,
      );
    }
  }, [coreFieldsData, existingSubmission]);

  // Calculate completion percentage
  const calculateCompletionPercentage = useCallback(
    (data: any) => {
      const allFields = steps.flatMap((step: any) => step.fields || []);
      const requiredFields = allFields.filter((field: any) => field.required);
      const filledRequiredFields = requiredFields.filter(
        (field: any) => data[field.id] && data[field.id].toString().trim(),
      );

      return requiredFields.length > 0
        ? Math.round(
            (filledRequiredFields.length / requiredFields.length) * 100,
          )
        : 100;
    },
    [steps],
  );

  // Handle field changes
  const handleFieldChange = useCallback(
    (fieldId: string, value: any) => {
      const updatedData = { ...formData, [fieldId]: value };
      setFormData(updatedData);

      // Clear validation error if field now has value
      if (validationErrors[fieldId] && value && value.toString().trim()) {
        setValidationErrors((prev) => {
          const { [fieldId]: removed, ...rest } = prev;
          return rest;
        });
      }

      // Track field interaction
      const field = currentStepData.fields?.find((f: any) => f.id === fieldId);
      if (field) {
        analytics.trackFieldInteraction({
          fieldId,
          fieldType: field.type,
          fieldLabel: field.label,
          interactionType: 'change',
          fieldOrder: currentStepData.fields.indexOf(field),
        });
      }

      // Track progress
      const completionPercentage = calculateCompletionPercentage(updatedData);
      analytics.trackProgress(
        currentStep + 1,
        completionPercentage,
        Object.keys(updatedData).length,
      );
    },
    [
      formData,
      validationErrors,
      currentStepData.fields,
      analytics,
      currentStep,
      calculateCompletionPercentage,
    ],
  );

  // Handle field focus
  const handleFieldFocus = useCallback(
    (fieldId: string) => {
      setFieldFocusTime((prev) => ({ ...prev, [fieldId]: Date.now() }));

      const field = currentStepData.fields?.find((f: any) => f.id === fieldId);
      if (field) {
        analytics.trackFieldInteraction({
          fieldId,
          fieldType: field.type,
          fieldLabel: field.label,
          interactionType: 'focus',
          fieldOrder: currentStepData.fields.indexOf(field),
        });
      }
    },
    [currentStepData.fields, analytics],
  );

  // Handle field blur
  const handleFieldBlur = useCallback(
    (fieldId: string) => {
      const focusTime = fieldFocusTime[fieldId];
      if (focusTime) {
        const timeSpent = Math.round((Date.now() - focusTime) / 1000);

        const field = currentStepData.fields?.find(
          (f: any) => f.id === fieldId,
        );
        if (field) {
          analytics.trackFieldInteraction({
            fieldId,
            fieldType: field.type,
            fieldLabel: field.label,
            interactionType: 'blur',
            timeSpentSeconds: timeSpent,
            fieldOrder: currentStepData.fields.indexOf(field),
          });
        }
      }
    },
    [fieldFocusTime, currentStepData.fields, analytics],
  );

  // Validate current step
  const validateCurrentStep = useCallback(() => {
    const errors: Record<string, string> = {};

    currentStepData.fields?.forEach((field: any) => {
      if (field.required) {
        const value = formData[field.id];
        if (!value || value.toString().trim() === '') {
          errors[field.id] = `${field.label} is required`;
        }
      }

      // Additional validation based on field type
      if (field.type === 'email' && formData[field.id]) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData[field.id])) {
          errors[field.id] = 'Please enter a valid email address';
        }
      }

      if (field.type === 'phone' && formData[field.id]) {
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        if (!phoneRegex.test(formData[field.id].replace(/\D/g, ''))) {
          errors[field.id] = 'Please enter a valid phone number';
        }
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [currentStepData.fields, formData]);

  // Navigate to next step
  const handleNextStep = useCallback(() => {
    if (!validateCurrentStep()) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
      window.scrollTo(0, 0);
    }
  }, [currentStep, steps.length, validateCurrentStep]);

  // Navigate to previous step
  const handlePreviousStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      window.scrollTo(0, 0);
    }
  }, [currentStep]);

  // Submit form
  const handleSubmit = useCallback(async () => {
    if (!validateCurrentStep()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    const startTime = Date.now();

    try {
      // Get CSRF token for security
      const csrfToken = document
        .querySelector('meta[name="csrf-token"]')
        ?.getAttribute('content');

      const response = await fetch(
        `/api/forms/${encodeURIComponent(form.id)}/submit`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(csrfToken && { 'X-CSRF-Token': csrfToken }),
          },
          body: JSON.stringify({
            form_data: formData,
            session_id: analytics.sessionId,
          }),
        },
      );

      if (!response.ok) {
        throw new Error('Submission failed');
      }

      const result = await response.json();

      // Track completion
      const totalTime = Math.round((Date.now() - startTime) / 1000);
      analytics.trackCompletion(totalTime);

      setIsCompleted(true);
      toast.success('Form submitted successfully!');
    } catch (error) {
      console.error('Form submission error:', error);
      toast.error('Failed to submit form. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [form.id, formData, analytics, validateCurrentStep]);

  // Completion screen
  if (isCompleted) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="text-center">
          <CardHeader>
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Thank You!</CardTitle>
            <CardDescription className="text-lg">
              Your form has been submitted successfully.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-6">
              We've received your information and will get back to you soon. A
              confirmation email has been sent to your email address.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                variant="outline"
                onClick={() => window.print()}
                className="flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Print Confirmation
              </Button>
              <Button
                onClick={() =>
                  (window.location.href = `/forms/${form.slug}/receipt?session=${analytics.sessionId}`)
                }
                className="flex items-center gap-2"
                style={{
                  backgroundColor: vendorBranding?.primary,
                  color: vendorBranding?.text,
                }}
              >
                <CheckCircle className="w-4 h-4" />
                View Receipt
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <AutoSaveFormWrapper
      submissionId={existingSubmission?.id}
      formId={form.id}
      clientId={form.clients.id}
      initialData={formData}
      onConflictResolution={(serverData) => setFormData(serverData)}
    >
      {({ formData: autoSaveData, updateFormData, saveState, forceSave }) => (
        <div className="space-y-6">
          {/* Progress indicator for multi-step forms */}
          {steps.length > 1 && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm font-medium">
                    Step {currentStep + 1} of {steps.length}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {Math.round(calculateCompletionPercentage(formData))}%
                    complete
                  </div>
                </div>
                <Progress
                  value={((currentStep + 1) / steps.length) * 100}
                  className="w-full"
                />
              </CardContent>
            </Card>
          )}

          {/* Main form content */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {currentStepData.title || `Step ${currentStep + 1}`}
                {coreFieldsData && (
                  <Badge variant="secondary" className="text-xs">
                    Pre-filled
                  </Badge>
                )}
              </CardTitle>
              {currentStepData.description && (
                <CardDescription>{currentStepData.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Form fields */}
              {currentStepData.fields?.map((field: any, index: number) => (
                <FormField
                  key={field.id}
                  field={field}
                  value={formData[field.id]}
                  error={validationErrors[field.id]}
                  onChange={(value) => {
                    handleFieldChange(field.id, value);
                    updateFormData({ [field.id]: value });
                  }}
                  onFocus={() => handleFieldFocus(field.id)}
                  onBlur={() => handleFieldBlur(field.id)}
                  coreFieldValue={coreFieldsData?.[field.coreFieldMapping]}
                  vendorBranding={vendorBranding}
                  autoFocus={index === 0}
                />
              ))}
            </CardContent>
          </Card>

          {/* Navigation buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="flex items-center gap-4">
              {currentStep > 0 && (
                <Button
                  variant="outline"
                  onClick={handlePreviousStep}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Previous
                </Button>
              )}
            </div>

            <div className="flex items-center gap-4">
              {/* Save status indicator */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {saveState.isSaving && (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                )}
                {saveState.lastSaved && !saveState.isSaving && (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Saved</span>
                  </>
                )}
                {saveState.error && (
                  <>
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <button
                      onClick={forceSave}
                      className="text-red-500 underline hover:no-underline"
                    >
                      Retry save
                    </button>
                  </>
                )}
              </div>

              {/* Next/Submit button */}
              {currentStep < steps.length - 1 ? (
                <Button
                  onClick={handleNextStep}
                  className="flex items-center gap-2"
                  style={{
                    backgroundColor: vendorBranding?.primary,
                    color: vendorBranding?.text,
                  }}
                >
                  Next
                  <ArrowRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex items-center gap-2"
                  style={{
                    backgroundColor: vendorBranding?.primary,
                    color: vendorBranding?.text,
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Submit Form
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Security notice */}
          <div className="text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
            <Shield className="w-4 h-4" />
            <span>Your information is encrypted and secure</span>
          </div>
        </div>
      )}
    </AutoSaveFormWrapper>
  );
}

// Individual form field component
interface FormFieldProps {
  field: any;
  value: any;
  error?: string;
  onChange: (value: any) => void;
  onFocus: () => void;
  onBlur: () => void;
  coreFieldValue?: any;
  vendorBranding?: any;
  autoFocus?: boolean;
}

function FormField({
  field,
  value,
  error,
  onChange,
  onFocus,
  onBlur,
  coreFieldValue,
  vendorBranding,
  autoFocus,
}: FormFieldProps) {
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = () => {
    setIsFocused(true);
    onFocus();
  };

  const handleBlur = () => {
    setIsFocused(false);
    onBlur();
  };

  const fieldValue = value || coreFieldValue || '';

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
        {coreFieldValue && (
          <Badge variant="outline" className="ml-2 text-xs">
            Pre-filled
          </Badge>
        )}
      </label>

      {field.helpText && (
        <p className="text-sm text-muted-foreground">{field.helpText}</p>
      )}

      <div className="relative">
        {field.type === 'text' ||
        field.type === 'email' ||
        field.type === 'phone' ? (
          <input
            type={field.type}
            value={fieldValue}
            onChange={(e) => onChange(e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={field.placeholder}
            className={cn(
              'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
              error && 'border-red-500 focus-visible:ring-red-500',
              isFocused &&
                vendorBranding?.primary &&
                !error &&
                'ring-2 ring-offset-2',
            )}
            style={
              isFocused && vendorBranding?.primary && !error
                ? ({
                    borderColor: vendorBranding.primary,
                    '--tw-ring-color': vendorBranding.primary,
                  } as any)
                : {}
            }
            autoFocus={autoFocus}
            data-field-id={field.id}
          />
        ) : field.type === 'textarea' ? (
          <textarea
            value={fieldValue}
            onChange={(e) => onChange(e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={field.placeholder}
            rows={4}
            className={cn(
              'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
              error && 'border-red-500 focus-visible:ring-red-500',
              isFocused &&
                vendorBranding?.primary &&
                !error &&
                'ring-2 ring-offset-2',
            )}
            style={
              isFocused && vendorBranding?.primary && !error
                ? ({
                    borderColor: vendorBranding.primary,
                    '--tw-ring-color': vendorBranding.primary,
                  } as any)
                : {}
            }
            data-field-id={field.id}
          />
        ) : field.type === 'select' ? (
          <select
            value={fieldValue}
            onChange={(e) => onChange(e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            className={cn(
              'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
              error && 'border-red-500 focus-visible:ring-red-500',
            )}
            data-field-id={field.id}
          >
            <option value="">{field.placeholder || 'Please select...'}</option>
            {field.options?.map((option: any) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : field.type === 'radio' ? (
          <div className="space-y-2">
            {field.options?.map((option: any) => (
              <label key={option.value} className="flex items-center space-x-2">
                <input
                  type="radio"
                  name={field.id}
                  value={option.value}
                  checked={fieldValue === option.value}
                  onChange={(e) => onChange(e.target.value)}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  className="h-4 w-4 text-primary border-gray-300 focus:ring-primary"
                  data-field-id={field.id}
                />
                <span className="text-sm">{option.label}</span>
              </label>
            ))}
          </div>
        ) : field.type === 'checkbox' ? (
          <div className="space-y-2">
            {field.options?.map((option: any) => {
              const isChecked = Array.isArray(fieldValue)
                ? fieldValue.includes(option.value)
                : false;
              return (
                <label
                  key={option.value}
                  className="flex items-center space-x-2"
                >
                  <input
                    type="checkbox"
                    value={option.value}
                    checked={isChecked}
                    onChange={(e) => {
                      const currentValues = Array.isArray(fieldValue)
                        ? fieldValue
                        : [];
                      if (e.target.checked) {
                        onChange([...currentValues, option.value]);
                      } else {
                        onChange(
                          currentValues.filter((v: any) => v !== option.value),
                        );
                      }
                    }}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
                    data-field-id={field.id}
                  />
                  <span className="text-sm">{option.label}</span>
                </label>
              );
            })}
          </div>
        ) : null}
      </div>

      {error && (
        <p className="text-sm text-red-500 flex items-center gap-1">
          <AlertCircle className="w-4 h-4" />
          {error}
        </p>
      )}
    </div>
  );
}
