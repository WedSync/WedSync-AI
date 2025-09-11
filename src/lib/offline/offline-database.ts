import Dexie, { Table } from 'dexie';
import { encrypt, decrypt } from '@/lib/security/encryption';

// Core interfaces matching the specification requirements
export interface CachedWedding {
  id: string;
  date: string;
  coupleId: string;
  coupleName: string;
  venue: string;
  status: 'upcoming' | 'active' | 'completed';
  timeline: TimelineEvent[];
  vendors: VendorContact[];
  lastSync: string;
  syncStatus: 'synced' | 'pending' | 'conflict';
  priority: number; // 1=critical (today), 2=important (next 7 days), 3=normal
}

export interface CachedClient {
  id: string;
  weddingDate: string;
  status: string;
  lastSync: string;
  supplierId: string;
  contactInfo: string; // Encrypted
  preferences: any;
}

export interface CachedForm {
  id: string;
  clientId: string;
  type: string;
  lastModified: string;
  data: any;
  isTemplate: boolean;
}

export interface CachedFormDraft {
  id: string;
  formId: string;
  clientId: string;
  data: Record<string, any>;
  autoSaveTime: string;
  syncStatus: 'pending' | 'synced' | 'failed';
  conflictVersion?: number;
}

export interface SyncQueueItem {
  id?: number;
  type:
    | 'form_submission'
    | 'form_draft'
    | 'client_update'
    | 'note_create'
    | 'viral_action';
  action: 'create' | 'update' | 'delete';
  data: any;
  attempts: number;
  timestamp: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  nextRetry?: string;
  priority: number; // Higher numbers = higher priority
}

export interface TimelineEvent {
  id: string;
  time: string;
  title: string;
  description: string;
  type: 'ceremony' | 'reception' | 'photos' | 'vendor';
  status: 'pending' | 'active' | 'completed';
}

export interface VendorContact {
  id: string;
  name: string;
  type: string;
  phone: string;
  email: string;
  status: 'confirmed' | 'pending' | 'arrived';
}

export class WedSyncOfflineDB extends Dexie {
  weddings!: Table<CachedWedding>;
  clients!: Table<CachedClient>;
  forms!: Table<CachedForm>;
  formDrafts!: Table<CachedFormDraft>;
  syncQueue!: Table<SyncQueueItem>;

  constructor() {
    super('WedSyncOffline');

    // Version 1 - Initial schema
    this.version(1).stores({
      weddings: 'id, date, coupleId, status, priority, [date+status]',
      clients: 'id, weddingDate, status, lastSync, supplierId',
      forms: 'id, clientId, type, lastModified',
      formDrafts: 'id, formId, clientId, autoSaveTime, syncStatus',
      syncQueue: '++id, type, status, timestamp, nextRetry, priority',
    });

    // Add hooks for automatic sync metadata
    this.weddings.hook('creating', this.addSyncMetadata);
    this.weddings.hook('updating', this.updateSyncMetadata);
    this.clients.hook('creating', this.addSyncMetadata);
    this.clients.hook('updating', this.updateSyncMetadata);
  }

  private addSyncMetadata = (primKey: any, obj: any) => {
    obj.lastSync = new Date().toISOString();
    obj.syncStatus = 'pending';
  };

  private updateSyncMetadata = (modifications: any) => {
    modifications.lastSync = new Date().toISOString();
    if (!modifications.syncStatus) {
      modifications.syncStatus = 'pending';
    }
  };
}

// Secure offline storage implementation matching specification
export class SecureOfflineStorage {
  static async storeWeddingData(weddingData: CachedWedding): Promise<void> {
    // Encrypt sensitive data before storing in IndexedDB
    const encryptedData = {
      ...weddingData,
      clientContacts: weddingData.vendors
        ? await encrypt(JSON.stringify(weddingData.vendors))
        : '',
      vendorContacts: await encrypt(JSON.stringify(weddingData.vendors)),
      personalNotes: await encrypt(weddingData.venue || ''),
    };

    await offlineDB.weddings.put(encryptedData as any);
  }

  static async retrieveWeddingData(
    weddingId: string,
  ): Promise<CachedWedding | null> {
    const encryptedData = await offlineDB.weddings.get(weddingId);
    if (!encryptedData) return null;

    // Decrypt sensitive data when retrieving
    const decryptedData = {
      ...encryptedData,
      vendors: JSON.parse(
        await decrypt((encryptedData as any).vendorContacts || '[]'),
      ),
    };

    return decryptedData;
  }
}

