'use client';

import { useState, useEffect, useCallback } from 'react';

interface OfflineArticle {
  id: string;
  slug: string;
  title: string;
  content: string;
  excerpt: string;
  category: string;
  tags: string[];
  weddingTimelineTags: string[];
  estimatedReadTime: number;
  helpful: number;
  cachedAt: string;
  priority: number;
}

interface OfflineKnowledgeState {
  isOffline: boolean;
  offlineArticles: OfflineArticle[];
  cacheSize: number;
  lastSync: Date | null;
  syncInProgress: boolean;
}

interface SyncProgress {
  total: number;
  synced: number;
  failed: number;
  currentItem: string;
}

const CACHE_NAME = 'wedme-knowledge-offline-v1';
const MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50MB limit
const PRIORITY_ARTICLES_COUNT = 20; // Always keep top 20 priority articles

export function useOfflineKnowledge() {
  const [state, setState] = useState<OfflineKnowledgeState>({
    isOffline: false,
    offlineArticles: [],
    cacheSize: 0,
    lastSync: null,
    syncInProgress: false,
  });

  const [syncProgress, setSyncProgress] = useState<SyncProgress>({
    total: 0,
    synced: 0,
    failed: 0,
    currentItem: '',
  });

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setState((prev) => ({ ...prev, isOffline: false }));
      // Auto-sync when coming back online
      syncWithServer();
    };

    const handleOffline = () => {
      setState((prev) => ({ ...prev, isOffline: true }));
    };

    // Event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial status
    setState((prev) => ({ ...prev, isOffline: !navigator.onLine }));

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load cached articles on mount
  useEffect(() => {
    loadCachedArticles();
    loadSyncMetadata();
  }, []);

  const loadCachedArticles = async () => {
    try {
      if (!('caches' in window)) {
        console.warn('Cache API not supported');
        return;
      }

      const cache = await caches.open(CACHE_NAME);
      const requests = await cache.keys();

      const articles: OfflineArticle[] = [];
      let totalSize = 0;

      for (const request of requests) {
        if (request.url.includes('/knowledge/articles/')) {
          try {
            const response = await cache.match(request);
            if (response) {
              const text = await response.text();
              const data = JSON.parse(text);
              articles.push(data);
              totalSize += text.length;
            }
          } catch (error) {
            console.error('Error loading cached article:', error);
          }
        }
      }

      // Sort by priority and cache date
      articles.sort((a, b) => {
        if (a.priority !== b.priority) {
          return a.priority - b.priority; // Lower priority number = higher priority
        }
        return new Date(b.cachedAt).getTime() - new Date(a.cachedAt).getTime();
      });

      setState((prev) => ({
        ...prev,
        offlineArticles: articles,
        cacheSize: totalSize,
      }));
    } catch (error) {
      console.error('Failed to load cached articles:', error);
    }
  };

  const loadSyncMetadata = () => {
    try {
      const lastSyncStr = localStorage.getItem('wedme-last-sync');
      const lastSync = lastSyncStr ? new Date(lastSyncStr) : null;

      setState((prev) => ({ ...prev, lastSync }));
    } catch (error) {
      console.error('Failed to load sync metadata:', error);
    }
  };

  const syncWithServer = useCallback(
    async (forceFullSync = false) => {
      if (state.syncInProgress || state.isOffline) return;

      setState((prev) => ({ ...prev, syncInProgress: true }));
      setSyncProgress({
        total: 0,
        synced: 0,
        failed: 0,
        currentItem: 'Initializing...',
      });

      try {
        // Get priority articles list from server
        const response = await fetch('/api/wedme/knowledge/offline-priority', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to get priority articles');
        }

        const { articles: priorityArticles } = await response.json();

        setSyncProgress((prev) => ({
          ...prev,
          total: priorityArticles.length,
          currentItem: 'Starting sync...',
        }));

        const cache = await caches.open(CACHE_NAME);
        let synced = 0;
        let failed = 0;

        // Cache priority articles
        for (const articleMeta of priorityArticles) {
          try {
            setSyncProgress((prev) => ({
              ...prev,
              currentItem: `Syncing: ${articleMeta.title}`,
            }));

            // Check if we need to update this article
            const cacheKey = `/api/wedme/knowledge/articles/${articleMeta.slug}`;
            const cachedResponse = await cache.match(cacheKey);

            let shouldUpdate = forceFullSync;
            if (!shouldUpdate && cachedResponse) {
              const cachedData = await cachedResponse.json();
              const cachedDate = new Date(cachedData.cachedAt);
              const serverDate = new Date(articleMeta.updatedAt);
              shouldUpdate = serverDate > cachedDate;
            } else {
              shouldUpdate = true;
            }

            if (shouldUpdate) {
              // Fetch full article content
              const articleResponse = await fetch(
                `/api/wedme/knowledge/articles/${articleMeta.slug}`,
              );

              if (articleResponse.ok) {
                const articleData = await articleResponse.json();

                // Add caching metadata
                const cacheData = {
                  ...articleData,
                  cachedAt: new Date().toISOString(),
                  priority: articleMeta.priority || 10,
                  cacheVersion: 1,
                };

                // Store in cache
                const cacheResponse = new Response(JSON.stringify(cacheData), {
                  headers: { 'Content-Type': 'application/json' },
                });

                await cache.put(cacheKey, cacheResponse);
                synced++;
              } else {
                failed++;
              }
            }

            setSyncProgress((prev) => ({
              ...prev,
              synced: synced,
              failed: failed,
            }));
          } catch (error) {
            console.error(`Failed to sync article ${articleMeta.slug}:`, error);
            failed++;
            setSyncProgress((prev) => ({ ...prev, failed: failed }));
          }
        }

        // Cleanup old articles if cache is too large
        await cleanupCache();

        // Update sync timestamp
        const now = new Date();
        localStorage.setItem('wedme-last-sync', now.toISOString());

        setState((prev) => ({
          ...prev,
          lastSync: now,
          syncInProgress: false,
        }));

        // Reload cached articles
        await loadCachedArticles();

        setSyncProgress((prev) => ({
          ...prev,
          currentItem: 'Sync completed!',
        }));
      } catch (error) {
        console.error('Sync failed:', error);
        setState((prev) => ({ ...prev, syncInProgress: false }));
        setSyncProgress((prev) => ({
          ...prev,
          currentItem: 'Sync failed',
        }));
      }
    },
    [state.syncInProgress, state.isOffline],
  );

  const cleanupCache = async () => {
    try {
      const cache = await caches.open(CACHE_NAME);
      const requests = await cache.keys();

      // Calculate current cache size and get articles
      const articleRequests = requests.filter((req) =>
        req.url.includes('/knowledge/articles/'),
      );
      const articles: Array<{ request: Request; data: any; size: number }> = [];

      for (const request of articleRequests) {
        const response = await cache.match(request);
        if (response) {
          const text = await response.text();
          const data = JSON.parse(text);
          articles.push({ request, data, size: text.length });
        }
      }

      // Calculate total size
      const totalSize = articles.reduce(
        (sum, article) => sum + article.size,
        0,
      );

      if (totalSize <= MAX_CACHE_SIZE) return;

      // Sort articles by priority and cache date (keep high priority and recent)
      articles.sort((a, b) => {
        // Always keep priority articles (priority < 5)
        if (a.data.priority < 5 && b.data.priority >= 5) return -1;
        if (a.data.priority >= 5 && b.data.priority < 5) return 1;

        // For same priority level, keep newer articles
        if (a.data.priority === b.data.priority) {
          return (
            new Date(b.data.cachedAt).getTime() -
            new Date(a.data.cachedAt).getTime()
          );
        }

        return a.data.priority - b.data.priority;
      });

      // Remove articles from the end until we're under the size limit
      const toKeep = articles.slice(0, PRIORITY_ARTICLES_COUNT);
      let currentSize = toKeep.reduce((sum, article) => sum + article.size, 0);
      let keepIndex = PRIORITY_ARTICLES_COUNT;

      while (
        keepIndex < articles.length &&
        currentSize + articles[keepIndex].size <= MAX_CACHE_SIZE
      ) {
        currentSize += articles[keepIndex].size;
        keepIndex++;
      }

      // Remove articles we don't want to keep
      for (let i = keepIndex; i < articles.length; i++) {
        await cache.delete(articles[i].request);
      }
    } catch (error) {
      console.error('Cache cleanup failed:', error);
    }
  };

  const cacheArticle = async (article: Partial<OfflineArticle>) => {
    try {
      const cache = await caches.open(CACHE_NAME);
      const cacheData = {
        ...article,
        cachedAt: new Date().toISOString(),
        priority: article.priority || 10,
        cacheVersion: 1,
      };

      const response = new Response(JSON.stringify(cacheData), {
        headers: { 'Content-Type': 'application/json' },
      });

      await cache.put(
        `/api/wedme/knowledge/articles/${article.slug}`,
        response,
      );
      await loadCachedArticles();
      return true;
    } catch (error) {
      console.error('Failed to cache article:', error);
      return false;
    }
  };

  const removeCachedArticle = async (slug: string) => {
    try {
      const cache = await caches.open(CACHE_NAME);
      await cache.delete(`/api/wedme/knowledge/articles/${slug}`);
      await loadCachedArticles();
      return true;
    } catch (error) {
      console.error('Failed to remove cached article:', error);
      return false;
    }
  };

  const clearAllCache = async () => {
    try {
      await caches.delete(CACHE_NAME);
      localStorage.removeItem('wedme-last-sync');

      setState((prev) => ({
        ...prev,
        offlineArticles: [],
        cacheSize: 0,
        lastSync: null,
      }));

      return true;
    } catch (error) {
      console.error('Failed to clear cache:', error);
      return false;
    }
  };

  const searchOfflineArticles = async (
    query: string,
  ): Promise<OfflineArticle[]> => {
    const lowerQuery = query.toLowerCase();

    return state.offlineArticles
      .filter(
        (article) =>
          article.title.toLowerCase().includes(lowerQuery) ||
          article.content.toLowerCase().includes(lowerQuery) ||
          article.tags.some((tag) => tag.toLowerCase().includes(lowerQuery)) ||
          article.category.toLowerCase().includes(lowerQuery),
      )
      .sort((a, b) => {
        // Simple relevance scoring
        const aScore =
          (a.title.toLowerCase().includes(lowerQuery) ? 3 : 0) +
          (a.excerpt.toLowerCase().includes(lowerQuery) ? 2 : 0) +
          (a.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
            ? 1
            : 0);

        const bScore =
          (b.title.toLowerCase().includes(lowerQuery) ? 3 : 0) +
          (b.excerpt.toLowerCase().includes(lowerQuery) ? 2 : 0) +
          (b.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
            ? 1
            : 0);

        return bScore - aScore;
      });
  };

  return {
    ...state,
    syncProgress,
    syncWithServer,
    cacheArticle,
    removeCachedArticle,
    clearAllCache,
    searchOfflineArticles,
    loadCachedArticles,
  };
}
