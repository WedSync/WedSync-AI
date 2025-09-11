'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Send,
  Paperclip,
  Search,
  MoreVertical,
  Users,
  Bell,
  Archive,
  Check,
  CheckCheck,
  Clock,
  AlertCircle,
  Image as ImageIcon,
  File,
  Mic,
  X,
  Edit2,
  Trash2,
  Reply,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import vendorChatService from '@/lib/services/vendor-chat-service';
import {
  ChatRoom,
  ChatMessage,
  ChatParticipant,
  ChatPresence,
  SendMessageRequest,
  MessageEvent,
  PresenceEvent,
  TypingEvent,
} from '@/types/chat';
import { formatDistanceToNow } from 'date-fns';
import { useDebounce } from '@/hooks/useDebounce';

interface VendorChatInterfaceProps {
  weddingId?: string;
  clientId?: string;
  className?: string;
  onRoomChange?: (room: ChatRoom) => void;
}

export default function VendorChatInterface({
  weddingId,
  clientId,
  className,
}: VendorChatInterfaceProps) {
  // State Management
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({});
  const [participants, setParticipants] = useState<
    Record<string, ChatParticipant[]>
  >({});
  const [typingUsers, setTypingUsers] = useState<Record<string, string[]>>({});
  const [messageInput, setMessageInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMessage, setSelectedMessage] = useState<ChatMessage | null>(
    null,
  );
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    'connecting' | 'connected' | 'disconnected' | 'error'
  >('connecting');
  const [uploadingFile, setUploadingFile] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced search
  const debouncedSearch = useDebounce(searchQuery, 500);

  // =====================================================
  // INITIALIZATION & SUBSCRIPTIONS
  // =====================================================

  useEffect(() => {
    loadRooms();

    return () => {
      vendorChatService.unsubscribeAll();
    };
  }, [weddingId, clientId]);

  useEffect(() => {
    if (activeRoom) {
      loadMessages(activeRoom.id);
      loadParticipants(activeRoom.id);
      subscribeToRoom(activeRoom.id);
    }
  }, [activeRoom]);

  useEffect(() => {
    scrollToBottom();
  }, [messages[activeRoom?.id || '']]);

  const loadRooms = async () => {
    const filters: any = {};
    if (weddingId) filters.wedding_id = weddingId;

    const roomList = await vendorChatService.getRooms(filters);
    setRooms(roomList);

    if (roomList.length > 0 && !activeRoom) {
      setActiveRoom(roomList[0]);
    }
  };

  const loadMessages = async (roomId: string) => {
    const msgs = await vendorChatService.getMessages(roomId);
    setMessages((prev) => ({ ...prev, [roomId]: msgs }));
  };

  const loadParticipants = async (roomId: string) => {
    const parts = await vendorChatService.getParticipants(roomId);
    setParticipants((prev) => ({ ...prev, [roomId]: parts }));
  };

  const subscribeToRoom = (roomId: string) => {
    vendorChatService.subscribeToRoom(roomId, {
      onMessage: handleMessageEvent,
      onPresence: handlePresenceEvent,
      onTyping: handleTypingEvent,
      onConnectionChange: setConnectionStatus,
    });
  };

  // =====================================================
  // EVENT HANDLERS
  // =====================================================

  const handleMessageEvent = (event: MessageEvent) => {
    if (event.type === 'new_message') {
      setMessages((prev) => ({
        ...prev,
        [event.room_id]: [...(prev[event.room_id] || []), event.message],
      }));
    } else if (event.type === 'message_edited') {
      setMessages((prev) => ({
        ...prev,
        [event.room_id]: (prev[event.room_id] || []).map((msg) =>
          msg.id === event.message.id ? event.message : msg,
        ),
      }));
    } else if (event.type === 'message_deleted') {
      setMessages((prev) => ({
        ...prev,
        [event.room_id]: (prev[event.room_id] || []).map((msg) =>
          msg.id === event.message.id ? { ...msg, is_deleted: true } : msg,
        ),
      }));
    }
  };

  const handlePresenceEvent = (event: PresenceEvent) => {
    // Update presence UI based on event
    console.log('Presence event:', event);
  };

  const handleTypingEvent = (event: TypingEvent) => {
    if (event.type === 'typing_start') {
      setTypingUsers((prev) => ({
        ...prev,
        [event.room_id]: [...(prev[event.room_id] || []), event.user_id].filter(
          (v, i, a) => a.indexOf(v) === i,
        ),
      }));
    } else {
      setTypingUsers((prev) => ({
        ...prev,
        [event.room_id]: (prev[event.room_id] || []).filter(
          (id) => id !== event.user_id,
        ),
      }));
    }
  };

  // =====================================================
  // MESSAGE ACTIONS
  // =====================================================

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !activeRoom) return;

    const request: SendMessageRequest = {
      room_id: activeRoom.id,
      content: messageInput,
      parent_message_id: replyingTo?.id,
    };

    const message = await vendorChatService.sendMessage(request);
    if (message) {
      setMessageInput('');
      setReplyingTo(null);
      scrollToBottom();
    }
  };

  const handleTyping = () => {
    if (!activeRoom || !messageInput) return;

    if (!isTyping) {
      setIsTyping(true);
      vendorChatService.startTyping(activeRoom.id);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      vendorChatService.stopTyping(activeRoom.id);
    }, 2000);
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file || !activeRoom) return;

    setUploadingFile(true);
    const attachment = await vendorChatService.uploadAttachment({
      room_id: activeRoom.id,
      file,
      category: file.type.startsWith('image/') ? 'image' : 'document',
    });

    if (attachment) {
      await vendorChatService.sendMessage({
        room_id: activeRoom.id,
        content: `Shared ${file.name}`,
        message_type: file.type.startsWith('image/') ? 'image' : 'file',
        attachments: [attachment.id],
      });
    }
    setUploadingFile(false);
  };

  const handleEditMessage = async (messageId: string, newContent: string) => {
    const success = await vendorChatService.editMessage(messageId, newContent);
    if (success) {
      setEditingMessage(null);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    await vendorChatService.deleteMessage(messageId);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // =====================================================
  // RENDER HELPERS
  // =====================================================

  const getMessageStatus = (message: ChatMessage) => {
    if (message.status === 'failed') {
      return <AlertCircle className="w-4 h-4 text-error-500" />;
    }
    if (message.read_by && message.read_by.length > 0) {
      return <CheckCheck className="w-4 h-4 text-primary-600" />;
    }
    if (message.status === 'delivered') {
      return <CheckCheck className="w-4 h-4 text-gray-400" />;
    }
    if (message.status === 'sent') {
      return <Check className="w-4 h-4 text-gray-400" />;
    }
    return <Clock className="w-4 h-4 text-gray-300" />;
  };

  const roomMessages = messages[activeRoom?.id || ''] || [];
  const roomParticipants = participants[activeRoom?.id || ''] || [];
  const roomTypingUsers = typingUsers[activeRoom?.id || ''] || [];

  return (
    <div className={cn('flex h-[calc(100vh-64px)] bg-white', className)}>
      {/* Sidebar - Room List */}
      <div className="w-80 border-r border-gray-200 flex flex-col">
        {/* Search Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300"
            />
          </div>
        </div>

        {/* Room List */}
        <div className="flex-1 overflow-y-auto">
          {rooms.map((room) => (
            <button
              key={room.id}
              onClick={() => setActiveRoom(room)}
              className={cn(
                'w-full px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors',
                activeRoom?.id === room.id &&
                  'bg-primary-50 hover:bg-primary-50',
              )}
            >
              <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 text-primary-600" />
              </div>
              <div className="flex-1 text-left">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm text-gray-900">
                    {room.room_name}
                  </h3>
                  {room.last_message_at && (
                    <span className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(room.last_message_at), {
                        addSuffix: false,
                      })}
                    </span>
                  )}
                </div>
                {room.last_message && (
                  <p className="text-sm text-gray-500 truncate mt-0.5">
                    {room.last_message.content}
                  </p>
                )}
                {room.unread_count && room.unread_count > 0 && (
                  <div className="mt-1">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-600 text-white">
                      {room.unread_count}
                    </span>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Connection Status */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'w-2 h-2 rounded-full',
                connectionStatus === 'connected' && 'bg-success-500',
                connectionStatus === 'connecting' &&
                  'bg-warning-500 animate-pulse',
                connectionStatus === 'disconnected' && 'bg-gray-400',
                connectionStatus === 'error' && 'bg-error-500',
              )}
            />
            <span className="text-xs text-gray-600">
              {connectionStatus === 'connected' && 'Connected'}
              {connectionStatus === 'connecting' && 'Connecting...'}
              {connectionStatus === 'disconnected' && 'Disconnected'}
              {connectionStatus === 'error' && 'Connection Error'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      {activeRoom ? (
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">
                  {activeRoom.room_name}
                </h2>
                <p className="text-sm text-gray-500">
                  {roomParticipants.length} participants
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <Bell className="w-5 h-5 text-gray-600" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <Archive className="w-5 h-5 text-gray-600" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <MoreVertical className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {roomMessages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'flex gap-3',
                  message.sender_id === vendorChatService['userId']
                    ? 'flex-row-reverse'
                    : 'flex-row',
                )}
              >
                <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0" />
                <div
                  className={cn(
                    'max-w-[70%] space-y-1',
                    message.sender_id === vendorChatService['userId']
                      ? 'items-end'
                      : 'items-start',
                  )}
                >
                  {message.parent_message && (
                    <div className="px-3 py-2 bg-gray-50 rounded-lg border-l-4 border-gray-300 mb-1">
                      <p className="text-xs text-gray-500">Replying to</p>
                      <p className="text-sm text-gray-700 truncate">
                        {message.parent_message.content}
                      </p>
                    </div>
                  )}
                  <div
                    className={cn(
                      'px-4 py-2.5 rounded-2xl',
                      message.sender_id === vendorChatService['userId']
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-900',
                    )}
                  >
                    {message.is_deleted ? (
                      <p className="text-sm italic opacity-60">
                        This message was deleted
                      </p>
                    ) : editingMessage === message.id ? (
                      <input
                        type="text"
                        defaultValue={message.content}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleEditMessage(
                              message.id,
                              e.currentTarget.value,
                            );
                          } else if (e.key === 'Escape') {
                            setEditingMessage(null);
                          }
                        }}
                        className="bg-transparent outline-none"
                        autoFocus
                      />
                    ) : (
                      <p className="text-sm">{message.content}</p>
                    )}
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {message.attachments.map((attachment) => (
                          <a
                            key={attachment.id}
                            href={attachment.public_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                          >
                            {attachment.category === 'image' ? (
                              <ImageIcon className="w-4 h-4" />
                            ) : (
                              <File className="w-4 h-4" />
                            )}
                            <span className="text-xs">
                              {attachment.file_name}
                            </span>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 px-1">
                    <span className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(message.created_at), {
                        addSuffix: true,
                      })}
                    </span>
                    {message.is_edited && (
                      <span className="text-xs text-gray-400">(edited)</span>
                    )}
                    {message.sender_id === vendorChatService['userId'] &&
                      getMessageStatus(message)}
                  </div>
                  {message.sender_id === vendorChatService['userId'] &&
                    !message.is_deleted && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => setEditingMessage(message.id)}
                          className="p-1 hover:bg-gray-100 rounded transition-colors"
                        >
                          <Edit2 className="w-3 h-3 text-gray-500" />
                        </button>
                        <button
                          onClick={() => handleDeleteMessage(message.id)}
                          className="p-1 hover:bg-gray-100 rounded transition-colors"
                        >
                          <Trash2 className="w-3 h-3 text-gray-500" />
                        </button>
                      </div>
                    )}
                  {message.sender_id !== vendorChatService['userId'] && (
                    <button
                      onClick={() => setReplyingTo(message)}
                      className="p-1 hover:bg-gray-100 rounded transition-colors"
                    >
                      <Reply className="w-3 h-3 text-gray-500" />
                    </button>
                  )}
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {roomTypingUsers.length > 0 && (
              <div className="flex items-center gap-2 px-4">
                <div className="flex gap-1">
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: '0ms' }}
                  />
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: '150ms' }}
                  />
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: '300ms' }}
                  />
                </div>
                <span className="text-sm text-gray-500">
                  {roomTypingUsers.length}{' '}
                  {roomTypingUsers.length === 1 ? 'person is' : 'people are'}{' '}
                  typing...
                </span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Reply Preview */}
          {replyingTo && (
            <div className="px-6 py-2 bg-gray-50 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Reply className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-500">Replying to</span>
                  <span className="text-sm text-gray-900 font-medium truncate">
                    {replyingTo.content}
                  </span>
                </div>
                <button
                  onClick={() => setReplyingTo(null)}
                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>
          )}

          {/* Message Input */}
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-end gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingFile}
                className="p-2.5 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <Paperclip className="w-5 h-5 text-gray-600" />
              </button>
              <button className="p-2.5 hover:bg-gray-100 rounded-lg transition-colors">
                <Mic className="w-5 h-5 text-gray-600" />
              </button>
              <div className="flex-1">
                <textarea
                  value={messageInput}
                  onChange={(e) => {
                    setMessageInput(e.target.value);
                    handleTyping();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Type a message..."
                  rows={1}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300"
                />
              </div>
              <button
                onClick={handleSendMessage}
                disabled={!messageInput.trim()}
                className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm rounded-lg shadow-xs hover:shadow-sm transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-primary-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileUpload}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
          />
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="font-semibold text-gray-900 mb-1">
              Select a conversation
            </h3>
            <p className="text-sm text-gray-500">
              Choose a vendor chat room to start messaging
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
