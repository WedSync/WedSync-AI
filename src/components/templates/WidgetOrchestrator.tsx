'use client';

/**
 * Widget Orchestrator Component - WS-211 Team C
 * Manages widget interactions, state coordination, and lifecycle across templates
 * Provides centralized widget registry and communication hub
 */

import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
  useRef,
  useMemo,
  ReactElement,
  ComponentType,
} from 'react';
import { createClient } from '@/lib/supabase/client';
import { useSupabaseUser } from '@/hooks/useSupabaseUser';
import { toast } from 'sonner';
import { z } from 'zod';

// Widget Types and Interfaces
interface Widget {
  id: string;
  type: string;
  name: string;
  description: string;
  version: string;

  // Component and Configuration
  component: ComponentType<WidgetProps>;
  defaultProps: Record<string, any>;
  configSchema: z.ZodSchema<any>;

  // Metadata
  category:
    | 'data'
    | 'display'
    | 'input'
    | 'navigation'
    | 'media'
    | 'communication'
    | 'analytics';
  tags: string[];
  requirements: WidgetRequirements;

  // State and Behavior
  stateful: boolean;
  persistent: boolean;
  refreshable: boolean;
  resizable: boolean;

  // Wedding-specific
  weddingStages: ('planning' | 'day_of' | 'post_wedding')[];
  clientTypes: ('couple' | 'vendor' | 'guest' | 'admin')[];

  // Performance
  loadPriority: 'high' | 'normal' | 'low' | 'lazy';
  cacheStrategy: 'memory' | 'storage' | 'network' | 'hybrid';

  // Integration
  apiEndpoints?: string[];
  permissions: string[];
  dependencies: string[];

  created_at: string;
  updated_at: string;
}

interface WidgetInstance {
  id: string;
  widgetId: string;
  templateId: string;
  sectionId: string;

  // Position and Layout
  position: { x: number; y: number };
  size: { width: number; height: number };
  zIndex: number;

  // Configuration
  config: Record<string, any>;
  customProps: Record<string, any>;
  overrides: Record<string, any>;

  // State
  state: WidgetState;
  data: any;
  errors: WidgetError[];

  // Behavior
  isVisible: boolean;
  isInteractive: boolean;
  isLoading: boolean;

  // Lifecycle
  mountedAt?: Date;
  lastUpdated: Date;
  refreshCount: number;

  // Events
  eventHandlers: Record<string, Function>;
  eventHistory: WidgetEvent[];

  created_at: string;
  updated_at: string;
}

interface WidgetProps {
  instance: WidgetInstance;
  config: Record<string, any>;
  data: any;
  onUpdate: (updates: Partial<WidgetInstance>) => void;
  onEvent: (event: WidgetEvent) => void;
  onError: (error: WidgetError) => void;
  orchestrator: WidgetOrchestratorAPI;
}

interface WidgetRequirements {
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  aspectRatio?: number;
  dataSource?: string[];
  permissions?: string[];
  browsers?: string[];
  responsive?: boolean;
}

interface WidgetState {
  status: 'initializing' | 'loading' | 'ready' | 'error' | 'disabled';
  progress?: number;
  lastFetch?: Date;
  cacheExpiry?: Date;
  metadata: Record<string, any>;
}

interface WidgetEvent {
  id: string;
  instanceId: string;
  type:
    | 'mount'
    | 'unmount'
    | 'update'
    | 'refresh'
    | 'interact'
    | 'error'
    | 'custom';
  action: string;
  data?: any;
  timestamp: Date;
  source: 'user' | 'system' | 'api' | 'timer';
}

interface WidgetError {
  id: string;
  instanceId: string;
  type: 'config' | 'data' | 'render' | 'permission' | 'network' | 'validation';
  message: string;
  stack?: string;
  recoverable: boolean;
  timestamp: Date;
}

interface WidgetCommunication {
  type: 'broadcast' | 'direct' | 'request' | 'response';
  from: string;
  to?: string | string[];
  action: string;
  payload: any;
  timestamp: Date;
  id: string;
}

