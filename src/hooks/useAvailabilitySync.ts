/**
 * Availability Sync Hook for WedSync 2.0
 * React hook for managing helper availability synchronization
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import { Database } from '@/types/supabase';
import {
  AvailabilityWindow,
  SyncResult,
  AvailabilityConflict,
  CalendarProvider,
  AvailabilitySyncOptions,
  AvailabilitySyncStatus,
  SyncError,
  HelperWorkingHours,
  BulkSyncResult,
} from '@/types/availability';
import { availabilitySyncService } from '@/lib/availability/availability-sync-service';

interface UseAvailabilitySyncProps {
  helperId?: string;
  enabled?: boolean;
  autoSync?: boolean;
  syncInterval?: number; // minutes
}

interface UseAvailabilitySyncReturn {
  // State
  availability: AvailabilityWindow[];
  providers: CalendarProvider[];
  conflicts: AvailabilityConflict[];
  syncStatus: AvailabilitySyncStatus | null;
  workingHours: HelperWorkingHours | null;

  // Loading states
  isLoading: boolean;
  isSyncing: boolean;
  isLoadingProviders: boolean;
  isResolvingConflicts: boolean;

  // Sync operations
  syncAvailability: (
    options?: Partial<AvailabilitySyncOptions>,
  ) => Promise<SyncResult>;
  bulkSync: (
    helperIds: string[],
    options?: Partial<AvailabilitySyncOptions>,
  ) => Promise<BulkSyncResult>;
  forceSyncAll: () => Promise<void>;

  // Provider management
  addProvider: (provider: Omit<CalendarProvider, 'id'>) => Promise<string>;
  updateProvider: (
    providerId: string,
    updates: Partial<CalendarProvider>,
  ) => Promise<void>;
  removeProvider: (providerId: string) => Promise<void>;
  toggleProviderSync: (providerId: string, enabled: boolean) => Promise<void>;

  // Conflict resolution
  resolveConflict: (conflictId: string, resolution: any) => Promise<void>;
  resolveAllConflicts: (resolution: 'auto' | 'manual') => Promise<number>;
  dismissConflict: (conflictId: string) => Promise<void>;

  // Working hours management
  updateWorkingHours: (hours: Partial<HelperWorkingHours>) => Promise<void>;

  // Availability management
  createAvailability: (
    window: Omit<
      AvailabilityWindow,
      'id' | 'createdAt' | 'updatedAt' | 'version'
    >,
  ) => Promise<string>;
  updateAvailability: (
    windowId: string,
    updates: Partial<AvailabilityWindow>,
  ) => Promise<void>;
  deleteAvailability: (windowId: string) => Promise<void>;
  bulkUpdateAvailability: (
    windows: Array<{ id: string; updates: Partial<AvailabilityWindow> }>,
  ) => Promise<void>;

  // Webhook management
  setupWebhooks: () => Promise<void>;
  handleWebhookEvent: (provider: string, payload: any) => Promise<void>;

  // Analytics and monitoring
  getAvailabilityMetrics: (timeRange: {
    start: Date;
    end: Date;
  }) => Promise<any>;
  getSyncPerformance: () => Promise<any>;

  // Error handling
  errors: SyncError[];
  clearErrors: () => void;
  retryFailedSyncs: () => Promise<void>;

  // Real-time updates
  subscribeToUpdates: () => () => void;

  // Utilities
  refreshData: () => Promise<void>;
  exportAvailability: (format: 'json' | 'csv' | 'ical') => Promise<Blob>;
}

export function useAvailabilitySync({
  helperId,
  enabled = true,
  autoSync = true,
  syncInterval = 30, // 30 minutes default
}: UseAvailabilitySyncProps = {}): UseAvailabilitySyncReturn {
  const supabase = useSupabaseClient<Database>();
  const user = useUser();

  // State
  const [availability, setAvailability] = useState<AvailabilityWindow[]>([]);
  const [providers, setProviders] = useState<CalendarProvider[]>([]);
  const [conflicts, setConflicts] = useState<AvailabilityConflict[]>([]);
  const [syncStatus, setSyncStatus] = useState<AvailabilitySyncStatus | null>(
    null,
  );
  const [workingHours, setWorkingHours] = useState<HelperWorkingHours | null>(
    null,
  );

  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoadingProviders, setIsLoadingProviders] = useState(false);
  const [isResolvingConflicts, setIsResolvingConflicts] = useState(false);

  // Error state
  const [errors, setErrors] = useState<SyncError[]>([]);

  // Refs
  const syncIntervalRef = useRef<NodeJS.Timeout>();
  const realtimeSubscriptionRef = useRef<any>();
  const currentHelperId = helperId || user?.id;

  // Load initial data
  useEffect(() => {
    if (!enabled || !currentHelperId) return;

    loadInitialData();
  }, [enabled, currentHelperId]);

  // Setup auto-sync
  useEffect(() => {
    if (!autoSync || !currentHelperId || !enabled) return;

    syncIntervalRef.current = setInterval(
      () => {
        syncAvailability({ conflictResolution: 'auto' });
      },
      syncInterval * 60 * 1000,
    );

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [autoSync, syncInterval, currentHelperId, enabled]);

  // Load initial data
  const loadInitialData = useCallback(async () => {
    if (!currentHelperId) return;

    setIsLoading(true);
    try {
      await Promise.all([
        loadAvailability(),
        loadProviders(),
        loadConflicts(),
        loadSyncStatus(),
        loadWorkingHours(),
      ]);
    } catch (error) {
      console.error('Failed to load initial data:', error);
      addError({
        source: 'system' as any,
        error: error instanceof Error ? error.message : 'Failed to load data',
        retryable: true,
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentHelperId]);

  // Load availability windows
  const loadAvailability = useCallback(async () => {
    if (!currentHelperId) return;

    const { data, error } = await supabase
      .from('helper_availability')
      .select('*')
      .eq('helper_id', currentHelperId)
      .gte('end_time', new Date().toISOString())
      .order('start_time', { ascending: true });

    if (error) throw error;

    setAvailability(data?.map(mapDbToAvailabilityWindow) || []);
  }, [currentHelperId, supabase]);

  // Load providers
  const loadProviders = useCallback(async () => {
    if (!currentHelperId) return;

    setIsLoadingProviders(true);
    try {
      const { data, error } = await supabase
        .from('helper_calendar_providers')
        .select('*')
        .eq('helper_id', currentHelperId);

      if (error) throw error;

      setProviders(data?.map(mapDbToCalendarProvider) || []);
    } finally {
      setIsLoadingProviders(false);
    }
  }, [currentHelperId, supabase]);

  // Load conflicts
  const loadConflicts = useCallback(async () => {
    if (!currentHelperId) return;

    const { data, error } = await supabase
      .from('availability_conflicts')
      .select('*')
      .eq('helper_id', currentHelperId)
      .eq('status', 'pending')
      .order('priority', { ascending: false });

    if (error) throw error;

    setConflicts(data?.map(mapDbToConflict) || []);
  }, [currentHelperId, supabase]);

  // Load sync status
  const loadSyncStatus = useCallback(async () => {
    if (!currentHelperId) return;

    try {
      const status =
        await availabilitySyncService.getHelperSyncStatus(currentHelperId);
      setSyncStatus(status as AvailabilitySyncStatus);
    } catch (error) {
      console.error('Failed to load sync status:', error);
    }
  }, [currentHelperId]);

  // Load working hours
  const loadWorkingHours = useCallback(async () => {
    if (!currentHelperId) return;

    const { data, error } = await supabase
      .from('helper_working_hours')
      .select('*')
      .eq('helper_id', currentHelperId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    setWorkingHours(data ? mapDbToWorkingHours(data) : null);
  }, [currentHelperId, supabase]);

  // Sync availability
  const syncAvailability = useCallback(
    async (
      options: Partial<AvailabilitySyncOptions> = {},
    ): Promise<SyncResult> => {
      if (!currentHelperId) {
        throw new Error('No helper ID provided');
      }

      setIsSyncing(true);
      try {
        const result = await availabilitySyncService.syncHelperAvailability(
          currentHelperId,
          options,
        );

        // Update local state
        await Promise.all([
          loadAvailability(),
          loadConflicts(),
          loadSyncStatus(),
        ]);

        // Add any new errors
        if (result.errors.length > 0) {
          setErrors((prev) => [...prev, ...result.errors]);
        }

        return result;
      } finally {
        setIsSyncing(false);
      }
    },
    [currentHelperId, loadAvailability, loadConflicts, loadSyncStatus],
  );

  // Bulk sync multiple helpers
  const bulkSync = useCallback(
    async (
      helperIds: string[],
      options: Partial<AvailabilitySyncOptions> = {},
    ): Promise<BulkSyncResult> => {
      const startTime = new Date();
      const results = await availabilitySyncService.bulkSyncAvailability(
        helperIds,
        options,
      );
      const endTime = new Date();

      const successCount = Array.from(results.values()).filter(
        (r) => r.success,
      ).length;
      const failureCount = results.size - successCount;

      return {
        totalHelpers: helperIds.length,
        successCount,
        failureCount,
        results,
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
      };
    },
    [],
  );

  // Force sync all providers
  const forceSyncAll = useCallback(async () => {
    if (!currentHelperId) return;

    const enabledSources = providers
      .filter((p) => p.syncEnabled)
      .map((p) => p.type);

    await syncAvailability({
      sources: enabledSources,
      conflictResolution: 'auto',
    });
  }, [currentHelperId, providers, syncAvailability]);

  // Add provider
  const addProvider = useCallback(
    async (provider: Omit<CalendarProvider, 'id'>): Promise<string> => {
      if (!currentHelperId) {
        throw new Error('No helper ID provided');
      }

      const { data, error } = await supabase
        .from('helper_calendar_providers')
        .insert({
          helper_id: currentHelperId,
          name: provider.name,
          type: provider.type,
          credentials: provider.credentials,
          sync_enabled: provider.syncEnabled,
          sync_direction: provider.syncDirection,
          settings: provider.settings,
        })
        .select()
        .single();

      if (error) throw error;

      await loadProviders();
      return data.id;
    },
    [currentHelperId, supabase, loadProviders],
  );

  // Update provider
  const updateProvider = useCallback(
    async (
      providerId: string,
      updates: Partial<CalendarProvider>,
    ): Promise<void> => {
      const { error } = await supabase
        .from('helper_calendar_providers')
        .update({
          name: updates.name,
          credentials: updates.credentials,
          sync_enabled: updates.syncEnabled,
          sync_direction: updates.syncDirection,
          settings: updates.settings,
          updated_at: new Date().toISOString(),
        })
        .eq('id', providerId);

      if (error) throw error;

      await loadProviders();
    },
    [supabase, loadProviders],
  );

  // Remove provider
  const removeProvider = useCallback(
    async (providerId: string): Promise<void> => {
      const { error } = await supabase
        .from('helper_calendar_providers')
        .delete()
        .eq('id', providerId);

      if (error) throw error;

      await loadProviders();
    },
    [supabase, loadProviders],
  );

  // Toggle provider sync
  const toggleProviderSync = useCallback(
    async (providerId: string, enabled: boolean): Promise<void> => {
      const { error } = await supabase
        .from('helper_calendar_providers')
        .update({
          sync_enabled: enabled,
          updated_at: new Date().toISOString(),
        })
        .eq('id', providerId);

      if (error) throw error;

      await loadProviders();
    },
    [supabase, loadProviders],
  );

  // Resolve conflict
  const resolveConflict = useCallback(
    async (conflictId: string, resolution: any): Promise<void> => {
      setIsResolvingConflicts(true);
      try {
        const conflict = conflicts.find((c) => c.id === conflictId);
        if (!conflict) {
          throw new Error('Conflict not found');
        }

        // Use the conflict resolver from the sync service
        await availabilitySyncService['conflictResolver'].resolveConflict(
          conflict,
          resolution,
        );

        // Reload conflicts
        await loadConflicts();
      } finally {
        setIsResolvingConflicts(false);
      }
    },
    [conflicts, loadConflicts],
  );

  // Resolve all conflicts
  const resolveAllConflicts = useCallback(
    async (resolution: 'auto' | 'manual'): Promise<number> => {
      setIsResolvingConflicts(true);
      let resolvedCount = 0;

      try {
        for (const conflict of conflicts) {
          if (resolution === 'auto' && conflict.suggestedResolution) {
            try {
              await resolveConflict(conflict.id, conflict.suggestedResolution);
              resolvedCount++;
            } catch (error) {
              console.error(
                `Failed to resolve conflict ${conflict.id}:`,
                error,
              );
            }
          }
        }

        await loadConflicts();
        return resolvedCount;
      } finally {
        setIsResolvingConflicts(false);
      }
    },
    [conflicts, resolveConflict, loadConflicts],
  );

  // Dismiss conflict
  const dismissConflict = useCallback(
    async (conflictId: string): Promise<void> => {
      const { error } = await supabase
        .from('availability_conflicts')
        .update({
          status: 'dismissed',
          resolved_at: new Date().toISOString(),
        })
        .eq('id', conflictId);

      if (error) throw error;

      await loadConflicts();
    },
    [supabase, loadConflicts],
  );

  // Update working hours
  const updateWorkingHours = useCallback(
    async (hours: Partial<HelperWorkingHours>): Promise<void> => {
      if (!currentHelperId) return;

      const { error } = await supabase.from('helper_working_hours').upsert({
        helper_id: currentHelperId,
        ...hours,
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;

      await loadWorkingHours();
    },
    [currentHelperId, supabase, loadWorkingHours],
  );

  // Create availability window
  const createAvailability = useCallback(
    async (
      window: Omit<
        AvailabilityWindow,
        'id' | 'createdAt' | 'updatedAt' | 'version'
      >,
    ): Promise<string> => {
      const { data, error } = await supabase
        .from('helper_availability')
        .insert({
          helper_id: window.helperId,
          start_time: window.startTime.toISOString(),
          end_time: window.endTime.toISOString(),
          timezone: window.timezone,
          is_recurring: window.isRecurring,
          recurrence_pattern: window.recurrencePattern,
          status: window.status,
          source: window.source,
          external_id: window.externalId,
          metadata: window.metadata,
          version: 1,
        })
        .select()
        .single();

      if (error) throw error;

      await loadAvailability();
      return data.id;
    },
    [supabase, loadAvailability],
  );

  // Update availability window
  const updateAvailability = useCallback(
    async (
      windowId: string,
      updates: Partial<AvailabilityWindow>,
    ): Promise<void> => {
      const { error } = await supabase
        .from('helper_availability')
        .update({
          start_time: updates.startTime?.toISOString(),
          end_time: updates.endTime?.toISOString(),
          timezone: updates.timezone,
          is_recurring: updates.isRecurring,
          recurrence_pattern: updates.recurrencePattern,
          status: updates.status,
          source: updates.source,
          external_id: updates.externalId,
          metadata: updates.metadata,
          updated_at: new Date().toISOString(),
        })
        .eq('id', windowId);

      if (error) throw error;

      await loadAvailability();
    },
    [supabase, loadAvailability],
  );

  // Delete availability window
  const deleteAvailability = useCallback(
    async (windowId: string): Promise<void> => {
      const { error } = await supabase
        .from('helper_availability')
        .delete()
        .eq('id', windowId);

      if (error) throw error;

      await loadAvailability();
    },
    [supabase, loadAvailability],
  );

  // Bulk update availability
  const bulkUpdateAvailability = useCallback(
    async (
      windows: Array<{ id: string; updates: Partial<AvailabilityWindow> }>,
    ): Promise<void> => {
      for (const { id, updates } of windows) {
        await updateAvailability(id, updates);
      }
    },
    [updateAvailability],
  );

  // Setup webhooks
  const setupWebhooks = useCallback(async (): Promise<void> => {
    // Implementation would setup webhooks for each provider
    console.log('Setting up webhooks for all providers');
  }, []);

  // Handle webhook event
  const handleWebhookEvent = useCallback(
    async (provider: string, payload: any): Promise<void> => {
      // Trigger a sync for the affected helper
      await syncAvailability();
    },
    [syncAvailability],
  );

  // Get availability metrics
  const getAvailabilityMetrics = useCallback(
    async (timeRange: { start: Date; end: Date }): Promise<any> => {
      if (!currentHelperId) return null;

      // Implementation would calculate metrics
      return {
        totalHours: 0,
        bookedHours: 0,
        utilizationRate: 0,
      };
    },
    [currentHelperId],
  );

  // Get sync performance metrics
  const getSyncPerformance = useCallback(async (): Promise<any> => {
    // Implementation would return performance metrics
    return {
      avgSyncTime: 0,
      successRate: 0,
      errorRate: 0,
    };
  }, []);

  // Add error
  const addError = useCallback((error: SyncError) => {
    setErrors((prev) => [...prev, error]);

    // Auto-remove after 10 seconds
    setTimeout(() => {
      setErrors((prev) => prev.filter((e) => e !== error));
    }, 10000);
  }, []);

  // Clear errors
  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  // Retry failed syncs
  const retryFailedSyncs = useCallback(async (): Promise<void> => {
    const retryableErrors = errors.filter((e) => e.retryable);
    if (retryableErrors.length === 0) return;

    clearErrors();
    await syncAvailability();
  }, [errors, clearErrors, syncAvailability]);

  // Subscribe to real-time updates
  const subscribeToUpdates = useCallback(() => {
    if (!currentHelperId) return () => {};

    const channel = supabase
      .channel(`helper-availability:${currentHelperId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'helper_availability',
          filter: `helper_id=eq.${currentHelperId}`,
        },
        () => {
          loadAvailability();
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'availability_conflicts',
          filter: `helper_id=eq.${currentHelperId}`,
        },
        () => {
          loadConflicts();
        },
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [currentHelperId, supabase, loadAvailability, loadConflicts]);

  // Refresh all data
  const refreshData = useCallback(async (): Promise<void> => {
    await loadInitialData();
  }, [loadInitialData]);

  // Export availability
  const exportAvailability = useCallback(
    async (format: 'json' | 'csv' | 'ical'): Promise<Blob> => {
      let content = '';
      let mimeType = '';

      switch (format) {
        case 'json':
          content = JSON.stringify(availability, null, 2);
          mimeType = 'application/json';
          break;
        case 'csv':
          content = convertToCSV(availability);
          mimeType = 'text/csv';
          break;
        case 'ical':
          content = convertToICalendar(availability);
          mimeType = 'text/calendar';
          break;
      }

      return new Blob([content], { type: mimeType });
    },
    [availability],
  );

  // Utility functions
  const mapDbToAvailabilityWindow = (data: any): AvailabilityWindow => ({
    id: data.id,
    helperId: data.helper_id,
    startTime: new Date(data.start_time),
    endTime: new Date(data.end_time),
    timezone: data.timezone,
    isRecurring: data.is_recurring,
    recurrencePattern: data.recurrence_pattern,
    status: data.status,
    source: data.source,
    externalId: data.external_id,
    metadata: data.metadata,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
    version: data.version,
  });

  const mapDbToCalendarProvider = (data: any): CalendarProvider => ({
    id: data.id,
    name: data.name,
    type: data.type,
    credentials: data.credentials,
    syncEnabled: data.sync_enabled,
    lastSync: data.last_sync ? new Date(data.last_sync) : undefined,
    syncDirection: data.sync_direction,
    settings: data.settings,
  });

  const mapDbToConflict = (data: any): AvailabilityConflict => ({
    id: data.id,
    type: data.type,
    helperId: data.helper_id,
    conflictingWindows: data.conflicting_windows,
    suggestedResolution: data.suggested_resolution,
    priority: data.priority,
    createdAt: new Date(data.created_at),
  });

  const mapDbToWorkingHours = (data: any): HelperWorkingHours => ({
    helperId: data.helper_id,
    timezone: data.timezone,
    monday: data.monday,
    tuesday: data.tuesday,
    wednesday: data.wednesday,
    thursday: data.thursday,
    friday: data.friday,
    saturday: data.saturday,
    sunday: data.sunday,
    breaks: data.breaks || [],
    timeOff: data.time_off || [],
  });

  const convertToCSV = (data: AvailabilityWindow[]): string => {
    const headers = [
      'ID',
      'Start Time',
      'End Time',
      'Status',
      'Source',
      'Timezone',
    ];
    const rows = data.map((window) => [
      window.id,
      window.startTime.toISOString(),
      window.endTime.toISOString(),
      window.status,
      window.source,
      window.timezone,
    ]);

    return [headers, ...rows].map((row) => row.join(',')).join('\n');
  };

  const convertToICalendar = (data: AvailabilityWindow[]): string => {
    const events = data.map((window) => {
      return [
        'BEGIN:VEVENT',
        `UID:${window.id}@wedsync.com`,
        `DTSTART:${window.startTime
          .toISOString()
          .replace(/[-:]/g, '')
          .replace(/\.\d{3}/, '')}`,
        `DTEND:${window.endTime
          .toISOString()
          .replace(/[-:]/g, '')
          .replace(/\.\d{3}/, '')}`,
        `SUMMARY:${window.status === 'busy' ? 'Busy' : 'Available'}`,
        `DESCRIPTION:Source: ${window.source}`,
        'END:VEVENT',
      ].join('\r\n');
    });

    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//WedSync//Availability Export//EN',
      ...events,
      'END:VCALENDAR',
    ].join('\r\n');
  };

  return {
    // State
    availability,
    providers,
    conflicts,
    syncStatus,
    workingHours,

    // Loading states
    isLoading,
    isSyncing,
    isLoadingProviders,
    isResolvingConflicts,

    // Sync operations
    syncAvailability,
    bulkSync,
    forceSyncAll,

    // Provider management
    addProvider,
    updateProvider,
    removeProvider,
    toggleProviderSync,

    // Conflict resolution
    resolveConflict,
    resolveAllConflicts,
    dismissConflict,

    // Working hours management
    updateWorkingHours,

    // Availability management
    createAvailability,
    updateAvailability,
    deleteAvailability,
    bulkUpdateAvailability,

    // Webhook management
    setupWebhooks,
    handleWebhookEvent,

    // Analytics and monitoring
    getAvailabilityMetrics,
    getSyncPerformance,

    // Error handling
    errors,
    clearErrors,
    retryFailedSyncs,

    // Real-time updates
    subscribeToUpdates,

    // Utilities
    refreshData,
    exportAvailability,
  };
}
