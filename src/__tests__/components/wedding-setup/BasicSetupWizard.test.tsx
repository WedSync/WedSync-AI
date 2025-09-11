/**
 * @file BasicSetupWizard.test.tsx
 * @description Comprehensive tests for the BasicSetupWizard component (Team A)
 * @coverage Component rendering, step navigation, form validation, error handling, mobile responsiveness
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { BasicSetupWizard } from '@/components/wedding-setup/BasicSetupWizard';

// Mock dependencies
vi.mock('@/lib/supabase/client');
vi.mock('@/hooks/useWeddingSetup');

describe('BasicSetupWizard', () => {
  const mockOnComplete = vi.fn();
  const mockOnStepChange = vi.fn();

  const defaultProps = {
    onComplete: mockOnComplete,
    onStepChange: mockOnStepChange,
    initialStep: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial Rendering', () => {
    it('renders the setup wizard with welcome step', () => {
      render(<BasicSetupWizard {...defaultProps} />);

      expect(screen.getByText('Wedding Setup Wizard')).toBeInTheDocument();
      expect(
        screen.getByText("Welcome! Let's set up your wedding basics"),
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
    });

    it('displays correct step indicators', () => {
      render(<BasicSetupWizard {...defaultProps} />);

      const stepIndicators = screen.getAllByTestId('step-indicator');
      expect(stepIndicators).toHaveLength(4); // Welcome, Details, Venue, Review

      // First step should be active
      expect(stepIndicators[0]).toHaveClass('active');
      expect(stepIndicators[1]).not.toHaveClass('active');
    });

    it('renders with mobile responsive design', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<BasicSetupWizard {...defaultProps} />);

      const wizard = screen.getByTestId('setup-wizard');
      expect(wizard).toHaveClass('mobile-responsive');
    });
  });

  describe('Step Navigation', () => {
    it('navigates to next step when next button clicked', async () => {
      render(<BasicSetupWizard {...defaultProps} />);

      const nextButton = screen.getByRole('button', { name: /next/i });
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(mockOnStepChange).toHaveBeenCalledWith(2);
      });

      expect(screen.getByText('Wedding Details')).toBeInTheDocument();
    });

    it('navigates to previous step when back button clicked', async () => {
      render(<BasicSetupWizard {...defaultProps} initialStep={2} />);

      const backButton = screen.getByRole('button', { name: /back/i });
      fireEvent.click(backButton);

      await waitFor(() => {
        expect(mockOnStepChange).toHaveBeenCalledWith(1);
      });
    });

    it('prevents navigation to next step if current step is invalid', async () => {
      render(<BasicSetupWizard {...defaultProps} initialStep={2} />);

      // Don't fill required fields
      const nextButton = screen.getByRole('button', { name: /next/i });
      fireEvent.click(nextButton);

      // Should show validation errors and not navigate
      await waitFor(() => {
        expect(
          screen.getByText('Please fill in all required fields'),
        ).toBeInTheDocument();
      });

      expect(mockOnStepChange).not.toHaveBeenCalled();
    });

    it('allows skipping optional steps', async () => {
      render(<BasicSetupWizard {...defaultProps} initialStep={3} />);

      const skipButton = screen.getByRole('button', { name: /skip/i });
      fireEvent.click(skipButton);

      await waitFor(() => {
        expect(mockOnStepChange).toHaveBeenCalledWith(4);
      });
    });
  });

  describe('Form Validation', () => {
    it('validates required fields before navigation', async () => {
      render(<BasicSetupWizard {...defaultProps} initialStep={2} />);

      const nextButton = screen.getByRole('button', { name: /next/i });
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(
          screen.getByText('Couple names are required'),
        ).toBeInTheDocument();
        expect(
          screen.getByText('Wedding date is required'),
        ).toBeInTheDocument();
      });
    });

    it('validates wedding date is in the future', async () => {
      render(<BasicSetupWizard {...defaultProps} initialStep={2} />);

      const dateInput = screen.getByLabelText('Wedding Date');
      const pastDate = new Date('2020-01-01');

      fireEvent.change(dateInput, {
        target: { value: pastDate.toISOString().split('T')[0] },
      });

      const nextButton = screen.getByRole('button', { name: /next/i });
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(
          screen.getByText('Wedding date must be in the future'),
        ).toBeInTheDocument();
      });
    });

    it('validates email format', async () => {
      render(<BasicSetupWizard {...defaultProps} initialStep={2} />);

      const emailInput = screen.getByLabelText('Contact Email');
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });

      const nextButton = screen.getByRole('button', { name: /next/i });
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(
          screen.getByText('Please enter a valid email address'),
        ).toBeInTheDocument();
      });
    });
  });

  describe('Data Persistence', () => {
    it('saves step data automatically', async () => {
      const mockSaveProgress = vi.fn();
      vi.mocked(useWeddingSetup).mockReturnValue({
        saveProgress: mockSaveProgress,
        loading: false,
        error: null,
      });

      render(<BasicSetupWizard {...defaultProps} initialStep={2} />);

      const nameInput = screen.getByLabelText('Partner 1 Name');
      fireEvent.change(nameInput, { target: { value: 'John Doe' } });

      // Auto-save should trigger after debounce
      await waitFor(
        () => {
          expect(mockSaveProgress).toHaveBeenCalledWith({
            step: 2,
            data: { partner1Name: 'John Doe' },
          });
        },
        { timeout: 2000 },
      );
    });

    it('loads existing data on component mount', async () => {
      const mockLoadData = vi.fn().mockResolvedValue({
        step: 2,
        data: {
          partner1Name: 'John Doe',
          partner2Name: 'Jane Smith',
          weddingDate: '2025-06-15',
        },
      });

      vi.mocked(useWeddingSetup).mockReturnValue({
        loadData: mockLoadData,
        loading: false,
        error: null,
      });

      render(<BasicSetupWizard {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Jane Smith')).toBeInTheDocument();
        expect(screen.getByDisplayValue('2025-06-15')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('displays error message when save fails', async () => {
      const mockSaveProgress = vi
        .fn()
        .mockRejectedValue(new Error('Save failed'));
      vi.mocked(useWeddingSetup).mockReturnValue({
        saveProgress: mockSaveProgress,
        loading: false,
        error: 'Save failed',
      });

      render(<BasicSetupWizard {...defaultProps} />);

      await waitFor(() => {
        expect(
          screen.getByText('Failed to save progress. Please try again.'),
        ).toBeInTheDocument();
      });
    });

    it('allows retrying failed operations', async () => {
      const mockRetry = vi.fn();
      vi.mocked(useWeddingSetup).mockReturnValue({
        retry: mockRetry,
        loading: false,
        error: 'Network error',
      });

      render(<BasicSetupWizard {...defaultProps} />);

      const retryButton = screen.getByRole('button', { name: /retry/i });
      fireEvent.click(retryButton);

      expect(mockRetry).toHaveBeenCalled();
    });
  });

  describe('Completion Flow', () => {
    it('calls onComplete when wizard is finished', async () => {
      render(<BasicSetupWizard {...defaultProps} initialStep={4} />);

      const completeButton = screen.getByRole('button', {
        name: /complete setup/i,
      });
      fireEvent.click(completeButton);

      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalledWith({
          weddingDetails: expect.any(Object),
          venueSelection: expect.any(Object),
          setupComplete: true,
        });
      });
    });

    it('shows success animation on completion', async () => {
      render(<BasicSetupWizard {...defaultProps} initialStep={4} />);

      const completeButton = screen.getByRole('button', {
        name: /complete setup/i,
      });
      fireEvent.click(completeButton);

      await waitFor(() => {
        expect(screen.getByTestId('success-animation')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      render(<BasicSetupWizard {...defaultProps} />);

      expect(
        screen.getByRole('region', { name: 'Wedding setup wizard' }),
      ).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();

      const steps = screen.getAllByRole('tab');
      steps.forEach((step, index) => {
        expect(step).toHaveAttribute('aria-describedby');
        expect(step).toHaveAttribute('tabindex');
      });
    });

    it('supports keyboard navigation', () => {
      render(<BasicSetupWizard {...defaultProps} />);

      const wizard = screen.getByTestId('setup-wizard');

      // Test Tab navigation
      fireEvent.keyDown(wizard, { key: 'Tab' });
      expect(document.activeElement).toBe(
        screen.getByRole('button', { name: /next/i }),
      );

      // Test Arrow key navigation
      fireEvent.keyDown(wizard, { key: 'ArrowRight' });
      // Should focus next interactive element
    });

    it('announces step changes to screen readers', async () => {
      render(<BasicSetupWizard {...defaultProps} />);

      const nextButton = screen.getByRole('button', { name: /next/i });
      fireEvent.click(nextButton);

      await waitFor(() => {
        const announcement = screen.getByRole('status', { hidden: true });
        expect(announcement).toHaveTextContent('Step 2 of 4: Wedding Details');
      });
    });
  });

  describe('Mobile Responsiveness', () => {
    beforeEach(() => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
    });

    it('adapts layout for mobile screens', () => {
      render(<BasicSetupWizard {...defaultProps} />);

      const wizard = screen.getByTestId('setup-wizard');
      expect(wizard).toHaveClass('mobile-layout');

      // Step indicators should be horizontal on mobile
      const stepContainer = screen.getByTestId('step-indicators');
      expect(stepContainer).toHaveClass('horizontal-steps');
    });

    it('has touch-friendly button sizes', () => {
      render(<BasicSetupWizard {...defaultProps} />);

      const nextButton = screen.getByRole('button', { name: /next/i });
      const buttonStyles = getComputedStyle(nextButton);

      // Minimum touch target size (44px)
      expect(parseInt(buttonStyles.minHeight)).toBeGreaterThanOrEqual(44);
      expect(parseInt(buttonStyles.minWidth)).toBeGreaterThanOrEqual(44);
    });

    it('supports swipe gestures for step navigation', async () => {
      render(<BasicSetupWizard {...defaultProps} />);

      const wizard = screen.getByTestId('setup-wizard');

      // Simulate swipe left (next step)
      fireEvent.touchStart(wizard, {
        touches: [{ clientX: 100, clientY: 100 }],
      });
      fireEvent.touchEnd(wizard, {
        changedTouches: [{ clientX: 50, clientY: 100 }],
      });

      await waitFor(() => {
        expect(mockOnStepChange).toHaveBeenCalledWith(2);
      });
    });
  });

  describe('Performance', () => {
    it('lazy loads step components', async () => {
      const mockLazyLoad = vi.fn();
      vi.mock('@/components/wedding-setup/steps/WeddingDetailsStep', () => ({
        default: mockLazyLoad,
      }));

      render(<BasicSetupWizard {...defaultProps} />);

      // Component should not be loaded initially
      expect(mockLazyLoad).not.toHaveBeenCalled();

      // Navigate to step 2
      const nextButton = screen.getByRole('button', { name: /next/i });
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(mockLazyLoad).toHaveBeenCalled();
      });
    });

    it('debounces auto-save operations', async () => {
      const mockSaveProgress = vi.fn();
      vi.mocked(useWeddingSetup).mockReturnValue({
        saveProgress: mockSaveProgress,
        loading: false,
        error: null,
      });

      render(<BasicSetupWizard {...defaultProps} initialStep={2} />);

      const nameInput = screen.getByLabelText('Partner 1 Name');

      // Rapid typing should only trigger one save
      fireEvent.change(nameInput, { target: { value: 'J' } });
      fireEvent.change(nameInput, { target: { value: 'Jo' } });
      fireEvent.change(nameInput, { target: { value: 'John' } });

      await waitFor(
        () => {
          expect(mockSaveProgress).toHaveBeenCalledTimes(1);
        },
        { timeout: 1000 },
      );
    });
  });
});
