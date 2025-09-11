/**
 * WS-130: Performance Optimizer for Large Image Processing
 * Advanced optimization system for handling large-scale image analysis and processing
 */

export interface ImageProcessingJob {
  id: string;
  type:
    | 'color_analysis'
    | 'style_matching'
    | 'mood_board'
    | 'portfolio_analysis';
  images: Array<{
    id: string;
    url: string;
    size?: number;
    priority?: 'high' | 'medium' | 'low';
  }>;
  options: {
    quality: 'preview' | 'standard' | 'high';
    batchSize?: number;
    timeout?: number;
    retries?: number;
  };
  callbacks?: {
    onProgress?: (progress: number) => void;
    onComplete?: (results: any[]) => void;
    onError?: (error: Error) => void;
  };
  status: 'queued' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  results?: any[];
  error?: Error;
}

export interface PerformanceMetrics {
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  averageProcessingTime: number;
  averageImageSize: number;
  memoryUsage: {
    current: number;
    peak: number;
    available: number;
  };
  concurrency: {
    active: number;
    maximum: number;
    queued: number;
  };
  cacheStats: {
    hits: number;
    misses: number;
    hitRate: number;
    size: number;
  };
}

export interface OptimizationConfig {
  maxConcurrentJobs: number;
  batchSize: number;
  imageResizeThreshold: number;
  cacheMaxSize: number;
  cacheTTL: number;
  memoryThreshold: number;
  timeoutMs: number;
  retryAttempts: number;
}

/**
 * Performance Optimizer for Large Image Processing
 * Handles batching, caching, compression, and memory management
 */
export class PerformanceOptimizer {
  private jobQueue: ImageProcessingJob[] = [];
  private activeJobs = new Map<string, ImageProcessingJob>();
  private completedJobs = new Map<string, ImageProcessingJob>();
  private cache = new Map<
    string,
    { data: any; timestamp: number; size: number }
  >();
  private metrics: PerformanceMetrics;
  private config: OptimizationConfig;
  private isProcessing = false;
  private memoryMonitor: NodeJS.Timeout | null = null;

  constructor(config: Partial<OptimizationConfig> = {}) {
    this.config = {
      maxConcurrentJobs: 3,
      batchSize: 5,
      imageResizeThreshold: 2 * 1024 * 1024, // 2MB
      cacheMaxSize: 100 * 1024 * 1024, // 100MB
      cacheTTL: 30 * 60 * 1000, // 30 minutes
      memoryThreshold: 0.8, // 80% of available memory
      timeoutMs: 30000, // 30 seconds per image
      retryAttempts: 2,
      ...config,
    };

    this.metrics = this.initializeMetrics();
    this.startMemoryMonitoring();
    this.startProcessing();
  }

  /**
   * Queue an image processing job with optimization
   */
  async queueJob(
    job: Omit<ImageProcessingJob, 'id' | 'status' | 'createdAt'>,
  ): Promise<string> {
    const optimizedJob: ImageProcessingJob = {
      ...job,
      id: this.generateJobId(),
      status: 'queued',
      createdAt: new Date(),
      images: await this.optimizeImages(job.images),
      options: {
        batchSize: this.config.batchSize,
        timeout: this.config.timeoutMs,
        retries: this.config.retryAttempts,
        ...job.options,
      },
    };

    // Priority queue insertion
    if (job.images.some((img) => img.priority === 'high')) {
      this.jobQueue.unshift(optimizedJob);
    } else {
      this.jobQueue.push(optimizedJob);
    }

    this.metrics.totalJobs++;

    console.log(
      `Queued job ${optimizedJob.id} with ${optimizedJob.images.length} images`,
    );
    return optimizedJob.id;
  }

  /**
   * Get job status and results
   */
  getJob(jobId: string): ImageProcessingJob | null {
    return (
      this.activeJobs.get(jobId) ||
      this.completedJobs.get(jobId) ||
      this.jobQueue.find((job) => job.id === jobId) ||
      null
    );
  }

  /**
   * Get performance metrics
   */
  getMetrics(): PerformanceMetrics {
    this.updateMetrics();
    return { ...this.metrics };
  }

  /**
   * Cancel a queued or active job
   */
  cancelJob(jobId: string): boolean {
    // Remove from queue
    const queueIndex = this.jobQueue.findIndex((job) => job.id === jobId);
    if (queueIndex > -1) {
      this.jobQueue.splice(queueIndex, 1);
      return true;
    }

    // Cancel active job (implementation depends on processing library)
    const activeJob = this.activeJobs.get(jobId);
    if (activeJob) {
      activeJob.status = 'failed';
      activeJob.error = new Error('Job cancelled by user');
      this.activeJobs.delete(jobId);
      this.completedJobs.set(jobId, activeJob);
      return true;
    }

    return false;
  }

  /**
   * Clear cache to free memory
   */
  clearCache(): void {
    this.cache.clear();
    this.updateCacheStats();
    console.log('Cache cleared');
  }

