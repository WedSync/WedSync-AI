/**
 * WS-140 Trial Management System - TrialBanner Unit Tests
 * Comprehensive test suite for TrialBanner component
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { TrialBanner } from '@/components/trial/TrialBanner';
import { TrialStatusResponse, TrialStatus } from '@/types/trial';
// Mock fetch globally
global.fetch = vi.fn();
// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });
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
    urgency_score: 2
  recommendations: {
    next_actions: ['Create your first journey', 'Add a vendor partner'],
    upgrade_benefits: ['Unlimited clients', 'Advanced automation'],
    urgency_message: '15 days remaining to continue your progress'
  }
const urgentTrialData: TrialStatusResponse = {
  ...mockTrialData,
    ...mockTrialData.progress,
    days_remaining: 3,
    urgency_score: 5
const expiredTrialData: TrialStatusResponse = {
    days_remaining: 0,
const defaultProps = {
  onUpgradeClick: vi.fn(),
  onDismiss: vi.fn(),
  dismissible: true,
  position: 'top' as const,
  variant: 'standard' as const
describe('TrialBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    
    // Mock successful API response
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockTrialData)
    });
  });
  afterEach(() => {
    cleanup();
  describe('Loading and API States', () => {
    it('does not render while loading', () => {
      render(<TrialBanner {...defaultProps} />);
      
      // Should not render anything while loading
      expect(screen.queryByText('Professional Trial')).not.toBeInTheDocument();
    it('does not render when trial data is unsuccessful', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: false })
      });
      await waitFor(() => {
        expect(screen.queryByText('Professional Trial')).not.toBeInTheDocument();
    it('does not render when trial is expired', async () => {
        json: () => Promise.resolve(expiredTrialData)
    it('does not render when API call fails', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network error'));
    it('makes correct API call on mount', () => {
      expect(global.fetch).toHaveBeenCalledWith('/api/trial/status');
  describe('Dismissal Functionality', () => {
    it('does not render when previously dismissed', async () => {
      localStorageMock.getItem.mockReturnValue('true');
      render(<TrialBanner {...defaultProps} dismissible={true} />);
    it('renders when not previously dismissed', async () => {
      localStorageMock.getItem.mockReturnValue(null);
        expect(screen.getByText('Professional Trial')).toBeInTheDocument();
    it('saves dismissal to localStorage when dismissed', async () => {
      const dismissButton = screen.getByRole('button', { name: '' }); // X button
      fireEvent.click(dismissButton);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('trialBannerDismissed', 'true');
    it('calls onDismiss callback when dismissed', async () => {
      const onDismiss = vi.fn();
      render(<TrialBanner {...defaultProps} onDismiss={onDismiss} />);
      const dismissButton = screen.getByRole('button', { name: '' });
      expect(onDismiss).toHaveBeenCalledTimes(1);
    it('does not render dismiss button when not dismissible', async () => {
      render(<TrialBanner {...defaultProps} dismissible={false} />);
      const dismissButtons = screen.queryAllByText('×');
      expect(dismissButtons).toHaveLength(0);
    it('ignores localStorage when not dismissible', async () => {
  describe('Minimal Variant', () => {
    it('renders minimal variant correctly', async () => {
      render(<TrialBanner {...defaultProps} variant="minimal" />);
        expect(screen.getByText('15 days left')).toBeInTheDocument();
        expect(screen.getByText('125% ROI achieved')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Upgrade' })).toBeInTheDocument();
    it('shows error badge for urgent trial in minimal variant', async () => {
        json: () => Promise.resolve(urgentTrialData)
        expect(screen.getByText('3 days left')).toBeInTheDocument();
    it('shows success badge for normal urgency in minimal variant', async () => {
    it('calls onUpgradeClick in minimal variant', async () => {
      const onUpgradeClick = vi.fn();
      render(<TrialBanner {...defaultProps} variant="minimal" onUpgradeClick={onUpgradeClick} />);
        const upgradeButton = screen.getByRole('button', { name: 'Upgrade' });
        fireEvent.click(upgradeButton);
        expect(onUpgradeClick).toHaveBeenCalledTimes(1);
  describe('Standard Variant', () => {
    it('renders standard variant correctly', async () => {
      render(<TrialBanner {...defaultProps} variant="standard" />);
        expect(screen.getByText('15 days remaining')).toBeInTheDocument();
        expect(screen.getByText("You're doing great! 50% through your trial with amazing results.")).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /upgrade & save/i })).toBeInTheDocument();
    it('shows mini countdown in standard variant', async () => {
        // Should show countdown in format like "15d 0h 0m"
        expect(screen.getByText(/\d+d/)).toBeInTheDocument();
        expect(screen.getByText(/\d+h/)).toBeInTheDocument();
        expect(screen.getByText(/\d+m/)).toBeInTheDocument();
    it('shows detailed information when showDetailedInfo is true', async () => {
      render(<TrialBanner {...defaultProps} variant="standard" showDetailedInfo={true} />);
        expect(screen.getByText('4h saved')).toBeInTheDocument(); // Rounded from 3.5
        expect(screen.getByText('1/2 milestones')).toBeInTheDocument();
        expect(screen.getByText('Special upgrade discount available')).toBeInTheDocument();
    it('calls onUpgradeClick in standard variant', async () => {
      render(<TrialBanner {...defaultProps} variant="standard" onUpgradeClick={onUpgradeClick} />);
        const upgradeButton = screen.getByRole('button', { name: /upgrade & save/i });
  describe('Urgent Variant', () => {
    it('automatically switches to urgent variant for high urgency', async () => {
        expect(screen.getByText('Trial Ending Soon!')).toBeInTheDocument();
        expect(screen.getByText("Don't lose your progress. Upgrade now to continue with all your data and settings.")).toBeInTheDocument();
    it('renders urgent variant with countdown timer', async () => {
      render(<TrialBanner {...defaultProps} variant="urgent" />);
        
        // Should show full countdown timer
        const countdownElements = screen.getAllByText(/\d+/);
        expect(countdownElements.length).toBeGreaterThan(4); // days, hours, minutes, seconds
        expect(screen.getByText('days')).toBeInTheDocument();
        expect(screen.getByText('hours')).toBeInTheDocument();
        expect(screen.getByText('min')).toBeInTheDocument();
        expect(screen.getByText('sec')).toBeInTheDocument();
    it('shows ROI metrics in urgent variant', async () => {
        expect(screen.getByText('$500/month savings')).toBeInTheDocument();
    it('has animated upgrade button in urgent variant', async () => {
        const upgradeButton = screen.getByRole('button', { name: /upgrade now/i });
        expect(upgradeButton).toHaveClass('animate-pulse');
    it('calls onUpgradeClick in urgent variant', async () => {
      render(<TrialBanner {...defaultProps} variant="urgent" onUpgradeClick={onUpgradeClick} />);
  describe('Countdown Timer', () => {
    it('updates countdown timer every second', async () => {
      vi.useFakeTimers();
      // Set trial end to be 1 day, 2 hours, 3 minutes, 4 seconds from now
      const futureDate = new Date(Date.now() + (24 * 60 * 60 * 1000) + (2 * 60 * 60 * 1000) + (3 * 60 * 1000) + (4 * 1000));
      const customTrialData = {
        ...urgentTrialData,
        trial: {
          ...urgentTrialData.trial,
          trial_end: futureDate
        }
      };
        json: () => Promise.resolve(customTrialData)
      // Fast forward time to trigger countdown update
      vi.advanceTimersByTime(1000);
        // Timer should be running and showing countdown
      vi.useRealTimers();
    it('shows zero countdown when trial is expired', async () => {
      const pastDate = new Date(Date.now() - 1000); // 1 second ago
      const expiredCustomData = {
          trial_end: pastDate
        },
        progress: {
          ...urgentTrialData.progress,
          days_remaining: 1 // Override to force rendering
        json: () => Promise.resolve(expiredCustomData)
      // Fast forward to trigger countdown calculation
        const countdownNumbers = screen.getAllByText('0');
        expect(countdownNumbers.length).toBeGreaterThan(2); // Should show 0 for multiple time units
  describe('Position and Layout', () => {
    it('applies top position classes by default', async () => {
      render(<TrialBanner {...defaultProps} position="top" />);
        const banner = screen.getByText('Professional Trial').closest('div[class*="fixed"]');
        expect(banner).toHaveClass('top-0', 'border-b');
    it('applies bottom position classes when specified', async () => {
      render(<TrialBanner {...defaultProps} position="bottom" />);
        expect(banner).toHaveClass('bottom-0', 'border-t');
    it('applies custom className when provided', async () => {
      render(<TrialBanner {...defaultProps} className="custom-banner-class" />);
        const banner = screen.getByText('Professional Trial').closest('div[class*="custom-banner-class"]');
        expect(banner).toBeInTheDocument();
  describe('Badge Variants', () => {
    it('shows warning badge for medium urgency', async () => {
      const mediumUrgencyData = {
        ...mockTrialData,
          ...mockTrialData.progress,
          days_remaining: 8,
          urgency_score: 3
        json: () => Promise.resolve(mediumUrgencyData)
        expect(screen.getByText('8 days remaining')).toBeInTheDocument();
    it('shows success badge for low urgency', async () => {
  describe('Accessibility', () => {
    it('has proper button labels', async () => {
        expect(upgradeButton).toBeInTheDocument();
    it('dismiss button is keyboard accessible', async () => {
        const dismissButton = screen.getByRole('button', { name: '' });
        expect(dismissButton).toBeInTheDocument();
        dismissButton.focus();
        fireEvent.keyDown(dismissButton, { key: 'Enter' });
        expect(localStorageMock.setItem).toHaveBeenCalledWith('trialBannerDismissed', 'true');
    it('upgrade button is keyboard accessible', async () => {
      render(<TrialBanner {...defaultProps} onUpgradeClick={onUpgradeClick} />);
        upgradeButton.focus();
        fireEvent.keyDown(upgradeButton, { key: 'Enter' });
  describe('Error Handling', () => {
    it('handles API errors gracefully without crashing', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      (global.fetch as any).mockRejectedValue(new Error('API Error'));
      // Should not crash the application
      expect(consoleError).not.toHaveBeenCalled();
      consoleError.mockRestore();
    it('handles malformed API response gracefully', async () => {
        json: () => Promise.resolve(null)
    it('handles missing trial data fields gracefully', async () => {
      const incompleteData = {
        success: true,
          days_remaining: 10
        json: () => Promise.resolve(incompleteData)
});
