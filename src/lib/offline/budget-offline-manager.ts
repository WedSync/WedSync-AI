/**
 * WS-245: Offline Budget Manager
 * Handles offline budget data storage, synchronization, and conflict resolution
 * Optimized for mobile wedding budget planning scenarios
 */

export interface BudgetData {
  id: string;
  weddingId: string;
  organizationId: string;
  totalBudget: number;
  categories: BudgetCategory[];
  expenses: BudgetExpense[];
  lastModified: Date;
  version: number;
  syncStatus: 'synced' | 'pending' | 'conflict';
}

export interface BudgetCategory {
  id: string;
  name: string;
  allocated: number;
  spent: number;
  color: string;
  priority: number;
  isDefault: boolean;
}

export interface BudgetExpense {
  id: string;
  categoryId: string;
  amount: number;
  description: string;
  vendor?: string;
  date: Date;
  receiptUrl?: string;
  isRecurring: boolean;
  tags: string[];
  createdOffline: boolean;
}

export interface SyncResult {
  success: boolean;
  conflicts: BudgetConflict[];
  synced: number;
  failed: number;
  errors: string[];
}

export interface BudgetConflict {
  budgetId: string;
  localVersion: number;
  serverVersion: number;
  conflictType: 'data' | 'structure' | 'deletion';
  resolution: 'local' | 'server' | 'merge';
}

/**
 * Offline Budget Manager Class
 * Handles all offline budget operations with IndexedDB storage
 */
export class OfflineBudgetManager {
  private db: IDBDatabase | null = null;
  private readonly DB_NAME = 'wedsync_budget_offline';
  private readonly DB_VERSION = 1;
  private syncInProgress = false;

  constructor() {
    this.initializeDB();
  }

  /**
   * Initialize IndexedDB for offline storage
   */
  private async initializeDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => reject(request.error);

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create budget data store
        if (!db.objectStoreNames.contains('budgets')) {
          const budgetStore = db.createObjectStore('budgets', {
            keyPath: 'id',
          });
          budgetStore.createIndex('weddingId', 'weddingId', { unique: false });
          budgetStore.createIndex('organizationId', 'organizationId', {
            unique: false,
          });
          budgetStore.createIndex('syncStatus', 'syncStatus', {
            unique: false,
          });
        }

        // Create sync queue store
        if (!db.objectStoreNames.contains('syncQueue')) {
          const syncStore = db.createObjectStore('syncQueue', {
            keyPath: 'id',
          });
          syncStore.createIndex('timestamp', 'timestamp', { unique: false });
          syncStore.createIndex('operation', 'operation', { unique: false });
        }

