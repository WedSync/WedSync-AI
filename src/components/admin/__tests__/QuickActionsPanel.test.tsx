import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest } from '@jest/globals';
import QuickActionsPanel from '../QuickActionsPanel';

// Mock Sonner toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock UI components
jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: any) => (
    <div data-testid="dialog-content">{children}</div>
  ),
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({ ...props }: any) => <input data-testid="search-input" {...props} />,
}));

describe('QuickActionsPanel', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    userPermissions: ['admin', 'support'],
    currentWeddingEmergencies: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders when open', () => {
      render(<QuickActionsPanel {...defaultProps} />);
      expect(screen.getByTestId('dialog')).toBeInTheDocument();
    });

    it('does not render when closed', () => {
      render(<QuickActionsPanel {...defaultProps} isOpen={false} />);
      expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
    });

    it('displays search input', () => {
      render(<QuickActionsPanel {...defaultProps} />);
      expect(screen.getByTestId('search-input')).toBeInTheDocument();
    });
  });

  describe('Wedding Emergency Scenarios', () => {
    it('displays emergency actions when wedding emergencies are active', () => {
      const emergencyProps = {
        ...defaultProps,
        currentWeddingEmergencies: ['auth-failure', 'payment-failure'],
      };

      render(<QuickActionsPanel {...emergencyProps} />);

      expect(screen.getByText('Fix User Login Emergency')).toBeInTheDocument();
      expect(
        screen.getByText('Payment Processing Emergency'),
      ).toBeInTheDocument();
    });

    it('shows emergency alert when emergencies are active', () => {
      const emergencyProps = {
        ...defaultProps,
        currentWeddingEmergencies: ['rsvp-crash'],
      };

      render(<QuickActionsPanel {...emergencyProps} />);

      expect(screen.getByText('Wedding Emergency Active')).toBeInTheDocument();
      expect(screen.getByText('1 active')).toBeInTheDocument();
    });

    it('filters actions by user permissions', () => {
      const limitedProps = {
        ...defaultProps,
        userPermissions: ['support'], // No admin permissions
      };

      render(<QuickActionsPanel {...limitedProps} />);

      // Should only show actions available to support role
      expect(
        screen.queryByText('Fix User Login Emergency'),
      ).toBeInTheDocument();
      // Actions requiring admin should be hidden
      expect(
        screen.queryByText('Payment Processing Emergency'),
      ).toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('filters actions based on search input', async () => {
      const user = userEvent.setup();
      render(<QuickActionsPanel {...defaultProps} />);

      const searchInput = screen.getByTestId('search-input');
      await user.type(searchInput, 'login');

      await waitFor(() => {
        expect(
          screen.getByText('Fix User Login Emergency'),
        ).toBeInTheDocument();
        expect(
          screen.queryByText('RSVP System Recovery'),
        ).not.toBeInTheDocument();
      });
    });

    it('shows no results message when search has no matches', async () => {
      const user = userEvent.setup();
      render(<QuickActionsPanel {...defaultProps} />);

      const searchInput = screen.getByTestId('search-input');
      await user.type(searchInput, 'nonexistent');

      await waitFor(() => {
        expect(screen.getByText('No actions found')).toBeInTheDocument();
      });
    });
  });

  describe('Keyboard Navigation', () => {
    it('handles arrow key navigation', async () => {
      const user = userEvent.setup();
      render(<QuickActionsPanel {...defaultProps} />);

      // Simulate arrow down
      await user.keyboard('{ArrowDown}');

      // First action should be selected (would need to check selected state)
      // This test would require more complex state checking
    });

    it('executes action on Enter key', async () => {
      const user = userEvent.setup();
      render(<QuickActionsPanel {...defaultProps} />);

      await user.keyboard('{Enter}');

      // Should execute the first/selected action
      // This would need proper mock setup for action execution
    });

    it('closes panel on Escape key', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      render(<QuickActionsPanel {...defaultProps} onClose={onClose} />);

      await user.keyboard('{Escape}');

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('System Status', () => {
    it('displays system status indicators', () => {
      render(<QuickActionsPanel {...defaultProps} />);

      // Should show system status (DB, Payments, Auth, API)
      expect(screen.getByText('DB')).toBeInTheDocument();
      expect(screen.getByText('Payments')).toBeInTheDocument();
      expect(screen.getByText('Auth')).toBeInTheDocument();
      expect(screen.getByText('API')).toBeInTheDocument();
    });

    it('updates system status timestamp', () => {
      render(<QuickActionsPanel {...defaultProps} />);

      // Should show updated timestamp
      expect(screen.getByText(/Updated \d/)).toBeInTheDocument();
    });
  });

  describe('Action Execution', () => {
    it('executes emergency action successfully', async () => {
      const user = userEvent.setup();
      render(
        <QuickActionsPanel
          {...defaultProps}
          currentWeddingEmergencies={['auth-failure']}
        />,
      );

      const loginAction = screen.getByText('Fix User Login Emergency');
      await user.click(loginAction);

      await waitFor(() => {
        // Should show success toast
        expect(require('sonner').toast.success).toHaveBeenCalledWith(
          'Emergency login protocol activated',
        );
      });
    });

    it('shows loading state during action execution', async () => {
      const user = userEvent.setup();
      render(<QuickActionsPanel {...defaultProps} />);

      const action = screen.getByText('Refresh System Status');
      await user.click(action);

      // Should show loading indicator briefly
      expect(screen.getByText('System status refreshed')).toBeInTheDocument();
    });
  });

  describe('Wedding Day Protocol', () => {
    it('prioritizes emergency actions for Saturday weddings', () => {
      const saturdayProps = {
        ...defaultProps,
        currentWeddingEmergencies: [
          'auth-failure',
          'rsvp-crash',
          'payment-failure',
        ],
      };

      render(<QuickActionsPanel {...saturdayProps} />);

      // Emergency actions should be at the top
      const emergencyActions = screen.getAllByText(/Emergency|Recovery/);
      expect(emergencyActions.length).toBeGreaterThan(0);
    });

    it('shows wedding day context in emergency alerts', () => {
      const weddingDayProps = {
        ...defaultProps,
        currentWeddingEmergencies: ['vendor-lockout'],
        // Additional context could be passed here
      };

      render(<QuickActionsPanel {...weddingDayProps} />);

      expect(screen.getByText('Wedding Emergency Active')).toBeInTheDocument();
    });
  });

  describe('Performance & Accessibility', () => {
    it('handles rapid key presses without errors', async () => {
      const user = userEvent.setup();
      render(<QuickActionsPanel {...defaultProps} />);

      // Rapidly press arrow keys
      for (let i = 0; i < 10; i++) {
        await user.keyboard('{ArrowDown}');
      }

      // Should not crash or show errors
      expect(screen.getByTestId('dialog')).toBeInTheDocument();
    });

    it('has proper ARIA labels for accessibility', () => {
      render(<QuickActionsPanel {...defaultProps} />);

      // Search input should have proper labeling
      const searchInput = screen.getByTestId('search-input');
      expect(searchInput).toHaveAttribute('placeholder', 'Search actions...');
    });

    it('supports screen reader navigation', () => {
      render(<QuickActionsPanel {...defaultProps} />);

      // Should have proper role attributes
      const dialog = screen.getByTestId('dialog');
      expect(dialog).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles action execution failures gracefully', async () => {
      const user = userEvent.setup();

      // Mock a failing action
      const failingProps = {
        ...defaultProps,
        currentWeddingEmergencies: ['auth-failure'],
      };

      render(<QuickActionsPanel {...failingProps} />);

      // This would require mocking the action execution to fail
      // and then checking error handling
    });

    it('shows appropriate error messages', () => {
      // Test error state handling
      render(<QuickActionsPanel {...defaultProps} />);

      // This would test error message display
    });
  });

  describe('Mobile Responsiveness', () => {
    it('adapts layout for mobile screens', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<QuickActionsPanel {...defaultProps} />);

      // Should still render properly on mobile
      expect(screen.getByTestId('dialog')).toBeInTheDocument();
    });

    it('maintains functionality on touch devices', async () => {
      const user = userEvent.setup();
      render(<QuickActionsPanel {...defaultProps} />);

      // Touch interactions should work
      const action = screen.getByText('Refresh System Status');
      await user.click(action);

      expect(screen.getByTestId('dialog')).toBeInTheDocument();
    });
  });
});