  /**
   * Optimize memory usage by clearing old cache entries
   */
  optimizeMemory(): void {
    const now = Date.now();
    const entriesToDelete: string[] = [];

    // Remove expired cache entries
    Array.from(this.cache.entries()).forEach(([key, entry]) => {
      if (now - entry.timestamp > this.config.cacheTTL) {
        entriesToDelete.push(key);
      }
    });

    // Remove oldest entries if cache is too large
    const cacheSize = this.getCacheSize();
    if (cacheSize > this.config.cacheMaxSize) {
      const entries = Array.from(this.cache.entries()).sort(
        ([, a], [, b]) => a.timestamp - b.timestamp,
      );

      const toDelete = Math.ceil(entries.length * 0.3); // Remove 30% of oldest entries
      for (let i = 0; i < toDelete; i++) {
        entriesToDelete.push(entries[i][0]);
      }
    }

    entriesToDelete.forEach((key) => this.cache.delete(key));

    if (entriesToDelete.length > 0) {
      console.log(
        `Optimized memory: removed ${entriesToDelete.length} cache entries`,
      );
    }
  }

  // Private methods

  private async startProcessing(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (true) {
      await this.processNextBatch();
      await new Promise((resolve) => setTimeout(resolve, 100)); // Small delay to prevent tight loop
    }
  }

  private async processNextBatch(): Promise<void> {
    // Check if we can process more jobs
    if (this.activeJobs.size >= this.config.maxConcurrentJobs) {
      return;
    }

    // Get next job from queue
    const job = this.jobQueue.shift();
    if (!job) {
      return;
    }

    // Start processing
    job.status = 'processing';
    job.startedAt = new Date();
    this.activeJobs.set(job.id, job);

    try {
      const results = await this.processJob(job);
      job.results = results;
      job.status = 'completed';
      job.completedAt = new Date();
      this.metrics.completedJobs++;

      if (job.callbacks?.onComplete) {
        job.callbacks.onComplete(results);
      }
    } catch (error) {
      job.status = 'failed';
      job.error = error as Error;
      job.completedAt = new Date();
      this.metrics.failedJobs++;

      if (job.callbacks?.onError) {
        job.callbacks.onError(error as Error);
      }

      console.error(`Job ${job.id} failed:`, error);
    } finally {
      this.activeJobs.delete(job.id);
      this.completedJobs.set(job.id, job);
    }
  }

