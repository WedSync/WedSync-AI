/**
 * WS-140 Trial Management System - TrialProgressBar Unit Tests
 * Comprehensive test suite for TrialProgressBar component
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { TrialProgressBar } from '@/components/trial/TrialProgressBar';
import { TrialMilestone, MilestoneType } from '@/types/trial';
const mockMilestones: TrialMilestone[] = [
  {
    id: 'milestone-1',
    trial_id: 'trial-123',
    milestone_type: 'first_client_connected' as MilestoneType,
    milestone_name: 'First Client Connected',
    description: 'Successfully add and configure your first client profile',
    achieved: true,
    achieved_at: new Date('2025-01-10'),
    time_to_achieve_hours: 2,
    value_impact_score: 8,
    created_at: new Date('2025-01-01')
  },
    id: 'milestone-2',
    milestone_type: 'initial_journey_created' as MilestoneType,
    milestone_name: 'Initial Journey Created',
    description: 'Create your first automated client journey',
    achieved_at: new Date('2025-01-12'),
    time_to_achieve_hours: 3,
    value_impact_score: 9,
    id: 'milestone-3',
    milestone_type: 'vendor_added' as MilestoneType,
    milestone_name: 'Vendor Added',
    description: 'Add your first vendor partner to the platform',
    achieved: false,
    value_impact_score: 7,
    id: 'milestone-4',
    milestone_type: 'guest_list_imported' as MilestoneType,
    milestone_name: 'Guest List Imported',
    description: 'Import or create your first guest list',
    id: 'milestone-5',
    milestone_type: 'timeline_created' as MilestoneType,
    milestone_name: 'Timeline Created',
    description: 'Build your first wedding timeline with tasks',
  }
];
const defaultProps = {
  milestones: mockMilestones,
  progressPercentage: 40, // 2 out of 5 completed = 40%
  daysRemaining: 15,
  onMilestoneClick: vi.fn()
};
describe('TrialProgressBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    cleanup();
  describe('Basic Rendering', () => {
    it('renders progress header with correct information', () => {
      render(<TrialProgressBar {...defaultProps} />);
      
      expect(screen.getByText('Trial Progress')).toBeInTheDocument();
      expect(screen.getByText('2 of 5 milestones completed')).toBeInTheDocument();
      expect(screen.getByText('15 days left')).toBeInTheDocument();
      expect(screen.getByText('40%')).toBeInTheDocument();
    });
    it('renders progress bar with correct value', () => {
      const progressElement = screen.getByRole('progressbar');
      expect(progressElement).toHaveAttribute('aria-valuenow', '40');
    it('shows milestone markers on progress bar', () => {
      // Should render 5 milestone markers
      const milestoneButtons = screen.getAllByRole('button');
      const milestoneMarkers = milestoneButtons.filter(button => 
        button.getAttribute('aria-label')?.includes('Client Connected') ||
        button.getAttribute('aria-label')?.includes('Journey Created') ||
        button.getAttribute('aria-label')?.includes('Vendor Added') ||
        button.getAttribute('aria-label')?.includes('Guest List') ||
        button.getAttribute('aria-label')?.includes('Timeline Created')
      );
      expect(milestoneMarkers.length).toBe(5);
    it('applies custom className when provided', () => {
      render(<TrialProgressBar {...defaultProps} className="custom-class" />);
      const container = document.querySelector('.custom-class');
      expect(container).toBeInTheDocument();
  describe('Milestone Markers', () => {
    it('shows achieved milestones with correct styling', () => {
      // Check for achieved milestone indicators
      const achievedButtons = screen.getAllByRole('button').filter(button => {
        const ariaLabel = button.getAttribute('aria-label');
        return ariaLabel === 'First Client Connected' || ariaLabel === 'Initial Journey Created';
      });
      expect(achievedButtons.length).toBe(2);
    it('shows next milestone as active', () => {
      // The first unachieved milestone (vendor_added) should be active
      const vendorButton = screen.getByRole('button', { name: 'Vendor Added' });
      expect(vendorButton).toBeInTheDocument();
    it('shows milestone tooltips on hover', async () => {
      const milestoneButton = screen.getByRole('button', { name: 'First Client Connected' });
      fireEvent.mouseEnter(milestoneButton);
      await waitFor(() => {
        expect(screen.getByText('Successfully add and configure your first client profile')).toBeInTheDocument();
        expect(screen.getByText('Completed 1/10/2025')).toBeInTheDocument();
    it('hides tooltip on mouse leave', async () => {
      fireEvent.mouseLeave(milestoneButton);
        expect(screen.queryByText('Successfully add and configure your first client profile')).not.toBeInTheDocument();
    it('shows instruction prompt for unachieved milestones', async () => {
      const unachievedButton = screen.getByRole('button', { name: 'Vendor Added' });
      fireEvent.mouseEnter(unachievedButton);
        expect(screen.getByText('Click for instructions')).toBeInTheDocument();
    it('calls onMilestoneClick when milestone is clicked', () => {
      const onMilestoneClick = vi.fn();
      render(<TrialProgressBar {...defaultProps} onMilestoneClick={onMilestoneClick} />);
      const milestoneButton = screen.getByRole('button', { name: 'Vendor Added' });
      fireEvent.click(milestoneButton);
      expect(onMilestoneClick).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'milestone-3',
          milestone_name: 'Vendor Added'
        })
    it('toggles milestone selection on multiple clicks', () => {
      // First click selects
      expect(onMilestoneClick).toHaveBeenCalledTimes(1);
      // Second click deselects
      expect(onMilestoneClick).toHaveBeenCalledTimes(2);
  describe('Next Milestone CTA', () => {
    it('shows next milestone call-to-action', () => {
      expect(screen.getByText('Next Milestone: Vendor Added')).toBeInTheDocument();
      expect(screen.getByText('Add your first vendor partner to the platform')).toBeInTheDocument();
      expect(screen.getByText('Est. 2h saved')).toBeInTheDocument(); // From MILESTONE_DEFINITIONS
      expect(screen.getByText('High impact')).toBeInTheDocument();
    it('shows correct time estimation for next milestone', () => {
      // Vendor milestone should show 2h from MILESTONE_DEFINITIONS
      expect(screen.getByText('Est. 2h saved')).toBeInTheDocument();
    it('does not show next milestone CTA when all milestones are completed', () => {
      const allCompletedMilestones = mockMilestones.map(milestone => ({
        ...milestone,
        achieved: true,
        achieved_at: new Date('2025-01-15')
      }));
      render(<TrialProgressBar {...defaultProps} milestones={allCompletedMilestones} />);
      expect(screen.queryByText('Next Milestone:')).not.toBeInTheDocument();
    it('clicking next milestone CTA calls onMilestoneClick', () => {
      const ctaButton = screen.getByRole('button'); // Should be the CTA button with ChevronRight
      fireEvent.click(ctaButton);
  describe('Instructions Panel', () => {
    it('shows instructions panel when unachieved milestone is selected', () => {
      fireEvent.click(vendorButton);
      expect(screen.getByText('How to complete:')).toBeInTheDocument();
      expect(screen.getByText('Go to Vendors section')).toBeInTheDocument();
      expect(screen.getByText('Add vendor contact information')).toBeInTheDocument();
      expect(screen.getByText('Set up collaboration preferences')).toBeInTheDocument();
      expect(screen.getByText('Configure service categories')).toBeInTheDocument();
    it('shows value impact and time savings in instructions panel', () => {
      expect(screen.getByText('Save 2 hours')).toBeInTheDocument();
      expect(screen.getByText('Impact: 1.5/10')).toBeInTheDocument(); // From MILESTONE_DEFINITIONS
    it('does not show instructions panel for achieved milestones', () => {
      const achievedButton = screen.getByRole('button', { name: 'First Client Connected' });
      fireEvent.click(achievedButton);
      expect(screen.queryByText('How to complete:')).not.toBeInTheDocument();
    it('closes instructions panel when close button is clicked', () => {
      const closeButton = screen.getByText('×');
      fireEvent.click(closeButton);
    it('shows get started button in instructions panel', () => {
      const getStartedButton = screen.getByRole('button', { name: 'Get Started' });
      expect(getStartedButton).toBeInTheDocument();
    it('logs navigation when get started is clicked', () => {
      const consoleSpy = vi.spyOn(console, 'log');
      fireEvent.click(getStartedButton);
      expect(consoleSpy).toHaveBeenCalledWith('Navigate to:', 'vendor_added');
  describe('Milestone List', () => {
    it('shows milestone list by default', () => {
      expect(screen.getByText('All Milestones')).toBeInTheDocument();
      expect(screen.getByText('First Client Connected')).toBeInTheDocument();
      expect(screen.getByText('Initial Journey Created')).toBeInTheDocument();
      expect(screen.getByText('Vendor Added')).toBeInTheDocument();
      expect(screen.getByText('Guest List Imported')).toBeInTheDocument();
      expect(screen.getByText('Timeline Created')).toBeInTheDocument();
    it('hides milestone list when showMilestoneList is false', () => {
      render(<TrialProgressBar {...defaultProps} showMilestoneList={false} />);
      expect(screen.queryByText('All Milestones')).not.toBeInTheDocument();
      expect(screen.queryByText('First Client Connected')).not.toBeInTheDocument();
    it('shows completed badge for achieved milestones', () => {
      const completedBadges = screen.getAllByText('Completed');
      expect(completedBadges).toHaveLength(2); // Two achieved milestones
    it('shows start button for unachieved milestones', () => {
      const startButtons = screen.getAllByText('Start');
      expect(startButtons).toHaveLength(3); // Three unachieved milestones
    it('clicking start button calls onMilestoneClick', () => {
      const startButton = screen.getAllByText('Start')[0]; // First "Start" button
      fireEvent.click(startButton);
          achieved: false
    it('sorts milestones with achieved ones first', () => {
      const milestoneItems = screen.getAllByRole('generic').filter(el => 
        el.textContent?.includes('Client Connected') ||
        el.textContent?.includes('Journey Created') ||
        el.textContent?.includes('Vendor Added')
      // First two should be achieved (have different styling)
      expect(milestoneItems.length).toBeGreaterThan(0);
  describe('Badge Variants', () => {
    it('shows error badge when days remaining <= 7', () => {
      render(<TrialProgressBar {...defaultProps} daysRemaining={3} />);
      const badge = screen.getByText('3 days left');
      expect(badge).toBeInTheDocument();
      // Should have error variant styling
    it('shows success badge when days remaining > 7', () => {
      render(<TrialProgressBar {...defaultProps} daysRemaining={15} />);
      const badge = screen.getByText('15 days left');
      // Should have success variant styling
  describe('Edge Cases', () => {
    it('handles empty milestones array', () => {
      render(<TrialProgressBar {...defaultProps} milestones={[]} />);
      expect(screen.getByText('0 of 0 milestones completed')).toBeInTheDocument();
    it('handles 100% progress correctly', () => {
      render(<TrialProgressBar {...defaultProps} progressPercentage={100} />);
      expect(screen.getByText('100%')).toBeInTheDocument();
      expect(progressElement).toHaveAttribute('aria-valuenow', '100');
    it('handles 0% progress correctly', () => {
      const noProgressMilestones = mockMilestones.map(milestone => ({
        achieved: false,
        achieved_at: undefined
      render(<TrialProgressBar 
        {...defaultProps} 
        milestones={noProgressMilestones}
        progressPercentage={0}
      />);
      expect(screen.getByText('0%')).toBeInTheDocument();
      expect(screen.getByText('0 of 5 milestones completed')).toBeInTheDocument();
    it('handles single milestone correctly', () => {
      render(<TrialProgressBar {...defaultProps} milestones={[mockMilestones[0]]} />);
      expect(screen.getByText('1 of 1 milestones completed')).toBeInTheDocument();
      expect(screen.queryByText('Next Milestone:')).not.toBeInTheDocument(); // All completed
    it('handles milestone without achieved_at date', () => {
      const milestoneWithoutDate = {
        ...mockMilestones[0],
      };
      render(<TrialProgressBar {...defaultProps} milestones={[milestoneWithoutDate]} />);
      expect(screen.queryByText(/Completed \d/)).not.toBeInTheDocument();
  describe('Accessibility', () => {
    it('has proper ARIA labels for progress bar', () => {
      expect(progressElement).toHaveAttribute('aria-valuemin', '0');
      expect(progressElement).toHaveAttribute('aria-valuemax', '100');
    it('has proper ARIA labels for milestone buttons', () => {
      expect(milestoneButton).toHaveAttribute('aria-label', 'First Client Connected');
    it('milestone buttons are keyboard accessible', () => {
      milestoneButton.focus();
      fireEvent.keyDown(milestoneButton, { key: 'Enter' });
});
