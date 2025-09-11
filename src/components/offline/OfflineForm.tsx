'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { syncManager } from '@/lib/offline/sync-manager';
import { offlineDB } from '@/lib/offline/offline-database';
import { debounceAsync } from '@/lib/utils/debounce';
import {
  Save,
  Wifi,
  WifiOff,
  AlertCircle,
  CheckCircle,
  Clock,
  Upload,
  Loader2,
} from 'lucide-react';

interface OfflineFormProps {
  formId: string;
  clientId: string;
  initialData?: Record<string, any>;
  onSubmit?: (data: Record<string, any>) => void;
  weddingContext?: {
    weddingId: string;
    weddingDate: string;
    isWeddingDay: boolean;
  };
  priority?: 'low' | 'medium' | 'high' | 'emergency';
  validationRules?: Record<string, (value: any) => string | null>;
  onValidationChange?: (
    isValid: boolean,
    errors: Record<string, string>,
  ) => void;
  children: (props: {
    formData: Record<string, any>;
    updateField: (field: string, value: any) => void;
    isOnline: boolean;
    lastSaved: Date | null;
    isDirty: boolean;
    isSubmitting: boolean;
    validationErrors: Record<string, string>;
    syncStatus: string;
  }) => React.ReactNode;
}

export const OfflineForm: React.FC<OfflineFormProps> = ({
  formId,
  clientId,
  initialData = {},
  onSubmit,
  weddingContext,
  priority = 'medium',
  validationRules = {},
  onValidationChange,
  children,
}) => {
  const [formData, setFormData] = useState<Record<string, any>>(initialData);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const [syncStatus, setSyncStatus] = useState<string>('idle');
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Enhanced auto-save interval based on wedding context and priority
  const getAutoSaveInterval = () => {
    if (weddingContext?.isWeddingDay) return 15 * 1000; // 15 seconds on wedding day
    if (priority === 'high' || priority === 'emergency') return 20 * 1000; // 20 seconds for high priority
    return 30 * 1000; // 30 seconds default
  };

  // Load existing draft on mount
  useEffect(() => {
    const loadDraft = async () => {
      try {
        const existingDraft = await offlineDB.formDrafts
          .where('formId')
          .equals(formId)
          .and((draft) => draft.clientId === clientId)
          .first();

        if (existingDraft) {
          setFormData({ ...initialData, ...existingDraft.data });
          setLastSaved(new Date(existingDraft.autoSaveTime));
          console.log('Loaded existing form draft:', existingDraft);
        }
      } catch (error) {
        console.error('Error loading form draft:', error);
      }
    };

    loadDraft();
  }, [formId, clientId, initialData]);

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Enhanced validation with wedding-specific rules
  const validateField = useCallback(
    (field: string, value: any): string | null => {
      const rule = validationRules[field];
      if (rule) {
        return rule(value);
      }

      // Wedding-specific validation rules
      if (weddingContext) {
        if (field === 'weddingDate' && weddingContext.weddingDate) {
          const inputDate = new Date(value);
          const weddingDate = new Date(weddingContext.weddingDate);
          if (
            inputDate.toDateString() === weddingDate.toDateString() &&
            priority !== 'high'
          ) {
            return 'Wedding day updates should be marked as high priority';
          }
        }

        if (
          field === 'emergencyContact' &&
          !value &&
          priority === 'emergency'
        ) {
          return 'Emergency contact required for emergency priority forms';
        }
      }

      return null;
    },
    [validationRules, weddingContext, priority],
  );

  // Validate all fields
  const validateForm = useCallback(
    (data: Record<string, any>) => {
      const errors: Record<string, string> = {};

      Object.keys(data).forEach((field) => {
        const error = validateField(field, data[field]);
        if (error) {
          errors[field] = error;
        }
      });

      setValidationErrors(errors);
      const isValid = Object.keys(errors).length === 0;

      if (onValidationChange) {
        onValidationChange(isValid, errors);
      }

      return isValid;
    },
    [validateField, onValidationChange],
  );

  // Enhanced auto-save functionality with debouncing
  const saveFormDraft = useCallback(
    debounceAsync(async (data: Record<string, any>) => {
      try {
        setSyncStatus('saving');

        const draftId = `${formId}-${clientId}`;
        const validationResult = validateForm(data);

        const draft = {
          id: draftId,
          formId,
          clientId,
          data,
          autoSaveTime: new Date().toISOString(),
          syncStatus: 'pending' as const,
          priority: calculateFormPriority(),
          weddingContext,
          hasValidationErrors: !validationResult,
          validationErrors: validationResult ? {} : validationErrors,
        };

        await offlineDB.formDrafts.put(draft);
        setLastSaved(new Date());
        setIsDirty(false);
        setSyncStatus('saved');

        // Queue for sync if online with enhanced priority
        if (isOnline) {
          await syncManager.queueAction('form_draft', 'update', draft, {
            priority: draft.priority,
            weddingContext: weddingContext,
          });
          setSyncStatus('queued');
        }

        console.log('Enhanced form draft saved:', draft);
      } catch (error) {
        console.error('Error saving form draft:', error);
        setSyncStatus('error');
      }
    }, 1000),
    [
      formId,
      clientId,
      isOnline,
      priority,
      weddingContext,
      validateForm,
      validationErrors,
    ],
  );

  // Calculate form priority based on context
  const calculateFormPriority = useCallback(() => {
    let basePriority = {
      low: 4,
      medium: 6,
      high: 8,
      emergency: 10,
    }[priority];

    // Wedding day boost
    if (weddingContext?.isWeddingDay) {
      basePriority += 2;
    }

    // Wedding date proximity boost
    if (weddingContext?.weddingDate) {
      const weddingDate = new Date(weddingContext.weddingDate);
      const today = new Date();
      const daysUntilWedding = Math.ceil(
        (weddingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (daysUntilWedding <= 1)
        basePriority += 3; // Wedding day or day before
      else if (daysUntilWedding <= 7) basePriority += 1; // Wedding week
    }

    return Math.min(basePriority, 10); // Cap at 10
  }, [priority, weddingContext]);

  // Enhanced auto-save timer with priority-based intervals
  useEffect(() => {
    if (isDirty) {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }

      autoSaveTimeoutRef.current = setTimeout(() => {
        saveFormDraft(formData);
      }, getAutoSaveInterval());

      return () => {
        if (autoSaveTimeoutRef.current) {
          clearTimeout(autoSaveTimeoutRef.current);
        }
      };
    }
  }, [formData, isDirty, saveFormDraft]);

  // Enhanced update field handler with real-time validation
  const updateField = useCallback(
    (field: string, value: any) => {
      setFormData((prev) => {
        const newData = {
          ...prev,
          [field]: value,
        };

        // Validate the specific field
        const fieldError = validateField(field, value);
        setValidationErrors((prevErrors) => {
          const newErrors = { ...prevErrors };
          if (fieldError) {
            newErrors[field] = fieldError;
          } else {
            delete newErrors[field];
          }
          return newErrors;
        });

        return newData;
      });
      setIsDirty(true);
      setSyncStatus('editing');
    },
    [validateField],
  );

  // Manual save handler
  const handleManualSave = async () => {
    await saveFormDraft(formData);
  };

  // Enhanced form submission handler with validation and status tracking
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      setSyncStatus('validating');

      // Validate entire form before submission
      const isValid = validateForm(formData);

      if (!isValid) {
        setSyncStatus('validation_failed');
        setIsSubmitting(false);
        return;
      }

      setSyncStatus('submitting');

      // Save final version with submission metadata
      const submissionData = {
        ...formData,
        submittedAt: new Date().toISOString(),
        submissionId: `${formId}-${Date.now()}`,
        priority,
        weddingContext,
      };

      await saveFormDraft(submissionData);

      // Queue for sync as form submission with calculated priority
      await syncManager.queueAction(
        'form_submission',
        'create',
        submissionData,
        {
          priority: calculateFormPriority(),
          weddingContext: weddingContext,
          retryAttempts: priority === 'emergency' ? 10 : 5,
          retryDelay: priority === 'emergency' ? 30000 : 60000, // Faster retries for emergency forms
        },
      );

      setSyncStatus(isOnline ? 'queued' : 'offline_queued');
      setIsDirty(false);

      // Call external onSubmit handler
      if (onSubmit) {
        onSubmit(submissionData);
      }

      console.log(
        'Enhanced form submitted and queued for sync with priority:',
        calculateFormPriority(),
      );
    } catch (error) {
      console.error('Error submitting form:', error);
      setSyncStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Enhanced status indicators with wedding context
  const getAutoSaveStatus = () => {
    const interval = getAutoSaveInterval() / 1000;

    if (isSubmitting) {
      return 'Submitting form...';
    }

    if (syncStatus === 'saving') {
      return 'Saving draft...';
    }

    if (syncStatus === 'validating') {
      return 'Validating form...';
    }

    if (syncStatus === 'validation_failed') {
      return 'Validation errors found';
    }

    if (syncStatus === 'error') {
      return 'Save failed - retrying...';
    }

    if (isDirty) {
      const timeUntilSave = Math.ceil(
        (getAutoSaveInterval() - (Date.now() - (lastSaved?.getTime() || 0))) /
          1000,
      );
      const remainingTime = Math.max(timeUntilSave, 0);
      return `Auto-save in ${remainingTime}s ${weddingContext?.isWeddingDay ? '(fast mode)' : ''}`;
    }

    if (lastSaved) {
      const timeSinceSave = Math.floor(
        (Date.now() - lastSaved.getTime()) / 1000,
      );
      if (timeSinceSave < 60) {
        return `Saved ${timeSinceSave}s ago`;
      } else {
        return `Saved ${Math.floor(timeSinceSave / 60)}m ago`;
      }
    }

    return 'Not saved';
  };

  const getStatusIcon = () => {
    if (isSubmitting)
      return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
    if (syncStatus === 'error')
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    if (syncStatus === 'validation_failed')
      return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    if (syncStatus === 'saved' || syncStatus === 'queued')
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (syncStatus === 'saving' || syncStatus === 'submitting')
      return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
    if (isDirty) return <Clock className="w-4 h-4 text-orange-500" />;
    if (!isOnline) return <WifiOff className="w-4 h-4 text-red-500" />;
    return <CheckCircle className="w-4 h-4 text-green-500" />;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Enhanced Status bar */}
      <div
        className={`flex items-center justify-between p-3 rounded-lg border ${
          priority === 'emergency'
            ? 'bg-red-50 border-red-200'
            : weddingContext?.isWeddingDay
              ? 'bg-blue-50 border-blue-200'
              : 'bg-gray-50 border-gray-200'
        }`}
      >
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            {isOnline ? (
              <Wifi className="w-4 h-4 text-green-500" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-500" />
            )}
            <span className="text-sm text-gray-600">
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>

          {/* Priority indicator */}
          {(priority === 'high' || priority === 'emergency') && (
            <div
              className={`px-2 py-1 text-xs rounded-full font-medium ${
                priority === 'emergency'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-orange-100 text-orange-700'
              }`}
            >
              {priority === 'emergency' ? 'EMERGENCY' : 'HIGH PRIORITY'}
            </div>
          )}

          {/* Wedding day indicator */}
          {weddingContext?.isWeddingDay && (
            <div className="px-2 py-1 text-xs rounded-full font-medium bg-blue-100 text-blue-700">
              WEDDING DAY
            </div>
          )}
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            {getStatusIcon()}
            <span className="text-sm text-gray-600">{getAutoSaveStatus()}</span>
          </div>

          <button
            type="button"
            onClick={handleManualSave}
            disabled={!isDirty || isSubmitting}
            className="flex items-center space-x-1 px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="w-3 h-3" />
            <span>Save</span>
          </button>
        </div>
      </div>

      {/* Validation errors */}
      {Object.keys(validationErrors).length > 0 && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <AlertCircle className="w-4 h-4 text-yellow-600" />
            <span className="text-sm font-medium text-yellow-800">
              Validation Issues
            </span>
          </div>
          <ul className="space-y-1">
            {Object.entries(validationErrors).map(([field, error]) => (
              <li key={field} className="text-sm text-yellow-700">
                <strong>{field}:</strong> {error}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Form content */}
      {children({
        formData,
        updateField,
        isOnline,
        lastSaved,
        isDirty,
        isSubmitting,
        validationErrors,
        syncStatus,
      })}

      {/* Submit button */}
      <div className="flex items-center justify-between pt-4 border-t">
        <div className="text-sm text-gray-500">
          {!isOnline && (
            <div className="flex items-center space-x-2">
              <WifiOff className="w-4 h-4" />
              <span>
                {priority === 'emergency'
                  ? 'Emergency form will be prioritized when connection is restored'
                  : weddingContext?.isWeddingDay
                    ? 'Wedding day form will be synced immediately when online'
                    : 'Form will be submitted when connection is restored'}
              </span>
            </div>
          )}
          {isOnline && syncStatus === 'queued' && (
            <div className="flex items-center space-x-2 text-green-600">
              <Upload className="w-4 h-4" />
              <span>Queued for sync</span>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting || Object.keys(validationErrors).length > 0}
          className={`px-6 py-2 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            priority === 'emergency'
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : priority === 'high'
                ? 'bg-orange-600 hover:bg-orange-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {isSubmitting ? (
            <div className="flex items-center space-x-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Submitting...</span>
            </div>
          ) : (
            `Submit ${priority === 'emergency' ? 'Emergency ' : ''}Form`
          )}
        </button>
      </div>
    </form>
  );
};

export default OfflineForm;
