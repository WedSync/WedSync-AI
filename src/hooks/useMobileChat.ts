/**
 * WS-243 Mobile Chat Hook
 * Team D - Mobile Chat State Management
 *
 * CORE FEATURES:
 * - Mobile chat state management with offline support
 * - Wedding context integration and role-based behavior
 * - Message queuing and synchronization
 * - Haptic feedback and accessibility features
 * - Performance optimization for mobile devices
 *
 * @version 1.0.0
 * @author WedSync Team D - Mobile Chat Integration
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { WeddingContext } from '@/components/mobile/chatbot/MobileChatInterface';

/**
 * Touch target size options
 */
export type TouchTargetSize = 'small' | 'medium' | 'large' | 'auto';

/**
 * Haptic feedback types
 */
export type HapticType =
  | 'selection'
  | 'notification'
  | 'impact'
  | 'error'
  | 'success';

/**
 * Chat message for queueing
 */
interface QueuedMessage {
  id: string;
  content: string;
  timestamp: Date;
  weddingContext?: WeddingContext;
  userRole?: string;
  retryCount: number;
}

/**
 * Mobile chat hook props
 */
interface UseMobileChatProps {
  conversationId?: string;
  weddingContext?: WeddingContext;
  userRole?: string;
  enableHaptics?: boolean;
  offlineMode?: boolean;
  maxRetries?: number;
}

/**
 * Mobile chat hook return type
 */
interface UseMobileChatReturn {
  // Connection state
  isOnline: boolean;
  isConnecting: boolean;
  lastSyncTime: Date | null;

  // Message handling
  sendMessage: (message: string, context?: WeddingContext) => Promise<void>;
  queuedMessages: QueuedMessage[];
  syncPendingMessages: () => Promise<void>;
  clearMessageQueue: () => void;

  // Haptic feedback
  hapticFeedback: (type: HapticType) => void;

  // Accessibility
  screenReaderAnnounce: (message: string) => void;

  // Performance
  isLowPowerMode: boolean;
  networkQuality: 'fast' | 'slow' | 'offline';

  // Storage management
  clearChatCache: () => Promise<void>;
  getCachedMessages: (limit?: number) => Promise<any[]>;
}

/**
 * Mobile Chat Hook
 */
