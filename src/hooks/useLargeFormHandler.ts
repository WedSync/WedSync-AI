'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { FormField, FormSection } from '@/types/forms';
import {
  usePerformanceMonitor,
  useMemoryOptimization,
} from './usePerformanceOptimization';
import { useProgressiveSaving } from '../components/forms/ProgressiveSavingProvider';
import { useOptimisticUpdates } from '../components/performance/OptimisticUpdateProvider';

interface LargeFormConfig {
  maxFieldsPerPage?: number;
  enableVirtualization?: boolean;
  enableProgressiveSaving?: boolean;
  enableOptimisticUpdates?: boolean;
  chunkSize?: number;
  saveThreshold?: number; // Save when this many changes accumulate
  performanceMode?: 'balanced' | 'memory' | 'speed';
}

interface FormValidationResult {
  isValid: boolean;
  errors: Array<{
    fieldId: string;
    sectionId: string;
    message: string;
    type: 'required' | 'pattern' | 'length' | 'custom';
  }>;
  warnings: Array<{
    fieldId: string;
    message: string;
  }>;
}

interface LargeFormState {
  sections: FormSection[];
  currentPage: number;
  totalPages: number;
  dirtyFields: Set<string>;
  validationErrors: Map<string, string[]>;
  isValidating: boolean;
  isSaving: boolean;
  lastSaveTime: number | null;
}

