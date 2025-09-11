import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import { toast } from 'sonner';
import { useChurnIntelligence } from '../useChurnIntelligence';
import {
  ChurnRiskLevel,
  RetentionAction,
  AlertUrgency,
  CampaignStatus,
  RetentionCampaignType
} from '@/types/churn-intelligence';

// Mock sonner toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
  }
}));
// Mock WebSocket for real-time updates
const mockWebSocket = {
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  readyState: WebSocket.OPEN
};
Object.defineProperty(global, 'WebSocket', {
  value: jest.fn(() => mockWebSocket),
  writable: true
});
describe('useChurnIntelligence', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    
    // Mock localStorage
    const localStorageMock = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    };
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true
    });
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  describe('Initial State', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useChurnIntelligence({}));
      expect(result.current.atRiskSuppliers).toEqual([]);
      expect(result.current.churnMetrics).toBeNull();
      expect(result.current.retentionCampaigns).toEqual([]);
      expect(result.current.churnTrends).toEqual([]);
      expect(result.current.activeAlerts).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    it('should initialize with provided filters', () => {
      const initialFilters = {
        riskLevel: [ChurnRiskLevel.HIGH_RISK, ChurnRiskLevel.CRITICAL],
        supplierType: ['photographer', 'venue']
      };
      const { result } = renderHook(() => 
        useChurnIntelligence({ initialFilters })
      );
      expect(result.current.filters.riskLevel).toEqual(initialFilters.riskLevel);
      expect(result.current.filters.supplierType).toEqual(initialFilters.supplierType);
    it('should load data on mount', async () => {
      expect(result.current.isLoading).toBe(true);
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(result.current.atRiskSuppliers.length).toBeGreaterThan(0);
      expect(result.current.churnMetrics).not.toBeNull();
  describe('Data Loading', () => {
    it('should handle loading state correctly', async () => {
      act(() => {
        jest.advanceTimersByTime(1000);
    it('should refresh data when refreshData is called', async () => {
      // Wait for initial load
      const initialSupplierCount = result.current.atRiskSuppliers.length;
        result.current.refreshData();
      // Data should be refreshed (mock data generation might change)
      expect(result.current.lastUpdated).toBeInstanceOf(Date);
  describe('Auto Refresh', () => {
    it('should auto refresh when enabled', async () => {
        useChurnIntelligence({ autoRefresh: true, refreshInterval: 1 })
      const initialUpdateTime = result.current.lastUpdated;
      // Fast forward 1 second (refresh interval)
        expect(result.current.lastUpdated.getTime()).toBeGreaterThan(
          initialUpdateTime.getTime()
        );
    it('should not auto refresh when disabled', async () => {
        useChurnIntelligence({ autoRefresh: false })
      // Fast forward time
        jest.advanceTimersByTime(10000);
      // Should not have refreshed
      expect(result.current.lastUpdated).toBe(initialUpdateTime);
  describe('Filtering', () => {
    it('should filter suppliers by risk level', async () => {
        result.current.updateFilters({
          riskLevel: [ChurnRiskLevel.CRITICAL]
        });
      result.current.atRiskSuppliers.forEach(supplier => {
        expect(supplier.churnRiskLevel).toBe(ChurnRiskLevel.CRITICAL);
    it('should filter suppliers by supplier type', async () => {
          supplierType: ['photographer']
        expect(supplier.supplierType).toBe('photographer');
    it('should filter suppliers by search term', async () => {
          search: 'photo'
        expect(
          supplier.supplierName.toLowerCase().includes('photo') ||
          supplier.supplierType.toLowerCase().includes('photo')
        ).toBe(true);
    it('should clear filters', async () => {
      // Apply filters
          riskLevel: [ChurnRiskLevel.CRITICAL],
          search: 'test'
      // Clear filters
        result.current.clearFilters();
      expect(result.current.filters.riskLevel).toBeUndefined();
      expect(result.current.filters.search).toBeUndefined();
  describe('Retention Actions', () => {
    it('should execute retention action successfully', async () => {
      const supplierId = 'test-supplier-1';
      const action = RetentionAction.SEND_EMAIL;
      let actionResult: any;
      await act(async () => {
        actionResult = await result.current.executeRetentionAction(supplierId, action);
      expect(actionResult.success).toBe(true);
      expect(actionResult.action).toBe(action);
      expect(toast.success).toHaveBeenCalledWith('Retention action executed successfully');
    it('should handle retention action failure', async () => {
      // Simulate failure by using invalid supplier ID
      const supplierId = 'invalid-supplier';
      expect(actionResult.success).toBe(false);
      expect(toast.error).toHaveBeenCalled();
  describe('Campaign Management', () => {
    it('should create retention campaign successfully', async () => {
      const campaignData = {
        name: 'Test Campaign',
        campaignType: RetentionCampaignType.RE_ENGAGEMENT,
        targetRiskLevel: [ChurnRiskLevel.HIGH_RISK],
        targetSupplierTypes: ['photographer'],
        campaignContent: {
          emailTemplate: 'Test template'
        },
        executionSettings: {
          startDate: new Date(),
          autoExecute: false,
          frequency: 'once' as const
        }
      let campaign: any;
        campaign = await result.current.createCampaign(campaignData);
      expect(campaign.name).toBe(campaignData.name);
      expect(campaign.campaignType).toBe(campaignData.campaignType);
      expect(toast.success).toHaveBeenCalledWith('Retention campaign created successfully');
      // Campaign should appear in the list
      expect(result.current.retentionCampaigns).toContainEqual(
        expect.objectContaining({ name: campaignData.name })
    it('should pause campaign', async () => {
      // Create a campaign first
        name: 'Test Pause Campaign',
        campaignContent: {},
      // Pause the campaign
        await result.current.pauseCampaign(campaign.id);
      const updatedCampaign = result.current.retentionCampaigns.find(
        c => c.id === campaign.id
      expect(updatedCampaign?.status).toBe(CampaignStatus.PAUSED);
      expect(toast.info).toHaveBeenCalledWith('Campaign paused');
  describe('Alert Management', () => {
    it('should dismiss alert', async () => {
      // Generate some alerts first
        expect(result.current.activeAlerts.length).toBeGreaterThan(0);
      const alertId = result.current.activeAlerts[0].id;
        result.current.dismissAlert(alertId);
      expect(
        result.current.activeAlerts.find(a => a.id === alertId)?.isDismissed
      ).toBe(true);
    it('should acknowledge alert', async () => {
      // Generate alerts
        result.current.acknowledgeAlert(alertId);
      const alert = result.current.activeAlerts.find(a => a.id === alertId);
      expect(alert?.acknowledgedAt).toBeInstanceOf(Date);
      expect(alert?.isRead).toBe(true);
  describe('Real-time Updates', () => {
    it('should establish WebSocket connection when realTimeUpdates is true', () => {
      renderHook(() => 
        useChurnIntelligence({ realTimeUpdates: true })
      expect(global.WebSocket).toHaveBeenCalledWith(
        expect.stringContaining('churn-intelligence')
    it('should handle WebSocket connection states', () => {
      expect(result.current.connectionStatus).toBe('connected');
    it('should not create WebSocket when realTimeUpdates is false', () => {
      jest.clearAllMocks();
      
        useChurnIntelligence({ realTimeUpdates: false })
      expect(global.WebSocket).not.toHaveBeenCalled();
  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      // Mock fetch to throw an error
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
      expect(result.current.error).toBe('Failed to load churn intelligence data');
      expect(toast.error).toHaveBeenCalledWith('Failed to load data');
      // Restore fetch
      global.fetch = originalFetch;
    it('should retry failed requests', async () => {
      const mockFetch = jest.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ data: [] })
      global.fetch = mockFetch;
      // First call should fail, second should succeed
        expect(mockFetch).toHaveBeenCalledTimes(2);
  describe('Data Persistence', () => {
    it('should save filters to localStorage', async () => {
      const mockSetItem = jest.spyOn(Storage.prototype, 'setItem');
      const filters = {
        riskLevel: [ChurnRiskLevel.CRITICAL],
        supplierType: ['photographer']
        result.current.updateFilters(filters);
      expect(mockSetItem).toHaveBeenCalledWith(
        'churnIntelligence_filters',
        JSON.stringify(filters)
    it('should load filters from localStorage', () => {
      const savedFilters = {
        riskLevel: [ChurnRiskLevel.HIGH_RISK],
        search: 'saved search'
      jest.spyOn(Storage.prototype, 'getItem').mockReturnValue(
        JSON.stringify(savedFilters)
      expect(result.current.filters).toEqual(
        expect.objectContaining(savedFilters)
  describe('Performance', () => {
    it('should debounce filter updates', async () => {
      // Apply filters multiple times quickly
        result.current.updateFilters({ search: 'a' });
        result.current.updateFilters({ search: 'ab' });
        result.current.updateFilters({ search: 'abc' });
      // Should only apply the last filter
      expect(result.current.filters.search).toBe('abc');
    it('should memoize expensive calculations', async () => {
      const { result, rerender } = renderHook(() => useChurnIntelligence({}));
      const initialMetrics = result.current.churnMetrics;
      // Rerender without changing data
      rerender();
      // Metrics should be the same reference (memoized)
      expect(result.current.churnMetrics).toBe(initialMetrics);
  describe('Cleanup', () => {
    it('should cleanup timers and subscriptions on unmount', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      const { unmount } = renderHook(() => 
        useChurnIntelligence({ 
          autoRefresh: true,
          realTimeUpdates: true 
        })
      unmount();
      expect(clearIntervalSpy).toHaveBeenCalled();
      expect(mockWebSocket.close).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
      clearTimeoutSpy.mockRestore();
    it('should cleanup localStorage on unmount if needed', () => {
      const mockRemoveItem = jest.spyOn(Storage.prototype, 'removeItem');
      const { unmount } = renderHook(() => useChurnIntelligence({}));
      // Should not remove items by default
      expect(mockRemoveItem).not.toHaveBeenCalled();
  describe('Edge Cases', () => {
    it('should handle empty data responses', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          atRiskSuppliers: [],
          churnMetrics: null,
          retentionCampaigns: [],
          churnTrends: [],
          alerts: []
    it('should handle malformed data gracefully', async () => {
        json: () => Promise.resolve({ invalid: 'data' })
    it('should handle concurrent action executions', async () => {
      const supplierId = 'test-supplier';
      // Execute multiple actions concurrently
      const promises = [
        result.current.executeRetentionAction(supplierId, RetentionAction.SEND_EMAIL),
        result.current.executeRetentionAction(supplierId, RetentionAction.SCHEDULE_CALL),
        result.current.executeRetentionAction(supplierId, RetentionAction.ASSIGN_CSM)
      ];
      const results = await Promise.all(promises);
      // All should succeed independently
      results.forEach(result => {
        expect(result.success).toBe(true);
