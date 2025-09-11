'use client';

import { useState, useCallback, useEffect } from 'react';
import { FormField, FormFieldType } from '@/types/forms';
import {
  fieldEngine,
  FieldValidationResult,
  FieldTransformOptions,
} from '@/lib/field-engine/FieldEngine';

interface UseFieldEngineOptions {
  autoValidate?: boolean;
  autoTransform?: boolean;
  transformOptions?: FieldTransformOptions;
}

interface FieldEngineState {
  fields: FormField[];
  values: Record<string, any>;
  validationResults: Record<string, FieldValidationResult>;
  isValid: boolean;
  isValidating: boolean;
  transformedValues: Record<string, any>;
}

interface UseFieldEngineReturn extends FieldEngineState {
  // Field management
  createField: (type: FormFieldType, options?: Partial<FormField>) => FormField;
  addField: (field: FormField) => void;
  removeField: (fieldId: string) => void;
  updateField: (fieldId: string, updates: Partial<FormField>) => void;

  // Value management
  setValue: (fieldId: string, value: any) => void;
  setValues: (values: Record<string, any>) => void;
  clearValues: () => void;

  // Validation
  validateField: (fieldId: string, value?: any) => FieldValidationResult;
  validateAllFields: () => FieldValidationResult;
  clearValidation: (fieldId?: string) => void;

  // Transformation
  transformField: (
    fieldId: string,
    value?: any,
    options?: FieldTransformOptions,
  ) => any;
  transformAllFields: (options?: FieldTransformOptions) => Record<string, any>;

  // Templates
  loadTemplate: (templateId: string) => Promise<void>;
  getPopularTemplates: (limit?: number) => any[];

  // Conditional logic
  evaluateConditionalLogic: (fieldId: string) => boolean;
  getVisibleFields: () => FormField[];

  // Utilities
  reset: () => void;
  getFieldById: (fieldId: string) => FormField | undefined;
}

/**
 * Custom hook for using FieldEngine with React components
 */
