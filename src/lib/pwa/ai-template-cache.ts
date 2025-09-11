// PWA AI Template Cache Service
// Handles offline caching, background sync, and progressive enhancement for AI email templates

import {
  MobileEmailTemplate,
  ClientContext,
} from '@/lib/mobile/ai-email-optimization';

export interface CachedTemplateData {
  templates: MobileEmailTemplate[];
  timestamp: number;
  clientContext: ClientContext;
  offline: boolean;
  version: string;
}

export interface BackgroundSyncRequest {
  id: string;
  type: 'generate_templates' | 'update_template' | 'send_email';
  data: any;
  timestamp: number;
  retryCount: number;
}

export interface PWAPerformanceMetrics {
  cacheHitRate: number;
  averageResponseTime: number;
  offlineUsageTime: number;
  backgroundSyncSuccess: number;
  storageUsed: number;
  maxStorage: number;
}

// IndexedDB wrapper for complex AI template data
class AITemplateDB {
  private dbName = 'wedsync-ai-templates';
  private version = 1;
  private db: IDBDatabase | null = null;

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Templates store
        if (!db.objectStoreNames.contains('templates')) {
          const templateStore = db.createObjectStore('templates', {
            keyPath: 'cacheKey',
          });
          templateStore.createIndex('timestamp', 'timestamp', {
            unique: false,
          });
          templateStore.createIndex('clientName', 'clientContext.name', {
            unique: false,
          });
        }

