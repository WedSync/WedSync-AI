'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useRateLimit } from './useRateLimit';
import {
  UseChatReturn,
  UseChatConfig,
  ChatbotMessage,
  WebSocketMessage,
  CHAT_CONSTANTS,
  SUBSCRIPTION_LIMITS,
  ChatError,
  SecurityError,
  RateLimitError,
} from '@/types/chatbot';
import {
  sanitizeInput,
  validateMessageContent,
} from '@/lib/security/input-sanitization';
import { v4 as uuidv4 } from 'uuid';

// Default configuration
const defaultConfig: UseChatConfig = {
  autoConnect: true,
  persistMessages: true,
  maxMessages: CHAT_CONSTANTS.MAX_CONVERSATION_HISTORY,
  reconnectInterval: CHAT_CONSTANTS.RECONNECT_INTERVAL,
  typingTimeout: CHAT_CONSTANTS.TYPING_TIMEOUT,
  rateLimitConfig: {
    maxRequests: 10,
    windowMs: 60000, // 1 minute
    warningThreshold: 3,
  },
  securityConfig: {
    maxMessageLength: CHAT_CONSTANTS.MAX_MESSAGE_LENGTH,
    allowedFileTypes: CHAT_CONSTANTS.ALLOWED_FILE_TYPES,
    maxFileSize: CHAT_CONSTANTS.MAX_FILE_SIZE,
    sanitizeOutput: true,
    validateInput: true,
    logSecurityEvents: true,
  },
};

