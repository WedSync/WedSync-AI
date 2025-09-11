// Performance Optimization Utilities for WedMe Platform
import { WeddingFile, CoupleProfile } from '@/types/wedme/file-management';

// Image optimization utilities
export class ImageOptimizer {
  private static readonly QUALITY_SETTINGS = {
    thumbnail: { quality: 60, maxWidth: 200, maxHeight: 200 },
    preview: { quality: 75, maxWidth: 800, maxHeight: 600 },
    full: { quality: 85, maxWidth: 1920, maxHeight: 1080 },
    mobile: { quality: 70, maxWidth: 414, maxHeight: 896 },
  };

  static async optimizeImage(
    file: File,
    type: 'thumbnail' | 'preview' | 'full' | 'mobile' = 'preview',
  ): Promise<{
    optimized: Blob;
    metadata: { originalSize: number; newSize: number; compression: number };
  }> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        const settings = this.QUALITY_SETTINGS[type];
        const { width, height } = this.calculateDimensions(
          img,
          settings.maxWidth,
          settings.maxHeight,
        );

        canvas.width = width;
        canvas.height = height;

        // Apply optimizations
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);
        }

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compression = ((file.size - blob.size) / file.size) * 100;
              resolve({
                optimized: blob,
                metadata: {
                  originalSize: file.size,
                  newSize: blob.size,
                  compression: Math.round(compression),
                },
              });
            } else {
              reject(new Error('Failed to optimize image'));
            }
          },
          'image/jpeg',
          settings.quality / 100,
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  static generateResponsiveSizes(
    originalFile: File,
  ): Promise<{ [key: string]: { blob: Blob; size: number } }> {
    const sizes: Promise<{ [key: string]: { blob: Blob; size: number } }>[] =
      [];

    return Promise.all([
      this.optimizeImage(originalFile, 'thumbnail'),
      this.optimizeImage(originalFile, 'mobile'),
      this.optimizeImage(originalFile, 'preview'),
      this.optimizeImage(originalFile, 'full'),
    ]).then((results) => ({
      thumbnail: {
        blob: results[0].optimized,
        size: results[0].optimized.size,
      },
      mobile: { blob: results[1].optimized, size: results[1].optimized.size },
      preview: { blob: results[2].optimized, size: results[2].optimized.size },
      full: { blob: results[3].optimized, size: results[3].optimized.size },
    }));
  }

  private static calculateDimensions(
    img: HTMLImageElement,
    maxWidth: number,
    maxHeight: number,
  ): { width: number; height: number } {
    let { width, height } = img;

    if (width > maxWidth) {
      height = (height * maxWidth) / width;
      width = maxWidth;
    }

    if (height > maxHeight) {
      width = (width * maxHeight) / height;
      height = maxHeight;
    }

    return { width: Math.round(width), height: Math.round(height) };
  }
}

// Lazy loading utilities
export class LazyLoader {
  private observer: IntersectionObserver;
  private targets: Map<Element, () => void>;

  constructor(options: IntersectionObserverInit = {}) {
    this.targets = new Map();
    this.observer = new IntersectionObserver(
      this.handleIntersection.bind(this),
      {
        rootMargin: '50px',
        threshold: 0.1,
        ...options,
      },
    );
  }

  observe(element: Element, callback: () => void): void {
    this.targets.set(element, callback);
    this.observer.observe(element);
  }

  unobserve(element: Element): void {
    this.targets.delete(element);
    this.observer.unobserve(element);
  }

  disconnect(): void {
    this.observer.disconnect();
    this.targets.clear();
  }

  private handleIntersection(entries: IntersectionObserverEntry[]): void {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const callback = this.targets.get(entry.target);
        if (callback) {
          callback();
          this.unobserve(entry.target);
        }
      }
    });
  }
}

// Progressive loading for large datasets
export class ProgressiveLoader<T> {
  private items: T[];
  private pageSize: number;
  private currentPage: number;
  private isLoading: boolean;

  constructor(items: T[], pageSize: number = 20) {
    this.items = items;
    this.pageSize = pageSize;
    this.currentPage = 0;
    this.isLoading = false;
  }

  getNextPage(): { items: T[]; hasMore: boolean; totalPages: number } {
    if (this.isLoading) {
      return { items: [], hasMore: false, totalPages: this.getTotalPages() };
    }

    this.isLoading = true;
    const startIndex = this.currentPage * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    const pageItems = this.items.slice(startIndex, endIndex);

    this.currentPage++;
    this.isLoading = false;

    return {
      items: pageItems,
      hasMore: endIndex < this.items.length,
      totalPages: this.getTotalPages(),
    };
  }

  reset(): void {
    this.currentPage = 0;
    this.isLoading = false;
  }

  private getTotalPages(): number {
    return Math.ceil(this.items.length / this.pageSize);
  }
}