export const useLargeFormHandler = (config: LargeFormConfig = {}) => {
  const {
    maxFieldsPerPage = 50,
    enableVirtualization = true,
    enableProgressiveSaving = true,
    enableOptimisticUpdates = true,
    chunkSize = 25,
    saveThreshold = 10,
    performanceMode = 'balanced',
  } = config;

  const [state, setState] = useState<LargeFormState>({
    sections: [],
    currentPage: 0,
    totalPages: 1,
    dirtyFields: new Set(),
    validationErrors: new Map(),
    isValidating: false,
    isSaving: false,
    lastSaveTime: null,
  });

  const { logMetric } = usePerformanceMonitor('LargeFormHandler');
  const { addObserver } = useMemoryOptimization();
  const progressiveSaving = useProgressiveSaving();
  const { addOptimisticUpdate, commitUpdate, failUpdate } =
    useOptimisticUpdates();

  // Refs for performance optimization
  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const changeCountRef = useRef(0);
  const lastValidationRef = useRef<number>(0);

  // Memoized computed values
  const allFields = useMemo(
    () => state.sections.flatMap((section) => section.fields),
    [state.sections],
  );

  const totalFields = useMemo(() => allFields.length, [allFields]);

  const paginatedSections = useMemo(() => {
    if (!enableVirtualization || maxFieldsPerPage <= 0) {
      return state.sections;
    }

    const startField = state.currentPage * maxFieldsPerPage;
    const endField = startField + maxFieldsPerPage;
    let fieldCount = 0;
    const visibleSections: FormSection[] = [];

    for (const section of state.sections) {
      const sectionStartCount = fieldCount;
      const sectionEndCount = fieldCount + section.fields.length;

      // Section overlaps with current page
      if (sectionEndCount > startField && sectionStartCount < endField) {
        const visibleFieldsStart = Math.max(0, startField - sectionStartCount);
        const visibleFieldsEnd = Math.min(
          section.fields.length,
          endField - sectionStartCount,
        );

        visibleSections.push({
          ...section,
          fields: section.fields.slice(visibleFieldsStart, visibleFieldsEnd),
        });
      }

      fieldCount += section.fields.length;
    }

    return visibleSections;
  }, [
    state.sections,
    state.currentPage,
    maxFieldsPerPage,
    enableVirtualization,
  ]);

  const formStatistics = useMemo(() => {
    const fieldTypes = new Map<string, number>();
    const requiredFields = new Set<string>();
    let totalValidationRules = 0;

    allFields.forEach((field) => {
      fieldTypes.set(field.type, (fieldTypes.get(field.type) || 0) + 1);

      if (field.validation?.required) {
        requiredFields.add(field.id);
      }

      if (field.validation) {
        totalValidationRules += Object.keys(field.validation).length;
      }
    });

    return {
      totalFields,
      sections: state.sections.length,
      fieldTypes: Object.fromEntries(fieldTypes),
      requiredFields: requiredFields.size,
      totalValidationRules,
      dirtyFields: state.dirtyFields.size,
      errors: Array.from(state.validationErrors.values()).flat().length,
    };
  }, [allFields, totalFields, state]);

  // Memory management
  useEffect(() => {
    const observer = addObserver('LargeFormHandler', totalFields);

    // Cleanup based on performance mode
    if (performanceMode === 'memory') {
      const cleanup = () => {
        // Clear old validation results
        const now = Date.now();
        if (now - lastValidationRef.current > 300000) {
          // 5 minutes
          setState((prev) => ({
            ...prev,
            validationErrors: new Map(),
          }));
        }
      };

      const interval = setInterval(cleanup, 60000); // Run cleanup every minute
      return () => {
        clearInterval(interval);
        observer?.disconnect();
      };
    }

    return () => observer?.disconnect();
  }, [addObserver, totalFields, performanceMode]);

  // Performance monitoring
  useEffect(() => {
    logMetric('totalFormFields', totalFields);
    logMetric('formSections', state.sections.length);
    logMetric('dirtyFieldsCount', state.dirtyFields.size);
  }, [logMetric, totalFields, state.sections.length, state.dirtyFields.size]);

  // Initialize form with sections
  const initializeForm = useCallback(
    (sections: FormSection[]) => {
      const startTime = performance.now();

      const totalPages = Math.max(
        1,
        Math.ceil(
          sections.reduce((sum, s) => sum + s.fields.length, 0) /
            maxFieldsPerPage,
        ),
      );

      setState({
        sections,
        currentPage: 0,
        totalPages,
        dirtyFields: new Set(),
        validationErrors: new Map(),
        isValidating: false,
        isSaving: false,
        lastSaveTime: null,
      });

      const initTime = performance.now() - startTime;
      logMetric('formInitialization', initTime);
      logMetric('formInitialized', 1);
    },
    [maxFieldsPerPage, logMetric],
  );

  // Field validation with debouncing
  const validateField = useCallback(
    async (field: FormField): Promise<string[]> => {
      const errors: string[] = [];

      if (!field.validation) return errors;

      // Required validation
      if (
        field.validation.required &&
        (!field.value || field.value.toString().trim() === '')
      ) {
        errors.push(`${field.label} is required`);
      }

      // Length validation
      const value = field.value?.toString() || '';
      if (
        field.validation.minLength &&
        value.length < field.validation.minLength
      ) {
        errors.push(
          `${field.label} must be at least ${field.validation.minLength} characters`,
        );
      }
      if (
        field.validation.maxLength &&
        value.length > field.validation.maxLength
      ) {
        errors.push(
          `${field.label} must be no more than ${field.validation.maxLength} characters`,
        );
      }

      // Pattern validation
      if (
        field.validation.pattern &&
        value &&
        !new RegExp(field.validation.pattern).test(value)
      ) {
        errors.push(`${field.label} format is invalid`);
      }

      // Custom validation
      if (
        field.validation.custom &&
        typeof field.validation.custom === 'function'
      ) {
        try {
          const customError = await field.validation.custom(value);
          if (customError) {
            errors.push(customError);
          }
        } catch (error) {
          errors.push(`${field.label} validation failed`);
        }
      }

      return errors;
    },
    [],
  );

  // Debounced validation
  const debouncedValidate = useCallback(
    (fieldId: string, field: FormField) => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }

      validationTimeoutRef.current = setTimeout(async () => {
        const startTime = performance.now();
        setState((prev) => ({ ...prev, isValidating: true }));

        try {
          const errors = await validateField(field);

          setState((prev) => ({
            ...prev,
            validationErrors: new Map(prev.validationErrors).set(
              fieldId,
              errors,
            ),
            isValidating: false,
          }));

          const validationTime = performance.now() - startTime;
          logMetric('fieldValidationTime', validationTime);

          lastValidationRef.current = Date.now();
        } catch (error) {
          setState((prev) => ({ ...prev, isValidating: false }));
          logMetric('fieldValidationError', 1);
        }
      }, 300); // 300ms debounce
    },
    [validateField, logMetric],
  );

  // Update field value with optimistic updates
  const updateFieldValue = useCallback(
    (fieldId: string, value: any) => {
      const startTime = performance.now();

      // Add to dirty fields
      setState((prev) => ({
        ...prev,
        dirtyFields: new Set(prev.dirtyFields).add(fieldId),
      }));

      let optimisticId: string | null = null;

      if (enableOptimisticUpdates) {
        optimisticId = addOptimisticUpdate({
          type: 'field_update',
          data: { fieldId, value },
          originalData: null,
        });
      }

      // Update field value
      setState((prev) => ({
        ...prev,
        sections: prev.sections.map((section) => ({
          ...section,
          fields: section.fields.map((field) => {
            if (field.id === fieldId) {
              const updatedField = { ...field, value };

              // Trigger validation
              if (field.validation) {
                debouncedValidate(fieldId, updatedField);
              }

              return updatedField;
            }
            return field;
          }),
        })),
      }));

      // Commit optimistic update
      if (optimisticId) {
        commitUpdate(optimisticId);
      }

      // Progressive saving logic
      changeCountRef.current++;
      if (enableProgressiveSaving && changeCountRef.current >= saveThreshold) {
        const field = allFields.find((f) => f.id === fieldId);
        if (field) {
          progressiveSaving.addFieldsBatch([{ ...field, value }]);
          changeCountRef.current = 0;
        }
      }

      const updateTime = performance.now() - startTime;
      logMetric('fieldUpdateTime', updateTime);
    },
    [
      enableOptimisticUpdates,
      enableProgressiveSaving,
      saveThreshold,
      addOptimisticUpdate,
      commitUpdate,
      debouncedValidate,
      progressiveSaving,
      allFields,
      logMetric,
    ],
  );

  // Add new field
  const addField = useCallback(
    (sectionId: string, field: Omit<FormField, 'id'>) => {
      const newField: FormField = {
        ...field,
        id: `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      };

      setState((prev) => ({
        ...prev,
        sections: prev.sections.map((section) =>
          section.id === sectionId
            ? { ...section, fields: [...section.fields, newField] }
            : section,
        ),
      }));

      if (enableProgressiveSaving) {
        progressiveSaving.addFieldsBatch([newField], sectionId);
      }

      logMetric('fieldAdded', 1);
      return newField.id;
    },
    [enableProgressiveSaving, progressiveSaving, logMetric],
  );

  // Remove field
  const removeField = useCallback(
    (fieldId: string) => {
      setState((prev) => {
        const newDirtyFields = new Set(prev.dirtyFields);
        newDirtyFields.delete(fieldId);

        const newValidationErrors = new Map(prev.validationErrors);
        newValidationErrors.delete(fieldId);

        return {
          ...prev,
          sections: prev.sections.map((section) => ({
            ...section,
            fields: section.fields.filter((field) => field.id !== fieldId),
          })),
          dirtyFields: newDirtyFields,
          validationErrors: newValidationErrors,
        };
      });

      logMetric('fieldRemoved', 1);
    },
    [logMetric],
  );

  // Validate entire form
  const validateForm = useCallback(async (): Promise<FormValidationResult> => {
    const startTime = performance.now();
    setState((prev) => ({ ...prev, isValidating: true }));

    const errors: FormValidationResult['errors'] = [];
    const warnings: FormValidationResult['warnings'] = [];

    try {
      for (const section of state.sections) {
        for (const field of section.fields) {
          const fieldErrors = await validateField(field);

          fieldErrors.forEach((message) => {
            errors.push({
              fieldId: field.id,
              sectionId: section.id,
              message,
              type: message.includes('required') ? 'required' : 'custom',
            });
          });

          // Add warnings for optional improvements
          if (!field.helperText && field.validation?.required) {
            warnings.push({
              fieldId: field.id,
              message: 'Consider adding helper text for required fields',
            });
          }
        }
      }

      setState((prev) => ({ ...prev, isValidating: false }));

      const validationTime = performance.now() - startTime;
      logMetric('fullFormValidationTime', validationTime);

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error) {
      setState((prev) => ({ ...prev, isValidating: false }));
      logMetric('formValidationError', 1);

      return {
        isValid: false,
        errors: [
          {
            fieldId: '',
            sectionId: '',
            message: 'Validation failed due to system error',
            type: 'custom',
          },
        ],
        warnings: [],
      };
    }
  }, [state.sections, validateField, logMetric]);

  // Navigation for paginated forms
  const navigateToPage = useCallback(
    (page: number) => {
      const clampedPage = Math.max(0, Math.min(page, state.totalPages - 1));
      setState((prev) => ({ ...prev, currentPage: clampedPage }));
      logMetric('formPageChange', page);
    },
    [state.totalPages, logMetric],
  );

  // Save entire form
  const saveForm = useCallback(async () => {
    const startTime = performance.now();
    setState((prev) => ({ ...prev, isSaving: true }));

    try {
      if (enableProgressiveSaving) {
        progressiveSaving.addFormMetadata({
          totalFields,
          sections: state.sections.length,
          lastModified: Date.now(),
        });

        state.sections.forEach((section) => {
          progressiveSaving.addSection(section);
        });

        await progressiveSaving.saveNow();
      }

      setState((prev) => ({
        ...prev,
        isSaving: false,
        lastSaveTime: Date.now(),
        dirtyFields: new Set(), // Clear dirty fields after successful save
      }));

      changeCountRef.current = 0;

      const saveTime = performance.now() - startTime;
      logMetric('formSaveTime', saveTime);
      logMetric('formSaved', 1);

      return true;
    } catch (error) {
      setState((prev) => ({ ...prev, isSaving: false }));
      logMetric('formSaveError', 1);
      return false;
    }
  }, [
    enableProgressiveSaving,
    progressiveSaving,
    totalFields,
    state.sections,
    logMetric,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, []);

  return {
    // State
    sections: paginatedSections,
    allSections: state.sections,
    currentPage: state.currentPage,
    totalPages: state.totalPages,
    isValidating: state.isValidating,
    isSaving: state.isSaving,
    lastSaveTime: state.lastSaveTime,
    dirtyFields: state.dirtyFields,
    validationErrors: state.validationErrors,
    statistics: formStatistics,

    // Actions
    initializeForm,
    updateFieldValue,
    addField,
    removeField,
    validateForm,
    navigateToPage,
    saveForm,

    // Navigation helpers
    canGoPrevious: state.currentPage > 0,
    canGoNext: state.currentPage < state.totalPages - 1,
    goToPreviousPage: () => navigateToPage(state.currentPage - 1),
    goToNextPage: () => navigateToPage(state.currentPage + 1),

    // Utility
    getFieldValue: (fieldId: string) => {
      return allFields.find((field) => field.id === fieldId)?.value;
    },
    getFieldErrors: (fieldId: string) => {
      return state.validationErrors.get(fieldId) || [];
    },
    isFieldDirty: (fieldId: string) => {
      return state.dirtyFields.has(fieldId);
    },
  };
};
