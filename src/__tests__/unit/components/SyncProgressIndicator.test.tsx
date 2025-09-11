import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import { SyncProgressIndicator } from '@/components/offline/SyncProgressIndicator';
import { SyncProgress, WeddingProgressContext } from '@/lib/offline/progress-tracker';
import { SyncEventType, SyncPriority } from '@/lib/offline/background-sync';

// Mock the UI components
jest.mock('@/components/ui/progress', () => ({
  Progress: ({ value, className }: { value: number; className?: string }) => (
    <div data-testid="progress-bar" data-value={value} className={className}>
      Progress: {value}%
    </div>
  ),
}));
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, variant, size, disabled }: any) => (
    <button
      onClick={onClick}
      data-variant={variant}
      data-size={size}
      disabled={disabled}
      data-testid="button"
    >
      {children}
    </button>
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => (
    <div data-testid="card" className={className}>{children}</div>
  CardContent: ({ children }: any) => (
    <div data-testid="card-content">{children}</div>
jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant }: any) => (
    <span data-testid="badge" data-variant={variant}>{children}</span>
// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  ChevronDown: () => <div data-testid="chevron-down">▼</div>,
  ChevronUp: () => <div data-testid="chevron-up">▲</div>,
  Wifi: () => <div data-testid="wifi-icon">📶</div>,
  WifiOff: () => <div data-testid="wifi-off-icon">📵</div>,
  AlertTriangle: () => <div data-testid="alert-icon">⚠️</div>,
  Clock: () => <div data-testid="clock-icon">🕐</div>,
  CheckCircle: () => <div data-testid="check-icon">✅</div>,
  XCircle: () => <div data-testid="x-icon">❌</div>,
  Pause: () => <div data-testid="pause-icon">⏸️</div>,
  Play: () => <div data-testid="play-icon">▶️</div>,
  RotateCcw: () => <div data-testid="retry-icon">🔄</div>,
describe('SyncProgressIndicator', () => {
  const mockOnCancel = jest.fn();
  const mockOnRetry = jest.fn();
  const mockOnPause = jest.fn();
  const mockOnResume = jest.fn();
  const baseSyncProgress: SyncProgress = {
    operationId: 'test-op-1',
    type: 'CLIENT_DATA_SYNC' as any,
    status: 'in-progress',
    percentage: 45,
    userMessage: 'Syncing client information...',
    startedAt: Date.now() - 10000,
    estimatedTimeRemaining: 15000,
    contextIndicators: [],
  };
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('basic rendering', () => {
    it('should render sync progress with basic information', () => {
      render(
        <SyncProgressIndicator
          progress={baseSyncProgress}
          onCancel={mockOnCancel}
        />
      );
      expect(screen.getByTestId('progress-bar')).toHaveAttribute('data-value', '45');
      expect(screen.getByText('Syncing client information...')).toBeInTheDocument();
      expect(screen.getByText('45%')).toBeInTheDocument();
    });
    it('should render different progress states correctly', () => {
      const states = [
        { status: 'initializing', icon: 'clock-icon' },
        { status: 'in-progress', icon: 'wifi-icon' },
        { status: 'completed', icon: 'check-icon' },
        { status: 'failed', icon: 'x-icon' },
        { status: 'paused', icon: 'pause-icon' },
      ];
      states.forEach(({ status, icon }) => {
        const progress = { ...baseSyncProgress, status: status as any };
        const { rerender } = render(
          <SyncProgressIndicator
            progress={progress}
            onCancel={mockOnCancel}
          />
        );
        expect(screen.getByTestId(icon)).toBeInTheDocument();
        rerender(<div />); // Clear for next test
      });
    it('should display estimated time remaining', () => {
      expect(screen.getByText(/15 seconds remaining/)).toBeInTheDocument();
    it('should handle zero or negative time remaining', () => {
      const progressWithZeroTime = {
        ...baseSyncProgress,
        estimatedTimeRemaining: 0,
      };
          progress={progressWithZeroTime}
      expect(screen.getByText(/Almost done/)).toBeInTheDocument();
  describe('wedding context indicators', () => {
    it('should display event day indicator', () => {
      const weddingProgress: SyncProgress = {
        weddingContext: {
          weddingId: 'wedding-123',
          eventDate: Date.now(),
          isEventDay: true,
          coordinatorName: 'Sarah',
          guestImpact: false,
          vendorCritical: false,
        },
        contextIndicators: ['Event Day'],
          progress={weddingProgress}
      const eventDayBadge = screen.getByText('Event Day');
      expect(eventDayBadge).toBeInTheDocument();
      expect(eventDayBadge).toHaveAttribute('data-variant', 'destructive');
    it('should display guest impact indicator', () => {
      const progressWithGuestImpact: SyncProgress = {
          weddingId: 'wedding-456',
          eventDate: Date.now() + 86400000,
          isEventDay: false,
          coordinatorName: 'Mike',
          guestImpact: true,
        contextIndicators: ['Guest Impact'],
          progress={progressWithGuestImpact}
      const guestImpactBadge = screen.getByText('Guest Impact');
      expect(guestImpactBadge).toBeInTheDocument();
      expect(guestImpactBadge).toHaveAttribute('data-variant', 'default');
    it('should display vendor impact indicator', () => {
      const progressWithVendorImpact: SyncProgress = {
        contextIndicators: ['Vendor Impact'],
          progress={progressWithVendorImpact}
      expect(screen.getByText('Vendor Impact')).toBeInTheDocument();
    it('should display multiple context indicators', () => {
      const progressWithMultipleIndicators: SyncProgress = {
        contextIndicators: ['Event Day', 'Guest Impact', 'Vendor Impact'],
          progress={progressWithMultipleIndicators}
      expect(screen.getByText('Event Day')).toBeInTheDocument();
      expect(screen.getByText('Guest Impact')).toBeInTheDocument();
  describe('network impact information', () => {
    it('should display network impact details when expanded', async () => {
      const progressWithNetwork: SyncProgress = {
        networkImpact: {
          currentSpeed: 2.5,
          estimatedTimeRemaining: 20000,
          retryCount: 1,
          qualityLevel: 'fair',
          progress={progressWithNetwork}
          showDetails
      expect(screen.getByText(/Connection: 2\.5 Mbps/)).toBeInTheDocument();
      expect(screen.getByText(/Quality: fair/)).toBeInTheDocument();
      expect(screen.getByText(/Retries: 1/)).toBeInTheDocument();
    it('should show network quality warnings', () => {
      const progressWithPoorNetwork: SyncProgress = {
          currentSpeed: 0.5,
          estimatedTimeRemaining: 120000,
          retryCount: 3,
          qualityLevel: 'poor',
          progress={progressWithPoorNetwork}
      expect(screen.getByText(/Quality: poor/)).toBeInTheDocument();
      expect(screen.getByTestId('alert-icon')).toBeInTheDocument();
  describe('action buttons', () => {
    it('should render cancel button and handle clicks', () => {
      const cancelButton = screen.getByText('Cancel');
      expect(cancelButton).toBeInTheDocument();
      fireEvent.click(cancelButton);
      expect(mockOnCancel).toHaveBeenCalledWith('test-op-1');
    it('should render retry button for failed operations', () => {
      const failedProgress: SyncProgress = {
        status: 'failed',
        completionResult: {
          success: false,
          error: 'Network timeout',
          retryAvailable: true,
          progress={failedProgress}
          onRetry={mockOnRetry}
      const retryButton = screen.getByText('Retry');
      expect(retryButton).toBeInTheDocument();
      fireEvent.click(retryButton);
      expect(mockOnRetry).toHaveBeenCalledWith('test-op-1');
    it('should render pause/resume buttons', () => {
          onPause={mockOnPause}
          onResume={mockOnResume}
      const pauseButton = screen.getByTestId('pause-icon').closest('button');
      expect(pauseButton).toBeInTheDocument();
      fireEvent.click(pauseButton!);
      expect(mockOnPause).toHaveBeenCalledWith('test-op-1');
      // Test resume button for paused state
      const pausedProgress: SyncProgress = {
        status: 'paused',
          progress={pausedProgress}
      const resumeButton = screen.getByTestId('play-icon').closest('button');
      expect(resumeButton).toBeInTheDocument();
      fireEvent.click(resumeButton!);
      expect(mockOnResume).toHaveBeenCalledWith('test-op-1');
    it('should disable buttons when not actionable', () => {
      const completedProgress: SyncProgress = {
        status: 'completed',
        percentage: 100,
          progress={completedProgress}
      const buttons = screen.getAllByTestId('button');
      // Cancel and pause buttons should be disabled for completed operations
      expect(buttons.some(button => button.hasAttribute('disabled'))).toBe(true);
  describe('expandable details', () => {
    it('should expand and collapse details', async () => {
      const progressWithDetails: SyncProgress = {
          currentSpeed: 5.0,
          estimatedTimeRemaining: 10000,
          retryCount: 0,
          qualityLevel: 'good',
          progress={progressWithDetails}
      // Initially collapsed
      expect(screen.queryByText(/Connection: 5\.0 Mbps/)).not.toBeInTheDocument();
      // Find and click the expand button
      const expandButton = screen.getByTestId('chevron-down').closest('button');
      expect(expandButton).toBeInTheDocument();
      fireEvent.click(expandButton!);
      // Should show details
      await waitFor(() => {
        expect(screen.getByText(/Connection: 5\.0 Mbps/)).toBeInTheDocument();
      // Should show collapse button
      expect(screen.getByTestId('chevron-up')).toBeInTheDocument();
      // Click collapse
      const collapseButton = screen.getByTestId('chevron-up').closest('button');
      fireEvent.click(collapseButton!);
      // Details should be hidden
        expect(screen.queryByText(/Connection: 5\.0 Mbps/)).not.toBeInTheDocument();
    it('should show details by default when showDetails prop is true', () => {
          currentSpeed: 3.2,
          estimatedTimeRemaining: 8000,
          retryCount: 2,
      expect(screen.getByText(/Connection: 3\.2 Mbps/)).toBeInTheDocument();
  describe('completion results', () => {
    it('should display success completion result', () => {
      const successProgress: SyncProgress = {
          success: true,
          message: 'Successfully synced 15 items',
          syncedItems: 15,
          progress={successProgress}
      expect(screen.getByText('Successfully synced 15 items')).toBeInTheDocument();
      expect(screen.getByTestId('check-icon')).toBeInTheDocument();
    it('should display failure completion result', () => {
      const failureProgress: SyncProgress = {
          error: 'Network timeout after 3 retries',
          progress={failureProgress}
      expect(screen.getByText('Network timeout after 3 retries')).toBeInTheDocument();
      expect(screen.getByTestId('x-icon')).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    it('should not show retry button when retry is not available', () => {
      const noRetryProgress: SyncProgress = {
          error: 'Invalid authentication credentials',
          retryAvailable: false,
          progress={noRetryProgress}
      expect(screen.queryByText('Retry')).not.toBeInTheDocument();
  describe('progress bar styling', () => {
    it('should apply correct styling based on wedding context', () => {
      const eventDayProgress: SyncProgress = {
          progress={eventDayProgress}
      const progressBar = screen.getByTestId('progress-bar');
      expect(progressBar.className).toContain('bg-red-500'); // Event day styling
    it('should apply network quality styling', () => {
      const poorNetworkProgress: SyncProgress = {
          estimatedTimeRemaining: 60000,
          progress={poorNetworkProgress}
      expect(progressBar.className).toContain('bg-orange-500'); // Poor network styling
  describe('accessibility', () => {
    it('should have proper ARIA labels', () => {
      expect(progressBar.closest('[role="progressbar"]')).toBeInTheDocument();
      expect(cancelButton).toHaveAttribute('aria-label');
    it('should support keyboard navigation', () => {
      // Buttons should be focusable
      expect(cancelButton).toHaveAttribute('tabIndex', '0');
      expect(pauseButton).toHaveAttribute('tabIndex', '0');
  describe('error handling and edge cases', () => {
    it('should handle missing or invalid progress data', () => {
      const invalidProgress = {
        operationId: '',
        type: null as any,
        status: 'unknown' as any,
        percentage: -10,
        userMessage: '',
        startedAt: 0,
        estimatedTimeRemaining: -1000,
        contextIndicators: [],
      expect(() => {
        render(
            progress={invalidProgress}
      }).not.toThrow();
    it('should handle very large progress values', () => {
      const largeProgress: SyncProgress = {
        percentage: 150, // Over 100%
        estimatedTimeRemaining: 999999999, // Very large time
          progress={largeProgress}
      // Should cap at 100%
      expect(progressBar).toHaveAttribute('data-value', '100');
    it('should handle missing callback functions gracefully', () => {
          // No callback functions provided
      // Should render without errors
      expect(screen.getByTestId('progress-bar')).toBeInTheDocument();
    it('should handle rapid progress updates', () => {
      const { rerender } = render(
      // Rapidly update progress
      for (let i = 0; i < 100; i += 10) {
        const updatedProgress = { ...baseSyncProgress, percentage: i };
        rerender(
            progress={updatedProgress}
      }
      // Should handle all updates without errors
      const finalProgressBar = screen.getByTestId('progress-bar');
      expect(finalProgressBar).toHaveAttribute('data-value', '90');
});