// Smart Cache Manager with priority and cleanup
export class SmartCacheManager {
  private readonly MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50MB
  private readonly CACHE_PRIORITIES = {
    critical: 1, // Today's weddings
    important: 2, // Next 7 days
    normal: 3, // Historical data
    low: 4, // Analytics, preferences
  };

  async preloadCriticalData(): Promise<void> {
    console.log('Preloading critical wedding data...');

    // Get today's and tomorrow's weddings
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    const [todayWeddings, tomorrowWeddings] = await Promise.all([
      this.fetchWeddingsForDate(today),
      this.fetchWeddingsForDate(tomorrow),
    ]);

    // Cache today's weddings with highest priority
    for (const wedding of todayWeddings) {
      await this.cacheWeddingWithPriority(wedding, 'critical');

      // Also cache related data
      await Promise.all([
        this.cacheClientData(wedding.coupleId, 'critical'),
        this.cacheWeddingForms(wedding.id, 'critical'),
      ]);
    }

    // Cache tomorrow's weddings with high priority
    for (const wedding of tomorrowWeddings) {
      await this.cacheWeddingWithPriority(wedding, 'important');
    }

    // Optimize storage after caching
    await this.optimizeStorage();
  }

  private async fetchWeddingsForDate(date: string): Promise<CachedWedding[]> {
    return offlineDB.weddings.where('date').equals(date).toArray();
  }

  async cacheWeddingWithPriority(
    wedding: CachedWedding,
    priority: keyof typeof this.CACHE_PRIORITIES,
  ): Promise<void> {
    const cachedWedding: CachedWedding = {
      ...wedding,
      priority: this.CACHE_PRIORITIES[priority],
      lastSync: new Date().toISOString(),
      syncStatus: 'synced',
    };

    await offlineDB.weddings.put(cachedWedding);
  }

  private async cacheClientData(
    coupleId: string,
    priority: keyof typeof this.CACHE_PRIORITIES,
  ): Promise<void> {
    // Implementation for caching client data
    console.log(
      `Caching client data for ${coupleId} with priority ${priority}`,
    );
  }

  private async cacheWeddingForms(
    weddingId: string,
    priority: keyof typeof this.CACHE_PRIORITIES,
  ): Promise<void> {
    // Implementation for caching wedding forms
    console.log(
      `Caching forms for wedding ${weddingId} with priority ${priority}`,
    );
  }

  async optimizeStorage(): Promise<void> {
    const usage = await this.getCacheUsage();

    if (usage.size > this.MAX_CACHE_SIZE * 0.8) {
      console.log('Cache approaching limit, optimizing...');

      // Remove low priority old data first
      await this.pruneOldData();

      // If still over limit, remove normal priority data
      const newUsage = await this.getCacheUsage();
      if (newUsage.size > this.MAX_CACHE_SIZE * 0.8) {
        await this.pruneNormalPriorityData();
      }
    }
  }

  private async pruneOldData(): Promise<void> {
    const thirtyDaysAgo = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000,
    ).toISOString();

    await offlineDB.weddings
      .where('priority')
      .equals(4) // Low priority
      .and((item) => item.lastSync < thirtyDaysAgo)
      .delete();
  }

  private async pruneNormalPriorityData(): Promise<void> {
    const sevenDaysAgo = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000,
    ).toISOString();

    await offlineDB.weddings
      .where('priority')
      .equals(3) // Normal priority
      .and((item) => item.lastSync < sevenDaysAgo)
      .delete();
  }

  async getCacheUsage(): Promise<{
    size: number;
    quota: number;
    usage: number;
  }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        size: estimate.usage || 0,
        quota: estimate.quota || 0,
        usage: (estimate.usage || 0) / (estimate.quota || 1),
      };
    }

    // Fallback: estimate based on record counts
    const [weddingCount, clientCount, formCount] = await Promise.all([
      offlineDB.weddings.count(),
      offlineDB.clients.count(),
      offlineDB.formDrafts.count(),
    ]);

    const estimatedSize =
      weddingCount * 2048 + clientCount * 1024 + formCount * 512;
    return {
      size: estimatedSize,
      quota: this.MAX_CACHE_SIZE,
      usage: estimatedSize / this.MAX_CACHE_SIZE,
    };
  }
}

// Singleton database instance
export const offlineDB = new WedSyncOfflineDB();

// Export smart cache manager instance
export const smartCacheManager = new SmartCacheManager();
