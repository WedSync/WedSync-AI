/**
 * Advanced Performance & UX Optimization System
 * Comprehensive mobile performance optimization with adaptive loading and UX enhancements
 */

export interface PerformanceMetrics {
  load_time: number;
  first_contentful_paint: number;
  largest_contentful_paint: number;
  cumulative_layout_shift: number;
  first_input_delay: number;
  memory_usage: number;
  battery_level: number;
  network_speed: number;
  device_type: 'mobile' | 'tablet' | 'desktop';
  connection_type: '4g' | '3g' | 'wifi' | 'slow-2g';
}

export interface OptimizationConfig {
  enable_lazy_loading: boolean;
  enable_image_optimization: boolean;
  enable_code_splitting: boolean;
  enable_service_worker_caching: boolean;
  enable_preloading: boolean;
  enable_compression: boolean;
  battery_save_mode: boolean;
  reduced_motion: boolean;
  data_saver_mode: boolean;
}

export interface UXEnhancement {
  id: string;
  type: 'loading' | 'interaction' | 'visual' | 'accessibility' | 'performance';
  priority: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  implementation: () => Promise<void>;
  metrics_impact: string[];
  user_benefit: string;
}

export class AdvancedPerformanceOptimizer {
  private metrics: PerformanceMetrics;
  private config: OptimizationConfig;
  private observer: PerformanceObserver | null = null;
  private intersectionObserver: IntersectionObserver | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private enhancementsApplied: Set<string> = new Set();

  constructor() {
    this.metrics = this.initializeMetrics();
    this.config = this.initializeConfig();
    this.startPerformanceMonitoring();
    this.detectUserPreferences();
  }

  private initializeMetrics(): PerformanceMetrics {
    return {
      load_time: 0,
      first_contentful_paint: 0,
      largest_contentful_paint: 0,
      cumulative_layout_shift: 0,
      first_input_delay: 0,
      memory_usage: 0,
      battery_level: 1.0,
      network_speed: 0,
      device_type: this.detectDeviceType(),
      connection_type: this.detectConnectionType(),
    };
  }

  private initializeConfig(): OptimizationConfig {
    const savedConfig = localStorage.getItem('wedsync_performance_config');
    if (savedConfig) {
      return JSON.parse(savedConfig);
    }

    return {
      enable_lazy_loading: true,
      enable_image_optimization: true,
      enable_code_splitting: true,
      enable_service_worker_caching: true,
      enable_preloading: true,
      enable_compression: true,
      battery_save_mode: false,
      reduced_motion: false,
      data_saver_mode: false,
    };
  }

