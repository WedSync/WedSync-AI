'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { debounce } from '@/lib/utils';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface AutoSaveOptions {
  intervalMs?: number; // Auto-save interval (default: 30 seconds)
  debounceMs?: number; // Debounce for real-time saves (default: 1000ms)
  onSave?: (data: any) => Promise<void>;
  onError?: (error: Error) => void;
  enabled?: boolean;
}

export function useAutoSave<T>(data: T, options: AutoSaveOptions = {}) {
  const {
    intervalMs = 30000, // 30 seconds
    debounceMs = 1000, // 1 second
    onSave,
    onError,
    enabled = true,
  } = options;

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const supabase = createClientComponentClient();
  const dataRef = useRef(data);
  const saveTimerRef = useRef<NodeJS.Timeout>();
  const lastSavedDataRef = useRef<string>('');

  // Update data ref when data changes
  useEffect(() => {
    dataRef.current = data;

    // Check if data has changed
    const currentDataString = JSON.stringify(data);
    if (
      currentDataString !== lastSavedDataRef.current &&
      lastSavedDataRef.current !== ''
    ) {
      setHasUnsavedChanges(true);
    }
  }, [data]);

  // Save function
  const performSave = useCallback(async () => {
    if (!enabled) return;

    const currentData = dataRef.current;
    const currentDataString = JSON.stringify(currentData);

    // Skip if no changes
    if (currentDataString === lastSavedDataRef.current) {
      return;
    }

    setSaveStatus('saving');

    try {
      if (onSave) {
        await onSave(currentData);
      } else {
        // Default save to localStorage as fallback
        localStorage.setItem('form-draft', currentDataString);
      }

      lastSavedDataRef.current = currentDataString;
      setSaveStatus('saved');
      setLastSaved(new Date());
      setHasUnsavedChanges(false);

      // Reset status after 2 seconds
      setTimeout(() => {
        setSaveStatus('idle');
      }, 2000);
    } catch (error) {
      console.error('Auto-save error:', error);
      setSaveStatus('error');

      if (onError) {
        onError(error as Error);
      }

      // Try to save to localStorage as backup
      try {
        localStorage.setItem('form-draft-backup', currentDataString);
        localStorage.setItem(
          'form-draft-backup-time',
          new Date().toISOString(),
        );
      } catch (localError) {
        console.error('Local backup save failed:', localError);
      }
    }
  }, [enabled, onSave, onError]);

  // Debounced save for real-time changes
  const debouncedSave = useCallback(debounce(performSave, debounceMs), [
    performSave,
    debounceMs,
  ]);

  // Manual save trigger
  const saveNow = useCallback(async () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    await performSave();
  }, [performSave]);

  // Set up auto-save interval
  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      performSave();
    }, intervalMs);

    return () => {
      clearInterval(interval);
    };
  }, [enabled, intervalMs, performSave]);

  // Save on page unload
  useEffect(() => {
    if (!enabled) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        const message =
          'You have unsaved changes. Are you sure you want to leave?';
        e.preventDefault();
        e.returnValue = message;

        // Try to save before leaving
        performSave();

        return message;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden && hasUnsavedChanges) {
        performSave();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, hasUnsavedChanges, performSave]);

  // Restore from backup on mount
  useEffect(() => {
    try {
      const backup = localStorage.getItem('form-draft-backup');
      const backupTime = localStorage.getItem('form-draft-backup-time');

      if (backup && backupTime) {
        const backupDate = new Date(backupTime);
        const hoursSinceBackup =
          (Date.now() - backupDate.getTime()) / (1000 * 60 * 60);

        // Only restore if backup is less than 24 hours old
        if (hoursSinceBackup < 24) {
          console.log('Backup found from', backupDate.toLocaleString());
        }
      }
    } catch (error) {
      console.error('Error checking backup:', error);
    }
  }, []);

  return {
    saveStatus,
    lastSaved,
    hasUnsavedChanges,
    saveNow,
    debouncedSave,
  };
}

// Supabase-specific auto-save hook
export function useSupabaseAutoSave(
  formId: string | null,
  formData: any,
  options: Omit<AutoSaveOptions, 'onSave'> = {},
) {
  const supabase = createClientComponentClient();

  const saveToSupabase = useCallback(
    async (data: any) => {
      if (!formId) {
        // Create new form
        const { data: newForm, error } = await supabase
          .from('forms')
          .insert([
            {
              ...data,
              status: 'draft',
              updated_at: new Date().toISOString(),
            },
          ])
          .select()
          .single();

        if (error) throw error;
        return newForm.id;
      } else {
        // Update existing form
        const { error } = await supabase
          .from('forms')
          .update({
            ...data,
            updated_at: new Date().toISOString(),
          })
          .eq('id', formId);

        if (error) throw error;
        return formId;
      }
    },
    [formId, supabase],
  );

  return useAutoSave(formData, {
    ...options,
    onSave: saveToSupabase,
  });
}

// Save status indicator component
export function SaveStatusIndicator({
  status,
  lastSaved,
}: {
  status: SaveStatus;
  lastSaved: Date | null;
}) {
  const getStatusMessage = () => {
    switch (status) {
      case 'saving':
        return 'Saving...';
      case 'saved':
        return 'All changes saved';
      case 'error':
        return 'Failed to save';
      default:
        if (lastSaved) {
          const minutes = Math.floor(
            (Date.now() - lastSaved.getTime()) / 60000,
          );
          if (minutes === 0) return 'Saved just now';
          if (minutes === 1) return 'Saved 1 minute ago';
          if (minutes < 60) return `Saved ${minutes} minutes ago`;
          const hours = Math.floor(minutes / 60);
          if (hours === 1) return 'Saved 1 hour ago';
          return `Saved ${hours} hours ago`;
        }
        return '';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'saving':
        return 'text-blue-600';
      case 'saved':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-500';
    }
  };

  const message = getStatusMessage();
  if (!message) return null;

  return (
    <div className={`flex items-center gap-2 text-sm ${getStatusColor()}`}>
      {status === 'saving' && (
        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      {status === 'saved' && (
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      )}
      {status === 'error' && (
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      )}
      <span>{message}</span>
    </div>
  );
}
