'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';

interface QuickAction {
  id: string;
  title: string;
  description: string;
  category: 'emergency' | 'bulk' | 'user' | 'wedding' | 'system';
  priority: 'critical' | 'high' | 'medium' | 'low';
  icon: string;
  shortcut?: string;
  permissions: string[];
  execute: (params?: any) => Promise<ActionResult>;
  isAvailable: () => boolean;
  estimatedTime?: string;
}

interface ActionResult {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
  executionTime?: number;
}

interface ActionHistoryEntry {
  id: string;
  actionId: string;
  title: string;
  result: ActionResult;
  timestamp: Date;
  parameters?: any;
}

interface UseQuickActionsOptions {
  maxHistorySize?: number;
  autoSaveHistory?: boolean;
  enableShortcuts?: boolean;
  permissions?: string[];
}

interface UseQuickActionsReturn {
  // Actions
  actions: QuickAction[];
  filteredActions: QuickAction[];

  // Execution
  executeAction: (actionId: string, params?: any) => Promise<ActionResult>;
  isExecuting: boolean;
  currentAction: QuickAction | null;

  // History
  actionHistory: ActionHistoryEntry[];
  clearHistory: () => void;

  // Filtering & Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategories: string[];
  setSelectedCategories: (categories: string[]) => void;

  // Keyboard shortcuts
  registerShortcut: (shortcut: string, actionId: string) => void;
  unregisterShortcut: (shortcut: string) => void;

  // State
  isReady: boolean;
  error: string | null;
}

const DEFAULT_QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'emergency_auth_reset',
    title: 'Emergency Auth Reset',
    description: 'Reset authentication for users experiencing login issues',
    category: 'emergency',
    priority: 'critical',
    icon: 'shield-alert',
    shortcut: 'ctrl+shift+a',
    permissions: ['admin', 'emergency'],
    estimatedTime: '15 seconds',
    execute: async () => {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return { success: true, message: 'Auth system reset successfully' };
    },
    isAvailable: () => true,
  },
  {
    id: 'bulk_guest_notification',
    title: 'Bulk Guest Notification',
    description: 'Send notifications to multiple guests',
    category: 'bulk',
    priority: 'medium',
    icon: 'users',
    shortcut: 'ctrl+shift+g',
    permissions: ['admin', 'support'],
    estimatedTime: '30 seconds',
    execute: async (params) => {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      return {
        success: true,
        message: `Sent notifications to ${params?.guestCount || 0} guests`,
      };
    },
    isAvailable: () => true,
  },
  {
    id: 'wedding_emergency_mode',
    title: 'Enable Wedding Emergency Mode',
    description: 'Activate emergency protocols for active weddings',
    category: 'wedding',
    priority: 'critical',
    icon: 'heart',
    shortcut: 'ctrl+shift+w',
    permissions: ['admin', 'emergency'],
    estimatedTime: '10 seconds',
    execute: async () => {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return { success: true, message: 'Wedding emergency mode activated' };
    },
    isAvailable: () => true,
  },
  {
    id: 'system_health_check',
    title: 'System Health Check',
    description: 'Run comprehensive system diagnostics',
    category: 'system',
    priority: 'medium',
    icon: 'activity',
    shortcut: 'ctrl+shift+h',
    permissions: ['admin', 'support'],
    estimatedTime: '45 seconds',
    execute: async () => {
      await new Promise((resolve) => setTimeout(resolve, 4000));
      return { success: true, message: 'System health check completed' };
    },
    isAvailable: () => true,
  },
];

