/**
 * WS-165: Integration Health Dashboard Component Tests
 * Comprehensive unit tests for UI component with accessibility and interaction testing
 * Team C Integration Implementation
 */

import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { IntegrationHealthDashboard } from '../IntegrationHealthDashboard';
import { IntegrationHealthDashboard as HealthDashboardType, ServiceHealthStatus } from '@/lib/integrations/payment-calendar-orchestrator';
// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;
// Mock ShimmerButton component
jest.mock('@/components/magicui/shimmer-button', () => ({
  ShimmerButton: ({ children, onClick, className, ...props }: any) => (
    <button onClick={onClick} className={className} {...props}>
      {children}
    </button>
  )
}));
describe('IntegrationHealthDashboard', () => {
  const defaultProps = {
    weddingId: 'test-wedding-123',
    refreshInterval: 5000,
    className: 'test-dashboard'
  };
  const mockHealthyDashboard: HealthDashboardType = {
    overallHealth: 'healthy',
    services: [
      {
        serviceName: 'PaymentCalendarOrchestrator',
        status: 'healthy',
        lastCheck: new Date('2024-01-01T12:00:00Z'),
        responseTime: 150,
        errorRate: 0,
        uptime: 100,
        lastError: undefined
      },
        serviceName: 'NotificationService',
        responseTime: 200,
        uptime: 99.9,
        serviceName: 'BudgetIntegration',
        status: 'degraded',
        responseTime: 500,
        errorRate: 5,
        uptime: 95,
        lastError: 'Connection timeout'
      }
    ],
    recentSyncResults: [
        success: true,
        totalEvents: 5,
        newEvents: 2,
        updatedEvents: 3,
        errors: [],
        cashFlowImpact: {
          projectedBalance: 25000,
          riskLevel: 'low',
          recommendations: ['Continue monitoring expenses']
        },
        nextSyncAt: new Date('2024-01-01T13:00:00Z')
    performanceMetrics: {
      averageResponseTime: 283,
      successRate: 98.5,
      notificationDeliveryRate: 97.2,
      cashFlowAccuracy: 95.8
    },
    lastUpdated: new Date('2024-01-01T12:00:00Z')
  const mockUnhealthyDashboard: HealthDashboardType = {
    overallHealth: 'unhealthy',
        status: 'unhealthy',
        responseTime: 5000,
        errorRate: 50,
        uptime: 60,
        lastError: 'Database connection failed'
        success: false,
        totalEvents: 0,
        newEvents: 0,
        updatedEvents: 0,
        errors: [
          { service: 'Database', error: 'Connection timeout', severity: 'high' }
        ],
          projectedBalance: 0,
          riskLevel: 'critical',
          recommendations: ['Contact support immediately']
        nextSyncAt: new Date('2024-01-01T12:30:00Z')
      averageResponseTime: 2500,
      successRate: 45.2,
      notificationDeliveryRate: 30.5,
      cashFlowAccuracy: 60.0
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Default successful fetch response
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockHealthyDashboard
    });
  });
  afterEach(() => {
    jest.useRealTimers();
  describe('Initial Rendering', () => {
    it('should render loading state initially', () => {
      render(<IntegrationHealthDashboard {...defaultProps} />);
      
      expect(screen.getByText('Integration Health Dashboard')).toBeInTheDocument();
      // Check for loading skeleton
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    it('should apply custom className', () => {
      const { container } = render(<IntegrationHealthDashboard {...defaultProps} />);
      expect(container.firstChild).toHaveClass('test-dashboard');
    it('should fetch dashboard data on mount', async () => {
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/integrations/health-dashboard?weddingId=test-wedding-123'
        );
      });
  describe('Healthy State Rendering', () => {
    it('should display healthy dashboard correctly', async () => {
        expect(screen.getByText('Integration Health Dashboard')).toBeInTheDocument();
      // Check overall health status
      expect(screen.getByText('3/3 services healthy')).toBeInTheDocument();
      // Check performance metrics
      expect(screen.getByText('283ms')).toBeInTheDocument();
      expect(screen.getByText('99%')).toBeInTheDocument();
      expect(screen.getByText('97%')).toBeInTheDocument();
      expect(screen.getByText('96%')).toBeInTheDocument();
    it('should display service statuses with correct styling', async () => {
        expect(screen.getByText('Payment Calendar Orchestrator')).toBeInTheDocument();
      // Check healthy service styling
      const healthyService = screen.getByText('Healthy');
      expect(healthyService).toHaveClass('text-success-700');
      // Check degraded service
      const degradedService = screen.getByText('Degraded');
      expect(degradedService).toHaveClass('text-warning-700');
    it('should display recent sync results', async () => {
        expect(screen.getByText('Recent Sync Results')).toBeInTheDocument();
      expect(screen.getByText('Sync Completed')).toBeInTheDocument();
      expect(screen.getByText('5 events • 0 errors')).toBeInTheDocument();
  describe('Error State Rendering', () => {
    it('should display error state when fetch fails', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));
        expect(screen.getByText('Dashboard Error')).toBeInTheDocument();
      expect(screen.getByText('Network error')).toBeInTheDocument();
      expect(screen.getByText('Retry Loading')).toBeInTheDocument();
    it('should handle API error responses', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'API Error' })
      expect(screen.getByText('Failed to fetch dashboard data')).toBeInTheDocument();
    it('should allow retry after error', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockHealthyDashboard
        });
      const retryButton = screen.getByText('Retry Loading');
      fireEvent.click(retryButton);
      expect(mockFetch).toHaveBeenCalledTimes(2);
  describe('Unhealthy State Rendering', () => {
    it('should display unhealthy services with critical styling', async () => {
        ok: true,
        json: async () => mockUnhealthyDashboard
        expect(screen.getByText('Unhealthy')).toBeInTheDocument();
      const unhealthyStatus = screen.getByText('Unhealthy');
      expect(unhealthyStatus).toHaveClass('text-error-700');
      // Check error message display
      expect(screen.getByText('Database connection failed')).toBeInTheDocument();
    it('should display failed sync results', async () => {
        expect(screen.getByText('Sync Failed')).toBeInTheDocument();
      expect(screen.getByText('0 events • 1 errors')).toBeInTheDocument();
  describe('Auto-refresh Functionality', () => {
    it('should enable auto-refresh by default', async () => {
        expect(screen.getByText('Auto-refresh ON')).toBeInTheDocument();
      // Fast-forward time and check if refresh occurs
      act(() => {
        jest.advanceTimersByTime(5000);
        expect(mockFetch).toHaveBeenCalledTimes(2);
    it('should toggle auto-refresh when button clicked', async () => {
      const autoRefreshButton = screen.getByText('Auto-refresh ON');
      fireEvent.click(autoRefreshButton);
      expect(screen.getByText('Auto-refresh OFF')).toBeInTheDocument();
    it('should not auto-refresh when disabled', async () => {
      // Disable auto-refresh
      // Fast-forward time
        jest.advanceTimersByTime(10000);
      // Should only have made initial call
      expect(mockFetch).toHaveBeenCalledTimes(1);
  describe('Manual Refresh', () => {
    it('should refresh when manual refresh button is clicked', async () => {
        expect(screen.getByText('Refresh')).toBeInTheDocument();
      const refreshButton = screen.getByText('Refresh');
      fireEvent.click(refreshButton);
    it('should disable refresh button during loading', async () => {
      // Mock slow response
      mockFetch.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
        }), 1000))
      );
      expect(refreshButton).toBeDisabled();
  describe('Service Icons', () => {
    it('should display correct icons for different services', async () => {
      // Check that service cards have icons (SVG elements)
      const serviceCards = document.querySelectorAll('[data-testid="service-card"]');
      expect(serviceCards.length).toBeGreaterThan(0);
  describe('Performance Metrics Display', () => {
    it('should format performance metrics correctly', async () => {
      const customDashboard = {
        ...mockHealthyDashboard,
        performanceMetrics: {
          averageResponseTime: 1234.56,
          successRate: 98.7654,
          notificationDeliveryRate: 95.1234,
          cashFlowAccuracy: 89.9876
        }
      };
        json: async () => customDashboard
        // Should round response time to nearest integer
        expect(screen.getByText('1235ms')).toBeInTheDocument();
        
        // Should round percentages
        expect(screen.getByText('99%')).toBeInTheDocument();
        expect(screen.getByText('95%')).toBeInTheDocument();
        expect(screen.getByText('90%')).toBeInTheDocument();
  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', async () => {
      // Check that buttons have proper labels
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      expect(refreshButton).toBeInTheDocument();
      const autoRefreshButton = screen.getByRole('button', { name: /auto-refresh/i });
      expect(autoRefreshButton).toBeInTheDocument();
    it('should support keyboard navigation', async () => {
      // Should be focusable
      refreshButton.focus();
      expect(document.activeElement).toBe(refreshButton);
      // Should respond to Enter key
      fireEvent.keyDown(refreshButton, { key: 'Enter', code: 'Enter' });
      // Note: This test would need more setup to fully test keyboard interaction
  describe('Responsive Design', () => {
    it('should render properly on mobile viewports', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      // Check that grid layout adapts to mobile (this would need more specific testing)
      const performanceGrid = document.querySelector('.grid-cols-4');
      expect(performanceGrid).toBeInTheDocument();
  describe('Component Cleanup', () => {
    it('should clean up intervals on unmount', async () => {
      const { unmount } = render(<IntegrationHealthDashboard {...defaultProps} />);
      // Clear all timers before unmount to test cleanup
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      unmount();
      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
  describe('Error Boundary Handling', () => {
    it('should handle component errors gracefully', () => {
      // Mock console.error to avoid test noise
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      // Force a render error by providing invalid props
      const invalidProps = {
        ...defaultProps,
        weddingId: null as any
      expect(() => {
        render(<IntegrationHealthDashboard {...invalidProps} />);
      }).not.toThrow();
      consoleSpy.mockRestore();
  describe('Custom Refresh Intervals', () => {
    it('should respect custom refresh interval', async () => {
      const customInterval = 10000; // 10 seconds
      render(<IntegrationHealthDashboard 
        {...defaultProps} 
        refreshInterval={customInterval}
      />);
      // Fast-forward less than interval
      // Should not have refreshed yet
      // Fast-forward to interval
      // Should have refreshed now
});