// Memory management utilities
export class MemoryManager {
  private static cache = new Map<
    string,
    { data: any; timestamp: number; ttl: number }
  >();
  private static maxCacheSize = 100;

  static set(key: string, data: any, ttlMs: number = 300000): void {
    // 5 minutes default
    // Clean up old entries if cache is full
    if (this.cache.size >= this.maxCacheSize) {
      this.cleanup();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
    });
  }

  static get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  static clear(): void {
    this.cache.clear();
  }

  private static cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > entry.ttl) {
        expiredKeys.push(key);
      }
    });

    expiredKeys.forEach((key) => this.cache.delete(key));

    // If still full, remove oldest entries
    if (this.cache.size >= this.maxCacheSize) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

      for (let i = 0; i < entries.length - this.maxCacheSize + 10; i++) {
        this.cache.delete(entries[i][0]);
      }
    }
  }
}

// Performance monitoring
export class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();

  startTimer(label: string): () => void {
    const start = performance.now();

    return () => {
      const duration = performance.now() - start;
      this.recordMetric(label, duration);
    };
  }

  recordMetric(label: string, value: number): void {
    if (!this.metrics.has(label)) {
      this.metrics.set(label, []);
    }

    const values = this.metrics.get(label)!;
    values.push(value);

    // Keep only last 100 measurements
    if (values.length > 100) {
      values.shift();
    }
  }

  getMetrics(
    label: string,
  ): { avg: number; min: number; max: number; count: number } | null {
    const values = this.metrics.get(label);
    if (!values || values.length === 0) return null;

    return {
      avg: values.reduce((sum, val) => sum + val, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      count: values.length,
    };
  }

  getAllMetrics(): {
    [label: string]: ReturnType<PerformanceMonitor['getMetrics']>;
  } {
    const result: {
      [label: string]: ReturnType<PerformanceMonitor['getMetrics']>;
    } = {};

    this.metrics.forEach((_, label) => {
      result[label] = this.getMetrics(label);
    });

    return result;
  }

  measureAsync<T>(label: string, asyncFn: () => Promise<T>): Promise<T> {
    const stopTimer = this.startTimer(label);

    return asyncFn().finally(() => {
      stopTimer();
    });
  }
}

// Network optimization utilities
export class NetworkOptimizer {
  private static pendingRequests = new Map<string, Promise<any>>();
  private static requestQueue: Array<{
    url: string;
    options: RequestInit;
    resolve: Function;
    reject: Function;
  }> = [];
  private static isProcessingQueue = false;
  private static maxConcurrentRequests = 6;
  private static activeRequests = 0;

  static async optimizedFetch(
    url: string,
    options: RequestInit = {},
  ): Promise<Response> {
    // Deduplicate identical requests
    const requestKey = `${options.method || 'GET'}-${url}-${JSON.stringify(options.body || {})}`;

    if (this.pendingRequests.has(requestKey)) {
      return this.pendingRequests.get(requestKey)!;
    }

    const requestPromise = this.queueRequest(url, options);
    this.pendingRequests.set(requestKey, requestPromise);

    try {
      const response = await requestPromise;
      return response;
    } finally {
      this.pendingRequests.delete(requestKey);
    }
  }

  private static queueRequest(
    url: string,
    options: RequestInit,
  ): Promise<Response> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ url, options, resolve, reject });
      this.processQueue();
    });
  }

  private static async processQueue(): Promise<void> {
    if (
      this.isProcessingQueue ||
      this.activeRequests >= this.maxConcurrentRequests
    ) {
      return;
    }

    this.isProcessingQueue = true;

    while (
      this.requestQueue.length > 0 &&
      this.activeRequests < this.maxConcurrentRequests
    ) {
      const request = this.requestQueue.shift();
      if (!request) break;

      this.activeRequests++;

      fetch(request.url, request.options)
        .then(request.resolve)
        .catch(request.reject)
        .finally(() => {
          this.activeRequests--;
          this.processQueue(); // Process next requests
        });
    }

    this.isProcessingQueue = false;
  }

  static preloadCriticalResources(urls: string[]): void {
    urls.forEach((url) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = url;

      if (url.includes('.css')) {
        link.as = 'style';
      } else if (url.includes('.js')) {
        link.as = 'script';
      } else if (/\.(jpg|jpeg|png|webp)$/i.test(url)) {
        link.as = 'image';
      }

      document.head.appendChild(link);
    });
  }
}

// Bundle splitting utilities
export class BundleOptimizer {
  static async loadComponent<T>(
    importFn: () => Promise<{ default: T }>,
    fallback?: React.ComponentType,
  ): Promise<T> {
    try {
      const module = await importFn();
      return module.default;
    } catch (error) {
      console.error('Failed to load component:', error);
      if (fallback) {
        return fallback as unknown as T;
      }
      throw error;
    }
  }

  static createLoadingState(
    isLoading: boolean,
    children: React.ReactNode,
  ): React.ReactNode {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      );
    }
    return children;
  }
}

