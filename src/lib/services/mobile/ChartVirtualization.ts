/**
 * ChartVirtualization - Virtualized charts for high-performance mobile analytics
 *
 * Features:
 * - Virtual scrolling for large datasets
 * - Dynamic chart rendering based on viewport
 * - Memory-efficient data point management
 * - Smooth animations with RAF optimization
 * - Touch-optimized viewport management
 * - Adaptive LOD (Level of Detail) based on zoom level
 * - Canvas-based rendering for performance
 * - WebGL acceleration where available
 */

import {
  ChartVirtualizationConfig,
  VendorMetrics,
} from '@/types/mobile-analytics';

interface VirtualizedDataPoint {
  index: number;
  x: number;
  y: number;
  data: any;
  visible: boolean;
  simplified?: boolean; // For LOD optimization
}

interface ViewportInfo {
  startIndex: number;
  endIndex: number;
  visibleCount: number;
  totalCount: number;
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
}

interface RenderCache {
  lastViewport: ViewportInfo;
  renderedPoints: VirtualizedDataPoint[];
  canvasData: ImageData | null;
  cacheKey: string;
  timestamp: number;
}

interface PerformanceMetrics {
  renderTime: number;
  frameRate: number;
  memoryUsage: number;
  visiblePoints: number;
  droppedFrames: number;
}

export class ChartVirtualization {
  private config: ChartVirtualizationConfig;
  private container: HTMLElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private webglContext: WebGLRenderingContext | null = null;

  private dataPoints: VirtualizedDataPoint[] = [];
  private visiblePoints: VirtualizedDataPoint[] = [];
  private viewport: ViewportInfo;
  private renderCache: RenderCache;
  private animationFrame: number | null = null;

  // Performance tracking
  private metrics: PerformanceMetrics;
  private frameStartTime: number = 0;
  private frameCount: number = 0;
  private lastFpsUpdate: number = 0;

  // Touch handling
  private touchState = {
    isScrolling: false,
    lastTouchY: 0,
    velocity: 0,
    momentum: 0,
  };

  // Memory management
  private memoryPool: VirtualizedDataPoint[] = [];
  private maxMemorySize: number = 1000; // Maximum cached data points

  constructor(config: ChartVirtualizationConfig) {
    this.config = {
      itemHeight: 50,
      bufferSize: 10,
      overscan: 5,
      estimatedItemSize: 50,
      dynamicHeight: false,
      ...config,
    };

    this.viewport = {
      startIndex: 0,
      endIndex: 0,
      visibleCount: 0,
      totalCount: 0,
      scrollTop: 0,
      scrollHeight: 0,
      clientHeight: 0,
    };

    this.renderCache = {
      lastViewport: { ...this.viewport },
      renderedPoints: [],
      canvasData: null,
      cacheKey: '',
      timestamp: 0,
    };

    this.metrics = {
      renderTime: 0,
      frameRate: 0,
      memoryUsage: 0,
      visiblePoints: 0,
      droppedFrames: 0,
    };
  }

  /**
   * Initialize virtualization with container
   */
  initialize(container: HTMLElement): void {
    this.container = container;
    this.setupCanvas();
    this.setupEventListeners();
    this.startPerformanceMonitoring();
  }

  /**
   * Set up canvas for rendering
   */
  private setupCanvas(): void {
    if (!this.container) return;

    // Create canvas element
    this.canvas = document.createElement('canvas');
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.touchAction = 'pan-y';

    // Set device pixel ratio for sharp rendering
    const dpr = window.devicePixelRatio || 1;
    const rect = this.container.getBoundingClientRect();

    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;

    this.container.appendChild(this.canvas);

    // Get 2D context
    this.ctx = this.canvas.getContext('2d', {
      alpha: false, // Better performance for opaque content
      desynchronized: true, // Reduce input latency
    });

    if (this.ctx) {
      this.ctx.scale(dpr, dpr);
    }

    // Try to get WebGL context for hardware acceleration
    try {
      this.webglContext = this.canvas.getContext('webgl', {
        alpha: false,
        antialias: false,
        preserveDrawingBuffer: false,
      });
    } catch (error) {
      console.log('[ChartVirtualization] WebGL not available, using 2D canvas');
    }
  }

