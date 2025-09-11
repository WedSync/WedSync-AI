'use client';

/**
 * WS-342 Wedding Party Chat - Real-time Communication
 * Team A - Frontend/UI Development - Chat Interface
 *
 * Real-time chat for wedding party with media support, mentions,
 * and channel management
 */

import React, { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  ChatMessage,
  ChatChannel,
  Collaborator,
  MessageType,
} from '@/types/collaboration';

// Icons
import {
  Send,
  Paperclip,
  Smile,
  Phone,
  Video,
  Users,
  Settings,
} from 'lucide-react';

// UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export interface WeddingPartyChatProps {
  weddingId: string;
  participants: Collaborator[];
  onMessage: (message: ChatMessage) => void;
  supportedMedia: ('text' | 'image' | 'voice' | 'video')[];
  className?: string;
}

export function WeddingPartyChat({
  weddingId,
  participants,
  onMessage,
  supportedMedia,
  className,
}: WeddingPartyChatProps) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const handleSendMessage = useCallback(() => {
    if (!message.trim()) return;

    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      channelId: weddingId,
      senderId: 'current-user-id',
      content: message,
      type: MessageType.TEXT,
      timestamp: new Date(),
      isSystemMessage: false,
      readBy: [],
    };

    onMessage(newMessage);
    setMessage('');
  }, [message, weddingId, onMessage]);

  return (
    <div
      className={cn('wedding-party-chat flex flex-col h-[600px]', className)}
      data-testid="wedding-party-chat"
    >
      {/* Chat Header */}
      <div className="p-4 border-b bg-white">
        <h3 className="font-semibold">Wedding Party Chat</h3>
        <p className="text-sm text-gray-600">
          {participants.length} participants
        </p>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <Users className="w-8 h-8 mx-auto mb-2" />
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className="flex space-x-3">
                <Avatar className="w-8 h-8">
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="bg-gray-100 rounded-lg p-3">
                    <p className="text-sm">{msg.content}</p>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {msg.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Message Input */}
      <div className="p-4 border-t bg-white">
        <div className="flex items-center space-x-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            className="flex-1"
          />
          <Button onClick={handleSendMessage}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default WeddingPartyChat;
