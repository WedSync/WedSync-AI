/**
 * useAutoPopulation Hook - WS-216 Team A
 * Enterprise-Grade Auto-Population System Interface
 *
 * Provides clean interface for components to interact with auto-population system:
 * - Field-level population management
 * - Session state access
 * - Performance monitoring
 * - Security compliance helpers
 * - Wedding industry-specific utilities
 */

import { useContext, useCallback, useMemo, useRef, useEffect } from 'react';
import { AutoPopulationContext } from '@/components/forms/AutoPopulationProvider';
import type {
  FieldPopulationData,
  PopulationRequest,
  FieldType,
  PopulationSource,
  ConfidenceLevel,
  PerformanceMetrics,
} from '@/types/auto-population';

export interface UseAutoPopulationOptions {
  /** Field-specific options */
  fieldId?: string;
  fieldType?: FieldType;
  fieldName?: string;

  /** Performance monitoring */
  enablePerformanceTracking?: boolean;
  performanceThreshold?: number; // ms

  /** Security options */
  sensitiveField?: boolean;
  requireExplicitConsent?: boolean;

  /** Wedding industry specific */
  weddingRole?: 'bride' | 'groom' | 'couple' | 'vendor';
  weddingPhase?: 'planning' | 'active' | 'completed';

  /** Callbacks */
  onFieldPopulated?: (data: FieldPopulationData) => void;
  onFieldRejected?: (fieldId: string, reason: string) => void;
  onError?: (error: Error, context?: Record<string, unknown>) => void;
}

export interface AutoPopulationHookReturn {
  // Core state
  session: ReturnType<
    typeof useContext<typeof AutoPopulationContext>
  >['session'];
  isLoading: boolean;
  error: string | null;
  isSessionValid: boolean;

  // Field-specific data
  fieldData: FieldPopulationData | null;
  isFieldPopulated: boolean;
  fieldConfidence: ConfidenceLevel | null;

  // Actions
  requestPopulation: (
    request: Omit<PopulationRequest, 'organizationId'>,
  ) => Promise<FieldPopulationData | null>;
  acceptField: (fieldId?: string) => Promise<void>;
  rejectField: (fieldId: string, reason: string) => Promise<void>;
  clearField: (fieldId: string) => void;

  // Batch operations
  acceptAllHighConfidence: () => Promise<void>;
  rejectAllLowConfidence: (reason: string) => Promise<void>;

  // Session management
  refreshSession: () => Promise<void>;
  grantConsent: () => void;
  revokeConsent: () => void;
  exportAuditLog: () => string;

  // Wedding industry utilities
  getWeddingFieldSuggestions: (fieldType: FieldType) => string[];
  formatFieldForWedding: (value: string, fieldType: FieldType) => string;
  validateWeddingField: (
    value: string,
    fieldType: FieldType,
  ) => { isValid: boolean; errors: string[] };

  // Performance helpers
  getPerformanceMetrics: () => PerformanceMetrics | null;

  // Security helpers
  isSensitiveField: (fieldType: FieldType) => boolean;
  requiresConsent: () => boolean;
  getSecurityCompliance: () => { score: number; violations: string[] };
}

/**
 * Custom hook for auto-population functionality
 * Provides clean interface to interact with AutoPopulationProvider
 */
