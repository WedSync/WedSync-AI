/**
 * PWA FAQ Offline Manager
 *
 * Provides offline-first functionality for FAQ management:
 * - Service worker caching of FAQ data
 * - Offline FAQ extraction queue
 * - Background sync for pending extractions
 * - Push notifications for extraction completion
 * - App-like install prompts
 * - Offline-first architecture with sync when online
 */

import { compress, decompress } from 'lz-string';

export interface OfflineFAQData {
  faqs: FAQItem[];
  timestamp: number;
  version: string;
  offline: boolean;
  syncStatus: 'synced' | 'pending' | 'failed';
  lastSyncAttempt?: number;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category?: string;
  confidence?: number;
  isApproved?: boolean;
  isRejected?: boolean;
  lastModified: number;
  syncStatus: 'synced' | 'pending' | 'failed';
}

export interface ExtractionJob {
  id: string;
  url: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: number;
  completedAt?: number;
  retryCount: number;
  maxRetries: number;
  priority: number;
  result?: any;
  error?: string;
}

export interface PushNotificationPayload {
  type: 'extraction_complete' | 'sync_complete' | 'error';
  title: string;
  body: string;
  data?: any;
  actions?: NotificationAction[];
}

export class FAQOfflineManager {
  private static instance: FAQOfflineManager;
  private dbName = 'faq-extraction-db';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;
  private syncInProgress = false;
  private backgroundSyncRegistered = false;
  private pushSubscription: PushSubscription | null = null;

  private constructor() {
    this.initializeOfflineManager();
  }

  public static getInstance(): FAQOfflineManager {
    if (!FAQOfflineManager.instance) {
      FAQOfflineManager.instance = new FAQOfflineManager();
    }
    return FAQOfflineManager.instance;
  }

  private async initializeOfflineManager(): Promise<void> {
    try {
      // Initialize IndexedDB
      await this.initializeDatabase();

      // Register service worker
      await this.registerServiceWorker();

      // Setup background sync
      await this.setupBackgroundSync();

      // Initialize push notifications
      await this.initializePushNotifications();

      // Listen for online/offline events
      this.setupNetworkListeners();
    } catch (error) {
      console.error('Failed to initialize FAQ offline manager:', error);
    }
  }

  private async initializeDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // FAQ data store
        if (!db.objectStoreNames.contains('faqs')) {
          const faqStore = db.createObjectStore('faqs', { keyPath: 'id' });
          faqStore.createIndex('category', 'category', { unique: false });
          faqStore.createIndex('lastModified', 'lastModified', {
            unique: false,
          });
          faqStore.createIndex('syncStatus', 'syncStatus', { unique: false });
        }

        // Extraction jobs store
        if (!db.objectStoreNames.contains('extraction_jobs')) {
          const jobStore = db.createObjectStore('extraction_jobs', {
            keyPath: 'id',
          });
          jobStore.createIndex('status', 'status', { unique: false });
          jobStore.createIndex('createdAt', 'createdAt', { unique: false });
          jobStore.createIndex('priority', 'priority', { unique: false });
        }

