/**
 * WS-245: Mobile Budget Optimizer Tests
 * Comprehensive test suite for mobile budget planning functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { jest } from '@jest/globals';
import userEvent from '@testing-library/user-event';
import { MobileBudgetOptimizer } from '@/components/mobile/budget/MobileBudgetOptimizer';

// Mock motion components
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => children,
  useAnimation: () => ({
    start: jest.fn(),
    stop: jest.fn(),
    set: jest.fn(),
  }),
}));

// Mock Supabase
const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        order: jest.fn(() => Promise.resolve({
          data: mockBudgetData,
          error: null
        }))
      }))
    })),
    insert: jest.fn(() => Promise.resolve({ data: null, error: null })),
    update: jest.fn(() => ({
      eq: jest.fn(() => Promise.resolve({ data: null, error: null }))
    })),
  }))
};

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabase
}));

// Mock Web Speech API
Object.defineProperty(global, 'SpeechRecognition', {
  value: jest.fn(() => ({
    start: jest.fn(),
    stop: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  }))
});

Object.defineProperty(global, 'webkitSpeechRecognition', {
  value: global.SpeechRecognition
});

// Mock vibration API
Object.defineProperty(navigator, 'vibrate', {
  value: jest.fn(),
  writable: true
});

// Mock online status
Object.defineProperty(navigator, 'onLine', {
  value: true,
  writable: true
});

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

const mockBudgetData = {
  id: 'budget-123',
  weddingId: 'wedding-456',
  totalBudget: 50000,
  categories: [
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
    }
  ],
  expenses: [
    {
      id: 'exp-1',
      categoryId: 'cat-1',
      amount: 18000,
      description: 'Wedding venue booking',
      vendor: 'Beautiful Venue Ltd',
      date: new Date('2024-12-15'),
      isRecurring: false,
      tags: ['venue', 'deposit'],
      createdOffline: false
    }
  ]
};

const defaultProps = {
  totalBudget: 50000,
  offlineCapable: true,
  touchOptimized: true,
  collaborativeMode: false,
  weddingId: 'wedding-456',
  organizationId: 'org-789'
};

describe('MobileBudgetOptimizer', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    jest.clearAllMocks();
  });

  describe('Rendering and Layout', () => {
    test('renders mobile budget optimizer with correct layout', async () => {
      render(<MobileBudgetOptimizer {...defaultProps} />);
      
      // Check main container
      expect(screen.getByTestId('mobile-budget-optimizer')).toBeInTheDocument();
      
      // Check navigation tabs
      expect(screen.getByRole('button', { name: /overview/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /allocate/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /expenses/i })).toBeInTheDocument();
      
      // Check budget summary
      await waitFor(() => {
        expect(screen.getByText('£50,000.00')).toBeInTheDocument();
      });
    });

    test('displays loading state initially', () => {
      render(<MobileBudgetOptimizer {...defaultProps} />);
      
      expect(screen.getByTestId('budget-loading')).toBeInTheDocument();
      expect(screen.getByText('Loading your budget...')).toBeInTheDocument();
    });

    test('displays budget categories when loaded', async () => {
      render(<MobileBudgetOptimizer {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Venue')).toBeInTheDocument();
        expect(screen.getByText('Photography')).toBeInTheDocument();
        expect(screen.getByText('Catering')).toBeInTheDocument();
      });
    });
  });

  describe('Touch Interactions', () => {
    test('handles swipe navigation between tabs', async () => {
      render(<MobileBudgetOptimizer {...defaultProps} />);
      
      const container = screen.getByTestId('budget-content');
      
      // Simulate swipe left
      fireEvent.touchStart(container, {
        touches: [{ clientX: 200, clientY: 100 }]
      });
      fireEvent.touchMove(container, {
        touches: [{ clientX: 100, clientY: 100 }]
      });
      fireEvent.touchEnd(container, {
        changedTouches: [{ clientX: 100, clientY: 100 }]
      });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /allocate/i })).toHaveAttribute('aria-selected', 'true');
      });
    });

    test('provides haptic feedback on interactions when enabled', async () => {
      render(<MobileBudgetOptimizer {...defaultProps} />);
      
      const categoryButton = await screen.findByText('Venue');
      
      await user.click(categoryButton);
      
      expect(navigator.vibrate).toHaveBeenCalledWith(10);
    });

    test('handles pinch-to-zoom gestures', async () => {
      render(<MobileBudgetOptimizer {...defaultProps} />);
      
      const chartContainer = await screen.findByTestId('budget-chart');
      
      // Simulate pinch gesture
      fireEvent.touchStart(chartContainer, {
        touches: [
          { clientX: 100, clientY: 100 },
          { clientX: 200, clientY: 200 }
        ]
      });
      
      fireEvent.touchMove(chartContainer, {
        touches: [
          { clientX: 80, clientY: 80 },
          { clientX: 220, clientY: 220 }
        ]
      });
      
      fireEvent.touchEnd(chartContainer);
      
      // Verify zoom state changed
      await waitFor(() => {
        expect(chartContainer).toHaveStyle('transform: scale(1.2)');
      });
    });
  });

  describe('Offline Functionality', () => {
    test('displays offline indicator when offline', async () => {
      // Mock offline status
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
      
      render(<MobileBudgetOptimizer {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('offline-indicator')).toBeInTheDocument();
        expect(screen.getByText('Working offline')).toBeInTheDocument();
      });
    });

    test('shows pending sync count when changes are queued', async () => {
      render(<MobileBudgetOptimizer {...defaultProps} />);
      
      // Mock pending changes
      const mockOfflineManager = {
        getOfflineStatus: jest.fn().mockResolvedValue({
          isOffline: false,
          pendingSyncCount: 3,
          lastSyncTime: new Date(),
          storageUsed: 1024
        })
      };

      await waitFor(() => {
        expect(screen.getByText('3 changes pending sync')).toBeInTheDocument();
      });
    });

    test('allows manual sync trigger', async () => {
      render(<MobileBudgetOptimizer {...defaultProps} />);
      
      const syncButton = await screen.findByTestId('sync-now-button');
      await user.click(syncButton);
      
      // Verify sync was triggered
      await waitFor(() => {
        expect(screen.getByText('Syncing...')).toBeInTheDocument();
      });
    });
  });

  describe('Budget Calculations', () => {
    test('calculates total allocated correctly', async () => {
      render(<MobileBudgetOptimizer {...defaultProps} />);
      
      await waitFor(() => {
        // Total allocated: £20,000 + £8,000 + £15,000 = £43,000
        expect(screen.getByText('£43,000.00')).toBeInTheDocument();
      });
    });

    test('calculates total spent correctly', async () => {
      render(<MobileBudgetOptimizer {...defaultProps} />);
      
      await waitFor(() => {
        // Total spent: £18,000 + £7,500 + £12,000 = £37,500
        expect(screen.getByText('£37,500.00')).toBeInTheDocument();
      });
    });

    test('calculates remaining budget correctly', async () => {
      render(<MobileBudgetOptimizer {...defaultProps} />);
      
      await waitFor(() => {
        // Remaining: £50,000 - £43,000 = £7,000
        expect(screen.getByText('£7,000.00')).toBeInTheDocument();
      });
    });

    test('shows budget warnings for overspending categories', async () => {
      const overspentData = {
        ...mockBudgetData,
        categories: [
          {
            ...mockBudgetData.categories[0],
            spent: 22000 // Over the £20,000 allocation
          }
        ]
      };
      
      mockSupabase.from.mockReturnValue({
        select: () => ({
          eq: () => ({
            order: () => Promise.resolve({
              data: overspentData,
              error: null
            })
          })
        })
      });
      
      render(<MobileBudgetOptimizer {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('overspent-warning')).toBeInTheDocument();
        expect(screen.getByText(/over budget/i)).toBeInTheDocument();
      });
    });
  });

  describe('Collaborative Features', () => {
    test('shows collaborative mode indicator when enabled', () => {
      render(<MobileBudgetOptimizer {...defaultProps} collaborativeMode={true} />);
      
      expect(screen.getByTestId('collaborative-indicator')).toBeInTheDocument();
      expect(screen.getByText('Shared with partner')).toBeInTheDocument();
    });

    test('displays real-time updates from partner', async () => {
      render(<MobileBudgetOptimizer {...defaultProps} collaborativeMode={true} />);
      
      // Mock real-time update
      act(() => {
        // Simulate partner making a change
        const updateEvent = new CustomEvent('budget-update', {
          detail: {
            categoryId: 'cat-1',
            newSpent: 19000,
            updatedBy: 'partner'
          }
        });
        window.dispatchEvent(updateEvent);
      });
      
      await waitFor(() => {
        expect(screen.getByText(/partner updated/i)).toBeInTheDocument();
      });
    });
  });

  describe('Performance Optimization', () => {
    test('implements virtual scrolling for large expense lists', async () => {
      const largeExpenseList = Array.from({ length: 1000 }, (_, i) => ({
        id: `exp-${i}`,
        categoryId: 'cat-1',
        amount: 100 + i,
        description: `Expense ${i}`,
        date: new Date(),
        isRecurring: false,
        tags: [],
        createdOffline: false
      }));

      const dataWithManyExpenses = {
        ...mockBudgetData,
        expenses: largeExpenseList
      };

      mockSupabase.from.mockReturnValue({
        select: () => ({
          eq: () => ({
            order: () => Promise.resolve({
              data: dataWithManyExpenses,
              error: null
            })
          })
        })
      });
      
      render(<MobileBudgetOptimizer {...defaultProps} />);
      
      // Switch to expenses tab
      const expensesTab = screen.getByRole('button', { name: /expenses/i });
      await user.click(expensesTab);
      
      await waitFor(() => {
        // Should only render visible items (not all 1000)
        const renderedExpenses = screen.getAllByTestId(/expense-item/);
        expect(renderedExpenses.length).toBeLessThan(50);
      });
    });

    test('debounces budget allocation changes', async () => {
      render(<MobileBudgetOptimizer {...defaultProps} />);
      
      // Switch to allocate tab
      const allocateTab = screen.getByRole('button', { name: /allocate/i });
      await user.click(allocateTab);
      
      const venueSlider = await screen.findByTestId('venue-allocation-slider');
      
      // Simulate rapid slider changes
      for (let i = 0; i < 5; i++) {
        fireEvent.change(venueSlider, { target: { value: 20000 + i * 100 } });
      }
      
      // Should debounce and only make one API call after delay
      await waitFor(() => {
        expect(mockSupabase.from().update).toHaveBeenCalledTimes(1);
      }, { timeout: 1000 });
    });
  });

  describe('Accessibility', () => {
    test('supports screen reader navigation', async () => {
      render(<MobileBudgetOptimizer {...defaultProps} />);
      
      const tabList = screen.getByRole('tablist');
      expect(tabList).toBeInTheDocument();
      
      const tabs = screen.getAllByRole('tab');
      expect(tabs).toHaveLength(3);
      
      tabs.forEach(tab => {
        expect(tab).toHaveAttribute('aria-selected');
      });
    });

    test('provides proper ARIA labels for budget data', async () => {
      render(<MobileBudgetOptimizer {...defaultProps} />);
      
      await waitFor(() => {
        const totalBudget = screen.getByLabelText('Total wedding budget');
        expect(totalBudget).toBeInTheDocument();
        
        const venueCategory = screen.getByLabelText('Venue budget category');
        expect(venueCategory).toBeInTheDocument();
      });
    });

    test('supports keyboard navigation', async () => {
      render(<MobileBudgetOptimizer {...defaultProps} />);
      
      // Tab through elements
      await user.keyboard('[Tab]');
      expect(screen.getByRole('button', { name: /overview/i })).toHaveFocus();
      
      await user.keyboard('[Tab]');
      expect(screen.getByRole('button', { name: /allocate/i })).toHaveFocus();
      
      await user.keyboard('[Tab]');
      expect(screen.getByRole('button', { name: /expenses/i })).toHaveFocus();
    });
  });

  describe('Error Handling', () => {
    test('displays error message when budget data fails to load', async () => {
      mockSupabase.from.mockReturnValue({
        select: () => ({
          eq: () => ({
            order: () => Promise.resolve({
              data: null,
              error: { message: 'Failed to fetch budget data' }
            })
          })
        })
      });
      
      render(<MobileBudgetOptimizer {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText(/error loading budget/i)).toBeInTheDocument();
        expect(screen.getByText('Failed to fetch budget data')).toBeInTheDocument();
      });
    });

    test('provides retry functionality on errors', async () => {
      mockSupabase.from
        .mockReturnValueOnce({
          select: () => ({
            eq: () => ({
              order: () => Promise.resolve({
                data: null,
                error: { message: 'Network error' }
              })
            })
          })
        })
        .mockReturnValue({
          select: () => ({
            eq: () => ({
              order: () => Promise.resolve({
                data: mockBudgetData,
                error: null
              })
            })
          })
        });
      
      render(<MobileBudgetOptimizer {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText(/error loading budget/i)).toBeInTheDocument();
      });
      
      const retryButton = screen.getByRole('button', { name: /retry/i });
      await user.click(retryButton);
      
      await waitFor(() => {
        expect(screen.getByText('Venue')).toBeInTheDocument();
      });
    });
  });

  describe('Mobile-Specific Features', () => {
    test('adapts to portrait/landscape orientation changes', async () => {
      render(<MobileBudgetOptimizer {...defaultProps} />);
      
      // Mock orientation change
      Object.defineProperty(screen, 'orientation', {
        value: { angle: 90 },
        writable: true
      });
      
      act(() => {
        window.dispatchEvent(new Event('orientationchange'));
      });
      
      await waitFor(() => {
        const container = screen.getByTestId('mobile-budget-optimizer');
        expect(container).toHaveClass('landscape-mode');
      });
    });

    test('optimizes for different screen sizes', async () => {
      // Mock small screen (iPhone SE)
      Object.defineProperty(window, 'innerWidth', { value: 375, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: 667, writable: true });
      
      render(<MobileBudgetOptimizer {...defaultProps} />);
      
      act(() => {
        window.dispatchEvent(new Event('resize'));
      });
      
      await waitFor(() => {
        const container = screen.getByTestId('mobile-budget-optimizer');
        expect(container).toHaveClass('small-screen');
      });
    });

    test('handles safe area insets on notched devices', () => {
      // Mock safe area CSS environment variables
      document.documentElement.style.setProperty('--safe-area-inset-top', '44px');
      document.documentElement.style.setProperty('--safe-area-inset-bottom', '34px');
      
      render(<MobileBudgetOptimizer {...defaultProps} />);
      
      const container = screen.getByTestId('mobile-budget-optimizer');
      const styles = window.getComputedStyle(container);
      
      expect(styles.paddingTop).toBe('44px');
      expect(styles.paddingBottom).toBe('34px');
    });
  });

  describe('Performance Monitoring', () => {
    test('meets performance requirements', async () => {
      const startTime = performance.now();
      
      render(<MobileBudgetOptimizer {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Venue')).toBeInTheDocument();
      });
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Should render within 2 seconds
      expect(renderTime).toBeLessThan(2000);
    });

    test('tracks budget calculation performance', async () => {
      const performanceSpy = jest.spyOn(performance, 'mark');
      
      render(<MobileBudgetOptimizer {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('£43,000.00')).toBeInTheDocument();
      });
      
      // Should track performance marks
      expect(performanceSpy).toHaveBeenCalledWith('budget-calculation-start');
      expect(performanceSpy).toHaveBeenCalledWith('budget-calculation-end');
    });
  });
});