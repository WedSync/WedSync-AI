/**
 * WS-245: Touch Budget Allocation Tests
 * Comprehensive tests for gesture-based budget allocation functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { jest } from '@jest/globals';
import userEvent from '@testing-library/user-event';
import { TouchBudgetAllocation } from '@/components/mobile/budget/TouchBudgetAllocation';

// Mock motion components
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => children,
  useDragControls: () => ({
    start: jest.fn(),
  }),
  useMotionValue: (initial: number) => ({
    get: () => initial,
    set: jest.fn(),
    on: jest.fn(),
  }),
}));

// Mock vibration API
Object.defineProperty(navigator, 'vibrate', {
  value: jest.fn(),
  writable: true
});

const mockCategories = [
  {
    id: 'cat-1',
    name: 'Venue',
    allocated: 20000,
    spent: 18000,
    color: '#3B82F6',
    priority: 1,
    isDefault: true
  },
  {
    id: 'cat-2',
    name: 'Photography',
    allocated: 8000,
    spent: 7500,
    color: '#10B981',
    priority: 2,
    isDefault: true
  },
  {
    id: 'cat-3',
    name: 'Catering',
    allocated: 15000,
    spent: 12000,
    color: '#F59E0B',
    priority: 3,
    isDefault: true
  },
  {
    id: 'cat-4',
    name: 'Flowers',
    allocated: 5000,
    spent: 2000,
    color: '#EC4899',
    priority: 4,
    isDefault: true
  }
];

const defaultProps = {
  categories: mockCategories,
  totalBudget: 50000,
  onCategoriesUpdate: jest.fn(),
  gestureEnabled: true,
  hapticFeedback: true
};

describe('TouchBudgetAllocation', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    jest.clearAllMocks();
  });

  describe('Rendering and Layout', () => {
    test('renders all budget categories with correct information', () => {
      render(<TouchBudgetAllocation {...defaultProps} />);
      
      expect(screen.getByTestId('touch-budget-allocation')).toBeInTheDocument();
      
      mockCategories.forEach(category => {
        expect(screen.getByText(category.name)).toBeInTheDocument();
        expect(screen.getByText(`£${category.allocated.toLocaleString()}.00`)).toBeInTheDocument();
      });
    });

    test('displays budget allocation percentages correctly', () => {
      render(<TouchBudgetAllocation {...defaultProps} />);
      
      // Venue: £20,000 / £50,000 = 40%
      expect(screen.getByText('40%')).toBeInTheDocument();
      // Photography: £8,000 / £50,000 = 16%
      expect(screen.getByText('16%')).toBeInTheDocument();
      // Catering: £15,000 / £50,000 = 30%
      expect(screen.getByText('30%')).toBeInTheDocument();
      // Flowers: £5,000 / £50,000 = 10%
      expect(screen.getByText('10%')).toBeInTheDocument();
    });

    test('shows remaining budget correctly', () => {
      render(<TouchBudgetAllocation {...defaultProps} />);
      
      // Total allocated: £48,000, Total budget: £50,000, Remaining: £2,000
      expect(screen.getByText('£2,000.00 remaining')).toBeInTheDocument();
    });
  });

  describe('Touch Gestures', () => {
    test('handles slider drag to adjust allocation', async () => {
      render(<TouchBudgetAllocation {...defaultProps} />);
      
      const venueSlider = screen.getByTestId('venue-slider');
      
      // Simulate drag to increase venue budget
      fireEvent.touchStart(venueSlider, {
        touches: [{ clientX: 100, clientY: 100 }]
      });
      
      fireEvent.touchMove(venueSlider, {
        touches: [{ clientX: 150, clientY: 100 }]
      });
      
      fireEvent.touchEnd(venueSlider, {
        changedTouches: [{ clientX: 150, clientY: 100 }]
      });
      
      await waitFor(() => {
        expect(defaultProps.onCategoriesUpdate).toHaveBeenCalled();
      });
    });

    test('provides haptic feedback during drag interactions', async () => {
      render(<TouchBudgetAllocation {...defaultProps} />);
      
      const slider = screen.getByTestId('venue-slider');
      
      fireEvent.touchStart(slider, {
        touches: [{ clientX: 100, clientY: 100 }]
      });
      
      fireEvent.touchMove(slider, {
        touches: [{ clientX: 120, clientY: 100 }]
      });
      
      expect(navigator.vibrate).toHaveBeenCalledWith(10);
    });

    test('disables gestures when gestureEnabled is false', () => {
      render(<TouchBudgetAllocation {...defaultProps} gestureEnabled={false} />);
      
      const sliders = screen.getAllByTestId(/.*-slider/);
      
      sliders.forEach(slider => {
        expect(slider).toHaveAttribute('data-gesture-disabled', 'true');
      });
    });

    test('handles pinch gesture for bulk allocation adjustment', async () => {
      render(<TouchBudgetAllocation {...defaultProps} />);
      
      const container = screen.getByTestId('allocation-container');
      
      // Simulate pinch gesture to adjust all allocations
      fireEvent.touchStart(container, {
        touches: [
          { clientX: 100, clientY: 100 },
          { clientX: 200, clientY: 200 }
        ]
      });
      
      fireEvent.touchMove(container, {
        touches: [
          { clientX: 80, clientY: 80 },
          { clientX: 220, clientY: 220 }
        ]
      });
      
      fireEvent.touchEnd(container);
      
      await waitFor(() => {
        expect(screen.getByText('Bulk adjustment mode')).toBeInTheDocument();
      });
    });
  });

  describe('Drag and Drop Reallocation', () => {
    test('allows dragging budget from one category to another', async () => {
      render(<TouchBudgetAllocation {...defaultProps} />);
      
      const venueCategory = screen.getByTestId('category-cat-1');
      const photographyCategory = screen.getByTestId('category-cat-2');
      
      // Simulate drag from venue to photography
      fireEvent.touchStart(venueCategory, {
        touches: [{ clientX: 100, clientY: 100 }]
      });
      
      fireEvent.touchMove(venueCategory, {
        touches: [{ clientX: 200, clientY: 150 }]
      });
      
      fireEvent.touchEnd(photographyCategory, {
        changedTouches: [{ clientX: 200, clientY: 150 }]
      });
      
      await waitFor(() => {
        expect(screen.getByText('Drag £1,000 from Venue to Photography?')).toBeInTheDocument();
      });
      
      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);
      
      expect(defaultProps.onCategoriesUpdate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'cat-1',
            allocated: 19000 // Reduced by £1,000
          }),
          expect.objectContaining({
            id: 'cat-2',
            allocated: 9000 // Increased by £1,000
          })
        ])
      );
    });

    test('shows visual feedback during drag operations', async () => {
      render(<TouchBudgetAllocation {...defaultProps} />);
      
      const venueCategory = screen.getByTestId('category-cat-1');
      
      fireEvent.touchStart(venueCategory, {
        touches: [{ clientX: 100, clientY: 100 }]
      });
      
      fireEvent.touchMove(venueCategory, {
        touches: [{ clientX: 150, clientY: 100 }]
      });
      
      // Should show drag indicator
      expect(screen.getByTestId('drag-indicator')).toBeInTheDocument();
      expect(venueCategory).toHaveClass('dragging');
      
      fireEvent.touchEnd(venueCategory);
      
      await waitFor(() => {
        expect(screen.queryByTestId('drag-indicator')).not.toBeInTheDocument();
        expect(venueCategory).not.toHaveClass('dragging');
      });
    });
  });

  describe('Auto-balance Functionality', () => {
    test('auto-balances budget when total exceeds limit', async () => {
      const overBudgetCategories = [
        { ...mockCategories[0], allocated: 30000 },
        { ...mockCategories[1], allocated: 15000 },
        { ...mockCategories[2], allocated: 20000 },
        { ...mockCategories[3], allocated: 10000 } // Total: £75,000 > £50,000
      ];
      
      render(
        <TouchBudgetAllocation 
          {...defaultProps} 
          categories={overBudgetCategories}
        />
      );
      
      expect(screen.getByText('Budget exceeds total by £25,000')).toBeInTheDocument();
      
      const autoBalanceButton = screen.getByRole('button', { name: /auto-balance/i });
      await user.click(autoBalanceButton);
      
      await waitFor(() => {
        expect(defaultProps.onCategoriesUpdate).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              allocated: expect.any(Number)
            })
          ])
        );
      });
    });

    test('preserves priorities during auto-balance', async () => {
      const categoriesWithPriorities = mockCategories.map((cat, index) => ({
        ...cat,
        priority: index + 1
      }));
      
      render(
        <TouchBudgetAllocation 
          {...defaultProps} 
          categories={categoriesWithPriorities}
        />
      );
      
      const autoBalanceButton = screen.getByRole('button', { name: /auto-balance/i });
      await user.click(autoBalanceButton);
      
      await waitFor(() => {
        const updatedCategories = defaultProps.onCategoriesUpdate.mock.calls[0][0];
        
        // Higher priority categories should get larger allocations
        const venue = updatedCategories.find((c: any) => c.id === 'cat-1');
        const flowers = updatedCategories.find((c: any) => c.id === 'cat-4');
        
        expect(venue.allocated).toBeGreaterThan(flowers.allocated);
      });
    });
  });

  describe('Smart Suggestions', () => {
    test('provides smart allocation suggestions based on spending', () => {
      const categoriesWithSpending = mockCategories.map(cat => ({
        ...cat,
        spent: cat.allocated * 0.9 // 90% spent
      }));
      
      render(
        <TouchBudgetAllocation 
          {...defaultProps} 
          categories={categoriesWithSpending}
        />
      );
      
      expect(screen.getByText('Smart suggestions available')).toBeInTheDocument();
      
      const suggestionsButton = screen.getByRole('button', { name: /view suggestions/i });
      expect(suggestionsButton).toBeInTheDocument();
    });

    test('suggests increasing budget for overspent categories', async () => {
      const overspentCategories = [
        { ...mockCategories[0], spent: 22000 }, // Over £20,000 allocation
        ...mockCategories.slice(1)
      ];
      
      render(
        <TouchBudgetAllocation 
          {...defaultProps} 
          categories={overspentCategories}
        />
      );
      
      const suggestionsButton = screen.getByRole('button', { name: /view suggestions/i });
      await user.click(suggestionsButton);
      
      expect(screen.getByText('Increase Venue budget by £2,000')).toBeInTheDocument();
    });
  });

  describe('Validation and Constraints', () => {
    test('prevents negative allocations', async () => {
      render(<TouchBudgetAllocation {...defaultProps} />);
      
      const flowersSlider = screen.getByTestId('flowers-slider');
      
      // Try to drag below zero
      fireEvent.change(flowersSlider, { target: { value: -1000 } });
      
      await waitFor(() => {
        const flowersAllocation = screen.getByTestId('flowers-allocation');
        expect(flowersAllocation).toHaveTextContent('£0.00');
      });
    });

    test('prevents allocation below spent amount', async () => {
      render(<TouchBudgetAllocation {...defaultProps} />);
      
      const venueSlider = screen.getByTestId('venue-slider');
      
      // Try to set venue allocation below spent amount (£18,000)
      fireEvent.change(venueSlider, { target: { value: 15000 } });
      
      expect(screen.getByText('Cannot allocate less than spent amount')).toBeInTheDocument();
      expect(screen.getByText('Minimum: £18,000')).toBeInTheDocument();
    });

    test('warns when total allocation exceeds budget', () => {
      const overAllocatedCategories = mockCategories.map(cat => ({
        ...cat,
        allocated: cat.allocated * 1.5 // 150% of original
      }));
      
      render(
        <TouchBudgetAllocation 
          {...defaultProps} 
          categories={overAllocatedCategories}
        />
      );
      
      expect(screen.getByTestId('over-budget-warning')).toBeInTheDocument();
      expect(screen.getByText(/over budget/i)).toBeInTheDocument();
    });
  });

  describe('Performance Optimization', () => {
    test('debounces allocation updates during rapid gestures', async () => {
      jest.useFakeTimers();
      
      render(<TouchBudgetAllocation {...defaultProps} />);
      
      const venueSlider = screen.getByTestId('venue-slider');
      
      // Simulate rapid changes
      for (let i = 0; i < 10; i++) {
        fireEvent.change(venueSlider, { target: { value: 20000 + i * 100 } });
      }
      
      // Advance timers to trigger debounce
      act(() => {
        jest.advanceTimersByTime(500);
      });
      
      // Should only call update once after debounce
      expect(defaultProps.onCategoriesUpdate).toHaveBeenCalledTimes(1);
      
      jest.useRealTimers();
    });

    test('uses RAF for smooth animations during drag', async () => {
      const rafSpy = jest.spyOn(window, 'requestAnimationFrame');
      
      render(<TouchBudgetAllocation {...defaultProps} />);
      
      const venueSlider = screen.getByTestId('venue-slider');
      
      fireEvent.touchStart(venueSlider, {
        touches: [{ clientX: 100, clientY: 100 }]
      });
      
      fireEvent.touchMove(venueSlider, {
        touches: [{ clientX: 150, clientY: 100 }]
      });
      
      expect(rafSpy).toHaveBeenCalled();
      
      rafSpy.mockRestore();
    });
  });

  describe('Accessibility', () => {
    test('provides proper ARIA labels for sliders', () => {
      render(<TouchBudgetAllocation {...defaultProps} />);
      
      const venueSlider = screen.getByTestId('venue-slider');
      
      expect(venueSlider).toHaveAttribute('aria-label', 'Venue budget allocation');
      expect(venueSlider).toHaveAttribute('role', 'slider');
      expect(venueSlider).toHaveAttribute('aria-valuemin', '18000'); // Can't go below spent
      expect(venueSlider).toHaveAttribute('aria-valuemax', '50000'); // Can't exceed total
      expect(venueSlider).toHaveAttribute('aria-valuenow', '20000');
    });

    test('supports keyboard navigation for sliders', async () => {
      render(<TouchBudgetAllocation {...defaultProps} />);
      
      const venueSlider = screen.getByTestId('venue-slider');
      venueSlider.focus();
      
      // Use arrow keys to adjust
      await user.keyboard('[ArrowRight]');
      
      await waitFor(() => {
        expect(venueSlider).toHaveAttribute('aria-valuenow', '20100'); // Increased by £100
      });
      
      await user.keyboard('[ArrowLeft]');
      
      await waitFor(() => {
        expect(venueSlider).toHaveAttribute('aria-valuenow', '20000'); // Back to original
      });
    });

    test('announces allocation changes to screen readers', async () => {
      render(<TouchBudgetAllocation {...defaultProps} />);
      
      const venueSlider = screen.getByTestId('venue-slider');
      
      fireEvent.change(venueSlider, { target: { value: 22000 } });
      
      await waitFor(() => {
        const announcement = screen.getByTestId('allocation-announcement');
        expect(announcement).toHaveTextContent('Venue budget updated to £22,000');
      });
    });
  });

  describe('Currency Formatting', () => {
    test('displays amounts in correct GBP format', () => {
      render(<TouchBudgetAllocation {...defaultProps} />);
      
      // Should show proper British pound formatting
      expect(screen.getByText('£20,000.00')).toBeInTheDocument();
      expect(screen.getByText('£8,000.00')).toBeInTheDocument();
      expect(screen.getByText('£15,000.00')).toBeInTheDocument();
      expect(screen.getByText('£5,000.00')).toBeInTheDocument();
    });

    test('handles large numbers correctly', () => {
      const largeCategories = mockCategories.map(cat => ({
        ...cat,
        allocated: cat.allocated * 10 // Make them larger
      }));
      
      render(
        <TouchBudgetAllocation 
          {...defaultProps} 
          categories={largeCategories}
          totalBudget={500000}
        />
      );
      
      expect(screen.getByText('£200,000.00')).toBeInTheDocument();
      expect(screen.getByText('£80,000.00')).toBeInTheDocument();
    });
  });

  describe('Reset and Undo Functionality', () => {
    test('provides reset to defaults functionality', async () => {
      render(<TouchBudgetAllocation {...defaultProps} />);
      
      // Make some changes first
      const venueSlider = screen.getByTestId('venue-slider');
      fireEvent.change(venueSlider, { target: { value: 25000 } });
      
      const resetButton = screen.getByRole('button', { name: /reset to defaults/i });
      await user.click(resetButton);
      
      expect(screen.getByText('Reset all allocations to default values?')).toBeInTheDocument();
      
      const confirmReset = screen.getByRole('button', { name: /confirm reset/i });
      await user.click(confirmReset);
      
      expect(defaultProps.onCategoriesUpdate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'cat-1',
            allocated: 20000 // Back to original
          })
        ])
      );
    });

    test('supports undo functionality for recent changes', async () => {
      render(<TouchBudgetAllocation {...defaultProps} />);
      
      // Make a change
      const venueSlider = screen.getByTestId('venue-slider');
      fireEvent.change(venueSlider, { target: { value: 25000 } });
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /undo/i })).toBeInTheDocument();
      });
      
      const undoButton = screen.getByRole('button', { name: /undo/i });
      await user.click(undoButton);
      
      expect(defaultProps.onCategoriesUpdate).toHaveBeenLastCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'cat-1',
            allocated: 20000 // Reverted
          })
        ])
      );
    });
  });
});