// Mobile-specific optimizations
export class MobileOptimizer {
  static isMobile(): boolean {
    return typeof window !== 'undefined' && window.innerWidth <= 768;
  }

  static isTouchDevice(): boolean {
    return typeof window !== 'undefined' && 'ontouchstart' in window;
  }

  static getViewportSize(): { width: number; height: number } {
    return {
      width: typeof window !== 'undefined' ? window.innerWidth : 375,
      height: typeof window !== 'undefined' ? window.innerHeight : 667,
    };
  }

  static optimizeForMobile(
    config: {
      images?: boolean;
      animations?: boolean;
      preload?: boolean;
    } = {},
  ): void {
    if (!this.isMobile()) return;

    const { images = true, animations = true, preload = true } = config;

    if (images) {
      // Optimize images for mobile
      this.optimizeMobileImages();
    }

    if (animations) {
      // Reduce animations on mobile
      this.optimizeMobileAnimations();
    }

    if (preload) {
      // Adjust preloading strategy
      this.optimizeMobilePreloading();
    }
  }

  private static optimizeMobileImages(): void {
    const images = document.querySelectorAll('img[data-mobile-src]');
    images.forEach((img) => {
      const mobileImg = img as HTMLImageElement;
      const mobileSrc = mobileImg.dataset.mobileSrc;
      if (mobileSrc) {
        mobileImg.src = mobileSrc;
      }
    });
  }

  private static optimizeMobileAnimations(): void {
    // Reduce motion for better performance on mobile
    document.body.classList.add('reduce-motion');
  }

  private static optimizeMobilePreloading(): void {
    // Reduce preloading on mobile to save bandwidth
    const preloadLinks = document.querySelectorAll(
      'link[rel="preload"]:not([data-mobile-keep])',
    );
    preloadLinks.forEach((link) => link.remove());
  }
}

// File compression utilities
export class FileCompressor {
  static async compressFile(file: File, quality: number = 0.8): Promise<File> {
    if (!file.type.startsWith('image/')) {
      return file; // Only compress images for now
    }

    try {
      const { optimized } = await ImageOptimizer.optimizeImage(file, 'full');
      return new File([optimized], file.name, { type: 'image/jpeg' });
    } catch (error) {
      console.warn('Failed to compress file:', error);
      return file;
    }
  }

  static async compressMultipleFiles(
    files: File[],
    onProgress?: (progress: number) => void,
  ): Promise<File[]> {
    const compressed: File[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const compressedFile = await this.compressFile(file);
      compressed.push(compressedFile);

      if (onProgress) {
        onProgress((i + 1) / files.length);
      }
    }

    return compressed;
  }
}

// Performance hooks for React components
export class PerformanceHooks {
  static useOptimizedImages = (files: WeddingFile[]) => {
    const [optimizedUrls, setOptimizedUrls] = React.useState<{
      [key: string]: string;
    }>({});
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
      const optimizeUrls = async () => {
        const newUrls: { [key: string]: string } = {};

        for (const file of files) {
          if (file.type.startsWith('image/')) {
            const isMobile = MobileOptimizer.isMobile();
            newUrls[file.id] = isMobile
              ? file.thumbnailUrl || file.url
              : file.url;
          }
        }

        setOptimizedUrls(newUrls);
        setLoading(false);
      };

      optimizeUrls();
    }, [files]);

    return { optimizedUrls, loading };
  };

  static useProgressiveLoading = <T extends any>(
    items: T[],
    pageSize: number = 20,
  ) => {
    const [displayedItems, setDisplayedItems] = React.useState<T[]>([]);
    const [hasMore, setHasMore] = React.useState(true);
    const loaderRef = React.useRef<ProgressiveLoader<T>>();

    React.useEffect(() => {
      loaderRef.current = new ProgressiveLoader(items, pageSize);
      const firstPage = loaderRef.current.getNextPage();
      setDisplayedItems(firstPage.items);
      setHasMore(firstPage.hasMore);
    }, [items, pageSize]);

    const loadMore = React.useCallback(() => {
      if (loaderRef.current && hasMore) {
        const nextPage = loaderRef.current.getNextPage();
        setDisplayedItems((prev) => [...prev, ...nextPage.items]);
        setHasMore(nextPage.hasMore);
      }
    }, [hasMore]);

    const reset = React.useCallback(() => {
      if (loaderRef.current) {
        loaderRef.current.reset();
        const firstPage = loaderRef.current.getNextPage();
        setDisplayedItems(firstPage.items);
        setHasMore(firstPage.hasMore);
      }
    }, []);

    return { displayedItems, hasMore, loadMore, reset };
  };
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// Initialize mobile optimizations
if (typeof window !== 'undefined') {
  MobileOptimizer.optimizeForMobile({
    images: true,
    animations: true,
    preload: true,
  });
}
