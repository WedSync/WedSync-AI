import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';

import { TouchableReportCards } from '../TouchableReportCards';
import { ReportData, WeddingVendorType } from '../../types';

// Mock dependencies
vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => (
      <button {...props}>{children}</button>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock('react-window', () => ({
  FixedSizeList: ({ children, itemCount, itemSize }: any) => (
    <div data-testid="virtual-list" data-item-count={itemCount}>
      {Array.from({ length: Math.min(itemCount, 10) }, (_, i) => (
        <div key={i} style={{ height: itemSize }}>
          {children({ index: i, style: { height: itemSize } })}
        </div>
      ))}
    </div>
  ),
}));

describe('TouchableReportCards', () => {
  const mockReports: ReportData[] = [
    {
      id: 'report-1',
      template: {
        id: 'template-1',
        name: 'Wedding Revenue Report',
        description: 'Monthly revenue analysis',
        category: 'financial',
        sections: [],
        layout: { columns: 1, spacing: 'medium', responsive: true },
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
        tags: ['revenue'],
      },
      data: {
        'revenue-section': [{ month: 'January', revenue: 15000, bookings: 5 }],
      },
      metadata: {
        generatedAt: new Date('2024-01-20'),
        totalRecords: 50,
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31'),
        },
      },
      filters: [],
      vendorType: 'photographer',
      subscriptionTier: 'PROFESSIONAL',
    },
    {
      id: 'report-2',
      template: {
        id: 'template-2',
        name: 'Booking Trends',
        description: 'Wedding booking patterns',
        category: 'performance',
        sections: [],
        layout: { columns: 1, spacing: 'medium', responsive: true },
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
        tags: ['bookings'],
      },
      data: {
        'bookings-section': [{ date: '2024-01-01', bookings: 3 }],
      },
      metadata: {
        generatedAt: new Date('2024-01-20'),
        totalRecords: 30,
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31'),
        },
      },
      filters: [],
      vendorType: 'photographer',
      subscriptionTier: 'PROFESSIONAL',
    },
  ];

  const defaultProps = {
    reports: mockReports,
    onCardPress: vi.fn(),
    onCardLongPress: vi.fn(),
    onSwipeDelete: vi.fn(),
    onSwipeShare: vi.fn(),
    onRefresh: vi.fn(),
    loading: false,
    className: 'test-cards',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock touch events
    global.ontouchstart = vi.fn();

    // Mock IntersectionObserver
    global.IntersectionObserver = vi.fn().mockImplementation((callback) => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    }));
  });

  describe('Card Rendering', () => {
    it('renders report cards with touch-friendly layout', () => {
      render(<TouchableReportCards {...defaultProps} />);

      expect(screen.getByTestId('touchable-report-cards')).toBeInTheDocument();
      expect(screen.getByText('Wedding Revenue Report')).toBeInTheDocument();
      expect(screen.getByText('Booking Trends')).toBeInTheDocument();
    });

    it('displays card metadata and preview', () => {
      render(<TouchableReportCards {...defaultProps} />);

      expect(screen.getByText('Monthly revenue analysis')).toBeInTheDocument();
      expect(screen.getByText('Generated Jan 20, 2024')).toBeInTheDocument();
      expect(screen.getByText('50 records')).toBeInTheDocument();
    });

    it('shows vendor-specific styling', () => {
      render(<TouchableReportCards {...defaultProps} />);

      const cards = screen.getAllByTestId(/report-card-/);
      cards.forEach((card) => {
        expect(card).toHaveClass('vendor-photographer');
        expect(card).toHaveStyle('border-color: #c59d6c');
      });
    });

    it('applies subscription tier indicators', () => {
      render(<TouchableReportCards {...defaultProps} />);

      expect(screen.getAllByTestId('tier-badge')).toHaveLength(2);
      expect(screen.getAllByText('PRO')).toHaveLength(2);
    });
  });

  describe('Touch Interactions', () => {
    it('handles card tap gestures', () => {
      render(<TouchableReportCards {...defaultProps} />);

      const firstCard = screen.getByTestId('report-card-report-1');
      fireEvent.click(firstCard);

      expect(defaultProps.onCardPress).toHaveBeenCalledWith(mockReports[0]);
    });

    it('handles card long press for context menu', async () => {
      render(<TouchableReportCards {...defaultProps} />);

      const firstCard = screen.getByTestId('report-card-report-1');

      // Simulate long press
      fireEvent.touchStart(firstCard);
      await new Promise((resolve) => setTimeout(resolve, 600)); // Long press duration
      fireEvent.touchEnd(firstCard);

      await waitFor(() => {
        expect(defaultProps.onCardLongPress).toHaveBeenCalledWith(
          mockReports[0],
        );
      });
    });

    it('implements swipe gestures for actions', () => {
      render(<TouchableReportCards {...defaultProps} />);

      const firstCard = screen.getByTestId('report-card-report-1');

      // Simulate swipe right for share
      fireEvent.touchStart(firstCard, {
        touches: [{ clientX: 50, clientY: 100 }],
      });
      fireEvent.touchMove(firstCard, {
        touches: [{ clientX: 200, clientY: 100 }],
      });
      fireEvent.touchEnd(firstCard);

      expect(screen.getByTestId('swipe-actions-share')).toBeInTheDocument();
    });

    it('handles swipe left for delete action', () => {
      render(<TouchableReportCards {...defaultProps} />);

      const firstCard = screen.getByTestId('report-card-report-1');

      // Simulate swipe left for delete
      fireEvent.touchStart(firstCard, {
        touches: [{ clientX: 200, clientY: 100 }],
      });
      fireEvent.touchMove(firstCard, {
        touches: [{ clientX: 50, clientY: 100 }],
      });
      fireEvent.touchEnd(firstCard);

      expect(screen.getByTestId('swipe-actions-delete')).toBeInTheDocument();

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      fireEvent.click(deleteButton);

      expect(defaultProps.onSwipeDelete).toHaveBeenCalledWith(mockReports[0]);
    });

    it('provides haptic feedback for interactions', () => {
      const mockVibrate = vi.fn();
      navigator.vibrate = mockVibrate;

      render(<TouchableReportCards {...defaultProps} />);

      const firstCard = screen.getByTestId('report-card-report-1');
      fireEvent.click(firstCard);

      expect(mockVibrate).toHaveBeenCalledWith(30);
    });
  });

  describe('Swipe Actions', () => {
    it('shows share action on right swipe', () => {
      render(<TouchableReportCards {...defaultProps} />);

      const firstCard = screen.getByTestId('report-card-report-1');

      // Trigger right swipe
      fireEvent.touchStart(firstCard, {
        touches: [{ clientX: 50, clientY: 100 }],
      });
      fireEvent.touchMove(firstCard, {
        touches: [{ clientX: 150, clientY: 100 }],
      });

      expect(screen.getByTestId('share-action')).toBeInTheDocument();
      expect(screen.getByText('Share')).toBeInTheDocument();
    });

    it('shows delete action on left swipe', () => {
      render(<TouchableReportCards {...defaultProps} />);

      const firstCard = screen.getByTestId('report-card-report-1');

      // Trigger left swipe
      fireEvent.touchStart(firstCard, {
        touches: [{ clientX: 150, clientY: 100 }],
      });
      fireEvent.touchMove(firstCard, {
        touches: [{ clientX: 50, clientY: 100 }],
      });

      expect(screen.getByTestId('delete-action')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });

    it('resets card position after incomplete swipe', () => {
      render(<TouchableReportCards {...defaultProps} />);

      const firstCard = screen.getByTestId('report-card-report-1');

      // Start swipe but don't complete threshold
      fireEvent.touchStart(firstCard, {
        touches: [{ clientX: 100, clientY: 100 }],
      });
      fireEvent.touchMove(firstCard, {
        touches: [{ clientX: 120, clientY: 100 }],
      }); // Small movement
      fireEvent.touchEnd(firstCard);

      // Card should return to original position
      expect(firstCard).toHaveStyle('transform: translateX(0px)');
    });

    it('prevents swipe on disabled cards', () => {
      const disabledReports = mockReports.map((report) => ({
        ...report,
        subscriptionTier: 'FREE' as const,
      }));

      render(
        <TouchableReportCards {...defaultProps} reports={disabledReports} />,
      );

      const firstCard = screen.getByTestId('report-card-report-1');

      fireEvent.touchStart(firstCard, {
        touches: [{ clientX: 100, clientY: 100 }],
      });
      fireEvent.touchMove(firstCard, {
        touches: [{ clientX: 200, clientY: 100 }],
      });

      expect(screen.queryByTestId('swipe-actions')).not.toBeInTheDocument();
    });
  });

  describe('Virtual Scrolling', () => {
    it('implements virtual scrolling for large lists', () => {
      const manyReports = Array.from({ length: 1000 }, (_, i) => ({
        ...mockReports[0],
        id: `report-${i}`,
        template: { ...mockReports[0].template, name: `Report ${i}` },
      }));

      render(<TouchableReportCards {...defaultProps} reports={manyReports} />);

      expect(screen.getByTestId('virtual-list')).toBeInTheDocument();
      expect(screen.getByTestId('virtual-list')).toHaveAttribute(
        'data-item-count',
        '1000',
      );
    });

    it('optimizes rendering for mobile performance', () => {
      render(<TouchableReportCards {...defaultProps} />);

      // Should use lazy loading for card images
      const cardImages = screen.getAllByTestId(/card-thumbnail/);
      cardImages.forEach((img) => {
        expect(img).toHaveAttribute('loading', 'lazy');
      });
    });
  });

  describe('Pull-to-Refresh', () => {
    it('implements pull-to-refresh gesture', () => {
      render(<TouchableReportCards {...defaultProps} />);

      const container = screen.getByTestId('touchable-report-cards');

      // Simulate pull-to-refresh
      fireEvent.touchStart(container, {
        touches: [{ clientX: 100, clientY: 50 }],
      });
      fireEvent.touchMove(container, {
        touches: [{ clientX: 100, clientY: 150 }],
      });
      fireEvent.touchEnd(container);

      expect(screen.getByTestId('refresh-indicator')).toBeInTheDocument();
      expect(defaultProps.onRefresh).toHaveBeenCalled();
    });

    it('shows refresh animation during reload', () => {
      render(<TouchableReportCards {...defaultProps} loading />);

      expect(screen.getByTestId('refresh-spinner')).toBeInTheDocument();
      expect(screen.getByText(/refreshing/i)).toBeInTheDocument();
    });

    it('prevents multiple simultaneous refreshes', () => {
      render(<TouchableReportCards {...defaultProps} loading />);

      const container = screen.getByTestId('touchable-report-cards');

      // Try to trigger refresh while already loading
      fireEvent.touchStart(container, {
        touches: [{ clientX: 100, clientY: 50 }],
      });
      fireEvent.touchMove(container, {
        touches: [{ clientX: 100, clientY: 150 }],
      });
      fireEvent.touchEnd(container);

      expect(defaultProps.onRefresh).not.toHaveBeenCalled();
    });
  });

  describe('Card States', () => {
    it('shows loading state for generating reports', () => {
      const loadingReports = [
        {
          ...mockReports[0],
          metadata: {
            ...mockReports[0].metadata,
            isGenerating: true,
            progress: 65,
          },
        },
      ];

      render(
        <TouchableReportCards {...defaultProps} reports={loadingReports} />,
      );

      expect(screen.getByTestId('generation-progress')).toBeInTheDocument();
      expect(screen.getByText('65%')).toBeInTheDocument();
    });

    it('displays error state for failed reports', () => {
      const errorReports = [
        {
          ...mockReports[0],
          metadata: {
            ...mockReports[0].metadata,
            error: 'Failed to generate report',
          },
        },
      ];

      render(<TouchableReportCards {...defaultProps} reports={errorReports} />);

      expect(screen.getByTestId('error-indicator')).toBeInTheDocument();
      expect(screen.getByText('Failed to generate report')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /retry/i }),
      ).toBeInTheDocument();
    });

    it('shows premium upgrade prompt for free tier', () => {
      const freeReports = [
        {
          ...mockReports[0],
          subscriptionTier: 'FREE' as const,
        },
      ];

      render(<TouchableReportCards {...defaultProps} reports={freeReports} />);

      expect(screen.getByText(/upgrade to professional/i)).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /upgrade/i }),
      ).toBeInTheDocument();
    });
  });

  describe('Wedding Industry Features', () => {
    it('shows seasonal indicators for wedding reports', () => {
      // Mock peak season
      vi.setSystemTime(new Date('2024-06-15'));

      render(<TouchableReportCards {...defaultProps} />);

      expect(screen.getByTestId('seasonal-indicator')).toBeInTheDocument();
      expect(screen.getByText(/peak season/i)).toBeInTheDocument();
    });

    it('displays vendor-specific metrics', () => {
      render(<TouchableReportCards {...defaultProps} />);

      expect(screen.getByText(/photographer insights/i)).toBeInTheDocument();
      expect(screen.getByText(/£15,000 revenue/i)).toBeInTheDocument();
    });

    it('shows wedding day protection notice', () => {
      // Mock Saturday (wedding day)
      const mockSaturday = new Date('2024-06-15'); // A Saturday
      vi.setSystemTime(mockSaturday);

      render(<TouchableReportCards {...defaultProps} />);

      expect(screen.getByTestId('wedding-day-notice')).toBeInTheDocument();
      expect(screen.getByText(/wedding day mode active/i)).toBeInTheDocument();
    });

    it('formats currency in GBP for UK market', () => {
      render(<TouchableReportCards {...defaultProps} />);

      expect(screen.getByText('£15,000')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('provides proper ARIA labels for screen readers', () => {
      render(<TouchableReportCards {...defaultProps} />);

      const firstCard = screen.getByTestId('report-card-report-1');
      expect(firstCard).toHaveAttribute('role', 'button');
      expect(firstCard).toHaveAttribute(
        'aria-label',
        'Wedding Revenue Report, Monthly revenue analysis, Generated January 20, 2024',
      );
    });

    it('supports keyboard navigation', () => {
      render(<TouchableReportCards {...defaultProps} />);

      const cards = screen.getAllByRole('button');
      cards.forEach((card, index) => {
        expect(card).toHaveAttribute('tabIndex', '0');
      });
    });

    it('announces card actions to screen readers', () => {
      render(<TouchableReportCards {...defaultProps} />);

      const firstCard = screen.getByTestId('report-card-report-1');
      fireEvent.focus(firstCard);

      expect(screen.getByRole('status')).toHaveTextContent(
        'Swipe left to delete, swipe right to share',
      );
    });

    it('provides high contrast mode support', () => {
      Object.defineProperty(window, 'matchMedia', {
        value: vi.fn(() => ({
          matches: true,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        })),
      });

      render(<TouchableReportCards {...defaultProps} />);

      expect(screen.getByTestId('touchable-report-cards')).toHaveClass(
        'high-contrast',
      );
    });
  });

  describe('Performance Optimization', () => {
    it('implements lazy loading for card thumbnails', () => {
      render(<TouchableReportCards {...defaultProps} />);

      const thumbnails = screen.getAllByTestId(/card-thumbnail/);
      thumbnails.forEach((thumbnail) => {
        expect(thumbnail).toHaveAttribute('loading', 'lazy');
      });
    });

    it('uses intersection observer for viewport optimization', () => {
      render(<TouchableReportCards {...defaultProps} />);

      expect(global.IntersectionObserver).toHaveBeenCalled();
    });

    it('debounces rapid touch interactions', async () => {
      render(<TouchableReportCards {...defaultProps} />);

      const firstCard = screen.getByTestId('report-card-report-1');

      // Rapid taps
      fireEvent.click(firstCard);
      fireEvent.click(firstCard);
      fireEvent.click(firstCard);

      await waitFor(() => {
        expect(defaultProps.onCardPress).toHaveBeenCalledTimes(1);
      });
    });
  });
});
