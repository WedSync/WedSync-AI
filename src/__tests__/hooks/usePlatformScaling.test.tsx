import React from 'react';
import { render, renderHook, act, waitFor } from '@testing-library/react';
import {
  describe,
  it,
  expect,
  jest,
  beforeEach,
  afterEach,
} from '@jest/globals';
import { usePlatformScaling } from '../../hooks/usePlatformScaling';

// Mock Supabase client
const mockSupabaseClient = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
    insert: jest.fn(() => Promise.resolve({ data: null, error: null })),
  })),
  channel: jest.fn(() => ({
    on: jest.fn(() => ({
      on: jest.fn(() => ({
        subscribe: jest.fn(),
      })),
    })),
    send: jest.fn(),
  })),
  removeChannel: jest.fn(),
};

jest.mock('../../lib/supabase/client', () => ({
  createClient: () => mockSupabaseClient,
}));

// Mock the orchestrator
const mockOrchestrator = {
  initialize: jest.fn(() => Promise.resolve()),
  getCurrentMetrics: jest.fn(() =>
    Promise.resolve({
      platformHealth: {
        overallScore: 95,
        systemStatus: {
          database: 'healthy',
          api: 'healthy',
          storage: 'healthy',
        },
      },
      viralGrowthMetrics: {
        currentGrowthRate: 150,
        activeViralPatterns: [],
        newUserRegistrations: 45,
        inviteConversionRate: 12.5,
      },
      weddingSeasonMetrics: {
        currentSeason: 'moderate',
        peakMonths: [5, 6, 7, 8, 9],
        totalBookingsThisYear: 1250,
        averageBookingsPerMonth: 104.2,
      },
    }),
  ),
  getWeddingProtectionStatus: jest.fn(() =>
    Promise.resolve({
      isActive: false,
      activatedBy: '',
      activatedAt: '',
      reason: '',
      affectedSystems: [],
    }),
  ),
  makeScalingDecision: jest.fn(() =>
    Promise.resolve({
      timestamp: new Date().toISOString(),
      scalingActions: ['maintain_capacity'],
      reasoning: 'Platform operating within normal parameters',
      priority: 'normal',
      estimatedDuration: 300000,
      restrictions: [],
    }),
  ),
  enableWeddingProtection: jest.fn(() => Promise.resolve()),
  disableWeddingProtection: jest.fn(() => Promise.resolve()),
};

jest.mock('../../lib/platform/scalability-orchestrator', () => ({
  WeddingPlatformScalabilityOrchestrator: jest.fn(() => mockOrchestrator),
}));