  /**
   * Set up touch and scroll event listeners
   */
  private setupEventListeners(): void {
    if (!this.container || !this.canvas) return;

    // Touch events for mobile scrolling
    this.canvas.addEventListener(
      'touchstart',
      this.handleTouchStart.bind(this),
      { passive: false },
    );
    this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), {
      passive: false,
    });
    this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this), {
      passive: true,
    });

    // Wheel events for desktop
    this.canvas.addEventListener('wheel', this.handleWheel.bind(this), {
      passive: false,
    });

    // Resize observer for responsive updates
    if ('ResizeObserver' in window) {
      const resizeObserver = new ResizeObserver(() => {
        this.handleResize();
      });
      resizeObserver.observe(this.container);
    }
  }

  /**
   * Load data for virtualization
   */
  loadData(data: VendorMetrics[]): void {
    this.dataPoints = data.map((vendor, index) => ({
      index,
      x: index,
      y: vendor.revenue, // Using revenue as primary metric
      data: vendor,
      visible: false,
      simplified: false,
    }));

    this.viewport.totalCount = this.dataPoints.length;
    this.updateViewport();
    this.scheduleRender();
  }

  /**
   * Handle touch start
   */
  private handleTouchStart(event: TouchEvent): void {
    if (event.touches.length !== 1) return;

    const touch = event.touches[0];
    this.touchState.isScrolling = true;
    this.touchState.lastTouchY = touch.clientY;
    this.touchState.velocity = 0;

    // Cancel any momentum scrolling
    this.touchState.momentum = 0;

    // Prevent default to avoid interference with touch handling
    event.preventDefault();
  }

  /**
   * Handle touch move
   */
  private handleTouchMove(event: TouchEvent): void {
    if (!this.touchState.isScrolling || event.touches.length !== 1) return;

    const touch = event.touches[0];
    const deltaY = this.touchState.lastTouchY - touch.clientY;

    // Calculate velocity for momentum scrolling
    this.touchState.velocity = deltaY;

    // Update scroll position
    const newScrollTop = Math.max(
      0,
      Math.min(
        this.viewport.scrollHeight - this.viewport.clientHeight,
        this.viewport.scrollTop + deltaY,
      ),
    );

    if (newScrollTop !== this.viewport.scrollTop) {
      this.viewport.scrollTop = newScrollTop;
      this.updateViewport();
      this.scheduleRender();
    }

    this.touchState.lastTouchY = touch.clientY;
    event.preventDefault();
  }

  /**
   * Handle touch end
   */
  private handleTouchEnd(event: TouchEvent): void {
    this.touchState.isScrolling = false;

    // Apply momentum scrolling if velocity is significant
    if (Math.abs(this.touchState.velocity) > 2) {
      this.applyMomentumScrolling();
    }
  }

  /**
   * Apply momentum scrolling
   */
  private applyMomentumScrolling(): void {
    const friction = 0.95;
    const minVelocity = 0.5;

    const animate = () => {
      if (Math.abs(this.touchState.velocity) < minVelocity) {
        return;
      }

      this.touchState.velocity *= friction;

      const newScrollTop = Math.max(
        0,
        Math.min(
          this.viewport.scrollHeight - this.viewport.clientHeight,
          this.viewport.scrollTop + this.touchState.velocity,
        ),
      );

      if (newScrollTop !== this.viewport.scrollTop) {
        this.viewport.scrollTop = newScrollTop;
        this.updateViewport();
        this.scheduleRender();
      }

      requestAnimationFrame(animate);
    };

    animate();
  }

  /**
   * Handle wheel events
   */
  private handleWheel(event: WheelEvent): void {
    const deltaY = event.deltaY;

    const newScrollTop = Math.max(
      0,
      Math.min(
        this.viewport.scrollHeight - this.viewport.clientHeight,
        this.viewport.scrollTop + deltaY,
      ),
    );

    if (newScrollTop !== this.viewport.scrollTop) {
      this.viewport.scrollTop = newScrollTop;
      this.updateViewport();
      this.scheduleRender();
    }

    event.preventDefault();
  }

  /**
   * Handle container resize
   */
  private handleResize(): void {
    if (!this.container || !this.canvas || !this.ctx) return;

    const rect = this.container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // Update canvas size
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;

    this.ctx.scale(dpr, dpr);

    // Update viewport
    this.viewport.clientHeight = rect.height;
    this.updateViewport();
    this.invalidateCache();
    this.scheduleRender();
  }

  /**
   * Update viewport calculations
   */
  private updateViewport(): void {
    if (!this.container) return;

    const containerHeight = this.container.clientHeight;
    const itemHeight = this.config.itemHeight;

    // Calculate visible range with buffer
    const startIndex = Math.max(
      0,
      Math.floor(this.viewport.scrollTop / itemHeight) - this.config.bufferSize,
    );

    const visibleCount =
      Math.ceil(containerHeight / itemHeight) + this.config.overscan;
    const endIndex = Math.min(
      this.dataPoints.length - 1,
      startIndex + visibleCount,
    );

    this.viewport = {
      ...this.viewport,
      startIndex,
      endIndex,
      visibleCount: endIndex - startIndex + 1,
      clientHeight: containerHeight,
      scrollHeight: this.dataPoints.length * itemHeight,
    };

    // Update visible points
    this.updateVisiblePoints();
  }

  /**
   * Update visible data points
   */
  private updateVisiblePoints(): void {
    // Clear previous visibility
    this.visiblePoints.forEach((point) => (point.visible = false));
    this.visiblePoints = [];

    // Mark visible points
    for (let i = this.viewport.startIndex; i <= this.viewport.endIndex; i++) {
      if (i < this.dataPoints.length) {
        const point = this.dataPoints[i];
        point.visible = true;
        this.visiblePoints.push(point);
      }
    }

    // Update metrics
    this.metrics.visiblePoints = this.visiblePoints.length;
  }

  /**
   * Schedule render with RAF
   */
  private scheduleRender(): void {
    if (this.animationFrame) return;

    this.animationFrame = requestAnimationFrame(() => {
      this.render();
      this.animationFrame = null;
    });
  }

  /**
   * Render visible data points
   */
  private render(): void {
    if (!this.ctx || !this.canvas) return;

    this.frameStartTime = performance.now();

    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Check if we can use cached render
    if (this.canUseCachedRender()) {
      this.useCachedRender();
    } else {
      this.renderFromScratch();
      this.updateRenderCache();
    }

    // Update performance metrics
    this.updatePerformanceMetrics();
  }

  /**
   * Check if cached render can be used
   */
  private canUseCachedRender(): boolean {
    if (!this.renderCache.canvasData) return false;

    const cacheAge = Date.now() - this.renderCache.timestamp;
    if (cacheAge > 100) return false; // 100ms cache timeout

    const viewportChanged =
      this.viewport.startIndex !== this.renderCache.lastViewport.startIndex ||
      this.viewport.endIndex !== this.renderCache.lastViewport.endIndex ||
      this.viewport.scrollTop !== this.renderCache.lastViewport.scrollTop;

    return !viewportChanged;
  }

  /**
   * Use cached render data
   */
  private useCachedRender(): void {
    if (!this.ctx || !this.renderCache.canvasData) return;

    this.ctx.putImageData(this.renderCache.canvasData, 0, 0);
  }

  /**
   * Render from scratch
   */
  private renderFromScratch(): void {
    if (!this.ctx) return;

    // Set up rendering context
    this.ctx.fillStyle = '#ffffff';
    this.ctx.strokeStyle = '#8b5cf6';
    this.ctx.lineWidth = 2;

    // Render chart background
    this.renderChartBackground();

    // Render data points with LOD optimization
    this.renderDataPoints();

    // Render axis and labels
    this.renderAxisAndLabels();
  }

  /**
   * Render chart background
   */
  private renderChartBackground(): void {
    if (!this.ctx || !this.canvas) return;

    const width = this.canvas.width / (window.devicePixelRatio || 1);
    const height = this.canvas.height / (window.devicePixelRatio || 1);

    // Background
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, width, height);

    // Grid lines
    this.ctx.strokeStyle = '#f0f0f0';
    this.ctx.lineWidth = 1;

    const gridSpacing = 50;
    for (let y = 0; y < height; y += gridSpacing) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(width, y);
      this.ctx.stroke();
    }
  }

  /**
   * Render data points with LOD
   */
  private renderDataPoints(): void {
    if (!this.ctx || !this.canvas) return;

    const width = this.canvas.width / (window.devicePixelRatio || 1);
    const height = this.canvas.height / (window.devicePixelRatio || 1);

    // Determine LOD based on visible point count
    const useLOD = this.visiblePoints.length > 100;

    this.ctx.strokeStyle = '#8b5cf6';
    this.ctx.fillStyle = '#8b5cf6';
    this.ctx.lineWidth = useLOD ? 1 : 2;

    if (this.visiblePoints.length === 0) return;

    // Calculate value ranges for scaling
    const values = this.visiblePoints.map((p) => p.y);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const valueRange = maxValue - minValue || 1;

    // Draw line chart
    this.ctx.beginPath();

    this.visiblePoints.forEach((point, index) => {
      const x = (index / (this.visiblePoints.length - 1)) * width;
      const y = height - ((point.y - minValue) / valueRange) * height * 0.8;

      if (index === 0) {
        this.ctx.moveTo(x, y);
      } else {
        if (useLOD && index % 2 === 0) {
          // Skip every other point for LOD
          return;
        }
        this.ctx.lineTo(x, y);
      }

      // Draw data point circle (only for high detail mode)
      if (!useLOD) {
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.arc(x, y, 3, 0, 2 * Math.PI);
        this.ctx.fill();
        this.ctx.restore();
      }
    });

    this.ctx.stroke();
  }

  /**
   * Render axis and labels
   */
  private renderAxisAndLabels(): void {
    if (!this.ctx || !this.canvas) return;

    const width = this.canvas.width / (window.devicePixelRatio || 1);
    const height = this.canvas.height / (window.devicePixelRatio || 1);

    this.ctx.fillStyle = '#666666';
    this.ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'middle';

    // Y-axis labels
    const values = this.visiblePoints.map((p) => p.y);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);

    const labelCount = 5;
    for (let i = 0; i < labelCount; i++) {
      const value = minValue + (maxValue - minValue) * (i / (labelCount - 1));
      const y = height - (i / (labelCount - 1)) * height * 0.8;

      let label = value.toFixed(0);
      if (value >= 1000) {
        label = `£${(value / 1000).toFixed(1)}K`;
      }

      this.ctx.fillText(label, 5, y);
    }
  }

  /**
   * Update render cache
   */
  private updateRenderCache(): void {
    if (!this.ctx || !this.canvas) return;

    try {
      this.renderCache.canvasData = this.ctx.getImageData(
        0,
        0,
        this.canvas.width,
        this.canvas.height,
      );
      this.renderCache.lastViewport = { ...this.viewport };
      this.renderCache.timestamp = Date.now();
    } catch (error) {
      console.warn('[ChartVirtualization] Failed to cache render data:', error);
    }
  }

  /**
   * Invalidate render cache
   */
  private invalidateCache(): void {
    this.renderCache.canvasData = null;
    this.renderCache.timestamp = 0;
  }

  /**
   * Start performance monitoring
   */
  private startPerformanceMonitoring(): void {
    setInterval(() => {
      this.updateMemoryMetrics();
    }, 1000);
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(): void {
    const renderTime = performance.now() - this.frameStartTime;
    this.metrics.renderTime = renderTime;

    // Update frame rate
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFpsUpdate >= 1000) {
      this.metrics.frameRate = this.frameCount;
      this.frameCount = 0;
      this.lastFpsUpdate = now;
    }

    // Track dropped frames (render time > 16.67ms = 60fps)
    if (renderTime > 16.67) {
      this.metrics.droppedFrames++;
    }
  }

  /**
   * Update memory metrics
   */
  private updateMemoryMetrics(): void {
    if ('memory' in performance) {
      this.metrics.memoryUsage = (performance as any).memory.usedJSHeapSize;
    }

    // Clean up memory pool if it's getting too large
    if (this.memoryPool.length > this.maxMemorySize) {
      this.memoryPool.splice(0, this.memoryPool.length - this.maxMemorySize);
    }
  }

  /**
   * Get performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Scroll to specific index
   */
  scrollToIndex(
    index: number,
    alignment: 'start' | 'center' | 'end' = 'start',
  ): void {
    const itemHeight = this.config.itemHeight;
    const containerHeight = this.viewport.clientHeight;

    let targetScrollTop = index * itemHeight;

    if (alignment === 'center') {
      targetScrollTop -= containerHeight / 2 - itemHeight / 2;
    } else if (alignment === 'end') {
      targetScrollTop -= containerHeight - itemHeight;
    }

    targetScrollTop = Math.max(
      0,
      Math.min(this.viewport.scrollHeight - containerHeight, targetScrollTop),
    );

    this.viewport.scrollTop = targetScrollTop;
    this.updateViewport();
    this.scheduleRender();
  }

  /**
   * Get visible range
   */
  getVisibleRange(): { start: number; end: number } {
    return {
      start: this.viewport.startIndex,
      end: this.viewport.endIndex,
    };
  }

  /**
   * Destroy virtualization instance
   */
  destroy(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }

    if (this.canvas && this.container) {
      this.container.removeChild(this.canvas);
    }

    // Clear memory
    this.dataPoints = [];
    this.visiblePoints = [];
    this.memoryPool = [];
    this.renderCache.canvasData = null;
  }
}
