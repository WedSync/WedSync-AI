/**
 * Caching Strategy Manager for WedSync Environment Variables Management System
 * Team D - Performance Optimization & Mobile Experience
 * Handles Redis server-side caching and IndexedDB client-side offline storage
 */

import { EnvironmentVariable } from '@/components/mobile/TouchOptimizedVariableCard';

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  priority?: 'low' | 'medium' | 'high' | 'critical';
  tags?: string[];
  version?: string;
}

interface OfflineOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  data: any;
  timestamp: Date;
  retryCount: number;
  organizationId: string;
}

interface SyncResult {
  successful: number;
  failed: number;
  errors: Array<{ operation: OfflineOperation; error: string }>;
}

export interface CacheStrategy {
  // Variable data caching
  variableCache: Map<string, EnvironmentVariable>;
  environmentCache: Map<string, Environment>;
  auditCache: Map<string, AuditEntry[]>;

  // Cache invalidation
  invalidateVariable(variableId: string): void;
  invalidateEnvironment(environmentId: string): void;
  clearExpiredCache(): void;

  // Mobile-specific caching
  offlineCache: IndexedDBCache;
  syncQueue: OfflineOperation[];
  priorityCache: CriticalVariable[];
}

/**
 * IndexedDB Manager for offline storage
 * Stores environment variables and sync queue for offline-first experience
 */
class IndexedDBManager {
  private db: IDBDatabase | null = null;
  private dbName = 'wedsync-env-vars';
  private version = 2;
  private stores = {
    variables: 'environment-variables',
    syncQueue: 'sync-queue',
    cache: 'cache-data',
    settings: 'app-settings',
  };

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

        // Environment Variables store
        if (!db.objectStoreNames.contains(this.stores.variables)) {
          const variablesStore = db.createObjectStore(this.stores.variables, {
            keyPath: 'id',
            autoIncrement: false,
          });
          variablesStore.createIndex('organizationId', 'organizationId', {
            unique: false,
          });
          variablesStore.createIndex('category', 'category', { unique: false });
          variablesStore.createIndex('environment', 'environment', {
            unique: false,
          });
          variablesStore.createIndex('key', 'key', { unique: false });
          variablesStore.createIndex('updatedAt', 'updatedAt', {
            unique: false,
          });
        }

        // Sync Queue store
        if (!db.objectStoreNames.contains(this.stores.syncQueue)) {
          const syncStore = db.createObjectStore(this.stores.syncQueue, {
            keyPath: 'id',
            autoIncrement: false,
          });
          syncStore.createIndex('timestamp', 'timestamp', { unique: false });
          syncStore.createIndex('type', 'type', { unique: false });
          syncStore.createIndex('organizationId', 'organizationId', {
            unique: false,
          });
        }

        // Cache data store
        if (!db.objectStoreNames.contains(this.stores.cache)) {
          const cacheStore = db.createObjectStore(this.stores.cache, {
            keyPath: 'key',
            autoIncrement: false,
          });
          cacheStore.createIndex('expiry', 'expiry', { unique: false });
          cacheStore.createIndex('tags', 'tags', {
            unique: false,
            multiEntry: true,
          });
        }

        // App settings store
        if (!db.objectStoreNames.contains(this.stores.settings)) {
          db.createObjectStore(this.stores.settings, {
            keyPath: 'key',
            autoIncrement: false,
          });
        }
      };
    });
  }

  async get<T>(storeName: string, key: string): Promise<T | null> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  async put(storeName: string, data: any): Promise<void> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async delete(storeName: string, key: string): Promise<void> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getAll<T>(storeName: string): Promise<T[]> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  async getByIndex<T>(
    storeName: string,
    indexName: string,
    value: any,
  ): Promise<T[]> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  async clear(storeName: string): Promise<void> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
}

/**
 * Redis Cache Manager for server-side caching
 */
class RedisManager {
  private redis: any = null; // Would be actual Redis client in production
  private keyPrefix = 'wedsync:env:';

  constructor() {
    // In a real implementation, initialize Redis client here
    // this.redis = new Redis(process.env.REDIS_URL);
  }

  private getKey(key: string): string {
    return `${this.keyPrefix}${key}`;
  }

  async get(key: string): Promise<any> {
    if (!this.redis) {
      // Fallback to in-memory cache for development
      return this.memoryCache.get(this.getKey(key)) || null;
    }

    const result = await this.redis.get(this.getKey(key));
    return result ? JSON.parse(result) : null;
  }

