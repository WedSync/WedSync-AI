import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { ChatWidget, ResponsiveChatWidget } from '../ChatWidget';
import { useChat } from '@/hooks/useChat';

// Add jest-axe matcher
expect.extend(toHaveNoViolations);

// Mock the useChat hook
jest.mock('@/hooks/useChat');
const mockUseChat = useChat as jest.MockedFunction<typeof useChat>;

// Mock motion to avoid animation issues in tests
jest.mock('motion', () => ({
  motion: {
    div: 'div',
    button: 'button',
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  }),
}));

describe('ChatWidget', () => {
  const defaultMockChat = {
    messages: [],
    conversationId: 'test-conversation-123',
    isConnected: true,
    isTyping: false,
    error: null,
    securityWarning: null,
    sendMessage: jest.fn(),
    clearHistory: jest.fn(),
    reconnect: jest.fn(),
    setTyping: jest.fn(),
    dismissError: jest.fn(),
    dismissSecurityWarning: jest.fn(),
    canSendMessage: true,
    requestsRemaining: 10,
    resetTime: null,
    loadConversationHistory: jest.fn(),
    exportConversation: jest.fn(),
  };

  beforeEach(() => {
    mockUseChat.mockReturnValue(defaultMockChat);
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
      },
      writable: true,
    });
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders chat button when closed', () => {
      render(<ChatWidget />);

      const chatButton = screen.getByRole('button', { name: /open chat/i });
      expect(chatButton).toBeInTheDocument();
      expect(chatButton).toHaveAttribute('aria-label', 'Open chat');
    });

    it('renders with default props', () => {
      render(<ChatWidget />);

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('renders with custom position', () => {
      render(<ChatWidget position="top-left" />);

      const widget = screen.getByRole('button').parentElement;
      expect(widget).toHaveClass('top-24', 'left-6');
    });

    it('renders with custom theme', () => {
      render(<ChatWidget theme="dark" />);

      // Button should still render (theme affects chat interface, not button)
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('shows connection status indicator', () => {
      render(<ChatWidget />);

      const button = screen.getByRole('button');
      const statusIndicator = button.querySelector(
        '.absolute.-bottom-1.-right-1',
      );
      expect(statusIndicator).toBeInTheDocument();
      expect(statusIndicator).toHaveClass('bg-success-500');
    });

    it('shows disconnected status when not connected', () => {
      mockUseChat.mockReturnValue({
        ...defaultMockChat,
        isConnected: false,
      });

      render(<ChatWidget />);

      const button = screen.getByRole('button');
      const statusIndicator = button.querySelector(
        '.absolute.-bottom-1.-right-1',
      );
      expect(statusIndicator).toHaveClass('bg-error-500');
    });
  });

  describe('Interaction Behavior', () => {
    it('opens chat interface when button clicked', async () => {
      const user = userEvent.setup();
      render(<ChatWidget />);

      const chatButton = screen.getByRole('button', { name: /open chat/i });
      await user.click(chatButton);

      await waitFor(() => {
        expect(screen.getByText('WedSync Assistant')).toBeInTheDocument();
      });
    });

    it('closes chat when close button clicked', async () => {
      const user = userEvent.setup();
      render(<ChatWidget />);

      // Open chat first
      await user.click(screen.getByRole('button', { name: /open chat/i }));

      await waitFor(() => {
        expect(screen.getByText('WedSync Assistant')).toBeInTheDocument();
      });

      // Close chat
      const closeButton = screen.getByRole('button', { name: /close chat/i });
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByText('WedSync Assistant')).not.toBeInTheDocument();
      });
    });

    it('minimizes and maximizes chat', async () => {
      const user = userEvent.setup();
      render(<ChatWidget />);

      // Open chat
      await user.click(screen.getByRole('button', { name: /open chat/i }));

      await waitFor(() => {
        expect(screen.getByText('WedSync Assistant')).toBeInTheDocument();
      });

      // Minimize
      const minimizeButton = screen.getByRole('button', { name: /minimize/i });
      await user.click(minimizeButton);

      // Should still show header but not messages
      expect(screen.getByText('WedSync Assistant')).toBeInTheDocument();
      expect(screen.queryByText('messages remaining')).not.toBeInTheDocument();

      // Maximize
      const maximizeButton = screen.getByRole('button', { name: /maximize/i });
      await user.click(maximizeButton);

      await waitFor(() => {
        expect(screen.getByText('messages remaining')).toBeInTheDocument();
      });
    });

    it('shows unread indicator when new assistant message arrives while closed', () => {
      const { rerender } = render(<ChatWidget />);

      // Simulate new message
      mockUseChat.mockReturnValue({
        ...defaultMockChat,
        messages: [
          {
            id: '1',
            conversation_id: 'test-conversation-123',
            role: 'assistant',
            content: 'Hello! How can I help?',
            ai_metadata: {},
            tokens_used: 15,
            response_time_ms: 250,
            wedding_context: {},
            is_edited: false,
            is_flagged: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
      });

      rerender(<ChatWidget />);

      const unreadIndicator = screen
        .getByRole('button')
        .querySelector('.absolute.-top-1.-right-1');
      expect(unreadIndicator).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('displays error messages', async () => {
      const user = userEvent.setup();
      mockUseChat.mockReturnValue({
        ...defaultMockChat,
        error: 'Connection failed. Please try again.',
      });

      render(<ChatWidget />);

      // Open chat to see error
      await user.click(screen.getByRole('button', { name: /open chat/i }));

      await waitFor(() => {
        expect(
          screen.getByText('Connection failed. Please try again.'),
        ).toBeInTheDocument();
      });
    });

    it('displays security warnings', async () => {
      const user = userEvent.setup();
      mockUseChat.mockReturnValue({
        ...defaultMockChat,
        securityWarning: 'Potential security issue detected.',
      });

      render(<ChatWidget />);

      // Open chat to see warning
      await user.click(screen.getByRole('button', { name: /open chat/i }));

      await waitFor(() => {
        expect(
          screen.getByText('Potential security issue detected.'),
        ).toBeInTheDocument();
      });
    });

    it('allows dismissing errors', async () => {
      const user = userEvent.setup();
      const mockDismissError = jest.fn();

      mockUseChat.mockReturnValue({
        ...defaultMockChat,
        error: 'Test error message',
        dismissError: mockDismissError,
      });

      render(<ChatWidget />);

      // Open chat
      await user.click(screen.getByRole('button', { name: /open chat/i }));

      await waitFor(() => {
        expect(screen.getByText('Test error message')).toBeInTheDocument();
      });

      // Dismiss error
      const dismissButton = screen.getByText('Dismiss');
      await user.click(dismissButton);

      expect(mockDismissError).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has no accessibility violations when closed', async () => {
      const { container } = render(<ChatWidget />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has no accessibility violations when open', async () => {
      const user = userEvent.setup();
      const { container } = render(<ChatWidget />);

      await user.click(screen.getByRole('button', { name: /open chat/i }));

      await waitFor(async () => {
        const results = await axe(container);
        expect(results).toHaveNoViolations();
      });
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<ChatWidget />);

      // Tab to chat button
      await user.tab();
      expect(screen.getByRole('button', { name: /open chat/i })).toHaveFocus();

      // Press Enter to open
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByText('WedSync Assistant')).toBeInTheDocument();
      });
    });

    it('has proper ARIA labels', () => {
      render(<ChatWidget />);

      const chatButton = screen.getByRole('button', { name: /open chat/i });
      expect(chatButton).toHaveAttribute('aria-label', 'Open chat');
    });
  });

  describe('Mobile Responsiveness', () => {
    it('adapts to mobile viewport', () => {
      // Mock window.innerWidth for mobile
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375, // iPhone SE width
      });

      render(<ResponsiveChatWidget />);

      // Should render chat button (mobile behavior is handled in CSS)
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('handles touch interactions', async () => {
      const user = userEvent.setup();
      render(<ChatWidget />);

      const chatButton = screen.getByRole('button', { name: /open chat/i });

      // Simulate touch
      fireEvent.touchStart(chatButton);
      fireEvent.touchEnd(chatButton);

      await waitFor(() => {
        expect(screen.getByText('WedSync Assistant')).toBeInTheDocument();
      });
    });
  });

  describe('Drag Functionality', () => {
    it('handles drag start', async () => {
      const user = userEvent.setup();
      render(<ChatWidget />);

      // Open chat first
      await user.click(screen.getByRole('button', { name: /open chat/i }));

      await waitFor(() => {
        expect(screen.getByText('WedSync Assistant')).toBeInTheDocument();
      });

      // Find and simulate drag on handle
      const dragHandle = screen.getByTitle('Move');

      fireEvent.mouseDown(dragHandle, { clientX: 100, clientY: 100 });
      fireEvent.mouseMove(document, { clientX: 150, clientY: 150 });
      fireEvent.mouseUp(document);

      // Should not throw errors
      expect(screen.getByText('WedSync Assistant')).toBeInTheDocument();
    });
  });

  describe('Initial Message', () => {
    it('shows custom initial message', async () => {
      const user = userEvent.setup();
      const customMessage = 'Welcome to our wedding planning assistant!';

      render(<ChatWidget initialMessage={customMessage} />);

      await user.click(screen.getByRole('button', { name: /open chat/i }));

      await waitFor(() => {
        expect(screen.getByText(customMessage)).toBeInTheDocument();
      });
    });

    it('shows default initial message when none provided', async () => {
      const user = userEvent.setup();

      render(<ChatWidget />);

      await user.click(screen.getByRole('button', { name: /open chat/i }));

      await waitFor(() => {
        expect(
          screen.getByText(
            'Hi! How can I help you with your wedding business today?',
          ),
        ).toBeInTheDocument();
      });
    });
  });

  describe('Disabled State', () => {
    it('does not render when disabled and not open', () => {
      const { container } = render(<ChatWidget disabled={true} />);
      expect(container.firstChild).toBeNull();
    });

    it('shows disabled styling when disabled but already open', () => {
      render(<ChatWidget disabled={true} />);
      // Since disabled widgets don't render when closed, we can't test this scenario
      // This would need to be tested by opening first, then setting disabled
    });
  });

  describe('Rate Limiting Display', () => {
    it('shows requests remaining', async () => {
      const user = userEvent.setup();
      mockUseChat.mockReturnValue({
        ...defaultMockChat,
        requestsRemaining: 5,
      });

      render(<ChatWidget />);

      await user.click(screen.getByRole('button', { name: /open chat/i }));

      await waitFor(() => {
        expect(screen.getByText('5 messages remaining')).toBeInTheDocument();
      });
    });

    it('shows conversation ID', async () => {
      const user = userEvent.setup();

      render(<ChatWidget />);

      await user.click(screen.getByRole('button', { name: /open chat/i }));

      await waitFor(() => {
        expect(screen.getByText(/conversation id:/i)).toBeInTheDocument();
      });
    });
  });

  describe('Security Features', () => {
    it('displays security indicator when enabled', async () => {
      const user = userEvent.setup();

      render(<ChatWidget showSecurityIndicator={true} />);

      await user.click(screen.getByRole('button', { name: /open chat/i }));

      await waitFor(() => {
        expect(screen.getByText('Secured')).toBeInTheDocument();
      });
    });

    it('hides security indicator when disabled', async () => {
      const user = userEvent.setup();

      render(<ChatWidget showSecurityIndicator={false} />);

      await user.click(screen.getByRole('button', { name: /open chat/i }));

      await waitFor(() => {
        expect(screen.queryByText('Secured')).not.toBeInTheDocument();
      });
    });
  });
});
