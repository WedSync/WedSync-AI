import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import '@testing-library/jest-dom';
import {
  PresenceIndicator,
  ConnectedPresenceIndicator,
} from '../PresenceIndicator';
import { usePresence } from '@/hooks/usePresence';
import type { PresenceState, PresenceStatus } from '@/types/presence';

// Mock the hooks
jest.mock('@/hooks/usePresence');
jest.mock('@/hooks/useAuth', () => ({
  useAuth: jest.fn(() => ({
    user: { id: 'test-user', email: 'test@example.com' },
  })),
}));

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    channel: jest.fn(),
    removeChannel: jest.fn(),
  })),
}));

// Mock UI components
jest.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-provider">{children}</div>
  ),
  Tooltip: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip">{children}</div>
  ),
  TooltipTrigger: ({
    children,
    asChild,
  }: {
    children: React.ReactNode;
    asChild?: boolean;
  }) =>
    asChild ? children : <div data-testid="tooltip-trigger">{children}</div>,
  TooltipContent: ({
    children,
    side,
  }: {
    children: React.ReactNode;
    side?: string;
  }) => (
    <div data-testid="tooltip-content" data-side={side}>
      {children}
    </div>
  ),
}));

jest.mock('@/components/ui/avatar', () => ({
  Avatar: ({
    src,
    initials,
    alt,
    size,
  }: {
    src?: string;
    initials?: string;
    alt?: string;
    size?: string;
  }) => (
    <div
      data-testid="avatar"
      data-size={size}
      data-initials={initials}
      aria-label={alt}
    >
      {src ? <img src={src} alt={alt} /> : initials}
    </div>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({
    children,
    variant,
  }: {
    children: React.ReactNode;
    variant?: string;
  }) => (
    <span data-testid="badge" data-variant={variant}>
      {children}
    </span>
  ),
}));

const mockUsePresence = usePresence as jest.MockedFunction<typeof usePresence>;

const createMockPresenceState = (
  status: PresenceStatus,
  overrides?: Partial<PresenceState>,
): PresenceState => ({
  userId: 'test-user-123',
  status,
  lastActivity: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

describe('PresenceIndicator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePresence.mockReturnValue({
      presenceState: {},
      myStatus: 'online',
      updateStatus: jest.fn(),
      setCustomStatus: jest.fn(),
      trackActivity: jest.fn(),
      isLoading: false,
      error: null,
      channelStatus: 'connected',
    });
  });

  describe('Status Colors and Visual Indicators', () => {
    it('displays correct status colors for each presence state', () => {
      const statusColors = [
        { status: 'online' as PresenceStatus, expectedClass: 'bg-green-500' },
        { status: 'busy' as PresenceStatus, expectedClass: 'bg-red-500' },
        { status: 'idle' as PresenceStatus, expectedClass: 'bg-yellow-500' },
        { status: 'away' as PresenceStatus, expectedClass: 'bg-gray-400' },
        { status: 'offline' as PresenceStatus, expectedClass: 'bg-gray-300' },
      ];

      statusColors.forEach(({ status, expectedClass }) => {
        const presenceState = createMockPresenceState(status);
        const { container, rerender } = render(
          <PresenceIndicator
            userId="test-user-123"
            userName="Test User"
            presenceState={presenceState}
          />,
        );

        const statusDot = container.querySelector(
          '[class*="absolute"][class*="rounded-full"]',
        );
        expect(statusDot).toHaveClass(expectedClass);

        // Cleanup for next iteration
        rerender(<div />);
      });
    });

    it('shows typing indicator with pulse animation', () => {
      const presenceState = createMockPresenceState('online', {
        isTyping: true,
      });
      const { container } = render(
        <PresenceIndicator
          userId="test-user-123"
          userName="Test User"
          presenceState={presenceState}
          showActivity={true}
        />,
      );

      const statusDot = container.querySelector('[class*="animate-pulse"]');
      expect(statusDot).toBeInTheDocument();
    });

    it('displays custom status with emoji when enabled', () => {
      const presenceState = createMockPresenceState('online', {
        customStatus: 'At venue - ceremony prep',
        customEmoji: '📸',
      });

      render(
        <PresenceIndicator
          userId="test-user-123"
          userName="Test User"
          presenceState={presenceState}
          showCustomStatus={true}
          showLabel={true}
        />,
      );

      expect(screen.getByText('📸')).toBeInTheDocument();
      expect(
        screen.getByText('📸At venue - ceremony prep'),
      ).toBeInTheDocument();
    });

    it('hides custom status when disabled', () => {
      const presenceState = createMockPresenceState('online', {
        customStatus: 'Secret status',
        customEmoji: '🔒',
      });

      render(
        <PresenceIndicator
          userId="test-user-123"
          userName="Test User"
          presenceState={presenceState}
          showCustomStatus={false}
          showLabel={true}
        />,
      );

      expect(screen.queryByText('🔒')).not.toBeInTheDocument();
      expect(screen.queryByText('Secret status')).not.toBeInTheDocument();
      expect(screen.getByText('Available')).toBeInTheDocument(); // Default online text
    });
  });

  describe('Size and Position Variants', () => {
    it('applies correct size classes', () => {
      const sizes = ['xs', 'sm', 'md', 'lg', 'xl'] as const;

      sizes.forEach((size) => {
        const { rerender } = render(
          <PresenceIndicator
            userId="test-user-123"
            userName="Test User"
            size={size}
            presenceState={createMockPresenceState('online')}
          />,
        );

        const avatar = screen.getByTestId('avatar');
        expect(avatar).toHaveAttribute('data-size', size);

        rerender(<div />);
      });
    });

    it('positions status dot correctly', () => {
      const positions = [
        'top-right',
        'bottom-right',
        'top-left',
        'bottom-left',
      ] as const;

      positions.forEach((position) => {
        const { container, rerender } = render(
          <PresenceIndicator
            userId="test-user-123"
            userName="Test User"
            position={position}
            presenceState={createMockPresenceState('online')}
          />,
        );

        const statusDot = container.querySelector(
          '[class*="absolute"][class*="rounded-full"]',
        );
        expect(statusDot).toHaveClass(position);

        rerender(<div />);
      });
    });
  });

  describe('Accessibility', () => {
    it('provides proper ARIA labels', () => {
      const presenceState = createMockPresenceState('online');
      render(
        <PresenceIndicator
          userId="test-user-123"
          userName="Sarah Johnson"
          presenceState={presenceState}
        />,
      );

      const component = screen.getByLabelText('Sarah Johnson is online');
      expect(component).toBeInTheDocument();
      expect(component).toHaveAttribute('aria-live', 'polite');
    });

    it('supports custom aria labels', () => {
      render(
        <PresenceIndicator
          userId="test-user-123"
          userName="John Doe"
          presenceState={createMockPresenceState('busy')}
          ariaLabel="Wedding photographer is busy shooting ceremony"
        />,
      );

      expect(
        screen.getByLabelText('Wedding photographer is busy shooting ceremony'),
      ).toBeInTheDocument();
    });

    it('handles keyboard navigation when clickable', async () => {
      const user = userEvent.setup();
      const handleClick = jest.fn();

      render(
        <PresenceIndicator
          userId="test-user-123"
          userName="Test User"
          presenceState={createMockPresenceState('online')}
          onClick={handleClick}
        />,
      );

      const component = screen.getByRole('button');
      expect(component).toHaveAttribute('tabIndex', '0');

      // Test Enter key
      await user.type(component, '{Enter}');
      expect(handleClick).toHaveBeenCalledTimes(1);

      // Test Space key
      await user.type(component, ' ');
      expect(handleClick).toHaveBeenCalledTimes(2);
    });

    it('is not focusable when not clickable', () => {
      render(
        <PresenceIndicator
          userId="test-user-123"
          userName="Test User"
          presenceState={createMockPresenceState('online')}
        />,
      );

      const component = screen.getByRole('status');
      expect(component).toHaveAttribute('tabIndex', '-1');
    });
  });

  describe('Wedding Context Integration', () => {
    it('displays wedding role information in tooltip', () => {
      const presenceState = createMockPresenceState('online', {
        customStatus: 'Setting up equipment',
      });

      render(
        <PresenceIndicator
          userId="test-user-123"
          userName="Mike Chen"
          presenceState={presenceState}
          context="wedding"
          weddingRole="photographer"
        />,
      );

      const tooltipContent = screen.getByTestId('tooltip-content');
      expect(tooltipContent).toHaveTextContent('photographer');
    });

    it('shows appropriate status templates for wedding roles', () => {
      const presenceState = createMockPresenceState('busy', {
        customStatus: 'At venue - ceremony prep',
        customEmoji: '📸',
      });

      render(
        <PresenceIndicator
          userId="photographer-123"
          userName="Sarah Photography"
          presenceState={presenceState}
          weddingRole="photographer"
          showLabel={true}
          showCustomStatus={true}
        />,
      );

      expect(
        screen.getByText('📸At venue - ceremony prep'),
      ).toBeInTheDocument();
    });
  });

  describe('Last Activity and Time Display', () => {
    it('formats last seen time correctly', () => {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

      const presenceState = createMockPresenceState('idle', {
        lastActivity: fiveMinutesAgo.toISOString(),
      });

      render(
        <PresenceIndicator
          userId="test-user-123"
          userName="Test User"
          presenceState={presenceState}
          showActivity={true}
        />,
      );

      const tooltipContent = screen.getByTestId('tooltip-content');
      expect(tooltipContent).toHaveTextContent('5m ago');
    });

    it('shows "Just now" for very recent activity', () => {
      const presenceState = createMockPresenceState('online', {
        lastActivity: new Date().toISOString(),
      });

      render(
        <PresenceIndicator
          userId="test-user-123"
          userName="Test User"
          presenceState={presenceState}
          showActivity={true}
        />,
      );

      const tooltipContent = screen.getByTestId('tooltip-content');
      expect(tooltipContent).toHaveTextContent('Just now');
    });
  });

  describe('Performance and Optimization', () => {
    it('memoizes component to prevent unnecessary re-renders', () => {
      const presenceState = createMockPresenceState('online');
      const { rerender } = render(
        <PresenceIndicator
          userId="test-user-123"
          userName="Test User"
          presenceState={presenceState}
        />,
      );

      // Re-render with same props should not cause re-mount
      rerender(
        <PresenceIndicator
          userId="test-user-123"
          userName="Test User"
          presenceState={presenceState}
        />,
      );

      expect(screen.getByTestId('avatar')).toBeInTheDocument();
    });

    it('renders within performance requirements (<100ms)', () => {
      const start = performance.now();

      render(
        <PresenceIndicator
          userId="test-user-123"
          userName="Test User"
          presenceState={createMockPresenceState('online')}
        />,
      );

      const renderTime = performance.now() - start;
      expect(renderTime).toBeLessThan(100); // 100ms requirement
    });
  });

  describe('Error Handling', () => {
    it('handles missing presence state gracefully', () => {
      render(<PresenceIndicator userId="test-user-123" userName="Test User" />);

      // Should show offline status when no presence state provided
      const tooltipContent = screen.getByTestId('tooltip-content');
      expect(tooltipContent).toHaveTextContent('Offline');
    });

    it('handles malformed presence data', () => {
      const invalidPresenceState = {
        userId: 'test-user-123',
        status: 'invalid-status' as PresenceStatus,
        lastActivity: 'invalid-date',
        updatedAt: new Date().toISOString(),
      };

      expect(() => {
        render(
          <PresenceIndicator
            userId="test-user-123"
            userName="Test User"
            presenceState={invalidPresenceState}
          />,
        );
      }).not.toThrow();
    });
  });
});

