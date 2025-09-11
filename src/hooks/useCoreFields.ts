import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { coreFieldsManager } from '@/lib/core-fields-manager';
import { detectCoreFieldFromLabel } from '@/types/core-fields';
import type { FormField } from '@/types/forms';

interface CoreFieldData {
  fieldKey: string;
  value: any;
  confidence: number;
  source: 'pdf' | 'manual' | 'previous_form' | 'api';
}

interface UseCoreFieldsOptions {
  formId: string;
  clientId: string;
  enabled?: boolean;
  onFieldsDetected?: (fields: CoreFieldData[]) => void;
  onAutoPopulate?: (populatedFields: Record<string, any>) => void;
}

export function useCoreFields({
  formId,
  clientId,
  enabled = true,
  onFieldsDetected,
  onAutoPopulate,
}: UseCoreFieldsOptions) {
  const queryClient = useQueryClient();
  const [detectedFields, setDetectedFields] = useState<
    Map<string, CoreFieldData>
  >(new Map());
  const [isProcessing, setIsProcessing] = useState(false);
  const detectionTimeoutRef = useRef<NodeJS.Timeout>();

  // Fetch existing core fields with caching
  const { data: existingCoreFields, isLoading: loadingCoreFields } = useQuery({
    queryKey: ['coreFields', formId, clientId],
    queryFn: async () => {
      if (!clientId) return null;

      const weddingData =
        await coreFieldsManager.getOrCreateWeddingData(clientId);
      if (!weddingData) return null;

      return coreFieldsManager.getCoreFieldsForForm(formId, weddingData.id);
    },
    enabled: enabled && !!clientId,
    staleTime: 60000, // Cache for 1 minute
    gcTime: 300000, // Keep in cache for 5 minutes
  });

  // Mutation for populating fields from PDF
  const populateFromPDF = useMutation({
    mutationFn: async (extractedData: {
      fields: Record<string, any>;
      confidence: Record<string, number>;
    }) => {
      const response = await fetch('/api/core-fields/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          extractedData: {
            fields: Object.entries(extractedData.fields).map(
              ([label, value]) => ({
                label,
                value,
                confidence: extractedData.confidence[label] || 0.7,
              }),
            ),
            pageCount: 1,
            extractionTime: Date.now(),
          },
        }),
      });

      if (!response.ok) throw new Error('Failed to extract core fields');
      return response.json();
    },
    onSuccess: (data) => {
      const fields: CoreFieldData[] = Object.entries(data.fields).map(
        ([key, value]) => ({
          fieldKey: key,
          value,
          confidence: data.confidence[key] || 0.7,
          source: 'pdf' as const,
        }),
      );

      fields.forEach((field) => {
        detectedFields.set(field.fieldKey, field);
      });
      setDetectedFields(new Map(detectedFields));

      if (onFieldsDetected) {
        onFieldsDetected(fields);
      }

      // Invalidate cache to refresh with new data
      queryClient.invalidateQueries({
        queryKey: ['coreFields', formId, clientId],
      });
    },
  });

  // Real-time field detection
  const detectFieldMapping = useCallback(
    (field: FormField): CoreFieldData | null => {
      const detection = detectCoreFieldFromLabel(field.label);

      if (detection.field_key && detection.confidence > 0.6) {
        // Check if we have a value for this core field
        const value = existingCoreFields?.[detection.field_key];

        if (value !== undefined && value !== null) {
          return {
            fieldKey: detection.field_key,
            value,
            confidence: detection.confidence,
            source: 'previous_form',
          };
        }
      }

      return null;
    },
    [existingCoreFields],
  );

  // Batch field detection with debouncing
  const detectFieldsBatch = useCallback(
    (fields: FormField[]) => {
      if (detectionTimeoutRef.current) {
        clearTimeout(detectionTimeoutRef.current);
      }

      detectionTimeoutRef.current = setTimeout(() => {
        setIsProcessing(true);
        const startTime = performance.now();

        const newDetectedFields = new Map<string, CoreFieldData>();
        const populatedData: Record<string, any> = {};

        fields.forEach((field) => {
          const detected = detectFieldMapping(field);
          if (detected) {
            newDetectedFields.set(field.id, detected);
            populatedData[field.id] = detected.value;
          }
        });

        const processingTime = performance.now() - startTime;

        // Log warning if detection took too long
        if (processingTime > 500) {
          console.warn(
            `Slow field detection: ${processingTime.toFixed(2)}ms for ${fields.length} fields`,
          );
        }

        setDetectedFields(newDetectedFields);

        if (Object.keys(populatedData).length > 0 && onAutoPopulate) {
          onAutoPopulate(populatedData);
        }

        setIsProcessing(false);
      }, 200); // Debounce for 200ms
    },
    [detectFieldMapping, onAutoPopulate],
  );

  // Auto-populate from existing data
  const autoPopulateFromHistory = useCallback(async () => {
    if (!clientId || !existingCoreFields) return;

    setIsProcessing(true);

    try {
      const response = await fetch('/api/core-fields/populate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formId,
          clientId,
          formFields: [],
        }),
      });

      if (!response.ok) throw new Error('Failed to populate fields');

      const data = await response.json();

      if (data.populatedFields && onAutoPopulate) {
        onAutoPopulate(data.populatedFields);
      }

      // Update detected fields
      Object.entries(data.populatedFields).forEach(
        ([fieldId, fieldData]: [string, any]) => {
          detectedFields.set(fieldId, {
            fieldKey: fieldData.coreFieldKey,
            value: fieldData.value,
            confidence: fieldData.confidence,
            source: fieldData.source,
          });
        },
      );
      setDetectedFields(new Map(detectedFields));
    } catch (error) {
      console.error('Auto-populate error:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [clientId, existingCoreFields, formId, onAutoPopulate, detectedFields]);

  // Save core fields back to database
  const saveCoreFields = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      const weddingData =
        await coreFieldsManager.getOrCreateWeddingData(clientId);
      if (!weddingData) throw new Error('No wedding data found');

      return coreFieldsManager.updateCoreFields(
        weddingData.id,
        updates,
        'form_submission',
      );
    },
    onSuccess: () => {
      // Invalidate cache to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['coreFields'] });
    },
  });

  // Subscribe to real-time updates
  useEffect(() => {
    if (!clientId || !enabled) return;

    let subscription: any;

    const setupSubscription = async () => {
      const weddingData =
        await coreFieldsManager.getOrCreateWeddingData(clientId);
      if (!weddingData) return;

      subscription = coreFieldsManager.subscribeToUpdates(
        weddingData.id,
        (payload) => {
          console.log('Core fields updated:', payload);
          queryClient.invalidateQueries({
            queryKey: ['coreFields', formId, clientId],
          });
        },
      );
    };

    setupSubscription();

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [clientId, formId, enabled, queryClient]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (detectionTimeoutRef.current) {
        clearTimeout(detectionTimeoutRef.current);
      }
    };
  }, []);

  return {
    // State
    detectedFields: (() => {
      const fields: any[] = [];
      detectedFields.forEach((field) => {
        fields.push(field);
      });
      return fields;
    })(),
    isProcessing,
    isLoading: loadingCoreFields,

    // Actions
    detectFieldsBatch,
    autoPopulateFromHistory,
    populateFromPDF: populateFromPDF.mutate,
    saveCoreFields: saveCoreFields.mutate,

    // Utilities
    detectFieldMapping,

    // Stats
    stats: {
      totalDetected: detectedFields.size,
      highConfidence: (() => {
        let count = 0;
        detectedFields.forEach((f) => {
          if (f.confidence >= 0.9) count++;
        });
        return count;
      })(),
      mediumConfidence: (() => {
        let count = 0;
        detectedFields.forEach((f) => {
          if (f.confidence >= 0.7 && f.confidence < 0.9) count++;
        });
        return count;
      })(),
      lowConfidence: (() => {
        let count = 0;
        detectedFields.forEach((f) => {
          if (f.confidence < 0.7) count++;
        });
        return count;
      })(),
    },
  };
}

// Performance monitoring hook
export function useCoreFieldsPerformance() {
  const [metrics, setMetrics] = useState({
    detectionTime: 0,
    populationTime: 0,
    cacheHitRate: 0,
    totalRequests: 0,
  });

  const startTimer = useCallback(() => {
    return performance.now();
  }, []);

  const endTimer = useCallback(
    (startTime: number, metricName: 'detectionTime' | 'populationTime') => {
      const elapsed = performance.now() - startTime;
      setMetrics((prev) => ({
        ...prev,
        [metricName]: elapsed,
        totalRequests: prev.totalRequests + 1,
      }));

      // Log if exceeds threshold
      if (elapsed > 500) {
        console.warn(
          `Performance warning: ${metricName} took ${elapsed.toFixed(2)}ms`,
        );
      }

      return elapsed;
    },
    [],
  );

  return {
    metrics,
    startTimer,
    endTimer,
  };
}