        // Background sync queue
        if (!db.objectStoreNames.contains('syncQueue')) {
          const syncStore = db.createObjectStore('syncQueue', {
            keyPath: 'id',
          });
          syncStore.createIndex('type', 'type', { unique: false });
          syncStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Performance metrics
        if (!db.objectStoreNames.contains('metrics')) {
          db.createObjectStore('metrics', { keyPath: 'date' });
        }
      };
    });
  }

  async storeTemplates(
    cacheKey: string,
    data: CachedTemplateData,
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['templates'], 'readwrite');
    const store = transaction.objectStore('templates');

    return new Promise((resolve, reject) => {
      const request = store.put({ cacheKey, ...data });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getTemplates(cacheKey: string): Promise<CachedTemplateData | null> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['templates'], 'readonly');
    const store = transaction.objectStore('templates');

    return new Promise((resolve, reject) => {
      const request = store.get(cacheKey);
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? { ...result } : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async clearOldTemplates(
    maxAge: number = 7 * 24 * 60 * 60 * 1000,
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['templates'], 'readwrite');
    const store = transaction.objectStore('templates');
    const index = store.index('timestamp');
    const cutoff = Date.now() - maxAge;

    const request = index.openCursor(IDBKeyRange.upperBound(cutoff));

    return new Promise((resolve, reject) => {
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async addToSyncQueue(item: BackgroundSyncRequest): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['syncQueue'], 'readwrite');
    const store = transaction.objectStore('syncQueue');

    return new Promise((resolve, reject) => {
      const request = store.put(item);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getSyncQueue(): Promise<BackgroundSyncRequest[]> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['syncQueue'], 'readonly');
    const store = transaction.objectStore('syncQueue');

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async removeFromSyncQueue(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['syncQueue'], 'readwrite');
    const store = transaction.objectStore('syncQueue');

    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

// Main PWA AI Template Cache Class
export class AITemplatePWACache {
  private db: AITemplateDB;
  private cacheName = 'ai-templates-v2';
  private maxCacheSize = 100 * 1024 * 1024; // 100MB limit
  private metrics: PWAPerformanceMetrics = {
    cacheHitRate: 0,
    averageResponseTime: 0,
    offlineUsageTime: 0,
    backgroundSyncSuccess: 0,
    storageUsed: 0,
    maxStorage: this.maxCacheSize,
  };

  constructor() {
    this.db = new AITemplateDB();
    this.initializePWA();
  }

  // Initialize PWA features
  private async initializePWA(): Promise<void> {
    try {
      await this.db.initialize();
      await this.registerServiceWorker();
      this.setupBackgroundSync();
      this.setupPeriodicSync();
      this.startMetricsCollection();
    } catch (error) {
      console.error('PWA initialization failed:', error);
    }
  }

  // Register Service Worker for caching
  private async registerServiceWorker(): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register(
          '/sw-ai-templates.js',
          {
            scope: '/ai-templates/',
          },
        );

        registration.addEventListener('updatefound', () => {
          console.log('New service worker version available');
        });

        // Handle service worker messages
        navigator.serviceWorker.addEventListener(
          'message',
          this.handleServiceWorkerMessage.bind(this),
        );
      } catch (error) {
        console.error('Service worker registration failed:', error);
      }
    }
  }

  // Handle messages from Service Worker
  private handleServiceWorkerMessage(event: MessageEvent): void {
    const { type, data } = event.data;

    switch (type) {
      case 'TEMPLATE_CACHED':
        console.log('Template cached successfully:', data);
        break;
      case 'CACHE_ERROR':
        console.error('Cache operation failed:', data);
        break;
      case 'BACKGROUND_SYNC_SUCCESS':
        this.metrics.backgroundSyncSuccess++;
        break;
    }
  }

  // Cache generated AI templates with encryption
  async cacheGeneratedTemplates(
    templates: MobileEmailTemplate[],
    clientContext: ClientContext,
    cacheKey?: string,
  ): Promise<void> {
    const startTime = Date.now();

    try {
      const key = cacheKey || this.generateCacheKey(clientContext);

      // Encrypt sensitive data before caching
      const encryptedData = await this.encryptTemplateData({
        templates,
        timestamp: Date.now(),
        clientContext: this.sanitizeClientContext(clientContext),
        offline: !navigator.onLine,
        version: '2.0.0',
      });

      // Store in IndexedDB
      await this.db.storeTemplates(key, encryptedData);

      // Also cache in Service Worker for network requests
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'CACHE_TEMPLATES',
          data: { key, templates: encryptedData },
        });
      }

      // Update metrics
      const responseTime = Date.now() - startTime;
      this.updateMetrics({ responseTime });

      console.log(
        `Cached ${templates.length} templates for ${clientContext.name}`,
      );
    } catch (error) {
      console.error('Failed to cache templates:', error);
      throw error;
    }
  }

  // Retrieve cached templates with decryption
  async getCachedTemplates(
    clientContext: ClientContext,
    cacheKey?: string,
  ): Promise<MobileEmailTemplate[] | null> {
    const startTime = Date.now();

    try {
      const key = cacheKey || this.generateCacheKey(clientContext);
      const cachedData = await this.db.getTemplates(key);

      if (!cachedData) {
        return null;
      }

      // Check if cache is still valid (24 hours)
      const cacheAge = Date.now() - cachedData.timestamp;
      if (cacheAge > 24 * 60 * 60 * 1000) {
        return null;
      }

      // Decrypt template data
      const decryptedData = await this.decryptTemplateData(cachedData);

      // Update cache hit metrics
      const responseTime = Date.now() - startTime;
      this.updateMetrics({ responseTime, cacheHit: true });

      return decryptedData.templates;
    } catch (error) {
      console.error('Failed to retrieve cached templates:', error);
      return null;
    }
  }

  // Get offline templates for emergency use
  async getOfflineTemplates(
    inquiryType?: string,
  ): Promise<MobileEmailTemplate[]> {
    try {
      // Get all cached templates
      const allCached = await this.getAllCachedTemplates();

      if (inquiryType) {
        return allCached.filter((template) => template.stage === inquiryType);
      }

      return allCached.slice(0, 10); // Return most recent 10
    } catch (error) {
      console.error('Failed to get offline templates:', error);
      return this.getFallbackTemplates();
    }
  }

  // Background sync for pending AI requests
  async queueForBackgroundSync(
    type: BackgroundSyncRequest['type'],
    data: any,
  ): Promise<void> {
    const syncRequest: BackgroundSyncRequest = {
      id: `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      timestamp: Date.now(),
      retryCount: 0,
    };

    await this.db.addToSyncQueue(syncRequest);

    // Trigger background sync if available
    if (
      'serviceWorker' in navigator &&
      'sync' in window.ServiceWorkerRegistration.prototype
    ) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register('ai-templates-sync');
      } catch (error) {
        console.warn('Background sync registration failed:', error);
      }
    }
  }

  // Process background sync queue
  async processSyncQueue(): Promise<void> {
    const queue = await this.db.getSyncQueue();

    for (const item of queue) {
      try {
        await this.processSyncItem(item);
        await this.db.removeFromSyncQueue(item.id);
        this.metrics.backgroundSyncSuccess++;
      } catch (error) {
        console.error('Failed to process sync item:', error);

        // Retry logic
        if (item.retryCount < 3) {
          item.retryCount++;
          await this.db.addToSyncQueue(item);
        } else {
          // Remove failed item after 3 retries
          await this.db.removeFromSyncQueue(item.id);
        }
      }
    }
  }

  // Setup periodic background sync
  private setupBackgroundSync(): void {
    // Listen for online events to process sync queue
    window.addEventListener('online', () => {
      this.processSyncQueue();
    });

    // Process queue periodically when online
    setInterval(
      () => {
        if (navigator.onLine) {
          this.processSyncQueue();
        }
      },
      5 * 60 * 1000,
    ); // Every 5 minutes
  }

  // Setup periodic cleanup and maintenance
  private setupPeriodicSync(): void {
    // Clean old templates daily
    setInterval(
      async () => {
        await this.db.clearOldTemplates();
        await this.optimizeStorage();
      },
      24 * 60 * 60 * 1000,
    ); // Daily
  }

  // Generate cache key for client context
  private generateCacheKey(context: ClientContext): string {
    const keyData = {
      name: context.name.toLowerCase(),
      inquiryType: context.inquiryType,
      urgency: context.urgency,
      date: new Date().toDateString(), // Group by day
    };

    return btoa(JSON.stringify(keyData)).replace(/[^a-zA-Z0-9]/g, '');
  }

  // Encrypt template data using Web Crypto API
  private async encryptTemplateData(
    data: CachedTemplateData,
  ): Promise<CachedTemplateData> {
    try {
      if (!window.crypto || !window.crypto.subtle) {
        // Fallback: return data as-is if crypto not available
        return data;
      }

      const key = await window.crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode('wedsync-ai-encryption-key-2024'),
        { name: 'AES-GCM' },
        false,
        ['encrypt'],
      );

      const dataStr = JSON.stringify({
        templates: data.templates,
        clientContext: data.clientContext,
      });

      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      const encodedData = new TextEncoder().encode(dataStr);

      const encryptedData = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        encodedData,
      );

      return {
        ...data,
        templates: [], // Clear templates from main object
        clientContext: {} as ClientContext, // Clear context
        encrypted: {
          data: Array.from(new Uint8Array(encryptedData)),
          iv: Array.from(iv),
        },
      } as any;
    } catch (error) {
      console.warn('Encryption failed, storing unencrypted:', error);
      return data;
    }
  }

  // Decrypt template data
  private async decryptTemplateData(data: any): Promise<CachedTemplateData> {
    try {
      if (!data.encrypted || !window.crypto || !window.crypto.subtle) {
        return data;
      }

      const key = await window.crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode('wedsync-ai-encryption-key-2024'),
        { name: 'AES-GCM' },
        false,
        ['decrypt'],
      );

      const decryptedData = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: new Uint8Array(data.encrypted.iv) },
        key,
        new Uint8Array(data.encrypted.data),
      );

      const decryptedText = new TextDecoder().decode(decryptedData);
      const { templates, clientContext } = JSON.parse(decryptedText);

      return {
        ...data,
        templates,
        clientContext,
      };
    } catch (error) {
      console.error('Decryption failed:', error);
      throw error;
    }
  }

  // Sanitize client context for caching
  private sanitizeClientContext(context: ClientContext): ClientContext {
    return {
      name: context.name,
      inquiryType: context.inquiryType,
      urgency: context.urgency,
      weddingDate: context.weddingDate,
      venue: context.venue,
      // Exclude personalNotes for privacy
    };
  }

  // Process individual sync items
  private async processSyncItem(item: BackgroundSyncRequest): Promise<void> {
    switch (item.type) {
      case 'generate_templates':
        // Re-generate templates that failed during offline mode
        const { MobileAIEmailOptimizer } = await import(
          '@/lib/mobile/ai-email-optimization'
        );
        const optimizer = new MobileAIEmailOptimizer();
        const templates = await optimizer.generateMobileOptimizedTemplates(
          item.data,
        );
        await this.cacheGeneratedTemplates(templates, item.data.clientContext);
        break;

      case 'update_template':
        // Sync template updates
        // Implementation would depend on backend API
        break;

      case 'send_email':
        // Send email that was queued while offline
        // Implementation would depend on email service
        break;
    }
  }

  // Get all cached templates
  private async getAllCachedTemplates(): Promise<MobileEmailTemplate[]> {
    // Implementation would iterate through IndexedDB
    // This is a simplified version
    return [];
  }

  // Fallback templates for extreme offline scenarios
  private getFallbackTemplates(): MobileEmailTemplate[] {
    return [
      {
        id: 'fallback-1',
        subject: 'Thank you for your inquiry!',
        content:
          "Hi there!\n\nThank you for reaching out about wedding photography. I'd love to learn more about your special day!\n\nI'll get back to you within 24 hours with more details.\n\nBest regards,\n[Your Name]",
        tone: 'professional',
        stage: 'inquiry',
        confidence: 0.6,
        wordCount: 35,
        estimatedReadTime: '< 1 min read',
        mobileOptimized: true,
        touchFriendly: true,
      },
    ];
  }

  // Update performance metrics
  private updateMetrics(
    update: Partial<PWAPerformanceMetrics> & {
      responseTime?: number;
      cacheHit?: boolean;
    },
  ): void {
    if (update.responseTime) {
      this.metrics.averageResponseTime =
        (this.metrics.averageResponseTime + update.responseTime) / 2;
    }

    if (update.cacheHit !== undefined) {
      // Update cache hit rate (simplified calculation)
      this.metrics.cacheHitRate = update.cacheHit
        ? Math.min(this.metrics.cacheHitRate + 0.1, 1.0)
        : Math.max(this.metrics.cacheHitRate - 0.1, 0.0);
    }
  }

  // Start metrics collection
  private startMetricsCollection(): void {
    // Update storage metrics periodically
    setInterval(async () => {
      if (
        'navigator' in window &&
        'storage' in navigator &&
        'estimate' in navigator.storage
      ) {
        try {
          const estimate = await navigator.storage.estimate();
          this.metrics.storageUsed = estimate.usage || 0;
          this.metrics.maxStorage = estimate.quota || this.maxCacheSize;
        } catch (error) {
          console.warn('Storage estimation failed:', error);
        }
      }
    }, 60 * 1000); // Every minute
  }

  // Optimize storage usage
  private async optimizeStorage(): Promise<void> {
    const usage = this.metrics.storageUsed;
    const quota = this.metrics.maxStorage;

    // If using more than 80% of quota, clean up
    if (usage > quota * 0.8) {
      await this.db.clearOldTemplates(3 * 24 * 60 * 60 * 1000); // Keep only 3 days
    }
  }

  // Public API methods
  public getMetrics(): PWAPerformanceMetrics {
    return { ...this.metrics };
  }

  public async clearAllCache(): Promise<void> {
    await this.db.clearOldTemplates(0); // Clear all

    if ('caches' in window) {
      const cache = await caches.open(this.cacheName);
      const keys = await cache.keys();
      await Promise.all(keys.map((key) => cache.delete(key)));
    }
  }

  public async getStorageInfo(): Promise<{
    used: number;
    available: number;
    percentage: number;
  }> {
    const used = this.metrics.storageUsed;
    const available = this.metrics.maxStorage;
    const percentage = available > 0 ? (used / available) * 100 : 0;

    return { used, available, percentage };
  }
}