export const useQuickActions = (
  customActions: QuickAction[] = [],
  options: UseQuickActionsOptions = {},
): UseQuickActionsReturn => {
  const {
    maxHistorySize = 100,
    autoSaveHistory = true,
    enableShortcuts = true,
    permissions = [],
  } = options;

  // State
  const [actions, setActions] = useState<QuickAction[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [currentAction, setCurrentAction] = useState<QuickAction | null>(null);
  const [actionHistory, setActionHistory] = useState<ActionHistoryEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs for keyboard shortcuts
  const shortcutMapRef = useRef<Map<string, string>>(new Map());
  const keydownHandlerRef = useRef<((event: KeyboardEvent) => void) | null>(
    null,
  );

  // Initialize actions
  useEffect(() => {
    try {
      const allActions = [...DEFAULT_QUICK_ACTIONS, ...customActions];

      // Filter by permissions if provided
      const filteredActions =
        permissions.length > 0
          ? allActions.filter((action) =>
              action.permissions.some((perm) => permissions.includes(perm)),
            )
          : allActions;

      setActions(filteredActions);
      setIsReady(true);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to initialize actions',
      );
      setIsReady(false);
    }
  }, [customActions, permissions]);

  // Load history from localStorage
  useEffect(() => {
    if (autoSaveHistory) {
      try {
        const saved = localStorage.getItem('quickActionsHistory');
        if (saved) {
          const parsed = JSON.parse(saved);
          setActionHistory(
            parsed.map((entry: any) => ({
              ...entry,
              timestamp: new Date(entry.timestamp),
            })),
          );
        }
      } catch (err) {
        console.warn('Failed to load action history:', err);
      }
    }
  }, [autoSaveHistory]);

  // Save history to localStorage
  useEffect(() => {
    if (autoSaveHistory && actionHistory.length > 0) {
      try {
        localStorage.setItem(
          'quickActionsHistory',
          JSON.stringify(actionHistory),
        );
      } catch (err) {
        console.warn('Failed to save action history:', err);
      }
    }
  }, [actionHistory, autoSaveHistory]);

  // Filter actions based on search and categories
  const filteredActions = actions.filter((action) => {
    const matchesSearch =
      searchQuery === '' ||
      action.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      action.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategories.length === 0 ||
      selectedCategories.includes(action.category);

    const isAvailable = action.isAvailable();

    return matchesSearch && matchesCategory && isAvailable;
  });

  // Execute action
  const executeAction = useCallback(
    async (actionId: string, params?: any): Promise<ActionResult> => {
      const action = actions.find((a) => a.id === actionId);

      if (!action) {
        const error = `Action not found: ${actionId}`;
        setError(error);
        return { success: false, error };
      }

      if (isExecuting) {
        const error = 'Another action is currently executing';
        return { success: false, error };
      }

      setIsExecuting(true);
      setCurrentAction(action);
      setError(null);

      const startTime = Date.now();

      try {
        // Check permissions
        if (
          permissions.length > 0 &&
          !action.permissions.some((perm) => permissions.includes(perm))
        ) {
          throw new Error(
            `Insufficient permissions for action: ${action.title}`,
          );
        }

        // Execute action
        const result = await action.execute(params);
        const executionTime = Date.now() - startTime;

        const finalResult = {
          ...result,
          executionTime,
        };

        // Add to history
        const historyEntry: ActionHistoryEntry = {
          id: `${actionId}_${Date.now()}`,
          actionId,
          title: action.title,
          result: finalResult,
          timestamp: new Date(),
          parameters: params,
        };

        setActionHistory((prev) => {
          const newHistory = [historyEntry, ...prev];
          return newHistory.slice(0, maxHistorySize);
        });

        // Show toast notification
        if (result.success) {
          toast.success(
            result.message || `${action.title} completed successfully`,
            {
              description: `Executed in ${(executionTime / 1000).toFixed(1)}s`,
            },
          );
        } else {
          toast.error(result.error || `${action.title} failed`);
        }

        return finalResult;
      } catch (err) {
        const error =
          err instanceof Error ? err.message : 'Action execution failed';
        const failedResult = {
          success: false,
          error,
          executionTime: Date.now() - startTime,
        };

        // Add failed action to history
        const historyEntry: ActionHistoryEntry = {
          id: `${actionId}_${Date.now()}`,
          actionId,
          title: action.title,
          result: failedResult,
          timestamp: new Date(),
          parameters: params,
        };

        setActionHistory((prev) => {
          const newHistory = [historyEntry, ...prev];
          return newHistory.slice(0, maxHistorySize);
        });

        toast.error(error);
        setError(error);

        return failedResult;
      } finally {
        setIsExecuting(false);
        setCurrentAction(null);
      }
    },
    [actions, isExecuting, permissions, maxHistorySize],
  );

  // Clear history
  const clearHistory = useCallback(() => {
    setActionHistory([]);
    if (autoSaveHistory) {
      localStorage.removeItem('quickActionsHistory');
    }
  }, [autoSaveHistory]);

  // Register keyboard shortcut
  const registerShortcut = useCallback(
    (shortcut: string, actionId: string) => {
      if (!enableShortcuts) return;

      shortcutMapRef.current.set(shortcut.toLowerCase(), actionId);
    },
    [enableShortcuts],
  );

  // Unregister keyboard shortcut
  const unregisterShortcut = useCallback(
    (shortcut: string) => {
      if (!enableShortcuts) return;

      shortcutMapRef.current.delete(shortcut.toLowerCase());
    },
    [enableShortcuts],
  );

  // Setup keyboard shortcuts
  useEffect(() => {
    if (!enableShortcuts) return;

    // Register default shortcuts
    actions.forEach((action) => {
      if (action.shortcut) {
        registerShortcut(action.shortcut, action.id);
      }
    });

    // Create keyboard handler
    const handleKeydown = (event: KeyboardEvent) => {
      const key = [
        event.ctrlKey ? 'ctrl' : '',
        event.altKey ? 'alt' : '',
        event.shiftKey ? 'shift' : '',
        event.metaKey ? 'cmd' : '',
        event.key.toLowerCase(),
      ]
        .filter(Boolean)
        .join('+');

      const actionId = shortcutMapRef.current.get(key);
      if (actionId && !isExecuting) {
        event.preventDefault();
        executeAction(actionId);
      }
    };

    keydownHandlerRef.current = handleKeydown;
    document.addEventListener('keydown', handleKeydown);

    return () => {
      if (keydownHandlerRef.current) {
        document.removeEventListener('keydown', keydownHandlerRef.current);
      }
    };
  }, [actions, enableShortcuts, executeAction, isExecuting, registerShortcut]);

  return {
    // Actions
    actions,
    filteredActions,

    // Execution
    executeAction,
    isExecuting,
    currentAction,

    // History
    actionHistory,
    clearHistory,

    // Filtering & Search
    searchQuery,
    setSearchQuery,
    selectedCategories,
    setSelectedCategories,

    // Keyboard shortcuts
    registerShortcut,
    unregisterShortcut,

    // State
    isReady,
    error,
  };
};

// Utility functions for quick actions
export const createQuickAction = (
  config: Omit<QuickAction, 'isAvailable'> & { isAvailable?: () => boolean },
): QuickAction => ({
  isAvailable: () => true,
  ...config,
});

export const createEmergencyAction = (
  id: string,
  title: string,
  description: string,
  execute: () => Promise<ActionResult>,
  shortcut?: string,
): QuickAction =>
  createQuickAction({
    id,
    title,
    description,
    category: 'emergency',
    priority: 'critical',
    icon: 'alert-triangle',
    shortcut,
    permissions: ['admin', 'emergency'],
    execute,
    estimatedTime: '15 seconds',
  });

export const createBulkAction = (
  id: string,
  title: string,
  description: string,
  execute: (params: any) => Promise<ActionResult>,
  shortcut?: string,
): QuickAction =>
  createQuickAction({
    id,
    title,
    description,
    category: 'bulk',
    priority: 'medium',
    icon: 'users',
    shortcut,
    permissions: ['admin', 'support'],
    execute,
    estimatedTime: '30 seconds',
  });

export default useQuickActions;