  private async processJob(job: ImageProcessingJob): Promise<any[]> {
    const results: any[] = [];
    const batchSize = job.options.batchSize || this.config.batchSize;

    // Process images in batches
    for (let i = 0; i < job.images.length; i += batchSize) {
      const batch = job.images.slice(i, i + batchSize);

      // Check memory usage before processing batch
      this.checkMemoryUsage();

      const batchResults = await Promise.allSettled(
        batch.map((image) => this.processImage(image, job.type)),
      );

      // Collect successful results
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          console.error(
            `Failed to process image ${batch[index].id}:`,
            result.reason,
          );
          results.push(null);
        }
      });

      // Update progress
      const progress = Math.min(
        100,
        ((i + batch.length) / job.images.length) * 100,
      );
      if (job.callbacks?.onProgress) {
        job.callbacks.onProgress(progress);
      }

      // Small delay between batches to prevent overwhelming the system
      if (i + batchSize < job.images.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    return results;
  }

  private async processImage(
    image: any,
    type: ImageProcessingJob['type'],
  ): Promise<any> {
    const cacheKey = `${type}-${image.id}`;

    // Check cache first
    const cached = this.getCachedResult(cacheKey);
    if (cached) {
      this.metrics.cacheStats.hits++;
      return cached;
    }

    this.metrics.cacheStats.misses++;

    // Optimize image if needed
    const optimizedImage = await this.optimizeImageForProcessing(image);

    let result: any;

    // Process based on type
    switch (type) {
      case 'color_analysis':
        result = await this.processColorAnalysis(optimizedImage);
        break;
      case 'style_matching':
        result = await this.processStyleMatching(optimizedImage);
        break;
      case 'mood_board':
        result = await this.processMoodBoard(optimizedImage);
        break;
      case 'portfolio_analysis':
        result = await this.processPortfolioAnalysis(optimizedImage);
        break;
      default:
        throw new Error(`Unknown processing type: ${type}`);
    }

    // Cache the result
    this.cacheResult(cacheKey, result);

    return result;
  }

  private async optimizeImages(images: Array<any>): Promise<Array<any>> {
    return Promise.all(
      images.map(async (image) => {
        // Estimate image size and optimize if needed
        if (image.size && image.size > this.config.imageResizeThreshold) {
          return {
            ...image,
            url: await this.resizeImage(image.url, 1200), // Resize to max 1200px width
            optimized: true,
          };
        }
        return image;
      }),
    );
  }

  private async optimizeImageForProcessing(image: any): Promise<any> {
    // Additional per-image optimization
    if (
      !image.optimized &&
      (await this.getImageSize(image.url)) > this.config.imageResizeThreshold
    ) {
      return {
        ...image,
        url: await this.resizeImage(image.url, 800), // Smaller for processing
      };
    }
    return image;
  }

  private async resizeImage(url: string, maxWidth: number): Promise<string> {
    // This would integrate with image processing library like Sharp or Canvas
    // For now, return original URL (implementation would depend on environment)
    console.log(`Would resize image ${url} to max width ${maxWidth}px`);
    return url;
  }

  private async getImageSize(url: string): Promise<number> {
    try {
      // In a real implementation, this would fetch image metadata
      return Math.random() * 5 * 1024 * 1024; // Random size up to 5MB for demo
    } catch {
      return 0;
    }
  }

  private getCachedResult(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    // Check if expired
    if (Date.now() - cached.timestamp > this.config.cacheTTL) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  private cacheResult(key: string, data: any): void {
    const serialized = JSON.stringify(data);
    const size = new Blob([serialized]).size;

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      size,
    });
  }

  private getCacheSize(): number {
    return Array.from(this.cache.values()).reduce(
      (total, entry) => total + entry.size,
      0,
    );
  }

  private checkMemoryUsage(): void {
    const usage = process.memoryUsage();
    const heapUsedMB = usage.heapUsed / 1024 / 1024;
    const heapTotalMB = usage.heapTotal / 1024 / 1024;

    // If memory usage is high, optimize
    if (heapUsedMB / heapTotalMB > this.config.memoryThreshold) {
      console.warn(
        `High memory usage detected: ${heapUsedMB.toFixed(2)}MB / ${heapTotalMB.toFixed(2)}MB`,
      );
      this.optimizeMemory();

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
    }
  }

  private startMemoryMonitoring(): void {
    this.memoryMonitor = setInterval(() => {
      this.updateMemoryMetrics();
      this.optimizeMemory();
    }, 30000); // Check every 30 seconds
  }

  private updateMemoryMetrics(): void {
    const usage = process.memoryUsage();
    this.metrics.memoryUsage.current = usage.heapUsed / 1024 / 1024;
    this.metrics.memoryUsage.peak = Math.max(
      this.metrics.memoryUsage.peak,
      this.metrics.memoryUsage.current,
    );
  }

  private updateMetrics(): void {
    this.metrics.concurrency.active = this.activeJobs.size;
    this.metrics.concurrency.queued = this.jobQueue.length;
    this.updateCacheStats();
  }

  private updateCacheStats(): void {
    const total = this.metrics.cacheStats.hits + this.metrics.cacheStats.misses;
    this.metrics.cacheStats.hitRate =
      total > 0 ? this.metrics.cacheStats.hits / total : 0;
    this.metrics.cacheStats.size = this.getCacheSize();
  }

  private initializeMetrics(): PerformanceMetrics {
    return {
      totalJobs: 0,
      completedJobs: 0,
      failedJobs: 0,
      averageProcessingTime: 0,
      averageImageSize: 0,
      memoryUsage: {
        current: 0,
        peak: 0,
        available: 0,
      },
      concurrency: {
        active: 0,
        maximum: this.config.maxConcurrentJobs,
        queued: 0,
      },
      cacheStats: {
        hits: 0,
        misses: 0,
        hitRate: 0,
        size: 0,
      },
    };
  }

  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Placeholder processing methods (would integrate with actual AI services)
  private async processColorAnalysis(image: any): Promise<any> {
    // Simulate processing time
    await new Promise((resolve) =>
      setTimeout(resolve, Math.random() * 2000 + 1000),
    );
    return { type: 'color_analysis', imageId: image.id, colors: [] };
  }

  private async processStyleMatching(image: any): Promise<any> {
    await new Promise((resolve) =>
      setTimeout(resolve, Math.random() * 3000 + 2000),
    );
    return { type: 'style_matching', imageId: image.id, matches: [] };
  }

  private async processMoodBoard(image: any): Promise<any> {
    await new Promise((resolve) =>
      setTimeout(resolve, Math.random() * 1500 + 800),
    );
    return { type: 'mood_board', imageId: image.id, score: Math.random() };
  }

  private async processPortfolioAnalysis(image: any): Promise<any> {
    await new Promise((resolve) =>
      setTimeout(resolve, Math.random() * 4000 + 3000),
    );
    return { type: 'portfolio_analysis', imageId: image.id, analysis: {} };
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    if (this.memoryMonitor) {
      clearInterval(this.memoryMonitor);
      this.memoryMonitor = null;
    }
    this.clearCache();
  }
}

// Export singleton instance
export const performanceOptimizer = new PerformanceOptimizer();

// Export convenience methods
export const queueImageProcessingJob = (
  job: Omit<ImageProcessingJob, 'id' | 'status' | 'createdAt'>,
) => performanceOptimizer.queueJob(job);

export const getProcessingJobStatus = (jobId: string) =>
  performanceOptimizer.getJob(jobId);

export const getProcessingMetrics = () => performanceOptimizer.getMetrics();

export const cancelProcessingJob = (jobId: string) =>
  performanceOptimizer.cancelJob(jobId);

export const optimizeSystemMemory = () => performanceOptimizer.optimizeMemory();