export function useChat(config: UseChatConfig = {}): UseChatReturn {
  const finalConfig = { ...defaultConfig, ...config };
  const { user, isAuthenticated } = useAuth();

  // State management
  const [messages, setMessages] = useState<ChatbotMessage[]>([]);
  const [conversationId, setConversationId] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [securityWarning, setSecurityWarning] = useState<string | null>(null);

  // Rate limiting
  const { canMakeRequest, requestsRemaining, resetTime, makeRequest } =
    useRateLimit(
      finalConfig.rateLimitConfig || { maxRequests: 10, windowMs: 60000 },
    );

  // Refs for managing state
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messageQueueRef = useRef<{ message: string; attachments?: File[] }[]>(
    [],
  );

  // Generate or retrieve conversation ID
  const initializeConversation = useCallback(() => {
    const stored = localStorage.getItem('ws-chat-conversation-id');
    if (stored) {
      setConversationId(stored);
    } else {
      const newId = uuidv4();
      setConversationId(newId);
      localStorage.setItem('ws-chat-conversation-id', newId);
    }
  }, []);

  // Load persisted messages
  const loadPersistedMessages = useCallback(() => {
    if (!finalConfig.persistMessages) return;

    try {
      const stored = localStorage.getItem(`ws-chat-messages-${conversationId}`);
      if (stored) {
        const parsed: ChatbotMessage[] = JSON.parse(stored);
        setMessages(parsed.slice(-finalConfig.maxMessages!));
      }
    } catch (error) {
      console.error('Failed to load persisted messages:', error);
    }
  }, [conversationId, finalConfig.persistMessages, finalConfig.maxMessages]);

  // Persist messages to localStorage
  const persistMessages = useCallback(
    (updatedMessages: ChatbotMessage[]) => {
      if (!finalConfig.persistMessages) return;

      try {
        const toStore = updatedMessages.slice(-finalConfig.maxMessages!);
        localStorage.setItem(
          `ws-chat-messages-${conversationId}`,
          JSON.stringify(toStore),
        );
      } catch (error) {
        console.error('Failed to persist messages:', error);
      }
    },
    [conversationId, finalConfig.persistMessages, finalConfig.maxMessages],
  );

  // WebSocket connection management
  const connect = useCallback(() => {
    if (!isAuthenticated || !user) {
      setError('Authentication required for chat');
      return;
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    try {
      // Use Supabase Realtime WebSocket connection
      const wsUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('http', 'ws')}/realtime/v1/websocket`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setIsConnected(true);
        setError(null);
        console.log('Chat WebSocket connected');

        // Join conversation channel
        ws.send(
          JSON.stringify({
            topic: `chatbot:${conversationId}`,
            event: 'phx_join',
            payload: {},
            ref: Date.now().toString(),
          }),
        );

        // Process queued messages
        if (messageQueueRef.current.length > 0) {
          messageQueueRef.current.forEach(({ message, attachments }) => {
            sendMessage(message, attachments);
          });
          messageQueueRef.current = [];
        }
      };

      ws.onmessage = (event) => {
        try {
          const data: WebSocketMessage = JSON.parse(event.data);
          handleWebSocketMessage(data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        setIsConnected(false);
        console.log('Chat WebSocket disconnected:', event.code, event.reason);

        // Attempt to reconnect if not intentionally closed
        if (event.code !== 1000) {
          scheduleReconnect();
        }
      };

      ws.onerror = (error) => {
        console.error('Chat WebSocket error:', error);
        setError('Connection error. Please check your internet connection.');
        setIsConnected(false);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setError('Failed to connect to chat service');
    }
  }, [isAuthenticated, user, conversationId]);

  // Handle WebSocket messages
  const handleWebSocketMessage = useCallback(
    (data: WebSocketMessage) => {
      switch (data.type) {
        case 'message':
          if (data.payload?.role === 'assistant') {
            const assistantMessage: ChatbotMessage = {
              id: data.payload.id || uuidv4(),
              conversation_id: conversationId,
              role: 'assistant',
              content: data.payload.content,
              ai_metadata: data.payload.ai_metadata || {},
              tokens_used: data.payload.tokens_used || 0,
              response_time_ms: data.payload.response_time_ms || 0,
              wedding_context: data.payload.wedding_context || {},
              is_edited: false,
              is_flagged: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };

            setMessages((prev) => {
              const updated = [...prev, assistantMessage];
              persistMessages(updated);
              return updated;
            });
            setIsTyping(false);
          }
          break;

        case 'typing':
          setIsTyping(data.payload.isTyping);
          if (data.payload.isTyping) {
            // Clear typing after timeout
            if (typingTimeoutRef.current) {
              clearTimeout(typingTimeoutRef.current);
            }
            typingTimeoutRef.current = setTimeout(() => {
              setIsTyping(false);
            }, finalConfig.typingTimeout);
          }
          break;

        case 'error':
          setError(data.payload.message || 'An error occurred');
          setIsTyping(false);
          break;

        case 'connection':
          if (data.payload.status === 'connected') {
            setIsConnected(true);
          } else if (data.payload.status === 'disconnected') {
            setIsConnected(false);
          }
          break;
      }
    },
    [conversationId, persistMessages, finalConfig.typingTimeout],
  );

  // Schedule reconnection
  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    reconnectTimeoutRef.current = setTimeout(() => {
      console.log('Attempting to reconnect...');
      connect();
    }, finalConfig.reconnectInterval);
  }, [connect, finalConfig.reconnectInterval]);

  // Send message function
  const sendMessage = useCallback(
    async (content: string, attachments?: File[]) => {
      if (!isAuthenticated || !user) {
        throw new ChatError('Authentication required', 'AUTH_REQUIRED');
      }

      // Rate limiting check
      if (!canMakeRequest || !makeRequest()) {
        throw new RateLimitError(
          `Rate limit exceeded. Please wait before sending another message.`,
          resetTime || new Date(Date.now() + 60000),
        );
      }

      // Input validation and sanitization
      if (finalConfig.securityConfig?.validateInput) {
        const sanitized = sanitizeInput(content);
        const validation = validateMessageContent(sanitized);

        if (!validation.isValid) {
          throw new SecurityError(
            validation.error || 'Invalid message content',
            'VALIDATION_FAILED',
          );
        }

        content = sanitized;
      }

      // Check subscription limits
      const subscription = user.subscription || 'FREE';
      const limits =
        SUBSCRIPTION_LIMITS[subscription as keyof typeof SUBSCRIPTION_LIMITS];

      if (limits.messageLimit > 0 && messages.length >= limits.messageLimit) {
        throw new ChatError(
          `Message limit reached for ${subscription} tier. Please upgrade to send more messages.`,
          'SUBSCRIPTION_LIMIT',
        );
      }

      // Create user message
      const userMessage: ChatbotMessage = {
        id: uuidv4(),
        conversation_id: conversationId,
        role: 'user',
        content: content,
        ai_metadata: {},
        tokens_used: 0,
        response_time_ms: 0,
        wedding_context: {},
        is_edited: false,
        is_flagged: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Add to messages immediately (optimistic update)
      setMessages((prev) => {
        const updated = [...prev, userMessage];
        persistMessages(updated);
        return updated;
      });

      // Clear any existing errors
      setError(null);
      setSecurityWarning(null);

      // Send via API if connected, otherwise queue
      if (isConnected && wsRef.current?.readyState === WebSocket.OPEN) {
        try {
          // Send to API endpoint
          const response = await fetch('/api/ai-features/chat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${user.accessToken}`,
            },
            body: JSON.stringify({
              message: content,
              conversationId,
              context: {
                userId: user.id,
                timestamp: new Date().toISOString(),
              },
            }),
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          // Response will come via WebSocket
          setIsTyping(true);
        } catch (error) {
          console.error('Failed to send message:', error);
          setError('Failed to send message. Please try again.');

          // Remove the optimistic message on failure
          setMessages((prev) =>
            prev.filter((msg) => msg.id !== userMessage.id),
          );
        }
      } else {
        // Queue message for when connection is restored
        messageQueueRef.current.push({ message: content, attachments });
        setError(
          'Reconnecting... Your message will be sent when connection is restored.',
        );
      }
    },
    [
      isAuthenticated,
      user,
      canMakeRequest,
      makeRequest,
      resetTime,
      finalConfig.securityConfig,
      messages.length,
      conversationId,
      persistMessages,
      isConnected,
    ],
  );

  // Clear conversation history
  const clearHistory = useCallback(() => {
    setMessages([]);
    if (finalConfig.persistMessages) {
      localStorage.removeItem(`ws-chat-messages-${conversationId}`);
    }
  }, [conversationId, finalConfig.persistMessages]);

  // Reconnect function
  const reconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    connect();
  }, [connect]);

  // Dismiss error
  const dismissError = useCallback(() => {
    setError(null);
  }, []);

  // Dismiss security warning
  const dismissSecurityWarning = useCallback(() => {
    setSecurityWarning(null);
  }, []);

  // Load conversation history from API
  const loadConversationHistory = useCallback(async () => {
    if (!isAuthenticated || !user) return;

    try {
      const response = await fetch(
        `/api/chatbot/conversations/${conversationId}/messages`,
        {
          headers: {
            Authorization: `Bearer ${user.accessToken}`,
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Failed to load conversation history:', error);
    }
  }, [isAuthenticated, user, conversationId]);

  // Export conversation
  const exportConversation = useCallback(async () => {
    const conversationData = {
      id: conversationId,
      messages: messages,
      createdAt: new Date().toISOString(),
      totalMessages: messages.length,
    };

    const blob = new Blob([JSON.stringify(conversationData, null, 2)], {
      type: 'application/json',
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-${conversationId.slice(-8)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [conversationId, messages]);

  // Initialize conversation and load messages on mount
  useEffect(() => {
    initializeConversation();
  }, [initializeConversation]);

  useEffect(() => {
    if (conversationId) {
      loadPersistedMessages();
    }
  }, [conversationId, loadPersistedMessages]);

  // Auto-connect if enabled
  useEffect(() => {
    if (finalConfig.autoConnect && conversationId && isAuthenticated) {
      connect();
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [finalConfig.autoConnect, conversationId, isAuthenticated, connect]);

  return {
    // State
    messages,
    conversationId,
    isConnected,
    isTyping,
    error,
    securityWarning,

    // Actions
    sendMessage,
    clearHistory,
    reconnect,
    setTyping: setIsTyping,
    dismissError,
    dismissSecurityWarning,

    // Rate limiting
    canSendMessage: canMakeRequest,
    requestsRemaining,
    resetTime,

    // Conversation management
    loadConversationHistory,
    exportConversation,
  };
}

export default useChat;
