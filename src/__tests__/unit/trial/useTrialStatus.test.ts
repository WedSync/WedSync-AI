/**
 * WS-140 Trial Management System - useTrialStatus Hook Unit Tests
 * Comprehensive test suite for useTrialStatus custom hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, cleanup } from '@testing-library/react';
import { useTrialStatus } from '@/hooks/useTrialStatus';
import { TrialStatusResponse, TrialStatus } from '@/types/trial';
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
const mockTrialData: TrialStatusResponse = {
  success: true,
  trial: {
    id: 'trial-123',
    user_id: 'user-123',
    business_type: 'wedding_planner',
    business_goals: ['save_time', 'grow_business'],
    current_workflow_pain_points: ['manual_tasks', 'communication'],
    expected_time_savings_hours: 10,
    hourly_rate: 75,
    trial_start: new Date('2025-01-01'),
    trial_end: new Date('2025-01-31'),
    status: 'active' as TrialStatus,
    onboarding_completed: true,
    created_at: new Date('2025-01-01'),
    updated_at: new Date('2025-01-01')
  },
  progress: {
    trial_id: 'trial-123',
    days_remaining: 15,
    days_elapsed: 15,
    progress_percentage: 50,
    milestones_achieved: [
      {
        id: 'milestone-1',
        trial_id: 'trial-123',
        milestone_type: 'first_client_connected',
        milestone_name: 'First Client Connected',
        description: 'Successfully add your first client',
        achieved: true,
        achieved_at: new Date('2025-01-10'),
        time_to_achieve_hours: 2,
        value_impact_score: 8,
        created_at: new Date('2025-01-01')
      }
    ],
    milestones_remaining: [
        id: 'milestone-2',
        milestone_type: 'initial_journey_created',
        milestone_name: 'Initial Journey Created',
        description: 'Create your first automated journey',
        achieved: false,
        value_impact_score: 9,
    feature_usage_summary: [],
    roi_metrics: {
      trial_id: 'trial-123',
      total_time_saved_hours: 3.5,
      estimated_cost_savings: 262.5,
      productivity_improvement_percent: 25,
      features_adopted_count: 4,
      milestones_achieved_count: 1,
      workflow_efficiency_gain: 30,
      projected_monthly_savings: 500,
      roi_percentage: 125,
      calculated_at: new Date('2025-01-15')
    },
    conversion_recommendation: 'Strong candidate for conversion',
    urgency_score: 3
  recommendations: {
    next_actions: ['Create your first journey', 'Add a vendor partner'],
    upgrade_benefits: ['Unlimited clients', 'Advanced automation'],
    urgency_message: '15 days remaining to continue your progress'
  }
};
// Mock SWR implementation
const mockSWR = vi.fn();
const mockMutate = vi.fn();
describe('useTrialStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset SWR mock to return successful data by default
    mockSWR.mockReturnValue({
      data: mockTrialData,
      error: null,
      isLoading: false,
      mutate: mockMutate
    });
    const swrModule = require('swr');
    swrModule.default = mockSWR;
  });
  afterEach(() => {
    cleanup();
  describe('Basic Hook Behavior', () => {
    it('returns trial data when available', () => {
      const { result } = renderHook(() => useTrialStatus());
      expect(result.current.data).toEqual(mockTrialData);
      expect(result.current.progress).toEqual(mockTrialData.progress);
      expect(result.current.status).toBe('active');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    it('returns derived values correctly', () => {
      expect(result.current.daysRemaining).toBe(15);
      expect(result.current.progressPercentage).toBe(50);
      expect(result.current.urgencyScore).toBe(3);
      expect(result.current.isTrialActive).toBe(true);
      expect(result.current.isTrialExpired).toBe(false);
      expect(result.current.shouldShowUpgrade).toBe(true); // urgency 3 >= 3
    it('calls SWR with correct parameters', () => {
      renderHook(() => useTrialStatus());
      expect(mockSWR).toHaveBeenCalledWith(
        ['/api/trial/status', 0],
        expect.any(Function),
        expect.objectContaining({
          refreshInterval: 300000, // 5 minutes
          revalidateOnFocus: true,
          revalidateOnReconnect: true,
          errorRetryInterval: 30000,
          dedupingInterval: 10000
        })
      );
  describe('Loading States', () => {
    it('returns loading state when SWR is loading', () => {
      mockSWR.mockReturnValue({
        data: undefined,
        error: null,
        isLoading: true,
        mutate: mockMutate
      });
      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeNull();
    it('returns default values during loading', () => {
      expect(result.current.daysRemaining).toBe(0);
      expect(result.current.progressPercentage).toBe(0);
      expect(result.current.urgencyScore).toBe(1);
      expect(result.current.status).toBeNull();
      expect(result.current.progress).toBeNull();
  describe('Error States', () => {
    it('returns error when SWR has error', () => {
      const errorMessage = 'Failed to fetch trial status';
        data: null,
        error: new Error(errorMessage),
        isLoading: false,
      expect(result.current.error).toBe(errorMessage);
    it('handles error without message', () => {
      const error = {};
        error,
      expect(result.current.error).toBeNull(); // No message property
  describe('Hook Options', () => {
    it('respects enabled option when false', () => {
      renderHook(() => useTrialStatus({ enabled: false }));
        null, // Should be null when disabled
        expect.any(Object)
    it('uses custom refresh interval when provided', () => {
      renderHook(() => useTrialStatus({ refreshInterval: 60000 }));
        expect.any(Array),
          refreshInterval: 60000
    it('can disable realtime updates', () => {
      const { result } = renderHook(() => useTrialStatus({ realtimeUpdates: false }));
      // Should still return data but not set up realtime subscriptions
  describe('Trial Status Indicators', () => {
    it('identifies active trial correctly', () => {
    it('identifies expired trial by status', () => {
      const expiredTrialData = {
        ...mockTrialData,
        trial: { ...mockTrialData.trial, status: 'expired' as TrialStatus }
      };
        data: expiredTrialData,
      expect(result.current.isTrialActive).toBe(false);
      expect(result.current.isTrialExpired).toBe(true);
    it('identifies expired trial by days remaining', () => {
        progress: { ...mockTrialData.progress, days_remaining: 0 }
    it('determines upgrade prompts correctly for high urgency', () => {
      const urgentTrialData = {
        progress: { ...mockTrialData.progress, urgency_score: 4 }
        data: urgentTrialData,
      expect(result.current.shouldShowUpgrade).toBe(true);
      expect(result.current.urgencyScore).toBe(4);
    it('determines upgrade prompts correctly for low days remaining', () => {
      const lowDaysTrialData = {
        progress: { 
          ...mockTrialData.progress, 
          days_remaining: 5, 
          urgency_score: 2 
        }
        data: lowDaysTrialData,
      expect(result.current.shouldShowUpgrade).toBe(true); // 5 days <= 7
      expect(result.current.daysRemaining).toBe(5);
    it('does not show upgrade for low urgency and sufficient days', () => {
      const normalTrialData = {
          days_remaining: 20, 
          urgency_score: 1 
        data: normalTrialData,
      expect(result.current.shouldShowUpgrade).toBe(false);
  describe('Refresh Functionality', () => {
    it('provides refresh function that calls mutate', () => {
      expect(typeof result.current.refresh).toBe('function');
      result.current.refresh();
      expect(mockMutate).toHaveBeenCalledTimes(1);
    it('increments realtime updates counter when refresh is called', () => {
      // Call refresh multiple times
      // Should trigger SWR with different counter values
      expect(mockSWR).toHaveBeenCalledTimes(3); // Initial + 2 refreshes
  describe('Data Handling Edge Cases', () => {
    it('handles missing progress data', () => {
      const incompleteData = {
        progress: null
        data: incompleteData,
    it('handles missing trial data', () => {
        trial: null
      expect(result.current.isTrialExpired).toBe(true); // No status means expired
    it('handles completely null data', () => {
    it('handles undefined progress fields', () => {
      const incompleteProgress = {
        progress: {
          ...mockTrialData.progress,
          days_remaining: undefined,
          progress_percentage: undefined,
          urgency_score: undefined
        data: incompleteProgress,
  describe('SWR Configuration', () => {
    it('configures SWR with proper error handling', () => {
      const swrConfig = mockSWR.mock.calls[0][2];
      expect(swrConfig.errorRetryInterval).toBe(30000);
      expect(swrConfig.dedupingInterval).toBe(10000);
      expect(swrConfig.revalidateOnFocus).toBe(true);
      expect(swrConfig.revalidateOnReconnect).toBe(true);
    it('uses proper cache key with realtime updates', () => {
      // Call refresh to increment counter
      // Should have been called with incremented counter
      const lastCall = mockSWR.mock.calls[mockSWR.mock.calls.length - 1];
      expect(lastCall[0]).toEqual(['/api/trial/status', expect.any(Number)]);
  describe('Fetch Function', () => {
    it('creates proper fetch function for SWR', () => {
      const fetchFunction = mockSWR.mock.calls[0][1];
      expect(typeof fetchFunction).toBe('function');
      // Test that it extracts URL correctly from array
      const result = fetchFunction(['/api/trial/status', 0]);
      expect(global.fetch).toHaveBeenCalledWith('/api/trial/status');
    it('handles fetch errors properly', async () => {
      (global.fetch as unknown).mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ message: 'API Error' })
      
      await expect(fetchFunction(['/api/trial/status', 0])).rejects.toThrow('API Error');
    it('handles fetch network errors', async () => {
        json: () => Promise.resolve({})
      await expect(fetchFunction(['/api/trial/status', 0])).rejects.toThrow('Failed to fetch trial status');
});
