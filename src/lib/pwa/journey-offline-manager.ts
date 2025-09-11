/**
 * PWA Journey Offline Manager
 * Handles offline journey management, service worker caching, and push notifications
 * for the WedSync Journey AI system
 */

import { z } from 'zod';

// Types and schemas
const OfflineJourneySchema = z.object({
  id: z.string(),
  weddingId: z.string(),
  data: z.any(),
  status: z.enum(['pending', 'generating', 'completed', 'failed']),
  timestamp: z.number(),
  priority: z.enum(['high', 'medium', 'low']).default('medium'),
  retryCount: z.number().default(0),
  lastRetry: z.number().optional(),
  syncRequired: z.boolean().default(true),
});

const PWANotificationSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  icon: z.string(),
  badge: z.string(),
  data: z.record(z.any()),
  timestamp: z.number(),
});

type OfflineJourney = z.infer<typeof OfflineJourneySchema>;
type PWANotification = z.infer<typeof PWANotificationSchema>;

interface SyncStatus {
  isOnline: boolean;
  lastSync: number;
  pendingOperations: number;
  syncInProgress: boolean;
  nextSyncAttempt: number;
}

/**
 * PWA Journey Offline Manager
 * Provides comprehensive offline support for Journey AI system
 */
export class JourneyOfflineManager {
  private db: IDBDatabase | null = null;
  private serviceWorker: ServiceWorkerRegistration | null = null;
  private syncStatus: SyncStatus = {
    isOnline: navigator.onLine,
    lastSync: 0,
    pendingOperations: 0,
    syncInProgress: false,
    nextSyncAttempt: 0,
  };

  private readonly DB_NAME = 'WedSyncJourneyOffline';
  private readonly DB_VERSION = 1;
  private readonly STORE_NAMES = {
    journeys: 'offline_journeys',
    notifications: 'pending_notifications',
    cache: 'journey_cache',
  };

  constructor() {
    this.initializeOfflineManager();
  }

  /**
   * Initialize the offline manager
   */
  private async initializeOfflineManager(): Promise<void> {
    try {
      await this.initializeIndexedDB();
      await this.registerServiceWorker();
      this.setupNetworkListeners();
      this.startBackgroundSync();
      console.log('✅ PWA Journey Manager initialized');
    } catch (error) {
      console.error('❌ PWA Journey Manager initialization failed:', error);
    }
  }