interface WidgetOrchestratorState {
  widgets: Record<string, Widget>;
  instances: Record<string, WidgetInstance>;
  communications: WidgetCommunication[];
  isLoading: boolean;
  errors: WidgetError[];
  performance: {
    loadTimes: Record<string, number>;
    renderTimes: Record<string, number>;
    errorRates: Record<string, number>;
  };
}

// Orchestrator API Interface
interface WidgetOrchestratorAPI {
  // Widget Management
  registerWidget: (widget: Omit<Widget, 'created_at' | 'updated_at'>) => void;
  unregisterWidget: (widgetId: string) => void;
  getWidget: (widgetId: string) => Widget | null;
  getWidgets: (filters?: WidgetFilters) => Widget[];

  // Instance Management
  createInstance: (
    widgetId: string,
    templateId: string,
    sectionId: string,
    config?: Record<string, any>,
  ) => Promise<string>;
  updateInstance: (
    instanceId: string,
    updates: Partial<WidgetInstance>,
  ) => Promise<void>;
  deleteInstance: (instanceId: string) => Promise<void>;
  getInstance: (instanceId: string) => WidgetInstance | null;
  getInstances: (templateId?: string, sectionId?: string) => WidgetInstance[];

  // State Management
  getInstanceState: (instanceId: string) => WidgetState | null;
  updateInstanceState: (
    instanceId: string,
    state: Partial<WidgetState>,
  ) => void;
  refreshInstance: (instanceId: string) => Promise<void>;
  refreshAllInstances: (templateId?: string) => Promise<void>;

  // Data Management
  getInstanceData: (instanceId: string) => any;
  updateInstanceData: (instanceId: string, data: any, merge?: boolean) => void;
  clearInstanceData: (instanceId: string) => void;
  syncInstanceData: (instanceId: string) => Promise<void>;

  // Communication
  sendMessage: (message: Omit<WidgetCommunication, 'id' | 'timestamp'>) => void;
  subscribeToMessages: (
    instanceId: string,
    handler: (message: WidgetCommunication) => void,
  ) => () => void;
  broadcastEvent: (event: Omit<WidgetEvent, 'id' | 'timestamp'>) => void;

  // Lifecycle
  mountInstance: (instanceId: string) => Promise<void>;
  unmountInstance: (instanceId: string) => Promise<void>;

  // Error Handling
  reportError: (error: Omit<WidgetError, 'id' | 'timestamp'>) => void;
  getErrors: (instanceId?: string) => WidgetError[];
  clearErrors: (instanceId?: string) => void;

  // Performance
  getPerformanceMetrics: (instanceId?: string) => any;
  trackPerformance: (instanceId: string, metric: string, value: number) => void;

  // Validation
  validateConfiguration: (
    widgetId: string,
    config: any,
  ) => { valid: boolean; errors: string[] };
  validateRequirements: (
    widgetId: string,
    context: any,
  ) => { valid: boolean; errors: string[] };
}

interface WidgetFilters {
  category?: string;
  weddingStage?: string;
  clientType?: string;
  tags?: string[];
  searchTerm?: string;
}

// Context Definition
const WidgetOrchestratorContext = createContext<WidgetOrchestratorAPI | null>(
  null,
);

export const useWidgetOrchestrator = () => {
  const context = useContext(WidgetOrchestratorContext);
  if (!context) {
    throw new Error(
      'useWidgetOrchestrator must be used within a WidgetOrchestratorProvider',
    );
  }
  return context;
};

// Provider Component
interface WidgetOrchestratorProviderProps {
  children: React.ReactNode;
  templateId: string;
  supplierId: string;
  enableCommunication?: boolean;
  enablePerformanceTracking?: boolean;
  errorBoundary?: boolean;
}

