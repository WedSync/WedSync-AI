'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { TouchButton } from '@/components/touch/TouchButton';
import { X, Send, Users, Clock, AlertTriangle } from 'lucide-react';

interface MobileMessageComposerProps {
  onSend: (message: string, recipientIds: string[], isUrgent?: boolean) => void;
  onClose: () => void;
  initialMessage?: string;
  recipientIds?: string[];
  isOffline?: boolean;
}

export function MobileMessageComposer({
  onSend,
  onClose,
  initialMessage = '',
  recipientIds = [],
  isOffline = false,
}: MobileMessageComposerProps) {
  const [message, setMessage] = useState(initialMessage);
  const [selectedRecipients, setSelectedRecipients] =
    useState<string[]>(recipientIds);
  const [isUrgent, setIsUrgent] = useState(false);
  const [showRecipientSelector, setShowRecipientSelector] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea for mobile
  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [message]);

  useEffect(() => {
    // Auto-focus on mount for desktop, but not on mobile to prevent keyboard
    if (window.innerWidth > 768 && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  const handleSend = () => {
    if (!message.trim() || selectedRecipients.length === 0) return;

    onSend(message, selectedRecipients, isUrgent);
    setMessage('');
    setIsUrgent(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const remainingChars = 160 - message.length; // SMS character limit
  const isOverLimit = remainingChars < 0;

  return (
    <div className="fixed inset-0 bg-background z-50 md:relative md:bg-transparent">
      <Card className="h-full md:h-auto rounded-none md:rounded-lg border-0 md:border flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-muted/50 md:rounded-t-lg">
          <h3 className="text-lg font-semibold">Quick Message</h3>
          <div className="flex items-center gap-2">
            {isOffline && (
              <div className="flex items-center gap-1 text-orange-600 text-sm">
                <Clock className="w-4 h-4" />
                <span>Offline</span>
              </div>
            )}
            <TouchButton
              size="sm"
              variant="ghost"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </TouchButton>
          </div>
        </div>

        {/* Recipients */}
        <div className="p-4 border-b bg-muted/30">
          <TouchButton
            onClick={() => setShowRecipientSelector(true)}
            variant="outline"
            className="w-full justify-start h-12"
          >
            <Users className="w-4 h-4 mr-2" />
            <span className="truncate">
              {selectedRecipients.length === 0
                ? 'Select recipients'
                : `${selectedRecipients.length} recipient${selectedRecipients.length === 1 ? '' : 's'} selected`}
            </span>
          </TouchButton>
        </div>

        {/* Message Input */}
        <div className="flex-1 p-4 flex flex-col min-h-0">
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                isOffline
                  ? 'Write your message (will send when back online)'
                  : 'Write your message...'
              }
              className="min-h-[100px] text-base resize-none border-0 p-0 focus-visible:ring-0"
              style={{ fontSize: '16px' }} // Prevents zoom on iOS
            />
          </div>

          {/* Character Count */}
          <div className="flex items-center justify-between mt-2 text-sm">
            <div className="flex items-center gap-2">
              <TouchButton
                size="sm"
                variant={isUrgent ? 'destructive' : 'outline'}
                onClick={() => setIsUrgent(!isUrgent)}
                className="h-8"
              >
                <AlertTriangle className="w-3 h-3 mr-1" />
                Urgent
              </TouchButton>
            </div>
            <span
              className={
                isOverLimit ? 'text-destructive' : 'text-muted-foreground'
              }
            >
              {remainingChars} chars
            </span>
          </div>
        </div>

        {/* Send Button */}
        <div className="p-4 border-t bg-muted/30">
          <TouchButton
            onClick={handleSend}
            disabled={
              !message.trim() || selectedRecipients.length === 0 || isOverLimit
            }
            className="w-full h-12 text-base"
            size="lg"
          >
            <Send className="w-4 h-4 mr-2" />
            {isOffline ? 'Queue Message' : 'Send Message'}
          </TouchButton>
        </div>
      </Card>
    </div>
  );
}