  /**
   * Queue journey for offline generation
   */
  async queueJourneyGeneration(journeyRequest: {
    weddingId: string;
    prompt: string;
    priority?: 'high' | 'medium' | 'low';
  }): Promise<string> {
    try {
      const journeyId = `journey_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const offlineJourney: OfflineJourney = {
        id: journeyId,
        weddingId: journeyRequest.weddingId,
        data: {
          prompt: journeyRequest.prompt,
          requestedAt: Date.now(),
          type: 'generation',
        },
        status: 'pending',
        timestamp: Date.now(),
        priority: journeyRequest.priority || 'medium',
        retryCount: 0,
        syncRequired: true,
      };

      await this.storeOfflineJourney(offlineJourney);
      this.syncStatus.pendingOperations++;

      // Attempt immediate sync if online
      if (this.syncStatus.isOnline && !this.syncStatus.syncInProgress) {
        this.performBackgroundSync();
      }

      console.log(`📱 PWA: Queued journey generation ${journeyId}`);
      return journeyId;
    } catch (error) {
      console.error('❌ Failed to queue journey generation:', error);
      throw new Error('Failed to queue journey for offline generation');
    }
  }

  /**
   * Get offline journey by ID
   */
  async getOfflineJourney(journeyId: string): Promise<OfflineJourney | null> {
    try {
      if (!this.db) await this.initializeIndexedDB();

      const transaction = this.db!.transaction(
        [this.STORE_NAMES.journeys],
        'readonly',
      );
      const store = transaction.objectStore(this.STORE_NAMES.journeys);
      const request = store.get(journeyId);

      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('❌ Failed to get offline journey:', error);
      return null;
    }
  }

  /**
   * Get all pending journeys
   */
  async getPendingJourneys(): Promise<OfflineJourney[]> {
    try {
      if (!this.db) await this.initializeIndexedDB();

      const transaction = this.db!.transaction(
        [this.STORE_NAMES.journeys],
        'readonly',
      );
      const store = transaction.objectStore(this.STORE_NAMES.journeys);
      const index = store.index('status');
      const request = index.getAll('pending');

      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('❌ Failed to get pending journeys:', error);
      return [];
    }
  }

  /**
   * Update journey status
   */
  async updateJourneyStatus(
    journeyId: string,
    status: OfflineJourney['status'],
    data?: any,
  ): Promise<void> {
    try {
      const journey = await this.getOfflineJourney(journeyId);
      if (!journey) throw new Error('Journey not found');

      journey.status = status;
      journey.timestamp = Date.now();

      if (data) {
        journey.data = { ...journey.data, ...data };
      }

      await this.storeOfflineJourney(journey);

      // Send notification if completed
      if (status === 'completed') {
        await this.sendCompletionNotification(journey);
      }
    } catch (error) {
      console.error('❌ Failed to update journey status:', error);
    }
  }

  /**
   * Cache journey data
   */
  async cacheJourneyData(journeyId: string, data: any): Promise<void> {
    try {
      if (!this.db) await this.initializeIndexedDB();

      const cacheEntry = {
        id: journeyId,
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      };

      const transaction = this.db!.transaction(
        [this.STORE_NAMES.cache],
        'readwrite',
      );
      const store = transaction.objectStore(this.STORE_NAMES.cache);
      await store.put(cacheEntry);

      console.log(`💾 PWA: Cached journey data ${journeyId}`);
    } catch (error) {
      console.error('❌ Failed to cache journey data:', error);
    }
  }

  /**
   * Get cached journey data
   */
  async getCachedJourneyData(journeyId: string): Promise<any | null> {
    try {
      if (!this.db) await this.initializeIndexedDB();

      const transaction = this.db!.transaction(
        [this.STORE_NAMES.cache],
        'readonly',
      );
      const store = transaction.objectStore(this.STORE_NAMES.cache);
      const request = store.get(journeyId);

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          const result = request.result;
          if (!result) {
            resolve(null);
            return;
          }

          // Check expiration
          if (Date.now() > result.expiresAt) {
            // Remove expired entry
            const deleteTransaction = this.db!.transaction(
              [this.STORE_NAMES.cache],
              'readwrite',
            );
            deleteTransaction
              .objectStore(this.STORE_NAMES.cache)
              .delete(journeyId);
            resolve(null);
            return;
          }

          resolve(result.data);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('❌ Failed to get cached journey data:', error);
      return null;
    }
  }

  /**
   * Request push notification permissions
   */
  async requestNotificationPermission(): Promise<boolean> {
    try {
      if (!('Notification' in window)) {
        console.log('📱 Push notifications not supported');
        return false;
      }

      if (Notification.permission === 'granted') {
        return true;
      }

      if (Notification.permission === 'denied') {
        console.log('📱 Push notifications denied by user');
        return false;
      }

      const permission = await Notification.requestPermission();
      const granted = permission === 'granted';

      console.log(`📱 Push notification permission: ${permission}`);
      return granted;
    } catch (error) {
      console.error('❌ Failed to request notification permission:', error);
      return false;
    }
  }

  /**
   * Get sync status
   */
  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  /**
   * Force background sync
   */
  async forceBackgroundSync(): Promise<void> {
    if (!this.syncStatus.syncInProgress) {
      await this.performBackgroundSync();
    }
  }

  /**
   * Clear all offline data
   */
  async clearOfflineData(): Promise<void> {
    try {
      if (!this.db) return;

      const transaction = this.db.transaction(
        [
          this.STORE_NAMES.journeys,
          this.STORE_NAMES.cache,
          this.STORE_NAMES.notifications,
        ],
        'readwrite',
      );

      await Promise.all([
        transaction.objectStore(this.STORE_NAMES.journeys).clear(),
        transaction.objectStore(this.STORE_NAMES.cache).clear(),
        transaction.objectStore(this.STORE_NAMES.notifications).clear(),
      ]);

      this.syncStatus.pendingOperations = 0;
      console.log('🗑️ PWA: Cleared all offline data');
    } catch (error) {
      console.error('❌ Failed to clear offline data:', error);
    }
  }

  // Private methods

  /**
   * Initialize IndexedDB
   */
  private async initializeIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => reject(request.error);

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create journeys store
        if (!db.objectStoreNames.contains(this.STORE_NAMES.journeys)) {
          const journeyStore = db.createObjectStore(this.STORE_NAMES.journeys, {
            keyPath: 'id',
          });
          journeyStore.createIndex('status', 'status', { unique: false });
          journeyStore.createIndex('weddingId', 'weddingId', { unique: false });
          journeyStore.createIndex('priority', 'priority', { unique: false });
        }

        // Create cache store
        if (!db.objectStoreNames.contains(this.STORE_NAMES.cache)) {
          db.createObjectStore(this.STORE_NAMES.cache, { keyPath: 'id' });
        }

        // Create notifications store
        if (!db.objectStoreNames.contains(this.STORE_NAMES.notifications)) {
          const notificationStore = db.createObjectStore(
            this.STORE_NAMES.notifications,
            { keyPath: 'id' },
          );
          notificationStore.createIndex('timestamp', 'timestamp', {
            unique: false,
          });
        }
      };
    });
  }

  /**
   * Register service worker
   */
  private async registerServiceWorker(): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      console.log('📱 Service Workers not supported');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      this.serviceWorker = registration;

      // Listen for service worker messages
      navigator.serviceWorker.addEventListener(
        'message',
        this.handleServiceWorkerMessage.bind(this),
      );

      console.log('✅ PWA: Service Worker registered');
    } catch (error) {
      // GUARDIAN FIX: Use environment-aware logging for service worker errors
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ Service Worker registration failed:', error);
      }
      // In production, log to monitoring service instead
    }
  }

  /**
   * Handle service worker messages
   */
  private handleServiceWorkerMessage(event: MessageEvent): void {
    const { type, data } = event.data;

    switch (type) {
      case 'JOURNEY_GENERATION_COMPLETE':
        this.updateJourneyStatus(data.journeyId, 'completed', data.result);
        break;
      case 'JOURNEY_GENERATION_FAILED':
        this.updateJourneyStatus(data.journeyId, 'failed', data.error);
        break;
      case 'SYNC_STATUS_UPDATE':
        this.syncStatus = { ...this.syncStatus, ...data };
        break;
    }
  }

  /**
   * Setup network listeners
   */
  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      this.syncStatus.isOnline = true;
      console.log('🌐 PWA: Network connection restored');
      this.performBackgroundSync();
    });

    window.addEventListener('offline', () => {
      this.syncStatus.isOnline = false;
      console.log('📴 PWA: Network connection lost');
    });
  }

  /**
   * Start background sync
   */
  private startBackgroundSync(): void {
    // Sync every 30 seconds when online
    setInterval(() => {
      if (
        this.syncStatus.isOnline &&
        !this.syncStatus.syncInProgress &&
        this.syncStatus.pendingOperations > 0
      ) {
        this.performBackgroundSync();
      }
    }, 30000);
  }

  /**
   * Perform background sync
   */
  private async performBackgroundSync(): Promise<void> {
    if (this.syncStatus.syncInProgress) return;

    this.syncStatus.syncInProgress = true;
    this.syncStatus.lastSync = Date.now();

    try {
      const pendingJourneys = await this.getPendingJourneys();
      console.log(`🔄 PWA: Syncing ${pendingJourneys.length} pending journeys`);

      for (const journey of pendingJourneys) {
        try {
          await this.processOfflineJourney(journey);
          await this.sleep(100); // Prevent overwhelming the server
        } catch (error) {
          console.error(`❌ Failed to process journey ${journey.id}:`, error);

          // Increment retry count
          journey.retryCount++;
          journey.lastRetry = Date.now();

          if (journey.retryCount >= 3) {
            journey.status = 'failed';
            this.syncStatus.pendingOperations--;
          }

          await this.storeOfflineJourney(journey);
        }
      }
    } catch (error) {
      console.error('❌ Background sync failed:', error);
    } finally {
      this.syncStatus.syncInProgress = false;
    }
  }

  /**
   * Process individual offline journey
   */
  private async processOfflineJourney(journey: OfflineJourney): Promise<void> {
    // Update status to generating
    journey.status = 'generating';
    await this.storeOfflineJourney(journey);

    // Send to service worker for processing
    if (this.serviceWorker && this.serviceWorker.active) {
      this.serviceWorker.active.postMessage({
        type: 'PROCESS_JOURNEY_GENERATION',
        journey: journey,
      });
    }

    // For now, simulate processing (replace with actual API call)
    await this.sleep(2000);

    // Mock successful generation
    journey.status = 'completed';
    journey.data.result = {
      steps: [
        {
          id: '1',
          title: 'Book Venue',
          description: 'Find and secure your wedding venue',
          timeline: '6-8 months before',
        },
      ],
      generatedAt: Date.now(),
    };

    await this.storeOfflineJourney(journey);
    this.syncStatus.pendingOperations = Math.max(
      0,
      this.syncStatus.pendingOperations - 1,
    );

    // Send completion notification
    await this.sendCompletionNotification(journey);
  }

  /**
   * Store offline journey
   */
  private async storeOfflineJourney(journey: OfflineJourney): Promise<void> {
    if (!this.db) await this.initializeIndexedDB();

    const transaction = this.db!.transaction(
      [this.STORE_NAMES.journeys],
      'readwrite',
    );
    const store = transaction.objectStore(this.STORE_NAMES.journeys);
    await store.put(journey);
  }

  /**
   * Send completion notification
   */
  private async sendCompletionNotification(
    journey: OfflineJourney,
  ): Promise<void> {
    try {
      const hasPermission = await this.requestNotificationPermission();
      if (!hasPermission) return;

      const notification: PWANotification = {
        id: `notification_${Date.now()}`,
        title: 'Wedding Journey Ready! 🎉',
        body: 'Your AI-generated wedding planning journey is complete',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        data: {
          journeyId: journey.id,
          weddingId: journey.weddingId,
          type: 'journey_complete',
        },
        timestamp: Date.now(),
      };

      // Store notification
      if (this.db) {
        const transaction = this.db.transaction(
          [this.STORE_NAMES.notifications],
          'readwrite',
        );
        const store = transaction.objectStore(this.STORE_NAMES.notifications);
        await store.put(notification);
      }

      // Show notification
      if (this.serviceWorker) {
        this.serviceWorker.showNotification(notification.title, {
          body: notification.body,
          icon: notification.icon,
          badge: notification.badge,
          data: notification.data,
          requireInteraction: true,
          actions: [
            {
              action: 'view',
              title: 'View Journey',
            },
            {
              action: 'dismiss',
              title: 'Dismiss',
            },
          ],
        });
      } else {
        new Notification(notification.title, {
          body: notification.body,
          icon: notification.icon,
          data: notification.data,
        });
      }

      console.log(
        `📱 PWA: Sent completion notification for journey ${journey.id}`,
      );
    } catch (error) {
      console.error('❌ Failed to send completion notification:', error);
    }
  }

  /**
   * Utility sleep function
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const journeyOfflineManager = new JourneyOfflineManager();

// Export types
export type { OfflineJourney, PWANotification, SyncStatus };