  async set(
    key: string,
    value: any,
    options: CacheOptions = {},
  ): Promise<void> {
    const cacheKey = this.getKey(key);
    const cacheData = {
      data: value,
      timestamp: Date.now(),
      ttl: options.ttl || 300000, // 5 minutes default
      priority: options.priority || 'medium',
      tags: options.tags || [],
      version: options.version || '1.0',
    };

    if (!this.redis) {
      // Fallback to in-memory cache
      this.memoryCache.set(cacheKey, cacheData);

      // Auto-expire
      if (options.ttl) {
        setTimeout(() => {
          this.memoryCache.delete(cacheKey);
        }, options.ttl);
      }
      return;
    }

    await this.redis.setex(
      cacheKey,
      Math.floor((options.ttl || 300000) / 1000),
      JSON.stringify(cacheData),
    );

    // Add to tags for invalidation
    if (options.tags && options.tags.length > 0) {
      for (const tag of options.tags) {
        await this.redis.sadd(`${this.keyPrefix}tag:${tag}`, cacheKey);
      }
    }
  }

  async delete(key: string): Promise<void> {
    const cacheKey = this.getKey(key);

    if (!this.redis) {
      this.memoryCache.delete(cacheKey);
      return;
    }

    await this.redis.del(cacheKey);
  }

  async invalidateByTag(tag: string): Promise<void> {
    if (!this.redis) {
      // Simple memory cache invalidation
      for (const [key] of this.memoryCache) {
        if (key.includes(tag)) {
          this.memoryCache.delete(key);
        }
      }
      return;
    }

    const keys = await this.redis.smembers(`${this.keyPrefix}tag:${tag}`);
    if (keys.length > 0) {
      await this.redis.del(...keys);
      await this.redis.del(`${this.keyPrefix}tag:${tag}`);
    }
  }

  // In-memory fallback for development
  private memoryCache = new Map<string, any>();
}

/**
 * Main Cache Manager that coordinates IndexedDB and Redis
 */
export class CacheManager {
  private indexedDB: IndexedDBManager;
  private redis: RedisManager;
  private isOnline = navigator.onLine;

