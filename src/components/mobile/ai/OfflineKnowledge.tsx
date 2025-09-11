'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  WifiOffIcon,
  WifiIcon,
  DownloadIcon,
  TrashIcon,
  RefreshCwIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  ClockIcon,
  StorageIcon,
  SyncIcon,
  DatabaseIcon,
  CloudOffIcon,
  CloudIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import {
  useHapticFeedback,
  PullToRefresh,
  BottomSheet,
} from '@/components/mobile/MobileEnhancedFeatures';

// Types
interface CachedArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  cachedAt: string;
  lastAccessedAt: string;
  sizeKB: number;
  version: number;
  priority: 'high' | 'medium' | 'low';
}

interface CacheStatistics {
  totalArticles: number;
  totalSizeKB: number;
  availableSpaceKB: number;
  lastSyncAt?: string;
  syncPending: number;
  offlineDuration: number;
}

interface SyncQueueItem {
  id: string;
  action: 'download' | 'update' | 'delete';
  article?: CachedArticle;
  timestamp: string;
  retryCount: number;
}

interface OfflineKnowledgeProps {
  onArticleRequest?: (articleId: string) => Promise<CachedArticle | null>;
  onCacheUpdate?: (stats: CacheStatistics) => void;
  maxCacheSizeKB?: number;
  className?: string;
}

// PWA Cache Manager Class
class KnowledgeCacheManager {
  private readonly CACHE_NAME = 'wedsync-knowledge-v1';
  private readonly DB_NAME = 'wedsync-knowledge-db';
  private readonly DB_VERSION = 1;
  private readonly MAX_CACHE_SIZE_KB = 50 * 1024; // 50MB default

  private db: IDBDatabase | null = null;
  private isOnline = navigator.onLine;

  constructor(maxSizeKB?: number) {
    if (maxSizeKB) {
      // @ts-ignore - dynamic property assignment
      this.MAX_CACHE_SIZE_KB = maxSizeKB;
    }
    this.initDB();
    this.setupNetworkListeners();
  }

  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Articles store
        if (!db.objectStoreNames.contains('articles')) {
          const articlesStore = db.createObjectStore('articles', {
            keyPath: 'id',
          });
          articlesStore.createIndex('category', 'category', { unique: false });
          articlesStore.createIndex('cachedAt', 'cachedAt', { unique: false });
          articlesStore.createIndex('priority', 'priority', { unique: false });
        }

        // Sync queue store
        if (!db.objectStoreNames.contains('syncQueue')) {
          const syncStore = db.createObjectStore('syncQueue', {
            keyPath: 'id',
          });
          syncStore.createIndex('timestamp', 'timestamp', { unique: false });
          syncStore.createIndex('action', 'action', { unique: false });
        }

