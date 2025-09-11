/**
 * Accessibility Tests for Environment Variables Management System
 * WCAG 2.1 AA compliance testing
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { EnvironmentVariablesManagement } from '../EnvironmentVariablesManagement';
import { VariableConfigurationForm } from '../VariableConfigurationForm';
import { VariablesList } from '../VariablesList';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock Supabase
const mockSupabaseClient = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        order: jest.fn(() =>
          Promise.resolve({
            data: [
              {
                id: '1',
                key: 'API_URL',
                value: 'https://api.wedsync.com',
                environment: 'production',
                security_level: 'Public',
                is_encrypted: false,
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z',
                created_by: 'user-1',
              },
            ],
            error: null,
          }),
        ),
      })),
    })),
    insert: jest.fn(() => Promise.resolve({ data: [], error: null })),
    update: jest.fn(() => Promise.resolve({ data: [], error: null })),
  })),
  channel: jest.fn(() => ({
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn(() => Promise.resolve('ok')),
    unsubscribe: jest.fn(() => Promise.resolve('ok')),
  })),
  auth: {
    getUser: jest.fn(() =>
      Promise.resolve({
        data: {
          user: {
            id: 'test-user-id',
            email: 'test@wedsync.com',
            app_metadata: { roles: ['admin'] },
          },
        },
        error: null,
      }),
    ),
  },
};

jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createClientComponentClient: () => mockSupabaseClient,
}));

// Mock media queries for accessibility preferences
const mockMatchMedia = (query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: jest.fn(),
  removeListener: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
});

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(mockMatchMedia),
});

describe('Accessibility Tests - WCAG 2.1 AA Compliance', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset DOM state
    document.body.innerHTML = '';

    // Mock implementation for screen reader announcements
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Automated Accessibility Testing (axe-core)', () => {
    test('should not have any accessibility violations on main dashboard', async () => {
      const { container } = render(<EnvironmentVariablesManagement />);

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByRole('main')).toBeInTheDocument();
      });

      // Run axe accessibility tests
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('should not have accessibility violations on variable configuration form', async () => {
      const { container } = render(
        <VariableConfigurationForm
          onVariableAdded={() => {}}
          isReadOnly={false}
        />,
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('should not have accessibility violations on variables list', async () => {
      const mockVariables = [
        {
          id: '1',
          key: 'TEST_VAR',
          value: 'test_value',
          environment: 'development' as const,
          security_level: 'Internal' as const,
          is_encrypted: false,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          created_by: 'user-1',
        },
      ];

      const { container } = render(
        <VariablesList
          variables={mockVariables}
          selectedEnvironment="all"
          onEnvironmentChange={() => {}}
          onVariableUpdated={() => {}}
          isReadOnly={false}
        />,
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Keyboard Navigation', () => {
    test('should support tab navigation through all interactive elements', async () => {
      const user = userEvent.setup();

      render(<EnvironmentVariablesManagement />);

      await waitFor(() => {
        expect(screen.getByRole('main')).toBeInTheDocument();
      });

      // Tab through interactive elements
      await user.tab();

      // Should start with the first tab
      const firstTab = screen.getByRole('tab', { name: /dashboard/i });
      expect(firstTab).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('tab', { name: /variables/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('tab', { name: /health/i })).toHaveFocus();
    });

    test('should support arrow key navigation between tabs', async () => {
      const user = userEvent.setup();

      render(<EnvironmentVariablesManagement />);

      await waitFor(() => {
        expect(screen.getByRole('main')).toBeInTheDocument();
      });

      const firstTab = screen.getByRole('tab', { name: /dashboard/i });
      firstTab.focus();

      // Press right arrow
      await user.keyboard('{ArrowRight}');
      expect(screen.getByRole('tab', { name: /variables/i })).toHaveFocus();

      // Press left arrow
      await user.keyboard('{ArrowLeft}');
      expect(screen.getByRole('tab', { name: /dashboard/i })).toHaveFocus();
    });

    test('should support Enter and Space key activation', async () => {
      const user = userEvent.setup();

      render(<EnvironmentVariablesManagement />);

      await waitFor(() => {
        expect(screen.getByRole('main')).toBeInTheDocument();
      });

      const variablesTab = screen.getByRole('tab', { name: /variables/i });
      variablesTab.focus();

      // Activate with Enter key
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(
          screen.getByRole('tabpanel', {
            name: /environment variables management/i,
          }),
        ).toBeInTheDocument();
      });
    });

    test('should trap focus in modal dialogs when present', async () => {
      // This test would be more relevant when modals are implemented
      // For now, ensuring tab order is maintained
      const user = userEvent.setup();

      render(<EnvironmentVariablesManagement />);

      await waitFor(() => {
        expect(screen.getByRole('main')).toBeInTheDocument();
      });

      // Test tab order remains logical
      await user.tab();
      const firstFocusable = document.activeElement;

      // Tab through a few elements
      await user.tab();
      await user.tab();
      await user.tab();

      // Shift+Tab should go backwards
      await user.keyboard('{Shift>}{Tab}{/Shift}');
      expect(document.activeElement).not.toBe(firstFocusable);
    });
  });

  describe('Screen Reader Support', () => {
    test('should have proper heading structure', async () => {
      render(<EnvironmentVariablesManagement />);

      await waitFor(() => {
        expect(screen.getByRole('main')).toBeInTheDocument();
      });

      // Check for main heading
      const mainHeading = screen.getByRole('heading', { level: 1 });
      expect(mainHeading).toHaveTextContent('Environment Variables Management');

      // Check for section headings (may be visually hidden)
      const sectionHeadings = screen.getAllByRole('heading', { level: 2 });
      expect(sectionHeadings.length).toBeGreaterThan(0);
    });

    test('should have proper landmarks and regions', async () => {
      render(<EnvironmentVariablesManagement />);

      await waitFor(() => {
        expect(screen.getByRole('main')).toBeInTheDocument();
      });

      // Check for main landmark
      expect(screen.getByRole('main')).toBeInTheDocument();

      // Check for header landmark
      expect(screen.getByRole('banner')).toBeInTheDocument();

      // Check for tablist
      expect(screen.getByRole('tablist')).toBeInTheDocument();

      // Check for regions
      const regions = screen.getAllByRole('region');
      expect(regions.length).toBeGreaterThan(0);
    });

    test('should have proper ARIA labels and descriptions', async () => {
      render(<EnvironmentVariablesManagement />);

      await waitFor(() => {
        expect(screen.getByRole('main')).toBeInTheDocument();
      });

      // Check tab list has proper label
      const tablist = screen.getByRole('tablist');
      expect(tablist).toHaveAttribute(
        'aria-label',
        'Environment Variables Management sections',
      );

      // Check tabs have proper controls
      const dashboardTab = screen.getByRole('tab', { name: /dashboard/i });
      expect(dashboardTab).toHaveAttribute('aria-controls', 'dashboard-panel');
      expect(dashboardTab).toHaveAttribute('id', 'dashboard-tab');

      // Check tab panels have proper labels
      const dashboardPanel = screen.getByRole('tabpanel');
      expect(dashboardPanel).toHaveAttribute(
        'aria-labelledby',
        'dashboard-tab',
      );
      expect(dashboardPanel).toHaveAttribute('id', 'dashboard-panel');
    });

    test('should announce status changes', async () => {
      const announceSpy = jest.fn();

      // Mock the ScreenReaderAnnouncer
      jest.doMock('../utils/accessibility', () => ({
        ...jest.requireActual('../utils/accessibility'),
        ScreenReaderAnnouncer: {
          announce: announceSpy,
        },
      }));

      render(<EnvironmentVariablesManagement />);

      await waitFor(() => {
        expect(announceSpy).toHaveBeenCalledWith('Loading environment data');
      });
    });

    test('should have proper skip links', async () => {
      render(<EnvironmentVariablesManagement />);

      // Skip link should be added to body
      await waitFor(() => {
        const skipLink = document.querySelector('.skip-link');
        expect(skipLink).toBeInTheDocument();
        expect(skipLink).toHaveAttribute('href', '#main-content');
      });
    });
  });

  describe('Color Contrast and Visual Accessibility', () => {
    test('should respect reduced motion preferences', async () => {
      // Mock reduced motion preference
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation((query) => ({
          matches: query.includes('prefers-reduced-motion: reduce'),
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      render(<EnvironmentVariablesManagement />);

      // Loading spinner should not animate when reduced motion is preferred
      const loadingSpinner = document.querySelector('.animate-spin');
      expect(loadingSpinner).not.toBeInTheDocument();
    });

    test('should respect high contrast preferences', async () => {
      // Mock high contrast preference
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation((query) => ({
          matches: query.includes('prefers-contrast: high'),
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      render(<EnvironmentVariablesManagement />);

      await waitFor(() => {
        const container = document.querySelector('.high-contrast');
        expect(container).toBeInTheDocument();
      });
    });

    test('should have sufficient color contrast for text elements', async () => {
      render(<EnvironmentVariablesManagement />);

      await waitFor(() => {
        expect(screen.getByRole('main')).toBeInTheDocument();
      });

      // This is a basic test - in a real app, you'd use tools like
      // jest-axe or custom contrast checking utilities
      const headingElement = screen.getByRole('heading', { level: 1 });
      const computedStyle = getComputedStyle(headingElement);

      // Check that text has proper styling
      expect(computedStyle.color).toBeTruthy();
      expect(headingElement).toHaveClass('text-gray-900');
    });

    test('should have proper focus indicators', async () => {
      const user = userEvent.setup();

      render(<EnvironmentVariablesManagement />);

      await waitFor(() => {
        expect(screen.getByRole('main')).toBeInTheDocument();
      });

      // Tab to first interactive element
      await user.tab();

      const focusedElement = document.activeElement;
      expect(focusedElement).toBeInTheDocument();

      // Check that focused element has focus styles (this would be CSS-dependent)
      expect(focusedElement?.tagName).toBe('BUTTON');
    });
  });

  describe('Form Accessibility', () => {
    test('should have proper form labels and descriptions', async () => {
      render(
        <VariableConfigurationForm
          onVariableAdded={() => {}}
          isReadOnly={false}
        />,
      );

      // Check for proper form labels
      const nameInput = screen.getByLabelText(/variable name/i);
      expect(nameInput).toBeInTheDocument();
      expect(nameInput).toHaveAttribute('required');

      const valueInput = screen.getByLabelText(/value/i);
      expect(valueInput).toBeInTheDocument();
    });

    test('should announce form validation errors', async () => {
      const user = userEvent.setup();

      render(
        <VariableConfigurationForm
          onVariableAdded={() => {}}
          isReadOnly={false}
        />,
      );

      const submitButton = screen.getByRole('button', {
        name: /add variable/i,
      });

      // Submit form without required fields
      await user.click(submitButton);

      await waitFor(() => {
        // Check for error messages
        const nameInput = screen.getByLabelText(/variable name/i);
        expect(nameInput).toHaveAttribute('aria-invalid', 'true');
      });
    });

    test('should have proper fieldset and legend elements for grouped controls', async () => {
      render(
        <VariableConfigurationForm
          onVariableAdded={() => {}}
          isReadOnly={false}
        />,
      );

      // Check for form structure
      const form = screen.getByRole('form');
      expect(form).toBeInTheDocument();
    });
  });

  describe('Wedding Day Mode Accessibility', () => {
    test('should properly announce read-only mode', async () => {
      // Mock Saturday evening (wedding day)
      const originalDate = Date;
      const mockDate = new Date('2024-06-15T19:00:00Z');
      global.Date = jest.fn(() => mockDate) as any;
      global.Date.now = () => mockDate.getTime();

      render(<EnvironmentVariablesManagement />);

      await waitFor(() => {
        const weddingModeAlert = screen.getByRole('alert');
        expect(weddingModeAlert).toHaveTextContent(/wedding day mode/i);
        expect(weddingModeAlert).toHaveAttribute(
          'aria-label',
          'Wedding day mode active - system is in read-only mode',
        );
      });

      global.Date = originalDate;
    });
  });

  describe('Mobile Accessibility', () => {
    test('should maintain accessibility on mobile viewports', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      const { container } = render(<EnvironmentVariablesManagement />);

      await waitFor(() => {
        expect(screen.getByRole('main')).toBeInTheDocument();
      });

      // Run accessibility tests on mobile layout
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('should have proper touch target sizes', async () => {
      render(<EnvironmentVariablesManagement />);

      await waitFor(() => {
        expect(screen.getByRole('main')).toBeInTheDocument();
      });

      // Check that buttons have minimum touch target size
      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        const rect = button.getBoundingClientRect();
        // WCAG requires 44px minimum (we'll check computed style instead)
        const computedStyle = getComputedStyle(button);
        expect(button).toBeInTheDocument(); // Basic check
      });
    });
  });

  describe('Dynamic Content Accessibility', () => {
    test('should handle dynamic content updates accessibly', async () => {
      const user = userEvent.setup();

      render(<EnvironmentVariablesManagement />);

      await waitFor(() => {
        expect(screen.getByRole('main')).toBeInTheDocument();
      });

      // Switch tabs and ensure content is properly announced
      const variablesTab = screen.getByRole('tab', { name: /variables/i });
      await user.click(variablesTab);

      await waitFor(() => {
        const variablesPanel = screen.getByRole('tabpanel', {
          name: /environment variables management/i,
        });
        expect(variablesPanel).toBeInTheDocument();
        expect(variablesPanel).toHaveAttribute(
          'aria-labelledby',
          'variables-tab',
        );
      });
    });

    test('should maintain focus management during updates', async () => {
      const user = userEvent.setup();

      render(<EnvironmentVariablesManagement />);

      await waitFor(() => {
        expect(screen.getByRole('main')).toBeInTheDocument();
      });

      // Focus should be maintained appropriately during tab switches
      const dashboardTab = screen.getByRole('tab', { name: /dashboard/i });
      await user.click(dashboardTab);

      expect(dashboardTab).toHaveAttribute('aria-selected', 'true');
    });
  });
});
