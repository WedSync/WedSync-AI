/**
 * @file MobileSetupWizard.test.tsx
 * @description Comprehensive mobile tests for wedding setup wizard (Team D)
 * @coverage Touch interactions, responsive design, mobile UX, offline support, PWA features
 */

import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { MobileSetupWizard } from '@/components/mobile/wedding-setup/MobileSetupWizard';

// Mobile-specific test setup
const mockViewport = {
  width: 375,
  height: 812,
  pixelRatio: 2,
  isMobile: true,
  isTouch: true,
};

// Mock mobile APIs
vi.mock('@/hooks/useMobileDetection');
vi.mock('@/hooks/useOfflineSupport');
vi.mock('@/hooks/useTouchGestures');
vi.mock('@/lib/pwa/offline-manager');

const mockOnComplete = vi.fn();
const mockOnStepChange = vi.fn();

const defaultProps = {
  onComplete: mockOnComplete,
  onStepChange: mockOnStepChange,
  viewport: mockViewport,
};

describe('MobileSetupWizard', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock mobile environment
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });

    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 812,
    });

    Object.defineProperty(navigator, 'userAgent', {
      writable: true,
      configurable: true,
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
    });

    // Mock touch support
    Object.defineProperty(window, 'ontouchstart', {
      writable: true,
      configurable: true,
      value: {},
    });

    // Mock mobile detection hook
    vi.mocked(useMobileDetection).mockReturnValue({
      isMobile: true,
      isTablet: false,
      isDesktop: false,
      deviceType: 'mobile',
      orientation: 'portrait',
      viewportSize: mockViewport,
    });
  });

  describe('Mobile Layout and Responsiveness', () => {
    it('renders mobile-optimized layout', () => {
      render(<MobileSetupWizard {...defaultProps} />);

      const wizard = screen.getByTestId('mobile-setup-wizard');
      expect(wizard).toHaveClass('mobile-layout');
      expect(wizard).toHaveClass('touch-optimized');

      // Header should be sticky on mobile
      const header = screen.getByTestId('wizard-header');
      expect(header).toHaveClass('sticky-header');

      // Progress indicator should be horizontal
      const progressBar = screen.getByTestId('progress-indicator');
      expect(progressBar).toHaveClass('horizontal-progress');
    });

    it('adapts to different mobile screen sizes', () => {
      // Test iPhone SE (small screen)
      Object.defineProperty(window, 'innerWidth', { value: 320 });
      Object.defineProperty(window, 'innerHeight', { value: 568 });

      const { rerender } = render(<MobileSetupWizard {...defaultProps} />);

      let wizard = screen.getByTestId('mobile-setup-wizard');
      expect(wizard).toHaveClass('small-screen');

      // Test iPhone 12 Pro Max (large screen)
      Object.defineProperty(window, 'innerWidth', { value: 428 });
      Object.defineProperty(window, 'innerHeight', { value: 926 });

      rerender(<MobileSetupWizard {...defaultProps} />);

      wizard = screen.getByTestId('mobile-setup-wizard');
      expect(wizard).toHaveClass('large-screen');
    });

    it('handles landscape orientation', async () => {
      // Simulate device rotation to landscape
      Object.defineProperty(window, 'innerWidth', { value: 812 });
      Object.defineProperty(window, 'innerHeight', { value: 375 });

      vi.mocked(useMobileDetection).mockReturnValue({
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        deviceType: 'mobile',
        orientation: 'landscape',
        viewportSize: { ...mockViewport, width: 812, height: 375 },
      });

      render(<MobileSetupWizard {...defaultProps} />);

      const wizard = screen.getByTestId('mobile-setup-wizard');
      expect(wizard).toHaveClass('landscape');

      // Layout should adapt to landscape
      const formContainer = screen.getByTestId('form-container');
      expect(formContainer).toHaveClass('landscape-layout');
    });

    it('provides safe area support for notched devices', () => {
      // Mock safe area insets (iPhone X+)
      const style = document.createElement('style');
      style.textContent = `
        :root {
          --safe-area-inset-top: 44px;
          --safe-area-inset-bottom: 34px;
          --safe-area-inset-left: 0px;
          --safe-area-inset-right: 0px;
        }
      `;
      document.head.appendChild(style);

      render(<MobileSetupWizard {...defaultProps} />);

      const wizard = screen.getByTestId('mobile-setup-wizard');
      expect(wizard).toHaveClass('safe-area-support');

      const header = screen.getByTestId('wizard-header');
      const computedStyle = getComputedStyle(header);
      expect(computedStyle.paddingTop).toBe('44px');
    });
  });

  describe('Touch Interactions', () => {
    it('supports swipe navigation between steps', async () => {
      render(<MobileSetupWizard {...defaultProps} />);

      const wizard = screen.getByTestId('mobile-setup-wizard');

      // Simulate swipe left (next step)
      fireEvent.touchStart(wizard, {
        touches: [{ clientX: 200, clientY: 400 }],
      });

      fireEvent.touchMove(wizard, {
        touches: [{ clientX: 100, clientY: 400 }],
      });

      fireEvent.touchEnd(wizard, {
        changedTouches: [{ clientX: 100, clientY: 400 }],
      });

      await waitFor(() => {
        expect(mockOnStepChange).toHaveBeenCalledWith(2);
      });
    });

    it('supports swipe back to previous step', async () => {
      render(<MobileSetupWizard {...defaultProps} initialStep={2} />);

      const wizard = screen.getByTestId('mobile-setup-wizard');

      // Simulate swipe right (previous step)
      fireEvent.touchStart(wizard, {
        touches: [{ clientX: 100, clientY: 400 }],
      });

      fireEvent.touchMove(wizard, {
        touches: [{ clientX: 200, clientY: 400 }],
      });

      fireEvent.touchEnd(wizard, {
        changedTouches: [{ clientX: 200, clientY: 400 }],
      });

      await waitFor(() => {
        expect(mockOnStepChange).toHaveBeenCalledWith(1);
      });
    });

    it('ignores vertical swipes to avoid interference with scrolling', async () => {
      render(<MobileSetupWizard {...defaultProps} />);

      const wizard = screen.getByTestId('mobile-setup-wizard');

      // Simulate vertical swipe (should not trigger step change)
      fireEvent.touchStart(wizard, {
        touches: [{ clientX: 200, clientY: 200 }],
      });

      fireEvent.touchMove(wizard, {
        touches: [{ clientX: 200, clientY: 400 }],
      });

      fireEvent.touchEnd(wizard, {
        changedTouches: [{ clientX: 200, clientY: 400 }],
      });

      // Should not change step
      expect(mockOnStepChange).not.toHaveBeenCalled();
    });

    it('has touch-friendly button sizes', () => {
      render(<MobileSetupWizard {...defaultProps} />);

      const nextButton = screen.getByRole('button', { name: /next/i });
      const buttonStyles = getComputedStyle(nextButton);

      // Minimum 44px touch target
      expect(parseInt(buttonStyles.minHeight)).toBeGreaterThanOrEqual(44);
      expect(parseInt(buttonStyles.minWidth)).toBeGreaterThanOrEqual(44);

      // Adequate spacing between touch targets
      const backButton = screen.queryByRole('button', { name: /back/i });
      if (backButton) {
        const spacing =
          parseInt(buttonStyles.marginLeft) ||
          parseInt(buttonStyles.marginRight);
        expect(spacing).toBeGreaterThanOrEqual(8);
      }
    });

    it('provides haptic feedback on interactions', async () => {
      const mockVibrate = vi.fn();
      Object.defineProperty(navigator, 'vibrate', {
        writable: true,
        configurable: true,
        value: mockVibrate,
      });

      render(<MobileSetupWizard {...defaultProps} enableHaptics={true} />);

      const nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);

      expect(mockVibrate).toHaveBeenCalledWith(10); // Light haptic feedback
    });

    it('supports pull-to-refresh on form steps', async () => {
      render(<MobileSetupWizard {...defaultProps} />);

      const formContainer = screen.getByTestId('form-container');

      // Simulate pull-to-refresh gesture
      fireEvent.touchStart(formContainer, {
        touches: [{ clientX: 200, clientY: 100 }],
      });

      fireEvent.touchMove(formContainer, {
        touches: [{ clientX: 200, clientY: 300 }],
      });

      fireEvent.touchEnd(formContainer, {
        changedTouches: [{ clientX: 200, clientY: 300 }],
      });

      await waitFor(() => {
        expect(screen.getByTestId('refresh-indicator')).toBeInTheDocument();
      });
    });
  });

  describe('Mobile-Optimized Form Inputs', () => {
    it('uses appropriate input types for mobile keyboards', async () => {
      render(<MobileSetupWizard {...defaultProps} initialStep={2} />);

      await waitFor(() => {
        // Email input should trigger email keyboard
        const emailInput = screen.getByLabelText('Contact Email');
        expect(emailInput).toHaveAttribute('type', 'email');
        expect(emailInput).toHaveAttribute('inputmode', 'email');

        // Phone input should trigger phone keyboard
        const phoneInput = screen.getByLabelText('Contact Phone');
        expect(phoneInput).toHaveAttribute('type', 'tel');
        expect(phoneInput).toHaveAttribute('inputmode', 'tel');

        // Number input should trigger numeric keyboard
        const guestCountInput = screen.getByLabelText('Guest Count');
        expect(guestCountInput).toHaveAttribute('type', 'number');
        expect(guestCountInput).toHaveAttribute('inputmode', 'numeric');
      });
    });

    it('provides mobile-optimized date picker', async () => {
      render(<MobileSetupWizard {...defaultProps} initialStep={2} />);

      await waitFor(() => {
        const dateInput = screen.getByLabelText('Wedding Date');
        expect(dateInput).toHaveAttribute('type', 'date');

        // Should use native mobile date picker
        expect(dateInput).toHaveClass('native-date-picker');
      });
    });

    it('handles auto-complete and form suggestions', async () => {
      render(<MobileSetupWizard {...defaultProps} initialStep={2} />);

      await waitFor(() => {
        const nameInput = screen.getByLabelText('Partner 1 Name');
        expect(nameInput).toHaveAttribute('autocomplete', 'given-name');

        const emailInput = screen.getByLabelText('Contact Email');
        expect(emailInput).toHaveAttribute('autocomplete', 'email');

        const phoneInput = screen.getByLabelText('Contact Phone');
        expect(phoneInput).toHaveAttribute('autocomplete', 'tel');
      });
    });

    it('supports voice input for text fields', async () => {
      const mockSpeechRecognition = {
        start: vi.fn(),
        stop: vi.fn(),
        addEventListener: vi.fn(),
      };

      global.webkitSpeechRecognition = vi.fn(() => mockSpeechRecognition);

      render(
        <MobileSetupWizard
          {...defaultProps}
          initialStep={2}
          enableVoiceInput={true}
        />,
      );

      await waitFor(() => {
        const nameInput = screen.getByLabelText('Partner 1 Name');
        const voiceButton = within(nameInput.parentElement!).getByTestId(
          'voice-input-button',
        );
        expect(voiceButton).toBeInTheDocument();
      });

      const voiceButton = screen.getByTestId('voice-input-button');
      await user.click(voiceButton);

      expect(mockSpeechRecognition.start).toHaveBeenCalled();
    });

    it('provides field validation feedback optimized for mobile', async () => {
      render(<MobileSetupWizard {...defaultProps} initialStep={2} />);

      await waitFor(() => {
        const emailInput = screen.getByLabelText('Contact Email');
        fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
        fireEvent.blur(emailInput);
      });

      await waitFor(() => {
        // Error message should be immediately below the input
        const errorMessage = screen.getByText(
          'Please enter a valid email address',
        );
        expect(errorMessage).toHaveClass('mobile-error-message');

        // Input should have error styling
        const emailInput = screen.getByLabelText('Contact Email');
        expect(emailInput).toHaveClass('input-error');
      });
    });
  });

  describe('Mobile Navigation and UX', () => {
    it('provides sticky navigation controls', () => {
      render(<MobileSetupWizard {...defaultProps} />);

      const navigationControls = screen.getByTestId('navigation-controls');
      expect(navigationControls).toHaveClass('sticky-bottom');

      // Should be above safe area on devices with home indicator
      const computedStyle = getComputedStyle(navigationControls);
      expect(computedStyle.paddingBottom).toContain('safe-area-inset-bottom');
    });

    it('shows progress with mobile-friendly indicators', () => {
      render(
        <MobileSetupWizard {...defaultProps} initialStep={2} totalSteps={4} />,
      );

      const progressIndicator = screen.getByTestId('progress-indicator');
      expect(progressIndicator).toHaveClass('mobile-progress');

      // Should show current step clearly
      const currentStepIndicator = screen.getByTestId('current-step');
      expect(currentStepIndicator).toHaveTextContent('Step 2 of 4');

      // Progress bar should be touch-friendly
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '50'); // 2/4 = 50%
    });

    it('provides easy access to help and support', () => {
      render(<MobileSetupWizard {...defaultProps} />);

      const helpButton = screen.getByTestId('help-button');
      expect(helpButton).toBeInTheDocument();
      expect(helpButton).toHaveClass('floating-help-button');

      // Help should be easily accessible via thumb reach
      const buttonPosition = getComputedStyle(helpButton);
      expect(buttonPosition.position).toBe('fixed');
      expect(buttonPosition.right).toBeDefined();
      expect(buttonPosition.bottom).toBeDefined();
    });

    it('handles back button behavior correctly', async () => {
      // Mock browser history
      const mockBack = vi.fn();
      Object.defineProperty(window.history, 'back', {
        writable: true,
        configurable: true,
        value: mockBack,
      });

      render(<MobileSetupWizard {...defaultProps} initialStep={2} />);

      // Simulate browser back button press
      fireEvent.popState(window);

      await waitFor(() => {
        expect(mockOnStepChange).toHaveBeenCalledWith(1);
      });
    });

    it('provides confirmation for destructive actions', async () => {
      render(<MobileSetupWizard {...defaultProps} initialStep={2} />);

      // Try to navigate away with unsaved changes
      await user.type(screen.getByLabelText('Partner 1 Name'), 'John Doe');

      const backButton = screen.getByRole('button', { name: /back/i });
      await user.click(backButton);

      // Should show confirmation dialog
      expect(screen.getByText('You have unsaved changes')).toBeInTheDocument();
      expect(
        screen.getByText('Are you sure you want to go back?'),
      ).toBeInTheDocument();

      const confirmButton = screen.getByRole('button', {
        name: /yes, go back/i,
      });
      const cancelButton = screen.getByRole('button', { name: /cancel/i });

      expect(confirmButton).toBeInTheDocument();
      expect(cancelButton).toBeInTheDocument();
    });
  });

  describe('Offline Support', () => {
    it('detects offline state and shows appropriate UI', async () => {
      vi.mocked(useOfflineSupport).mockReturnValue({
        isOnline: false,
        hasOfflineData: true,
        syncPending: true,
        lastSync: new Date('2024-01-01T12:00:00Z'),
      });

      render(<MobileSetupWizard {...defaultProps} />);

      expect(screen.getByTestId('offline-indicator')).toBeInTheDocument();
      expect(screen.getByText('You are currently offline')).toBeInTheDocument();
      expect(
        screen.getByText('Changes will be saved when you reconnect'),
      ).toBeInTheDocument();
    });

    it('auto-saves form data locally when offline', async () => {
      const mockSaveOfflineData = vi.fn();
      vi.mocked(useOfflineSupport).mockReturnValue({
        isOnline: false,
        hasOfflineData: false,
        syncPending: false,
        saveOfflineData: mockSaveOfflineData,
        loadOfflineData: vi.fn(),
      });

      render(<MobileSetupWizard {...defaultProps} initialStep={2} />);

      await waitFor(() => {
        const nameInput = screen.getByLabelText('Partner 1 Name');
        fireEvent.change(nameInput, { target: { value: 'John Doe' } });
      });

      // Should auto-save to local storage after debounce
      await waitFor(
        () => {
          expect(mockSaveOfflineData).toHaveBeenCalledWith(
            expect.objectContaining({
              partner1Name: 'John Doe',
              step: 2,
              timestamp: expect.any(Date),
            }),
          );
        },
        { timeout: 2000 },
      );
    });

    it('syncs data when coming back online', async () => {
      const mockSyncOfflineData = vi.fn();
      let onlineState = false;

      vi.mocked(useOfflineSupport).mockReturnValue({
        isOnline: onlineState,
        hasOfflineData: true,
        syncPending: true,
        syncOfflineData: mockSyncOfflineData,
        offlineData: {
          partner1Name: 'John Offline',
          partner2Name: 'Jane Offline',
          contactEmail: 'offline@example.com',
          step: 2,
        },
      });

      const { rerender } = render(<MobileSetupWizard {...defaultProps} />);

      // Simulate coming online
      onlineState = true;
      vi.mocked(useOfflineSupport).mockReturnValue({
        isOnline: true,
        hasOfflineData: true,
        syncPending: true,
        syncOfflineData: mockSyncOfflineData,
        offlineData: {
          partner1Name: 'John Offline',
          partner2Name: 'Jane Offline',
          contactEmail: 'offline@example.com',
          step: 2,
        },
      });

      rerender(<MobileSetupWizard {...defaultProps} />);

      await waitFor(() => {
        expect(mockSyncOfflineData).toHaveBeenCalled();
      });
    });

    it('handles sync conflicts gracefully', async () => {
      const mockResolveConflict = vi.fn();
      vi.mocked(useOfflineSupport).mockReturnValue({
        isOnline: true,
        hasOfflineData: true,
        syncPending: false,
        hasConflict: true,
        conflictData: {
          local: { partner1Name: 'Local Name' },
          server: { partner1Name: 'Server Name' },
        },
        resolveConflict: mockResolveConflict,
      });

      render(<MobileSetupWizard {...defaultProps} />);

      expect(screen.getByText('Data Conflict Detected')).toBeInTheDocument();
      expect(
        screen.getByText('Choose which version to keep:'),
      ).toBeInTheDocument();

      const keepLocalButton = screen.getByRole('button', {
        name: /keep local version/i,
      });
      await user.click(keepLocalButton);

      expect(mockResolveConflict).toHaveBeenCalledWith('local');
    });
  });

  describe('PWA Features', () => {
    it('supports installation prompts', async () => {
      const mockInstallPrompt = {
        prompt: vi.fn(),
        userChoice: Promise.resolve({ outcome: 'accepted' }),
      };

      // Mock beforeinstallprompt event
      global.beforeinstallprompt = mockInstallPrompt;

      render(<MobileSetupWizard {...defaultProps} enablePWA={true} />);

      // Trigger install prompt
      fireEvent(window, new Event('beforeinstallprompt'));

      await waitFor(() => {
        expect(screen.getByTestId('install-prompt')).toBeInTheDocument();
      });

      const installButton = screen.getByRole('button', {
        name: /add to home screen/i,
      });
      await user.click(installButton);

      expect(mockInstallPrompt.prompt).toHaveBeenCalled();
    });

    it('shows different UI when running as PWA', () => {
      // Mock PWA detection
      Object.defineProperty(window.navigator, 'standalone', {
        writable: true,
        configurable: true,
        value: true,
      });

      render(<MobileSetupWizard {...defaultProps} />);

      const wizard = screen.getByTestId('mobile-setup-wizard');
      expect(wizard).toHaveClass('pwa-mode');

      // Should hide browser UI elements
      expect(
        screen.queryByTestId('browser-back-button'),
      ).not.toBeInTheDocument();
    });

    it('handles app updates gracefully', async () => {
      const mockUpdateAvailable = vi.fn();

      render(
        <MobileSetupWizard
          {...defaultProps}
          onUpdateAvailable={mockUpdateAvailable}
        />,
      );

      // Simulate service worker update
      fireEvent(window, new Event('updateready'));

      await waitFor(() => {
        expect(screen.getByText('App Update Available')).toBeInTheDocument();
      });

      const updateButton = screen.getByRole('button', { name: /update now/i });
      await user.click(updateButton);

      expect(mockUpdateAvailable).toHaveBeenCalled();
    });
  });

  describe('Performance Optimization', () => {
    it('lazy loads step components for better performance', async () => {
      const mockLazyComponent = vi.fn();
      vi.mock(
        '@/components/mobile/wedding-setup/steps/MobileWeddingDetailsStep',
        () => ({
          default: mockLazyComponent,
        }),
      );

      render(<MobileSetupWizard {...defaultProps} />);

      // Component should not be loaded initially
      expect(mockLazyComponent).not.toHaveBeenCalled();

      // Navigate to step 2
      const nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);

      await waitFor(() => {
        expect(mockLazyComponent).toHaveBeenCalled();
      });
    });

    it('optimizes images for mobile screens', () => {
      render(<MobileSetupWizard {...defaultProps} />);

      const images = screen.getAllByRole('img');
      images.forEach((img) => {
        expect(img).toHaveAttribute('loading', 'lazy');
        expect(img).toHaveAttribute('decoding', 'async');

        // Should use responsive image sizing
        const srcset = img.getAttribute('srcset');
        if (srcset) {
          expect(srcset).toContain('375w'); // Mobile width
          expect(srcset).toContain('750w'); // 2x pixel ratio
        }
      });
    });

    it('implements virtual scrolling for large lists', async () => {
      // Mock venue selection step with many venues
      render(<MobileSetupWizard {...defaultProps} initialStep={3} />);

      await waitFor(() => {
        const venueList = screen.getByTestId('venue-list');
        expect(venueList).toHaveClass('virtual-scroll');

        // Only visible items should be rendered
        const visibleVenues = screen.getAllByTestId(/venue-item-\d+/);
        expect(visibleVenues.length).toBeLessThan(20);
      });
    });

    it('preloads critical resources', () => {
      render(<MobileSetupWizard {...defaultProps} />);

      // Should preload next step resources
      const preloadLinks = document.querySelectorAll('link[rel="prefetch"]');
      expect(preloadLinks.length).toBeGreaterThan(0);

      // Should preload critical CSS
      const preloadCSS = document.querySelectorAll(
        'link[rel="preload"][as="style"]',
      );
      expect(preloadCSS.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility on Mobile', () => {
    it('provides screen reader support', () => {
      render(<MobileSetupWizard {...defaultProps} />);

      const wizard = screen.getByTestId('mobile-setup-wizard');
      expect(wizard).toHaveAttribute('role', 'application');
      expect(wizard).toHaveAttribute('aria-label', 'Wedding setup wizard');

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-label', 'Setup progress');
      expect(progressBar).toHaveAttribute('aria-valuenow');
      expect(progressBar).toHaveAttribute('aria-valuemax');
    });

    it('supports voice over navigation', async () => {
      render(<MobileSetupWizard {...defaultProps} />);

      // Simulate VoiceOver gesture
      const nextButton = screen.getByRole('button', { name: /next/i });

      // Should announce button role and instructions
      expect(nextButton).toHaveAttribute('aria-describedby');

      const description = document.getElementById(
        nextButton.getAttribute('aria-describedby')!,
      );
      expect(description).toHaveTextContent(
        'Double tap to proceed to next step',
      );
    });

    it('provides high contrast mode support', () => {
      // Mock high contrast mode
      const mediaQuery = {
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };

      vi.spyOn(window, 'matchMedia').mockImplementation(
        () => mediaQuery as any,
      );

      render(<MobileSetupWizard {...defaultProps} />);

      const wizard = screen.getByTestId('mobile-setup-wizard');
      expect(wizard).toHaveClass('high-contrast');
    });

    it('supports zoom up to 200% without horizontal scrolling', () => {
      // Mock 200% zoom
      Object.defineProperty(window, 'devicePixelRatio', {
        writable: true,
        configurable: true,
        value: 2,
      });

      render(<MobileSetupWizard {...defaultProps} />);

      const wizard = screen.getByTestId('mobile-setup-wizard');
      const computedStyle = getComputedStyle(wizard);

      // Should not have horizontal overflow
      expect(computedStyle.overflowX).not.toBe('scroll');
      expect(computedStyle.maxWidth).toBe('100%');
    });
  });

  describe('Error Handling and Recovery', () => {
    it('handles network errors gracefully', async () => {
      // Mock network error
      const mockFetch = vi.spyOn(window, 'fetch');
      mockFetch.mockRejectedValue(new Error('Network error'));

      render(<MobileSetupWizard {...defaultProps} />);

      // Try to submit form
      const nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText('Connection Error')).toBeInTheDocument();
        expect(
          screen.getByText('Please check your internet connection'),
        ).toBeInTheDocument();

        const retryButton = screen.getByRole('button', { name: /try again/i });
        expect(retryButton).toBeInTheDocument();
      });
    });

    it('handles app crashes with error boundary', () => {
      const ThrowError = () => {
        throw new Error('Test error');
      };

      // Mock error boundary
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      render(
        <MobileSetupWizard {...defaultProps}>
          <ThrowError />
        </MobileSetupWizard>,
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(
        screen.getByText('Please refresh the app and try again'),
      ).toBeInTheDocument();

      const refreshButton = screen.getByRole('button', {
        name: /refresh app/i,
      });
      expect(refreshButton).toBeInTheDocument();

      consoleSpy.mockRestore();
    });

    it('provides recovery options for corrupted data', async () => {
      const mockCorruptedData = vi.fn();
      vi.mocked(useOfflineSupport).mockReturnValue({
        isOnline: true,
        hasOfflineData: true,
        dataCorrupted: true,
        recoverData: mockCorruptedData,
      });

      render(<MobileSetupWizard {...defaultProps} />);

      expect(screen.getByText('Data Recovery Needed')).toBeInTheDocument();
      expect(
        screen.getByText('Your saved data appears to be corrupted'),
      ).toBeInTheDocument();

      const recoverButton = screen.getByRole('button', {
        name: /recover data/i,
      });
      const startOverButton = screen.getByRole('button', {
        name: /start over/i,
      });

      expect(recoverButton).toBeInTheDocument();
      expect(startOverButton).toBeInTheDocument();

      await user.click(recoverButton);
      expect(mockCorruptedData).toHaveBeenCalled();
    });
  });
});
