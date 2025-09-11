/**
 * WS-165: Integration Health Dashboard UI Integration Tests
 * Team C Integration Implementation
 * 
 * End-to-end integration tests for IntegrationHealthDashboard component
 * Tests API integration, real-time updates, and user interactions
 */

import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { IntegrationHealthDashboard } from '@/components/integrations/IntegrationHealthDashboard';
import { server } from '../../__mocks__/server';
import { rest } from 'msw';
// Mock fetch for API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;
// Mock dashboard data
const mockHealthyDashboard = {
  overallHealth: 'healthy',
  services: [
    {
      serviceName: 'PaymentCalendarOrchestrator',
      status: 'healthy',
      responseTime: 150,
      uptime: 99.9,
      lastCheck: new Date('2024-01-20T10:00:00Z')
    },
      serviceName: 'NotificationService',
      responseTime: 200,
      uptime: 99.8,
      serviceName: 'BudgetIntegration',
      responseTime: 180,
      uptime: 99.7,
      serviceName: 'CashFlowCalculator',
      responseTime: 220,
      uptime: 99.6,
      serviceName: 'VendorPaymentSync',
      responseTime: 300,
      uptime: 99.5,
    }
  ],
  performanceMetrics: {
    averageResponseTime: 210,
    successRate: 98.5,
    notificationDeliveryRate: 97.2,
    cashFlowAccuracy: 94.8
  },
  recentSyncResults: [
      success: true,
      totalEvents: 15,
      processedEvents: 15,
      errors: [],
      nextSyncAt: new Date('2024-01-20T11:00:00Z'),
      processingTime: 2340
      totalEvents: 8,
      processedEvents: 8,
      nextSyncAt: new Date('2024-01-20T10:30:00Z'),
      processingTime: 1890
      success: false,
      totalEvents: 12,
      processedEvents: 10,
      errors: ['Vendor timeout: Elite Catering', 'Rate limit exceeded: Dream Flowers'],
      nextSyncAt: new Date('2024-01-20T10:15:00Z'),
      processingTime: 5000
  ]
};
const mockDegradedDashboard = {
  ...mockHealthyDashboard,
  overallHealth: 'degraded',
    ...mockHealthyDashboard.services.slice(0, 3),
      status: 'degraded',
      responseTime: 1200,
      uptime: 95.4,
      status: 'unhealthy',
      responseTime: 8000,
      uptime: 87.2,
describe('Integration Health Dashboard UI Integration Tests', () => {
  const mockWeddingId = 'wedding-123';
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful API response by default
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockHealthyDashboard)
    });
    // Mock timers for auto-refresh testing
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-20T10:00:00Z'));
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  describe('Initial Load and API Integration', () => {
    it('should successfully load and display healthy dashboard data', async () => {
      // Arrange & Act
      render(<IntegrationHealthDashboard weddingId={mockWeddingId} />);
      // Assert - Loading state
      expect(screen.getByText(/Integration Health Dashboard/)).toBeInTheDocument();
      
      // Wait for API call and data display
      await waitFor(() => {
        expect(screen.getByText('Integration Health Dashboard')).toBeInTheDocument();
      });
      // Verify API was called with correct parameters
      expect(mockFetch).toHaveBeenCalledWith(
        `/api/integrations/health-dashboard?weddingId=${mockWeddingId}`
      );
      // Verify health status displayed
        expect(screen.getByText('5/5 services healthy')).toBeInTheDocument();
      // Verify performance metrics displayed
      expect(screen.getByText('210ms')).toBeInTheDocument(); // Average response time
      expect(screen.getByText('99%')).toBeInTheDocument(); // Success rate (rounded)
      expect(screen.getByText('97%')).toBeInTheDocument(); // Delivery rate
      expect(screen.getByText('95%')).toBeInTheDocument(); // Accuracy
    it('should handle API errors and display error state', async () => {
      // Arrange
      mockFetch.mockRejectedValue(new Error('API unavailable'));
      // Act
      // Assert
        expect(screen.getByText('Dashboard Error')).toBeInTheDocument();
        expect(screen.getByText('API unavailable')).toBeInTheDocument();
        expect(screen.getByText('Retry Loading')).toBeInTheDocument();
    it('should handle degraded service states correctly', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockDegradedDashboard)
        expect(screen.getByText('3/5 services healthy')).toBeInTheDocument();
      // Check for degraded service display
        expect(screen.getByText('Degraded')).toBeInTheDocument();
        expect(screen.getByText('Unhealthy')).toBeInTheDocument();
      // Verify degraded service details
      expect(screen.getByText('Response: 1200ms')).toBeInTheDocument(); // Degraded service
      expect(screen.getByText('Response: 8000ms')).toBeInTheDocument(); // Unhealthy service
  describe('Auto-refresh Functionality', () => {
    it('should auto-refresh dashboard data at specified intervals', async () => {
      const refreshInterval = 10000; // 10 seconds
      render(
        <IntegrationHealthDashboard 
          weddingId={mockWeddingId} 
          refreshInterval={refreshInterval}
        />
      // Wait for initial load
        expect(mockFetch).toHaveBeenCalledTimes(1);
      // Act - Advance timer to trigger auto-refresh
      act(() => {
        vi.advanceTimersByTime(refreshInterval);
      // Assert - Second API call should be made
        expect(mockFetch).toHaveBeenCalledTimes(2);
      // Advance timer again
        expect(mockFetch).toHaveBeenCalledTimes(3);
    it('should allow toggling auto-refresh on and off', async () => {
        expect(screen.getByText('Auto-refresh ON')).toBeInTheDocument();
      // Act - Toggle auto-refresh off
      const autoRefreshButton = screen.getByText('Auto-refresh ON');
      fireEvent.click(autoRefreshButton);
      // Assert - Button state changed
      expect(screen.getByText('Auto-refresh OFF')).toBeInTheDocument();
      // Verify no additional API calls after timer advance
      const initialCallCount = mockFetch.mock.calls.length;
        vi.advanceTimersByTime(30000);
        expect(mockFetch).toHaveBeenCalledTimes(initialCallCount);
    it('should handle manual refresh independently of auto-refresh', async () => {
      // Act - Click manual refresh
      const refreshButton = screen.getByText('Refresh');
      fireEvent.click(refreshButton);
      // Assert - Additional API call made
      // Verify refresh button shows loading state
      expect(screen.getByRole('button', { name: /Refresh/ })).toBeDisabled();
  describe('Service Status Display and Interactions', () => {
    it('should display all service statuses with correct styling', async () => {
      // Assert - Wait for services to load
        expect(screen.getByText('Payment Calendar Orchestrator')).toBeInTheDocument();
        expect(screen.getByText('Notification Service')).toBeInTheDocument();
        expect(screen.getByText('Budget Integration')).toBeInTheDocument();
        expect(screen.getByText('Cash Flow Calculator')).toBeInTheDocument();
        expect(screen.getByText('Vendor Payment Sync')).toBeInTheDocument();
      // Verify status badges
      const healthyBadges = screen.getAllByText('Healthy');
      expect(healthyBadges).toHaveLength(3);
      expect(screen.getByText('Degraded')).toBeInTheDocument();
      expect(screen.getByText('Unhealthy')).toBeInTheDocument();
      // Verify response times displayed
      expect(screen.getByText('Response: 1200ms')).toBeInTheDocument();
      expect(screen.getByText('Response: 8000ms')).toBeInTheDocument();
    it('should update service status in real-time when data changes', async () => {
      // Arrange - Start with healthy dashboard
      // Act - Mock API returning degraded state
      // Trigger manual refresh
      // Assert - Status should update
  describe('Recent Sync Results Display', () => {
    it('should display recent sync results with success/failure indicators', async () => {
      // Assert - Wait for sync results to appear
        expect(screen.getByText('Recent Sync Results')).toBeInTheDocument();
      // Check successful syncs
      expect(screen.getAllByText('Sync Completed')).toHaveLength(2);
      expect(screen.getByText('Sync Failed')).toBeInTheDocument();
      // Check sync details
      expect(screen.getByText('15 events • 0 errors')).toBeInTheDocument();
      expect(screen.getByText('8 events • 0 errors')).toBeInTheDocument();
      expect(screen.getByText('12 events • 2 errors')).toBeInTheDocument();
    it('should handle empty sync results gracefully', async () => {
      const dashboardWithNoSyncs = {
        ...mockHealthyDashboard,
        recentSyncResults: []
      };
        json: () => Promise.resolve(dashboardWithNoSyncs)
      // Assert - Sync results section should not appear
      expect(screen.queryByText('Recent Sync Results')).not.toBeInTheDocument();
  describe('Performance Metrics Integration', () => {
    it('should display real-time performance metrics with proper formatting', async () => {
      // Assert - Performance metrics displayed
        expect(screen.getByText('Response Time')).toBeInTheDocument();
        expect(screen.getByText('Success Rate')).toBeInTheDocument();
        expect(screen.getByText('Delivery Rate')).toBeInTheDocument();
        expect(screen.getByText('Accuracy')).toBeInTheDocument();
      // Check metric values (rounded)
      expect(screen.getByText('210ms')).toBeInTheDocument();
      expect(screen.getByText('99%')).toBeInTheDocument(); // 98.5 rounded up
      expect(screen.getByText('97%')).toBeInTheDocument();
      expect(screen.getByText('95%')).toBeInTheDocument();
    it('should handle metric updates and animate changes', async () => {
      // Arrange - Start with initial metrics
        expect(screen.getByText('210ms')).toBeInTheDocument();
      // Act - Update with different metrics
      const updatedDashboard = {
        performanceMetrics: {
          averageResponseTime: 350,
          successRate: 95.2,
          notificationDeliveryRate: 89.8,
          cashFlowAccuracy: 91.4
        }
        json: () => Promise.resolve(updatedDashboard)
      fireEvent.click(screen.getByText('Refresh'));
      // Assert - Metrics should update
        expect(screen.getByText('350ms')).toBeInTheDocument();
        expect(screen.getByText('95%')).toBeInTheDocument();
        expect(screen.getByText('90%')).toBeInTheDocument();
        expect(screen.getByText('91%')).toBeInTheDocument();
  describe('Error Recovery and Retry Logic', () => {
    it('should provide retry functionality when dashboard loading fails', async () => {
      // Arrange - API fails initially
      mockFetch
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockHealthyDashboard)
        });
      // Assert - Error state displayed
        expect(screen.getByText('Network timeout')).toBeInTheDocument();
      // Act - Click retry
      fireEvent.click(screen.getByText('Retry Loading'));
      // Assert - Should succeed on retry
      expect(mockFetch).toHaveBeenCalledTimes(2);
    it('should handle intermittent API failures during auto-refresh', async () => {
      let callCount = 0;
      mockFetch.mockImplementation(() => {
        callCount++;
        if (callCount === 2) {
          return Promise.reject(new Error('Temporary failure'));
        return Promise.resolve({
      render(<IntegrationHealthDashboard weddingId={mockWeddingId} refreshInterval={5000} />);
      // Initial load should succeed
      // Trigger auto-refresh that will fail
        vi.advanceTimersByTime(5000);
      // Should continue showing last good data
      // Next auto-refresh should succeed
      expect(mockFetch).toHaveBeenCalledTimes(3);
  describe('Accessibility and User Experience', () => {
    it('should provide proper accessibility attributes and keyboard navigation', async () => {
      // Assert - Check for proper ARIA labels and roles
      expect(screen.getByRole('button', { name: /Auto-refresh/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Refresh/ })).toBeInTheDocument();
      // Check for proper headings structure
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Integration Health Dashboard');
      expect(screen.getByRole('heading', { level: 3, name: /Service Status/ })).toBeInTheDocument();
      // Verify keyboard navigation works
      const autoRefreshButton = screen.getByRole('button', { name: /Auto-refresh/ });
      autoRefreshButton.focus();
      expect(document.activeElement).toBe(autoRefreshButton);
      // Test keyboard interaction
      fireEvent.keyDown(autoRefreshButton, { key: 'Enter' });
    it('should provide screen reader friendly content and updates', async () => {
      // Assert - Check for screen reader content
      expect(screen.getByText(/Last updated/)).toBeInTheDocument();
      // Service status should be clearly labeled
      const serviceElements = screen.getAllByText(/Response:/);
      expect(serviceElements.length).toBeGreaterThan(0);
      // Status badges should have proper contrast and text
      healthyBadges.forEach(badge => {
        expect(badge).toHaveClass('text-success-700'); // Proper contrast
    it('should handle loading states with proper indicators', async () => {
      // Arrange - Slow API response
      let resolvePromise: (value: any) => void;
      const slowPromise = new Promise(resolve => {
        resolvePromise = resolve;
      mockFetch.mockReturnValue(slowPromise);
      // Assert - Loading skeleton should be visible
      expect(screen.getByText('Integration Health Dashboard')).toBeInTheDocument();
      // Check for loading animations
      const loadingElements = document.querySelectorAll('.animate-pulse');
      expect(loadingElements.length).toBeGreaterThan(0);
      // Resolve the promise
      resolvePromise!({
        json: () => Promise.resolve(mockHealthyDashboard)
  describe('Real-time Updates and WebSocket Integration', () => {
    it('should handle real-time status updates gracefully', async () => {
      // This test would typically involve WebSocket mocking
      // For now, we'll test the update mechanism through manual refresh
      // Simulate real-time update by changing mock data
        json: () => Promise.resolve({
          ...mockHealthyDashboard,
          services: [
            ...mockHealthyDashboard.services.slice(0, 4),
            {
              ...mockHealthyDashboard.services[4],
              status: 'degraded',
              responseTime: 1500
            }
          ]
        })
      // Act - Simulate real-time update (through refresh)
      // Assert - UI should update to reflect new status
        expect(screen.getByText('4/5 services healthy')).toBeInTheDocument();
});
