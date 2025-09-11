'use client';

import { FormSection } from '@/types/forms';
import { Button } from '@/components/ui/button';
import { useState, useEffect, useMemo, memo, useCallback } from 'react';
import { useCoreFields } from '@/hooks/useCoreFields';
import { ProgressBar } from '@/components/ui/ProgressIndicator';

interface FormPreviewProps {
  sections: FormSection[];
  settings: {
    name: string;
    description?: string;
    submitButtonText?: string;
    successMessage?: string;
  };
  formId?: string;
  clientId?: string;
}

// Memoized form field component
const FormField = memo(function FormField({
  field,
  value,
  onChange,
}: {
  field: any;
  value: any;
  onChange: (value: any) => void;
}) {
  // Render field based on type
  switch (field.type) {
    case 'text':
    case 'email':
    case 'tel':
    case 'number':
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {field.label}
            {field.validation?.required && (
              <span className="text-red-500 ml-1">*</span>
            )}
          </label>
          <input
            type={field.type}
            placeholder={field.placeholder}
            required={field.validation?.required}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          {field.helperText && (
            <p className="mt-1 text-sm text-gray-500">{field.helperText}</p>
          )}
        </div>
      );

    // Add other field types...
    default:
      return null;
  }
});

export const FormPreview = memo(function FormPreview({
  sections,
  settings,
  formId,
  clientId,
}: FormPreviewProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);
  const [isAutoPopulating, setIsAutoPopulating] = useState(false);

  // Extract all fields from sections for core field detection
  const allFields = useMemo(() => {
    return sections.flatMap((section) =>
      section.fields.filter(
        (field) => !['heading', 'paragraph', 'divider'].includes(field.type),
      ),
    );
  }, [sections]);

  // Use core fields hook for auto-population
  const {
    detectedFields,
    isProcessing,
    autoPopulateFromHistory,
    detectFieldsBatch,
    saveCoreFields,
    stats,
  } = useCoreFields({
    formId: formId || 'temp-form-id',
    clientId: clientId || 'temp-client-id',
    enabled: !!(formId && clientId),
    onAutoPopulate: (populatedData) => {
      // Merge populated data with existing form data
      setFormData((prev) => ({
        ...prev,
        ...populatedData,
      }));
      setIsAutoPopulating(false);
    },
  });

  // Auto-populate on mount if we have form and client IDs
  useEffect(() => {
    if (formId && clientId && allFields.length > 0) {
      setIsAutoPopulating(true);

      // First detect field mappings
      detectFieldsBatch(allFields);

      // Then auto-populate from history
      setTimeout(() => {
        autoPopulateFromHistory();
      }, 300);
    }
  }, [formId, clientId, allFields.length]);

  // Save core fields when form is submitted
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Extract core field values from form data
    const coreFieldUpdates: Record<string, any> = {};
    detectedFields.forEach((field) => {
      if (formData[field.fieldKey]) {
        coreFieldUpdates[field.fieldKey] = formData[field.fieldKey];
      }
    });

    // Save core fields if we have updates
    if (Object.keys(coreFieldUpdates).length > 0 && clientId) {
      await saveCoreFields(coreFieldUpdates);
    }

    // Original submission logic
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  const handleFieldChange = (fieldId: string, value: any) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
  };

  if (submitted) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Success!</h2>
        <p className="text-gray-600">{settings.successMessage}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{settings.name}</h1>
        {settings.description && (
          <p className="mt-2 text-gray-600">{settings.description}</p>
        )}

        {/* Auto-population status */}
        {(isAutoPopulating || isProcessing) && (
          <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-md flex items-center">
            <svg
              className="animate-spin h-5 w-5 text-purple-600 mr-2"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <span className="text-sm text-purple-700">
              Auto-populating fields from previous forms...
            </span>
          </div>
        )}

        {/* Core fields stats */}
        {stats &&
          stats.totalDetected > 0 &&
          !isAutoPopulating &&
          !isProcessing && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-700">
                ✓ Auto-populated {stats.totalDetected} field
                {stats.totalDetected !== 1 ? 's' : ''} from previous forms
              </p>
            </div>
          )}
      </div>

      <form onSubmit={handleFormSubmit} className="space-y-8">
        {sections.map((section) => (
          <div key={section.id}>
            {section.title && section.title !== 'Section 1' && (
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                {section.title}
              </h2>
            )}
            {section.description && (
              <p className="text-gray-600 mb-4">{section.description}</p>
            )}

            <div className="space-y-4">
              {section.fields.map((field) => {
                switch (field.type) {
                  case 'heading':
                    return (
                      <h3
                        key={field.id}
                        className="text-lg font-semibold text-gray-900"
                      >
                        {field.label}
                      </h3>
                    );

                  case 'paragraph':
                    return (
                      <p key={field.id} className="text-gray-600">
                        {field.label}
                      </p>
                    );

                  case 'divider':
                    return <hr key={field.id} className="border-gray-200" />;

                  case 'text':
                  case 'email':
                  case 'tel':
                  case 'number':
                    return (
                      <div key={field.id}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {field.label}
                          {field.validation?.required && (
                            <span className="text-red-500 ml-1">*</span>
                          )}
                        </label>
                        <input
                          type={field.type}
                          placeholder={field.placeholder}
                          required={field.validation?.required}
                          value={formData[field.id] || ''}
                          onChange={(e) =>
                            handleFieldChange(field.id, e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        {field.helperText && (
                          <p className="mt-1 text-sm text-gray-500">
                            {field.helperText}
                          </p>
                        )}
                      </div>
                    );

                  case 'textarea':
                    return (
                      <div key={field.id}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {field.label}
                          {field.validation?.required && (
                            <span className="text-red-500 ml-1">*</span>
                          )}
                        </label>
                        <textarea
                          placeholder={field.placeholder}
                          required={field.validation?.required}
                          value={formData[field.id] || ''}
                          onChange={(e) =>
                            handleFieldChange(field.id, e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                          rows={3}
                        />
                        {field.helperText && (
                          <p className="mt-1 text-sm text-gray-500">
                            {field.helperText}
                          </p>
                        )}
                      </div>
                    );

                  case 'select':
                    return (
                      <div key={field.id}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {field.label}
                          {field.validation?.required && (
                            <span className="text-red-500 ml-1">*</span>
                          )}
                        </label>
                        <select
                          required={field.validation?.required}
                          value={formData[field.id] || ''}
                          onChange={(e) =>
                            handleFieldChange(field.id, e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                          <option value="">Choose an option...</option>
                          {field.options?.map((opt) => (
                            <option key={opt.id} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        {field.helperText && (
                          <p className="mt-1 text-sm text-gray-500">
                            {field.helperText}
                          </p>
                        )}
                      </div>
                    );

                  case 'radio':
                    return (
                      <div key={field.id}>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {field.label}
                          {field.validation?.required && (
                            <span className="text-red-500 ml-1">*</span>
                          )}
                        </label>
                        <div className="space-y-2">
                          {field.options?.map((opt) => (
                            <label key={opt.id} className="flex items-center">
                              <input
                                type="radio"
                                name={field.id}
                                value={opt.value}
                                required={field.validation?.required}
                                checked={formData[field.id] === opt.value}
                                onChange={(e) =>
                                  handleFieldChange(field.id, e.target.value)
                                }
                                className="mr-2 text-purple-600 focus:ring-purple-500"
                              />
                              <span className="text-sm">{opt.label}</span>
                            </label>
                          ))}
                        </div>
                        {field.helperText && (
                          <p className="mt-1 text-sm text-gray-500">
                            {field.helperText}
                          </p>
                        )}
                      </div>
                    );

                  case 'checkbox':
                    return (
                      <div key={field.id}>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {field.label}
                          {field.validation?.required && (
                            <span className="text-red-500 ml-1">*</span>
                          )}
                        </label>
                        <div className="space-y-2">
                          {field.options?.map((opt) => (
                            <label key={opt.id} className="flex items-center">
                              <input
                                type="checkbox"
                                value={opt.value}
                                checked={
                                  formData[field.id]?.[opt.value] || false
                                }
                                onChange={(e) => {
                                  const currentValues =
                                    formData[field.id] || {};
                                  handleFieldChange(field.id, {
                                    ...currentValues,
                                    [opt.value]: e.target.checked,
                                  });
                                }}
                                className="mr-2 text-purple-600 focus:ring-purple-500 rounded"
                              />
                              <span className="text-sm">{opt.label}</span>
                            </label>
                          ))}
                        </div>
                        {field.helperText && (
                          <p className="mt-1 text-sm text-gray-500">
                            {field.helperText}
                          </p>
                        )}
                      </div>
                    );

                  case 'date':
                    return (
                      <div key={field.id}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {field.label}
                          {field.validation?.required && (
                            <span className="text-red-500 ml-1">*</span>
                          )}
                        </label>
                        <input
                          type="date"
                          required={field.validation?.required}
                          value={formData[field.id] || ''}
                          onChange={(e) =>
                            handleFieldChange(field.id, e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        {field.helperText && (
                          <p className="mt-1 text-sm text-gray-500">
                            {field.helperText}
                          </p>
                        )}
                      </div>
                    );

                  case 'time':
                    return (
                      <div key={field.id}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {field.label}
                          {field.validation?.required && (
                            <span className="text-red-500 ml-1">*</span>
                          )}
                        </label>
                        <input
                          type="time"
                          required={field.validation?.required}
                          value={formData[field.id] || ''}
                          onChange={(e) =>
                            handleFieldChange(field.id, e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        {field.helperText && (
                          <p className="mt-1 text-sm text-gray-500">
                            {field.helperText}
                          </p>
                        )}
                      </div>
                    );

                  case 'file':
                    return (
                      <div key={field.id}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {field.label}
                          {field.validation?.required && (
                            <span className="text-red-500 ml-1">*</span>
                          )}
                        </label>
                        <div className="border-2 border-dashed border-gray-300 rounded-md p-4">
                          <input
                            type="file"
                            required={field.validation?.required}
                            onChange={(e) =>
                              handleFieldChange(field.id, e.target.files?.[0])
                            }
                            className="w-full"
                          />
                          {field.helperText && (
                            <p className="mt-1 text-xs text-gray-400">
                              {field.helperText}
                            </p>
                          )}
                        </div>
                      </div>
                    );

                  case 'signature':
                    return (
                      <div key={field.id}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {field.label}
                          {field.validation?.required && (
                            <span className="text-red-500 ml-1">*</span>
                          )}
                        </label>
                        <div className="border border-gray-300 rounded-md h-24 bg-gray-50 flex items-center justify-center">
                          <p className="text-sm text-gray-400">
                            Signature field (click to sign)
                          </p>
                        </div>
                        {field.helperText && (
                          <p className="mt-1 text-sm text-gray-500">
                            {field.helperText}
                          </p>
                        )}
                      </div>
                    );

                  default:
                    return null;
                }
              })}
            </div>
          </div>
        ))}

        <div className="pt-4">
          <Button type="submit" className="w-full">
            {settings.submitButtonText || 'Submit'}
          </Button>
        </div>
      </form>
    </div>
  );
});

export default FormPreview;