        // Create cached market data for offline recommendations
        if (!db.objectStoreNames.contains('marketCache')) {
          const marketStore = db.createObjectStore('marketCache', {
            keyPath: 'id',
          });
          marketStore.createIndex('category', 'category', { unique: false });
          marketStore.createIndex('location', 'location', { unique: false });
        }
      };
    });
  }

  /**
   * Store budget data locally for offline access
   */
  async storeBudgetLocally(budgetData: BudgetData): Promise<void> {
    if (!this.db) {
      await this.initializeDB();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(['budgets'], 'readwrite');
      const store = transaction.objectStore('budgets');

      // Add offline metadata
      const offlineBudget = {
        ...budgetData,
        lastModified: new Date(),
        syncStatus: 'pending' as const,
        offlineChanges: true,
      };

      const request = store.put(offlineBudget);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        // Queue for sync
        this.queueForSync('update', budgetData.id);
        resolve();
      };
    });
  }

  /**
   * Load budget data from offline storage
   */
  async loadOfflineBudget(budgetId: string): Promise<BudgetData | null> {
    if (!this.db) {
      await this.initializeDB();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(['budgets'], 'readonly');
      const store = transaction.objectStore('budgets');
      const request = store.get(budgetId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        resolve(request.result || null);
      };
    });
  }

  /**
   * Get all budgets for an organization (offline)
   */
  async getBudgetsByOrganization(
    organizationId: string,
  ): Promise<BudgetData[]> {
    if (!this.db) {
      await this.initializeDB();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(['budgets'], 'readonly');
      const store = transaction.objectStore('budgets');
      const index = store.index('organizationId');
      const request = index.getAll(organizationId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        resolve(request.result || []);
      };
    });
  }

  /**
   * Add expense to offline budget
   */
  async addExpenseOffline(
    budgetId: string,
    expense: Omit<BudgetExpense, 'id' | 'createdOffline'>,
  ): Promise<void> {
    const budget = await this.loadOfflineBudget(budgetId);
    if (!budget) {
      throw new Error('Budget not found offline');
    }

    const newExpense: BudgetExpense = {
      ...expense,
      id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdOffline: true,
    };

    budget.expenses.push(newExpense);
    budget.version += 1;

    // Update spent amounts
    const category = budget.categories.find((c) => c.id === expense.categoryId);
    if (category) {
      category.spent += expense.amount;
    }

    await this.storeBudgetLocally(budget);
  }

  /**
   * Update budget allocation offline
   */
  async updateAllocationOffline(
    budgetId: string,
    categoryId: string,
    newAllocation: number,
  ): Promise<void> {
    const budget = await this.loadOfflineBudget(budgetId);
    if (!budget) {
      throw new Error('Budget not found offline');
    }

    const category = budget.categories.find((c) => c.id === categoryId);
    if (!category) {
      throw new Error('Category not found');
    }

    category.allocated = newAllocation;
    budget.version += 1;

    await this.storeBudgetLocally(budget);
  }

  /**
   * Queue operation for synchronization
   */
  private async queueForSync(
    operation: 'create' | 'update' | 'delete',
    budgetId: string,
  ): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(['syncQueue'], 'readwrite');
    const store = transaction.objectStore('syncQueue');

    const syncItem = {
      id: `${operation}_${budgetId}_${Date.now()}`,
      operation,
      budgetId,
      timestamp: Date.now(),
      retries: 0,
      maxRetries: 3,
    };

    store.add(syncItem);
  }

  /**
   * Sync offline budget changes with server
   */
  async syncOfflineBudgetChanges(): Promise<SyncResult> {
    if (this.syncInProgress) {
      return {
        success: false,
        conflicts: [],
        synced: 0,
        failed: 0,
        errors: ['Sync already in progress'],
      };
    }

    this.syncInProgress = true;
    const result: SyncResult = {
      success: true,
      conflicts: [],
      synced: 0,
      failed: 0,
      errors: [],
    };

    try {
      // Check network connectivity
      if (!navigator.onLine) {
        throw new Error('No network connection available');
      }

      // Get pending sync items
      const pendingItems = await this.getPendingSyncItems();

      for (const item of pendingItems) {
        try {
          await this.syncBudgetItem(item);
          await this.markSyncComplete(item.id);
          result.synced++;
        } catch (error) {
          result.failed++;
          result.errors.push(`Failed to sync ${item.budgetId}: ${error}`);

          // Handle conflicts
          if (
            error instanceof Error &&
            error.message.includes('version conflict')
          ) {
            result.conflicts.push({
              budgetId: item.budgetId,
              localVersion: 0, // Will be populated from actual data
              serverVersion: 0, // Will be populated from server response
              conflictType: 'data',
              resolution: 'merge',
            });
          }
        }
      }

      result.success = result.failed === 0;
    } catch (error) {
      result.success = false;
      result.errors.push(`Sync failed: ${error}`);
    } finally {
      this.syncInProgress = false;
    }

    return result;
  }

  /**
   * Get pending sync items from queue
   */
  private async getPendingSyncItems(): Promise<any[]> {
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(['syncQueue'], 'readonly');
      const store = transaction.objectStore('syncQueue');
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  /**
   * Sync individual budget item with server
   */
  private async syncBudgetItem(syncItem: any): Promise<void> {
    const budget = await this.loadOfflineBudget(syncItem.budgetId);
    if (!budget) return;

    const response = await fetch(`/api/budgets/${syncItem.budgetId}/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        operation: syncItem.operation,
        data: budget,
        localVersion: budget.version,
      }),
    });

    if (!response.ok) {
      throw new Error(`Sync failed: ${response.statusText}`);
    }

    const serverBudget = await response.json();

    // Update local data with server response
    await this.storeBudgetLocally({
      ...serverBudget,
      syncStatus: 'synced',
    });
  }

  /**
   * Mark sync item as complete
   */
  private async markSyncComplete(syncItemId: string): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(['syncQueue'], 'readwrite');
    const store = transaction.objectStore('syncQueue');
    store.delete(syncItemId);
  }

  /**
   * Get offline status and sync information
   */
  async getOfflineStatus(): Promise<{
    isOffline: boolean;
    pendingSyncCount: number;
    lastSyncTime: Date | null;
    storageUsed: number;
  }> {
    const pendingItems = await this.getPendingSyncItems();

    return {
      isOffline: !navigator.onLine,
      pendingSyncCount: pendingItems.length,
      lastSyncTime: null, // TODO: Implement last sync tracking
      storageUsed: 0, // TODO: Calculate IndexedDB storage usage
    };
  }

  /**
   * Clear all offline data (for logout/reset)
   */
  async clearOfflineData(): Promise<void> {
    if (!this.db) return;

    const stores = ['budgets', 'syncQueue', 'marketCache'];
    const transaction = this.db.transaction(stores, 'readwrite');

    for (const storeName of stores) {
      const store = transaction.objectStore(storeName);
      store.clear();
    }
  }

  /**
   * Cache market data for offline budget recommendations
   */
  async cacheMarketData(
    category: string,
    location: string,
    data: any,
  ): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(['marketCache'], 'readwrite');
    const store = transaction.objectStore('marketCache');

    const cacheItem = {
      id: `${category}_${location}`,
      category,
      location,
      data,
      timestamp: Date.now(),
      expiryTime: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    };

    store.put(cacheItem);
  }

  /**
   * Get cached market data for offline recommendations
   */
  async getCachedMarketData(
    category: string,
    location: string,
  ): Promise<any | null> {
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(['marketCache'], 'readonly');
      const store = transaction.objectStore('marketCache');
      const request = store.get(`${category}_${location}`);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result;

        // Check if data has expired
        if (result && result.expiryTime > Date.now()) {
          resolve(result.data);
        } else {
          resolve(null);
        }
      };
    });
  }
}

// Singleton instance
let offlineManager: OfflineBudgetManager | null = null;

export function getOfflineBudgetManager(): OfflineBudgetManager {
  if (!offlineManager) {
    offlineManager = new OfflineBudgetManager();
  }
  return offlineManager;
}

/**
 * React hook for offline budget management
 */
import { useEffect, useState } from 'react';

export function useOfflineBudget(budgetId?: string) {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error'>(
    'idle',
  );
  const [pendingChanges, setPendingChanges] = useState(0);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const syncNow = async () => {
    setSyncStatus('syncing');
    try {
      const manager = getOfflineBudgetManager();
      const result = await manager.syncOfflineBudgetChanges();

      if (result.success) {
        setPendingChanges(0);
        setSyncStatus('idle');
      } else {
        setSyncStatus('error');
      }

      return result;
    } catch (error) {
      setSyncStatus('error');
      throw error;
    }
  };

  return {
    isOffline,
    syncStatus,
    pendingChanges,
    syncNow,
    manager: getOfflineBudgetManager(),
  };
}
