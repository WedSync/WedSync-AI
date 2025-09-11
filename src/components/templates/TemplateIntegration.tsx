'use client';

/**
 * Template Integration Component - WS-211 Team C
 * Bridges DashboardTemplateBuilder with backend services for seamless integration
 * Handles real-time sync, state management, and service coordination
 */

import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
  useRef,
} from 'react';
import { createClient } from '@/lib/supabase/client';
import { useSupabaseUser } from '@/hooks/useSupabaseUser';
import {
  DashboardTemplate,
  DashboardSection,
} from '@/lib/services/dashboardTemplateService';
import { toast } from 'sonner';

// Integration State Types
interface TemplateIntegrationState {
  isLoading: boolean;
  isOnline: boolean;
  lastSync: Date | null;
  syncStatus: 'idle' | 'syncing' | 'error' | 'success';
  pendingOperations: PendingOperation[];
  cache: TemplateCache;
  connectionHealth: 'healthy' | 'degraded' | 'failed';
}

interface PendingOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  templateId?: string;
  data: any;
  timestamp: Date;
  retryCount: number;
  maxRetries: number;
}

interface TemplateCache {
  templates: Record<string, DashboardTemplate>;
  sections: Record<string, DashboardSection[]>;
  metadata: Record<string, { lastFetched: Date; ttl: number }>;
}

// Integration Context
interface TemplateIntegrationContextValue {
  state: TemplateIntegrationState;

  // Template Operations
  createTemplate: (
    template: Omit<DashboardTemplate, 'id'>,
    sections: DashboardSection[],
  ) => Promise<string>;
  updateTemplate: (
    templateId: string,
    updates: Partial<DashboardTemplate>,
    sections?: DashboardSection[],
  ) => Promise<void>;
  deleteTemplate: (templateId: string) => Promise<void>;
  duplicateTemplate: (templateId: string, newName: string) => Promise<string>;

  // Data Fetching with Cache
  getTemplate: (templateId: string) => Promise<{
    template: DashboardTemplate;
    sections: DashboardSection[];
  } | null>;
  getTemplates: (filters?: TemplateFilters) => Promise<DashboardTemplate[]>;
  refreshCache: (templateId?: string) => Promise<void>;

  // Real-time Sync
  syncNow: () => Promise<void>;
  subscribeToChanges: (
    callback: (change: TemplateChange) => void,
  ) => () => void;

  // Offline/Online Management
  queueOperation: (
    operation: Omit<PendingOperation, 'id' | 'timestamp' | 'retryCount'>,
  ) => void;
  retryPendingOperations: () => Promise<void>;
  clearPendingOperations: () => void;
}

interface TemplateFilters {
  category?: string;
  isActive?: boolean;
  includeUsageStats?: boolean;
}

interface TemplateChange {
  type:
    | 'template_created'
    | 'template_updated'
    | 'template_deleted'
    | 'section_updated';
  templateId: string;
  data?: any;
  timestamp: Date;
}

const TemplateIntegrationContext =
  createContext<TemplateIntegrationContextValue | null>(null);

export const useTemplateIntegration = () => {
  const context = useContext(TemplateIntegrationContext);
  if (!context) {
    throw new Error(
      'useTemplateIntegration must be used within a TemplateIntegrationProvider',
    );
  }
  return context;
};

// Integration Provider Component
interface TemplateIntegrationProviderProps {
  children: React.ReactNode;
  supplierId: string;
  enableRealtime?: boolean;
  cacheConfig?: {
    defaultTtl: number; // minutes
    maxCacheSize: number; // number of templates
    enablePersistence?: boolean;
  };
}

