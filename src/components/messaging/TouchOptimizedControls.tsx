'use client';

import React, { useState, useEffect } from 'react';
import { TouchButton } from '@/components/touch/TouchButton';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Send,
  Users,
  Template,
  Edit3,
  Clock,
  AlertTriangle,
  CheckCircle2,
  X,
  Play,
  Pause,
  RotateCcw,
  Eye,
  Settings,
  Volume2,
  VolumeX,
  Vibrate,
  Bell,
  MessageSquare,
  Heart,
  Sparkles,
} from 'lucide-react';

interface TouchOptimizedControlsProps {
  // Message composition controls
  onCompose?: () => void;
  onTemplates?: () => void;
  onPersonalize?: () => void;
  onSelectRecipients?: () => void;

  // Message sending controls
  onSend?: () => void;
  onSchedule?: () => void;
  onMarkUrgent?: () => void;
  onPreview?: () => void;

  // Status and management controls
  onRetry?: () => void;
  onCancel?: () => void;
  onSettings?: () => void;

  // State props
  isComposing?: boolean;
  hasRecipients?: boolean;
  hasMessage?: boolean;
  recipientCount?: number;
  isUrgent?: boolean;
  isSending?: boolean;
  isOffline?: boolean;
  canSend?: boolean;
  soundEnabled?: boolean;
  vibrationEnabled?: boolean;

  // Layout props
  variant?: 'full' | 'compact' | 'floating' | 'bottom-sheet';
  className?: string;
}

// Touch-friendly button configurations
const touchButtonConfig = {
  primary: {
    size: 'lg' as const,
    className:
      'h-14 min-w-[120px] text-base font-semibold shadow-lg active:scale-95 transition-transform touch-manipulation',
    iconSize: 'w-5 h-5',
  },
  secondary: {
    size: 'default' as const,
    className:
      'h-12 min-w-[100px] text-sm font-medium active:scale-95 transition-transform touch-manipulation',
    iconSize: 'w-4 h-4',
  },
  compact: {
    size: 'sm' as const,
    className:
      'h-10 min-w-[80px] text-sm active:scale-95 transition-transform touch-manipulation',
    iconSize: 'w-4 h-4',
  },
  floating: {
    size: 'lg' as const,
    className:
      'h-14 w-14 rounded-full shadow-xl active:scale-90 transition-all duration-200 touch-manipulation',
    iconSize: 'w-6 h-6',
  },
};

