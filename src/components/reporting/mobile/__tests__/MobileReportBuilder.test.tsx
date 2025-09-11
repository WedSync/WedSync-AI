import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';

import { MobileReportBuilder } from '../MobileReportBuilder';
import { ReportTemplate, WeddingVendorType } from '../../types';

// Mock dependencies
vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => (
      <button {...props}>{children}</button>
    ),
    form: ({ children, ...props }: any) => <form {...props}>{children}</form>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock('react-hook-form', () => ({
  useForm: () => ({
    register: vi.fn(),
    handleSubmit: vi.fn((fn) => fn),
    formState: { errors: {}, isValid: true },
    watch: vi.fn(),
    setValue: vi.fn(),
    getValues: vi.fn(() => ({})),
  }),
}));

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dnd-context">{children}</div>
  ),
  useDraggable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
  }),
  useDroppable: () => ({
    setNodeRef: vi.fn(),
    isOver: false,
  }),
}));

describe('MobileReportBuilder', () => {
  const mockTemplate: ReportTemplate = {
    id: 'test-template',
    name: 'Wedding Revenue Report',
    description: 'Revenue analytics for wedding vendors',
    category: 'financial',
    sections: [
      {
        id: 'revenue-section',
        type: 'chart',
        title: 'Monthly Revenue',
        chartType: 'bar',
        position: 0,
        config: {
          showLegend: true,
          showTooltip: true,
        },
      },
    ],
    layout: {
      columns: 1,
      spacing: 'medium',
      responsive: true,
    },
    style: {
      theme: 'wedding',
      colors: {
        primary: '#c59d6c',
        secondary: '#8b6f47',
        accent: '#d4af37',
      },
    },
    isPublic: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
    tags: ['revenue', 'wedding', 'analytics'],
  };

  const defaultProps = {
    template: mockTemplate,
    vendorType: 'photographer' as WeddingVendorType,
    onSave: vi.fn(),
    onCancel: vi.fn(),
    onPreview: vi.fn(),
    className: 'test-mobile-builder',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock touch events
    global.ontouchstart = vi.fn();
  });

  describe('Mobile Interface', () => {
    it('renders mobile-optimized layout', () => {
      render(<MobileReportBuilder {...defaultProps} />);

      expect(screen.getByTestId('mobile-report-builder')).toBeInTheDocument();
      expect(screen.getByText('Wedding Revenue Report')).toBeInTheDocument();
    });

    it('displays touch-friendly controls', () => {
      render(<MobileReportBuilder {...defaultProps} />);

      const touchControls = screen.getAllByTestId(/touch-/);
      expect(touchControls.length).toBeGreaterThan(0);

      // Check minimum touch target size (48x48px)
      touchControls.forEach((control) => {
        const styles = getComputedStyle(control);
        expect(parseInt(styles.minWidth)).toBeGreaterThanOrEqual(48);
        expect(parseInt(styles.minHeight)).toBeGreaterThanOrEqual(48);
      });
    });

    it('shows bottom navigation for thumb reach', () => {
      render(<MobileReportBuilder {...defaultProps} />);

      const bottomNav = screen.getByTestId('bottom-navigation');
      expect(bottomNav).toBeInTheDocument();

      const saveButton = screen.getByRole('button', { name: /save/i });
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      const previewButton = screen.getByRole('button', { name: /preview/i });

      expect(saveButton).toBeInTheDocument();
      expect(cancelButton).toBeInTheDocument();
      expect(previewButton).toBeInTheDocument();
    });
  });

  describe('Touch Interactions', () => {
    it('handles section reordering via touch drag', async () => {
      render(<MobileReportBuilder {...defaultProps} />);

      const dragHandle = screen.getByTestId('section-drag-handle-0');

      // Simulate touch drag
      fireEvent.touchStart(dragHandle, {
        touches: [{ clientX: 100, clientY: 100 }],
      });
      fireEvent.touchMove(dragHandle, {
        touches: [{ clientX: 100, clientY: 200 }],
      });
      fireEvent.touchEnd(dragHandle);

      expect(screen.getByTestId('dnd-context')).toBeInTheDocument();
    });

    it('implements haptic feedback for interactions', () => {
      const mockVibrate = vi.fn();
      navigator.vibrate = mockVibrate;

      render(<MobileReportBuilder {...defaultProps} />);

      const addButton = screen.getByRole('button', { name: /add section/i });
      fireEvent.click(addButton);

      expect(mockVibrate).toHaveBeenCalledWith(50);
    });

    it('handles swipe gestures for section management', () => {
      render(<MobileReportBuilder {...defaultProps} />);

      const section = screen.getByTestId('report-section-0');

      // Simulate swipe left
      fireEvent.touchStart(section, {
        touches: [{ clientX: 200, clientY: 100 }],
      });
      fireEvent.touchMove(section, {
        touches: [{ clientX: 50, clientY: 100 }],
      });
      fireEvent.touchEnd(section);

      // Should show delete option
      expect(screen.getByTestId('swipe-actions')).toBeInTheDocument();
    });
  });

  describe('Auto-save Functionality', () => {
    it('auto-saves form data every 30 seconds', async () => {
      vi.useFakeTimers();
      render(<MobileReportBuilder {...defaultProps} />);

      const titleInput = screen.getByLabelText(/report title/i);
      fireEvent.change(titleInput, { target: { value: 'Updated Report' } });

      // Fast-forward 30 seconds
      act(() => {
        vi.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        expect(defaultProps.onSave).toHaveBeenCalled();
      });

      vi.useRealTimers();
    });

    it('shows auto-save indicator', async () => {
      render(<MobileReportBuilder {...defaultProps} />);

      const titleInput = screen.getByLabelText(/report title/i);
      fireEvent.change(titleInput, { target: { value: 'Test Update' } });

      await waitFor(() => {
        expect(screen.getByTestId('auto-save-indicator')).toBeInTheDocument();
        expect(screen.getByText(/saving/i)).toBeInTheDocument();
      });
    });

    it('handles auto-save errors gracefully', async () => {
      const onSaveError = vi.fn().mockRejectedValue(new Error('Save failed'));
      render(<MobileReportBuilder {...defaultProps} onSave={onSaveError} />);

      const titleInput = screen.getByLabelText(/report title/i);
      fireEvent.change(titleInput, { target: { value: 'Test Update' } });

      await waitFor(() => {
        expect(screen.getByText(/failed to save/i)).toBeInTheDocument();
        expect(
          screen.getByRole('button', { name: /retry/i }),
        ).toBeInTheDocument();
      });
    });
  });

  describe('Form Validation', () => {
    it('validates required fields on mobile', () => {
      render(<MobileReportBuilder {...defaultProps} />);

      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      expect(screen.getByText(/report title is required/i)).toBeInTheDocument();
    });

    it('shows inline validation errors', () => {
      render(<MobileReportBuilder {...defaultProps} />);

      const titleInput = screen.getByLabelText(/report title/i);
      fireEvent.blur(titleInput); // Trigger validation

      expect(screen.getByText(/title is required/i)).toBeInTheDocument();
      expect(titleInput).toHaveClass('error');
    });
  });

  describe('Responsive Behavior', () => {
    it('adapts to portrait orientation', () => {
      // Mock portrait orientation
      Object.defineProperty(screen, 'orientation', {
        writable: true,
        configurable: true,
        value: { angle: 0 },
      });

      render(<MobileReportBuilder {...defaultProps} />);

      expect(screen.getByTestId('mobile-report-builder')).toHaveClass(
        'portrait-layout',
      );
    });

    it('adapts to landscape orientation', () => {
      // Mock landscape orientation
      Object.defineProperty(screen, 'orientation', {
        writable: true,
        configurable: true,
        value: { angle: 90 },
      });

      render(<MobileReportBuilder {...defaultProps} />);

      expect(screen.getByTestId('mobile-report-builder')).toHaveClass(
        'landscape-layout',
      );
    });

    it('handles keyboard appearance', () => {
      render(<MobileReportBuilder {...defaultProps} />);

      const titleInput = screen.getByLabelText(/report title/i);
      fireEvent.focus(titleInput);

      // Simulate visual viewport change (keyboard appearance)
      act(() => {
        global.dispatchEvent(new Event('resize'));
      });

      expect(screen.getByTestId('mobile-report-builder')).toHaveClass(
        'keyboard-active',
      );
    });
  });

  describe('Wedding Industry Features', () => {
    it('includes wedding-specific report templates', () => {
      render(<MobileReportBuilder {...defaultProps} />);

      const templateSelector = screen.getByTestId('template-selector');
      fireEvent.click(templateSelector);

      expect(screen.getByText(/wedding revenue/i)).toBeInTheDocument();
      expect(screen.getByText(/booking trends/i)).toBeInTheDocument();
      expect(screen.getByText(/seasonal analysis/i)).toBeInTheDocument();
    });

    it('applies vendor-specific configurations', () => {
      render(
        <MobileReportBuilder {...defaultProps} vendorType="photographer" />,
      );

      expect(screen.getByText(/photographer insights/i)).toBeInTheDocument();
      expect(screen.getByText(/photo delivery metrics/i)).toBeInTheDocument();
    });

    it('shows seasonal optimization hints', () => {
      // Mock peak season date
      vi.setSystemTime(new Date('2024-06-15')); // Peak wedding season

      render(<MobileReportBuilder {...defaultProps} />);

      expect(screen.getByText(/peak season optimization/i)).toBeInTheDocument();
      expect(
        screen.getByText(/include seasonal comparisons/i),
      ).toBeInTheDocument();
    });
  });

  describe('Performance on Mobile', () => {
    it('uses efficient rendering for large section lists', () => {
      const largeTemplate = {
        ...mockTemplate,
        sections: Array.from({ length: 50 }, (_, i) => ({
          id: `section-${i}`,
          type: 'chart' as const,
          title: `Section ${i}`,
          chartType: 'bar' as const,
          position: i,
          config: {},
        })),
      };

      render(
        <MobileReportBuilder {...defaultProps} template={largeTemplate} />,
      );

      expect(screen.getByTestId('virtual-section-list')).toBeInTheDocument();
    });

    it('implements lazy loading for section configurations', () => {
      render(<MobileReportBuilder {...defaultProps} />);

      const configPanel = screen.getByTestId('section-config-panel');
      expect(configPanel).toHaveAttribute('data-lazy', 'true');
    });
  });

  describe('Accessibility on Mobile', () => {
    it('provides screen reader announcements', () => {
      render(<MobileReportBuilder {...defaultProps} />);

      const liveRegion = screen.getByRole('status');
      expect(liveRegion).toHaveAttribute('aria-live', 'polite');
    });

    it('supports voice control navigation', () => {
      render(<MobileReportBuilder {...defaultProps} />);

      const sections = screen.getAllByRole('button');
      sections.forEach((section, index) => {
        expect(section).toHaveAttribute('aria-label');
        expect(section).toHaveAttribute('tabIndex', index === 0 ? '0' : '-1');
      });
    });

    it('provides high contrast support', () => {
      // Mock high contrast media query
      Object.defineProperty(window, 'matchMedia', {
        value: vi.fn(() => ({
          matches: true,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        })),
      });

      render(<MobileReportBuilder {...defaultProps} />);

      expect(screen.getByTestId('mobile-report-builder')).toHaveClass(
        'high-contrast',
      );
    });
  });

  describe('Error Handling', () => {
    it('recovers from component errors', () => {
      const ErrorBoundary = ({ children }: { children: React.ReactNode }) => {
        try {
          return <>{children}</>;
        } catch (error) {
          return <div data-testid="error-boundary">Error occurred</div>;
        }
      };

      render(
        <ErrorBoundary>
          <MobileReportBuilder {...defaultProps} />
        </ErrorBoundary>,
      );

      expect(screen.queryByTestId('error-boundary')).not.toBeInTheDocument();
    });

    it('handles network connectivity issues', () => {
      // Mock offline state
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      render(<MobileReportBuilder {...defaultProps} />);

      expect(screen.getByText(/working offline/i)).toBeInTheDocument();
      expect(screen.getByTestId('offline-indicator')).toBeInTheDocument();
    });
  });
});