  constructor() {
    this.indexedDB = new IndexedDBManager();
    this.redis = new RedisManager();

    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.syncOfflineChanges();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  async initialize(): Promise<void> {
    await this.indexedDB.initialize();
  }

  // Environment Variable Operations

  async getVariable(id: string): Promise<EnvironmentVariable | null> {
    // Try Redis cache first if online
    if (this.isOnline) {
      const cached = await this.redis.get(`variable:${id}`);
      if (cached) {
        return cached.data;
      }
    }

    // Fallback to IndexedDB
    return await this.indexedDB.get<EnvironmentVariable>(
      this.indexedDB['stores'].variables,
      id,
    );
  }

  async setVariable(
    variable: EnvironmentVariable,
    options: CacheOptions = {},
  ): Promise<void> {
    // Store in IndexedDB for offline access
    await this.indexedDB.put(this.indexedDB['stores'].variables, {
      ...variable,
      cachedAt: new Date(),
      syncStatus: this.isOnline ? 'synced' : 'pending',
    });

    // Store in Redis if online
    if (this.isOnline) {
      await this.redis.set(`variable:${variable.id}`, variable, {
        ttl: 600000, // 10 minutes
        tags: [`org:${variable.id}`, `category:${variable.category}`],
        priority: 'high',
        ...options,
      });
    }
  }

  async getVariablesByOrganization(
    organizationId: string,
  ): Promise<EnvironmentVariable[]> {
    // Try Redis cache first if online
    if (this.isOnline) {
      const cached = await this.redis.get(`org:${organizationId}:variables`);
      if (cached) {
        return cached.data;
      }
    }

    // Get from IndexedDB
    const variables = await this.indexedDB.getByIndex<EnvironmentVariable>(
      this.indexedDB['stores'].variables,
      'organizationId',
      organizationId,
    );

    // Cache in Redis if online
    if (this.isOnline && variables.length > 0) {
      await this.redis.set(`org:${organizationId}:variables`, variables, {
        ttl: 300000, // 5 minutes
        tags: [`org:${organizationId}`],
      });
    }

    return variables;
  }

  async invalidateVariable(variableId: string): Promise<void> {
    await this.redis.delete(`variable:${variableId}`);
    await this.redis.invalidateByTag(`variable:${variableId}`);
  }

  async invalidateOrganization(organizationId: string): Promise<void> {
    await this.redis.invalidateByTag(`org:${organizationId}`);
  }

  // Offline Operations Management

  async addToSyncQueue(
    operation: Omit<OfflineOperation, 'id' | 'timestamp' | 'retryCount'>,
  ): Promise<void> {
    const queueOperation: OfflineOperation = {
      ...operation,
      id: crypto.randomUUID(),
      timestamp: new Date(),
      retryCount: 0,
    };

    await this.indexedDB.put(
      this.indexedDB['stores'].syncQueue,
      queueOperation,
    );
  }

  async getSyncQueue(): Promise<OfflineOperation[]> {
    return await this.indexedDB.getAll<OfflineOperation>(
      this.indexedDB['stores'].syncQueue,
    );
  }

  async removeFromSyncQueue(operationId: string): Promise<void> {
    await this.indexedDB.delete(
      this.indexedDB['stores'].syncQueue,
      operationId,
    );
  }

  async syncOfflineChanges(): Promise<SyncResult> {
    if (!this.isOnline) {
      return { successful: 0, failed: 0, errors: [] };
    }

    const operations = await this.getSyncQueue();
    const result: SyncResult = { successful: 0, failed: 0, errors: [] };

    for (const operation of operations) {
      try {
        await this.syncOperation(operation);
        await this.removeFromSyncQueue(operation.id);
        result.successful++;
      } catch (error) {
        result.failed++;
        result.errors.push({
          operation,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        // Increase retry count
        operation.retryCount++;
        if (operation.retryCount < 3) {
          await this.indexedDB.put(
            this.indexedDB['stores'].syncQueue,
            operation,
          );
        } else {
          // Remove after 3 failed attempts
          await this.removeFromSyncQueue(operation.id);
        }
      }
    }

    return result;
  }

  private async syncOperation(operation: OfflineOperation): Promise<void> {
    const endpoint = '/api/admin/environment';

    switch (operation.type) {
      case 'create':
        await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(operation.data),
        });
        break;

      case 'update':
        await fetch(`${endpoint}/${operation.data.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(operation.data),
        });
        break;

      case 'delete':
        await fetch(`${endpoint}/${operation.data.id}`, {
          method: 'DELETE',
        });
        break;
    }
  }

  // Offline Storage for Critical Data

  async storeOffline(key: string, data: any): Promise<void> {
    await this.indexedDB.put(this.indexedDB['stores'].cache, {
      key,
      data,
      timestamp: Date.now(),
      expiry: Date.now() + 86400000, // 24 hours
    });
  }

  async retrieveOffline(key: string): Promise<any> {
    const cached = await this.indexedDB.get(
      this.indexedDB['stores'].cache,
      key,
    );

    if (!cached) return null;

    // Check expiry
    if (cached.expiry < Date.now()) {
      await this.indexedDB.delete(this.indexedDB['stores'].cache, key);
      return null;
    }

    return cached.data;
  }

  async clearExpiredCache(): Promise<void> {
    const allCached = await this.indexedDB.getAll(
      this.indexedDB['stores'].cache,
    );
    const now = Date.now();

    for (const item of allCached) {
      if (item.expiry < now) {
        await this.indexedDB.delete(this.indexedDB['stores'].cache, item.key);
      }
    }
  }

  // Priority Caching for Critical Variables

  async cacheCriticalVariables(organizationId: string): Promise<void> {
    const variables = await this.getVariablesByOrganization(organizationId);
    const criticalVariables = variables.filter(
      (v) => v.isRequired || v.category === 'system',
    );

    for (const variable of criticalVariables) {
      await this.storeOffline(`critical:${variable.id}`, variable);
    }
  }

  async getCriticalVariables(
    organizationId: string,
  ): Promise<EnvironmentVariable[]> {
    const variables = await this.indexedDB.getByIndex<EnvironmentVariable>(
      this.indexedDB['stores'].variables,
      'organizationId',
      organizationId,
    );

    return variables.filter((v) => v.isRequired || v.category === 'system');
  }

  // Cache Statistics and Monitoring

  async getCacheStats(): Promise<{
    indexedDBSize: number;
    syncQueueSize: number;
    lastSync: Date | null;
    isOnline: boolean;
    criticalVariablesCached: number;
  }> {
    const variables = await this.indexedDB.getAll(
      this.indexedDB['stores'].variables,
    );
    const syncQueue = await this.indexedDB.getAll(
      this.indexedDB['stores'].syncQueue,
    );
    const criticalCount = variables.filter(
      (v) => v.isRequired || v.category === 'system',
    ).length;

    const lastSyncData = await this.indexedDB.get(
      this.indexedDB['stores'].settings,
      'lastSync',
    );

    return {
      indexedDBSize: variables.length,
      syncQueueSize: syncQueue.length,
      lastSync: lastSyncData ? new Date(lastSyncData.value) : null,
      isOnline: this.isOnline,
      criticalVariablesCached: criticalCount,
    };
  }

  async updateLastSync(): Promise<void> {
    await this.indexedDB.put(this.indexedDB['stores'].settings, {
      key: 'lastSync',
      value: Date.now(),
    });
  }
}

// Export singleton instance
export const cacheManager = new CacheManager();