export function TouchOptimizedControls({
  // Message composition
  onCompose,
  onTemplates,
  onPersonalize,
  onSelectRecipients,

  // Message sending
  onSend,
  onSchedule,
  onMarkUrgent,
  onPreview,

  // Status and management
  onRetry,
  onCancel,
  onSettings,

  // State
  isComposing = false,
  hasRecipients = false,
  hasMessage = false,
  recipientCount = 0,
  isUrgent = false,
  isSending = false,
  isOffline = false,
  canSend = false,
  soundEnabled = true,
  vibrationEnabled = true,

  // Layout
  variant = 'full',
  className = '',
}: TouchOptimizedControlsProps) {
  const [feedbackActive, setFeedbackActive] = useState<string | null>(null);

  // Haptic feedback for supported devices
  const triggerHapticFeedback = (
    type: 'light' | 'medium' | 'heavy' = 'medium',
  ) => {
    if ('vibrate' in navigator && vibrationEnabled) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [50],
      };
      navigator.vibrate(patterns[type]);
    }
  };

  // Visual feedback for button presses
  const handleButtonPress = (buttonId: string, callback?: () => void) => {
    triggerHapticFeedback('light');
    setFeedbackActive(buttonId);

    setTimeout(() => {
      setFeedbackActive(null);
    }, 150);

    callback?.();
  };

  // Get button configuration based on variant
  const getButtonConfig = (importance: 'primary' | 'secondary' | 'compact') => {
    if (variant === 'floating') return touchButtonConfig.floating;
    if (variant === 'compact') return touchButtonConfig.compact;
    return touchButtonConfig[importance];
  };

  if (variant === 'floating') {
    return (
      <div className={`fixed bottom-6 right-6 z-50 ${className}`}>
        {/* Main FAB */}
        {!isComposing ? (
          <TouchButton
            onClick={() => handleButtonPress('compose', onCompose)}
            className={`${getButtonConfig('primary').className} bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white border-0`}
            disabled={isSending}
          >
            {isSending ? (
              <div className="animate-spin">
                <Send className={getButtonConfig('primary').iconSize} />
              </div>
            ) : (
              <MessageSquare className={getButtonConfig('primary').iconSize} />
            )}
          </TouchButton>
        ) : (
          <div className="flex flex-col gap-3 items-end">
            {/* Send button */}
            {canSend && (
              <TouchButton
                onClick={() => handleButtonPress('send', onSend)}
                className={`${getButtonConfig('primary').className} bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border-0`}
                disabled={isSending}
              >
                {isSending ? (
                  <div className="animate-spin">
                    <Send className={getButtonConfig('primary').iconSize} />
                  </div>
                ) : (
                  <Send className={getButtonConfig('primary').iconSize} />
                )}
              </TouchButton>
            )}

            {/* Close button */}
            <TouchButton
              onClick={() => handleButtonPress('cancel', onCancel)}
              className={`${getButtonConfig('primary').className} bg-gray-500 hover:bg-gray-600 text-white border-0`}
              size="lg"
            >
              <X className={getButtonConfig('primary').iconSize} />
            </TouchButton>
          </div>
        )}

        {/* Offline indicator */}
        {isOffline && (
          <Badge className="absolute -top-2 -left-8 bg-orange-500 text-white">
            Offline
          </Badge>
        )}
      </div>
    );
  }

  if (variant === 'bottom-sheet') {
    return (
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 bg-white border-t shadow-xl ${className}`}
      >
        <div className="p-4 space-y-3">
          {/* Status bar */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              {isOffline && (
                <Badge
                  variant="secondary"
                  className="bg-orange-100 text-orange-800"
                >
                  Offline Mode
                </Badge>
              )}
              {isUrgent && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Urgent
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>{recipientCount} selected</span>
            </div>
          </div>

          {/* Main action buttons */}
          <div className="flex gap-3">
            <TouchButton
              onClick={() => handleButtonPress('send', onSend)}
              className={`${getButtonConfig('primary').className} flex-1 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white border-0`}
              disabled={!canSend || isSending}
            >
              {isSending ? (
                <>
                  <div className="animate-spin mr-2">
                    <Send className={getButtonConfig('primary').iconSize} />
                  </div>
                  {isOffline ? 'Queuing...' : 'Sending...'}
                </>
              ) : (
                <>
                  <Send
                    className={`${getButtonConfig('primary').iconSize} mr-2`}
                  />
                  {isOffline ? 'Queue Message' : 'Send Message'}
                </>
              )}
            </TouchButton>

            <TouchButton
              onClick={() => handleButtonPress('preview', onPreview)}
              className={getButtonConfig('secondary').className}
              variant="outline"
              disabled={!hasMessage}
            >
              <Eye className={getButtonConfig('secondary').iconSize} />
            </TouchButton>

            <TouchButton
              onClick={() => handleButtonPress('urgent', onMarkUrgent)}
              className={getButtonConfig('secondary').className}
              variant={isUrgent ? 'destructive' : 'outline'}
            >
              <AlertTriangle
                className={getButtonConfig('secondary').iconSize}
              />
            </TouchButton>
          </div>

          {/* Secondary actions */}
          <div className="flex gap-2 justify-center">
            <TouchButton
              onClick={() => handleButtonPress('templates', onTemplates)}
              className={getButtonConfig('compact').className}
              variant="ghost"
              size="sm"
            >
              <Template
                className={`${getButtonConfig('compact').iconSize} mr-1`}
              />
              Templates
            </TouchButton>

            <TouchButton
              onClick={() => handleButtonPress('personalize', onPersonalize)}
              className={getButtonConfig('compact').className}
              variant="ghost"
              size="sm"
            >
              <Sparkles
                className={`${getButtonConfig('compact').iconSize} mr-1`}
              />
              Personalize
            </TouchButton>

            <TouchButton
              onClick={() => handleButtonPress('schedule', onSchedule)}
              className={getButtonConfig('compact').className}
              variant="ghost"
              size="sm"
            >
              <Clock
                className={`${getButtonConfig('compact').iconSize} mr-1`}
              />
              Schedule
            </TouchButton>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <Card className={`p-3 ${className}`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <TouchButton
              onClick={() => handleButtonPress('compose', onCompose)}
              className={getButtonConfig('compact').className}
              variant="outline"
              size="sm"
            >
              <MessageSquare className={getButtonConfig('compact').iconSize} />
            </TouchButton>

            <TouchButton
              onClick={() => handleButtonPress('templates', onTemplates)}
              className={getButtonConfig('compact').className}
              variant="outline"
              size="sm"
            >
              <Template className={getButtonConfig('compact').iconSize} />
            </TouchButton>

            <TouchButton
              onClick={() =>
                handleButtonPress('recipients', onSelectRecipients)
              }
              className={getButtonConfig('compact').className}
              variant="outline"
              size="sm"
            >
              <Users className={getButtonConfig('compact').iconSize} />
              {recipientCount > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {recipientCount}
                </Badge>
              )}
            </TouchButton>
          </div>

          <TouchButton
            onClick={() => handleButtonPress('send', onSend)}
            className={`${getButtonConfig('compact').className} bg-gradient-to-r from-pink-500 to-rose-500 text-white border-0`}
            disabled={!canSend || isSending}
            size="sm"
          >
            {isSending ? (
              <div className="animate-spin">
                <Send className={getButtonConfig('compact').iconSize} />
              </div>
            ) : (
              <>
                <Send
                  className={`${getButtonConfig('compact').iconSize} mr-1`}
                />
                Send
              </>
            )}
          </TouchButton>
        </div>
      </Card>
    );
  }

  // Full variant (default)
  return (
    <Card className={`p-6 ${className}`}>
      <div className="space-y-4">
        {/* Primary actions */}
        <div className="grid grid-cols-2 gap-3">
          <TouchButton
            onClick={() => handleButtonPress('compose', onCompose)}
            className={`${getButtonConfig('primary').className} bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0`}
            disabled={isSending}
          >
            <MessageSquare
              className={`${getButtonConfig('primary').iconSize} mr-2`}
            />
            New Message
          </TouchButton>

          <TouchButton
            onClick={() => handleButtonPress('templates', onTemplates)}
            className={`${getButtonConfig('primary').className} bg-gradient-to-r from-purple-500 to-purple-600 text-white border-0`}
            disabled={isSending}
          >
            <Template
              className={`${getButtonConfig('primary').iconSize} mr-2`}
            />
            Templates
          </TouchButton>
        </div>

        {/* Recipients selection */}
        <TouchButton
          onClick={() => handleButtonPress('recipients', onSelectRecipients)}
          className={`${getButtonConfig('secondary').className} w-full border-2 ${hasRecipients ? 'border-pink-300 bg-pink-50' : 'border-gray-300'}`}
          variant="outline"
        >
          <Users className={`${getButtonConfig('secondary').iconSize} mr-2`} />
          {hasRecipients ? (
            <span className="flex items-center gap-2">
              {recipientCount} recipient{recipientCount === 1 ? '' : 's'}{' '}
              selected
              <Badge variant="secondary">{recipientCount}</Badge>
            </span>
          ) : (
            'Select Recipients'
          )}
        </TouchButton>

        {/* Message controls */}
        {hasMessage && (
          <div className="flex gap-3">
            <TouchButton
              onClick={() => handleButtonPress('personalize', onPersonalize)}
              className={getButtonConfig('secondary').className}
              variant="outline"
              disabled={!hasRecipients}
            >
              <Sparkles
                className={`${getButtonConfig('secondary').iconSize} mr-2`}
              />
              Personalize
            </TouchButton>

            <TouchButton
              onClick={() => handleButtonPress('preview', onPreview)}
              className={getButtonConfig('secondary').className}
              variant="outline"
            >
              <Eye
                className={`${getButtonConfig('secondary').iconSize} mr-2`}
              />
              Preview
            </TouchButton>

            <TouchButton
              onClick={() => handleButtonPress('urgent', onMarkUrgent)}
              className={getButtonConfig('secondary').className}
              variant={isUrgent ? 'destructive' : 'outline'}
            >
              <AlertTriangle
                className={`${getButtonConfig('secondary').iconSize} mr-2`}
              />
              {isUrgent ? 'Urgent' : 'Mark Urgent'}
            </TouchButton>
          </div>
        )}

        {/* Send section */}
        {canSend && (
          <div className="space-y-3 pt-4 border-t">
            <div className="flex gap-3">
              <TouchButton
                onClick={() => handleButtonPress('send', onSend)}
                className={`${getButtonConfig('primary').className} flex-1 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white border-0`}
                disabled={isSending}
              >
                {isSending ? (
                  <>
                    <div className="animate-spin mr-2">
                      <Send className={getButtonConfig('primary').iconSize} />
                    </div>
                    {isOffline ? 'Queuing Message...' : 'Sending Message...'}
                  </>
                ) : (
                  <>
                    <Send
                      className={`${getButtonConfig('primary').iconSize} mr-2`}
                    />
                    {isOffline ? 'Queue Message' : 'Send Now'}
                  </>
                )}
              </TouchButton>

              <TouchButton
                onClick={() => handleButtonPress('schedule', onSchedule)}
                className={getButtonConfig('secondary').className}
                variant="outline"
                disabled={isSending}
              >
                <Clock className={getButtonConfig('secondary').iconSize} />
              </TouchButton>
            </div>

            {/* Status indicators */}
            <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
              {isOffline && (
                <div className="flex items-center gap-1 text-orange-600">
                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                  <span>Offline - will queue</span>
                </div>
              )}

              {isUrgent && (
                <div className="flex items-center gap-1 text-red-600">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Urgent message</span>
                </div>
              )}

              {soundEnabled && (
                <div className="flex items-center gap-1">
                  <Volume2 className="w-3 h-3" />
                  <span>Sound on</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
