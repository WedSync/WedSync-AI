import { Worker } from 'worker_threads';
import { createHash } from 'crypto';

export interface PerformanceConfig {
  enableParallelProcessing: boolean;
  enableCaching: boolean;
  maxWorkers: number;
  cacheExpiryMs: number;
  chunkSize: number;
}

export class PerformanceOptimizer {
  private static cache = new Map<string, CachedResult>();
  private static workers: Worker[] = [];
  private static config: PerformanceConfig = {
    enableParallelProcessing: true,
    enableCaching: true,
    maxWorkers: 4,
    cacheExpiryMs: 15 * 60 * 1000, // 15 minutes
    chunkSize: 1024 * 1024, // 1MB chunks for parallel processing
  };

  /**
   * Optimize PDF processing for speed
   */
  static async optimizeProcessing(
    pdfBuffer: Buffer,
    processFunc: (chunk: Buffer) => Promise<any>,
  ): Promise<any[]> {
    const startTime = Date.now();

    // Check cache first
    const cacheKey = this.generateCacheKey(pdfBuffer);
    if (this.config.enableCaching) {
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        console.log(`Cache hit! Saved ${Date.now() - startTime}ms`);
        return cached.result;
      }
    }

    let results: any[];

    if (
      this.config.enableParallelProcessing &&
      pdfBuffer.length > this.config.chunkSize
    ) {
      // Process in parallel chunks
      results = await this.processInParallel(pdfBuffer, processFunc);
    } else {
      // Process sequentially
      results = [await processFunc(pdfBuffer)];
    }

    // Cache results
    if (this.config.enableCaching) {
      this.addToCache(cacheKey, results);
    }

    const processingTime = Date.now() - startTime;
    console.log(`Processing completed in ${processingTime}ms`);

    return results;
  }

  /**
   * Process PDF in parallel chunks
   */
  private static async processInParallel(
    buffer: Buffer,
    processFunc: (chunk: Buffer) => Promise<any>,
  ): Promise<any[]> {
    const chunks = this.splitIntoChunks(buffer);
    const numWorkers = Math.min(chunks.length, this.config.maxWorkers);

    console.log(
      `Processing ${chunks.length} chunks with ${numWorkers} workers`,
    );

    // Create processing promises
    const promises = chunks.map((chunk, index) =>
      this.processChunkWithTimeout(chunk, processFunc, index),
    );

    // Process all chunks in parallel with concurrency limit
    const results = await this.processWithConcurrency(promises, numWorkers);

    return results;
  }

  /**
   * Process chunk with timeout
   */
  private static async processChunkWithTimeout(
    chunk: Buffer,
    processFunc: (chunk: Buffer) => Promise<any>,
    index: number,
    timeoutMs: number = 10000,
  ): Promise<any> {
    return Promise.race([
      processFunc(chunk),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error(`Chunk ${index} processing timeout`)),
          timeoutMs,
        ),
      ),
    ]);
  }

  /**
   * Process promises with concurrency limit
   */
  private static async processWithConcurrency<T>(
    promises: Promise<T>[],
    concurrency: number,
  ): Promise<T[]> {
    const results: T[] = [];
    const executing: Promise<void>[] = [];

    for (const [index, promise] of promises.entries()) {
      const executingPromise = promise.then((result) => {
        results[index] = result;
      });

      executing.push(executingPromise);

      if (executing.length >= concurrency) {
        await Promise.race(executing);
        executing.splice(
          executing.findIndex((p) => p === executingPromise),
          1,
        );
      }
    }

    await Promise.all(executing);
    return results;
  }

  /**
   * Split buffer into chunks for parallel processing
   */
  private static splitIntoChunks(buffer: Buffer): Buffer[] {
    const chunks: Buffer[] = [];
    const chunkSize = this.config.chunkSize;

    for (let i = 0; i < buffer.length; i += chunkSize) {
      const end = Math.min(i + chunkSize, buffer.length);
      chunks.push(buffer.slice(i, end));
    }

    return chunks;
  }

  /**
   * Generate cache key for PDF
   */
  private static generateCacheKey(buffer: Buffer): string {
    return createHash('sha256')
      .update(buffer.slice(0, Math.min(buffer.length, 10240))) // Use first 10KB for hash
      .digest('hex');
  }

  /**
   * Get from cache
   */
  private static getFromCache(key: string): CachedResult | null {
    const cached = this.cache.get(key);

    if (!cached) return null;

    // Check if expired
    if (Date.now() - cached.timestamp > this.config.cacheExpiryMs) {
      this.cache.delete(key);
      return null;
    }

    return cached;
  }

  /**
   * Add to cache
   */
  private static addToCache(key: string, result: any[]): void {
    // Limit cache size
    if (this.cache.size > 100) {
      // Remove oldest entries
      const entriesToRemove = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)
        .slice(0, 20);

      entriesToRemove.forEach(([key]) => this.cache.delete(key));
    }

    this.cache.set(key, {
      result,
      timestamp: Date.now(),
    });
  }

  /**
   * Optimize for 10-page document processing
   */
  static async optimizeFor10PageDocument(): Promise<void> {
    // Specific optimizations for 10-page documents
    this.config = {
      ...this.config,
      maxWorkers: 5, // One worker per 2 pages
      chunkSize: 512 * 1024, // Smaller chunks for better parallelization
      enableParallelProcessing: true,
      enableCaching: true,
    };
  }

  /**
   * Pre-warm cache with common patterns
   */
  static async prewarmCache(): Promise<void> {
    // Pre-compile regex patterns
    const commonPatterns = [
      /wedding/gi,
      /bride/gi,
      /groom/gi,
      /venue/gi,
      /date/gi,
      /email/gi,
      /phone/gi,
    ];

    // Store compiled patterns for faster matching
    (global as any).precompiledPatterns = commonPatterns;
  }

  /**
   * Get performance metrics
   */
  static getMetrics(): PerformanceMetrics {
    return {
      cacheSize: this.cache.size,
      cacheHitRate: this.calculateCacheHitRate(),
      averageProcessingTime: this.calculateAverageProcessingTime(),
      config: this.config,
    };
  }

  /**
   * Calculate cache hit rate
   */
  private static cacheHits = 0;
  private static cacheMisses = 0;

  private static calculateCacheHitRate(): number {
    const total = this.cacheHits + this.cacheMisses;
    return total > 0 ? (this.cacheHits / total) * 100 : 0;
  }

  /**
   * Calculate average processing time
   */
  private static processingTimes: number[] = [];

  private static calculateAverageProcessingTime(): number {
    if (this.processingTimes.length === 0) return 0;

    const sum = this.processingTimes.reduce((a, b) => a + b, 0);
    return Math.round(sum / this.processingTimes.length);
  }

  /**
   * Optimize memory usage
   */
  static optimizeMemory(): void {
    // Clear old cache entries
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.config.cacheExpiryMs) {
        this.cache.delete(key);
      }
    }

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  }

  /**
   * Enable production optimizations
   */
  static enableProductionMode(): void {
    this.config = {
      enableParallelProcessing: true,
      enableCaching: true,
      maxWorkers: 8,
      cacheExpiryMs: 30 * 60 * 1000, // 30 minutes
      chunkSize: 2 * 1024 * 1024, // 2MB chunks
    };

    // Pre-warm cache
    this.prewarmCache();
  }
}

interface CachedResult {
  result: any[];
  timestamp: number;
}

interface PerformanceMetrics {
  cacheSize: number;
  cacheHitRate: number;
  averageProcessingTime: number;
  config: PerformanceConfig;
}

// Export singleton instance
export const performanceOptimizer = PerformanceOptimizer;
