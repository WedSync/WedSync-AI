'use client';

// WS-126: Chatbot State Management Hook
// Custom hook for managing chatbot conversations and API interactions

import { useState, useCallback, useRef } from 'react';
import {
  ChatbotUIState,
  ChatMessage,
  ChatbotResponse,
  ChatbotRequest,
} from '@/types/chatbot';

interface UseChatbotOptions {
  apiUrl?: string;
  sessionId?: string;
  onError?: (error: Error) => void;
  onEscalation?: (escalationId: string) => void;
}

export function useChatbot(options: UseChatbotOptions = {}) {
  const {
    apiUrl = '/api/chatbot',
    sessionId: providedSessionId,
    onError,
    onEscalation,
  } = options;

  const [state, setState] = useState<ChatbotUIState>({
    isOpen: false,
    isConnected: true,
    isTyping: false,
    conversation: [],
    quick_replies: [],
    escalation_available: false,
    loading: false,
  });

  const sessionIdRef = useRef<string>(
    providedSessionId ||
      `chatbot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  );

  const addMessage = useCallback((message: ChatMessage) => {
    setState((prev) => ({
      ...prev,
      conversation: [...prev.conversation, message],
    }));
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setState((prev) => ({ ...prev, loading }));
  }, []);

  const setTyping = useCallback((isTyping: boolean) => {
    setState((prev) => ({ ...prev, isTyping }));
  }, []);

  const setQuickReplies = useCallback((quick_replies: any[]) => {
    setState((prev) => ({ ...prev, quick_replies }));
  }, []);

  const setEscalationAvailable = useCallback((available: boolean) => {
    setState((prev) => ({ ...prev, escalation_available: available }));
  }, []);

  const toggleChat = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: !prev.isOpen }));
  }, []);

  const openChat = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: true }));
  }, []);

  const closeChat = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const sendMessage = useCallback(
    async (message: string, context?: Record<string, any>) => {
      if (!message.trim() || state.loading) return;

      // Add user message
      const userMessage: ChatMessage = {
        id: `user_${Date.now()}`,
        type: 'user',
        content: message,
        timestamp: new Date().toISOString(),
      };

      addMessage(userMessage);
      setLoading(true);
      setTyping(true);
      setQuickReplies([]);

      try {
        const request: ChatbotRequest = {
          message,
          session_id: sessionIdRef.current,
          context: {
            ...context,
            conversation_length: state.conversation.length + 1,
          },
        };

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const botResponse: ChatbotResponse = await response.json();

        // Simulate typing delay for better UX
        await new Promise((resolve) =>
          setTimeout(resolve, Math.min(1500, botResponse.message.length * 20)),
        );

        const botMessage: ChatMessage = {
          id: `bot_${Date.now()}`,
          type: 'bot',
          content: botResponse.message,
          timestamp: botResponse.timestamp,
          intent: botResponse.intent,
          confidence: botResponse.confidence,
          quick_replies:
            botResponse.quick_replies?.map((text) => ({
              text,
              payload: text.toLowerCase().replace(/\s+/g, '_'),
            })) || [],
          metadata: {
            knowledge_sources: botResponse.knowledge_sources,
            ...botResponse.metadata,
          },
        };

        addMessage(botMessage);
        setQuickReplies(botMessage.quick_replies || []);
        setEscalationAvailable(botResponse.escalation_available);
      } catch (error) {
        console.error('Chatbot error:', error);

        const errorMessage: ChatMessage = {
          id: `error_${Date.now()}`,
          type: 'bot',
          content:
            "I apologize, but I'm experiencing some technical difficulties. Would you like me to connect you with a human support agent?",
          timestamp: new Date().toISOString(),
          quick_replies: [
            { text: 'Contact Support', payload: 'escalate' },
            { text: 'Try Again', payload: 'retry' },
          ],
        };

        addMessage(errorMessage);
        setQuickReplies(errorMessage.quick_replies || []);
        setEscalationAvailable(true);

        if (onError) {
          onError(error as Error);
        }
      } finally {
        setLoading(false);
        setTyping(false);
      }
    },
    [
      state.loading,
      state.conversation.length,
      apiUrl,
      addMessage,
      setLoading,
      setTyping,
      setQuickReplies,
      setEscalationAvailable,
      onError,
    ],
  );

  const escalateToHuman = useCallback(
    async (
      reason: string,
      priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal',
    ) => {
      setLoading(true);

      try {
        const response = await fetch('/api/chatbot/escalate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            session_id: sessionIdRef.current,
            reason,
            priority,
            context: {
              conversation_length: state.conversation.length,
              last_intent:
                state.conversation[state.conversation.length - 1]?.intent,
            },
          }),
        });

        if (!response.ok) {
          throw new Error('Escalation failed');
        }

        const escalationData = await response.json();

        const escalationMessage: ChatMessage = {
          id: `escalation_${Date.now()}`,
          type: 'bot',
          content: escalationData.message,
          timestamp: escalationData.timestamp,
          metadata: {
            escalation_id: escalationData.escalation_id,
            agent: escalationData.agent,
            estimated_wait_time: escalationData.estimated_wait_time,
          },
        };

        addMessage(escalationMessage);
        setEscalationAvailable(false);

        setState((prev) => ({
          ...prev,
          agent_info: escalationData.agent,
        }));

        if (onEscalation) {
          onEscalation(escalationData.escalation_id);
        }
      } catch (error) {
        console.error('Escalation error:', error);

        const fallbackMessage: ChatMessage = {
          id: `fallback_${Date.now()}`,
          type: 'bot',
          content:
            "I'm having trouble connecting you with our support team right now. You can reach us directly at support@wedsync.com or call 1-800-WEDSYNC.",
          timestamp: new Date().toISOString(),
        };

        addMessage(fallbackMessage);

        if (onError) {
          onError(error as Error);
        }
      } finally {
        setLoading(false);
      }
    },
    [
      state.conversation.length,
      addMessage,
      setLoading,
      setEscalationAvailable,
      onEscalation,
      onError,
    ],
  );

  const handleQuickReply = useCallback(
    async (reply: { text: string; payload?: string }) => {
      if (reply.payload === 'escalate') {
        await escalateToHuman('user_request');
      } else if (reply.payload === 'retry') {
        // Retry last user message
        const lastUserMessage = [...state.conversation]
          .reverse()
          .find((msg) => msg.type === 'user');
        if (lastUserMessage) {
          await sendMessage(lastUserMessage.content);
        }
      } else {
        await sendMessage(reply.text);
      }
    },
    [state.conversation, escalateToHuman, sendMessage],
  );

  const clearConversation = useCallback(() => {
    setState((prev) => ({
      ...prev,
      conversation: [],
      quick_replies: [],
      escalation_available: false,
      agent_info: undefined,
      error: undefined,
    }));
  }, []);

  const getConversationHistory = useCallback(() => {
    return state.conversation.map((msg) => ({
      type: msg.type,
      content: msg.content,
      timestamp: msg.timestamp,
      intent: msg.intent,
      confidence: msg.confidence,
    }));
  }, [state.conversation]);

  const getSessionId = useCallback(() => sessionIdRef.current, []);

  // Get chatbot capabilities
  const getCapabilities = useCallback(async () => {
    try {
      const response = await fetch(`${apiUrl}?action=capabilities`);
      if (!response.ok) throw new Error('Failed to fetch capabilities');
      return await response.json();
    } catch (error) {
      console.error('Failed to get capabilities:', error);
      return null;
    }
  }, [apiUrl]);

  // Check chatbot health
  const checkHealth = useCallback(async () => {
    try {
      const response = await fetch(`${apiUrl}?action=health`);
      if (!response.ok) throw new Error('Health check failed');
      return await response.json();
    } catch (error) {
      console.error('Health check failed:', error);
      setState((prev) => ({ ...prev, isConnected: false }));
      return null;
    }
  }, [apiUrl]);

  return {
    // State
    state,
    sessionId: sessionIdRef.current,

    // Actions
    sendMessage,
    handleQuickReply,
    escalateToHuman,
    toggleChat,
    openChat,
    closeChat,
    clearConversation,

    // Utilities
    getConversationHistory,
    getSessionId,
    getCapabilities,
    checkHealth,

    // Individual state setters (for advanced usage)
    addMessage,
    setLoading,
    setTyping,
    setQuickReplies,
    setEscalationAvailable,
  };
}