export function TemplateIntegrationProvider({
  children,
  supplierId,
  enableRealtime = true,
  cacheConfig = {
    defaultTtl: 5,
    maxCacheSize: 50,
    enablePersistence: false,
  },
}: TemplateIntegrationProviderProps) {
  const { user } = useSupabaseUser();
  const supabase = createClient();

  // Integration State
  const [state, setState] = useState<TemplateIntegrationState>({
    isLoading: false,
    isOnline: navigator.onLine,
    lastSync: null,
    syncStatus: 'idle',
    pendingOperations: [],
    cache: {
      templates: {},
      sections: {},
      metadata: {},
    },
    connectionHealth: 'healthy',
  });

  // Refs for cleanup and persistence
  const realtimeChannelRef = useRef<any>(null);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const changeSubscribersRef = useRef<Set<(change: TemplateChange) => void>>(
    new Set(),
  );

  // Network Status Monitoring
  useEffect(() => {
    const handleOnline = () =>
      setState((prev) => ({ ...prev, isOnline: true }));
    const handleOffline = () =>
      setState((prev) => ({ ...prev, isOnline: false }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Connection Health Monitoring
  useEffect(() => {
    const checkConnectionHealth = async () => {
      try {
        const start = Date.now();
        const { data, error } = await supabase
          .from('dashboard_templates')
          .select('id')
          .eq('supplier_id', supplierId)
          .limit(1);

        const responseTime = Date.now() - start;

        if (error) {
          setState((prev) => ({ ...prev, connectionHealth: 'failed' }));
        } else if (responseTime > 3000) {
          setState((prev) => ({ ...prev, connectionHealth: 'degraded' }));
        } else {
          setState((prev) => ({ ...prev, connectionHealth: 'healthy' }));
        }
      } catch (error) {
        setState((prev) => ({ ...prev, connectionHealth: 'failed' }));
      }
    };

    const healthInterval = setInterval(checkConnectionHealth, 30000); // Check every 30 seconds
    checkConnectionHealth(); // Initial check

    return () => clearInterval(healthInterval);
  }, [supabase, supplierId]);

  // Cache Management Utilities
  const isCacheValid = useCallback(
    (templateId: string): boolean => {
      const metadata = state.cache.metadata[templateId];
      if (!metadata) return false;

      const now = new Date();
      const age =
        (now.getTime() - metadata.lastFetched.getTime()) / (1000 * 60); // minutes
      return age < metadata.ttl;
    },
    [state.cache.metadata],
  );

  const addToCache = useCallback(
    (template: DashboardTemplate, sections: DashboardSection[]) => {
      setState((prev) => ({
        ...prev,
        cache: {
          ...prev.cache,
          templates: { ...prev.cache.templates, [template.id]: template },
          sections: { ...prev.cache.sections, [template.id]: sections },
          metadata: {
            ...prev.cache.metadata,
            [template.id]: {
              lastFetched: new Date(),
              ttl: cacheConfig.defaultTtl,
            },
          },
        },
      }));
    },
    [cacheConfig.defaultTtl],
  );

  const removeFromCache = useCallback((templateId: string) => {
    setState((prev) => {
      const newTemplates = { ...prev.cache.templates };
      const newSections = { ...prev.cache.sections };
      const newMetadata = { ...prev.cache.metadata };

      delete newTemplates[templateId];
      delete newSections[templateId];
      delete newMetadata[templateId];

      return {
        ...prev,
        cache: {
          templates: newTemplates,
          sections: newSections,
          metadata: newMetadata,
        },
      };
    });
  }, []);

  // Pending Operations Management
  const queueOperation = useCallback(
    (operation: Omit<PendingOperation, 'id' | 'timestamp' | 'retryCount'>) => {
      const newOperation: PendingOperation = {
        ...operation,
        id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        retryCount: 0,
      };

      setState((prev) => ({
        ...prev,
        pendingOperations: [...prev.pendingOperations, newOperation],
      }));

      // Auto-retry when back online
      if (state.isOnline) {
        setTimeout(() => retryPendingOperations(), 1000);
      }
    },
    [state.isOnline],
  );

  const removeOperation = useCallback((operationId: string) => {
    setState((prev) => ({
      ...prev,
      pendingOperations: prev.pendingOperations.filter(
        (op) => op.id !== operationId,
      ),
    }));
  }, []);

  // Real-time Subscription Management
  useEffect(() => {
    if (!enableRealtime || !user) return;

    const channel = supabase
      .channel(`template_changes_${supplierId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dashboard_templates',
          filter: `supplier_id=eq.${supplierId}`,
        },
        (payload) => {
          const change: TemplateChange = {
            type:
              payload.eventType === 'INSERT'
                ? 'template_created'
                : payload.eventType === 'UPDATE'
                  ? 'template_updated'
                  : 'template_deleted',
            templateId: payload.new?.id || payload.old?.id,
            data: payload.new || payload.old,
            timestamp: new Date(),
          };

          // Update cache based on change
          if (change.type === 'template_deleted') {
            removeFromCache(change.templateId);
          } else if (
            change.type === 'template_created' ||
            change.type === 'template_updated'
          ) {
            // Invalidate cache to force refetch with latest data
            setState((prev) => {
              const newMetadata = { ...prev.cache.metadata };
              if (newMetadata[change.templateId]) {
                newMetadata[change.templateId].ttl = 0; // Force refresh
              }
              return {
                ...prev,
                cache: { ...prev.cache, metadata: newMetadata },
              };
            });
          }

          // Notify subscribers
          changeSubscribersRef.current.forEach((callback) => {
            try {
              callback(change);
            } catch (error) {
              console.error('Error in template change subscriber:', error);
            }
          });
        },
      )
      .subscribe();

    realtimeChannelRef.current = channel;

    return () => {
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
      }
    };
  }, [enableRealtime, user, supabase, supplierId, removeFromCache]);

  // Template Operations
  const createTemplate = useCallback(
    async (
      templateData: Omit<DashboardTemplate, 'id'>,
      sections: DashboardSection[],
    ): Promise<string> => {
      if (!state.isOnline) {
        queueOperation({
          type: 'create',
          data: { templateData, sections },
          maxRetries: 3,
        });
        throw new Error('Operation queued for when connection is restored');
      }

      setState((prev) => ({ ...prev, isLoading: true, syncStatus: 'syncing' }));

      try {
        const response = await fetch('/api/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            supplierId,
            template: templateData,
            sections,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to create template: ${response.statusText}`);
        }

        const { template, sections: createdSections } = await response.json();

        // Update cache
        addToCache(template, createdSections);

        setState((prev) => ({
          ...prev,
          isLoading: false,
          syncStatus: 'success',
          lastSync: new Date(),
        }));

        toast.success('Template created successfully');
        return template.id;
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          syncStatus: 'error',
        }));
        toast.error('Failed to create template');
        throw error;
      }
    },
    [state.isOnline, supplierId, addToCache, queueOperation],
  );

  const updateTemplate = useCallback(
    async (
      templateId: string,
      updates: Partial<DashboardTemplate>,
      sections?: DashboardSection[],
    ): Promise<void> => {
      if (!state.isOnline) {
        queueOperation({
          type: 'update',
          templateId,
          data: { updates, sections },
          maxRetries: 3,
        });
        throw new Error('Operation queued for when connection is restored');
      }

      setState((prev) => ({ ...prev, isLoading: true, syncStatus: 'syncing' }));

      try {
        const response = await fetch(`/api/templates/${templateId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            supplierId,
            updates,
            sections,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to update template: ${response.statusText}`);
        }

        const { template, sections: updatedSections } = await response.json();

        // Update cache
        addToCache(template, updatedSections);

        setState((prev) => ({
          ...prev,
          isLoading: false,
          syncStatus: 'success',
          lastSync: new Date(),
        }));

        toast.success('Template updated successfully');
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          syncStatus: 'error',
        }));
        toast.error('Failed to update template');
        throw error;
      }
    },
    [state.isOnline, supplierId, addToCache, queueOperation],
  );

  const deleteTemplate = useCallback(
    async (templateId: string): Promise<void> => {
      if (!state.isOnline) {
        queueOperation({
          type: 'delete',
          templateId,
          data: {},
          maxRetries: 3,
        });
        throw new Error('Operation queued for when connection is restored');
      }

      setState((prev) => ({ ...prev, isLoading: true, syncStatus: 'syncing' }));

      try {
        const response = await fetch(`/api/templates/${templateId}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ supplierId }),
        });

        if (!response.ok) {
          throw new Error(`Failed to delete template: ${response.statusText}`);
        }

        // Remove from cache
        removeFromCache(templateId);

        setState((prev) => ({
          ...prev,
          isLoading: false,
          syncStatus: 'success',
          lastSync: new Date(),
        }));

        toast.success('Template deleted successfully');
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          syncStatus: 'error',
        }));
        toast.error('Failed to delete template');
        throw error;
      }
    },
    [state.isOnline, supplierId, removeFromCache, queueOperation],
  );

  const duplicateTemplate = useCallback(
    async (templateId: string, newName: string): Promise<string> => {
      const existingTemplate = await getTemplate(templateId);
      if (!existingTemplate) {
        throw new Error('Template not found');
      }

      const { template, sections } = existingTemplate;
      const duplicateData = {
        ...template,
        name: newName,
        is_default: false,
        sort_order: 999,
      };

      delete (duplicateData as any).id;
      delete (duplicateData as any).created_at;
      delete (duplicateData as any).updated_at;
      delete (duplicateData as any).usage_count;
      delete (duplicateData as any).last_used_at;

      return await createTemplate(
        duplicateData,
        sections.map((section) => {
          const sectionCopy = { ...section };
          delete (sectionCopy as any).id;
          delete (sectionCopy as any).template_id;
          delete (sectionCopy as any).created_at;
          delete (sectionCopy as any).updated_at;
          return sectionCopy;
        }),
      );
    },
    [createTemplate],
  );

  // Data Fetching with Cache
  const getTemplate = useCallback(
    async (
      templateId: string,
    ): Promise<{
      template: DashboardTemplate;
      sections: DashboardSection[];
    } | null> => {
      // Check cache first
      if (isCacheValid(templateId)) {
        const template = state.cache.templates[templateId];
        const sections = state.cache.sections[templateId];
        if (template && sections) {
          return { template, sections };
        }
      }

      // Fetch from API
      try {
        const response = await fetch('/api/placeholder');
        if (!response.ok) {
          if (response.status === 404) {
            return null;
          }
          throw new Error(`Failed to fetch template: ${response.statusText}`);
        }

        const data = await response.json();

        // Update cache
        addToCache(data.template, data.sections);

        return data;
      } catch (error) {
        console.error('Error fetching template:', error);
        return null;
      }
    },
    [isCacheValid, state.cache, supplierId, addToCache],
  );

  const getTemplates = useCallback(
    async (filters?: TemplateFilters): Promise<DashboardTemplate[]> => {
      try {
        const queryParams = new URLSearchParams({ supplierId });
        if (filters?.category) queryParams.append('category', filters.category);
        if (filters?.isActive !== undefined)
          queryParams.append('isActive', filters.isActive.toString());
        if (filters?.includeUsageStats)
          queryParams.append('includeUsageStats', 'true');

        const response = await fetch('/api/placeholder');
        if (!response.ok) {
          throw new Error(`Failed to fetch templates: ${response.statusText}`);
        }

        const templates = await response.json();

        // Update cache for all templates
        templates.forEach((template: DashboardTemplate) => {
          setState((prev) => ({
            ...prev,
            cache: {
              ...prev.cache,
              templates: { ...prev.cache.templates, [template.id]: template },
              metadata: {
                ...prev.cache.metadata,
                [template.id]: {
                  lastFetched: new Date(),
                  ttl: cacheConfig.defaultTtl,
                },
              },
            },
          }));
        });

        return templates;
      } catch (error) {
        console.error('Error fetching templates:', error);
        return [];
      }
    },
    [supplierId, cacheConfig.defaultTtl],
  );

  const refreshCache = useCallback(
    async (templateId?: string): Promise<void> => {
      if (templateId) {
        // Refresh specific template
        removeFromCache(templateId);
        await getTemplate(templateId);
      } else {
        // Refresh all cached templates
        setState((prev) => ({
          ...prev,
          cache: { templates: {}, sections: {}, metadata: {} },
        }));
        await getTemplates();
      }
    },
    [removeFromCache, getTemplate, getTemplates],
  );

  // Sync Operations
  const syncNow = useCallback(async (): Promise<void> => {
    setState((prev) => ({ ...prev, syncStatus: 'syncing' }));

    try {
      await refreshCache();
      await retryPendingOperations();

      setState((prev) => ({
        ...prev,
        syncStatus: 'success',
        lastSync: new Date(),
      }));
    } catch (error) {
      setState((prev) => ({ ...prev, syncStatus: 'error' }));
      throw error;
    }
  }, [refreshCache]);

  const retryPendingOperations = useCallback(async (): Promise<void> => {
    if (!state.isOnline || state.pendingOperations.length === 0) return;

    const operations = [...state.pendingOperations];

    for (const operation of operations) {
      try {
        switch (operation.type) {
          case 'create':
            await createTemplate(
              operation.data.templateData,
              operation.data.sections,
            );
            break;
          case 'update':
            await updateTemplate(
              operation.templateId!,
              operation.data.updates,
              operation.data.sections,
            );
            break;
          case 'delete':
            await deleteTemplate(operation.templateId!);
            break;
        }

        removeOperation(operation.id);
      } catch (error) {
        // Increment retry count
        setState((prev) => ({
          ...prev,
          pendingOperations: prev.pendingOperations.map((op) =>
            op.id === operation.id
              ? { ...op, retryCount: op.retryCount + 1 }
              : op,
          ),
        }));

        // Remove operation if max retries exceeded
        if (operation.retryCount >= operation.maxRetries) {
          removeOperation(operation.id);
          console.error(
            `Operation ${operation.id} failed after ${operation.maxRetries} retries:`,
            error,
          );
        }
      }
    }
  }, [
    state.isOnline,
    state.pendingOperations,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    removeOperation,
  ]);

  const clearPendingOperations = useCallback(() => {
    setState((prev) => ({ ...prev, pendingOperations: [] }));
  }, []);

  // Change Subscription
  const subscribeToChanges = useCallback(
    (callback: (change: TemplateChange) => void) => {
      changeSubscribersRef.current.add(callback);

      return () => {
        changeSubscribersRef.current.delete(callback);
      };
    },
    [],
  );

  // Auto-retry pending operations when coming back online
  useEffect(() => {
    if (state.isOnline && state.pendingOperations.length > 0) {
      retryPendingOperations();
    }
  }, [state.isOnline, retryPendingOperations]);

  // Context Value
  const contextValue: TemplateIntegrationContextValue = {
    state,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
    getTemplate,
    getTemplates,
    refreshCache,
    syncNow,
    subscribeToChanges,
    queueOperation,
    retryPendingOperations,
    clearPendingOperations,
  };

  return (
    <TemplateIntegrationContext.Provider value={contextValue}>
      {children}
    </TemplateIntegrationContext.Provider>
  );
}

// Status Indicator Component
export function TemplateIntegrationStatus() {
  const { state } = useTemplateIntegration();

  const getStatusColor = () => {
    if (!state.isOnline) return 'bg-red-500';
    if (state.connectionHealth === 'failed') return 'bg-red-500';
    if (state.connectionHealth === 'degraded') return 'bg-yellow-500';
    if (state.pendingOperations.length > 0) return 'bg-orange-500';
    return 'bg-green-500';
  };

  const getStatusText = () => {
    if (!state.isOnline) return 'Offline';
    if (state.connectionHealth === 'failed') return 'Connection Failed';
    if (state.connectionHealth === 'degraded') return 'Slow Connection';
    if (state.pendingOperations.length > 0)
      return `${state.pendingOperations.length} Pending`;
    return 'Connected';
  };

  return (
    <div className="flex items-center gap-2 text-sm text-gray-600">
      <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
      <span>{getStatusText()}</span>
      {state.syncStatus === 'syncing' && (
        <div className="animate-spin w-3 h-3 border border-gray-300 border-t-primary-600 rounded-full" />
      )}
    </div>
  );
}

export default TemplateIntegration;