export function useAutoPopulation(
  options: UseAutoPopulationOptions = {},
): AutoPopulationHookReturn {
  const context = useContext(AutoPopulationContext);
  const performanceRef = useRef<{ startTime: number; operations: string[] }>({
    startTime: 0,
    operations: [],
  });

  if (!context) {
    throw new Error(
      'useAutoPopulation must be used within AutoPopulationProvider',
    );
  }

  const {
    session,
    populationData,
    isLoading,
    error,
    requestPopulation: contextRequestPopulation,
    acceptPopulation,
    rejectPopulation,
    clearSession,
    grantConsent: contextGrantConsent,
    revokeConsent: contextRevokeConsent,
    isSessionValid: contextIsSessionValid,
    getSessionSummary,
    exportAuditLog: contextExportAuditLog,
  } = context;

  // Get field-specific data
  const fieldData = useMemo(() => {
    if (!options.fieldId) return null;
    return populationData.get(options.fieldId) || null;
  }, [populationData, options.fieldId]);

  // Field-specific computed values
  const isFieldPopulated = useMemo(() => {
    return fieldData?.status === 'accepted' || fieldData?.status === 'pending';
  }, [fieldData]);

  const fieldConfidence = useMemo(() => {
    return fieldData?.confidenceLevel || null;
  }, [fieldData]);

  // Performance tracking
  useEffect(() => {
    if (options.enablePerformanceTracking) {
      performanceRef.current.startTime = performance.now();
    }
  }, [options.enablePerformanceTracking]);

  // Error handling with context
  const handleError = useCallback(
    (error: Error, context?: Record<string, unknown>) => {
      console.error('[useAutoPopulation]', error, context);
      options.onError?.(error, {
        fieldId: options.fieldId,
        fieldType: options.fieldType,
        weddingRole: options.weddingRole,
        ...context,
      });
    },
    [options],
  );

  // Enhanced request population with field-specific logic
  const requestPopulation = useCallback(
    async (
      request: Omit<PopulationRequest, 'organizationId'>,
    ): Promise<FieldPopulationData | null> => {
      try {
        const startTime = performance.now();

        if (!session?.organizationId) {
          throw new Error('No valid session for population request');
        }

        // Check if sensitive field requires explicit consent
        if (
          options.sensitiveField &&
          options.requireExplicitConsent &&
          !session.hasUserConsent
        ) {
          throw new Error(
            'Explicit consent required for sensitive field population',
          );
        }

        const fullRequest: PopulationRequest = {
          ...request,
          organizationId: session.organizationId,
        };

        const result = await contextRequestPopulation(fullRequest);

        if (result) {
          options.onFieldPopulated?.(result);

          // Performance tracking
          if (options.enablePerformanceTracking) {
            const duration = performance.now() - startTime;
            if (
              options.performanceThreshold &&
              duration > options.performanceThreshold
            ) {
              console.warn(
                `[useAutoPopulation] Slow population request: ${duration}ms for field ${request.fieldId}`,
              );
            }
          }
        }

        return result;
      } catch (error) {
        handleError(error as Error, { request });
        return null;
      }
    },
    [session, contextRequestPopulation, options, handleError],
  );

  // Accept field with callback
  const acceptField = useCallback(
    async (fieldId?: string) => {
      const targetFieldId = fieldId || options.fieldId;
      if (!targetFieldId) {
        throw new Error('Field ID required for accept operation');
      }

      try {
        await acceptPopulation(targetFieldId);
      } catch (error) {
        handleError(error as Error, {
          action: 'accept',
          fieldId: targetFieldId,
        });
        throw error;
      }
    },
    [acceptPopulation, options.fieldId, handleError],
  );

  // Reject field with callback
  const rejectField = useCallback(
    async (fieldId: string, reason: string) => {
      try {
        await rejectPopulation(fieldId, reason);
        options.onFieldRejected?.(fieldId, reason);
      } catch (error) {
        handleError(error as Error, { action: 'reject', fieldId, reason });
        throw error;
      }
    },
    [rejectPopulation, options.onFieldRejected, handleError],
  );

  // Clear specific field
  const clearField = useCallback(
    (fieldId: string) => {
      populationData.delete(fieldId);
    },
    [populationData],
  );

  // Batch operations
  const acceptAllHighConfidence = useCallback(async () => {
    const highConfidenceFields: any[] = [];
    populationData.forEach((data) => {
      if (data.confidenceLevel === 'high' && data.status === 'pending') {
        highConfidenceFields.push(data);
      }
    });

    for (const field of highConfidenceFields) {
      try {
        await acceptPopulation(field.fieldId);
      } catch (error) {
        handleError(error as Error, {
          action: 'batchAccept',
          fieldId: field.fieldId,
        });
      }
    }
  }, [populationData, acceptPopulation, handleError]);

  const rejectAllLowConfidence = useCallback(
    async (reason: string) => {
      const lowConfidenceFields: any[] = [];
      populationData.forEach((data) => {
        if (data.confidenceLevel === 'low' && data.status === 'pending') {
          lowConfidenceFields.push(data);
        }
      });

      for (const field of lowConfidenceFields) {
        try {
          await rejectPopulation(field.fieldId, reason);
        } catch (error) {
          handleError(error as Error, {
            action: 'batchReject',
            fieldId: field.fieldId,
          });
        }
      }
    },
    [populationData, rejectPopulation, handleError],
  );

  // Session management
  const refreshSession = useCallback(async () => {
    if (session?.organizationId) {
      // This would typically refresh session data from server
      console.log(
        '[useAutoPopulation] Refreshing session for org:',
        session.organizationId,
      );
    }
  }, [session]);

  const grantConsent = useCallback(() => {
    contextGrantConsent();
  }, [contextGrantConsent]);

  const revokeConsent = useCallback(() => {
    contextRevokeConsent();
  }, [contextRevokeConsent]);

  const exportAuditLog = useCallback(() => {
    return contextExportAuditLog();
  }, [contextExportAuditLog]);

  // Wedding industry utilities
  const getWeddingFieldSuggestions = useCallback(
    (fieldType: FieldType): string[] => {
      const suggestions: Record<FieldType, string[]> = {
        name: [
          'Bride',
          'Groom',
          'Maid of Honor',
          'Best Man',
          'Wedding Planner',
        ],
        email: ['[name]@gmail.com', '[name]@outlook.com', '[name]@yahoo.com'],
        phone: ['+1 (555) 123-4567', '+1 (555) 987-6543'],
        address: [
          '123 Wedding Lane, Ceremony City',
          '456 Reception Road, Party Town',
        ],
        date: ['2024-06-15', '2024-09-21', '2024-10-12'], // Popular wedding dates
        time: ['3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM'], // Popular ceremony times
        currency: ['$5,000', '$10,000', '$15,000', '$25,000'], // Budget ranges
        text: ['Traditional', 'Rustic', 'Beach', 'Garden', 'Modern'], // Wedding styles
        number: ['50', '75', '100', '150', '200'], // Guest counts
        url: ['https://example.com/wedding', 'https://ourwedding.com'],
        creditCard: [], // No suggestions for sensitive data
        ssn: [], // No suggestions for sensitive data
        postalCode: ['12345', '90210', '10001'],
        datetime: ['2024-06-15T15:00:00', '2024-09-21T16:00:00'],
      };

      return suggestions[fieldType] || [];
    },
    [],
  );

  const formatFieldForWedding = useCallback(
    (value: string, fieldType: FieldType): string => {
      if (!value) return '';

      switch (fieldType) {
        case 'name':
          return value
            .split(' ')
            .map(
              (word) =>
                word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
            )
            .join(' ');

        case 'phone':
          const cleaned = value.replace(/\D/g, '');
          if (cleaned.length === 10) {
            return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
          }
          return value;

        case 'currency':
          const amount = parseFloat(value.replace(/[^\d.]/g, ''));
          if (!isNaN(amount)) {
            return new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
            }).format(amount);
          }
          return value;

        case 'date':
          try {
            const date = new Date(value);
            return date.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            });
          } catch {
            return value;
          }

        default:
          return value;
      }
    },
    [],
  );

  const validateWeddingField = useCallback(
    (value: string, fieldType: FieldType) => {
      const errors: string[] = [];

      if (!value?.trim()) {
        return { isValid: false, errors: ['Field is required'] };
      }

      switch (fieldType) {
        case 'email':
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            errors.push('Please enter a valid email address');
          }
          break;

        case 'phone':
          const cleaned = value.replace(/\D/g, '');
          if (cleaned.length !== 10) {
            errors.push('Phone number must be 10 digits');
          }
          break;

        case 'date':
          const date = new Date(value);
          if (isNaN(date.getTime())) {
            errors.push('Please enter a valid date');
          } else if (date < new Date()) {
            errors.push('Wedding date should be in the future');
          }
          break;

        case 'currency':
          const amount = parseFloat(value.replace(/[^\d.]/g, ''));
          if (isNaN(amount) || amount < 0) {
            errors.push('Please enter a valid amount');
          }
          break;

        case 'number':
          const num = parseInt(value);
          if (isNaN(num) || num < 1) {
            errors.push('Please enter a valid number');
          }
          break;
      }

      return { isValid: errors.length === 0, errors };
    },
    [],
  );

  // Performance metrics
  const getPerformanceMetrics = useCallback((): PerformanceMetrics | null => {
    if (
      !options.enablePerformanceTracking ||
      !performanceRef.current.startTime
    ) {
      return null;
    }

    const totalTime = performance.now() - performanceRef.current.startTime;

    return {
      componentRenderTime: totalTime,
      confidenceCalculationTime: 0, // Would be measured during actual calculations
      apiRequestTime: 0, // Would be measured during API calls
      totalPopulationTime: totalTime,
      memoryUsage: (performance as any).memory?.usedJSHeapSize || 0,
      cacheHitRate: 0, // Would be calculated based on cache usage
    };
  }, [options.enablePerformanceTracking]);

  // Security helpers
  const isSensitiveField = useCallback((fieldType: FieldType): boolean => {
    const sensitiveFields: FieldType[] = [
      'ssn',
      'creditCard',
      'email',
      'phone',
      'address',
    ];
    return sensitiveFields.includes(fieldType);
  }, []);

  const requiresConsent = useCallback((): boolean => {
    return options.sensitiveField || options.requireExplicitConsent || false;
  }, [options.sensitiveField, options.requireExplicitConsent]);

  const getSecurityCompliance = useCallback(() => {
    const violations: string[] = [];
    let score = 100;

    if (!session?.hasUserConsent && requiresConsent()) {
      violations.push('Missing user consent for sensitive data');
      score -= 30;
    }

    if (!contextIsSessionValid()) {
      violations.push('Session is expired or invalid');
      score -= 40;
    }

    if (options.sensitiveField && !session?.ipHash) {
      violations.push('Missing IP tracking for sensitive field');
      score -= 20;
    }

    if (!session?.userAgent) {
      violations.push('Missing user agent tracking');
      score -= 10;
    }

    return { score: Math.max(0, score), violations };
  }, [session, requiresConsent, contextIsSessionValid, options.sensitiveField]);

  return {
    // Core state
    session,
    isLoading,
    error,
    isSessionValid: contextIsSessionValid(),

    // Field-specific data
    fieldData,
    isFieldPopulated,
    fieldConfidence,

    // Actions
    requestPopulation,
    acceptField,
    rejectField,
    clearField,

    // Batch operations
    acceptAllHighConfidence,
    rejectAllLowConfidence,

    // Session management
    refreshSession,
    grantConsent,
    revokeConsent,
    exportAuditLog,

    // Wedding industry utilities
    getWeddingFieldSuggestions,
    formatFieldForWedding,
    validateWeddingField,

    // Performance helpers
    getPerformanceMetrics,

    // Security helpers
    isSensitiveField,
    requiresConsent,
    getSecurityCompliance,
  };
}