export function WidgetOrchestratorProvider({
  children,
  templateId,
  supplierId,
  enableCommunication = true,
  enablePerformanceTracking = true,
  errorBoundary = true,
}: WidgetOrchestratorProviderProps) {
  const { user } = useSupabaseUser();
  const supabase = createClient();

  // State Management
  const [state, setState] = useState<WidgetOrchestratorState>({
    widgets: {},
    instances: {},
    communications: [],
    isLoading: false,
    errors: [],
    performance: {
      loadTimes: {},
      renderTimes: {},
      errorRates: {},
    },
  });

  // Refs for optimization and cleanup
  const messageSubscribersRef = useRef<
    Map<string, Set<(message: WidgetCommunication) => void>>
  >(new Map());
  const performanceTimersRef = useRef<Map<string, number>>(new Map());
  const eventQueueRef = useRef<WidgetEvent[]>([]);
  const processingRef = useRef<boolean>(false);

  // Widget Registry Management
  const registerWidget = useCallback(
    (widget: Omit<Widget, 'created_at' | 'updated_at'>) => {
      const now = new Date().toISOString();
      const fullWidget: Widget = {
        ...widget,
        created_at: now,
        updated_at: now,
      };

      setState((prev) => ({
        ...prev,
        widgets: {
          ...prev.widgets,
          [widget.id]: fullWidget,
        },
      }));

      console.log(`Widget registered: ${widget.name} (${widget.id})`);
    },
    [],
  );

  const unregisterWidget = useCallback((widgetId: string) => {
    setState((prev) => {
      const newWidgets = { ...prev.widgets };
      delete newWidgets[widgetId];

      // Also remove any instances of this widget
      const newInstances = Object.fromEntries(
        Object.entries(prev.instances).filter(
          ([, instance]) => instance.widgetId !== widgetId,
        ),
      );

      return {
        ...prev,
        widgets: newWidgets,
        instances: newInstances,
      };
    });
  }, []);

  const getWidget = useCallback(
    (widgetId: string): Widget | null => {
      return state.widgets[widgetId] || null;
    },
    [state.widgets],
  );

  const getWidgets = useCallback(
    (filters?: WidgetFilters): Widget[] => {
      let widgets = Object.values(state.widgets);

      if (filters?.category) {
        widgets = widgets.filter((w) => w.category === filters.category);
      }

      if (filters?.weddingStage) {
        widgets = widgets.filter((w) =>
          w.weddingStages.includes(filters.weddingStage as any),
        );
      }

      if (filters?.clientType) {
        widgets = widgets.filter((w) =>
          w.clientTypes.includes(filters.clientType as any),
        );
      }

      if (filters?.tags && filters.tags.length > 0) {
        widgets = widgets.filter((w) =>
          filters.tags!.some((tag) => w.tags.includes(tag)),
        );
      }

      if (filters?.searchTerm) {
        const searchTerm = filters.searchTerm.toLowerCase();
        widgets = widgets.filter(
          (w) =>
            w.name.toLowerCase().includes(searchTerm) ||
            w.description.toLowerCase().includes(searchTerm) ||
            w.tags.some((tag) => tag.toLowerCase().includes(searchTerm)),
        );
      }

      return widgets;
    },
    [state.widgets],
  );

  // Instance Management
  const generateInstanceId = useCallback(() => {
    return `widget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const createInstance = useCallback(
    async (
      widgetId: string,
      templateId: string,
      sectionId: string,
      config: Record<string, any> = {},
    ): Promise<string> => {
      const widget = getWidget(widgetId);
      if (!widget) {
        throw new Error(`Widget not found: ${widgetId}`);
      }

      // Validate configuration
      const validation = validateConfiguration(widgetId, config);
      if (!validation.valid) {
        throw new Error(
          `Invalid configuration: ${validation.errors.join(', ')}`,
        );
      }

      const instanceId = generateInstanceId();
      const now = new Date();

      const instance: WidgetInstance = {
        id: instanceId,
        widgetId,
        templateId,
        sectionId,
        position: { x: 0, y: 0 },
        size: {
          width: widget.requirements.minWidth || 300,
          height: widget.requirements.minHeight || 200,
        },
        zIndex: 1,
        config: { ...widget.defaultProps, ...config },
        customProps: {},
        overrides: {},
        state: {
          status: 'initializing',
          metadata: {},
        },
        data: null,
        errors: [],
        isVisible: true,
        isInteractive: true,
        isLoading: false,
        lastUpdated: now,
        refreshCount: 0,
        eventHandlers: {},
        eventHistory: [],
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      };

      setState((prev) => ({
        ...prev,
        instances: {
          ...prev.instances,
          [instanceId]: instance,
        },
      }));

      // Fire creation event
      broadcastEvent({
        instanceId,
        type: 'mount',
        action: 'created',
        source: 'system',
      });

      return instanceId;
    },
    [getWidget, generateInstanceId],
  );

  const updateInstance = useCallback(
    async (
      instanceId: string,
      updates: Partial<WidgetInstance>,
    ): Promise<void> => {
      const instance = getInstance(instanceId);
      if (!instance) {
        throw new Error(`Instance not found: ${instanceId}`);
      }

      const updatedInstance: WidgetInstance = {
        ...instance,
        ...updates,
        lastUpdated: new Date(),
        updated_at: new Date().toISOString(),
      };

      setState((prev) => ({
        ...prev,
        instances: {
          ...prev.instances,
          [instanceId]: updatedInstance,
        },
      }));

      // Fire update event
      broadcastEvent({
        instanceId,
        type: 'update',
        action: 'instance_updated',
        data: updates,
        source: 'system',
      });
    },
    [],
  );

  const deleteInstance = useCallback(
    async (instanceId: string): Promise<void> => {
      const instance = getInstance(instanceId);
      if (!instance) {
        return;
      }

      // Fire unmount event first
      broadcastEvent({
        instanceId,
        type: 'unmount',
        action: 'deleted',
        source: 'system',
      });

      setState((prev) => {
        const newInstances = { ...prev.instances };
        delete newInstances[instanceId];

        return {
          ...prev,
          instances: newInstances,
        };
      });

      // Cleanup message subscriptions
      messageSubscribersRef.current.delete(instanceId);
    },
    [],
  );

  const getInstance = useCallback(
    (instanceId: string): WidgetInstance | null => {
      return state.instances[instanceId] || null;
    },
    [state.instances],
  );

  const getInstances = useCallback(
    (templateId?: string, sectionId?: string): WidgetInstance[] => {
      let instances = Object.values(state.instances);

      if (templateId) {
        instances = instances.filter((i) => i.templateId === templateId);
      }

      if (sectionId) {
        instances = instances.filter((i) => i.sectionId === sectionId);
      }

      return instances;
    },
    [state.instances],
  );

  // State Management
  const getInstanceState = useCallback(
    (instanceId: string): WidgetState | null => {
      const instance = getInstance(instanceId);
      return instance?.state || null;
    },
    [getInstance],
  );

  const updateInstanceState = useCallback(
    (instanceId: string, stateUpdates: Partial<WidgetState>) => {
      const instance = getInstance(instanceId);
      if (!instance) return;

      const newState: WidgetState = {
        ...instance.state,
        ...stateUpdates,
      };

      updateInstance(instanceId, { state: newState });
    },
    [getInstance, updateInstance],
  );

  const refreshInstance = useCallback(
    async (instanceId: string): Promise<void> => {
      const instance = getInstance(instanceId);
      if (!instance) return;

      const widget = getWidget(instance.widgetId);
      if (!widget || !widget.refreshable) return;

      updateInstanceState(instanceId, { status: 'loading' });

      try {
        // Simulate refresh - in real implementation, this would call widget-specific refresh logic
        await new Promise((resolve) => setTimeout(resolve, 1000));

        updateInstance(instanceId, {
          refreshCount: instance.refreshCount + 1,
        });

        updateInstanceState(instanceId, {
          status: 'ready',
          lastFetch: new Date(),
        });

        broadcastEvent({
          instanceId,
          type: 'refresh',
          action: 'refreshed',
          source: 'system',
        });
      } catch (error) {
        updateInstanceState(instanceId, { status: 'error' });
        reportError({
          instanceId,
          type: 'data',
          message: `Refresh failed: ${error}`,
          recoverable: true,
        });
      }
    },
    [getInstance, getWidget, updateInstanceState, updateInstance],
  );

  const refreshAllInstances = useCallback(
    async (templateId?: string): Promise<void> => {
      const instances = getInstances(templateId);
      const refreshPromises = instances
        .filter((instance) => {
          const widget = getWidget(instance.widgetId);
          return widget?.refreshable;
        })
        .map((instance) => refreshInstance(instance.id));

      await Promise.allSettled(refreshPromises);
    },
    [getInstances, getWidget, refreshInstance],
  );

  // Data Management
  const getInstanceData = useCallback(
    (instanceId: string): any => {
      const instance = getInstance(instanceId);
      return instance?.data || null;
    },
    [getInstance],
  );

  const updateInstanceData = useCallback(
    (instanceId: string, data: any, merge: boolean = false) => {
      const instance = getInstance(instanceId);
      if (!instance) return;

      const newData =
        merge && instance.data ? { ...instance.data, ...data } : data;

      updateInstance(instanceId, { data: newData });
    },
    [getInstance, updateInstance],
  );

  const clearInstanceData = useCallback(
    (instanceId: string) => {
      updateInstance(instanceId, { data: null });
    },
    [updateInstance],
  );

  const syncInstanceData = useCallback(
    async (instanceId: string): Promise<void> => {
      const instance = getInstance(instanceId);
      if (!instance) return;

      const widget = getWidget(instance.widgetId);
      if (!widget || !widget.apiEndpoints || widget.apiEndpoints.length === 0)
        return;

      updateInstanceState(instanceId, { status: 'loading' });

      try {
        // Simulate data sync - in real implementation, this would call actual APIs
        const response = await fetch(widget.apiEndpoints[0], {
          headers: {
            Authorization: `Bearer ${user?.access_token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`API request failed: ${response.statusText}`);
        }

        const data = await response.json();
        updateInstanceData(instanceId, data);

        updateInstanceState(instanceId, {
          status: 'ready',
          lastFetch: new Date(),
        });
      } catch (error) {
        updateInstanceState(instanceId, { status: 'error' });
        reportError({
          instanceId,
          type: 'network',
          message: `Data sync failed: ${error}`,
          recoverable: true,
        });
      }
    },
    [getInstance, getWidget, updateInstanceState, updateInstanceData, user],
  );

  // Communication System
  const sendMessage = useCallback(
    (message: Omit<WidgetCommunication, 'id' | 'timestamp'>) => {
      if (!enableCommunication) return;

      const fullMessage: WidgetCommunication = {
        ...message,
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
      };

      setState((prev) => ({
        ...prev,
        communications: [...prev.communications.slice(-99), fullMessage], // Keep last 100 messages
      }));

      // Deliver message to subscribers
      if (message.type === 'broadcast') {
        // Send to all subscribers
        messageSubscribersRef.current.forEach((subscribers) => {
          subscribers.forEach((handler) => {
            try {
              handler(fullMessage);
            } catch (error) {
              console.error('Error in message handler:', error);
            }
          });
        });
      } else if (message.type === 'direct' && message.to) {
        // Send to specific instance(s)
        const targets = Array.isArray(message.to) ? message.to : [message.to];
        targets.forEach((targetId) => {
          const subscribers = messageSubscribersRef.current.get(targetId);
          if (subscribers) {
            subscribers.forEach((handler) => {
              try {
                handler(fullMessage);
              } catch (error) {
                console.error('Error in message handler:', error);
              }
            });
          }
        });
      }
    },
    [enableCommunication],
  );

  const subscribeToMessages = useCallback(
    (instanceId: string, handler: (message: WidgetCommunication) => void) => {
      if (!messageSubscribersRef.current.has(instanceId)) {
        messageSubscribersRef.current.set(instanceId, new Set());
      }

      const subscribers = messageSubscribersRef.current.get(instanceId)!;
      subscribers.add(handler);

      // Return unsubscribe function
      return () => {
        subscribers.delete(handler);
        if (subscribers.size === 0) {
          messageSubscribersRef.current.delete(instanceId);
        }
      };
    },
    [],
  );

  const broadcastEvent = useCallback(
    (event: Omit<WidgetEvent, 'id' | 'timestamp'>) => {
      const fullEvent: WidgetEvent = {
        ...event,
        id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
      };

      // Add to event queue
      eventQueueRef.current.push(fullEvent);

      // Process events asynchronously
      if (!processingRef.current) {
        processingRef.current = true;
        setTimeout(() => {
          const events = [...eventQueueRef.current];
          eventQueueRef.current = [];
          processingRef.current = false;

          // Update instance event history
          events.forEach((evt) => {
            const instance = getInstance(evt.instanceId);
            if (instance) {
              updateInstance(evt.instanceId, {
                eventHistory: [...instance.eventHistory.slice(-19), evt], // Keep last 20 events
              });
            }
          });
        }, 0);
      }

      // Send as message for real-time communication
      sendMessage({
        type: 'broadcast',
        from: 'orchestrator',
        action: 'event',
        payload: fullEvent,
      });
    },
    [getInstance, updateInstance, sendMessage],
  );

  // Error Handling
  const reportError = useCallback(
    (error: Omit<WidgetError, 'id' | 'timestamp'>) => {
      const fullError: WidgetError = {
        ...error,
        id: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
      };

      setState((prev) => ({
        ...prev,
        errors: [...prev.errors.slice(-49), fullError], // Keep last 50 errors
      }));

      // Update instance errors
      const instance = getInstance(error.instanceId);
      if (instance) {
        updateInstance(error.instanceId, {
          errors: [...instance.errors.slice(-4), fullError], // Keep last 5 errors per instance
        });
      }

      // Log error
      console.error(
        `Widget Error [${fullError.type}]:`,
        fullError.message,
        fullError,
      );

      // Show toast for non-recoverable errors
      if (!fullError.recoverable) {
        toast.error(`Widget Error: ${fullError.message}`);
      }
    },
    [getInstance, updateInstance],
  );

  const getErrors = useCallback(
    (instanceId?: string): WidgetError[] => {
      if (instanceId) {
        return state.errors.filter((error) => error.instanceId === instanceId);
      }
      return state.errors;
    },
    [state.errors],
  );

  const clearErrors = useCallback(
    (instanceId?: string) => {
      if (instanceId) {
        setState((prev) => ({
          ...prev,
          errors: prev.errors.filter(
            (error) => error.instanceId !== instanceId,
          ),
        }));

        // Also clear from instance
        const instance = getInstance(instanceId);
        if (instance) {
          updateInstance(instanceId, { errors: [] });
        }
      } else {
        setState((prev) => ({ ...prev, errors: [] }));
      }
    },
    [getInstance, updateInstance],
  );

  // Performance Tracking
  const trackPerformance = useCallback(
    (instanceId: string, metric: string, value: number) => {
      if (!enablePerformanceTracking) return;

      setState((prev) => ({
        ...prev,
        performance: {
          ...prev.performance,
          [metric]: {
            ...prev.performance[metric as keyof typeof prev.performance],
            [instanceId]: value,
          },
        },
      }));
    },
    [enablePerformanceTracking],
  );

  const getPerformanceMetrics = useCallback(
    (instanceId?: string) => {
      if (instanceId) {
        return {
          loadTime: state.performance.loadTimes[instanceId],
          renderTime: state.performance.renderTimes[instanceId],
          errorRate: state.performance.errorRates[instanceId],
        };
      }
      return state.performance;
    },
    [state.performance],
  );

  // Validation
  const validateConfiguration = useCallback(
    (widgetId: string, config: any): { valid: boolean; errors: string[] } => {
      const widget = getWidget(widgetId);
      if (!widget) {
        return { valid: false, errors: ['Widget not found'] };
      }

      try {
        widget.configSchema.parse(config);
        return { valid: true, errors: [] };
      } catch (error) {
        if (error instanceof z.ZodError) {
          return {
            valid: false,
            errors: error.errors.map(
              (err) => `${err.path.join('.')}: ${err.message}`,
            ),
          };
        }
        return { valid: false, errors: ['Invalid configuration'] };
      }
    },
    [getWidget],
  );

  const validateRequirements = useCallback(
    (widgetId: string, context: any): { valid: boolean; errors: string[] } => {
      const widget = getWidget(widgetId);
      if (!widget) {
        return { valid: false, errors: ['Widget not found'] };
      }

      const errors: string[] = [];

      // Check permissions
      if (widget.permissions.length > 0) {
        const hasPermissions = widget.permissions.every((permission) =>
          context.userPermissions?.includes(permission),
        );
        if (!hasPermissions) {
          errors.push('Insufficient permissions');
        }
      }

      // Check dependencies
      if (widget.dependencies.length > 0) {
        const missingDeps = widget.dependencies.filter(
          (dep) => !state.widgets[dep],
        );
        if (missingDeps.length > 0) {
          errors.push(`Missing dependencies: ${missingDeps.join(', ')}`);
        }
      }

      return { valid: errors.length === 0, errors };
    },
    [getWidget, state.widgets],
  );

  // Lifecycle Management
  const mountInstance = useCallback(
    async (instanceId: string): Promise<void> => {
      const instance = getInstance(instanceId);
      if (!instance) return;

      const startTime = performance.now();

      try {
        updateInstanceState(instanceId, { status: 'loading' });

        // Simulate mount process
        await new Promise((resolve) => setTimeout(resolve, 100));

        updateInstance(instanceId, { mountedAt: new Date() });
        updateInstanceState(instanceId, { status: 'ready' });

        const loadTime = performance.now() - startTime;
        trackPerformance(instanceId, 'loadTimes', loadTime);

        broadcastEvent({
          instanceId,
          type: 'mount',
          action: 'mounted',
          source: 'system',
        });
      } catch (error) {
        updateInstanceState(instanceId, { status: 'error' });
        reportError({
          instanceId,
          type: 'render',
          message: `Mount failed: ${error}`,
          recoverable: true,
        });
      }
    },
    [
      getInstance,
      updateInstanceState,
      updateInstance,
      trackPerformance,
      broadcastEvent,
      reportError,
    ],
  );

  const unmountInstance = useCallback(
    async (instanceId: string): Promise<void> => {
      const instance = getInstance(instanceId);
      if (!instance) return;

      broadcastEvent({
        instanceId,
        type: 'unmount',
        action: 'unmounting',
        source: 'system',
      });

      // Cleanup
      clearErrors(instanceId);
      messageSubscribersRef.current.delete(instanceId);
    },
    [getInstance, broadcastEvent, clearErrors],
  );

  // Auto-cleanup on unmount
  useEffect(() => {
    return () => {
      // Clean up all subscriptions and timers
      messageSubscribersRef.current.clear();
      performanceTimersRef.current.clear();
    };
  }, []);

  // Context API
  const api: WidgetOrchestratorAPI = useMemo(
    () => ({
      registerWidget,
      unregisterWidget,
      getWidget,
      getWidgets,
      createInstance,
      updateInstance,
      deleteInstance,
      getInstance,
      getInstances,
      getInstanceState,
      updateInstanceState,
      refreshInstance,
      refreshAllInstances,
      getInstanceData,
      updateInstanceData,
      clearInstanceData,
      syncInstanceData,
      sendMessage,
      subscribeToMessages,
      broadcastEvent,
      mountInstance,
      unmountInstance,
      reportError,
      getErrors,
      clearErrors,
      getPerformanceMetrics,
      trackPerformance,
      validateConfiguration,
      validateRequirements,
    }),
    [
      registerWidget,
      unregisterWidget,
      getWidget,
      getWidgets,
      createInstance,
      updateInstance,
      deleteInstance,
      getInstance,
      getInstances,
      getInstanceState,
      updateInstanceState,
      refreshInstance,
      refreshAllInstances,
      getInstanceData,
      updateInstanceData,
      clearInstanceData,
      syncInstanceData,
      sendMessage,
      subscribeToMessages,
      broadcastEvent,
      mountInstance,
      unmountInstance,
      reportError,
      getErrors,
      clearErrors,
      getPerformanceMetrics,
      trackPerformance,
      validateConfiguration,
      validateRequirements,
    ],
  );

  return (
    <WidgetOrchestratorContext.Provider value={api}>
      {children}
    </WidgetOrchestratorContext.Provider>
  );
}

