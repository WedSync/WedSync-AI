'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TouchButton } from '@/components/touch/TouchButton';
import {
  Wifi,
  WifiOff,
  Send,
  Clock,
  AlertTriangle,
  X,
  RefreshCw,
  Upload,
} from 'lucide-react';

interface QueuedMessage {
  id: string;
  message: string;
  recipientIds: string[];
  channel: 'sms' | 'email' | 'push' | 'whatsapp';
  isUrgent?: boolean;
  createdAt: Date;
  retryCount: number;
  lastAttempt?: Date;
  error?: string;
}

interface OfflineMessageContextType {
  isOnline: boolean;
  queuedMessages: QueuedMessage[];
  addToQueue: (
    message: Omit<QueuedMessage, 'id' | 'createdAt' | 'retryCount'>,
  ) => void;
  removeFromQueue: (messageId: string) => void;
  retryMessage: (messageId: string) => void;
  clearQueue: () => void;
  sendQueuedMessages: () => Promise<void>;
}

const OfflineMessageContext = createContext<
  OfflineMessageContextType | undefined
>(undefined);

interface OfflineMessageProviderProps {
  children: React.ReactNode;
  onSendMessage?: (message: QueuedMessage) => Promise<boolean>;
}

export function OfflineMessageProvider({
  children,
  onSendMessage,
}: OfflineMessageProviderProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queuedMessages, setQueuedMessages] = useState<QueuedMessage[]>([]);
  const [isSending, setIsSending] = useState(false);

  // Load queued messages from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('offline-message-queue');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const messages = parsed.map((msg: any) => ({
          ...msg,
          createdAt: new Date(msg.createdAt),
          lastAttempt: msg.lastAttempt ? new Date(msg.lastAttempt) : undefined,
        }));
        setQueuedMessages(messages);
      } catch (error) {
        console.error('Failed to parse offline message queue:', error);
      }
    }
  }, []);

  // Save to localStorage whenever queue changes
  useEffect(() => {
    localStorage.setItem(
      'offline-message-queue',
      JSON.stringify(queuedMessages),
    );
  }, [queuedMessages]);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Auto-send queued messages when coming back online
      setTimeout(() => {
        sendQueuedMessages();
      }, 1000); // Brief delay to ensure connection is stable
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const addToQueue = useCallback(
    (messageData: Omit<QueuedMessage, 'id' | 'createdAt' | 'retryCount'>) => {
      const newMessage: QueuedMessage = {
        ...messageData,
        id: `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date(),
        retryCount: 0,
      };

      setQueuedMessages((prev) => [...prev, newMessage]);

      // Show toast notification
      Toast({
        title: 'Message Queued',
        description: "Your message will be sent when you're back online",
        duration: 3000,
      });

      return newMessage.id;
    },
    [],
  );

  const removeFromQueue = useCallback((messageId: string) => {
    setQueuedMessages((prev) => prev.filter((msg) => msg.id !== messageId));
  }, []);

  const retryMessage = useCallback(
    async (messageId: string) => {
      const message = queuedMessages.find((msg) => msg.id === messageId);
      if (!message || !onSendMessage) return;

      try {
        setQueuedMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId
              ? { ...msg, lastAttempt: new Date(), error: undefined }
              : msg,
          ),
        );

        const success = await onSendMessage(message);

        if (success) {
          removeFromQueue(messageId);
          Toast({
            title: 'Message Sent',
            description: 'Your queued message has been delivered',
            duration: 3000,
          });
        } else {
          setQueuedMessages((prev) =>
            prev.map((msg) =>
              msg.id === messageId
                ? {
                    ...msg,
                    retryCount: msg.retryCount + 1,
                    error: 'Failed to send message',
                  }
                : msg,
            ),
          );
        }
      } catch (error) {
        setQueuedMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId
              ? {
                  ...msg,
                  retryCount: msg.retryCount + 1,
                  error:
                    error instanceof Error ? error.message : 'Unknown error',
                }
              : msg,
          ),
        );
      }
    },
    [queuedMessages, onSendMessage, removeFromQueue],
  );

  const sendQueuedMessages = useCallback(async () => {
    if (!isOnline || queuedMessages.length === 0 || !onSendMessage || isSending)
      return;

    setIsSending(true);

    try {
      const results = await Promise.allSettled(
        queuedMessages.map(async (message) => {
          try {
            const success = await onSendMessage(message);
            return { messageId: message.id, success };
          } catch (error) {
            return { messageId: message.id, success: false, error };
          }
        }),
      );

      let sentCount = 0;
      let failedCount = 0;

      results.forEach((result, index) => {
        const message = queuedMessages[index];

        if (result.status === 'fulfilled' && result.value.success) {
          removeFromQueue(message.id);
          sentCount++;
        } else {
          failedCount++;
          setQueuedMessages((prev) =>
            prev.map((msg) =>
              msg.id === message.id
                ? {
                    ...msg,
                    retryCount: msg.retryCount + 1,
                    lastAttempt: new Date(),
                    error:
                      result.status === 'fulfilled'
                        ? 'Failed to send'
                        : result.reason?.message || 'Unknown error',
                  }
                : msg,
            ),
          );
        }
      });

      if (sentCount > 0) {
        Toast({
          title: 'Messages Sent',
          description: `${sentCount} queued message${sentCount === 1 ? '' : 's'} sent successfully`,
          duration: 4000,
        });
      }

      if (failedCount > 0) {
        Toast({
          title: 'Some Messages Failed',
          description: `${failedCount} message${failedCount === 1 ? '' : 's'} could not be sent`,
          duration: 5000,
        });
      }
    } finally {
      setIsSending(false);
    }
  }, [isOnline, queuedMessages, onSendMessage, isSending, removeFromQueue]);

  const clearQueue = useCallback(() => {
    setQueuedMessages([]);
    Toast({
      title: 'Queue Cleared',
      description: 'All queued messages have been removed',
      duration: 3000,
    });
  }, []);

  return (
    <OfflineMessageContext.Provider
      value={{
        isOnline,
        queuedMessages,
        addToQueue,
        removeFromQueue,
        retryMessage,
        clearQueue,
        sendQueuedMessages,
      }}
    >
      {children}
      <OfflineMessageQueueUI />
    </OfflineMessageContext.Provider>
  );
}

export function useOfflineMessageQueue() {
  const context = useContext(OfflineMessageContext);
  if (!context) {
    throw new Error(
      'useOfflineMessageQueue must be used within OfflineMessageProvider',
    );
  }
  return context;
}

// UI Component for displaying queue status
function OfflineMessageQueueUI() {
  const {
    isOnline,
    queuedMessages,
    removeFromQueue,
    retryMessage,
    clearQueue,
    sendQueuedMessages,
  } = useOfflineMessageQueue();

  const [showQueue, setShowQueue] = useState(false);

  // Auto-show queue when messages are added while offline
  useEffect(() => {
    if (!isOnline && queuedMessages.length > 0) {
      setShowQueue(true);
    }
  }, [isOnline, queuedMessages.length]);

  // Auto-hide queue when all messages are sent
  useEffect(() => {
    if (queuedMessages.length === 0 && showQueue) {
      setTimeout(() => setShowQueue(false), 2000);
    }
  }, [queuedMessages.length, showQueue]);

  if (queuedMessages.length === 0) return null;

  return (
    <>
      {/* Floating Queue Indicator */}
      <div className="fixed bottom-4 right-4 z-50 md:bottom-6 md:right-6">
        <TouchButton
          onClick={() => setShowQueue(!showQueue)}
          className="h-12 px-4 shadow-lg"
          variant={isOnline ? 'default' : 'outline'}
        >
          {isOnline ? (
            <Wifi className="w-4 h-4 mr-2" />
          ) : (
            <WifiOff className="w-4 h-4 mr-2" />
          )}
          <span className="mr-2">{queuedMessages.length}</span>
          <Badge
            variant={isOnline ? 'secondary' : 'destructive'}
            className="text-xs"
          >
            {isOnline ? 'Ready' : 'Offline'}
          </Badge>
        </TouchButton>
      </div>

      {/* Queue Details Modal */}
      {showQueue && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center">
          <Card className="w-full max-h-[80vh] md:w-96 rounded-t-xl md:rounded-lg flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 className="font-semibold">Queued Messages</h3>
                <p className="text-sm text-muted-foreground">
                  {queuedMessages.length} message
                  {queuedMessages.length === 1 ? '' : 's'} waiting
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isOnline ? (
                  <Badge variant="default" className="gap-1">
                    <Wifi className="w-3 h-3" />
                    Online
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="gap-1">
                    <WifiOff className="w-3 h-3" />
                    Offline
                  </Badge>
                )}
                <TouchButton
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowQueue(false)}
                  className="h-8 w-8 p-0"
                >
                  <X className="w-4 h-4" />
                </TouchButton>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {queuedMessages.map((message) => (
                <Card key={message.id} className="p-3 bg-muted/50">
                  <div className="flex items-start gap-2 mb-2">
                    <Clock className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm line-clamp-2 mb-1">
                        {message.message}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{message.recipientIds.length} recipients</span>
                        <span>•</span>
                        <span>{message.channel.toUpperCase()}</span>
                        {message.isUrgent && (
                          <>
                            <span>•</span>
                            <Badge variant="destructive" className="text-xs">
                              Urgent
                            </Badge>
                          </>
                        )}
                      </div>
                      {message.error && (
                        <p className="text-xs text-red-600 mt-1">
                          {message.error}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-1">
                    <TouchButton
                      size="sm"
                      variant="outline"
                      onClick={() => retryMessage(message.id)}
                      disabled={!isOnline}
                      className="flex-1 text-xs h-7"
                    >
                      <Send className="w-3 h-3 mr-1" />
                      {isOnline ? 'Send Now' : 'Send Later'}
                    </TouchButton>
                    <TouchButton
                      size="sm"
                      variant="ghost"
                      onClick={() => removeFromQueue(message.id)}
                      className="h-7 w-7 p-0"
                    >
                      <X className="w-3 h-3" />
                    </TouchButton>
                  </div>
                </Card>
              ))}
            </div>

            {/* Actions */}
            <div className="p-4 border-t space-y-2">
              {isOnline && (
                <TouchButton onClick={sendQueuedMessages} className="w-full">
                  <Upload className="w-4 h-4 mr-2" />
                  Send All Messages
                </TouchButton>
              )}
              <TouchButton
                variant="outline"
                onClick={clearQueue}
                className="w-full"
              >
                Clear Queue
              </TouchButton>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