export function useFieldEngine(
  options: UseFieldEngineOptions = {},
): UseFieldEngineReturn {
  const {
    autoValidate = true,
    autoTransform = true,
    transformOptions = {
      normalize: true,
      sanitize: true,
      validate: false,
      applyDefaults: true,
    },
  } = options;

  const [state, setState] = useState<FieldEngineState>({
    fields: [],
    values: {},
    validationResults: {},
    isValid: true,
    isValidating: false,
    transformedValues: {},
  });

  // Create a new field
  const createField = useCallback(
    (type: FormFieldType, fieldOptions: Partial<FormField> = {}): FormField => {
      return fieldEngine.createField(type, fieldOptions);
    },
    [],
  );

  // Add field to the form
  const addField = useCallback((field: FormField) => {
    setState((prev) => ({
      ...prev,
      fields: [...prev.fields, field],
    }));
  }, []);

  // Remove field from the form
  const removeField = useCallback((fieldId: string) => {
    setState((prev) => {
      const newValidationResults = { ...prev.validationResults };
      const newTransformedValues = { ...prev.transformedValues };
      const newValues = { ...prev.values };

      delete newValidationResults[fieldId];
      delete newTransformedValues[fieldId];
      delete newValues[fieldId];

      return {
        ...prev,
        fields: prev.fields.filter((f) => f.id !== fieldId),
        validationResults: newValidationResults,
        transformedValues: newTransformedValues,
        values: newValues,
      };
    });
  }, []);

  // Update field configuration
  const updateField = useCallback(
    (fieldId: string, updates: Partial<FormField>) => {
      setState((prev) => ({
        ...prev,
        fields: prev.fields.map((field) =>
          field.id === fieldId ? { ...field, ...updates } : field,
        ),
      }));
    },
    [],
  );

  // Set value for a specific field
  const setValue = useCallback(
    (fieldId: string, value: any) => {
      setState((prev) => {
        const newValues = { ...prev.values, [fieldId]: value };
        let newState = { ...prev, values: newValues };

        // Auto-transform if enabled
        if (autoTransform) {
          const field = prev.fields.find((f) => f.id === fieldId);
          if (field) {
            const transformedValue = fieldEngine.transformField(
              field,
              value,
              transformOptions,
            );
            newState.transformedValues = {
              ...prev.transformedValues,
              [fieldId]: transformedValue,
            };
          }
        }

        // Auto-validate if enabled
        if (autoValidate) {
          const field = prev.fields.find((f) => f.id === fieldId);
          if (field) {
            const validation = fieldEngine.validateField(
              field,
              autoTransform ? newState.transformedValues[fieldId] : value,
            );
            newState.validationResults = {
              ...prev.validationResults,
              [fieldId]: validation,
            };

            // Update overall validity
            const allValid = Object.values(newState.validationResults).every(
              (result) => result.isValid,
            );
            newState.isValid = allValid;
          }
        }

        return newState;
      });
    },
    [autoValidate, autoTransform, transformOptions],
  );

  // Set multiple values
  const setValues = useCallback(
    (values: Record<string, any>) => {
      setState((prev) => {
        let newState = { ...prev, values: { ...prev.values, ...values } };

        // Auto-transform if enabled
        if (autoTransform) {
          const transformedValues = { ...prev.transformedValues };
          Object.entries(values).forEach(([fieldId, value]) => {
            const field = prev.fields.find((f) => f.id === fieldId);
            if (field) {
              transformedValues[fieldId] = fieldEngine.transformField(
                field,
                value,
                transformOptions,
              );
            }
          });
          newState.transformedValues = transformedValues;
        }

        // Auto-validate if enabled
        if (autoValidate && prev.fields.length > 0) {
          const validation = fieldEngine.validateFields(
            prev.fields,
            autoTransform ? newState.transformedValues : newState.values,
          );
          const fieldValidations: Record<string, FieldValidationResult> = {};

          prev.fields.forEach((field) => {
            const fieldErrors = validation.errors.filter(
              (e) => e.field === field.id,
            );
            const fieldWarnings = (validation.warnings || []).filter(
              (w) => w.field === field.id,
            );

            fieldValidations[field.id] = {
              isValid: fieldErrors.length === 0,
              errors: fieldErrors,
              warnings: fieldWarnings,
            };
          });

          newState.validationResults = {
            ...prev.validationResults,
            ...fieldValidations,
          };
          newState.isValid = validation.isValid;
        }

        return newState;
      });
    },
    [autoValidate, autoTransform, transformOptions],
  );

  // Clear all values
  const clearValues = useCallback(() => {
    setState((prev) => ({
      ...prev,
      values: {},
      validationResults: {},
      transformedValues: {},
      isValid: true,
    }));
  }, []);

  // Validate a specific field
  const validateField = useCallback(
    (fieldId: string, value?: any): FieldValidationResult => {
      const field = state.fields.find((f) => f.id === fieldId);
      if (!field) {
        return {
          isValid: false,
          errors: [
            { field: fieldId, message: 'Field not found', type: 'system' },
          ],
        };
      }

      const valueToValidate =
        value !== undefined ? value : state.values[fieldId];
      const validation = fieldEngine.validateField(field, valueToValidate);

      // Update state
      setState((prev) => ({
        ...prev,
        validationResults: {
          ...prev.validationResults,
          [fieldId]: validation,
        },
      }));

      return validation;
    },
    [state.fields, state.values],
  );

  // Validate all fields
  const validateAllFields = useCallback((): FieldValidationResult => {
    if (state.fields.length === 0) {
      return { isValid: true, errors: [] };
    }

    setState((prev) => ({ ...prev, isValidating: true }));

    const validation = fieldEngine.validateFields(
      state.fields,
      state.transformedValues || state.values,
    );

    // Create field-specific validation results
    const fieldValidations: Record<string, FieldValidationResult> = {};
    state.fields.forEach((field) => {
      const fieldErrors = validation.errors.filter((e) => e.field === field.id);
      const fieldWarnings = (validation.warnings || []).filter(
        (w) => w.field === field.id,
      );

      fieldValidations[field.id] = {
        isValid: fieldErrors.length === 0,
        errors: fieldErrors,
        warnings: fieldWarnings,
      };
    });

    setState((prev) => ({
      ...prev,
      validationResults: fieldValidations,
      isValid: validation.isValid,
      isValidating: false,
    }));

    return validation;
  }, [state.fields, state.values, state.transformedValues]);

  // Clear validation results
  const clearValidation = useCallback((fieldId?: string) => {
    setState((prev) => {
      if (fieldId) {
        const newValidationResults = { ...prev.validationResults };
        delete newValidationResults[fieldId];
        return {
          ...prev,
          validationResults: newValidationResults,
        };
      } else {
        return {
          ...prev,
          validationResults: {},
          isValid: true,
        };
      }
    });
  }, []);

  // Transform field value
  const transformField = useCallback(
    (fieldId: string, value?: any, options?: FieldTransformOptions): any => {
      const field = state.fields.find((f) => f.id === fieldId);
      if (!field) return value;

      const valueToTransform =
        value !== undefined ? value : state.values[fieldId];
      const transformedValue = fieldEngine.transformField(
        field,
        valueToTransform,
        options || transformOptions,
      );

      // Update state
      setState((prev) => ({
        ...prev,
        transformedValues: {
          ...prev.transformedValues,
          [fieldId]: transformedValue,
        },
      }));

      return transformedValue;
    },
    [state.fields, state.values, transformOptions],
  );

  // Transform all field values
  const transformAllFields = useCallback(
    (options?: FieldTransformOptions): Record<string, any> => {
      const transformed: Record<string, any> = {};

      state.fields.forEach((field) => {
        const value = state.values[field.id];
        transformed[field.id] = fieldEngine.transformField(
          field,
          value,
          options || transformOptions,
        );
      });

      setState((prev) => ({
        ...prev,
        transformedValues: { ...prev.transformedValues, ...transformed },
      }));

      return transformed;
    },
    [state.fields, state.values, transformOptions],
  );

  // Load template
  const loadTemplate = useCallback(async (templateId: string) => {
    try {
      const fields = fieldEngine.createFieldsFromTemplate(templateId);
      setState((prev) => ({
        ...prev,
        fields,
        values: {},
        validationResults: {},
        transformedValues: {},
        isValid: true,
      }));
    } catch (error) {
      console.error('Error loading template:', error);
      throw error;
    }
  }, []);

  // Get popular templates
  const getPopularTemplates = useCallback((limit?: number) => {
    return fieldEngine.getPopularTemplates(limit);
  }, []);

  // Evaluate conditional logic
  const evaluateConditionalLogic = useCallback(
    (fieldId: string): boolean => {
      const field = state.fields.find((f) => f.id === fieldId);
      if (!field) return true;

      return fieldEngine.evaluateConditionalLogic(field, state.values);
    },
    [state.fields, state.values],
  );

  // Get visible fields based on conditional logic
  const getVisibleFields = useCallback((): FormField[] => {
    return state.fields.filter((field) => evaluateConditionalLogic(field.id));
  }, [state.fields, evaluateConditionalLogic]);

  // Reset everything
  const reset = useCallback(() => {
    setState({
      fields: [],
      values: {},
      validationResults: {},
      isValid: true,
      isValidating: false,
      transformedValues: {},
    });
  }, []);

  // Get field by ID
  const getFieldById = useCallback(
    (fieldId: string): FormField | undefined => {
      return state.fields.find((f) => f.id === fieldId);
    },
    [state.fields],
  );

  return {
    // State
    ...state,

    // Field management
    createField,
    addField,
    removeField,
    updateField,

    // Value management
    setValue,
    setValues,
    clearValues,

    // Validation
    validateField,
    validateAllFields,
    clearValidation,

    // Transformation
    transformField,
    transformAllFields,

    // Templates
    loadTemplate,
    getPopularTemplates,

    // Conditional logic
    evaluateConditionalLogic,
    getVisibleFields,

    // Utilities
    reset,
    getFieldById,
  };
}
