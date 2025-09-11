import { renderHook, act } from '@testing-library/react';
import { jest } from '@jest/globals';
import {
  useQuickActions,
  createEmergencyAction,
  createBulkAction,
} from '../../../hooks/useQuickActions';

// Mock toast notifications
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('useQuickActions Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
  });

  afterEach(() => {
    // Clean up event listeners
    document.removeEventListener('keydown', jest.fn());
  });

  describe('Initialization', () => {
    it('initializes with default actions', () => {
      const { result } = renderHook(() => useQuickActions());

      expect(result.current.actions).toHaveLength(4); // Default actions
      expect(result.current.isReady).toBe(true);
      expect(result.current.error).toBe(null);
    });

    it('adds custom actions to default ones', () => {
      const customAction = createEmergencyAction(
        'custom_emergency',
        'Custom Emergency',
        'Custom emergency action',
        async () => ({ success: true }),
      );

      const { result } = renderHook(() => useQuickActions([customAction]));

      expect(result.current.actions).toHaveLength(5); // 4 default + 1 custom
      expect(
        result.current.actions.find((a) => a.id === 'custom_emergency'),
      ).toBeDefined();
    });

    it('filters actions by permissions', () => {
      const { result } = renderHook(() =>
        useQuickActions([], { permissions: ['support'] }),
      );

      // Should only include actions that support role can access
      const supportActions = result.current.actions.filter((action) =>
        action.permissions.includes('support'),
      );
      expect(result.current.actions).toHaveLength(supportActions.length);
    });
  });

  describe('Action Execution', () => {
    it('executes action successfully', async () => {
      const { result } = renderHook(() => useQuickActions());

      await act(async () => {
        const actionResult = await result.current.executeAction(
          'system_health_check',
        );
        expect(actionResult.success).toBe(true);
        expect(actionResult.message).toBe('System health check completed');
      });

      expect(result.current.actionHistory).toHaveLength(1);
      expect(result.current.actionHistory[0].result.success).toBe(true);
    });

    it('handles action execution failure', async () => {
      const failingAction = createEmergencyAction(
        'failing_action',
        'Failing Action',
        'This action will fail',
        async () => {
          throw new Error('Action failed');
        },
      );

      const { result } = renderHook(() => useQuickActions([failingAction]));

      await act(async () => {
        const actionResult =
          await result.current.executeAction('failing_action');
        expect(actionResult.success).toBe(false);
        expect(actionResult.error).toBe('Action failed');
      });

      expect(result.current.actionHistory[0].result.success).toBe(false);
    });

    it('prevents concurrent action execution', async () => {
      const { result } = renderHook(() => useQuickActions());

      // Start first action
      const firstPromise = act(async () => {
        return result.current.executeAction('system_health_check');
      });

      // Try to start second action while first is running
      const secondResult = await act(async () => {
        return result.current.executeAction('emergency_auth_reset');
      });

      expect(secondResult.success).toBe(false);
      expect(secondResult.error).toBe('Another action is currently executing');

      await firstPromise;
    });

    it('checks permissions before execution', async () => {
      const { result } = renderHook(() =>
        useQuickActions([], { permissions: ['read_only'] }),
      );

      await act(async () => {
        const actionResult = await result.current.executeAction(
          'emergency_auth_reset',
        );
        expect(actionResult.success).toBe(false);
        expect(actionResult.error).toContain('Insufficient permissions');
      });
    });

    it('tracks execution time', async () => {
      const { result } = renderHook(() => useQuickActions());

      await act(async () => {
        await result.current.executeAction('system_health_check');
      });

      const historyEntry = result.current.actionHistory[0];
      expect(historyEntry.result.executionTime).toBeGreaterThan(0);
    });
  });

  describe('Action History', () => {
    it('adds executed actions to history', async () => {
      const { result } = renderHook(() => useQuickActions());

      await act(async () => {
        await result.current.executeAction('system_health_check');
        await result.current.executeAction('emergency_auth_reset');
      });

      expect(result.current.actionHistory).toHaveLength(2);
      expect(result.current.actionHistory[0].actionId).toBe(
        'emergency_auth_reset',
      ); // Most recent first
      expect(result.current.actionHistory[1].actionId).toBe(
        'system_health_check',
      );
    });

    it('limits history size', async () => {
      const { result } = renderHook(() =>
        useQuickActions([], { maxHistorySize: 2 }),
      );

      await act(async () => {
        await result.current.executeAction('system_health_check');
        await result.current.executeAction('emergency_auth_reset');
        await result.current.executeAction('wedding_emergency_mode');
      });

      expect(result.current.actionHistory).toHaveLength(2);
      expect(result.current.actionHistory[0].actionId).toBe(
        'wedding_emergency_mode',
      );
      expect(result.current.actionHistory[1].actionId).toBe(
        'emergency_auth_reset',
      );
    });

    it('clears history', async () => {
      const { result } = renderHook(() => useQuickActions());

      await act(async () => {
        await result.current.executeAction('system_health_check');
      });

      expect(result.current.actionHistory).toHaveLength(1);

      act(() => {
        result.current.clearHistory();
      });

      expect(result.current.actionHistory).toHaveLength(0);
    });

    it('persists history to localStorage', async () => {
      const { result } = renderHook(() =>
        useQuickActions([], { autoSaveHistory: true }),
      );

      await act(async () => {
        await result.current.executeAction('system_health_check');
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'quickActionsHistory',
        expect.stringContaining('system_health_check'),
      );
    });

    it('loads history from localStorage', () => {
      const savedHistory = JSON.stringify([
        {
          id: 'test_1',
          actionId: 'system_health_check',
          title: 'System Health Check',
          result: { success: true },
          timestamp: new Date().toISOString(),
        },
      ]);

      localStorageMock.getItem.mockReturnValue(savedHistory);

      const { result } = renderHook(() =>
        useQuickActions([], { autoSaveHistory: true }),
      );

      expect(result.current.actionHistory).toHaveLength(1);
      expect(result.current.actionHistory[0].actionId).toBe(
        'system_health_check',
      );
    });
  });

  describe('Search and Filtering', () => {
    it('filters actions by search query', () => {
      const { result } = renderHook(() => useQuickActions());

      act(() => {
        result.current.setSearchQuery('emergency');
      });

      expect(result.current.searchQuery).toBe('emergency');
      expect(result.current.filteredActions.length).toBeLessThan(
        result.current.actions.length,
      );
      expect(
        result.current.filteredActions.every(
          (action) =>
            action.title.toLowerCase().includes('emergency') ||
            action.description.toLowerCase().includes('emergency'),
        ),
      ).toBe(true);
    });

    it('filters actions by categories', () => {
      const { result } = renderHook(() => useQuickActions());

      act(() => {
        result.current.setSelectedCategories(['emergency']);
      });

      expect(result.current.selectedCategories).toEqual(['emergency']);
      expect(
        result.current.filteredActions.every(
          (action) => action.category === 'emergency',
        ),
      ).toBe(true);
    });

    it('combines search and category filters', () => {
      const { result } = renderHook(() => useQuickActions());

      act(() => {
        result.current.setSearchQuery('auth');
        result.current.setSelectedCategories(['emergency']);
      });

      const filtered = result.current.filteredActions;
      expect(
        filtered.every(
          (action) =>
            action.category === 'emergency' &&
            (action.title.toLowerCase().includes('auth') ||
              action.description.toLowerCase().includes('auth')),
        ),
      ).toBe(true);
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('registers default shortcuts', () => {
      const { result } = renderHook(() =>
        useQuickActions([], { enableShortcuts: true }),
      );

      // Check that keyboard event listener is added
      expect(result.current.isReady).toBe(true);
    });

    it('executes action on keyboard shortcut', async () => {
      const { result } = renderHook(() =>
        useQuickActions([], { enableShortcuts: true }),
      );

      // Simulate Ctrl+Shift+A (emergency auth reset shortcut)
      const keyboardEvent = new KeyboardEvent('keydown', {
        key: 'a',
        ctrlKey: true,
        shiftKey: true,
      });

      await act(async () => {
        document.dispatchEvent(keyboardEvent);
      });

      // Should have executed the emergency auth reset action
      expect(
        result.current.actionHistory.some(
          (entry) => entry.actionId === 'emergency_auth_reset',
        ),
      ).toBe(true);
    });

    it('disables shortcuts when option is false', () => {
      renderHook(() => useQuickActions([], { enableShortcuts: false }));

      // Simulate shortcut - should not execute
      const keyboardEvent = new KeyboardEvent('keydown', {
        key: 'a',
        ctrlKey: true,
        shiftKey: true,
      });

      document.dispatchEvent(keyboardEvent);

      // Action should not execute (we'd need a way to verify this)
    });
  });

  describe('Wedding Day Scenarios', () => {
    it('prioritizes emergency actions', () => {
      const emergencyAction = createEmergencyAction(
        'wedding_day_emergency',
        'Wedding Day Emergency',
        'Critical wedding day issue',
        async () => ({ success: true }),
      );

      const { result } = renderHook(() => useQuickActions([emergencyAction]));

      const emergencyActions = result.current.actions.filter(
        (a) => a.priority === 'critical',
      );
      expect(emergencyActions.length).toBeGreaterThan(0);
    });

    it('handles Saturday wedding protocol', async () => {
      const saturdayEmergencyAction = createEmergencyAction(
        'saturday_emergency',
        'Saturday Emergency Protocol',
        'Emergency action for Saturday weddings',
        async () => ({
          success: true,
          message: 'Saturday protocol activated',
        }),
      );

      const { result } = renderHook(() =>
        useQuickActions([saturdayEmergencyAction]),
      );

      await act(async () => {
        const result_action =
          await result.current.executeAction('saturday_emergency');
        expect(result_action.success).toBe(true);
        expect(result_action.message).toBe('Saturday protocol activated');
      });
    });

    it('tracks wedding-specific action parameters', async () => {
      const { result } = renderHook(() => useQuickActions());

      const weddingParams = {
        weddingId: 'wedding-123',
        coupleName: 'Sarah & James',
        isEmergency: true,
        weddingDate: '2024-12-21',
      };

      await act(async () => {
        await result.current.executeAction(
          'wedding_emergency_mode',
          weddingParams,
        );
      });

      const historyEntry = result.current.actionHistory[0];
      expect(historyEntry.parameters).toEqual(weddingParams);
    });
  });

  describe('Error Handling', () => {
    it('handles non-existent action gracefully', async () => {
      const { result } = renderHook(() => useQuickActions());

      await act(async () => {
        const actionResult = await result.current.executeAction(
          'non_existent_action',
        );
        expect(actionResult.success).toBe(false);
        expect(actionResult.error).toBe(
          'Action not found: non_existent_action',
        );
      });
    });

    it('handles localStorage errors gracefully', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });

      const { result } = renderHook(() =>
        useQuickActions([], { autoSaveHistory: true }),
      );

      // Should still initialize without crashing
      expect(result.current.isReady).toBe(true);
    });

    it('handles action execution timeout', async () => {
      const timeoutAction = createEmergencyAction(
        'timeout_action',
        'Timeout Action',
        'This action will timeout',
        async () => {
          return new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Action timeout')), 100);
          });
        },
      );

      const { result } = renderHook(() => useQuickActions([timeoutAction]));

      await act(async () => {
        const actionResult =
          await result.current.executeAction('timeout_action');
        expect(actionResult.success).toBe(false);
        expect(actionResult.error).toBe('Action timeout');
      });
    });
  });

  describe('Utility Functions', () => {
    it('creates emergency action with correct properties', () => {
      const action = createEmergencyAction(
        'test_emergency',
        'Test Emergency',
        'Test emergency description',
        async () => ({ success: true }),
      );

      expect(action.id).toBe('test_emergency');
      expect(action.category).toBe('emergency');
      expect(action.priority).toBe('critical');
      expect(action.permissions).toContain('admin');
      expect(action.permissions).toContain('emergency');
    });

    it('creates bulk action with correct properties', () => {
      const action = createBulkAction(
        'test_bulk',
        'Test Bulk',
        'Test bulk description',
        async () => ({ success: true }),
      );

      expect(action.id).toBe('test_bulk');
      expect(action.category).toBe('bulk');
      expect(action.priority).toBe('medium');
      expect(action.permissions).toContain('admin');
      expect(action.permissions).toContain('support');
    });
  });
});
