import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { MessageBubble } from '../MessageBubble';
import { ChatbotMessage } from '@/types/chatbot';

expect.extend(toHaveNoViolations);

// Mock motion
jest.mock('motion', () => ({
  motion: {
    div: 'div',
    button: 'button',
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

describe('MessageBubble', () => {
  const baseMockMessage: ChatbotMessage = {
    id: 'test-message-1',
    conversation_id: 'test-conversation-123',
    role: 'user',
    content: 'Hello, can you help me with my wedding planning?',
    ai_metadata: {},
    tokens_used: 0,
    response_time_ms: 0,
    wedding_context: {},
    is_edited: false,
    is_flagged: false,
    created_at: '2025-01-20T10:30:00Z',
    updated_at: '2025-01-20T10:30:00Z',
  };

  const mockAssistantMessage: ChatbotMessage = {
    ...baseMockMessage,
    id: 'test-message-2',
    role: 'assistant',
    content:
      "I'd be happy to help with your wedding planning! What specific area would you like assistance with?",
    tokens_used: 25,
    response_time_ms: 1200,
    ai_metadata: {
      model: 'gpt-4',
      temperature: 0.7,
    },
  };

  // Mock navigator.clipboard
  const mockClipboard = {
    writeText: jest.fn(() => Promise.resolve()),
  };

  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: mockClipboard,
    });
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders user message correctly', () => {
      render(<MessageBubble message={baseMockMessage} isBot={false} />);

      expect(
        screen.getByText('Hello, can you help me with my wedding planning?'),
      ).toBeInTheDocument();
    });

    it('renders assistant message correctly', () => {
      render(<MessageBubble message={mockAssistantMessage} isBot={true} />);

      expect(
        screen.getByText(/I'd be happy to help with your wedding planning/),
      ).toBeInTheDocument();
    });

    it('displays user avatar when showAvatar is true', () => {
      render(
        <MessageBubble
          message={baseMockMessage}
          isBot={false}
          showAvatar={true}
        />,
      );

      const avatar = screen
        .getByRole('generic')
        .querySelector('.w-8.h-8.rounded-full');
      expect(avatar).toBeInTheDocument();
    });

    it('displays bot avatar when showAvatar is true', () => {
      render(
        <MessageBubble
          message={mockAssistantMessage}
          isBot={true}
          showAvatar={true}
        />,
      );

      const avatar = screen
        .getByRole('generic')
        .querySelector('.w-8.h-8.rounded-full');
      expect(avatar).toBeInTheDocument();
    });

    it('hides avatar when showAvatar is false', () => {
      render(
        <MessageBubble
          message={baseMockMessage}
          isBot={false}
          showAvatar={false}
        />,
      );

      const avatar = screen
        .queryByRole('generic')
        ?.querySelector('.w-8.h-8.rounded-full');
      expect(avatar).not.toBeInTheDocument();
    });

    it('displays timestamp when showTimestamp is true', () => {
      render(
        <MessageBubble
          message={baseMockMessage}
          isBot={false}
          showTimestamp={true}
        />,
      );

      // Should show some form of time (exact format may vary)
      expect(screen.getByText(/ago|Just now/)).toBeInTheDocument();
    });

    it('hides timestamp when showTimestamp is false', () => {
      render(
        <MessageBubble
          message={baseMockMessage}
          isBot={false}
          showTimestamp={false}
        />,
      );

      expect(screen.queryByText(/ago|Just now/)).not.toBeInTheDocument();
    });
  });

  describe('Message Styling', () => {
    it('applies correct styling for user messages', () => {
      render(<MessageBubble message={baseMockMessage} isBot={false} />);

      const messageContent = screen.getByText(
        'Hello, can you help me with my wedding planning?',
      ).parentElement;
      expect(messageContent).toHaveClass('bg-primary-600', 'text-white');
    });

    it('applies correct styling for bot messages', () => {
      render(<MessageBubble message={mockAssistantMessage} isBot={true} />);

      const messageContent =
        screen.getByText(/I'd be happy to help/).parentElement;
      expect(messageContent).toHaveClass('bg-gray-100', 'text-gray-900');
    });

    it('shows latest message indicator for bot messages', () => {
      render(
        <MessageBubble
          message={mockAssistantMessage}
          isBot={true}
          isLatest={true}
        />,
      );

      const indicator = screen
        .getByRole('generic')
        .querySelector('.absolute.-bottom-2.left-11');
      expect(indicator).toBeInTheDocument();
    });

    it('does not show latest indicator for user messages', () => {
      render(
        <MessageBubble
          message={baseMockMessage}
          isBot={false}
          isLatest={true}
        />,
      );

      const indicator = screen
        .queryByRole('generic')
        ?.querySelector('.absolute.-bottom-2.left-11');
      expect(indicator).not.toBeInTheDocument();
    });
  });

  describe('Flagged Messages', () => {
    it('displays flagged message indicator', () => {
      const flaggedMessage = {
        ...baseMockMessage,
        is_flagged: true,
        flag_reason: 'Inappropriate content',
      };

      render(<MessageBubble message={flaggedMessage} isBot={false} />);

      expect(
        screen.getByText('Flagged: Inappropriate content'),
      ).toBeInTheDocument();
    });

    it('applies flagged message styling', () => {
      const flaggedMessage = {
        ...baseMockMessage,
        is_flagged: true,
      };

      render(<MessageBubble message={flaggedMessage} isBot={false} />);

      const messageContent = screen
        .getByText('Hello, can you help me with my wedding planning?')
        .closest('.border-l-4');
      expect(messageContent).toHaveClass('border-error-500');
    });

    it('shows flagged status in timestamp area', () => {
      const flaggedMessage = {
        ...baseMockMessage,
        is_flagged: true,
      };

      render(
        <MessageBubble
          message={flaggedMessage}
          isBot={false}
          showTimestamp={true}
        />,
      );

      expect(screen.getByText('Flagged')).toBeInTheDocument();
    });
  });

  describe('Edited Messages', () => {
    it('shows edited indicator for edited messages', () => {
      const editedMessage = {
        ...baseMockMessage,
        is_edited: true,
      };

      render(<MessageBubble message={editedMessage} isBot={false} />);

      expect(screen.getByText('(edited)')).toBeInTheDocument();
    });

    it('does not show edited indicator for non-edited messages', () => {
      render(<MessageBubble message={baseMockMessage} isBot={false} />);

      expect(screen.queryByText('(edited)')).not.toBeInTheDocument();
    });
  });

  describe('AI Metadata Display', () => {
    it('shows AI metadata for assistant messages with tokens', () => {
      render(<MessageBubble message={mockAssistantMessage} isBot={true} />);

      expect(screen.getByText('AI Response')).toBeInTheDocument();
      expect(screen.getByText('25 tokens')).toBeInTheDocument();
      expect(screen.getByText('1200ms')).toBeInTheDocument();
    });

    it('does not show AI metadata for user messages', () => {
      render(<MessageBubble message={baseMockMessage} isBot={false} />);

      expect(screen.queryByText('AI Response')).not.toBeInTheDocument();
    });

    it('does not show AI metadata for bot messages without tokens', () => {
      const messageWithoutTokens = {
        ...mockAssistantMessage,
        tokens_used: 0,
      };

      render(<MessageBubble message={messageWithoutTokens} isBot={true} />);

      expect(screen.queryByText('AI Response')).not.toBeInTheDocument();
    });
  });

  describe('Message Status', () => {
    it('shows delivered status for user messages', () => {
      render(
        <MessageBubble
          message={baseMockMessage}
          isBot={false}
          showTimestamp={true}
        />,
      );

      expect(screen.getByText('Delivered')).toBeInTheDocument();
    });

    it('shows connection status styling for successful messages', () => {
      const successMessage = {
        ...mockAssistantMessage,
        tokens_used: 25,
      };

      render(<MessageBubble message={successMessage} isBot={true} />);

      const messageContent = screen
        .getByText(/I'd be happy to help/)
        .closest('.border-l-4');
      expect(messageContent).toHaveClass('border-success-500');
    });
  });

  describe('Interactive Features', () => {
    it('shows action buttons on hover', async () => {
      const user = userEvent.setup();
      render(<MessageBubble message={baseMockMessage} isBot={false} />);

      const messageElement = screen
        .getByText('Hello, can you help me with my wedding planning?')
        .closest('.relative');

      if (messageElement) {
        await user.hover(messageElement);

        await waitFor(() => {
          const copyButton = screen.getByTitle('Copy message');
          expect(copyButton).toBeInTheDocument();
        });
      }
    });

    it('copies message to clipboard when copy button clicked', async () => {
      const user = userEvent.setup();
      render(<MessageBubble message={baseMockMessage} isBot={false} />);

      const messageElement = screen
        .getByText('Hello, can you help me with my wedding planning?')
        .closest('.relative');

      if (messageElement) {
        await user.hover(messageElement);

        await waitFor(() => {
          const copyButton = screen.getByTitle('Copy message');
          expect(copyButton).toBeInTheDocument();
        });

        const copyButton = screen.getByTitle('Copy message');
        await user.click(copyButton);

        expect(mockClipboard.writeText).toHaveBeenCalledWith(
          'Hello, can you help me with my wedding planning?',
        );
      }
    });

    it('shows copied confirmation after successful copy', async () => {
      const user = userEvent.setup();
      render(<MessageBubble message={baseMockMessage} isBot={false} />);

      const messageElement = screen
        .getByText('Hello, can you help me with my wedding planning?')
        .closest('.relative');

      if (messageElement) {
        await user.hover(messageElement);

        const copyButton = await screen.findByTitle('Copy message');
        await user.click(copyButton);

        await waitFor(() => {
          expect(
            copyButton.querySelector('.text-success-500'),
          ).toBeInTheDocument();
        });
      }
    });

    it('calls onResend when resend button clicked', async () => {
      const user = userEvent.setup();
      const mockOnResend = jest.fn();

      render(
        <MessageBubble
          message={baseMockMessage}
          isBot={false}
          onResend={mockOnResend}
        />,
      );

      const messageElement = screen
        .getByText('Hello, can you help me with my wedding planning?')
        .closest('.relative');

      if (messageElement) {
        await user.hover(messageElement);

        const resendButton = await screen.findByTitle('Resend message');
        await user.click(resendButton);

        expect(mockOnResend).toHaveBeenCalled();
      }
    });

    it('calls onCopy callback when copy successful', async () => {
      const user = userEvent.setup();
      const mockOnCopy = jest.fn();

      render(
        <MessageBubble
          message={baseMockMessage}
          isBot={false}
          onCopy={mockOnCopy}
        />,
      );

      const messageElement = screen
        .getByText('Hello, can you help me with my wedding planning?')
        .closest('.relative');

      if (messageElement) {
        await user.hover(messageElement);

        const copyButton = await screen.findByTitle('Copy message');
        await user.click(copyButton);

        await waitFor(() => {
          expect(mockOnCopy).toHaveBeenCalled();
        });
      }
    });
  });

  describe('Time Formatting', () => {
    it('shows "Just now" for very recent messages', () => {
      const recentMessage = {
        ...baseMockMessage,
        created_at: new Date().toISOString(),
      };

      render(
        <MessageBubble
          message={recentMessage}
          isBot={false}
          showTimestamp={true}
        />,
      );

      expect(screen.getByText('Just now')).toBeInTheDocument();
    });

    it('shows minutes ago for recent messages', () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const recentMessage = {
        ...baseMockMessage,
        created_at: fiveMinutesAgo,
      };

      render(
        <MessageBubble
          message={recentMessage}
          isBot={false}
          showTimestamp={true}
        />,
      );

      expect(screen.getByText('5m ago')).toBeInTheDocument();
    });

    it('shows hours ago for older messages', () => {
      const twoHoursAgo = new Date(
        Date.now() - 2 * 60 * 60 * 1000,
      ).toISOString();
      const oldMessage = {
        ...baseMockMessage,
        created_at: twoHoursAgo,
      };

      render(
        <MessageBubble
          message={oldMessage}
          isBot={false}
          showTimestamp={true}
        />,
      );

      expect(screen.getByText('2h ago')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has no accessibility violations for user message', async () => {
      const { container } = render(
        <MessageBubble message={baseMockMessage} isBot={false} />,
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has no accessibility violations for bot message', async () => {
      const { container } = render(
        <MessageBubble message={mockAssistantMessage} isBot={true} />,
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has proper button accessibility', async () => {
      const user = userEvent.setup();
      render(<MessageBubble message={baseMockMessage} isBot={false} />);

      const messageElement = screen
        .getByText('Hello, can you help me with my wedding planning?')
        .closest('.relative');

      if (messageElement) {
        await user.hover(messageElement);

        const copyButton = await screen.findByTitle('Copy message');
        expect(copyButton).toHaveAttribute('aria-label', 'Copy message');
      }
    });

    it('maintains focus management for interactive elements', async () => {
      const user = userEvent.setup();
      render(
        <MessageBubble
          message={baseMockMessage}
          isBot={false}
          onResend={jest.fn()}
        />,
      );

      const messageElement = screen
        .getByText('Hello, can you help me with my wedding planning?')
        .closest('.relative');

      if (messageElement) {
        await user.hover(messageElement);

        await user.tab();

        const copyButton = await screen.findByTitle('Copy message');
        expect(copyButton).toHaveFocus();
      }
    });
  });

  describe('Content Sanitization', () => {
    it('preserves line breaks in message content', () => {
      const messageWithBreaks = {
        ...baseMockMessage,
        content: 'Line 1\nLine 2\nLine 3',
      };

      render(<MessageBubble message={messageWithBreaks} isBot={false} />);

      const messageContent = screen.getByText('Line 1\nLine 2\nLine 3');
      expect(messageContent).toHaveClass('whitespace-pre-wrap');
    });

    it('handles long messages without breaking layout', () => {
      const longMessage = {
        ...baseMockMessage,
        content:
          'This is a very long message that should wrap properly and not break the layout of the chat interface. '.repeat(
            10,
          ),
      };

      render(<MessageBubble message={longMessage} isBot={false} />);

      const messageContent = screen.getByText(
        /This is a very long message/,
      ).parentElement;
      expect(messageContent).toHaveClass('break-words');
    });
  });

  describe('Error Handling', () => {
    it('handles clipboard API failures gracefully', async () => {
      const user = userEvent.setup();

      // Mock clipboard failure
      mockClipboard.writeText.mockRejectedValue(
        new Error('Clipboard not available'),
      );

      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      render(<MessageBubble message={baseMockMessage} isBot={false} />);

      const messageElement = screen
        .getByText('Hello, can you help me with my wedding planning?')
        .closest('.relative');

      if (messageElement) {
        await user.hover(messageElement);

        const copyButton = await screen.findByTitle('Copy message');
        await user.click(copyButton);

        expect(consoleSpy).toHaveBeenCalledWith(
          'Failed to copy message:',
          expect.any(Error),
        );
      }

      consoleSpy.mockRestore();
    });
  });
});
