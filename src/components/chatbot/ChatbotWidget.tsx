'use client';

// WS-126: AI-Powered Support Chatbot Widget
// Main chatbot interface component with conversation UI

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle,
  X,
  Send,
  User,
  Bot,
  Loader2,
  AlertCircle,
  Phone,
  Mail,
} from 'lucide-react';
import { ChatbotUIState, ChatMessage, ChatbotResponse } from '@/types/chatbot';

interface ChatbotWidgetProps {
  position?: 'bottom-right' | 'bottom-left';
  theme?: 'light' | 'dark' | 'auto';
  primaryColor?: string;
  welcomeMessage?: string;
  placeholderText?: string;
  showBranding?: boolean;
  companyName?: string;
}

export default function ChatbotWidget({
  position = 'bottom-right',
  theme = 'light',
  primaryColor = '#2563eb',
  welcomeMessage = "Hi! I'm the WedSync AI Assistant. How can I help you with your wedding planning today?",
  placeholderText = 'Type your message...',
  showBranding = true,
  companyName = 'WedSync',
}: ChatbotWidgetProps) {
  const [state, setState] = useState<ChatbotUIState>({
    isOpen: false,
    isConnected: true,
    isTyping: false,
    conversation: [],
    quick_replies: [],
    escalation_available: false,
    loading: false,
  });

  const [inputMessage, setInputMessage] = useState('');
  const [sessionId, setSessionId] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Generate session ID
    const newSessionId = `chatbot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setSessionId(newSessionId);

    // Add welcome message
    const welcomeMsg: ChatMessage = {
      id: 'welcome',
      type: 'bot',
      content: welcomeMessage,
      timestamp: new Date().toISOString(),
      quick_replies: [
        { text: 'Find vendors', payload: 'vendor_search' },
        { text: 'Check pricing', payload: 'pricing_inquiry' },
        { text: 'Wedding tips', payload: 'wedding_planning' },
        { text: 'Get help', payload: 'general_question' },
      ],
    };

    setState((prev) => ({
      ...prev,
      conversation: [welcomeMsg],
      quick_replies: welcomeMsg.quick_replies || [],
    }));
  }, [welcomeMessage]);

  useEffect(() => {
    scrollToBottom();
  }, [state.conversation]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const toggleChatbot = () => {
    setState((prev) => ({ ...prev, isOpen: !prev.isOpen }));
    if (!state.isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const sendMessage = async (message: string) => {
    if (!message.trim() || state.loading) return;

    // Add user message to conversation
    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      type: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    };

    setState((prev) => ({
      ...prev,
      conversation: [...prev.conversation, userMessage],
      loading: true,
      isTyping: true,
      quick_replies: [],
    }));

    setInputMessage('');

    try {
      const response = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          session_id: sessionId,
          context: state.agent_info ? { escalated: true } : {},
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const botResponse: ChatbotResponse = await response.json();

      // Simulate typing delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const botMessage: ChatMessage = {
        id: `bot_${Date.now()}`,
        type: 'bot',
        content: botResponse.message,
        timestamp: botResponse.timestamp,
        intent: botResponse.intent,
        confidence: botResponse.confidence,
        quick_replies: botResponse.quick_replies?.map((text) => ({
          text,
          payload: text.toLowerCase().replace(/\s+/g, '_'),
        })),
      };

      setState((prev) => ({
        ...prev,
        conversation: [...prev.conversation, botMessage],
        loading: false,
        isTyping: false,
        quick_replies: botMessage.quick_replies || [],
        escalation_available: botResponse.escalation_available,
      }));
    } catch (error) {
      console.error('Chatbot error:', error);

      const errorMessage: ChatMessage = {
        id: `error_${Date.now()}`,
        type: 'bot',
        content:
          "I'm sorry, I'm having trouble connecting right now. Would you like me to help you contact our support team directly?",
        timestamp: new Date().toISOString(),
        quick_replies: [
          { text: 'Contact Support', payload: 'escalate' },
          { text: 'Try Again', payload: 'retry' },
        ],
      };

      setState((prev) => ({
        ...prev,
        conversation: [...prev.conversation, errorMessage],
        loading: false,
        isTyping: false,
        quick_replies: errorMessage.quick_replies || [],
        escalation_available: true,
        error: 'Connection error',
      }));
    }
  };

  const handleQuickReply = (reply: { text: string; payload?: string }) => {
    if (reply.payload === 'escalate') {
      handleEscalation('user_request');
    } else {
      sendMessage(reply.text);
    }
  };

  const handleEscalation = async (reason: string) => {
    try {
      setState((prev) => ({ ...prev, loading: true }));

      const response = await fetch('/api/chatbot/escalate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          reason,
          priority: 'normal',
          context: { conversation_length: state.conversation.length },
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
        },
      };

      setState((prev) => ({
        ...prev,
        conversation: [...prev.conversation, escalationMessage],
        loading: false,
        agent_info: escalationData.agent,
        escalation_available: false,
      }));
    } catch (error) {
      console.error('Escalation error:', error);

      const fallbackMessage: ChatMessage = {
        id: `fallback_${Date.now()}`,
        type: 'bot',
        content:
          "I'm having trouble connecting you with support right now. You can reach us directly at support@wedsync.com or call 1-800-WEDSYNC.",
        timestamp: new Date().toISOString(),
      };

      setState((prev) => ({
        ...prev,
        conversation: [...prev.conversation, fallbackMessage],
        loading: false,
      }));
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputMessage);
    }
  };

  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
  };

  return (
    <div className={`fixed ${positionClasses[position]} z-50`}>
      <AnimatePresence>
        {state.isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="mb-4 w-80 sm:w-96 h-[500px] bg-white dark:bg-gray-900 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col"
          >
            {/* Header */}
            <div
              className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700"
              style={{ backgroundColor: `${primaryColor}10` }}
            >
              <div className="flex items-center space-x-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white"
                  style={{ backgroundColor: primaryColor }}
                >
                  <Bot size={18} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                    {state.agent_info
                      ? state.agent_info.name
                      : 'WedSync Assistant'}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {state.agent_info
                      ? 'Human Support Agent'
                      : 'AI-Powered Support'}
                  </p>
                </div>
              </div>
              <button
                onClick={toggleChatbot}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X size={20} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {state.conversation.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-lg ${
                      message.type === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                    }`}
                  >
                    <div className="flex items-start space-x-2">
                      <div className="flex-shrink-0">
                        {message.type === 'user' ? (
                          <User size={16} />
                        ) : (
                          <Bot size={16} />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm whitespace-pre-wrap">
                          {message.content}
                        </p>
                        <p className="text-xs opacity-70 mt-1">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {state.isTyping && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">
                    <Loader2 size={16} className="animate-spin text-gray-500" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Replies */}
            {state.quick_replies.length > 0 && (
              <div className="px-4 pb-2">
                <div className="flex flex-wrap gap-2">
                  {state.quick_replies.map((reply, index) => (
                    <button
                      key={index}
                      onClick={() => handleQuickReply(reply)}
                      className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-full border border-gray-300 dark:border-gray-600 transition-colors"
                    >
                      {reply.text}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Escalation Bar */}
            {state.escalation_available && (
              <div className="px-4 pb-2">
                <button
                  onClick={() => handleEscalation('low_confidence')}
                  className="w-full px-3 py-2 text-xs bg-orange-50 hover:bg-orange-100 dark:bg-orange-900 dark:hover:bg-orange-800 text-orange-700 dark:text-orange-300 rounded border border-orange-300 dark:border-orange-600 flex items-center justify-center space-x-2 transition-colors"
                >
                  <AlertCircle size={14} />
                  <span>Connect with Human Support</span>
                </button>
              </div>
            )}

            {/* Input */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex space-x-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={placeholderText}
                  disabled={state.loading}
                  className="flex-1 p-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100"
                />
                <button
                  onClick={() => sendMessage(inputMessage)}
                  disabled={!inputMessage.trim() || state.loading}
                  className="p-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
                  style={{
                    backgroundColor:
                      inputMessage.trim() && !state.loading
                        ? primaryColor
                        : undefined,
                  }}
                >
                  {state.loading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Send size={16} />
                  )}
                </button>
              </div>
            </div>

            {/* Branding */}
            {showBranding && (
              <div className="px-4 pb-2 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Powered by {companyName} AI
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Button */}
      <motion.button
        onClick={toggleChatbot}
        className="w-14 h-14 rounded-full text-white shadow-lg hover:shadow-xl transition-shadow flex items-center justify-center"
        style={{ backgroundColor: primaryColor }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        {state.isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </motion.button>
    </div>
  );
}