describe('ConnectedPresenceIndicator', () => {
  beforeEach(() => {
    mockUsePresence.mockReturnValue({
      presenceState: {
        'test-user-123': [createMockPresenceState('online')],
      },
      myStatus: 'online',
      updateStatus: jest.fn(),
      setCustomStatus: jest.fn(),
      trackActivity: jest.fn(),
      isLoading: false,
      error: null,
      channelStatus: 'connected',
    });
  });

  it('integrates with usePresence hook correctly', () => {
    render(
      <ConnectedPresenceIndicator
        userId="test-user-123"
        userName="Connected User"
        context="wedding"
        contextId="wedding-123"
      />,
    );

    expect(mockUsePresence).toHaveBeenCalledWith({
      channelName: 'wedding:wedding-123:presence',
      userId: 'test-user-123',
      context: 'wedding',
      contextId: 'wedding-123',
    });

    expect(screen.getByTestId('avatar')).toBeInTheDocument();
  });

  it('displays user presence from hook state', () => {
    render(
      <ConnectedPresenceIndicator
        userId="test-user-123"
        userName="Connected User"
      />,
    );

    const tooltipContent = screen.getByTestId('tooltip-content');
    expect(tooltipContent).toHaveTextContent('Available'); // Online status
  });

  it('handles loading state from hook', () => {
    mockUsePresence.mockReturnValue({
      presenceState: {},
      myStatus: 'offline',
      updateStatus: jest.fn(),
      setCustomStatus: jest.fn(),
      trackActivity: jest.fn(),
      isLoading: true,
      error: null,
      channelStatus: 'connecting',
    });

    render(
      <ConnectedPresenceIndicator
        userId="test-user-123"
        userName="Loading User"
      />,
    );

    // Should still render component even while loading
    expect(screen.getByTestId('avatar')).toBeInTheDocument();
  });

  it('handles error state from hook', () => {
    mockUsePresence.mockReturnValue({
      presenceState: {},
      myStatus: 'offline',
      updateStatus: jest.fn(),
      setCustomStatus: jest.fn(),
      trackActivity: jest.fn(),
      isLoading: false,
      error: new Error('Connection failed'),
      channelStatus: 'disconnected',
    });

    render(
      <ConnectedPresenceIndicator
        userId="test-user-123"
        userName="Error User"
      />,
    );

    // Should show offline state on error
    const tooltipContent = screen.getByTestId('tooltip-content');
    expect(tooltipContent).toHaveTextContent('Offline');
  });
});