describe('usePlatformScaling', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock environment variables
    process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID = 'test-project-id';
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with loading state', () => {
      const { result } = renderHook(() => usePlatformScaling());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.metrics).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('should load metrics after initialization', async () => {
      const { result } = renderHook(() => usePlatformScaling());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.metrics).toBeDefined();
      expect(result.current.metrics?.platformHealth.overallScore).toBe(95);
      expect(mockOrchestrator.initialize).toHaveBeenCalled();
    });

    it('should handle initialization errors', async () => {
      mockOrchestrator.initialize.mockRejectedValueOnce(
        new Error('Initialization failed'),
      );

      const { result } = renderHook(() => usePlatformScaling());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe(
        'Failed to initialize platform scaling',
      );
    });
  });

  describe('metrics polling', () => {
    it('should poll metrics periodically', async () => {
      jest.useFakeTimers();

      const { result } = renderHook(() => usePlatformScaling());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Fast-forward 30 seconds (polling interval)
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        expect(mockOrchestrator.getCurrentMetrics).toHaveBeenCalledTimes(2);
      });

      jest.useRealTimers();
    });

    it('should handle polling errors gracefully', async () => {
      jest.useFakeTimers();

      const { result } = renderHook(() => usePlatformScaling());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Mock error on next poll
      mockOrchestrator.getCurrentMetrics.mockRejectedValueOnce(
        new Error('Polling failed'),
      );

      act(() => {
        jest.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to refresh platform metrics');
      });

      jest.useRealTimers();
    });
  });

  describe('real-time subscriptions', () => {
    it('should set up real-time subscriptions', () => {
      renderHook(() => usePlatformScaling());

      expect(mockSupabaseClient.channel).toHaveBeenCalledWith(
        'wedding-scaling-events',
      );
    });

    it('should handle wedding day events', async () => {
      let eventHandler: Function = jest.fn();

      mockSupabaseClient.channel = jest.fn(() => ({
        on: jest.fn((event, callback) => {
          if (callback.event === 'wedding-day-started') {
            eventHandler = callback.handler;
          }
          return {
            on: jest.fn(() => ({ subscribe: jest.fn() })),
          };
        }),
      }));

      const { result } = renderHook(() => usePlatformScaling());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Simulate wedding day event
      act(() => {
        eventHandler({ wedding_count: 3 });
      });

      expect(result.current.weddingProtection.isActive).toBe(true);
    });

    it('should handle viral growth events', async () => {
      let viralHandler: Function = jest.fn();

      mockSupabaseClient.channel = jest.fn(() => ({
        on: jest.fn((event, callback) => {
          if (callback.event === 'viral-growth-spike') {
            viralHandler = callback.handler;
          }
          return {
            on: jest.fn(() => ({ subscribe: jest.fn() })),
          };
        }),
      }));

      const { result } = renderHook(() => usePlatformScaling());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        viralHandler({
          growth_rate: 750,
          patterns: ['celebrity', 'social_media'],
        });
      });

      expect(result.current.metrics?.viralGrowthMetrics.currentGrowthRate).toBe(
        750,
      );
    });
  });

  describe('actions', () => {
    it('should refresh metrics on demand', async () => {
      const { result } = renderHook(() => usePlatformScaling());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.refreshMetrics();
      });

      expect(mockOrchestrator.getCurrentMetrics).toHaveBeenCalledTimes(2); // Initial + refresh
    });

    it('should enable wedding protection', async () => {
      const { result } = renderHook(() => usePlatformScaling());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.enableWeddingProtection();
      });

      expect(mockOrchestrator.enableWeddingProtection).toHaveBeenCalledWith(
        'Manual activation by admin',
      );
    });

    it('should disable wedding protection', async () => {
      const { result } = renderHook(() => usePlatformScaling());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.disableWeddingProtection();
      });

      expect(mockOrchestrator.disableWeddingProtection).toHaveBeenCalled();
    });

    it('should trigger scaling decision', async () => {
      const { result } = renderHook(() => usePlatformScaling());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.triggerScalingDecision();
      });

      expect(mockOrchestrator.makeScalingDecision).toHaveBeenCalled();
      expect(result.current.lastDecision).toBeDefined();
      expect(result.current.lastDecision?.scalingActions).toContain(
        'maintain_capacity',
      );
    });

    it('should reset errors', async () => {
      const { result } = renderHook(() => usePlatformScaling());

      // Set an error state
      mockOrchestrator.getCurrentMetrics.mockRejectedValueOnce(
        new Error('Test error'),
      );

      await act(async () => {
        await result.current.refreshMetrics();
      });

      expect(result.current.error).toBeDefined();

      act(() => {
        result.current.resetError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('error handling', () => {
    it('should handle enableWeddingProtection errors', async () => {
      mockOrchestrator.enableWeddingProtection.mockRejectedValueOnce(
        new Error('Enable failed'),
      );

      const { result } = renderHook(() => usePlatformScaling());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.enableWeddingProtection();
      });

      expect(result.current.error).toBe('Failed to enable wedding protection');
    });

    it('should handle disableWeddingProtection errors', async () => {
      mockOrchestrator.disableWeddingProtection.mockRejectedValueOnce(
        new Error('Disable failed'),
      );

      const { result } = renderHook(() => usePlatformScaling());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.disableWeddingProtection();
      });

      expect(result.current.error).toBe('Failed to disable wedding protection');
    });

    it('should handle triggerScalingDecision errors', async () => {
      mockOrchestrator.makeScalingDecision.mkRejectedValueOnce(
        new Error('Decision failed'),
      );

      const { result } = renderHook(() => usePlatformScaling());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.triggerScalingDecision();
      });

      expect(result.current.error).toBe('Failed to make scaling decision');
    });
  });

  describe('cleanup', () => {
    it('should cleanup subscriptions on unmount', () => {
      const { unmount } = renderHook(() => usePlatformScaling());

      unmount();

      expect(mockSupabaseClient.removeChannel).toHaveBeenCalled();
    });

    it('should clear polling interval on unmount', () => {
      jest.useFakeTimers();
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      const { unmount } = renderHook(() => usePlatformScaling());

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
      jest.useRealTimers();
    });
  });

  describe('wedding protection status', () => {
    it('should track wedding protection status', async () => {
      mockOrchestrator.getWeddingProtectionStatus.mockResolvedValue({
        isActive: true,
        activatedBy: 'admin@wedsync.com',
        activatedAt: '2022-01-01T10:00:00Z',
        reason: 'Saturday wedding protection',
        affectedSystems: ['deployments', 'maintenance'],
      });

      const { result } = renderHook(() => usePlatformScaling());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.weddingProtection.isActive).toBe(true);
      expect(result.current.weddingProtection.reason).toBe(
        'Saturday wedding protection',
      );
      expect(result.current.weddingProtection.affectedSystems).toContain(
        'deployments',
      );
    });
  });
});