        // Cache metadata store
        if (!db.objectStoreNames.contains('cache_metadata')) {
          db.createObjectStore('cache_metadata', { keyPath: 'key' });
        }
      };
    });
  }

  private async registerServiceWorker(): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        console.log('Service worker registered:', registration.scope);

        // Listen for service worker updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (
                newWorker.state === 'installed' &&
                navigator.serviceWorker.controller
              ) {
                // New service worker is available
                this.notifyServiceWorkerUpdate();
              }
            });
          }
        });
      } catch (error) {
        console.error('Service worker registration failed:', error);
      }
    }
  }

  private async setupBackgroundSync(): Promise<void> {
    if (
      'serviceWorker' in navigator &&
      'sync' in window.ServiceWorkerRegistration.prototype
    ) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register('faq-extraction-sync');
        this.backgroundSyncRegistered = true;
        console.log('Background sync registered');
      } catch (error) {
        console.error('Background sync registration failed:', error);
      }
    }
  }

  private async initializePushNotifications(): Promise<void> {
    if ('Notification' in window && 'serviceWorker' in navigator) {
      const permission = await Notification.requestPermission();

      if (permission === 'granted') {
        try {
          const registration = await navigator.serviceWorker.ready;
          this.pushSubscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: await this.getVapidPublicKey(),
          });

          // Send subscription to server
          await this.sendSubscriptionToServer(this.pushSubscription);
        } catch (error) {
          console.error('Push notification setup failed:', error);
        }
      }
    }
  }

  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      console.log('Connection restored, syncing pending data...');
      this.syncPendingData();
    });

    window.addEventListener('offline', () => {
      console.log('Connection lost, switching to offline mode');
    });
  }

  // Cache extracted FAQs for offline use
  async cacheExtractedFAQs(faqs: FAQItem[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['faqs'], 'readwrite');
    const store = transaction.objectStore('faqs');

    try {
      // Clear existing FAQs
      await this.clearStore(store);

      // Add new FAQs
      for (const faq of faqs) {
        const faqWithMetadata: FAQItem = {
          ...faq,
          lastModified: Date.now(),
          syncStatus: 'synced',
        };

        await this.putInStore(store, faqWithMetadata);
      }

      await this.waitForTransaction(transaction);

      // Update cache metadata
      await this.updateCacheMetadata('faqs', {
        timestamp: Date.now(),
        count: faqs.length,
        size: this.estimateDataSize(faqs),
      });

      console.log(`Cached ${faqs.length} FAQs for offline use`);
    } catch (error) {
      console.error('Failed to cache FAQs:', error);
      throw error;
    }
  }

  // Get offline FAQs
  async getOfflineFAQs(): Promise<FAQItem[] | null> {
    if (!this.db) {
      console.warn('Database not initialized');
      return null;
    }

    try {
      const transaction = this.db.transaction(['faqs'], 'readonly');
      const store = transaction.objectStore('faqs');
      const request = store.getAll();

      const result = await this.waitForRequest(request);
      return result || [];
    } catch (error) {
      console.error('Failed to get offline FAQs:', error);
      return null;
    }
  }

  // Update FAQ offline
  async updateFAQOffline(
    faqId: string,
    updates: Partial<FAQItem>,
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['faqs'], 'readwrite');
    const store = transaction.objectStore('faqs');

    try {
      const existingFAQ = await this.getFromStore(store, faqId);

      if (!existingFAQ) {
        throw new Error(`FAQ with ID ${faqId} not found`);
      }

      const updatedFAQ: FAQItem = {
        ...existingFAQ,
        ...updates,
        lastModified: Date.now(),
        syncStatus: 'pending',
      };

      await this.putInStore(store, updatedFAQ);
      await this.waitForTransaction(transaction);

      // Queue for background sync if online
      if (navigator.onLine && this.backgroundSyncRegistered) {
        await this.queueForBackgroundSync(updatedFAQ);
      }
    } catch (error) {
      console.error('Failed to update FAQ offline:', error);
      throw error;
    }
  }

  // Queue extraction job for background sync
  async queueExtractionJob(url: string, priority: number = 1): Promise<string> {
    if (!this.db) throw new Error('Database not initialized');

    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const job: ExtractionJob = {
      id: jobId,
      url,
      status: 'pending',
      createdAt: Date.now(),
      retryCount: 0,
      maxRetries: 3,
      priority,
    };

    const transaction = this.db.transaction(['extraction_jobs'], 'readwrite');
    const store = transaction.objectStore('extraction_jobs');

    try {
      await this.putInStore(store, job);
      await this.waitForTransaction(transaction);

      console.log(`Queued extraction job: ${jobId}`);

      // Process immediately if online
      if (navigator.onLine) {
        this.processExtractionJobs();
      }

      return jobId;
    } catch (error) {
      console.error('Failed to queue extraction job:', error);
      throw error;
    }
  }

  // Process queued extraction jobs
  async processExtractionJobs(): Promise<void> {
    if (!this.db || this.syncInProgress) return;

    this.syncInProgress = true;

    try {
      const jobs = await this.getPendingExtractionJobs();

      for (const job of jobs.sort((a, b) => b.priority - a.priority)) {
        try {
          await this.executeExtractionJob(job);
        } catch (error) {
          await this.handleJobFailure(job, error);
        }
      }
    } finally {
      this.syncInProgress = false;
    }
  }

  private async getPendingExtractionJobs(): Promise<ExtractionJob[]> {
    if (!this.db) return [];

    const transaction = this.db.transaction(['extraction_jobs'], 'readonly');
    const store = transaction.objectStore('extraction_jobs');
    const index = store.index('status');
    const request = index.getAll('pending');

    return (await this.waitForRequest(request)) || [];
  }

  private async executeExtractionJob(job: ExtractionJob): Promise<void> {
    // Update job status
    await this.updateJobStatus(job.id, 'processing');

    try {
      // Execute extraction (this would call your actual extraction API)
      const response = await fetch('/api/faq/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: job.url,
          mobile: true,
          priority: job.priority,
        }),
      });

      if (!response.ok) {
        throw new Error(`Extraction failed: ${response.statusText}`);
      }

      const result = await response.json();

      // Update job with result
      await this.updateJobStatus(job.id, 'completed', result);

      // Send push notification
      await this.sendPushNotification({
        type: 'extraction_complete',
        title: 'FAQ Extraction Complete',
        body: `Successfully extracted ${result.faqs?.length || 0} FAQs from ${job.url}`,
        data: { jobId: job.id, url: job.url },
      });
    } catch (error) {
      throw error;
    }
  }

  private async handleJobFailure(
    job: ExtractionJob,
    error: any,
  ): Promise<void> {
    const newRetryCount = job.retryCount + 1;

    if (newRetryCount < job.maxRetries) {
      // Retry with exponential backoff
      const delay = Math.pow(2, newRetryCount) * 1000;

      setTimeout(async () => {
        await this.updateJobRetryCount(job.id, newRetryCount);
        await this.executeExtractionJob({ ...job, retryCount: newRetryCount });
      }, delay);
    } else {
      // Mark as failed
      await this.updateJobStatus(job.id, 'failed', null, error.message);

      // Send error notification
      await this.sendPushNotification({
        type: 'error',
        title: 'FAQ Extraction Failed',
        body: `Failed to extract FAQs from ${job.url} after ${job.maxRetries} attempts`,
        data: { jobId: job.id, error: error.message },
      });
    }
  }

  // Sync pending data when back online
  async syncPendingData(): Promise<void> {
    if (!this.db || this.syncInProgress || !navigator.onLine) return;

    this.syncInProgress = true;

    try {
      // Sync pending FAQ updates
      await this.syncPendingFAQUpdates();

      // Process pending extraction jobs
      await this.processExtractionJobs();

      // Send sync complete notification
      await this.sendPushNotification({
        type: 'sync_complete',
        title: 'Sync Complete',
        body: 'All pending changes have been synchronized',
      });
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  private async syncPendingFAQUpdates(): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(['faqs'], 'readonly');
    const store = transaction.objectStore('faqs');
    const index = store.index('syncStatus');
    const request = index.getAll('pending');

    const pendingFAQs = (await this.waitForRequest(request)) || [];

    for (const faq of pendingFAQs) {
      try {
        // Send to server
        const response = await fetch('/api/faq/update', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(faq),
        });

        if (response.ok) {
          // Mark as synced
          await this.updateFAQSyncStatus(faq.id, 'synced');
        } else {
          // Mark as failed
          await this.updateFAQSyncStatus(faq.id, 'failed');
        }
      } catch (error) {
        await this.updateFAQSyncStatus(faq.id, 'failed');
      }
    }
  }

  // Utility methods for IndexedDB operations
  private async waitForRequest<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private async waitForTransaction(transaction: IDBTransaction): Promise<void> {
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  private async getFromStore<T>(
    store: IDBObjectStore,
    key: string,
  ): Promise<T> {
    const request = store.get(key);
    return await this.waitForRequest(request);
  }

  private async putInStore<T>(store: IDBObjectStore, value: T): Promise<void> {
    const request = store.put(value);
    await this.waitForRequest(request);
  }

  private async clearStore(store: IDBObjectStore): Promise<void> {
    const request = store.clear();
    await this.waitForRequest(request);
  }

  private async updateJobStatus(
    jobId: string,
    status: ExtractionJob['status'],
    result?: any,
    error?: string,
  ): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(['extraction_jobs'], 'readwrite');
    const store = transaction.objectStore('extraction_jobs');

    const job = await this.getFromStore<ExtractionJob>(store, jobId);
    if (job) {
      const updatedJob: ExtractionJob = {
        ...job,
        status,
        result,
        error,
        completedAt: status === 'completed' ? Date.now() : job.completedAt,
      };

      await this.putInStore(store, updatedJob);
    }

    await this.waitForTransaction(transaction);
  }

  private async updateJobRetryCount(
    jobId: string,
    retryCount: number,
  ): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(['extraction_jobs'], 'readwrite');
    const store = transaction.objectStore('extraction_jobs');

    const job = await this.getFromStore<ExtractionJob>(store, jobId);
    if (job) {
      job.retryCount = retryCount;
      await this.putInStore(store, job);
    }

    await this.waitForTransaction(transaction);
  }

  private async updateFAQSyncStatus(
    faqId: string,
    syncStatus: FAQItem['syncStatus'],
  ): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(['faqs'], 'readwrite');
    const store = transaction.objectStore('faqs');

    const faq = await this.getFromStore<FAQItem>(store, faqId);
    if (faq) {
      faq.syncStatus = syncStatus;
      await this.putInStore(store, faq);
    }

    await this.waitForTransaction(transaction);
  }

  private async updateCacheMetadata(key: string, metadata: any): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(['cache_metadata'], 'readwrite');
    const store = transaction.objectStore('cache_metadata');

    await this.putInStore(store, { key, ...metadata, updatedAt: Date.now() });
    await this.waitForTransaction(transaction);
  }

  private estimateDataSize(data: any): number {
    return new Blob([JSON.stringify(data)]).size;
  }

  private async queueForBackgroundSync(faq: FAQItem): Promise<void> {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register(`faq-sync-${faq.id}`);
    }
  }

  private async sendPushNotification(
    payload: PushNotificationPayload,
  ): Promise<void> {
    if (
      this.pushSubscription &&
      'Notification' in window &&
      Notification.permission === 'granted'
    ) {
      try {
        await fetch('/api/notifications/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscription: this.pushSubscription,
            payload,
          }),
        });
      } catch (error) {
        console.error('Failed to send push notification:', error);
      }
    }
  }

  private async getVapidPublicKey(): Promise<string> {
    // Replace with your actual VAPID public key
    return 'YOUR_VAPID_PUBLIC_KEY';
  }

  private async sendSubscriptionToServer(
    subscription: PushSubscription,
  ): Promise<void> {
    try {
      await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription),
      });
    } catch (error) {
      console.error('Failed to send subscription to server:', error);
    }
  }

  private notifyServiceWorkerUpdate(): void {
    // Notify user about service worker update
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('App Updated', {
        body: 'A new version of the FAQ manager is available. Reload to get the latest features.',
        icon: '/icons/icon-192x192.png',
        actions: [
          { action: 'reload', title: 'Reload Now' },
          { action: 'dismiss', title: 'Later' },
        ],
      });
    }
  }

  // Public methods
  isOnline(): boolean {
    return navigator.onLine;
  }

  async clearAllData(): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(
      ['faqs', 'extraction_jobs', 'cache_metadata'],
      'readwrite',
    );

    await Promise.all([
      this.clearStore(transaction.objectStore('faqs')),
      this.clearStore(transaction.objectStore('extraction_jobs')),
      this.clearStore(transaction.objectStore('cache_metadata')),
    ]);

    await this.waitForTransaction(transaction);
  }

  async getCacheStatus(): Promise<{
    faqs: number;
    jobs: number;
    size: number;
  }> {
    if (!this.db) return { faqs: 0, jobs: 0, size: 0 };

    const transaction = this.db.transaction(
      ['faqs', 'extraction_jobs'],
      'readonly',
    );

    const [faqs, jobs] = await Promise.all([
      this.waitForRequest(transaction.objectStore('faqs').count()),
      this.waitForRequest(transaction.objectStore('extraction_jobs').count()),
    ]);

    return {
      faqs,
      jobs,
      size: 0, // Would need to calculate actual size
    };
  }
}

// Export singleton instance
export const faqOfflineManager = FAQOfflineManager.getInstance();
