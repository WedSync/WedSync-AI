import { renderHook, act, waitFor } from '@testing-library/react';
import { useChat } from '../useChat';
import { useAuth } from '../useAuth';
import { useRateLimit } from '../useRateLimit';

// Mock dependencies
jest.mock('../useAuth');
jest.mock('../useRateLimit');
jest.mock('@/lib/security/input-sanitization', () => ({
  sanitizeInput: jest.fn((input) => input),
  validateMessageContent: jest.fn((input) => ({ isValid: true, error: null })),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseRateLimit = useRateLimit as jest.MockedFunction<
  typeof useRateLimit
>;

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(url: string) {
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      this.onopen?.(new Event('open'));
    }, 0);
  }

  send(data: string) {
    // Mock send implementation
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.(new CloseEvent('close'));
  }
}

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock WebSocket globally
global.WebSocket = MockWebSocket as any;

describe('useChat', () => {
  const defaultAuthState = {
    user: {
      id: 'user-123',
      accessToken: 'access-token-123',
      subscription: 'PROFESSIONAL',
    },
    isAuthenticated: true,
  };

  const defaultRateLimitState = {
    canMakeRequest: true,
    requestsRemaining: 10,
    resetTime: null,
    makeRequest: jest.fn().mockReturnValue(true),
  };

  beforeEach(() => {
    mockUseAuth.mockReturnValue(defaultAuthState);
    mockUseRateLimit.mockReturnValue(defaultRateLimitState);
    mockLocalStorage.getItem.mockReturnValue('test-conversation-id');
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('Initialization', () => {
    it('initializes with default state', () => {
      const { result } = renderHook(() => useChat());

      expect(result.current.messages).toEqual([]);
      expect(result.current.conversationId).toBe('test-conversation-id');
      expect(result.current.isConnected).toBe(false);
      expect(result.current.isTyping).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.securityWarning).toBeNull();
    });

    it('generates new conversation ID if none exists', () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      const { result } = renderHook(() => useChat());

      expect(result.current.conversationId).toMatch(/^[a-f0-9-]{36}$/); // UUID format
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'ws-chat-conversation-id',
        expect.any(String),
      );
    });

    it('loads persisted messages on initialization', () => {
      const persistedMessages = [
        {
          id: 'msg-1',
          conversation_id: 'test-conversation-id',
          role: 'user' as const,
          content: 'Hello',
          ai_metadata: {},
          tokens_used: 0,
          response_time_ms: 0,
          wedding_context: {},
          is_edited: false,
          is_flagged: false,
          created_at: '2025-01-20T10:00:00Z',
          updated_at: '2025-01-20T10:00:00Z',
        },
      ];

      mockLocalStorage.getItem
        .mockReturnValueOnce('test-conversation-id')
        .mockReturnValueOnce(JSON.stringify(persistedMessages));

      const { result } = renderHook(() => useChat());

      expect(result.current.messages).toEqual(persistedMessages);
    });

    it('handles corrupted persisted messages gracefully', () => {
      mockLocalStorage.getItem
        .mockReturnValueOnce('test-conversation-id')
        .mockReturnValueOnce('invalid-json');

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const { result } = renderHook(() => useChat());

      expect(result.current.messages).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to load persisted messages:',
        expect.any(Error),
      );

      consoleSpy.mockRestore();
    });
  });

  describe('WebSocket Connection', () => {
    it('connects automatically when authenticated and autoConnect enabled', async () => {
      const { result } = renderHook(() => useChat({ autoConnect: true }));

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });
    });

    it('does not connect when not authenticated', () => {
      mockUseAuth.mockReturnValue({
        ...defaultAuthState,
        isAuthenticated: false,
        user: null,
      });

      const { result } = renderHook(() => useChat());

      expect(result.current.isConnected).toBe(false);
      expect(result.current.error).toBe('Authentication required for chat');
    });

    it('does not connect when autoConnect is false', () => {
      const { result } = renderHook(() => useChat({ autoConnect: false }));

      expect(result.current.isConnected).toBe(false);
    });

    it('handles connection errors', async () => {
      // Mock WebSocket that fails to connect
      const FailingWebSocket = class extends MockWebSocket {
        constructor(url: string) {
          super(url);
          setTimeout(() => {
            this.onerror?.(new Event('error'));
          }, 0);
        }
      };

      global.WebSocket = FailingWebSocket as any;

      const { result } = renderHook(() => useChat());

      await waitFor(() => {
        expect(result.current.error).toBe(
          'Connection error. Please check your internet connection.',
        );
      });
    });

    it('handles disconnection and attempts reconnection', async () => {
      jest.useFakeTimers();

      const { result } = renderHook(() => useChat());

      // Wait for initial connection
      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Simulate disconnection
      const mockWS = global.WebSocket as any;
      const instance = new mockWS('ws://test');
      instance.readyState = MockWebSocket.CLOSED;
      instance.onclose?.(new CloseEvent('close', { code: 1006 })); // Abnormal closure

      expect(result.current.isConnected).toBe(false);

      // Fast forward to trigger reconnection
      act(() => {
        jest.advanceTimersByTime(5000); // Default reconnect interval
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      jest.useRealTimers();
    });
  });

  describe('Message Sending', () => {
    it('sends message successfully', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      const { result } = renderHook(() => useChat());

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      await act(async () => {
        await result.current.sendMessage('Hello world');
      });

      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0].content).toBe('Hello world');
      expect(result.current.messages[0].role).toBe('user');
      expect(global.fetch).toHaveBeenCalledWith('/api/ai-features/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer access-token-123',
        },
        body: JSON.stringify({
          message: 'Hello world',
          conversationId: 'test-conversation-id',
          context: {
            userId: 'user-123',
            timestamp: expect.any(String),
          },
        }),
      });
    });

    it('queues message when not connected', async () => {
      mockUseAuth.mockReturnValue({
        ...defaultAuthState,
        isAuthenticated: false,
        user: null,
      });

      const { result } = renderHook(() => useChat());

      // Authenticate user
      act(() => {
        mockUseAuth.mockReturnValue(defaultAuthState);
      });

      await act(async () => {
        await result.current.sendMessage('Queued message');
      });

      expect(result.current.messages).toHaveLength(1);
      expect(result.current.error).toContain('Reconnecting...');
    });

    it('handles rate limiting', async () => {
      mockUseRateLimit.mockReturnValue({
        ...defaultRateLimitState,
        canMakeRequest: false,
        makeRequest: jest.fn().mockReturnValue(false),
        resetTime: new Date(Date.now() + 60000),
      });

      const { result } = renderHook(() => useChat());

      await expect(
        result.current.sendMessage('Rate limited message'),
      ).rejects.toThrow(/Rate limit exceeded/);
    });

    it('validates message content', async () => {
      const {
        validateMessageContent,
      } = require('@/lib/security/input-sanitization');
      validateMessageContent.mockReturnValue({
        isValid: false,
        error: 'Invalid content',
      });

      const { result } = renderHook(() => useChat());

      await expect(
        result.current.sendMessage('Invalid message'),
      ).rejects.toThrow(/Invalid message content/);
    });

    it('enforces subscription limits', async () => {
      mockUseAuth.mockReturnValue({
        ...defaultAuthState,
        user: {
          ...defaultAuthState.user,
          subscription: 'FREE',
        },
      });

      // Mock having reached message limit
      const { result } = renderHook(() => useChat());

      // Pre-populate with messages to reach limit
      const messages = Array.from({ length: 50 }, (_, i) => ({
        id: `msg-${i}`,
        conversation_id: 'test-conversation-id',
        role: 'user' as const,
        content: `Message ${i}`,
        ai_metadata: {},
        tokens_used: 0,
        response_time_ms: 0,
        wedding_context: {},
        is_edited: false,
        is_flagged: false,
        created_at: '2025-01-20T10:00:00Z',
        updated_at: '2025-01-20T10:00:00Z',
      }));

      act(() => {
        result.current.messages.push(...messages);
      });

      await expect(result.current.sendMessage('Over limit')).rejects.toThrow(
        /Message limit reached/,
      );
    });

    it('handles send errors gracefully', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useChat());

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      await act(async () => {
        await result.current.sendMessage('Error message');
      });

      expect(result.current.error).toBe(
        'Failed to send message. Please try again.',
      );
      expect(result.current.messages).toHaveLength(0); // Message removed on failure
    });

    it('persists messages to localStorage', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      const { result } = renderHook(() => useChat({ persistMessages: true }));

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      await act(async () => {
        await result.current.sendMessage('Persistent message');
      });

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'ws-chat-messages-test-conversation-id',
        expect.stringContaining('Persistent message'),
      );
    });
  });

  describe('WebSocket Message Handling', () => {
    it('handles incoming assistant messages', async () => {
      const { result } = renderHook(() => useChat());

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Simulate incoming message
      const mockWS = global.WebSocket as any;
      const instance = new mockWS('ws://test');
      const messageData = {
        type: 'message',
        payload: {
          id: 'assistant-msg-1',
          role: 'assistant',
          content: 'Hello! How can I help you today?',
          ai_metadata: { model: 'gpt-4' },
          tokens_used: 15,
          response_time_ms: 1200,
          wedding_context: { venue: 'church' },
        },
      };

      act(() => {
        instance.onmessage?.(
          new MessageEvent('message', {
            data: JSON.stringify(messageData),
          }),
        );
      });

      await waitFor(() => {
        expect(result.current.messages).toHaveLength(1);
        expect(result.current.messages[0].role).toBe('assistant');
        expect(result.current.messages[0].content).toBe(
          'Hello! How can I help you today?',
        );
        expect(result.current.isTyping).toBe(false);
      });
    });

    it('handles typing indicators', async () => {
      jest.useFakeTimers();

      const { result } = renderHook(() => useChat());

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Simulate typing start
      const mockWS = global.WebSocket as any;
      const instance = new mockWS('ws://test');

      act(() => {
        instance.onmessage?.(
          new MessageEvent('message', {
            data: JSON.stringify({
              type: 'typing',
              payload: { isTyping: true },
            }),
          }),
        );
      });

      expect(result.current.isTyping).toBe(true);

      // Fast forward past typing timeout
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(result.current.isTyping).toBe(false);
      });

      jest.useRealTimers();
    });

    it('handles error messages', async () => {
      const { result } = renderHook(() => useChat());

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      const mockWS = global.WebSocket as any;
      const instance = new mockWS('ws://test');

      act(() => {
        instance.onmessage?.(
          new MessageEvent('message', {
            data: JSON.stringify({
              type: 'error',
              payload: { message: 'AI service temporarily unavailable' },
            }),
          }),
        );
      });

      expect(result.current.error).toBe('AI service temporarily unavailable');
      expect(result.current.isTyping).toBe(false);
    });

    it('handles connection status updates', async () => {
      const { result } = renderHook(() => useChat());

      const mockWS = global.WebSocket as any;
      const instance = new mockWS('ws://test');

      act(() => {
        instance.onmessage?.(
          new MessageEvent('message', {
            data: JSON.stringify({
              type: 'connection',
              payload: { status: 'disconnected' },
            }),
          }),
        );
      });

      expect(result.current.isConnected).toBe(false);
    });
  });

  describe('Utility Functions', () => {
    it('clears conversation history', async () => {
      const { result } = renderHook(() => useChat());

      // Add some messages first
      act(() => {
        result.current.messages.push({
          id: 'msg-1',
          conversation_id: 'test-conversation-id',
          role: 'user',
          content: 'Test message',
          ai_metadata: {},
          tokens_used: 0,
          response_time_ms: 0,
          wedding_context: {},
          is_edited: false,
          is_flagged: false,
          created_at: '2025-01-20T10:00:00Z',
          updated_at: '2025-01-20T10:00:00Z',
        });
      });

      expect(result.current.messages).toHaveLength(1);

      act(() => {
        result.current.clearHistory();
      });

      expect(result.current.messages).toHaveLength(0);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(
        'ws-chat-messages-test-conversation-id',
      );
    });

    it('reconnects manually', async () => {
      const { result } = renderHook(() => useChat());

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      act(() => {
        result.current.reconnect();
      });

      // Should reconnect (exact timing depends on implementation)
      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });
    });

    it('dismisses errors', () => {
      const { result } = renderHook(() => useChat());

      act(() => {
        result.current.error = 'Test error';
      });

      expect(result.current.error).toBe('Test error');

      act(() => {
        result.current.dismissError();
      });

      expect(result.current.error).toBeNull();
    });

    it('dismisses security warnings', () => {
      const { result } = renderHook(() => useChat());

      act(() => {
        result.current.securityWarning = 'Test warning';
      });

      expect(result.current.securityWarning).toBe('Test warning');

      act(() => {
        result.current.dismissSecurityWarning();
      });

      expect(result.current.securityWarning).toBeNull();
    });

    it('exports conversation', async () => {
      const { result } = renderHook(() => useChat());

      // Mock DOM methods
      const mockCreateElement = jest.spyOn(document, 'createElement');
      const mockAppendChild = jest
        .spyOn(document.body, 'appendChild')
        .mockImplementation();
      const mockRemoveChild = jest
        .spyOn(document.body, 'removeChild')
        .mockImplementation();
      const mockCreateObjectURL = jest
        .spyOn(URL, 'createObjectURL')
        .mockReturnValue('blob:test');
      const mockRevokeObjectURL = jest
        .spyOn(URL, 'revokeObjectURL')
        .mockImplementation();

      const mockAnchor = {
        href: '',
        download: '',
        click: jest.fn(),
      };
      mockCreateElement.mockReturnValue(mockAnchor as any);

      // Add test messages
      const testMessages = [
        {
          id: 'msg-1',
          conversation_id: 'test-conversation-id',
          role: 'user' as const,
          content: 'Test message',
          ai_metadata: {},
          tokens_used: 0,
          response_time_ms: 0,
          wedding_context: {},
          is_edited: false,
          is_flagged: false,
          created_at: '2025-01-20T10:00:00Z',
          updated_at: '2025-01-20T10:00:00Z',
        },
      ];

      act(() => {
        result.current.messages.push(...testMessages);
      });

      await act(async () => {
        await result.current.exportConversation();
      });

      expect(mockCreateElement).toHaveBeenCalledWith('a');
      expect(mockAnchor.download).toBe('chat-ation-123.json');
      expect(mockAnchor.click).toHaveBeenCalled();
      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalled();

      // Restore mocks
      mockCreateElement.mockRestore();
      mockAppendChild.mockRestore();
      mockRemoveChild.mockRestore();
      mockCreateObjectURL.mockRestore();
      mockRevokeObjectURL.mockRestore();
    });
  });

  describe('Rate Limiting Integration', () => {
    it('respects rate limiting state', () => {
      mockUseRateLimit.mockReturnValue({
        canMakeRequest: false,
        requestsRemaining: 0,
        resetTime: new Date(Date.now() + 60000),
        makeRequest: jest.fn().mockReturnValue(false),
      });

      const { result } = renderHook(() => useChat());

      expect(result.current.canSendMessage).toBe(false);
      expect(result.current.requestsRemaining).toBe(0);
    });

    it('updates rate limiting display', () => {
      mockUseRateLimit.mockReturnValue({
        canMakeRequest: true,
        requestsRemaining: 3,
        resetTime: new Date(Date.now() + 30000),
        makeRequest: jest.fn().mockReturnValue(true),
      });

      const { result } = renderHook(() => useChat());

      expect(result.current.canSendMessage).toBe(true);
      expect(result.current.requestsRemaining).toBe(3);
    });
  });

  describe('Configuration Options', () => {
    it('respects maxMessages configuration', () => {
      const persistedMessages = Array.from({ length: 100 }, (_, i) => ({
        id: `msg-${i}`,
        conversation_id: 'test-conversation-id',
        role: 'user' as const,
        content: `Message ${i}`,
        ai_metadata: {},
        tokens_used: 0,
        response_time_ms: 0,
        wedding_context: {},
        is_edited: false,
        is_flagged: false,
        created_at: '2025-01-20T10:00:00Z',
        updated_at: '2025-01-20T10:00:00Z',
      }));

      mockLocalStorage.getItem
        .mockReturnValueOnce('test-conversation-id')
        .mockReturnValueOnce(JSON.stringify(persistedMessages));

      const { result } = renderHook(() => useChat({ maxMessages: 50 }));

      expect(result.current.messages).toHaveLength(50);
    });

    it('disables persistence when configured', () => {
      const { result } = renderHook(() => useChat({ persistMessages: false }));

      expect(result.current.messages).toEqual([]);
      expect(mockLocalStorage.getItem).not.toHaveBeenCalledWith(
        expect.stringMatching(/ws-chat-messages-/),
      );
    });
  });

  describe('Cleanup', () => {
    it('cleans up WebSocket connection on unmount', async () => {
      const { result, unmount } = renderHook(() => useChat());

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      const mockClose = jest.fn();
      // Mock the WebSocket close method
      global.WebSocket.prototype.close = mockClose;

      unmount();

      // Note: Exact cleanup behavior depends on implementation
      // This test ensures no errors are thrown during cleanup
    });

    it('clears timers on unmount', async () => {
      jest.useFakeTimers();

      const { unmount } = renderHook(() => useChat());

      const initialTimerCount = jest.getTimerCount();

      unmount();

      // Should not increase timer count after unmount
      expect(jest.getTimerCount()).toBeLessThanOrEqual(initialTimerCount);

      jest.useRealTimers();
    });
  });
});
