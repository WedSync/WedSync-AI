import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import '@testing-library/jest-dom';
import { RateLimitDashboard } from '../RateLimitDashboard';
import { RateLimitMetrics, RateLimitStatus, SubscriptionTier } from '@/types/rate-limiting';

// Mock WebSocket
const mockWebSocket = {
  send: jest.fn(),
  close: jest.fn(),
  readyState: WebSocket.OPEN,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};
global.WebSocket = jest.fn(() => mockWebSocket) as any;
// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));
const mockMetrics: RateLimitMetrics = {
  totalRequests: 1250,
  requestsBlocked: 45,
  averageResponseTime: 150,
  peakRequestsPerMinute: 180,
  uniqueUsers: 89,
  topEndpoints: [
    { endpoint: '/api/weddings', count: 450, percentage: 36 },
    { endpoint: '/api/suppliers', count: 320, percentage: 26 },
    { endpoint: '/api/photos', count: 280, percentage: 22 }
  ],
  violationsByTier: [
    { tier: SubscriptionTier.FREE, count: 25, percentage: 56 },
    { tier: SubscriptionTier.STARTER, count: 15, percentage: 33 },
    { tier: SubscriptionTier.PROFESSIONAL, count: 5, percentage: 11 }
  weddingSeasonMultiplier: 1.5,
  currentStatus: RateLimitStatus.MODERATE
describe('RateLimitDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  afterEach(() => {
    jest.restoreAllMocks();
  it('renders dashboard with metrics correctly', () => {
    render(<RateLimitDashboard metrics={mockMetrics} />);
    
    expect(screen.getByText('Rate Limiting Dashboard')).toBeInTheDocument();
    expect(screen.getByText('1,250')).toBeInTheDocument(); // Total requests
    expect(screen.getByText('45')).toBeInTheDocument(); // Requests blocked
    expect(screen.getByText('150ms')).toBeInTheDocument(); // Avg response time
    expect(screen.getByText('89')).toBeInTheDocument(); // Unique users
  it('displays wedding season indicator when active', () => {
    const weddingSeasonMetrics = {
      ...mockMetrics,
      weddingSeasonMultiplier: 2.0
    };
    render(<RateLimitDashboard metrics={weddingSeasonMetrics} />);
    expect(screen.getByText(/Wedding Season Active/i)).toBeInTheDocument();
    expect(screen.getByText(/2\.0x multiplier/i)).toBeInTheDocument();
  it('shows correct status badge color for different statuses', () => {
    const { rerender } = render(
      <RateLimitDashboard 
        metrics={{...mockMetrics, currentStatus: RateLimitStatus.SAFE}} 
      />
    );
    expect(screen.getByText('SAFE')).toBeInTheDocument();
    rerender(
        metrics={{...mockMetrics, currentStatus: RateLimitStatus.HIGH}} 
    expect(screen.getByText('HIGH')).toBeInTheDocument();
  it('establishes WebSocket connection when realTimeUpdates is enabled', () => {
    render(<RateLimitDashboard metrics={mockMetrics} realTimeUpdates={true} />);
    expect(global.WebSocket).toHaveBeenCalledWith('ws://localhost:3000/ws/rate-limiting');
    expect(mockWebSocket.addEventListener).toHaveBeenCalledWith('message', expect.any(Function));
  it('handles refresh functionality', async () => {
    const mockOnRefresh = jest.fn();
    render(<RateLimitDashboard metrics={mockMetrics} onRefresh={mockOnRefresh} />);
    const refreshButton = screen.getByLabelText(/refresh/i);
    fireEvent.click(refreshButton);
    expect(mockOnRefresh).toHaveBeenCalled();
  it('displays top endpoints correctly', () => {
    expect(screen.getByText('/api/weddings')).toBeInTheDocument();
    expect(screen.getByText('/api/suppliers')).toBeInTheDocument();
    expect(screen.getByText('/api/photos')).toBeInTheDocument();
    expect(screen.getByText('36%')).toBeInTheDocument();
  it('shows violations by tier breakdown', () => {
    expect(screen.getByText('FREE')).toBeInTheDocument();
    expect(screen.getByText('STARTER')).toBeInTheDocument();
    expect(screen.getByText('PROFESSIONAL')).toBeInTheDocument();
  it('handles loading state correctly', () => {
    render(<RateLimitDashboard metrics={mockMetrics} isLoading={true} />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  it('handles error state correctly', () => {
    render(<RateLimitDashboard metrics={mockMetrics} error="Failed to load metrics" />);
    expect(screen.getByText(/failed to load metrics/i)).toBeInTheDocument();
  it('renders tab navigation correctly', () => {
    expect(screen.getByRole('tab', { name: /overview/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /endpoints/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /violations/i })).toBeInTheDocument();
  it('switches between tabs correctly', () => {
    const endpointsTab = screen.getByRole('tab', { name: /endpoints/i });
    fireEvent.click(endpointsTab);
    expect(endpointsTab).toHaveAttribute('aria-selected', 'true');
  it('displays wedding context alerts', () => {
    const weddingDayMetrics = {
      currentStatus: RateLimitStatus.HIGH,
    render(<RateLimitDashboard metrics={weddingDayMetrics} showWeddingContext={true} />);
    expect(screen.getByText(/peak wedding season/i)).toBeInTheDocument();
  it('is accessible with proper ARIA labels', () => {
    expect(screen.getByRole('main')).toHaveAttribute('aria-label', 'Rate limiting dashboard');
    expect(screen.getByRole('tablist')).toBeInTheDocument();
  it('handles keyboard navigation', () => {
    const firstTab = screen.getByRole('tab', { name: /overview/i });
    firstTab.focus();
    fireEvent.keyDown(firstTab, { key: 'ArrowRight' });
    const secondTab = screen.getByRole('tab', { name: /endpoints/i });
    expect(document.activeElement).toBe(secondTab);
  it('updates metrics in real-time via WebSocket', async () => {
    const messageHandler = mockWebSocket.addEventListener.mock.calls.find(
      call => call[0] === 'message'
    )[1];
    const newMetrics = {
      totalRequests: 1500,
      requestsBlocked: 60
    messageHandler({
      data: JSON.stringify(newMetrics)
    });
    await waitFor(() => {
      expect(screen.getByText('1,500')).toBeInTheDocument();
      expect(screen.getByText('60')).toBeInTheDocument();
  it('cleans up WebSocket connection on unmount', () => {
    const { unmount } = render(
      <RateLimitDashboard metrics={mockMetrics} realTimeUpdates={true} />
    unmount();
    expect(mockWebSocket.close).toHaveBeenCalled();
});
