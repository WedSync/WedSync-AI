// WS-201 Team A - WebhookDashboard Tests
// Comprehensive testing for webhook dashboard components
// Location: /wedsync/src/components/webhooks/__tests__/WebhookDashboard.test.tsx

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WebhookDashboard } from '../WebhookDashboard';
import { WebhookEndpoint, DeliveryMetrics } from '@/types/webhooks';
// Mock fetch for API calls
global.fetch = jest.fn();
// Mock data
const mockEndpoints: WebhookEndpoint[] = [
  {
    id: 'endpoint-1',
    organizationId: 'org-1',
    url: 'https://example.com/webhook',
    secret: 'ws_test_secret_123',
    events: [
      { id: 'client.created', name: 'Client Created', category: 'client_management', description: 'New client created', frequency: 'medium', isActive: true }
    ],
    description: 'Test webhook endpoint',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    lastDeliveryAt: '2024-01-01T12:00:00Z',
    createdBy: 'user-1',
    successRate: 95,
    totalDeliveries: 100,
    failedDeliveries: 5,
    averageResponseTime: 250
  }
];
const mockMetrics: DeliveryMetrics[] = [
    endpointId: 'endpoint-1',
    averageResponseTime: 250,
    lastDelivery: '2024-01-01T12:00:00Z',
    status: 'healthy'
const mockDeliveries = [
    id: 'delivery-1',
    eventType: 'client.created',
    eventId: 'event-1',
    payload: { test: 'data' },
    status: 'success' as const,
    attempts: 1,
    maxAttempts: 3,
    responseCode: 200,
    responseTime: 250,
    deliveredAt: '2024-01-01T12:00:00Z',
    createdAt: '2024-01-01T12:00:00Z'
// Test utility to create QueryClient
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false }
});
// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = createTestQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};
// Mock successful API responses
const mockSuccessfulFetch = () => {
  (fetch as jest.Mock)
    .mockResolvedValueOnce({
      ok: true,
      json: async () => mockEndpoints
    })
      json: async () => mockMetrics
      json: async () => mockDeliveries
    });
describe('WebhookDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('Loading State', () => {
    it('shows loading state initially', () => {
      (fetch as jest.Mock).mockImplementation(() => new Promise(() => {})); // Never resolves
      
      render(
        <TestWrapper>
          <WebhookDashboard />
        </TestWrapper>
      );
      expect(screen.getByText('Webhook Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Manage real-time integrations with your photography CRM and booking systems')).toBeInTheDocument();
  describe('Error State', () => {
    it('shows error message when API fails', async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error('API Error'));
      await waitFor(() => {
        expect(screen.getByText('Error Loading Webhook Dashboard')).toBeInTheDocument();
      });
      expect(screen.getByText('Unable to load webhook data. Please check your connection and try again.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  describe('Successful Data Loading', () => {
    it('renders dashboard with webhook data', async () => {
      mockSuccessfulFetch();
        expect(screen.getByText('1')).toBeInTheDocument(); // Total endpoints
      // Check stats cards
      expect(screen.getByText('Total Endpoints')).toBeInTheDocument();
      expect(screen.getByText('Active Endpoints')).toBeInTheDocument();
      expect(screen.getByText('Success Rate')).toBeInTheDocument();
      expect(screen.getByText('Total Deliveries')).toBeInTheDocument();
    it('displays endpoint information correctly', async () => {
        expect(screen.getByText('https://example.com/webhook')).toBeInTheDocument();
      expect(screen.getByText('Test webhook endpoint')).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('healthy')).toBeInTheDocument();
  describe('User Interactions', () => {
    it('handles refresh button click', async () => {
        expect(screen.getByText('1')).toBeInTheDocument();
      // Click refresh button
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      fireEvent.click(refreshButton);
      // Should trigger additional API calls
      expect(fetch).toHaveBeenCalledTimes(6); // 3 initial + 3 refresh calls
    it('opens create webhook dialog', async () => {
      // Click Add Webhook button
      const addButton = screen.getByRole('button', { name: /add webhook/i });
      fireEvent.click(addButton);
      // Should switch to configuration tab
        expect(screen.getByText('Configuration')).toBeInTheDocument();
    it('switches between tabs', async () => {
      // Click on different tabs
      const deliveriesTab = screen.getByRole('tab', { name: /deliveries/i });
      fireEvent.click(deliveriesTab);
        expect(screen.getByText('Delivery Monitor')).toBeInTheDocument();
      const eventsTab = screen.getByRole('tab', { name: /events/i });
      fireEvent.click(eventsTab);
        expect(screen.getByText('Event Subscriptions')).toBeInTheDocument();
  describe('Empty State', () => {
    it('shows empty state when no endpoints exist', async () => {
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => []
        })
        });
        expect(screen.getByText('No webhook endpoints configured yet')).toBeInTheDocument();
      expect(screen.getByText('Create your first webhook to receive real-time notifications from your wedding platform')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create first webhook/i })).toBeInTheDocument();
  describe('Mobile Responsiveness', () => {
    it('renders correctly on mobile viewport', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
        expect(screen.getByText('Webhook Dashboard')).toBeInTheDocument();
      // Should still render all essential elements
      expect(screen.getByRole('button', { name: /add webhook/i })).toBeInTheDocument();
  describe('Real-time Updates', () => {
    it('updates data at specified intervals', async () => {
      jest.useFakeTimers();
          <WebhookDashboard refreshInterval={1000} />
      // Fast-forward time to trigger refresh
      jest.advanceTimersByTime(1000);
        expect(fetch).toHaveBeenCalledTimes(6); // Initial 3 + refresh 3
      jest.useRealTimers();
  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', async () => {
      // Check for proper heading structure
      expect(screen.getByRole('heading', { name: /webhook dashboard/i })).toBeInTheDocument();
      // Check for proper button labels
      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
      // Check for tab navigation
      expect(screen.getByRole('tab', { name: /overview/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /configuration/i })).toBeInTheDocument();
    it('supports keyboard navigation', async () => {
      // Test tab navigation
      const overviewTab = screen.getByRole('tab', { name: /overview/i });
      const configTab = screen.getByRole('tab', { name: /configuration/i });
      overviewTab.focus();
      expect(document.activeElement).toBe(overviewTab);
      // Simulate keyboard navigation
      fireEvent.keyDown(overviewTab, { key: 'ArrowRight' });
      expect(configTab).toHaveFocus();
  describe('Error Boundary', () => {
    it('handles component errors gracefully', () => {
      // Mock console.error to avoid noise in tests
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      // Force an error by passing invalid props
      const ThrowError = () => {
        throw new Error('Test error');
      };
          <ThrowError />
      // Component should handle error gracefully
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
describe('WebhookDashboard Integration', () => {
  it('integrates properly with routing', async () => {
    mockSuccessfulFetch();
    // Mock router
    const mockPush = jest.fn();
    jest.mock('next/navigation', () => ({
      useRouter: () => ({
        push: mockPush
      })
    }));
    render(
      <TestWrapper>
        <WebhookDashboard />
      </TestWrapper>
    );
    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument();
    // Test that component renders without router errors
    expect(screen.getByText('Webhook Dashboard')).toBeInTheDocument();
  it('handles API errors gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
      expect(screen.getByText('Error Loading Webhook Dashboard')).toBeInTheDocument();
    consoleSpy.mockRestore();
export {};
