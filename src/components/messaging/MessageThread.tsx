'use client';

import { useState, useEffect, useRef } from 'react';
import { useRealtimeMessages } from '@/lib/supabase/realtime';
import { Database } from '@/types/database';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Send, Paperclip, MoreVertical } from 'lucide-react';
import { clsx } from 'clsx';

type Message = Database['public']['Tables']['messages']['Row'] & {
  sender?: {
    id: string;
    display_name: string;
    avatar_url: string | null;
  };
};

type Conversation = Database['public']['Tables']['conversations']['Row'] & {
  client?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  };
  vendor?: {
    id: string;
    business_name: string;
    email: string;
  };
};

interface MessageThreadProps {
  conversation: Conversation;
  currentUserId: string;
  currentUserType: 'client' | 'vendor';
}

export function MessageThread({
  conversation,
  currentUserId,
  currentUserType,
}: MessageThreadProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(
    null,
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Use realtime hook
  const {
    messages: realtimeMessages,
    sendMessage,
    markAsRead,
  } = useRealtimeMessages(conversation.id);

  // Load initial messages
  useEffect(() => {
    async function loadMessages() {
      try {
        setLoading(true);

        const response = await fetch(
          `/api/communications/messages?conversation_id=${conversation.id}`,
        );

        if (!response.ok) {
          throw new Error('Failed to load messages');
        }

        const data = await response.json();
        setMessages(data.messages || []);
      } catch (error) {
        console.error('Error loading messages:', error);
      } finally {
        setLoading(false);
      }
    }

    loadMessages();
  }, [conversation.id]);

  // Update messages when realtime data changes
  useEffect(() => {
    if (realtimeMessages.length > 0) {
      setMessages(realtimeMessages);
    }
  }, [realtimeMessages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark messages as read
  useEffect(() => {
    const unreadMessages = messages.filter(
      (msg) =>
        !msg.is_read &&
        msg.recipient_id === currentUserId &&
        msg.sender_id !== currentUserId,
    );

    unreadMessages.forEach(async (message) => {
      try {
        await markAsRead(message.id);
        // Also call API to update server
        await fetch(`/api/communications/messages/${message.id}/read`, {
          method: 'PATCH',
        });
      } catch (error) {
        console.error('Error marking message as read:', error);
      }
    });
  }, [messages, currentUserId, markAsRead]);

  // Handle typing indicator
  const handleTyping = async (isTyping: boolean) => {
    try {
      // This would typically be implemented with a separate API or realtime channel
      // For now, we'll skip the typing indicator API calls
    } catch (error) {
      console.error('Error updating typing status:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value);

    // Handle typing indicator
    if (!typingTimeout) {
      handleTyping(true);
    }

    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }

    const timeout = setTimeout(() => {
      handleTyping(false);
      setTypingTimeout(null);
    }, 1000);

    setTypingTimeout(timeout);

    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim() || sending) return;

    const messageContent = newMessage.trim();
    setNewMessage('');
    setSending(true);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      await sendMessage(messageContent);

      // Also call API to ensure server consistency
      const response = await fetch('/api/communications/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversation_id: conversation.id,
          content: messageContent,
          message_type: 'text',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Restore message content on error
      setNewMessage(messageContent);
    } finally {
      setSending(false);
      handleTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    if (isToday(date)) {
      return format(date, 'HH:mm');
    } else if (isYesterday(date)) {
      return `Yesterday ${format(date, 'HH:mm')}`;
    } else {
      return format(date, 'MMM d, HH:mm');
    }
  };

  const getConversationTitle = () => {
    if (currentUserType === 'client' && conversation.vendor) {
      return conversation.vendor.business_name;
    } else if (currentUserType === 'vendor' && conversation.client) {
      const firstName = conversation.client.first_name || '';
      const lastName = conversation.client.last_name || '';
      return (
        `${firstName} ${lastName}`.trim() ||
        conversation.client.email ||
        'Unknown Client'
      );
    }
    return 'Conversation';
  };

  const getMessageSenderName = (message: Message) => {
    if (message.sender_id === currentUserId) {
      return 'You';
    }
    return message.sender_name || 'Unknown';
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading messages...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="w-10 h-10">
              {getConversationTitle().charAt(0).toUpperCase()}
            </Avatar>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {getConversationTitle()}
              </h2>
              {currentUserType === 'vendor' &&
                conversation.client?.wedding_date && (
                  <p className="text-sm text-gray-500">
                    Wedding:{' '}
                    {format(new Date(conversation.client.wedding_date), 'PPP')}
                  </p>
                )}
            </div>
          </div>

          <Button variant="ghost" size="sm">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No messages yet</p>
            <p className="text-sm text-gray-400">
              Send a message to start the conversation
            </p>
          </div>
        ) : (
          <>
            {messages.map((message, index) => {
              const isCurrentUser = message.sender_id === currentUserId;
              const prevMessage = index > 0 ? messages[index - 1] : null;
              const showTimestamp =
                !prevMessage ||
                new Date(message.created_at).getTime() -
                  new Date(prevMessage.created_at).getTime() >
                  300000; // 5 minutes

              return (
                <div key={message.id}>
                  {showTimestamp && (
                    <div className="text-center my-4">
                      <time className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {formatMessageTime(message.created_at)}
                      </time>
                    </div>
                  )}

                  <div
                    className={clsx(
                      'flex items-start space-x-2',
                      isCurrentUser ? 'justify-end' : 'justify-start',
                    )}
                  >
                    {!isCurrentUser && (
                      <Avatar className="w-8 h-8 mt-1">
                        {getMessageSenderName(message).charAt(0).toUpperCase()}
                      </Avatar>
                    )}

                    <div
                      className={clsx(
                        'max-w-xs lg:max-w-md px-4 py-2 rounded-lg',
                        isCurrentUser
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-900',
                      )}
                    >
                      {message.message_type === 'system_notification' && (
                        <div className="text-xs opacity-75 mb-1">System</div>
                      )}

                      <div className="whitespace-pre-wrap break-words">
                        {message.content}
                      </div>

                      <div
                        className={clsx(
                          'text-xs mt-1 flex items-center justify-end space-x-1',
                          isCurrentUser ? 'text-blue-100' : 'text-gray-500',
                        )}
                      >
                        <time>
                          {format(new Date(message.created_at), 'HH:mm')}
                        </time>
                        {isCurrentUser && (
                          <span>{message.is_read ? '✓✓' : '✓'}</span>
                        )}
                      </div>
                    </div>

                    {isCurrentUser && (
                      <Avatar className="w-8 h-8 mt-1">You</Avatar>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <form onSubmit={handleSubmit} className="flex items-end space-x-2">
          <Button type="button" variant="ghost" size="sm" className="mb-2">
            <Paperclip className="w-4 h-4" />
          </Button>

          <div className="flex-1">
            <textarea
              ref={textareaRef}
              value={newMessage}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="w-full resize-none border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={1}
              disabled={sending}
            />
          </div>

          <Button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="mb-2"
          >
            {sending ? (
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
