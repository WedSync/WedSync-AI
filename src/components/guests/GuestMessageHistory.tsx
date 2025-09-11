/**
 * WS-155: Guest Profile Message History Integration
 * Complete message history and conversation tracking in guest profiles
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Send,
  Clock,
  CheckCheck,
  Check,
  Search,
  Filter,
  Download,
  Phone,
  Mail,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Mic,
  Paperclip,
  Smile,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase/client';
import { format, formatRelative } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { QuickActionTemplates } from '@/components/messaging/QuickActionTemplates';
import { voiceMessageIntegration } from '@/lib/services/voice-message-integration';
import { smartMessageComposer } from '@/lib/services/smart-message-composer';
import { advancedOfflineSync } from '@/lib/services/advanced-offline-sync';

interface Message {
  id: string;
  content: string;
  type: 'sent' | 'received';
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  attachments?: string[];
  isVoice?: boolean;
  metadata?: any;
  replyTo?: string;
}

interface GuestInfo {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  avatar?: string;
  rsvpStatus?: 'pending' | 'accepted' | 'declined';
  lastActivity?: string;
  tags?: string[];
  preferences?: {
    preferredChannel?: 'email' | 'sms' | 'whatsapp';
    language?: string;
    timezone?: string;
  };
}

interface GuestMessageHistoryProps {
  guestId: string;
  weddingId: string;
  className?: string;
  showQuickActions?: boolean;
  onMessageSent?: (message: Message) => void;
}

export function GuestMessageHistory({
  guestId,
  weddingId,
  className,
  showQuickActions = true,
  onMessageSent,
}: GuestMessageHistoryProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [guestInfo, setGuestInfo] = useState<GuestInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [typingIndicator, setTypingIndicator] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const conversationRef = useRef<HTMLDivElement>(null);

  // Fetch guest information
  const fetchGuestInfo = async () => {
    try {
      const { data: guest, error } = await supabase
        .from('guests')
        .select('*')
        .eq('id', guestId)
        .single();

      if (error) throw error;

      // Get additional preferences
      const { data: preferences } = await supabase
        .from('guest_preferences')
        .select('*')
        .eq('guest_id', guestId)
        .single();

      // Get last activity
      const { data: lastMessage } = await supabase
        .from('messages')
        .select('created_at')
        .eq('guest_id', guestId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      setGuestInfo({
        id: guest.id,
        name: guest.name,
        email: guest.email,
        phone: guest.phone,
        avatar: guest.avatar_url,
        rsvpStatus: guest.rsvp_status,
        lastActivity: lastMessage?.created_at,
        tags: guest.tags,
        preferences: preferences || {},
      });
    } catch (error) {
      console.error('Error fetching guest info:', error);
    }
  };

  // Fetch message history
  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('guest_id', guestId)
        .eq('wedding_id', weddingId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const formattedMessages: Message[] = data.map((msg) => ({
        id: msg.id,
        content: msg.content,
        type: msg.is_from_guest ? 'received' : 'sent',
        status: msg.status || 'sent',
        timestamp: msg.created_at,
        attachments: msg.attachments,
        isVoice: msg.is_voice,
        metadata: msg.metadata,
        replyTo: msg.reply_to,
      }));

      setMessages(formattedMessages);

      // Mark messages as read
      await markMessagesAsRead();
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  // Mark messages as read
  const markMessagesAsRead = async () => {
    try {
      await supabase
        .from('messages')
        .update({
          status: 'read',
          read_at: new Date().toISOString(),
        })
        .eq('guest_id', guestId)
        .eq('wedding_id', weddingId)
        .eq('is_from_guest', true)
        .is('read_at', null);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  // Setup real-time subscription
  useEffect(() => {
    fetchGuestInfo();
    fetchMessages();

    // Subscribe to real-time updates
    const subscription = supabase
      .channel(`messages-${guestId}-${weddingId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `guest_id=eq.${guestId},wedding_id=eq.${weddingId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newMsg: Message = {
              id: payload.new.id,
              content: payload.new.content,
              type: payload.new.is_from_guest ? 'received' : 'sent',
              status: payload.new.status || 'sent',
              timestamp: payload.new.created_at,
              attachments: payload.new.attachments,
              isVoice: payload.new.is_voice,
              metadata: payload.new.metadata,
              replyTo: payload.new.reply_to,
            };

            setMessages((prev) => [...prev, newMsg]);

            // Show typing indicator for received messages
            if (newMsg.type === 'received') {
              setTypingIndicator(true);
              setTimeout(() => setTypingIndicator(false), 1000);
            }
          } else if (payload.eventType === 'UPDATE') {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === payload.new.id
                  ? { ...msg, status: payload.new.status }
                  : msg,
              ),
            );
          }
        },
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [guestId, weddingId]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message
  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    setSending(true);
    const tempId = `temp_${Date.now()}`;
    const message: Message = {
      id: tempId,
      content: newMessage,
      type: 'sent',
      status: 'pending',
      timestamp: new Date().toISOString(),
    };

    // Add optimistic update
    setMessages((prev) => [...prev, message]);
    setNewMessage('');

    try {
      // Queue for offline sync
      await advancedOfflineSync.queueOperation('CREATE', 'messages', tempId, {
        guest_id: guestId,
        wedding_id: weddingId,
        content: message.content,
        is_from_guest: false,
        status: 'sent',
        created_at: message.timestamp,
      });

      // Update message status
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === tempId ? { ...msg, status: 'sent' } : msg,
        ),
      );

      onMessageSent?.(message);

      // Save to composer for learning
      await smartMessageComposer.saveUserSelection(guestId, tempId, 'positive');
    } catch (error) {
      console.error('Error sending message:', error);

      // Update message status to failed
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === tempId ? { ...msg, status: 'failed' } : msg,
        ),
      );
    } finally {
      setSending(false);
    }
  };

  // Start voice recording
  const startVoiceRecording = async () => {
    if (!voiceMessageIntegration.isSupported()) {
      alert('Voice recording is not supported in your browser');
      return;
    }

    try {
      setIsRecording(true);
      await voiceMessageIntegration.startRecording({
        maxDuration: 60,
        onStop: async () => {
          const { audioBlob, duration, mimeType } =
            await voiceMessageIntegration.stopRecording();

          // Process and transcribe
          const transcription =
            await voiceMessageIntegration.processVoiceMessage({
              audioBlob,
              duration,
              mimeType,
              userId: guestId,
              guestId,
              weddingId,
              language: guestInfo?.preferences?.language || 'en-US',
            });

          // Set transcribed text as message
          setNewMessage(transcription.text);
          setIsRecording(false);
        },
      });
    } catch (error) {
      console.error('Error starting voice recording:', error);
      setIsRecording(false);
    }
  };

  // Stop voice recording
  const stopVoiceRecording = async () => {
    try {
      await voiceMessageIntegration.stopRecording();
    } catch (error) {
      console.error('Error stopping voice recording:', error);
    } finally {
      setIsRecording(false);
    }
  };

  // Get AI suggestions
  const getAiSuggestions = async () => {
    try {
      const suggestions = await smartMessageComposer.generateSuggestions({
        guestId,
        weddingId,
        context: 'custom',
        tone: 'friendly',
        language: guestInfo?.preferences?.language || 'en',
        customPrompt: newMessage,
      });

      setAiSuggestions(suggestions);
    } catch (error) {
      console.error('Error getting AI suggestions:', error);
    }
  };

  // Filter messages
  const filteredMessages = messages.filter((msg) => {
    if (
      searchQuery &&
      !msg.content.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    if (filterType === 'sent' && msg.type !== 'sent') return false;
    if (filterType === 'received' && msg.type !== 'received') return false;
    if (filterType === 'voice' && !msg.isVoice) return false;
    return true;
  });

  // Export messages
  const exportMessages = () => {
    const data = filteredMessages.map((msg) => ({
      date: format(new Date(msg.timestamp), 'yyyy-MM-dd HH:mm'),
      type: msg.type,
      content: msg.content,
      status: msg.status,
    }));

    const csv = [
      ['Date', 'Type', 'Content', 'Status'],
      ...data.map((row) => [row.date, row.type, row.content, row.status]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `messages-${guestInfo?.name}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  // Render message status icon
  const MessageStatusIcon = ({ status }: { status: string }) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-3 h-3 text-gray-400" />;
      case 'sent':
        return <Check className="w-3 h-3 text-gray-400" />;
      case 'delivered':
        return <CheckCheck className="w-3 h-3 text-gray-400" />;
      case 'read':
        return <CheckCheck className="w-3 h-3 text-blue-500" />;
      case 'failed':
        return <AlertCircle className="w-3 h-3 text-red-500" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className={cn('animate-pulse', className)}>
        <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded-xl" />
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Guest Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {guestInfo?.avatar ? (
              <img
                src={guestInfo.avatar}
                alt={guestInfo.name}
                className="w-10 h-10 rounded-full"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                {guestInfo?.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {guestInfo?.name}
              </h3>
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                {guestInfo?.email && (
                  <div className="flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    <span>{guestInfo.email}</span>
                  </div>
                )}
                {guestInfo?.phone && (
                  <div className="flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    <span>{guestInfo.phone}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'px-2 py-1 text-xs font-medium rounded-full',
                guestInfo?.rsvpStatus === 'accepted' &&
                  'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
                guestInfo?.rsvpStatus === 'declined' &&
                  'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400',
                guestInfo?.rsvpStatus === 'pending' &&
                  'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400',
              )}
            >
              {guestInfo?.rsvpStatus || 'No RSVP'}
            </span>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-gray-50 dark:bg-gray-900 p-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <Filter className="w-4 h-4" />
          </button>
          <button
            onClick={exportMessages}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>

        {showFilters && (
          <div className="flex gap-2 mt-2">
            {['all', 'sent', 'received', 'voice'].map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={cn(
                  'px-3 py-1 text-xs font-medium rounded-full capitalize transition-colors',
                  filterType === type
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600',
                )}
              >
                {type}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Messages Container */}
      <div
        ref={conversationRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-gray-900"
      >
        <AnimatePresence>
          {filteredMessages.map((message, index) => {
            const isLastFromSender =
              index === filteredMessages.length - 1 ||
              filteredMessages[index + 1]?.type !== message.type;

            return (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={cn(
                  'flex',
                  message.type === 'sent' ? 'justify-end' : 'justify-start',
                )}
              >
                <div
                  className={cn(
                    'max-w-[70%] rounded-2xl px-4 py-2',
                    message.type === 'sent'
                      ? 'bg-blue-500 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white',
                    isLastFromSender &&
                      message.type === 'sent' &&
                      'rounded-br-sm',
                    isLastFromSender &&
                      message.type === 'received' &&
                      'rounded-bl-sm',
                  )}
                  onClick={() => setSelectedMessage(message)}
                >
                  {message.replyTo && (
                    <div className="text-xs opacity-70 mb-1 pb-1 border-b border-white/20">
                      Replying to:{' '}
                      {messages
                        .find((m) => m.id === message.replyTo)
                        ?.content.substring(0, 30)}
                      ...
                    </div>
                  )}

                  {message.isVoice && (
                    <div className="flex items-center gap-2 mb-1">
                      <Mic className="w-4 h-4" />
                      <span className="text-xs">Voice message</span>
                    </div>
                  )}

                  <p className="text-sm whitespace-pre-wrap break-words">
                    {message.content}
                  </p>

                  {message.attachments && message.attachments.length > 0 && (
                    <div className="flex items-center gap-1 mt-2">
                      <Paperclip className="w-3 h-3" />
                      <span className="text-xs">
                        {message.attachments.length} attachment(s)
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-1 gap-2">
                    <span className="text-xs opacity-70">
                      {format(new Date(message.timestamp), 'HH:mm')}
                    </span>
                    {message.type === 'sent' && (
                      <MessageStatusIcon status={message.status} />
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {typingIndicator && (
          <div className="flex justify-start">
            <div className="bg-gray-200 dark:bg-gray-700 rounded-2xl px-4 py-2">
              <div className="flex gap-1">
                <span
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: '0ms' }}
                />
                <span
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: '150ms' }}
                />
                <span
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: '300ms' }}
                />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      {showQuickActions && (
        <div className="p-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <QuickActionTemplates
            guestId={guestId}
            weddingId={weddingId}
            className="mb-3"
          />
        </div>
      )}

      {/* AI Suggestions */}
      {aiSuggestions.length > 0 && (
        <div className="p-3 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            AI Suggestions:
          </p>
          <div className="flex gap-2 overflow-x-auto">
            {aiSuggestions.slice(0, 3).map((suggestion, index) => (
              <button
                key={index}
                onClick={() => {
                  setNewMessage(suggestion.message);
                  setAiSuggestions([]);
                }}
                className="flex-shrink-0 px-3 py-1 text-xs bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                {suggestion.message.substring(0, 50)}...
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Message Input */}
      <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-end gap-2">
          <button
            onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
            className={cn(
              'p-2 rounded-lg transition-colors',
              isRecording
                ? 'bg-red-500 text-white animate-pulse'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700',
            )}
          >
            <Mic className="w-5 h-5" />
          </button>

          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Type a message..."
              className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg resize-none bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={1}
              disabled={sending || isRecording}
            />
            <button
              onClick={() => getAiSuggestions()}
              className="absolute right-2 bottom-2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              <Smile className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          <button
            onClick={sendMessage}
            disabled={!newMessage.trim() || sending}
            className={cn(
              'p-2 rounded-lg transition-colors',
              newMessage.trim() && !sending
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed',
            )}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
