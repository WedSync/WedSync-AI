import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import {
  describe,
  it,
  expect,
  jest,
  beforeEach,
  afterEach,
} from '@jest/globals';
import { useWeddingMetrics } from '../../hooks/useWeddingMetrics';

// Mock Supabase client
const mockSupabaseClient = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        gte: jest.fn(() => ({
          lte: jest.fn(() =>
            Promise.resolve({
              data: [
                {
                  id: 1,
                  wedding_date: '2022-01-01',
                  status: 'active',
                  vendor_count: 5,
                },
                {
                  id: 2,
                  wedding_date: '2022-01-01',
                  status: 'active',
                  vendor_count: 8,
                },
              ],
              error: null,
            }),
          ),
        })),
        order: jest.fn(() => ({
          limit: jest.fn(() =>
            Promise.resolve({
              data: [
                { pattern_type: 'celebrity', expected_growth_multiplier: 25.0 },
              ],
              error: null,
            }),
          ),
        })),
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

describe('useWeddingMetrics', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Date for consistent testing
    jest.spyOn(Date, 'now').mockImplementation(() => 1640995200000); // 2022-01-01 00:00:00 UTC (Saturday)
    jest.spyOn(global.Date.prototype, 'getDay').mockImplementation(() => 6); // Saturday
    jest.spyOn(global.Date.prototype, 'getMonth').mockImplementation(() => 5); // June (peak season)
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with loading state', () => {
      const { result } = renderHook(() => useWeddingMetrics());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.metrics).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('should load wedding metrics after initialization', async () => {
      const { result } = renderHook(() => useWeddingMetrics());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.metrics).toBeDefined();
      expect(result.current.metrics?.activeSaturdayWeddings).toBe(2); // Two weddings on Saturday
      expect(result.current.metrics?.peakSeasonActive).toBe(true); // June is peak season
    });

    it('should load seasonal metrics', async () => {
      // Mock yearly wedding data
      mockSupabaseClient.from = jest.fn((table) => {
        if (table === 'weddings') {
          return {
            select: jest.fn(() => ({
              gte: jest.fn(() => ({
                lte: jest.fn(() =>
                  Promise.resolve({
                    data: Array.from({ length: 12 }, (_, i) => ({
                      wedding_date: `2022-${String(i + 1).padStart(2, '0')}-15`,
                      vendor_count: Math.floor(Math.random() * 10) + 1,
                      budget_total: Math.floor(Math.random() * 50000) + 10000,
                    })),
                    error: null,
                  }),
                ),
              })),
            })),
          };
        }
        return {
          select: jest.fn(() => ({
            order: jest.fn(() => ({
              limit: jest.fn(() => Promise.resolve({ data: [], error: null })),
            })),
          })),
        };
      });

      const { result } = renderHook(() => useWeddingMetrics());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.seasonMetrics).toBeDefined();
      expect(result.current.seasonMetrics?.currentSeason).toBe('peak');
      expect(
        result.current.seasonMetrics?.totalBookingsThisYear,
      ).toBeGreaterThan(0);
    });

    it('should handle initialization errors', async () => {
      mockSupabaseClient.from = jest.fn(() => ({
        select: jest.fn(() => {
          throw new Error('Database connection failed');
        }),
      }));

      const { result } = renderHook(() => useWeddingMetrics());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to load wedding metrics');
    });
  });

  describe('wedding metrics calculation', () => {
    it('should calculate Saturday wedding count correctly', async () => {
      const { result } = renderHook(() => useWeddingMetrics());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should count weddings on Saturday
      expect(result.current.metrics?.activeSaturdayWeddings).toBe(2);
    });

    it('should calculate zero Saturday weddings on non-Saturday', async () => {
      // Mock Monday
      jest.spyOn(global.Date.prototype, 'getDay').mockImplementation(() => 1);

      const { result } = renderHook(() => useWeddingMetrics());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.metrics?.activeSaturdayWeddings).toBe(0);
    });

    it('should detect peak wedding season correctly', async () => {
      // Mock June (peak month)
      jest.spyOn(global.Date.prototype, 'getMonth').mockImplementation(() => 5);

      const { result } = renderHook(() => useWeddingMetrics());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.metrics?.peakSeasonActive).toBe(true);
    });

    it('should detect off-season correctly', async () => {
      // Mock January (off-season)
      jest.spyOn(global.Date.prototype, 'getMonth').mockImplementation(() => 0);

      const { result } = renderHook(() => useWeddingMetrics());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.metrics?.peakSeasonActive).toBe(false);
    });

    it('should calculate viral referral rate', async () => {
      // Mock referral data
      mockSupabaseClient.from = jest.fn((table) => {
        if (table === 'vendor_invites') {
          return {
            select: jest.fn(() => ({
              gte: jest.fn(() =>
                Promise.resolve({
                  data: [
                    { conversion_rate: 0.25, invite_source: 'couple' },
                    { conversion_rate: 0.15, invite_source: 'vendor' },
                    { conversion_rate: 0, invite_source: 'couple' },
                    { conversion_rate: 0.35, invite_source: 'couple' },
                  ],
                  error: null,
                }),
              ),
            })),
          };
        }
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              gte: jest.fn(() => ({
                lte: jest.fn(() => Promise.resolve({ data: [], error: null })),
              })),
            })),
          })),
        };
      });

      const { result } = renderHook(() => useWeddingMetrics());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // 3 conversions out of 4 invites = 75%
      expect(result.current.metrics?.viralReferralRate).toBe(75);
    });
  });

  describe('real-time subscriptions', () => {
    it('should set up wedding event subscriptions', () => {
      renderHook(() => useWeddingMetrics());

      expect(mockSupabaseClient.channel).toHaveBeenCalledWith(
        'wedding-metrics-updates',
      );
    });

    it('should handle new wedding insertions', async () => {
      let insertHandler: Function = jest.fn();

      mockSupabaseClient.channel = jest.fn(() => ({
        on: jest.fn((event, config, callback) => {
          if (config.table === 'weddings' && config.event === 'INSERT') {
            insertHandler = callback;
          }
          return {
            on: jest.fn(() => ({ subscribe: jest.fn() })),
          };
        }),
      }));

      const { result } = renderHook(() => useWeddingMetrics());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Mock refreshMetrics call
      const refreshSpy = jest.spyOn(result.current, 'refreshMetrics');

      act(() => {
        insertHandler({ new: { id: 3, wedding_date: '2022-01-01' } });
      });

      expect(refreshSpy).toHaveBeenCalled();
    });

    it('should handle viral invite events', async () => {
      let inviteHandler: Function = jest.fn();

      mockSupabaseClient.channel = jest.fn(() => ({
        on: jest.fn((event, config, callback) => {
          if (config.table === 'vendor_invites' && config.event === 'INSERT') {
            inviteHandler = callback;
          }
          return {
            on: jest.fn(() => ({ subscribe: jest.fn() })),
          };
        }),
      }));

      const { result } = renderHook(() => useWeddingMetrics());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        inviteHandler({ new: { id: 1, conversion_rate: 0.2 } });
      });

      // Should slightly increase viral referral rate
      expect(result.current.metrics?.viralReferralRate).toBeGreaterThan(0);
    });
  });

  describe('periodic metrics refresh', () => {
    it('should refresh metrics every 2 minutes', async () => {
      jest.useFakeTimers();

      const { result } = renderHook(() => useWeddingMetrics());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const initialCallCount = mockSupabaseClient.from.mock.calls.length;

      // Fast-forward 2 minutes
      act(() => {
        jest.advanceTimersByTime(120000);
      });

      await waitFor(() => {
        expect(mockSupabaseClient.from.mock.calls.length).toBeGreaterThan(
          initialCallCount,
        );
      });

      jest.useRealTimers();
    });
  });

  describe('actions', () => {
    it('should refresh metrics on demand', async () => {
      const { result } = renderHook(() => useWeddingMetrics());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const initialCallCount = mockSupabaseClient.from.mock.calls.length;

      await act(async () => {
        await result.current.refreshMetrics();
      });

      expect(mockSupabaseClient.from.mock.calls.length).toBeGreaterThan(
        initialCallCount,
      );
    });

    it('should track viral growth patterns', async () => {
      const { result } = renderHook(() => useWeddingMetrics());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const viralPattern = {
        pattern_type: 'celebrity' as const,
        expected_growth_multiplier: 50.0,
        duration_hours: 48,
        geographic_impact: ['global'],
        trigger_event: 'Celebrity wedding announcement',
      };

      await act(async () => {
        await result.current.trackViralGrowth(viralPattern);
      });

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('viral_patterns');
      expect(result.current.viralPatterns).toContainEqual(viralPattern);
    });

    it('should record vendor conversions', async () => {
      const { result } = renderHook(() => useWeddingMetrics());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const conversion = {
        invite_id: 'inv_123',
        vendor_id: 'vendor_456',
        couple_id: 'couple_789',
        conversion_stage: 'signed_up' as const,
        conversion_rate: 0.25,
        time_to_convert_hours: 24,
      };

      await act(async () => {
        await result.current.recordConversion(conversion);
      });

      expect(mockSupabaseClient.from).toHaveBeenCalledWith(
        'vendor_invite_conversions',
      );
      expect(result.current.conversions).toContainEqual(conversion);
    });

    it('should reset errors', async () => {
      const { result } = renderHook(() => useWeddingMetrics());

      // Set error state
      mockSupabaseClient.from = jest.fn(() => {
        throw new Error('Test error');
      });

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
    it('should handle trackViralGrowth errors', async () => {
      mockSupabaseClient.from = jest.fn(() => ({
        insert: jest.fn(() =>
          Promise.resolve({ error: { message: 'Insert failed' } }),
        ),
      }));

      const { result } = renderHook(() => useWeddingMetrics());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const viralPattern = {
        pattern_type: 'social_media' as const,
        expected_growth_multiplier: 10.0,
        duration_hours: 12,
        geographic_impact: ['us'],
        trigger_event: 'Viral social media post',
      };

      await act(async () => {
        await result.current.trackViralGrowth(viralPattern);
      });

      expect(result.current.error).toBe('Failed to track viral growth pattern');
    });

    it('should handle recordConversion errors', async () => {
      mockSupabaseClient.from = jest.fn(() => ({
        insert: jest.fn(() =>
          Promise.resolve({ error: { message: 'Insert failed' } }),
        ),
      }));

      const { result } = renderHook(() => useWeddingMetrics());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const conversion = {
        invite_id: 'inv_fail',
        vendor_id: 'vendor_fail',
        couple_id: 'couple_fail',
        conversion_stage: 'viewed_profile' as const,
        conversion_rate: 0.1,
        time_to_convert_hours: 2,
      };

      await act(async () => {
        await result.current.recordConversion(conversion);
      });

      expect(result.current.error).toBe('Failed to record conversion');
    });

    it('should handle refresh errors gracefully', async () => {
      const { result } = renderHook(() => useWeddingMetrics());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Mock error on refresh
      mockSupabaseClient.from = jest.fn(() => {
        throw new Error('Refresh failed');
      });

      await act(async () => {
        await result.current.refreshMetrics();
      });

      expect(result.current.error).toBe('Failed to refresh wedding metrics');
    });
  });

  describe('cleanup', () => {
    it('should cleanup subscriptions on unmount', () => {
      const { unmount } = renderHook(() => useWeddingMetrics());

      unmount();

      expect(mockSupabaseClient.removeChannel).toHaveBeenCalled();
    });

    it('should clear polling interval on unmount', () => {
      jest.useFakeTimers();
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      const { unmount } = renderHook(() => useWeddingMetrics());

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
      jest.useRealTimers();
    });
  });

  describe('season detection', () => {
    it('should correctly identify peak season', async () => {
      jest.spyOn(global.Date.prototype, 'getMonth').mockImplementation(() => 6); // July

      const { result } = renderHook(() => useWeddingMetrics());

      await waitFor(() => {
        expect(result.current.seasonMetrics?.currentSeason).toBe('peak');
      });
    });

    it('should correctly identify moderate season', async () => {
      jest.spyOn(global.Date.prototype, 'getMonth').mockImplementation(() => 3); // April

      const { result } = renderHook(() => useWeddingMetrics());

      await waitFor(() => {
        expect(result.current.seasonMetrics?.currentSeason).toBe('moderate');
      });
    });

    it('should correctly identify low season', async () => {
      jest.spyOn(global.Date.prototype, 'getMonth').mockImplementation(() => 1); // February

      const { result } = renderHook(() => useWeddingMetrics());

      await waitFor(() => {
        expect(result.current.seasonMetrics?.currentSeason).toBe('low');
      });
    });
  });
});