  private startPerformanceMonitoring(): void {
    if ('PerformanceObserver' in window) {
      this.observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.processPerformanceEntry(entry);
        }
      });

      this.observer.observe({
        entryTypes: ['paint', 'layout-shift', 'first-input', 'navigation'],
      });
    }

    // Monitor memory usage
    this.monitorMemoryUsage();

    // Monitor battery status
    this.monitorBatteryStatus();

    // Monitor network status
    this.monitorNetworkStatus();
  }

  private processPerformanceEntry(entry: PerformanceEntry): void {
    switch (entry.entryType) {
      case 'paint':
        if (entry.name === 'first-contentful-paint') {
          this.metrics.first_contentful_paint = entry.startTime;
        }
        break;
      case 'largest-contentful-paint':
        this.metrics.largest_contentful_paint = entry.startTime;
        break;
      case 'layout-shift':
        if (!(entry as any).hadRecentInput) {
          this.metrics.cumulative_layout_shift += (entry as any).value;
        }
        break;
      case 'first-input':
        this.metrics.first_input_delay =
          (entry as any).processingStart - entry.startTime;
        break;
      case 'navigation':
        this.metrics.load_time = entry.duration;
        break;
    }

    // Trigger optimizations if metrics exceed thresholds
    this.evaluateAndOptimize();
  }

  private async monitorMemoryUsage(): Promise<void> {
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
        this.metrics.memory_usage =
          memory.usedJSHeapSize / memory.jsHeapSizeLimit;

        if (this.metrics.memory_usage > 0.8) {
          this.enableMemoryOptimizations();
        }
      }, 10000); // Check every 10 seconds
    }
  }

  private async monitorBatteryStatus(): Promise<void> {
    if ('getBattery' in navigator) {
      const battery = await (navigator as any).getBattery();
      this.metrics.battery_level = battery.level;

      battery.addEventListener('levelchange', () => {
        this.metrics.battery_level = battery.level;
        if (battery.level < 0.2) {
          this.enableBatterySaveMode();
        }
      });
    }
  }

  private monitorNetworkStatus(): void {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      this.metrics.network_speed = connection.downlink;
      this.metrics.connection_type = connection.effectiveType;

      connection.addEventListener('change', () => {
        this.metrics.network_speed = connection.downlink;
        this.metrics.connection_type = connection.effectiveType;
        this.adaptToNetworkConditions();
      });
    }
  }

  private detectDeviceType(): 'mobile' | 'tablet' | 'desktop' {
    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }

  private detectConnectionType(): '4g' | '3g' | 'wifi' | 'slow-2g' {
    if ('connection' in navigator) {
      return (navigator as any).connection.effectiveType || '4g';
    }
    return '4g';
  }

  private detectUserPreferences(): void {
    // Detect reduced motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.config.reduced_motion = true;
    }

    // Detect data saver mode
    if ('connection' in navigator && (navigator as any).connection.saveData) {
      this.config.data_saver_mode = true;
    }

    this.saveConfig();
  }

  private evaluateAndOptimize(): void {
    const thresholds = {
      fcp_threshold: 2500, // First Contentful Paint
      lcp_threshold: 4000, // Largest Contentful Paint
      cls_threshold: 0.25, // Cumulative Layout Shift
      fid_threshold: 300, // First Input Delay
    };

    const optimizationsNeeded: string[] = [];

    if (this.metrics.first_contentful_paint > thresholds.fcp_threshold) {
      optimizationsNeeded.push('improve_fcp');
    }
    if (this.metrics.largest_contentful_paint > thresholds.lcp_threshold) {
      optimizationsNeeded.push('improve_lcp');
    }
    if (this.metrics.cumulative_layout_shift > thresholds.cls_threshold) {
      optimizationsNeeded.push('reduce_cls');
    }
    if (this.metrics.first_input_delay > thresholds.fid_threshold) {
      optimizationsNeeded.push('reduce_fid');
    }

    optimizationsNeeded.forEach((optimization) => {
      this.applyOptimization(optimization);
    });
  }

  private async applyOptimization(type: string): Promise<void> {
    if (this.enhancementsApplied.has(type)) return;

    switch (type) {
      case 'improve_fcp':
        await this.optimizeFCP();
        break;
      case 'improve_lcp':
        await this.optimizeLCP();
        break;
      case 'reduce_cls':
        await this.reduceCLS();
        break;
      case 'reduce_fid':
        await this.reduceFID();
        break;
    }

    this.enhancementsApplied.add(type);
  }

  private async optimizeFCP(): Promise<void> {
    // Optimize First Contentful Paint

    // 1. Implement critical CSS inlining
    this.inlineCriticalCSS();

    // 2. Preload critical resources
    this.preloadCriticalResources();

    // 3. Optimize font loading
    this.optimizeFontLoading();

    console.log('FCP optimizations applied');
  }

  private async optimizeLCP(): Promise<void> {
    // Optimize Largest Contentful Paint

    // 1. Optimize images
    this.optimizeImages();

    // 2. Implement lazy loading for below-fold content
    this.implementLazyLoading();

    // 3. Preload LCP elements
    this.preloadLCPElements();

    console.log('LCP optimizations applied');
  }

  private async reduceCLS(): Promise<void> {
    // Reduce Cumulative Layout Shift

    // 1. Set explicit dimensions for media
    this.setExplicitDimensions();

    // 2. Reserve space for dynamic content
    this.reserveSpaceForDynamicContent();

    // 3. Avoid inserting content above existing content
    this.avoidContentInsertion();

    console.log('CLS optimizations applied');
  }

  private async reduceFID(): Promise<void> {
    // Reduce First Input Delay

    // 1. Break up long tasks
    this.breakUpLongTasks();

    // 2. Implement code splitting
    this.implementCodeSplitting();

    // 3. Use web workers for heavy computations
    this.useWebWorkers();

    if (process.env.NODE_ENV === 'development') {
      console.log('FID optimizations applied');
    }
  }

  private inlineCriticalCSS(): void {
    const criticalStyles = `
      .spinner { animation: spin 1s linear infinite; }
      .loading-skeleton { background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%); }
      .mobile-optimized { transform: translate3d(0, 0, 0); }
    `;

    const style = document.createElement('style');
    style.textContent = criticalStyles;
    document.head.insertBefore(style, document.head.firstChild);
  }

  private preloadCriticalResources(): void {
    const criticalResources = [
      '/fonts/wedding-font.woff2',
      '/images/logo-optimized.webp',
      '/api/wedding/essentials',
    ];

    criticalResources.forEach((resource) => {
      const link = document.createElement('link');
      link.rel = 'preload';

      if (resource.includes('.woff2')) {
        link.as = 'font';
        link.type = 'font/woff2';
        link.crossOrigin = 'anonymous';
      } else if (resource.includes('.webp')) {
        link.as = 'image';
      } else {
        link.as = 'fetch';
        link.crossOrigin = 'anonymous';
      }

      link.href = resource;
      document.head.appendChild(link);
    });
  }

  private optimizeFontLoading(): void {
    // Use font-display: swap for better performance
    const fontCSS = `
      @font-face {
        font-family: 'WeddingFont';
        src: url('/fonts/wedding-font.woff2') format('woff2');
        font-display: swap;
      }
    `;

    const style = document.createElement('style');
    style.textContent = fontCSS;
    document.head.appendChild(style);
  }

  private optimizeImages(): void {
    if (this.config.enable_image_optimization) {
      const images = document.querySelectorAll('img[data-src]');

      images.forEach((img: Element) => {
        const imgElement = img as HTMLImageElement;
        // Convert to WebP if supported
        if (this.supportsWebP()) {
          const src = imgElement.dataset.src;
          if (src && !src.includes('.webp')) {
            imgElement.dataset.src = src.replace(/\.(jpg|jpeg|png)$/, '.webp');
          }
        }
      });
    }
  }

  private implementLazyLoading(): void {
    if (!this.config.enable_lazy_loading) return;

    if (!this.intersectionObserver) {
      this.intersectionObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const img = entry.target as HTMLImageElement;
              if (img.dataset.src) {
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
                this.intersectionObserver?.unobserve(img);
              }
            }
          });
        },
        { rootMargin: '50px' },
      );
    }

    const images = document.querySelectorAll('img[data-src]');
    images.forEach((img) => this.intersectionObserver?.observe(img));
  }

  private preloadLCPElements(): void {
    // Identify and preload likely LCP elements
    const potentialLCPElements = document.querySelectorAll(
      'img[data-priority="high"], .hero-image, .main-banner',
    );

    potentialLCPElements.forEach((element) => {
      if (element.tagName === 'IMG') {
        const img = element as HTMLImageElement;
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = img.src || img.dataset.src || '';
        document.head.appendChild(link);
      }
    });
  }

  private setExplicitDimensions(): void {
    const mediaElements = document.querySelectorAll(
      'img:not([width]), video:not([width])',
    );

    mediaElements.forEach((element) => {
      const el = element as HTMLElement;
      // Set aspect-ratio CSS property to prevent layout shift
      el.style.aspectRatio = '16 / 9'; // Default aspect ratio
    });
  }

  private reserveSpaceForDynamicContent(): void {
    const dynamicContainers = document.querySelectorAll(
      '[data-dynamic-content]',
    );

    dynamicContainers.forEach((container) => {
      const el = container as HTMLElement;
      if (!el.style.minHeight) {
        el.style.minHeight = '200px'; // Reserve minimum space
      }
    });
  }

  private avoidContentInsertion(): void {
    // Observe DOM mutations that could cause layout shift
    const mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          // Use CSS transforms or append to bottom instead of inserting
          console.warn('Content insertion detected, may cause layout shift');
        }
      });
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  private breakUpLongTasks(): void {
    // Use scheduler.postTask when available
    if ('scheduler' in window && 'postTask' in (window as any).scheduler) {
      // Schedule tasks with different priorities
      const scheduler = (window as any).scheduler;

      scheduler.postTask(
        () => {
          // High priority tasks
        },
        { priority: 'user-blocking' },
      );

      scheduler.postTask(
        () => {
          // Low priority tasks
        },
        { priority: 'background' },
      );
    } else {
      // Fallback to setTimeout for task scheduling
      this.scheduleTasksWithTimeout();
    }
  }

  private scheduleTasksWithTimeout(): void {
    const tasks: (() => void)[] = [];

    const processTasks = () => {
      const start = performance.now();
      while (tasks.length > 0 && performance.now() - start < 5) {
        const task = tasks.shift();
        if (task) task();
      }

      if (tasks.length > 0) {
        setTimeout(processTasks, 0);
      }
    };

    // Example usage: tasks.push(() => { /* some work */ })
    if (tasks.length > 0) {
      processTasks();
    }
  }

  private implementCodeSplitting(): void {
    if (this.config.enable_code_splitting) {
      // Dynamic imports for non-critical features
      const loadNonCriticalFeatures = async () => {
        const { AdvancedAnalytics } = await import('./advanced-analytics');
        const { ChartComponents } = await import('./chart-components');
        // Initialize non-critical features
      };

      // Load after initial render
      requestIdleCallback(loadNonCriticalFeatures);
    }
  }

  private useWebWorkers(): void {
    // Offload heavy computations to web workers
    const createWebWorker = (script: string) => {
      const blob = new Blob([script], { type: 'application/javascript' });
      return new Worker(URL.createObjectURL(blob));
    };

    const expenseCalculationWorker = createWebWorker(`
      self.onmessage = function(e) {
        const { expenses, calculations } = e.data
        // Perform heavy calculations
        const results = expenses.map(expense => {
          // Complex calculations here
          return { ...expense, calculated: true }
        })
        self.postMessage(results)
      }
    `);

    // Usage example
    // expenseCalculationWorker.postMessage({ expenses: [], calculations: [] })
  }

  private enableBatterySaveMode(): void {
    if (!this.config.battery_save_mode) {
      this.config.battery_save_mode = true;

      // Reduce background activity
      this.reduceBackgroundActivity();

      // Lower update frequencies
      this.reduceUpdateFrequency();

      // Disable non-essential animations
      this.disableNonEssentialAnimations();

      this.saveConfig();
      console.log('Battery save mode enabled');
    }
  }

  private enableMemoryOptimizations(): void {
    // Clean up unused objects
    this.cleanupUnusedObjects();

    // Reduce cache size
    this.reduceCacheSize();

    // Lazy load components
    this.lazyLoadComponents();

    console.log('Memory optimizations applied');
  }

  private adaptToNetworkConditions(): void {
    const slowConnections = ['slow-2g', '2g', '3g'];

    if (slowConnections.includes(this.metrics.connection_type)) {
      // Reduce data usage
      this.config.data_saver_mode = true;
      this.config.enable_compression = true;

      // Reduce image quality
      this.reduceImageQuality();

      // Disable auto-play videos
      this.disableAutoPlay();

      console.log('Network optimizations applied for slow connection');
    }
  }

  private reduceBackgroundActivity(): void {
    // Reduce polling intervals
    const pollingIntervals = document.querySelectorAll('[data-polling]');
    pollingIntervals.forEach((element) => {
      const el = element as any;
      if (el.pollingInterval) {
        clearInterval(el.pollingInterval);
        // Increase interval by 2x
        el.pollingInterval = setInterval(
          el.pollingCallback,
          el.pollingDelay * 2,
        );
      }
    });
  }

  private reduceUpdateFrequency(): void {
    // Throttle UI updates
    let updateThrottle: NodeJS.Timeout;
    const throttledUpdate = (callback: () => void) => {
      clearTimeout(updateThrottle);
      updateThrottle = setTimeout(callback, 100); // Throttle to 100ms
    };

    // Apply to existing update mechanisms
    window.addEventListener('scroll', () => {
      throttledUpdate(() => {
        // Handle scroll updates
      });
    });
  }

  private disableNonEssentialAnimations(): void {
    document.body.classList.add('reduce-motion');

    // Add CSS to disable animations
    const style = document.createElement('style');
    style.textContent = `
      .reduce-motion * {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }
    `;
    document.head.appendChild(style);
  }

  private cleanupUnusedObjects(): void {
    // Force garbage collection (if available in dev tools)
    if ('gc' in window) {
      (window as any).gc();
    }

    // Clear caches
    this.clearUnusedCaches();
  }

  private reduceCacheSize(): void {
    if ('caches' in window) {
      caches.keys().then((cacheNames) => {
        cacheNames.forEach((cacheName) => {
          if (cacheName.includes('old-') || cacheName.includes('temp-')) {
            caches.delete(cacheName);
          }
        });
      });
    }
  }

  private lazyLoadComponents(): void {
    // Implement component lazy loading
    const lazyComponents = document.querySelectorAll('[data-lazy-component]');

    if (!this.intersectionObserver) {
      this.intersectionObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const component = entry.target as HTMLElement;
            const componentName = component.dataset.lazyComponent;
            if (componentName) {
              this.loadComponent(componentName, component);
            }
          }
        });
      });
    }

    lazyComponents.forEach((component) => {
      this.intersectionObserver?.observe(component);
    });
  }

  private reduceImageQuality(): void {
    const images = document.querySelectorAll('img');
    images.forEach((img) => {
      if (img.src.includes('?')) {
        img.src += '&quality=60';
      } else {
        img.src += '?quality=60';
      }
    });
  }

  private disableAutoPlay(): void {
    const videos = document.querySelectorAll('video[autoplay]');
    videos.forEach((video) => {
      video.removeAttribute('autoplay');
      video.setAttribute('data-autoplay-disabled', 'true');
    });
  }

  private clearUnusedCaches(): void {
    // Clear expired local storage items
    const expiredKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes('_expires_')) {
        const expiryTime = parseInt(key.split('_expires_')[1]);
        if (Date.now() > expiryTime) {
          expiredKeys.push(key.split('_expires_')[0]);
        }
      }
    }

    expiredKeys.forEach((key) => localStorage.removeItem(key));
  }

  private async loadComponent(
    componentName: string,
    container: HTMLElement,
  ): Promise<void> {
    try {
      // Dynamic component loading
      const module = await import(`../components/${componentName}`);
      const Component = module.default;

      // Initialize component in container
      const componentInstance = new Component();
      container.appendChild(componentInstance.render());
    } catch (error) {
      console.error(`Failed to load component ${componentName}:`, error);
    }
  }

  private supportsWebP(): boolean {
    return new Promise<boolean>((resolve) => {
      const webP = new Image();
      webP.onload = () => resolve(webP.width > 0 && webP.height > 0);
      webP.onerror = () => resolve(false);
      webP.src =
        'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
    })
      .then(Boolean)
      .catch(() => false);
  }

  private saveConfig(): void {
    localStorage.setItem(
      'wedsync_performance_config',
      JSON.stringify(this.config),
    );
  }

  public getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  public updateConfig(newConfig: Partial<OptimizationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.saveConfig();
  }

  public async generatePerformanceReport(): Promise<{
    metrics: PerformanceMetrics;
    config: OptimizationConfig;
    recommendations: string[];
    optimizations_applied: string[];
  }> {
    const recommendations: string[] = [];

    // Generate recommendations based on current metrics
    if (this.metrics.first_contentful_paint > 2500) {
      recommendations.push(
        'Consider optimizing critical CSS and preloading key resources',
      );
    }

    if (this.metrics.memory_usage > 0.7) {
      recommendations.push(
        'High memory usage detected - consider reducing cache size',
      );
    }

    if (this.metrics.battery_level < 0.3) {
      recommendations.push('Low battery detected - enable power saving mode');
    }

    return {
      metrics: this.getPerformanceMetrics(),
      config: { ...this.config },
      recommendations,
      optimizations_applied: Array.from(this.enhancementsApplied),
    };
  }
}