// Widget Status Component
export function WidgetOrchestratorStatus() {
  const orchestrator = useWidgetOrchestrator();
  const [stats, setStats] = useState({
    totalWidgets: 0,
    totalInstances: 0,
    activeInstances: 0,
    errorCount: 0,
  });

  useEffect(() => {
    const updateStats = () => {
      const widgets = orchestrator.getWidgets();
      const instances = orchestrator.getInstances();
      const activeInstances = instances.filter(
        (i) => i.state.status === 'ready',
      );
      const errors = orchestrator.getErrors();

      setStats({
        totalWidgets: widgets.length,
        totalInstances: instances.length,
        activeInstances: activeInstances.length,
        errorCount: errors.length,
      });
    };

    updateStats();
    const interval = setInterval(updateStats, 5000);

    return () => clearInterval(interval);
  }, [orchestrator]);

  return (
    <div className="flex items-center gap-4 text-sm text-gray-600">
      <div className="flex items-center gap-1">
        <div className="w-2 h-2 bg-blue-500 rounded-full" />
        <span>{stats.totalWidgets} Widgets</span>
      </div>

      <div className="flex items-center gap-1">
        <div
          className={`w-2 h-2 rounded-full ${stats.activeInstances > 0 ? 'bg-green-500' : 'bg-gray-400'}`}
        />
        <span>
          {stats.activeInstances}/{stats.totalInstances} Active
        </span>
      </div>

      {stats.errorCount > 0 && (
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-red-500 rounded-full" />
          <span>{stats.errorCount} Errors</span>
        </div>
      )}
    </div>
  );
}