        // Cache metadata store
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'key' });
        }
      };
    });
  }

  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processSyncQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  async cacheArticle(article: CachedArticle): Promise<void> {
    if (!this.db) await this.initDB();

    const transaction = this.db!.transaction(['articles'], 'readwrite');
    const store = transaction.objectStore('articles');

    // Check if we need to make space
    await this.ensureCacheSpace(article.sizeKB);

    const cachedArticle = {
      ...article,
      cachedAt: new Date().toISOString(),
      lastAccessedAt: new Date().toISOString(),
    };

    await new Promise<void>((resolve, reject) => {
      const request = store.put(cachedArticle);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    // Also cache in service worker cache
    if ('caches' in window) {
      const cache = await caches.open(this.CACHE_NAME);
      const response = new Response(JSON.stringify(cachedArticle), {
        headers: { 'Content-Type': 'application/json' },
      });
      await cache.put(`/knowledge/article/${article.id}`, response);
    }
  }

  async getCachedArticle(articleId: string): Promise<CachedArticle | null> {
    if (!this.db) await this.initDB();

    const transaction = this.db!.transaction(['articles'], 'readwrite');
    const store = transaction.objectStore('articles');

    const article = await new Promise<CachedArticle | null>((resolve) => {
      const request = store.get(articleId);
      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          // Update last accessed time
          result.lastAccessedAt = new Date().toISOString();
          store.put(result);
        }
        resolve(result || null);
      };
      request.onerror = () => resolve(null);
    });

    return article;
  }

  async getAllCachedArticles(): Promise<CachedArticle[]> {
    if (!this.db) await this.initDB();

    const transaction = this.db!.transaction(['articles'], 'readonly');
    const store = transaction.objectStore('articles');

    return new Promise<CachedArticle[]>((resolve) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => resolve([]);
    });
  }

  async removeArticle(articleId: string): Promise<void> {
    if (!this.db) await this.initDB();

    const transaction = this.db!.transaction(['articles'], 'readwrite');
    const store = transaction.objectStore('articles');

    await new Promise<void>((resolve, reject) => {
      const request = store.delete(articleId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    // Remove from service worker cache
    if ('caches' in window) {
      const cache = await caches.open(this.CACHE_NAME);
      await cache.delete(`/knowledge/article/${articleId}`);
    }
  }

  async getCacheStatistics(): Promise<CacheStatistics> {
    const articles = await this.getAllCachedArticles();
    const totalSizeKB = articles.reduce(
      (sum, article) => sum + article.sizeKB,
      0,
    );

    // Estimate available space (simplified)
    let availableSpaceKB = this.MAX_CACHE_SIZE_KB - totalSizeKB;

    // Check if storage API is available for more accurate info
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        const usedMB = (estimate.usage || 0) / (1024 * 1024);
        const quotaMB = (estimate.quota || 0) / (1024 * 1024);
        availableSpaceKB = Math.max(0, (quotaMB - usedMB) * 1024);
      } catch (error) {
        console.warn('Storage estimation failed:', error);
      }
    }

    const syncQueue = await this.getSyncQueue();
    const lastSync = await this.getMetadata('lastSyncAt');

    return {
      totalArticles: articles.length,
      totalSizeKB,
      availableSpaceKB: Math.max(0, availableSpaceKB),
      lastSyncAt: lastSync?.value,
      syncPending: syncQueue.length,
      offlineDuration: this.isOnline
        ? 0
        : Date.now() - (lastSync?.timestamp || Date.now()),
    };
  }

  private async ensureCacheSpace(requiredKB: number): Promise<void> {
    const stats = await this.getCacheStatistics();

    if (stats.totalSizeKB + requiredKB > this.MAX_CACHE_SIZE_KB) {
      // Remove least recently accessed articles
      const articles = await this.getAllCachedArticles();
      articles.sort(
        (a, b) =>
          new Date(a.lastAccessedAt).getTime() -
          new Date(b.lastAccessedAt).getTime(),
      );

      let freedKB = 0;
      for (const article of articles) {
        if (freedKB >= requiredKB) break;
        await this.removeArticle(article.id);
        freedKB += article.sizeKB;
      }
    }
  }

  async addToSyncQueue(
    item: Omit<SyncQueueItem, 'timestamp' | 'retryCount'>,
  ): Promise<void> {
    if (!this.db) await this.initDB();

    const transaction = this.db!.transaction(['syncQueue'], 'readwrite');
    const store = transaction.objectStore('syncQueue');

    const queueItem: SyncQueueItem = {
      ...item,
      timestamp: new Date().toISOString(),
      retryCount: 0,
    };

    await new Promise<void>((resolve, reject) => {
      const request = store.put(queueItem);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    if (this.isOnline) {
      this.processSyncQueue();
    }
  }

  async getSyncQueue(): Promise<SyncQueueItem[]> {
    if (!this.db) await this.initDB();

    const transaction = this.db!.transaction(['syncQueue'], 'readonly');
    const store = transaction.objectStore('syncQueue');

    return new Promise<SyncQueueItem[]>((resolve) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => resolve([]);
    });
  }

  private async processSyncQueue(): Promise<void> {
    if (!this.isOnline) return;

    const queue = await this.getSyncQueue();

    for (const item of queue) {
      try {
        await this.processSyncItem(item);
        await this.removeSyncItem(item.id);
      } catch (error) {
        console.error('Sync item failed:', item, error);
        // Could implement retry logic here
      }
    }

    await this.setMetadata('lastSyncAt', new Date().toISOString());
  }

  private async processSyncItem(item: SyncQueueItem): Promise<void> {
    // This would integrate with your actual API
    // For now, we'll simulate the sync process
    switch (item.action) {
      case 'download':
        // Simulate downloading article from API
        break;
      case 'update':
        // Simulate updating cached article
        break;
      case 'delete':
        // Simulate confirming deletion with server
        break;
    }
  }

  private async removeSyncItem(itemId: string): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(['syncQueue'], 'readwrite');
    const store = transaction.objectStore('syncQueue');

    await new Promise<void>((resolve) => {
      const request = store.delete(itemId);
      request.onsuccess = () => resolve();
      request.onerror = () => resolve(); // Don't fail if item doesn't exist
    });
  }

  private async setMetadata(key: string, value: any): Promise<void> {
    if (!this.db) await this.initDB();

    const transaction = this.db!.transaction(['metadata'], 'readwrite');
    const store = transaction.objectStore('metadata');

    await new Promise<void>((resolve) => {
      const request = store.put({ key, value, timestamp: Date.now() });
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
    });
  }

  private async getMetadata(
    key: string,
  ): Promise<{ value: any; timestamp: number } | null> {
    if (!this.db) await this.initDB();

    const transaction = this.db!.transaction(['metadata'], 'readonly');
    const store = transaction.objectStore('metadata');

    return new Promise((resolve) => {
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(null);
    });
  }

  isNetworkOnline(): boolean {
    return this.isOnline;
  }

  async clearCache(): Promise<void> {
    if (!this.db) await this.initDB();

    const transaction = this.db!.transaction(
      ['articles', 'syncQueue'],
      'readwrite',
    );
    const articlesStore = transaction.objectStore('articles');
    const syncStore = transaction.objectStore('syncQueue');

    await Promise.all([
      new Promise<void>((resolve) => {
        const request = articlesStore.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => resolve();
      }),
      new Promise<void>((resolve) => {
        const request = syncStore.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => resolve();
      }),
    ]);

    // Clear service worker cache
    if ('caches' in window) {
      const cache = await caches.open(this.CACHE_NAME);
      const requests = await cache.keys();
      await Promise.all(requests.map((request) => cache.delete(request)));
    }
  }
}