/**
 * Simplified hook for basic field population
 * Use this for simple form fields that don't need advanced features
 */
export function useFieldPopulation(
  fieldId: string,
  fieldType: FieldType,
  fieldName: string,
) {
  return useAutoPopulation({
    fieldId,
    fieldType,
    fieldName,
    enablePerformanceTracking: false,
    sensitiveField: false,
  });
}

/**
 * Enhanced hook for sensitive wedding data
 * Includes all security features and wedding-specific validation
 */
export function useSensitiveWeddingField(
  fieldId: string,
  fieldType: FieldType,
  fieldName: string,
  weddingRole: 'bride' | 'groom' | 'couple' | 'vendor' = 'couple',
) {
  return useAutoPopulation({
    fieldId,
    fieldType,
    fieldName,
    enablePerformanceTracking: true,
    performanceThreshold: 200, // 200ms warning threshold
    sensitiveField: true,
    requireExplicitConsent: true,
    weddingRole,
    weddingPhase: 'planning',
  });
}

/**
 * Hook for wedding vendor-specific fields
 * Optimized for vendor form completion workflows
 */
export function useVendorAutoPopulation(organizationId: string) {
  return useAutoPopulation({
    enablePerformanceTracking: true,
    performanceThreshold: 100, // Vendors need fast responses
    weddingRole: 'vendor',
    weddingPhase: 'active',
  });
}
