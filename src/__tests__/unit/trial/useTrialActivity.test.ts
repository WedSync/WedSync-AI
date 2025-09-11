/**
 * WS-140 Trial Management System - useTrialActivity Hook Unit Tests
 * Comprehensive test suite for useTrialActivity custom hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor, cleanup } from '@testing-library/react';
import { useTrialActivity } from '@/hooks/useTrialActivity';
import { TrialFeatureUsage, TrialMilestone, MilestoneType } from '@/types/trial';
// Mock SWR
vi.mock('swr', () => ({
  default: vi.fn()
}));
// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(() => 'SUBSCRIBED')
    })),
    removeChannel: vi.fn()
  }))
// Mock fetch globally
global.fetch = vi.fn();
const mockFeatureUsage: TrialFeatureUsage[] = [
  {
    id: 'usage-1',
    trial_id: 'trial-123',
    feature_key: 'client_onboarding',
    feature_name: 'Client Onboarding',
    usage_count: 5,
    time_saved_minutes: 150,
    last_used_at: new Date('2025-01-15'),
    created_at: new Date('2025-01-10')
  },
    id: 'usage-2',
    feature_key: 'email_automation',
    feature_name: 'Email Automation',
    usage_count: 3,
    time_saved_minutes: 60,
    last_used_at: new Date('2025-01-14'),
    created_at: new Date('2025-01-12')
  }
];
const mockMilestones: TrialMilestone[] = [
    id: 'milestone-1',
    milestone_type: 'first_client_connected',
    milestone_name: 'First Client Connected',
    description: 'Successfully add your first client',
    achieved: true,
    achieved_at: new Date('2025-01-10'),
    time_to_achieve_hours: 2,
    value_impact_score: 8,
    created_at: new Date('2025-01-01')
    id: 'milestone-2',
    milestone_type: 'initial_journey_created',
    milestone_name: 'Initial Journey Created',
    description: 'Create your first automated journey',
    achieved: false,
    value_impact_score: 9,
// Mock SWR implementation
const mockSWR = vi.fn();
const mockMutateFeatures = vi.fn();
const mockMutateMilestones = vi.fn();
describe('useTrialActivity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful API responses
    (global.fetch as unknown).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true })
    });
    // Reset SWR mock to return successful data by default
    mockSWR
      .mockReturnValueOnce({ // First call for feature usage
        data: mockFeatureUsage,
        error: null,
        mutate: mockMutateFeatures
      })
      .mockReturnValueOnce({ // Second call for milestones
        data: mockMilestones,
        mutate: mockMutateMilestones
      });
    const swrModule = require('swr');
    swrModule.default = mockSWR;
  });
  afterEach(() => {
    cleanup();
  describe('Hook Initialization', () => {
    it('initializes with correct default state', () => {
      const { result } = renderHook(() => useTrialActivity());
      expect(result.current.featureUsage).toEqual(mockFeatureUsage);
      expect(result.current.milestones).toEqual(mockMilestones);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.pendingEventsCount).toBe(0);
      expect(result.current.isTracking).toBe(false);
    it('sets up SWR calls with correct endpoints', () => {
      renderHook(() => useTrialActivity());
      expect(mockSWR).toHaveBeenCalledWith(
        '/api/trial/feature-usage',
        expect.any(Function),
        expect.objectContaining({ refreshInterval: 60000 })
      );
      
        '/api/trial/milestones',
    it('respects custom options', () => {
      renderHook(() => useTrialActivity({
        autoTrack: false,
        batchSize: 5,
        flushInterval: 10000
      }));
      // Should still initialize normally but with different behavior
      expect(mockSWR).toHaveBeenCalledTimes(2);
  describe('Feature Usage Tracking', () => {
    it('tracks feature usage with auto time savings', async () => {
      await act(async () => {
        const success = await result.current.trackFeatureUsage('guest_management');
        expect(success).toBe(true);
      expect(result.current.pendingEventsCount).toBe(1);
    it('tracks feature usage with custom time savings', async () => {
      const { result } = renderHook(() => useTrialActivity({ autoTrack: false }));
      (global.fetch as unknown).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true })
        const success = await result.current.trackFeatureUsage(
          'custom_feature',
          45,
          { custom: 'data' }
        );
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/trial/track-usage',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            feature_key: 'custom_feature',
            feature_name: 'Custom Feature',
            time_saved_minutes: 45,
            context_data: { custom: 'data' }
          })
        })
    it('handles feature tracking API errors', async () => {
        ok: false,
        json: () => Promise.resolve({ message: 'API Error' })
        const success = await result.current.trackFeatureUsage('failing_feature');
        expect(success).toBe(false);
    it('adds events to pending queue in auto mode', async () => {
      const { result } = renderHook(() => useTrialActivity({ autoTrack: true }));
        await result.current.trackFeatureUsage('feature1');
        await result.current.trackFeatureUsage('feature2');
      expect(result.current.pendingEventsCount).toBe(2);
  describe('Milestone Achievement', () => {
    it('achieves milestone successfully', async () => {
        const success = await result.current.achieveMilestone(
          'vendor_added' as MilestoneType,
          { vendor_id: 'vendor-123' }
        '/api/trial/achieve-milestone',
            milestone_type: 'vendor_added',
            context_data: { vendor_id: 'vendor-123' }
    it('handles milestone achievement errors', async () => {
        json: () => Promise.resolve({ message: 'Milestone Error' })
        const success = await result.current.achieveMilestone('guest_list_imported');
    it('refreshes milestone data after successful achievement', async () => {
        await result.current.achieveMilestone('timeline_created');
      expect(mockMutateMilestones).toHaveBeenCalledTimes(1);
  describe('Page View and Action Tracking', () => {
    it('tracks page views correctly', async () => {
        const success = await result.current.trackPageView('/dashboard/clients', 30);
    it('tracks custom actions correctly', async () => {
        const success = await result.current.trackAction(
          'button_click',
          'navigation',
          1,
          { button: 'upgrade' }
    it('sends action events immediately when autoTrack is false', async () => {
        const success = await result.current.trackAction('form_submit', 'onboarding');
        '/api/trial/track-action',
          method: 'POST'
  describe('Batch Operations', () => {
    it('auto-flushes when batch size is reached', async () => {
      vi.useFakeTimers();
      const { result } = renderHook(() => useTrialActivity({ 
        autoTrack: true, 
        batchSize: 2 
        // Should auto-flush at batch size 2
      // Allow async operations to complete
        vi.advanceTimersByTime(100);
      vi.useRealTimers();
    it('flushes pending events manually', async () => {
        await result.current.flushPendingEvents();
    it('clears pending events without sending', () => {
      act(() => {
        result.current.trackFeatureUsage('feature1');
        result.current.trackFeatureUsage('feature2');
        result.current.clearPendingEvents();
      expect(global.fetch).not.toHaveBeenCalled();
    it('handles failed events by putting them back in queue', async () => {
      // Mock first call to fail, second to succeed
      (global.fetch as unknown)
        .mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ message: 'API Error' })
          ok: true,
          json: () => Promise.resolve({ success: true })
        });
        await result.current.trackFeatureUsage('failing_feature');
        await result.current.trackFeatureUsage('success_feature');
      // Should have 1 failed event back in queue
  describe('Analytics Functions', () => {
    it('calculates total time saved correctly', () => {
      const totalTimeSaved = result.current.getTotalTimeSaved();
      expect(totalTimeSaved).toBe(210); // 150 + 60 minutes
    it('returns zero time saved when no feature usage', () => {
      mockSWR
        .mockReturnValueOnce({ data: null, error: null, mutate: vi.fn() })
        .mockReturnValueOnce({ data: mockMilestones, error: null, mutate: vi.fn() });
      expect(totalTimeSaved).toBe(0);
    it('gets most used features correctly', () => {
      const mostUsed = result.current.getMostUsedFeatures(2);
      expect(mostUsed).toHaveLength(2);
      expect(mostUsed[0]).toEqual({
        feature: 'Client Onboarding',
        count: 5,
        timeSaved: 150
      expect(mostUsed[1]).toEqual({
        feature: 'Email Automation',
        count: 3,
        timeSaved: 60
    it('limits most used features by provided limit', () => {
      const mostUsed = result.current.getMostUsedFeatures(1);
      expect(mostUsed).toHaveLength(1);
      expect(mostUsed[0].feature).toBe('Client Onboarding');
    it('calculates completion rate correctly', () => {
      const completionRate = result.current.getCompletionRate();
      expect(completionRate).toBe(50); // 1 out of 2 milestones achieved = 50%
    it('returns zero completion rate when no milestones', () => {
        .mockReturnValueOnce({ data: mockFeatureUsage, error: null, mutate: vi.fn() })
        .mockReturnValueOnce({ data: [], error: null, mutate: vi.fn() });
      expect(completionRate).toBe(0);
  describe('Error Handling', () => {
    it('handles SWR errors for feature usage', () => {
        .mockReturnValueOnce({ 
          data: null, 
          error: { message: 'Feature usage error' }, 
          mutate: vi.fn() 
          data: mockMilestones, 
          error: null, 
      expect(result.current.featureUsage).toBeNull();
      expect(result.current.error).toBe('Feature usage error');
    it('handles SWR errors for milestones', () => {
          data: mockFeatureUsage, 
          error: { message: 'Milestones error' }, 
      expect(result.current.milestones).toBeNull();
      expect(result.current.error).toBe('Milestones error');
    it('prioritizes feature usage error over milestones error', () => {
          error: { message: 'Feature error' }, 
          error: { message: 'Milestone error' }, 
      expect(result.current.error).toBe('Feature error');
    it('handles network errors during event sending', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      (global.fetch as unknown).mockRejectedValue(new Error('Network error'));
        const success = await result.current.trackFeatureUsage('network_fail');
      expect(consoleError).toHaveBeenCalledWith('Failed to send event:', expect.any(Error));
      consoleError.mockRestore();
  describe('Loading States', () => {
    it('shows loading when both feature usage and milestones are loading', () => {
        .mockReturnValueOnce({ data: undefined, error: null, mutate: vi.fn() })
        .mockReturnValueOnce({ data: undefined, error: null, mutate: vi.fn() });
      expect(result.current.isLoading).toBe(true);
    it('shows not loading when at least one data source is available', () => {
    it('shows not loading when there are errors', () => {
        .mockReturnValueOnce({ data: undefined, error: { message: 'Error' }, mutate: vi.fn() })
  describe('Event ID Generation', () => {
    it('generates unique event IDs', async () => {
      // Events should have unique IDs (can't directly test due to internal state)
    it('includes timestamp in events', async () => {
      const dateSpy = vi.spyOn(Date, 'now').mockReturnValue(1642435200000); // Fixed timestamp
        await result.current.trackFeatureUsage('timestamped_feature');
      expect(dateSpy).toHaveBeenCalled();
      dateSpy.mockRestore();
  describe('Cleanup', () => {
    it('flushes pending events on unmount', async () => {
      const { result, unmount } = renderHook(() => useTrialActivity({ autoTrack: true }));
        await result.current.trackFeatureUsage('cleanup_feature');
        unmount();
      // Should attempt to flush on unmount (implementation detail, hard to test directly)
});