// Widget Component Wrapper
interface WidgetWrapperProps {
  instanceId: string;
  children?: React.ReactNode;
}

export function WidgetWrapper({ instanceId, children }: WidgetWrapperProps) {
  const orchestrator = useWidgetOrchestrator();
  const [instance, setInstance] = useState<WidgetInstance | null>(null);
  const [widget, setWidget] = useState<Widget | null>(null);

  useEffect(() => {
    const inst = orchestrator.getInstance(instanceId);
    setInstance(inst);

    if (inst) {
      const wid = orchestrator.getWidget(inst.widgetId);
      setWidget(wid);
    }
  }, [orchestrator, instanceId]);

  useEffect(() => {
    if (instance) {
      orchestrator.mountInstance(instanceId);

      return () => {
        orchestrator.unmountInstance(instanceId);
      };
    }
  }, [orchestrator, instanceId, instance]);

  if (!instance || !widget) {
    return <div className="text-gray-500">Loading widget...</div>;
  }

  const WidgetComponent = widget.component;

  const handleUpdate = (updates: Partial<WidgetInstance>) => {
    orchestrator.updateInstance(instanceId, updates);
  };

  const handleEvent = (event: WidgetEvent) => {
    orchestrator.broadcastEvent(event);
  };

  const handleError = (error: WidgetError) => {
    orchestrator.reportError(error);
  };

  return (
    <div
      className="widget-wrapper relative"
      style={{
        width: `${instance.size.width}px`,
        height: `${instance.size.height}px`,
        zIndex: instance.zIndex,
      }}
    >
      {instance.state.status === 'loading' && (
        <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
          <div className="animate-spin w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full" />
        </div>
      )}

      {instance.state.status === 'error' && (
        <div className="absolute inset-0 bg-red-50 border-2 border-red-200 rounded-lg flex items-center justify-center p-4">
          <div className="text-center">
            <div className="text-red-600 font-medium">Widget Error</div>
            <div className="text-red-500 text-sm mt-1">
              {instance.errors[instance.errors.length - 1]?.message ||
                'Unknown error'}
            </div>
          </div>
        </div>
      )}

      {instance.state.status === 'ready' && (
        <WidgetComponent
          instance={instance}
          config={instance.config}
          data={instance.data}
          onUpdate={handleUpdate}
          onEvent={handleEvent}
          onError={handleError}
          orchestrator={orchestrator}
        />
      )}

      {children}
    </div>
  );
}

export default WidgetOrchestrator;
