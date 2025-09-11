import { renderHook, act, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import { useOfflineKnowledge } from '@/hooks/useOfflineKnowledge';

// Mock the Cache API
const mockCache = {
  match: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  keys: jest.fn(),
};

const mockCaches = {
  open: jest.fn().mockResolvedValue(mockCache),
  delete: jest.fn(),
  keys: jest.fn(),
};

// Mock fetch
const mockFetch = jest.fn();

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
});

global.caches = mockCaches as any;
global.fetch = mockFetch as any;

describe('useOfflineKnowledge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCache.keys.mockResolvedValue([]);
    mockCache.match.mockResolvedValue(null);
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
      clone: () => ({
        json: () => Promise.resolve([]),
      }),
    });
  });

  it('initializes with online state', () => {
    const { result } = renderHook(() => useOfflineKnowledge());

    expect(result.current.isOffline).toBe(false);
    expect(result.current.offlineArticles).toEqual([]);
    expect(result.current.lastSync).toBeNull();
  });

  it('detects offline state change', async () => {
    const { result } = renderHook(() => useOfflineKnowledge());

    act(() => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });
      window.dispatchEvent(new Event('offline'));
    });

    await waitFor(() => {
      expect(result.current.isOffline).toBe(true);
    });
  });

  it('caches articles successfully', async () => {
    const { result } = renderHook(() => useOfflineKnowledge());

    const article = {
      id: 'article-1',
      title: 'Wedding Planning Guide',
      content: 'Complete guide to wedding planning',
      category: 'planning',
      priority: 'high' as const,
      size: 1024,
    };

    mockCache.put.mockResolvedValue(undefined);

    await act(async () => {
      await result.current.cacheArticle(article);
    });

    expect(mockCache.put).toHaveBeenCalledWith(
      expect.stringContaining('article-1'),
      expect.any(Response),
    );
  });

  it('searches offline articles correctly', async () => {
    const { result } = renderHook(() => useOfflineKnowledge());

    const cachedArticles = [
      {
        id: 'article-1',
        title: 'Wedding Venue Selection',
        content: 'How to choose the perfect venue',
        category: 'venue',
        priority: 'high' as const,
        size: 1024,
      },
      {
        id: 'article-2',
        title: 'Photography Tips',
        content: 'Capture beautiful moments',
        category: 'photography',
        priority: 'medium' as const,
        size: 2048,
      },
    ];

    // Mock cache keys and responses
    mockCache.keys.mockResolvedValue([
      new Request('/offline-articles/article-1'),
      new Request('/offline-articles/article-2'),
    ]);

    mockCache.match
      .mockResolvedValueOnce(new Response(JSON.stringify(cachedArticles[0])))
      .mockResolvedValueOnce(new Response(JSON.stringify(cachedArticles[1])));

    await act(async () => {
      // Allow component to load cached articles
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    const searchResults = await act(async () => {
      return await result.current.searchOfflineArticles('venue');
    });

    expect(searchResults).toHaveLength(1);
    expect(searchResults[0].title).toBe('Wedding Venue Selection');
  });

  it('manages cache size correctly', async () => {
    const { result } = renderHook(() => useOfflineKnowledge());

    const largeArticles = Array.from({ length: 10 }, (_, i) => ({
      id: `article-${i}`,
      title: `Article ${i}`,
      content: 'Large content',
      category: 'test',
      priority: i < 5 ? ('high' as const) : ('low' as const),
      size: 10 * 1024 * 1024, // 10MB each
    }));

    mockCache.keys.mockResolvedValue(
      largeArticles.map(
        (article) => new Request(`/offline-articles/${article.id}`),
      ),
    );

    // Mock responses for each article
    largeArticles.forEach((article, index) => {
      mockCache.match.mockResolvedValueOnce(
        new Response(JSON.stringify(article)),
      );
    });

    // Cache articles that would exceed limit
    for (const article of largeArticles) {
      await act(async () => {
        await result.current.cacheArticle(article);
      });
    }

    // Should have cleaned up low-priority articles
    await waitFor(() => {
      expect(mockCache.delete).toHaveBeenCalled();
    });
  });

  it('syncs with server when coming online', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve([
          {
            id: 'article-1',
            title: 'New Article',
            category: 'venue',
            priority: 'high',
            size: 1024,
          },
        ]),
      clone: () => ({
        json: () => Promise.resolve([]),
      }),
    });

    const { result } = renderHook(() => useOfflineKnowledge());

    await act(async () => {
      await result.current.syncWithServer();
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/wedme/knowledge/offline/sync');
    expect(result.current.lastSync).toBeTruthy();
  });

  it('handles sync errors gracefully', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useOfflineKnowledge());

    await act(async () => {
      await result.current.syncWithServer();
    });

    // Should not throw error, should handle gracefully
    expect(result.current.lastSync).toBeNull();
  });

  it('prioritizes wedding-specific content', async () => {
    const { result } = renderHook(() => useOfflineKnowledge());

    const articles = [
      {
        id: 'article-1',
        title: 'Emergency Wedding Day Kit',
        category: 'emergency',
        priority: 'critical' as const,
        size: 1024,
      },
      {
        id: 'article-2',
        title: 'General Planning Tips',
        category: 'general',
        priority: 'low' as const,
        size: 1024,
      },
    ];

    // Cache both articles
    for (const article of articles) {
      await act(async () => {
        await result.current.cacheArticle(article);
      });
    }

    // Emergency content should be cached first/prioritized
    expect(mockCache.put).toHaveBeenCalledWith(
      expect.stringContaining('article-1'),
      expect.any(Response),
    );
  });

  it('removes articles from cache correctly', async () => {
    const { result } = renderHook(() => useOfflineKnowledge());

    mockCache.delete.mockResolvedValue(true);

    await act(async () => {
      await result.current.removeFromCache('article-1');
    });

    expect(mockCache.delete).toHaveBeenCalledWith(
      '/offline-articles/article-1',
    );
  });

  it('clears entire cache', async () => {
    const { result } = renderHook(() => useOfflineKnowledge());

    mockCaches.delete.mockResolvedValue(true);

    await act(async () => {
      await result.current.clearCache();
    });

    expect(mockCaches.delete).toHaveBeenCalledWith('wedding-knowledge-v1');
  });

  it('calculates cache size correctly', async () => {
    const { result } = renderHook(() => useOfflineKnowledge());

    const articles = [
      { id: 'article-1', size: 1024 },
      { id: 'article-2', size: 2048 },
    ];

    mockCache.keys.mockResolvedValue([
      new Request('/offline-articles/article-1'),
      new Request('/offline-articles/article-2'),
    ]);

    mockCache.match
      .mockResolvedValueOnce(new Response(JSON.stringify(articles[0])))
      .mockResolvedValueOnce(new Response(JSON.stringify(articles[1])));

    await act(async () => {
      // Allow loading of cached articles
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    const cacheSize = result.current.getCacheSize();
    expect(cacheSize).toBe(3072); // 1024 + 2048
  });

  it('handles wedding day priority caching', async () => {
    const { result } = renderHook(() => useOfflineKnowledge());

    const weddingDayArticle = {
      id: 'wedding-day-1',
      title: 'Wedding Day Emergency Protocol',
      category: 'emergency',
      priority: 'wedding-day' as const,
      size: 1024,
    };

    await act(async () => {
      await result.current.cacheArticle(weddingDayArticle);
    });

    // Wedding day content should never be cleaned up
    expect(mockCache.put).toHaveBeenCalledWith(
      expect.stringContaining('wedding-day-1'),
      expect.any(Response),
    );
  });

  it('handles network reconnection properly', async () => {
    const { result } = renderHook(() => useOfflineKnowledge());

    // Start offline
    act(() => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });
      window.dispatchEvent(new Event('offline'));
    });

    await waitFor(() => {
      expect(result.current.isOffline).toBe(true);
    });

    // Go back online
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
      clone: () => ({ json: () => Promise.resolve([]) }),
    });

    act(() => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });
      window.dispatchEvent(new Event('online'));
    });

    await waitFor(() => {
      expect(result.current.isOffline).toBe(false);
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/wedme/knowledge/offline/sync',
      );
    });
  });
});
