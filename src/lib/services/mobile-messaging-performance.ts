/**
 * Mobile Messaging Performance Optimization Service
 * WS-155: Guest Communications - Round 3
 * Ensures sub-second load times and optimal mobile performance
 */

import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { supabase } from '@/lib/supabase';

interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  apiResponseTime: number;
  cacheHitRate: number;
  memoryUsage: number;
}

interface CacheConfig {
  ttl: number;
  maxSize: number;
  strategy: 'lru' | 'fifo' | 'lfu';
}

export class MobileMessagingPerformance {
  private static instance: MobileMessagingPerformance;
  private performanceCache: Map<string, any> = new Map();
  private metrics: PerformanceMetrics[] = [];
  private cacheConfig: CacheConfig = {
    ttl: 300000, // 5 minutes
    maxSize: 50, // Max 50 cached items
    strategy: 'lru',
  };

  private constructor() {
    this.initializePerformanceOptimizations();
  }

  static getInstance(): MobileMessagingPerformance {
    if (!this.instance) {
      this.instance = new MobileMessagingPerformance();
    }
    return this.instance;
  }

  private initializePerformanceOptimizations() {
    // Enable request coalescing
    this.enableRequestCoalescing();

    // Initialize service worker for offline caching
    this.initializeServiceWorker();

    // Set up memory monitoring
    this.setupMemoryMonitoring();

    // Configure image lazy loading
    this.configureImageOptimization();
  }

  /**
   * Optimized message list loading with pagination and caching
   */
  async loadMessages(
    userId: string,
    page: number = 1,
    pageSize: number = 20,
  ): Promise<{ messages: any[]; loadTime: number }> {
    const startTime = performance.now();
    const cacheKey = `messages_${userId}_${page}_${pageSize}`;

    // Check cache first
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      const loadTime = performance.now() - startTime;
      this.recordMetric('loadTime', loadTime);
      return { messages: cached, loadTime };
    }

    // Optimized query with minimal data fetching
    const { data, error } = await supabase
      .from('guest_messages')
      .select(
        `
        id,
        subject,
        preview,
        sent_at,
        read,
        sender:sender_id(name, avatar_url),
        priority
      `,
      )
      .eq('recipient_id', userId)
      .order('sent_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (error) {
      console.error('Error loading messages:', error);
      return { messages: [], loadTime: -1 };
    }

    // Cache the results
    this.setCache(cacheKey, data);

    const loadTime = performance.now() - startTime;
    this.recordMetric('loadTime', loadTime);

    // Ensure sub-second load time
    if (loadTime > 1000) {
      console.warn(`Message load time exceeded 1 second: ${loadTime}ms`);
      this.optimizeFutureLoads(userId);
    }

