import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react';
import userEvent from '@testing-library/user-event';
import { jest } from '@jest/globals';
import { axe, toHaveNoViolations } from 'jest-axe';
import ChatWidget from '@/components/chatbot/ChatWidget';
import { ChatProvider } from '@/contexts/ChatContext';
import { mockOpenAIResponse, mockWebSocketConnection } from '../utils/chatbot-test-utils';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock WebSocket
const mockWebSocket = {
  send: jest.fn(),
  close: jest.fn(),
  readyState: WebSocket.OPEN,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

global.WebSocket = jest.fn(() => mockWebSocket) as any;

// Mock OpenAI API
jest.mock('@/lib/services/openai', () => ({
  sendChatMessage: jest.fn(),
  streamChatResponse: jest.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ChatProvider>
    {children}
  </ChatProvider>
);

describe('ChatWidget Component', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    jest.clearAllMocks();
    mockOpenAIResponse.mockClear();
    mockWebSocketConnection.mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('WS-243-C001: ChatWidget initialization and mounting', () => {
    it('renders chat widget correctly with default props', () => {
      render(
        <TestWrapper>
          <ChatWidget />
        </TestWrapper>
      );

      expect(screen.getByRole('button', { name: /open chat/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/wedding planning assistant/i)).toBeInTheDocument();
    });

    it('handles props correctly', () => {
      const customProps = {
        initialMessage: 'Welcome to your wedding planning!',
        theme: 'wedding-elegant',
        position: 'bottom-left' as const,
        isOpen: true,
      };

      render(
        <TestWrapper>
          <ChatWidget {...customProps} />
        </TestWrapper>
      );

      expect(screen.getByText('Welcome to your wedding planning!')).toBeInTheDocument();
      expect(screen.getByTestId('chat-widget')).toHaveClass('wedding-elegant');
      expect(screen.getByTestId('chat-widget')).toHaveClass('bottom-left');
    });

    it('manages state correctly during initialization', async () => {
      render(
        <TestWrapper>
          <ChatWidget />
        </TestWrapper>
      );

      const chatTrigger = screen.getByRole('button', { name: /open chat/i });
      
      await user.click(chatTrigger);
      
      await waitFor(() => {
        expect(screen.getByRole('dialog', { name: /wedding planning chat/i })).toBeInTheDocument();
      });

      expect(screen.getByPlaceholderText(/ask about your wedding/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send message/i })).toBeInTheDocument();
    });

    it('validates event handlers are properly attached', async () => {
      const onMessageSent = jest.fn();
      const onChatToggle = jest.fn();

      render(
        <TestWrapper>
          <ChatWidget 
            onMessageSent={onMessageSent}
            onChatToggle={onChatToggle}
          />
        </TestWrapper>
      );

      const chatTrigger = screen.getByRole('button', { name: /open chat/i });
      await user.click(chatTrigger);
      
      expect(onChatToggle).toHaveBeenCalledWith(true);

      const messageInput = screen.getByPlaceholderText(/ask about your wedding/i);
      const sendButton = screen.getByRole('button', { name: /send message/i });

      await user.type(messageInput, 'How do I plan my wedding timeline?');
      await user.click(sendButton);

      expect(onMessageSent).toHaveBeenCalledWith('How do I plan my wedding timeline?');
    });

    it('initializes WebSocket connection properly', async () => {
      render(
        <TestWrapper>
          <ChatWidget />
        </TestWrapper>
      );

      const chatTrigger = screen.getByRole('button', { name: /open chat/i });
      await user.click(chatTrigger);

      await waitFor(() => {
        expect(global.WebSocket).toHaveBeenCalledWith(
          expect.stringContaining('wss://')
        );
      });

      expect(mockWebSocket.addEventListener).toHaveBeenCalledWith(
        'message',
        expect.any(Function)
      );
    });
  });

  describe('WS-243-C002: ChatWidget responsive behavior', () => {
    it('adapts to mobile viewport correctly', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 667,
      });

      render(
        <TestWrapper>
          <ChatWidget />
        </TestWrapper>
      );

      const widget = screen.getByTestId('chat-widget');
      expect(widget).toHaveClass('mobile-optimized');
      expect(widget).toHaveStyle({ 
        width: '100%', 
        height: '100vh',
        position: 'fixed',
        top: 0,
        left: 0,
      });
    });

    it('adjusts for tablet landscape mode', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      });

      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 768,
      });

      render(
        <TestWrapper>
          <ChatWidget />
        </TestWrapper>
      );

      const widget = screen.getByTestId('chat-widget');
      expect(widget).toHaveClass('tablet-landscape');
      expect(widget).toHaveStyle({
        width: '400px',
        height: '600px',
      });
    });

    it('positions correctly on desktop', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1920,
      });

      render(
        <TestWrapper>
          <ChatWidget position="bottom-right" />
        </TestWrapper>
      );

      const widget = screen.getByTestId('chat-widget');
      expect(widget).toHaveClass('desktop-positioned');
      expect(widget).toHaveStyle({
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        width: '380px',
        height: '600px',
      });
    });

    it('handles touch interactions properly', async () => {
      const onTouchInteraction = jest.fn();

      render(
        <TestWrapper>
          <ChatWidget onTouchStart={onTouchInteraction} />
        </TestWrapper>
      );

      const chatTrigger = screen.getByRole('button', { name: /open chat/i });
      
      fireEvent.touchStart(chatTrigger, {
        touches: [{ clientX: 100, clientY: 100 }],
      });

      expect(onTouchInteraction).toHaveBeenCalled();
      
      // Verify touch targets meet accessibility requirements (44x44px minimum)
      const touchTargets = screen.getAllByRole('button');
      touchTargets.forEach(target => {
        const styles = window.getComputedStyle(target);
        const minSize = 44;
        expect(parseFloat(styles.minWidth)).toBeGreaterThanOrEqual(minSize);
        expect(parseFloat(styles.minHeight)).toBeGreaterThanOrEqual(minSize);
      });
    });

    it('responds to orientation changes', async () => {
      const orientationChangeEvent = new Event('orientationchange');
      
      render(
        <TestWrapper>
          <ChatWidget />
        </TestWrapper>
      );

      act(() => {
        Object.defineProperty(screen, 'orientation', {
          writable: true,
          configurable: true,
          value: { angle: 90 },
        });
        window.dispatchEvent(orientationChangeEvent);
      });

      await waitFor(() => {
        const widget = screen.getByTestId('chat-widget');
        expect(widget).toHaveClass('landscape-mode');
      });
    });
  });

  describe('WS-243-C003: ChatWidget accessibility compliance', () => {
    it('meets WCAG 2.1 AA standards', async () => {
      const { container } = render(
        <TestWrapper>
          <ChatWidget isOpen={true} />
        </TestWrapper>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('provides proper ARIA labels and roles', () => {
      render(
        <TestWrapper>
          <ChatWidget isOpen={true} />
        </TestWrapper>
      );

      expect(screen.getByRole('dialog')).toHaveAttribute(
        'aria-labelledby',
        'chat-widget-title'
      );
      
      expect(screen.getByRole('textbox')).toHaveAttribute(
        'aria-label',
        'Type your wedding planning question'
      );

      expect(screen.getByRole('log')).toHaveAttribute(
        'aria-label',
        'Chat conversation history'
      );

      expect(screen.getByRole('button', { name: /close chat/i })).toHaveAttribute(
        'aria-label',
        'Close wedding planning chat'
      );
    });

    it('supports keyboard navigation', async () => {
      render(
        <TestWrapper>
          <ChatWidget />
        </TestWrapper>
      );

      const chatTrigger = screen.getByRole('button', { name: /open chat/i });
      chatTrigger.focus();
      
      // Test Enter key to open chat
      await user.keyboard('{Enter}');
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Test Tab navigation
      await user.keyboard('{Tab}');
      expect(screen.getByPlaceholderText(/ask about your wedding/i)).toHaveFocus();

      await user.keyboard('{Tab}');
      expect(screen.getByRole('button', { name: /send message/i })).toHaveFocus();

      // Test Escape key to close
      await user.keyboard('{Escape}');
      
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('maintains focus management correctly', async () => {
      render(
        <TestWrapper>
          <ChatWidget />
        </TestWrapper>
      );

      const chatTrigger = screen.getByRole('button', { name: /open chat/i });
      await user.click(chatTrigger);

      // Focus should move to the input field when chat opens
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/ask about your wedding/i)).toHaveFocus();
      });

      // When message is sent, focus should return to input
      const messageInput = screen.getByPlaceholderText(/ask about your wedding/i);
      const sendButton = screen.getByRole('button', { name: /send message/i });

      await user.type(messageInput, 'Test message');
      await user.click(sendButton);

      await waitFor(() => {
        expect(messageInput).toHaveFocus();
        expect(messageInput).toHaveValue('');
      });
    });

    it('works with screen readers', () => {
      render(
        <TestWrapper>
          <ChatWidget isOpen={true} />
        </TestWrapper>
      );

      // Check for screen reader announcements
      expect(screen.getByRole('status')).toHaveAttribute(
        'aria-live',
        'polite'
      );

      expect(screen.getByRole('status')).toHaveAttribute(
        'aria-atomic',
        'true'
      );

      // Verify messages are announced
      const messageHistory = screen.getByRole('log');
      expect(messageHistory).toHaveAttribute('aria-live', 'polite');
      expect(messageHistory).toHaveAttribute('aria-relevant', 'additions text');
    });

    it('provides high contrast mode support', () => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-contrast: high)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      render(
        <TestWrapper>
          <ChatWidget />
        </TestWrapper>
      );

      const widget = screen.getByTestId('chat-widget');
      expect(widget).toHaveClass('high-contrast-mode');
    });
  });

  describe('WS-243-C004: ChatWidget error boundary handling', () => {
    it('recovers gracefully from JavaScript errors', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const ErrorComponent = () => {
        throw new Error('Test error');
      };

      render(
        <TestWrapper>
          <ChatWidget>
            <ErrorComponent />
          </ChatWidget>
        </TestWrapper>
      );

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      
      consoleSpy.mockRestore();
    });

    it('handles network failures gracefully', async () => {
      // Mock network failure
      mockOpenAIResponse.mockRejectedValue(new Error('Network error'));

      render(
        <TestWrapper>
          <ChatWidget />
        </TestWrapper>
      );

      const chatTrigger = screen.getByRole('button', { name: /open chat/i });
      await user.click(chatTrigger);

      const messageInput = screen.getByPlaceholderText(/ask about your wedding/i);
      const sendButton = screen.getByRole('button', { name: /send message/i });

      await user.type(messageInput, 'Test message');
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText(/connection error/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });

    it('provides fallback UI when features unavailable', () => {
      // Mock WebSocket as unavailable
      global.WebSocket = undefined;

      render(
        <TestWrapper>
          <ChatWidget />
        </TestWrapper>
      );

      expect(screen.getByText(/chat currently unavailable/i)).toBeInTheDocument();
      expect(screen.getByText(/please try again later/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /contact support/i })).toBeInTheDocument();
    });

    it('maintains state consistency after errors', async () => {
      mockOpenAIResponse
        .mockRejectedValueOnce(new Error('First error'))
        .mockResolvedValueOnce({ message: 'Success response' });

      render(
        <TestWrapper>
          <ChatWidget />
        </TestWrapper>
      );

      const chatTrigger = screen.getByRole('button', { name: /open chat/i });
      await user.click(chatTrigger);

      const messageInput = screen.getByPlaceholderText(/ask about your wedding/i);
      const sendButton = screen.getByRole('button', { name: /send message/i });

      // First attempt fails
      await user.type(messageInput, 'Test message');
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText(/connection error/i)).toBeInTheDocument();
      });

      // Retry succeeds
      const retryButton = screen.getByRole('button', { name: /retry/i });
      await user.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('Success response')).toBeInTheDocument();
        expect(screen.queryByText(/connection error/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('WS-243-C005: ChatWidget state persistence', () => {
    beforeEach(() => {
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
    });

    it('saves conversation to localStorage', async () => {
      const mockSetItem = window.localStorage.setItem as jest.Mock;

      render(
        <TestWrapper>
          <ChatWidget />
        </TestWrapper>
      );

      const chatTrigger = screen.getByRole('button', { name: /open chat/i });
      await user.click(chatTrigger);

      const messageInput = screen.getByPlaceholderText(/ask about your wedding/i);
      await user.type(messageInput, 'How do I plan my wedding?');
      
      const sendButton = screen.getByRole('button', { name: /send message/i });
      await user.click(sendButton);

      await waitFor(() => {
        expect(mockSetItem).toHaveBeenCalledWith(
          'wedsync_chat_conversation',
          expect.stringContaining('How do I plan my wedding?')
        );
      });
    });

    it('restores conversation from localStorage', () => {
      const mockGetItem = window.localStorage.getItem as jest.Mock;
      const savedConversation = JSON.stringify([
        { role: 'user', content: 'Previous message', timestamp: Date.now() }
      ]);
      
      mockGetItem.mockReturnValue(savedConversation);

      render(
        <TestWrapper>
          <ChatWidget />
        </TestWrapper>
      );

      const chatTrigger = screen.getByRole('button', { name: /open chat/i });
      fireEvent.click(chatTrigger);

      expect(screen.getByText('Previous message')).toBeInTheDocument();
      expect(mockGetItem).toHaveBeenCalledWith('wedsync_chat_conversation');
    });

    it('maintains session across page refreshes', () => {
      const sessionData = {
        isOpen: true,
        conversationId: 'conv-123',
        weddingContext: { date: '2024-06-15', venue: 'Garden Venue' }
      };

      const mockGetItem = window.localStorage.getItem as jest.Mock;
      mockGetItem.mockReturnValue(JSON.stringify(sessionData));

      render(
        <TestWrapper>
          <ChatWidget />
        </TestWrapper>
      );

      // Should restore open state
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      
      // Should restore wedding context
      expect(screen.getByText(/garden venue/i)).toBeInTheDocument();
      expect(screen.getByText(/june 15, 2024/i)).toBeInTheDocument();
    });

    it('handles corrupted localStorage data gracefully', () => {
      const mockGetItem = window.localStorage.getItem as jest.Mock;
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      mockGetItem.mockReturnValue('invalid json data');

      render(
        <TestWrapper>
          <ChatWidget />
        </TestWrapper>
      );

      expect(screen.getByRole('button', { name: /open chat/i })).toBeInTheDocument();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to parse saved conversation')
      );
      
      consoleSpy.mockRestore();
    });

    it('clears sensitive data after session timeout', async () => {
      const mockRemoveItem = window.localStorage.removeItem as jest.Mock;
      
      // Mock Date.now to simulate session timeout
      const originalNow = Date.now;
      const mockNow = jest.fn();
      Date.now = mockNow;
      
      mockNow.mockReturnValue(Date.now() + (25 * 60 * 1000)); // 25 minutes later

      render(
        <TestWrapper>
          <ChatWidget sessionTimeout={24 * 60 * 1000} /> {/* 24 minute timeout */}
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockRemoveItem).toHaveBeenCalledWith('wedsync_chat_conversation');
        expect(mockRemoveItem).toHaveBeenCalledWith('wedsync_chat_session');
      });

      Date.now = originalNow;
    });
  });

  describe('WS-243-C008: ChatWidget wedding context integration', () => {
    it('displays wedding date context correctly', () => {
      const weddingContext = {
        date: '2024-06-15',
        venue: 'Sunset Gardens',
        guestCount: 150
      };

      render(
        <TestWrapper>
          <ChatWidget 
            weddingContext={weddingContext}
            isOpen={true}
          />
        </TestWrapper>
      );

      expect(screen.getByText('Wedding: June 15, 2024')).toBeInTheDocument();
      expect(screen.getByText('Venue: Sunset Gardens')).toBeInTheDocument();
      expect(screen.getByText('Guests: 150')).toBeInTheDocument();
    });

    it('integrates venue information in conversations', async () => {
      const weddingContext = {
        venue: { name: 'Sunset Gardens', type: 'outdoor', capacity: 200 }
      };

      render(
        <TestWrapper>
          <ChatWidget 
            weddingContext={weddingContext}
            isOpen={true}
          />
        </TestWrapper>
      );

      const messageInput = screen.getByPlaceholderText(/ask about your wedding/i);
      await user.type(messageInput, 'What should I consider for outdoor photography?');
      
      await user.click(screen.getByRole('button', { name: /send message/i }));

      await waitFor(() => {
        expect(mockOpenAIResponse).toHaveBeenCalledWith(
          expect.objectContaining({
            context: expect.objectContaining({
              venue: expect.objectContaining({
                name: 'Sunset Gardens',
                type: 'outdoor'
              })
            })
          })
        );
      });
    });

    it('updates context based on guest count changes', async () => {
      const { rerender } = render(
        <TestWrapper>
          <ChatWidget 
            weddingContext={{ guestCount: 100 }}
            isOpen={true}
          />
        </TestWrapper>
      );

      expect(screen.getByText('Guests: 100')).toBeInTheDocument();

      rerender(
        <TestWrapper>
          <ChatWidget 
            weddingContext={{ guestCount: 150 }}
            isOpen={true}
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Guests: 150')).toBeInTheDocument();
        expect(screen.queryByText('Guests: 100')).not.toBeInTheDocument();
      });
    });

    it('provides context-aware suggestions', async () => {
      const weddingContext = {
        date: '2024-12-20', // Winter wedding
        style: 'rustic',
        budget: 25000
      };

      render(
        <TestWrapper>
          <ChatWidget 
            weddingContext={weddingContext}
            isOpen={true}
          />
        </TestWrapper>
      );

      // Should show winter-specific and budget-appropriate suggestions
      await waitFor(() => {
        expect(screen.getByText(/winter wedding considerations/i)).toBeInTheDocument();
        expect(screen.getByText(/rustic decoration ideas/i)).toBeInTheDocument();
        expect(screen.getByText(/budget-friendly options/i)).toBeInTheDocument();
      });
    });
  });

  describe('Performance and Memory Management', () => {
    it('does not cause memory leaks', async () => {
      const { unmount } = render(
        <TestWrapper>
          <ChatWidget isOpen={true} />
        </TestWrapper>
      );

      // Add many messages to test memory cleanup
      for (let i = 0; i < 100; i++) {
        const messageInput = screen.getByPlaceholderText(/ask about your wedding/i);
        await user.type(messageInput, `Test message ${i}`);
        await user.click(screen.getByRole('button', { name: /send message/i }));
      }

      unmount();

      // Verify WebSocket is closed
      expect(mockWebSocket.close).toHaveBeenCalled();
      
      // Verify event listeners are removed
      expect(mockWebSocket.removeEventListener).toHaveBeenCalledWith(
        'message',
        expect.any(Function)
      );
    });

    it('efficiently handles large conversation histories', async () => {
      const largeConversation = Array.from({ length: 1000 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}`,
        timestamp: Date.now() - (1000 - i) * 1000
      }));

      const mockGetItem = window.localStorage.getItem as jest.Mock;
      mockGetItem.mockReturnValue(JSON.stringify(largeConversation));

      const startTime = performance.now();
      
      render(
        <TestWrapper>
          <ChatWidget />
        </TestWrapper>
      );

      const chatTrigger = screen.getByRole('button', { name: /open chat/i });
      await user.click(chatTrigger);

      const endTime = performance.now();
      
      // Should load within reasonable time (less than 100ms for 1000 messages)
      expect(endTime - startTime).toBeLessThan(100);
      
      // Should implement virtual scrolling for performance
      const messageContainer = screen.getByRole('log');
      expect(messageContainer).toHaveAttribute('data-virtualized', 'true');
    });
  });
});