export function useMobileChat({
  conversationId,
  weddingContext,
  userRole,
  enableHaptics = true,
  offlineMode = true,
  maxRetries = 3,
}: UseMobileChatProps): UseMobileChatReturn {
  // Connection state
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isConnecting, setIsConnecting] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Message queue state
  const [queuedMessages, setQueuedMessages] = useState<QueuedMessage[]>([]);

  // Performance state
  const [isLowPowerMode, setIsLowPowerMode] = useState(false);
  const [networkQuality, setNetworkQuality] = useState<
    'fast' | 'slow' | 'offline'
  >('fast');

  // Refs
  const syncInProgressRef = useRef(false);
  const retryTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Initialize offline storage
  const initializeStorage = useCallback(async () => {
    if (!('indexedDB' in window)) return;

    try {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('wedsync_mobile_chat', 1);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;

          // Messages store
          if (!db.objectStoreNames.contains('messages')) {
            const messageStore = db.createObjectStore('messages', {
              keyPath: 'id',
            });
            messageStore.createIndex('conversationId', 'conversationId', {
              unique: false,
            });
            messageStore.createIndex('timestamp', 'timestamp', {
              unique: false,
            });
          }

          // Queue store
          if (!db.objectStoreNames.contains('messageQueue')) {
            db.createObjectStore('messageQueue', { keyPath: 'id' });
          }
        };
      });

      return db;
    } catch (error) {
      console.error('Failed to initialize chat storage:', error);
      return null;
    }
  }, []);

  // Haptic feedback implementation
  const hapticFeedback = useCallback(
    (type: HapticType) => {
      if (!enableHaptics || !('vibrate' in navigator)) return;

      const patterns = {
        selection: [10],
        notification: [20, 10, 20],
        impact: [30],
        error: [100, 50, 100],
        success: [20, 10, 20, 10, 20],
      };

      navigator.vibrate(patterns[type] || patterns.selection);
    },
    [enableHaptics],
  );

  // Screen reader announcements
  const screenReaderAnnounce = useCallback((message: string) => {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;

    document.body.appendChild(announcement);

    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }, []);

  // Queue message for offline sending
  const queueMessage = useCallback(
    async (message: string, context?: WeddingContext): Promise<string> => {
      const messageId = `queued_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const queuedMessage: QueuedMessage = {
        id: messageId,
        content: message,
        timestamp: new Date(),
        weddingContext: context,
        userRole,
        retryCount: 0,
      };

      // Add to state queue
      setQueuedMessages((prev) => [...prev, queuedMessage]);

      // Store in IndexedDB
      if (offlineMode) {
        try {
          const db = await initializeStorage();
          if (db) {
            const transaction = db.transaction(['messageQueue'], 'readwrite');
            const store = transaction.objectStore('messageQueue');
            await store.add(queuedMessage);
          }
        } catch (error) {
          console.error('Failed to queue message in storage:', error);
        }
      }

      return messageId;
    },
    [userRole, offlineMode, initializeStorage],
  );

  // Send message (online or queue for offline)
  const sendMessage = useCallback(
    async (message: string, context?: WeddingContext): Promise<void> => {
      const messageContext = context || weddingContext;

      if (!isOnline && offlineMode) {
        await queueMessage(message, messageContext);
        screenReaderAnnounce("Message queued for when you're back online");
        return;
      }

      if (!isOnline) {
        throw new Error('Cannot send message while offline');
      }

      setIsConnecting(true);

      try {
        const response = await fetch('/api/chat/mobile', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message,
            conversationId,
            weddingContext: messageContext,
            userRole,
            timestamp: new Date().toISOString(),
            deviceInfo: {
              userAgent: navigator.userAgent,
              screenWidth: window.screen.width,
              screenHeight: window.screen.height,
              pixelRatio: window.devicePixelRatio,
            },
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to send message: ${response.statusText}`);
        }

        const result = await response.json();

        // Store message in IndexedDB for offline access
        if (offlineMode) {
          try {
            const db = await initializeStorage();
            if (db) {
              const transaction = db.transaction(['messages'], 'readwrite');
              const store = transaction.objectStore('messages');
              await store.add({
                id: result.messageId || Date.now().toString(),
                conversationId,
                content: message,
                timestamp: new Date(),
                isBot: false,
                weddingContext: messageContext,
              });
            }
          } catch (error) {
            console.error('Failed to store message:', error);
          }
        }

        hapticFeedback('success');
      } catch (error) {
        console.error('Failed to send message:', error);

        // Queue message if send fails and offline mode is enabled
        if (offlineMode) {
          await queueMessage(message, messageContext);
          screenReaderAnnounce('Message queued due to connection error');
        }

        hapticFeedback('error');
        throw error;
      } finally {
        setIsConnecting(false);
      }
    },
    [
      isOnline,
      offlineMode,
      weddingContext,
      conversationId,
      userRole,
      queueMessage,
      screenReaderAnnounce,
      hapticFeedback,
      initializeStorage,
    ],
  );

  // Sync pending messages when back online
  const syncPendingMessages = useCallback(async (): Promise<void> => {
    if (syncInProgressRef.current || !isOnline || queuedMessages.length === 0) {
      return;
    }

    syncInProgressRef.current = true;
    setIsConnecting(true);

    try {
      const messagesToSync = [...queuedMessages];
      const syncPromises = messagesToSync.map(async (queuedMessage) => {
        try {
          const response = await fetch('/api/chat/mobile/sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message: queuedMessage.content,
              conversationId,
              weddingContext: queuedMessage.weddingContext,
              userRole: queuedMessage.userRole,
              originalTimestamp: queuedMessage.timestamp.toISOString(),
              queuedMessageId: queuedMessage.id,
            }),
          });

          if (response.ok) {
            // Remove from queue on successful sync
            setQueuedMessages((prev) =>
              prev.filter((msg) => msg.id !== queuedMessage.id),
            );

            // Remove from IndexedDB
            if (offlineMode) {
              const db = await initializeStorage();
              if (db) {
                const transaction = db.transaction(
                  ['messageQueue'],
                  'readwrite',
                );
                const store = transaction.objectStore('messageQueue');
                await store.delete(queuedMessage.id);
              }
            }

            return { success: true, messageId: queuedMessage.id };
          } else {
            // Increment retry count
            const updatedMessage = {
              ...queuedMessage,
              retryCount: queuedMessage.retryCount + 1,
            };

            if (updatedMessage.retryCount < maxRetries) {
              setQueuedMessages((prev) =>
                prev.map((msg) =>
                  msg.id === queuedMessage.id ? updatedMessage : msg,
                ),
              );

              // Schedule retry
              const retryTimeout = setTimeout(
                () => {
                  syncPendingMessages();
                },
                Math.pow(2, updatedMessage.retryCount) * 1000,
              ); // Exponential backoff

              retryTimeoutsRef.current.set(queuedMessage.id, retryTimeout);
            } else {
              // Max retries reached, remove from queue
              setQueuedMessages((prev) =>
                prev.filter((msg) => msg.id !== queuedMessage.id),
              );
              console.error(
                `Failed to sync message after ${maxRetries} retries:`,
                queuedMessage,
              );
            }

            return {
              success: false,
              messageId: queuedMessage.id,
              error: response.statusText,
            };
          }
        } catch (error) {
          console.error('Failed to sync message:', queuedMessage.id, error);
          return {
            success: false,
            messageId: queuedMessage.id,
            error: String(error),
          };
        }
      });

      const results = await Promise.all(syncPromises);
      const successCount = results.filter((r) => r.success).length;

      if (successCount > 0) {
        setLastSyncTime(new Date());
        screenReaderAnnounce(
          `${successCount} message${successCount !== 1 ? 's' : ''} synced`,
        );
        hapticFeedback('success');
      }
    } catch (error) {
      console.error('Failed to sync pending messages:', error);
      hapticFeedback('error');
    } finally {
      syncInProgressRef.current = false;
      setIsConnecting(false);
    }
  }, [
    isOnline,
    queuedMessages,
    conversationId,
    maxRetries,
    offlineMode,
    initializeStorage,
    screenReaderAnnounce,
    hapticFeedback,
  ]);

  // Clear message queue
  const clearMessageQueue = useCallback(() => {
    setQueuedMessages([]);

    // Clear retry timeouts
    retryTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
    retryTimeoutsRef.current.clear();

    // Clear from IndexedDB
    if (offlineMode) {
      initializeStorage().then((db) => {
        if (db) {
          const transaction = db.transaction(['messageQueue'], 'readwrite');
          const store = transaction.objectStore('messageQueue');
          store.clear();
        }
      });
    }
  }, [offlineMode, initializeStorage]);

  // Get cached messages
  const getCachedMessages = useCallback(
    async (limit = 50): Promise<any[]> => {
      if (!offlineMode) return [];

      try {
        const db = await initializeStorage();
        if (!db) return [];

        return new Promise((resolve, reject) => {
          const transaction = db.transaction(['messages'], 'readonly');
          const store = transaction.objectStore('messages');
          const index = store.index('conversationId');
          const request = index.getAll(conversationId);

          request.onsuccess = () => {
            const messages = request.result
              .sort(
                (a, b) =>
                  new Date(b.timestamp).getTime() -
                  new Date(a.timestamp).getTime(),
              )
              .slice(0, limit);
            resolve(messages);
          };

          request.onerror = () => reject(request.error);
        });
      } catch (error) {
        console.error('Failed to get cached messages:', error);
        return [];
      }
    },
    [offlineMode, conversationId, initializeStorage],
  );

  // Clear chat cache
  const clearChatCache = useCallback(async (): Promise<void> => {
    if (!offlineMode) return;

    try {
      const db = await initializeStorage();
      if (db) {
        const transaction = db.transaction(
          ['messages', 'messageQueue'],
          'readwrite',
        );
        const messageStore = transaction.objectStore('messages');
        const queueStore = transaction.objectStore('messageQueue');

        await Promise.all([messageStore.clear(), queueStore.clear()]);

        screenReaderAnnounce('Chat cache cleared');
      }
    } catch (error) {
      console.error('Failed to clear chat cache:', error);
    }
  }, [offlineMode, initializeStorage, screenReaderAnnounce]);

  // Detect network quality
  const detectNetworkQuality = useCallback(() => {
    if (!isOnline) {
      setNetworkQuality('offline');
      return;
    }

    const connection = (navigator as any).connection;
    if (connection) {
      const effectiveType = connection.effectiveType;
      if (effectiveType === 'slow-2g' || effectiveType === '2g') {
        setNetworkQuality('slow');
      } else if (effectiveType === '3g' || effectiveType === '4g') {
        setNetworkQuality('fast');
      }
    } else {
      // Fallback: assume fast connection
      setNetworkQuality('fast');
    }
  }, [isOnline]);

  // Detect low power mode (iOS Safari)
  const detectLowPowerMode = useCallback(() => {
    // iOS Safari reduces animation frame rate in low power mode
    let frameCount = 0;
    const startTime = performance.now();

    const countFrames = () => {
      frameCount++;
      if (frameCount < 10) {
        requestAnimationFrame(countFrames);
      } else {
        const endTime = performance.now();
        const fps = (frameCount * 1000) / (endTime - startTime);
        setIsLowPowerMode(fps < 30);
      }
    };

    requestAnimationFrame(countFrames);
  }, []);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      detectNetworkQuality();
      // Auto-sync when coming back online
      setTimeout(syncPendingMessages, 1000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setNetworkQuality('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncPendingMessages, detectNetworkQuality]);

  // Initialize hook
  useEffect(() => {
    detectNetworkQuality();
    detectLowPowerMode();
    initializeStorage();
  }, [detectNetworkQuality, detectLowPowerMode, initializeStorage]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      retryTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
      retryTimeoutsRef.current.clear();
    };
  }, []);

  return {
    // Connection state
    isOnline,
    isConnecting,
    lastSyncTime,

    // Message handling
    sendMessage,
    queuedMessages,
    syncPendingMessages,
    clearMessageQueue,

    // Haptic feedback
    hapticFeedback,

    // Accessibility
    screenReaderAnnounce,

    // Performance
    isLowPowerMode,
    networkQuality,

    // Storage management
    clearChatCache,
    getCachedMessages,
  };
}

export default useMobileChat;