export function OfflineKnowledge({
  onArticleRequest,
  onCacheUpdate,
  maxCacheSizeKB = 50 * 1024, // 50MB default
  className,
}: OfflineKnowledgeProps) {
  const { toast } = useToast();
  const haptic = useHapticFeedback();

  // State
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [cacheStats, setCacheStats] = useState<CacheStatistics>({
    totalArticles: 0,
    totalSizeKB: 0,
    availableSpaceKB: maxCacheSizeKB,
    syncPending: 0,
    offlineDuration: 0,
  });
  const [cachedArticles, setCachedArticles] = useState<CachedArticle[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Refs
  const cacheManager = useRef<KnowledgeCacheManager | null>(null);
  const updateInterval = useRef<NodeJS.Timeout | null>(null);

  // Initialize cache manager
  useEffect(() => {
    cacheManager.current = new KnowledgeCacheManager(maxCacheSizeKB);

    // Initial data load
    loadCacheData();

    // Setup network listeners
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Setup periodic updates
    updateInterval.current = setInterval(loadCacheData, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (updateInterval.current) {
        clearInterval(updateInterval.current);
      }
    };
  }, [maxCacheSizeKB]);

  // Load cache data
  const loadCacheData = useCallback(async () => {
    if (!cacheManager.current) return;

    try {
      const [stats, articles] = await Promise.all([
        cacheManager.current.getCacheStatistics(),
        cacheManager.current.getAllCachedArticles(),
      ]);

      setCacheStats(stats);
      setCachedArticles(articles);
      onCacheUpdate?.(stats);
    } catch (error) {
      console.error('Failed to load cache data:', error);
    }
  }, [onCacheUpdate]);

  // Download article for offline access
  const downloadArticle = useCallback(
    async (articleId: string) => {
      if (!cacheManager.current || !onArticleRequest) return;

      setIsLoading(true);
      haptic.light();

      try {
        const article = await onArticleRequest(articleId);
        if (article) {
          await cacheManager.current.cacheArticle(article);
          await loadCacheData();

          toast({
            title: 'Article downloaded',
            description: 'Now available offline',
          });
          haptic.success();
        }
      } catch (error) {
        console.error('Download failed:', error);
        toast({
          title: 'Download failed',
          description: 'Please try again',
          variant: 'destructive',
        });
        haptic.error();
      } finally {
        setIsLoading(false);
      }
    },
    [onArticleRequest, loadCacheData, toast, haptic],
  );

  // Remove article from cache
  const removeArticle = useCallback(
    async (articleId: string) => {
      if (!cacheManager.current) return;

      haptic.light();

      try {
        await cacheManager.current.removeArticle(articleId);
        await loadCacheData();

        toast({
          title: 'Article removed',
          description: 'Freed up storage space',
        });
      } catch (error) {
        console.error('Remove failed:', error);
        toast({
          title: 'Remove failed',
          description: 'Please try again',
          variant: 'destructive',
        });
        haptic.error();
      }
    },
    [loadCacheData, toast, haptic],
  );

  // Sync with server
  const syncWithServer = useCallback(async () => {
    if (!cacheManager.current || !isOnline) return;

    setIsSyncing(true);
    haptic.medium();

    try {
      // This would implement actual sync logic
      await new Promise((resolve) => setTimeout(resolve, 1500)); // Simulate sync
      await loadCacheData();

      toast({
        title: 'Sync complete',
        description: 'All articles are up to date',
      });
      haptic.success();
    } catch (error) {
      console.error('Sync failed:', error);
      toast({
        title: 'Sync failed',
        description: 'Please try again',
        variant: 'destructive',
      });
      haptic.error();
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, loadCacheData, toast, haptic]);

  // Clear all cache
  const clearAllCache = useCallback(async () => {
    if (!cacheManager.current) return;

    haptic.medium();

    try {
      await cacheManager.current.clearCache();
      await loadCacheData();

      toast({
        title: 'Cache cleared',
        description: 'All offline articles removed',
      });
    } catch (error) {
      console.error('Clear cache failed:', error);
      toast({
        title: 'Clear failed',
        description: 'Please try again',
        variant: 'destructive',
      });
      haptic.error();
    }
  }, [loadCacheData, toast, haptic]);

  // Format bytes to readable size
  const formatBytes = useCallback((kb: number) => {
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    if (mb < 1024) return `${mb.toFixed(1)} MB`;
    return `${(mb / 1024).toFixed(1)} GB`;
  }, []);

  // Format duration
  const formatDuration = useCallback((ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }, []);

  // Group articles by category
  const articlesByCategory = useMemo(() => {
    const grouped = cachedArticles.reduce(
      (acc, article) => {
        const category = article.category || 'Other';
        if (!acc[category]) acc[category] = [];
        acc[category].push(article);
        return acc;
      },
      {} as Record<string, CachedArticle[]>,
    );

    return Object.entries(grouped);
  }, [cachedArticles]);

  const TOUCH_TARGET_SIZE = 48;

  return (
    <div className={cn('offline-knowledge bg-white', className)}>
      <PullToRefresh onRefresh={loadCacheData} disabled={isLoading}>
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 z-20">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Offline Knowledge
                </h1>
                <div className="flex items-center mt-1">
                  {isOnline ? (
                    <>
                      <WifiIcon className="w-4 h-4 text-green-600 mr-1" />
                      <span className="text-sm text-green-600">Online</span>
                    </>
                  ) : (
                    <>
                      <WifiOffIcon className="w-4 h-4 text-red-600 mr-1" />
                      <span className="text-sm text-red-600">Offline</span>
                      {cacheStats.offlineDuration > 0 && (
                        <span className="text-xs text-gray-500 ml-2">
                          for {formatDuration(cacheStats.offlineDuration)}
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>

              <button
                onClick={() => setShowDetails(true)}
                className={cn(
                  'p-2 rounded-lg bg-gray-100 transition-all active:scale-95',
                  `min-w-[${TOUCH_TARGET_SIZE}px] min-h-[${TOUCH_TARGET_SIZE}px]`,
                )}
              >
                <DatabaseIcon className="w-6 h-6 text-gray-600" />
              </button>
            </div>

            {/* Cache Stats Overview */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-600">Articles Cached</p>
                    <p className="text-2xl font-bold text-blue-900">
                      {cacheStats.totalArticles}
                    </p>
                  </div>
                  <StorageIcon className="w-8 h-8 text-blue-600" />
                </div>
              </div>

              <div className="bg-green-50 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-600">Storage Used</p>
                    <p className="text-2xl font-bold text-green-900">
                      {formatBytes(cacheStats.totalSizeKB)}
                    </p>
                  </div>
                  <DatabaseIcon className="w-8 h-8 text-green-600" />
                </div>
              </div>
            </div>

            {/* Sync Status */}
            {(cacheStats.syncPending > 0 || !isOnline) && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {!isOnline ? (
                      <CloudOffIcon className="w-5 h-5 text-yellow-600 mr-2" />
                    ) : (
                      <SyncIcon className="w-5 h-5 text-yellow-600 mr-2" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-yellow-800">
                        {!isOnline
                          ? 'Working offline'
                          : `${cacheStats.syncPending} items to sync`}
                      </p>
                      <p className="text-xs text-yellow-600">
                        {!isOnline
                          ? 'Changes will sync when back online'
                          : 'Sync when ready'}
                      </p>
                    </div>
                  </div>

                  {isOnline && cacheStats.syncPending > 0 && (
                    <button
                      onClick={syncWithServer}
                      disabled={isSyncing}
                      className={cn(
                        'px-3 py-2 bg-yellow-600 text-white rounded-lg text-sm font-medium',
                        'transition-all active:scale-95 disabled:opacity-50',
                        `min-h-[${TOUCH_TARGET_SIZE - 8}px]`,
                      )}
                    >
                      {isSyncing ? (
                        <>
                          <RefreshCwIcon className="w-4 h-4 animate-spin inline mr-1" />
                          Syncing...
                        </>
                      ) : (
                        'Sync Now'
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Cached Articles */}
        <div className="p-4">
          {articlesByCategory.length === 0 ? (
            <div className="text-center py-12">
              <CloudOffIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No offline articles
              </h3>
              <p className="text-gray-600 mb-4">
                Download articles to access them offline
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {articlesByCategory.map(([category, articles]) => (
                <div key={category}>
                  <button
                    onClick={() =>
                      setSelectedCategory(
                        selectedCategory === category ? null : category,
                      )
                    }
                    className={cn(
                      'w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg',
                      'transition-all active:scale-95',
                      `min-h-[${TOUCH_TARGET_SIZE}px]`,
                    )}
                  >
                    <div className="flex items-center">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {category}
                      </h3>
                      <span className="ml-2 px-2 py-1 bg-gray-200 text-gray-600 rounded-full text-sm">
                        {articles.length}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">
                        {formatBytes(
                          articles.reduce((sum, a) => sum + a.sizeKB, 0),
                        )}
                      </span>
                    </div>
                  </button>

                  {(selectedCategory === category ||
                    selectedCategory === null) && (
                    <div className="mt-3 space-y-2">
                      {articles.map((article) => (
                        <div
                          key={article.id}
                          className="bg-white border border-gray-200 rounded-lg p-4"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900 mb-1">
                                {article.title}
                              </h4>
                              <div className="flex items-center text-xs text-gray-500 space-x-4">
                                <span className="flex items-center">
                                  <ClockIcon className="w-3 h-3 mr-1" />
                                  Cached{' '}
                                  {new Date(
                                    article.cachedAt,
                                  ).toLocaleDateString()}
                                </span>
                                <span>{formatBytes(article.sizeKB)}</span>
                                <span
                                  className={cn(
                                    'px-2 py-1 rounded-full text-xs font-medium',
                                    article.priority === 'high' &&
                                      'bg-red-100 text-red-700',
                                    article.priority === 'medium' &&
                                      'bg-yellow-100 text-yellow-700',
                                    article.priority === 'low' &&
                                      'bg-green-100 text-green-700',
                                  )}
                                >
                                  {article.priority}
                                </span>
                              </div>
                            </div>

                            <button
                              onClick={() => removeArticle(article.id)}
                              className={cn(
                                'p-2 rounded-lg bg-red-50 text-red-600 transition-all active:scale-95',
                                `min-w-[${TOUCH_TARGET_SIZE - 16}px] min-h-[${TOUCH_TARGET_SIZE - 16}px]`,
                              )}
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cache Details Bottom Sheet */}
        <BottomSheet
          isOpen={showDetails}
          onClose={() => setShowDetails(false)}
          snapPoints={[0.6, 0.9]}
        >
          <div className="p-4">
            <h2 className="text-lg font-semibold mb-4">Cache Details</h2>

            <div className="space-y-6">
              {/* Storage Info */}
              <div>
                <h3 className="font-medium mb-3">Storage Usage</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Used Space:</span>
                    <span className="font-medium">
                      {formatBytes(cacheStats.totalSizeKB)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Available Space:</span>
                    <span className="font-medium">
                      {formatBytes(cacheStats.availableSpaceKB)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Total Articles:</span>
                    <span className="font-medium">
                      {cacheStats.totalArticles}
                    </span>
                  </div>

                  {/* Storage Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, (cacheStats.totalSizeKB / maxCacheSizeKB) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Sync Status */}
              <div>
                <h3 className="font-medium mb-3">Sync Status</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Network Status:</span>
                    <span
                      className={cn(
                        'flex items-center font-medium',
                        isOnline ? 'text-green-600' : 'text-red-600',
                      )}
                    >
                      {isOnline ? (
                        <>
                          <WifiIcon className="w-4 h-4 mr-1" />
                          Online
                        </>
                      ) : (
                        <>
                          <WifiOffIcon className="w-4 h-4 mr-1" />
                          Offline
                        </>
                      )}
                    </span>
                  </div>

                  {cacheStats.lastSyncAt && (
                    <div className="flex justify-between text-sm">
                      <span>Last Sync:</span>
                      <span className="font-medium">
                        {new Date(cacheStats.lastSyncAt).toLocaleString()}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between text-sm">
                    <span>Pending Sync:</span>
                    <span className="font-medium">
                      {cacheStats.syncPending} items
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <button
                  onClick={syncWithServer}
                  disabled={!isOnline || isSyncing}
                  className={cn(
                    'w-full py-3 bg-blue-600 text-white rounded-lg font-medium',
                    'transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed',
                    'flex items-center justify-center space-x-2',
                    `min-h-[${TOUCH_TARGET_SIZE}px]`,
                  )}
                >
                  {isSyncing ? (
                    <>
                      <RefreshCwIcon className="w-5 h-5 animate-spin" />
                      <span>Syncing...</span>
                    </>
                  ) : (
                    <>
                      <SyncIcon className="w-5 h-5" />
                      <span>Sync Now</span>
                    </>
                  )}
                </button>

                <button
                  onClick={clearAllCache}
                  className={cn(
                    'w-full py-3 bg-red-600 text-white rounded-lg font-medium',
                    'transition-all active:scale-95',
                    'flex items-center justify-center space-x-2',
                    `min-h-[${TOUCH_TARGET_SIZE}px]`,
                  )}
                >
                  <TrashIcon className="w-5 h-5" />
                  <span>Clear All Cache</span>
                </button>
              </div>
            </div>
          </div>
        </BottomSheet>
      </PullToRefresh>
    </div>
  );
}