    return { messages: data || [], loadTime };
  }

  /**
   * Lazy load message content for improved initial load
   */
  async loadMessageContent(
    messageId: string,
  ): Promise<{ content: string; loadTime: number }> {
    const startTime = performance.now();
    const cacheKey = `message_content_${messageId}`;

    const cached = this.getFromCache(cacheKey);
    if (cached) {
      const loadTime = performance.now() - startTime;
      return { content: cached, loadTime };
    }

    const { data, error } = await supabase
      .from('guest_messages')
      .select('content')
      .eq('id', messageId)
      .single();

    if (error) {
      console.error('Error loading message content:', error);
      return { content: '', loadTime: -1 };
    }

    this.setCache(cacheKey, data.content);
    const loadTime = performance.now() - startTime;

    return { content: data.content, loadTime };
  }

  /**
   * Prefetch next page of messages for instant loading
   */
  async prefetchNextPage(
    userId: string,
    currentPage: number,
    pageSize: number = 20,
  ) {
    const nextPage = currentPage + 1;
    const cacheKey = `messages_${userId}_${nextPage}_${pageSize}`;

    // Don't prefetch if already cached
    if (this.getFromCache(cacheKey)) {
      return;
    }

    // Prefetch in background
    requestIdleCallback(() => {
      this.loadMessages(userId, nextPage, pageSize);
    });
  }

  /**
   * Enable request coalescing to prevent duplicate API calls
   */
  private enableRequestCoalescing() {
    const pendingRequests = new Map<string, Promise<any>>();

    const originalFetch = global.fetch;
    global.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const key = typeof input === 'string' ? input : input.toString();

      // Check if request is already pending
      if (pendingRequests.has(key)) {
        return pendingRequests.get(key)!;
      }

      // Create new request promise
      const promise = originalFetch(input, init).finally(() => {
        pendingRequests.delete(key);
      });

      pendingRequests.set(key, promise);
      return promise;
    };
  }

  /**
   * Initialize service worker for offline caching
   */
  private initializeServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/messaging-sw.js')
        .then((reg) => console.log('Service Worker registered for messaging'))
        .catch((err) =>
          console.error('Service Worker registration failed:', err),
        );
    }
  }

  /**
   * Setup memory monitoring to prevent memory leaks
   */
  private setupMemoryMonitoring() {
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
        const usedMemory = memory.usedJSHeapSize / 1048576; // Convert to MB

        if (usedMemory > 100) {
          // If using more than 100MB
          console.warn('High memory usage detected:', usedMemory, 'MB');
          this.clearOldCache();
        }

        this.recordMetric('memoryUsage', usedMemory);
      }, 30000); // Check every 30 seconds
    }
  }

  /**
   * Configure image optimization for avatars and attachments
   */
  private configureImageOptimization() {
    // Use Intersection Observer for lazy loading
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            if (img.dataset.src) {
              img.src = img.dataset.src;
              imageObserver.unobserve(img);
            }
          }
        });
      });

      // Observe all lazy-load images
      document.querySelectorAll('img[data-lazy]').forEach((img) => {
        imageObserver.observe(img);
      });
    }
  }

  /**
   * Optimize future loads based on performance metrics
   */
  private optimizeFutureLoads(userId: string) {
    // Reduce page size if load times are consistently slow
    const recentMetrics = this.metrics.slice(-10);
    const avgLoadTime =
      recentMetrics.reduce((sum, m) => sum + m.loadTime, 0) /
      recentMetrics.length;

    if (avgLoadTime > 800) {
      // Reduce cache TTL to keep data fresh
      this.cacheConfig.ttl = Math.max(60000, this.cacheConfig.ttl - 30000);

      // Prefetch critical data
      this.prefetchCriticalData(userId);
    }
  }

  /**
   * Prefetch critical data for improved performance
   */
  private async prefetchCriticalData(userId: string) {
    // Prefetch unread message count
    supabase
      .from('guest_messages')
      .select('id', { count: 'exact' })
      .eq('recipient_id', userId)
      .eq('read', false)
      .then(({ count }) => {
        this.setCache(`unread_count_${userId}`, count);
      });

    // Prefetch recent conversations
    supabase
      .from('guest_conversations')
      .select('id, last_message_at, participant_count')
      .eq('user_id', userId)
      .order('last_message_at', { ascending: false })
      .limit(5)
      .then(({ data }) => {
        this.setCache(`recent_conversations_${userId}`, data);
      });
  }

  /**
   * Get data from cache with TTL check
   */
  private getFromCache(key: string): any | null {
    const cached = this.performanceCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheConfig.ttl) {
      return cached.data;
    }
    return null;
  }

  /**
   * Set data in cache with LRU eviction
   */
  private setCache(key: string, data: any) {
    if (this.performanceCache.size >= this.cacheConfig.maxSize) {
      // Remove least recently used item
      const firstKey = this.performanceCache.keys().next().value;
      this.performanceCache.delete(firstKey);
    }

    this.performanceCache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Clear old cache entries
   */
  private clearOldCache() {
    const now = Date.now();
    for (const [key, value] of this.performanceCache.entries()) {
      if (now - value.timestamp > this.cacheConfig.ttl) {
        this.performanceCache.delete(key);
      }
    }
  }

  /**
   * Record performance metric
   */
  private recordMetric(type: keyof PerformanceMetrics, value: number) {
    const metric: PerformanceMetrics = {
      loadTime: 0,
      renderTime: 0,
      apiResponseTime: 0,
      cacheHitRate: 0,
      memoryUsage: 0,
    };
    metric[type] = value;

    this.metrics.push(metric);

    // Keep only last 100 metrics
    if (this.metrics.length > 100) {
      this.metrics.shift();
    }
  }

  /**
   * Get performance report
   */
  getPerformanceReport(): {
    averageLoadTime: number;
    p95LoadTime: number;
    cacheHitRate: number;
    memoryUsage: number;
  } {
    const loadTimes = this.metrics
      .filter((m) => m.loadTime > 0)
      .map((m) => m.loadTime)
      .sort((a, b) => a - b);

    const avgLoadTime =
      loadTimes.reduce((sum, t) => sum + t, 0) / loadTimes.length || 0;
    const p95Index = Math.floor(loadTimes.length * 0.95);
    const p95LoadTime = loadTimes[p95Index] || 0;

    const cacheHits = this.metrics.filter((m) => m.cacheHitRate > 0).length;
    const cacheHitRate = (cacheHits / this.metrics.length) * 100 || 0;

    const memoryUsages = this.metrics.filter((m) => m.memoryUsage > 0);
    const avgMemory =
      memoryUsages.reduce((sum, m) => sum + m.memoryUsage, 0) /
        memoryUsages.length || 0;

    return {
      averageLoadTime: avgLoadTime,
      p95LoadTime: p95LoadTime,
      cacheHitRate: cacheHitRate,
      memoryUsage: avgMemory,
    };
  }
}

// Export singleton instance
export const mobilePerformance = MobileMessagingPerformance.getInstance();

// Next.js specific caching for server components
export const getCachedMessages = unstable_cache(
  async (userId: string, page: number) => {
    const perf = MobileMessagingPerformance.getInstance();
    return perf.loadMessages(userId, page);
  },
  ['messages'],
  { revalidate: 60 },
);
