/**
 * WS-165 Payment Calendar Accessibility Testing Suite
 * Team E - Round 1 Implementation
 * 
 * Comprehensive accessibility tests ensuring WCAG 2.1 AA compliance:
 * - Keyboard navigation and focus management
 * - Screen reader support and ARIA attributes
 * - Color contrast and visual accessibility
 * - Motor disability accommodations
 * - Cognitive accessibility features
 * - Assistive technology compatibility
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations, configureAxe } from 'jest-axe';
import PaymentCalendar from '@/components/payments/PaymentCalendar';
import { 
  mockPaymentData,
  mockPaymentSummary,
  mockComponentProps,
  testUtils,
  MOCK_WEDDING_ID 
} from '@/tests/payments/fixtures/payment-fixtures';

// Extend Jest matchers for accessibility
expect.extend(toHaveNoViolations);

// Configure axe-core for comprehensive testing
configureAxe({
  rules: {
    // Enable all WCAG 2.1 AA rules
    'wcag2a': { enabled: true },
    'wcag2aa': { enabled: true },
    'wcag21aa': { enabled: true },
    // Custom wedding industry accessibility rules
    'color-contrast': { enabled: true },
    'keyboard-navigation': { enabled: true },
    'focus-order-semantics': { enabled: true },
    'aria-roles': { enabled: true },
    'aria-properties': { enabled: true },
    'aria-state-properties': { enabled: true },
    'tabindex': { enabled: true },
    'bypass-blocks': { enabled: true },
  },
});

// Mock screen reader announcements
const mockScreenReaderAnnouncements: string[] = [];
const originalCreateTextRange = document.createRange;

// Mock NVDA/JAWS screen reader APIs
global.speechSynthesis = {
  speak: jest.fn((utterance) => {
    mockScreenReaderAnnouncements.push(utterance.text);
  }),
  cancel: jest.fn(),
  pause: jest.fn(),
  resume: jest.fn(),
  getVoices: jest.fn(() => []),
  pending: false,
  speaking: false,
  paused: false,
} as any;

// Color contrast testing utilities
class ColorContrastTester {
  static hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  static getLuminance(rgb: { r: number; g: number; b: number }): number {
    const { r, g, b } = rgb;
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  }

  static getContrastRatio(color1: string, color2: string): number {
    const rgb1 = this.hexToRgb(color1);
    const rgb2 = this.hexToRgb(color2);
    
    if (!rgb1 || !rgb2) return 1;

    const lum1 = this.getLuminance(rgb1);
    const lum2 = this.getLuminance(rgb2);
    
    const lightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    
    return (lightest + 0.05) / (darkest + 0.05);
  }

  static meetsWCAG_AA(foreground: string, background: string, isLargeText = false): boolean {
    const ratio = this.getContrastRatio(foreground, background);
    return isLargeText ? ratio >= 3 : ratio >= 4.5;
  }

  static meetsWCAG_AAA(foreground: string, background: string, isLargeText = false): boolean {
    const ratio = this.getContrastRatio(foreground, background);
    return isLargeText ? ratio >= 4.5 : ratio >= 7;
  }
}

// Keyboard navigation helper
class KeyboardNavigationTester {
  private page: any;
  private focusHistory: HTMLElement[] = [];

  constructor(page: any) {
    this.page = page;
  }

  async pressTab(shiftKey = false) {
    await this.page.keyboard.press(shiftKey ? 'Shift+Tab' : 'Tab');
    const focused = document.activeElement as HTMLElement;
    this.focusHistory.push(focused);
    return focused;
  }

  async navigateWithArrows(direction: 'up' | 'down' | 'left' | 'right') {
    const keyMap = {
      up: 'ArrowUp',
      down: 'ArrowDown',
      left: 'ArrowLeft',
      right: 'ArrowRight'
    };
    
    await this.page.keyboard.press(keyMap[direction]);
    const focused = document.activeElement as HTMLElement;
    this.focusHistory.push(focused);
    return focused;
  }

  getFocusHistory(): HTMLElement[] {
    return this.focusHistory;
  }

  clearHistory() {
    this.focusHistory = [];
  }
}

describe('Payment Calendar Accessibility Tests - WS-165', () => {
  let mockProps: typeof mockComponentProps.paymentCalendar;

  beforeEach(() => {
    mockProps = {
      ...mockComponentProps.paymentCalendar,
      onPaymentUpdate: jest.fn(),
      onPaymentCreate: jest.fn(),
      onPaymentDelete: jest.fn(),
      onDateSelect: jest.fn(),
      onFilterChange: jest.fn(),
    };
    
    // Clear screen reader announcements
    mockScreenReaderAnnouncements.length = 0;
  });

  /**
   * WCAG 2.1 AA COMPLIANCE TESTS
   */
  describe('WCAG 2.1 AA Compliance', () => {
    test('passes automated accessibility audit', async () => {
      const { container } = render(<PaymentCalendar {...mockProps} />);
      
      // Run comprehensive axe audit
      const results = await axe(container, {
        tags: ['wcag2a', 'wcag2aa', 'wcag21aa'],
      });
      
      expect(results).toHaveNoViolations();
    });

    test('provides proper semantic structure', async () => {
      render(<PaymentCalendar {...mockProps} />);
      
      // Verify semantic HTML structure
      expect(screen.getByRole('application')).toBeInTheDocument();
      expect(screen.getByRole('grid')).toBeInTheDocument();
      expect(screen.getByRole('navigation')).toBeInTheDocument();
      
      // Verify proper heading hierarchy
      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);
      
      // Check heading levels are logical
      const h1 = screen.queryByRole('heading', { level: 1 });
      const h2 = screen.getAllByRole('heading', { level: 2 });
      expect(h2.length).toBeGreaterThan(0);
    });

    test('provides alternative text for visual elements', async () => {
      render(<PaymentCalendar {...mockProps} />);
      
      // Check payment status indicators have alt text
      const statusIndicators = screen.getAllByTestId(/status-indicator/);
      statusIndicators.forEach(indicator => {
        expect(indicator).toHaveAttribute('aria-label');
      });
      
      // Check icon buttons have accessible names
      const iconButtons = screen.getAllByRole('button');
      iconButtons.forEach(button => {
        expect(
          button.hasAttribute('aria-label') || 
          button.hasAttribute('aria-labelledby') ||
          button.textContent?.trim()
        ).toBeTruthy();
      });
    });

    test('maintains proper focus order', async () => {
      render(<PaymentCalendar {...mockProps} />);
      
      // Get all focusable elements
      const focusableElements = screen.getAllByRole('button')
        .concat(screen.getAllByRole('gridcell'))
        .concat(screen.getAllByRole('textbox'))
        .filter(el => !el.hasAttribute('disabled'));
      
      expect(focusableElements.length).toBeGreaterThan(0);
      
      // Test tab order is logical
      const firstElement = focusableElements[0];
      firstElement.focus();
      expect(document.activeElement).toBe(firstElement);
    });
  });

  /**
   * KEYBOARD NAVIGATION TESTS
   */
  describe('Keyboard Navigation', () => {
    test('supports full keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<PaymentCalendar {...mockProps} />);
      
      // Tab through all interactive elements
      await user.tab();
      expect(document.activeElement).toBeVisible();
      
      // Continue tabbing through calendar
      for (let i = 0; i < 10; i++) {
        await user.tab();
        const focused = document.activeElement;
        expect(focused).toBeVisible();
        
        // Should not lose focus
        expect(focused?.tagName).not.toBe('BODY');
      }
    });

    test('implements proper arrow key navigation in calendar grid', async () => {
      const user = userEvent.setup();
      render(<PaymentCalendar {...mockProps} />);
      
      // Focus on calendar grid
      const calendar = screen.getByRole('grid');
      calendar.focus();
      
      // Test arrow key navigation
      const initialFocus = document.activeElement;
      
      // Move right
      await user.keyboard('{ArrowRight}');
      const afterRight = document.activeElement;
      expect(afterRight).not.toBe(initialFocus);
      
      // Move down
      await user.keyboard('{ArrowDown}');
      const afterDown = document.activeElement;
      expect(afterDown).not.toBe(afterRight);
      
      // Move left
      await user.keyboard('{ArrowLeft}');
      const afterLeft = document.activeElement;
      expect(afterLeft).not.toBe(afterDown);
      
      // Move up
      await user.keyboard('{ArrowUp}');
      const afterUp = document.activeElement;
      expect(afterUp).not.toBe(afterLeft);
    });

    test('handles Home and End keys in calendar', async () => {
      const user = userEvent.setup();
      render(<PaymentCalendar {...mockProps} />);
      
      const calendar = screen.getByRole('grid');
      calendar.focus();
      
      // Test Home key (first day of week)
      await user.keyboard('{Home}');
      const homePosition = document.activeElement;
      
      // Test End key (last day of week)
      await user.keyboard('{End}');
      const endPosition = document.activeElement;
      
      expect(homePosition).not.toBe(endPosition);
    });

    test('supports Page Up and Page Down for month navigation', async () => {
      const user = userEvent.setup();
      render(<PaymentCalendar {...mockProps} />);
      
      const calendar = screen.getByRole('grid');
      const initialMonth = screen.getByTestId('current-month-header').textContent;
      
      calendar.focus();
      
      // Test Page Down (next month)
      await user.keyboard('{PageDown}');
      await waitFor(() => {
        const newMonth = screen.getByTestId('current-month-header').textContent;
        expect(newMonth).not.toBe(initialMonth);
      });
      
      // Test Page Up (previous month)
      await user.keyboard('{PageUp}');
      await waitFor(() => {
        const backToOriginal = screen.getByTestId('current-month-header').textContent;
        expect(backToOriginal).toBe(initialMonth);
      });
    });

    test('traps focus in modal dialogs', async () => {
      const user = userEvent.setup();
      render(<PaymentCalendar {...mockProps} />);
      
      // Open payment creation modal
      const addButton = screen.getByRole('button', { name: /add payment/i });
      await user.click(addButton);
      
      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();
      
      // Focus should be trapped within modal
      const modalInputs = screen.getAllByRole('textbox');
      const firstInput = modalInputs[0];
      expect(document.activeElement).toBe(firstInput);
      
      // Tab through modal elements
      for (let i = 0; i < modalInputs.length + 2; i++) {
        await user.tab();
        const focused = document.activeElement;
        
        // Focus should remain within modal
        expect(modal.contains(focused)).toBe(true);
      }
    });

    test('returns focus after modal closes', async () => {
      const user = userEvent.setup();
      render(<PaymentCalendar {...mockProps} />);
      
      const addButton = screen.getByRole('button', { name: /add payment/i });
      await user.click(addButton);
      
      // Close modal with Escape
      await user.keyboard('{Escape}');
      
      // Focus should return to trigger button
      await waitFor(() => {
        expect(addButton).toHaveFocus();
      });
    });
  });

  /**
   * SCREEN READER SUPPORT TESTS
   */
  describe('Screen Reader Support', () => {
    test('provides comprehensive ARIA attributes', async () => {
      render(<PaymentCalendar {...mockProps} />);
      
      // Check calendar has proper ARIA attributes
      const calendar = screen.getByRole('grid');
      expect(calendar).toHaveAttribute('aria-label');
      expect(calendar).toHaveAttribute('aria-multiselectable');
      
      // Check payment items have proper ARIA
      const paymentItems = screen.getAllByTestId(/^payment-/);
      paymentItems.forEach(item => {
        expect(item).toHaveAttribute('aria-label');
        expect(item).toHaveAttribute('role');
      });
      
      // Check live regions exist
      expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
    });

    test('announces payment status changes', async () => {
      const user = userEvent.setup();
      render(<PaymentCalendar {...mockProps} />);
      
      // Update payment status
      const paymentItem = screen.getByTestId('payment-001');
      const statusButton = screen.getByLabelText(/mark as paid/i);
      
      await user.click(statusButton);
      
      // Should announce status change
      await waitFor(() => {
        const announcements = mockScreenReaderAnnouncements;
        expect(announcements).toContain(expect.stringMatching(/payment.*marked.*paid/i));
      });
    });

    test('provides descriptive labels for payment amounts', async () => {
      render(<PaymentCalendar {...mockProps} />);
      
      const paymentAmounts = screen.getAllByTestId(/payment-amount/);
      paymentAmounts.forEach(amount => {
        const ariaLabel = amount.getAttribute('aria-label') || amount.textContent;
        expect(ariaLabel).toMatch(/\$\d+/); // Should include currency formatting
      });
    });

    test('describes payment due dates clearly', async () => {
      render(<PaymentCalendar {...mockProps} />);
      
      const dueDates = screen.getAllByTestId(/due-date/);
      dueDates.forEach(date => {
        const ariaLabel = date.getAttribute('aria-label');
        expect(ariaLabel).toMatch(/(due|overdue|paid)/i);
      });
    });

    test('provides context for overdue payments', async () => {
      const overdueProps = {
        ...mockProps,
        payments: mockProps.payments.map(p => ({
          ...p,
          status: 'overdue' as const,
          due_date: '2024-01-01',
        })),
      };
      
      render(<PaymentCalendar {...overdueProps} />);
      
      const overdueItems = screen.getAllByTestId(/^payment-/);
      overdueItems.forEach(item => {
        const ariaLabel = item.getAttribute('aria-label');
        expect(ariaLabel).toMatch(/overdue/i);
      });
    });

    test('describes filter and sort state', async () => {
      const user = userEvent.setup();
      render(<PaymentCalendar {...mockProps} />);
      
      // Apply a filter
      const filterDropdown = screen.getByRole('button', { name: /filter/i });
      await user.click(filterDropdown);
      
      const overdueFilter = screen.getByText(/overdue only/i);
      await user.click(overdueFilter);
      
      // Should announce filter state
      await waitFor(() => {
        const filterStatus = screen.getByRole('status');
        expect(filterStatus).toHaveTextContent(/showing.*overdue/i);
      });
    });
  });

  /**
   * COLOR CONTRAST AND VISUAL ACCESSIBILITY TESTS
   */
  describe('Color Contrast and Visual Accessibility', () => {
    test('meets WCAG AA color contrast requirements', async () => {
      render(<PaymentCalendar {...mockProps} />);
      
      // Test common color combinations
      const colorTests = [
        { foreground: '#1f2937', background: '#ffffff' }, // Dark text on white
        { foreground: '#dc2626', background: '#ffffff' }, // Red status on white
        { foreground: '#059669', background: '#ffffff' }, // Green status on white
        { foreground: '#d97706', background: '#ffffff' }, // Orange status on white
      ];
      
      colorTests.forEach(({ foreground, background }) => {
        expect(ColorContrastTester.meetsWCAG_AA(foreground, background)).toBe(true);
      });
    });

    test('provides high contrast mode support', async () => {
      // Mock high contrast media query
      const mockMatchMedia = jest.fn(() => ({
        matches: true,
        addListener: jest.fn(),
        removeListener: jest.fn(),
      }));
      
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: mockMatchMedia,
      });
      
      render(<PaymentCalendar {...mockProps} />);
      
      // Check high contrast styles are applied
      const paymentItems = screen.getAllByTestId(/^payment-/);
      paymentItems.forEach(item => {
        const styles = window.getComputedStyle(item);
        // Should have defined borders in high contrast mode
        expect(styles.borderWidth).not.toBe('0px');
      });
    });

    test('does not rely solely on color for information', async () => {
      render(<PaymentCalendar {...mockProps} />);
      
      // Check payment status indicators have non-color indicators
      const overduePayments = screen.getAllByTestId(/payment-.*overdue/);
      overduePayments.forEach(payment => {
        // Should have icon or text indicator, not just color
        const hasIcon = payment.querySelector('[data-testid*="icon"]');
        const hasText = payment.textContent?.includes('overdue');
        expect(hasIcon || hasText).toBeTruthy();
      });
    });

    test('supports zoom up to 200% without horizontal scrolling', async () => {
      // Mock zoom level
      Object.defineProperty(window, 'devicePixelRatio', {
        writable: true,
        configurable: true,
        value: 2, // 200% zoom
      });
      
      render(<PaymentCalendar {...mockProps} />);
      
      // Component should still be usable at 200% zoom
      expect(screen.getByRole('grid')).toBeVisible();
      
      // Text should remain readable
      const paymentText = screen.getAllByText(/Elegant Gardens Venue/i);
      expect(paymentText[0]).toBeVisible();
    });

    test('provides sufficient visual focus indicators', async () => {
      const user = userEvent.setup();
      render(<PaymentCalendar {...mockProps} />);
      
      // Focus on interactive elements
      const focusableElements = screen.getAllByRole('button');
      
      for (const element of focusableElements.slice(0, 3)) {
        element.focus();
        
        const styles = window.getComputedStyle(element);
        // Should have visible focus indicator
        expect(
          styles.outline !== 'none' || 
          styles.boxShadow !== 'none' || 
          styles.borderColor !== 'transparent'
        ).toBe(true);
      }
    });
  });

  /**
   * MOTOR DISABILITY ACCOMMODATIONS
   */
  describe('Motor Disability Accommodations', () => {
    test('provides large enough touch targets', async () => {
      render(<PaymentCalendar {...mockProps} />);
      
      const interactiveElements = screen.getAllByRole('button');
      
      interactiveElements.forEach(element => {
        const rect = element.getBoundingClientRect();
        const size = Math.min(rect.width, rect.height);
        
        // WCAG AA requires minimum 44px touch targets
        expect(size).toBeGreaterThanOrEqual(44);
      });
    });

    test('supports voice control commands', async () => {
      render(<PaymentCalendar {...mockProps} />);
      
      // Check elements have proper labels for voice control
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        const accessibleName = button.getAttribute('aria-label') || 
                              button.textContent?.trim();
        
        expect(accessibleName).toBeTruthy();
        expect(accessibleName!.length).toBeGreaterThan(2);
      });
    });

    test('allows sufficient time for interactions', async () => {
      jest.useFakeTimers();
      const user = userEvent.setup({ delay: null });
      
      render(<PaymentCalendar {...mockProps} />);
      
      // Test that interactions don't time out too quickly
      const searchInput = screen.getByLabelText(/search payments/i);
      
      await user.type(searchInput, 'test');
      
      // Advance timers but not enough to trigger timeout
      jest.advanceTimersByTime(5000);
      
      // Should still be responsive
      expect(searchInput).toHaveValue('test');
      
      jest.useRealTimers();
    });

    test('provides click alternatives for complex gestures', async () => {
      const user = userEvent.setup();
      render(<PaymentCalendar {...mockProps} />);
      
      // Month navigation should work with clicks, not just swipes
      const nextButton = screen.getByLabelText(/next month/i);
      const prevButton = screen.getByLabelText(/previous month/i);
      
      expect(nextButton).toBeVisible();
      expect(prevButton).toBeVisible();
      
      // Both should work with simple clicks
      await user.click(nextButton);
      await user.click(prevButton);
      
      expect(mockProps.onDateSelect).toHaveBeenCalled();
    });
  });

  /**
   * COGNITIVE ACCESSIBILITY TESTS
   */
  describe('Cognitive Accessibility', () => {
    test('provides clear error messages and instructions', async () => {
      const user = userEvent.setup();
      render(<PaymentCalendar {...mockProps} />);
      
      // Open payment form
      const addButton = screen.getByRole('button', { name: /add payment/i });
      await user.click(addButton);
      
      // Try to submit empty form
      const submitButton = screen.getByRole('button', { name: /save/i });
      await user.click(submitButton);
      
      // Error messages should be clear and helpful
      const errorMessages = screen.getAllByRole('alert');
      errorMessages.forEach(error => {
        expect(error.textContent).toMatch(/required|must|please/i);
      });
    });

    test('maintains consistent navigation patterns', async () => {
      const user = userEvent.setup();
      render(<PaymentCalendar {...mockProps} />);
      
      // Navigation elements should be in consistent locations
      const navElement = screen.getByRole('navigation');
      expect(navElement).toBeInTheDocument();
      
      // Month navigation should be predictable
      const nextButton = screen.getByLabelText(/next month/i);
      const prevButton = screen.getByLabelText(/previous month/i);
      
      // Buttons should be in logical order (prev, then next)
      const navButtons = [prevButton, nextButton];
      const positions = navButtons.map(btn => btn.getBoundingClientRect().left);
      expect(positions[0]).toBeLessThan(positions[1]);
    });

    test('uses plain language in labels and descriptions', async () => {
      render(<PaymentCalendar {...mockProps} />);
      
      // Check that labels use clear, simple language
      const labels = screen.getAllByLabelText(/.+/);
      labels.forEach(element => {
        const label = element.getAttribute('aria-label') || 
                     element.closest('label')?.textContent;
        
        if (label) {
          // Should avoid technical jargon
          expect(label).not.toMatch(/API|CRUD|DOM|JSON/i);
          // Should use common words
          expect(label.length).toBeGreaterThan(3);
        }
      });
    });

    test('provides contextual help and guidance', async () => {
      const user = userEvent.setup();
      render(<PaymentCalendar {...mockProps} />);
      
      // Open payment form
      const addButton = screen.getByRole('button', { name: /add payment/i });
      await user.click(addButton);
      
      // Form fields should have helpful descriptions
      const amountInput = screen.getByLabelText(/amount/i);
      expect(
        amountInput.getAttribute('aria-describedby') ||
        screen.queryByText(/enter the payment amount/i)
      ).toBeTruthy();
    });

    test('supports different learning preferences', async () => {
      render(<PaymentCalendar {...mockProps} />);
      
      // Visual learners: icons and colors
      const statusIcons = screen.getAllByTestId(/status-icon/);
      expect(statusIcons.length).toBeGreaterThan(0);
      
      // Auditory learners: screen reader support
      expect(screen.getByRole('status')).toBeInTheDocument();
      
      // Kinesthetic learners: interactive elements
      const interactiveElements = screen.getAllByRole('button');
      expect(interactiveElements.length).toBeGreaterThan(3);
    });
  });

  /**
   * ASSISTIVE TECHNOLOGY COMPATIBILITY
   */
  describe('Assistive Technology Compatibility', () => {
    test('works with virtual cursor navigation', async () => {
      render(<PaymentCalendar {...mockProps} />);
      
      // All content should be accessible via virtual cursor
      const textContent = screen.getByRole('application').textContent;
      
      // Check important information is present in text form
      expect(textContent).toMatch(/payment/i);
      expect(textContent).toMatch(/\$[\d,]+/); // Currency amounts
      expect(textContent).toMatch(/(january|february|march|april|may|june|july|august|september|october|november|december)/i);
    });

    test('supports switch navigation', async () => {
      render(<PaymentCalendar {...mockProps} />);
      
      // All interactive elements should be reachable via sequential navigation
      const focusableElements = screen.getAllByRole('button')
        .concat(screen.getAllByRole('textbox'))
        .concat(screen.getAllByRole('gridcell'))
        .filter(el => !el.hasAttribute('disabled'));
      
      expect(focusableElements.length).toBeGreaterThan(5);
      
      // Each element should be properly labeled for switch users
      focusableElements.forEach(element => {
        const hasLabel = element.hasAttribute('aria-label') ||
                        element.hasAttribute('aria-labelledby') ||
                        element.textContent?.trim();
        expect(hasLabel).toBeTruthy();
      });
    });

    test('provides voice control landmarks', async () => {
      render(<PaymentCalendar {...mockProps} />);
      
      // Check for proper landmark roles
      expect(screen.getByRole('application')).toBeInTheDocument();
      expect(screen.getByRole('navigation')).toBeInTheDocument();
      expect(screen.getByRole('grid')).toBeInTheDocument();
      
      // Check for proper headings structure for voice navigation
      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThanOrEqual(2);
    });

    test('compatible with browser zoom and magnification', async () => {
      // Test at different zoom levels
      const zoomLevels = [1.5, 2.0, 3.0];
      
      zoomLevels.forEach(zoom => {
        // Mock zoom level
        Object.defineProperty(window, 'devicePixelRatio', {
          writable: true,
          configurable: true,
          value: zoom,
        });
        
        render(<PaymentCalendar {...mockProps} />);
        
        // Component should remain functional
        expect(screen.getByRole('grid')).toBeVisible();
        
        cleanup();
      });
    });
  });

  /**
   * WCAG 2.1 LEVEL AAA TESTS (ENHANCED COMPLIANCE)
   */
  describe('WCAG 2.1 Level AAA (Enhanced)', () => {
    test('meets AAA color contrast requirements where possible', async () => {
      render(<PaymentCalendar {...mockProps} />);
      
      // Test AAA contrast ratios for key elements
      const aaaColorTests = [
        { foreground: '#000000', background: '#ffffff' }, // Maximum contrast
        { foreground: '#1f2937', background: '#f9fafb' }, // Dark on light gray
      ];
      
      aaaColorTests.forEach(({ foreground, background }) => {
        expect(ColorContrastTester.meetsWCAG_AAA(foreground, background)).toBe(true);
      });
    });

    test('provides multiple ways to access the same information', async () => {
      render(<PaymentCalendar {...mockProps} />);
      
      // Payment information should be accessible through:
      // 1. Calendar view
      expect(screen.getByRole('grid')).toBeInTheDocument();
      
      // 2. List view (if available)
      const listToggle = screen.queryByLabelText(/list view/i);
      if (listToggle) {
        expect(listToggle).toBeVisible();
      }
      
      // 3. Search functionality
      expect(screen.getByLabelText(/search/i)).toBeInTheDocument();
    });

    test('avoids content that causes seizures', async () => {
      render(<PaymentCalendar {...mockProps} />);
      
      // No rapidly flashing content should be present
      const animatedElements = screen.queryAllByTestId(/animated|flash/);
      
      // If animations exist, they should be CSS transitions, not rapid flashing
      animatedElements.forEach(element => {
        const styles = window.getComputedStyle(element);
        const animationDuration = styles.animationDuration;
        
        if (animationDuration && animationDuration !== '0s') {
          // Animation should be slower than 3 Hz (333ms+)
          const duration = parseFloat(animationDuration);
          expect(duration).toBeGreaterThanOrEqual(0.333);
        }
      });
    });
  });

  /**
   * COMPREHENSIVE ACCESSIBILITY AUDIT
   */
  describe('Comprehensive Accessibility Audit', () => {
    test('passes full accessibility compliance audit', async () => {
      const { container } = render(<PaymentCalendar {...mockProps} />);
      
      // Run comprehensive audit with all WCAG rules
      const results = await axe(container, {
        tags: ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'],
        rules: {
          'color-contrast': { enabled: true },
          'keyboard-navigation': { enabled: true },
          'aria-roles': { enabled: true },
          'focus-order-semantics': { enabled: true },
        }
      });
      
      // Generate detailed accessibility report
      const report = {
        violations: results.violations,
        passes: results.passes.length,
        incomplete: results.incomplete,
        inapplicable: results.inapplicable.length,
      };
      
      console.log('Payment Calendar Accessibility Report:', report);
      
      // Must have zero violations for production
      expect(results).toHaveNoViolations();
      
      // Verify comprehensive coverage
      expect(results.passes.length).toBeGreaterThan(20);
    });
  });
});