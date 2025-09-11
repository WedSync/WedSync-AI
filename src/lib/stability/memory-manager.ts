/**
 * Memory Management and Leak Prevention
 * Implements comprehensive memory management for PDF processing and file operations
 */

import { logger } from '@/lib/monitoring/structured-logger';
import { metrics } from '@/lib/monitoring/metrics';

export interface MemoryUsage {
  rss: number; // Resident Set Size
  heapTotal: number; // Total heap size
  heapUsed: number; // Used heap size
  external: number; // External memory
  arrayBuffers: number; // ArrayBuffers
}

export interface MemoryConfig {
  maxHeapSize: number; // Maximum heap size in bytes
  gcThreshold: number; // Trigger GC when heap exceeds this percentage
  monitoringInterval: number; // Memory monitoring interval in ms
  alertThreshold: number; // Alert when memory exceeds this percentage
  enableAutoCleanup: boolean; // Enable automatic cleanup
}

export class MemoryManager {
  private config: MemoryConfig;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private activeOperations = new Map<
    string,
    {
      startMemory: MemoryUsage;
      startTime: number;
      operation: string;
      cleanup: (() => void)[];
    }
  >();

  constructor(config: Partial<MemoryConfig> = {}) {
    this.config = {
      maxHeapSize: 1024 * 1024 * 1024, // 1GB default
      gcThreshold: 0.8, // 80%
      monitoringInterval: 30000, // 30 seconds
      alertThreshold: 0.9, // 90%
      enableAutoCleanup: true,
      ...config,
    };

    this.startMonitoring();
    this.setupGCTriggers();
  }

  /**
   * Execute operation with memory management
   */
  async withMemoryManagement<T>(
    operationId: string,
    operation: () => Promise<T>,
    options: {
      maxMemory?: number;
      timeoutMs?: number;
      cleanup?: (() => void)[];
    } = {},
  ): Promise<T> {
    const startMemory = this.getCurrentMemoryUsage();
    const startTime = Date.now();

    // Register operation
    this.activeOperations.set(operationId, {
      startMemory,
      startTime,
      operation: operation.name || 'anonymous',
      cleanup: options.cleanup || [],
    });

    try {
      // Check if we have enough memory to start
      if (options.maxMemory && startMemory.heapUsed > options.maxMemory) {
        await this.forceGarbageCollection();

        const afterGcMemory = this.getCurrentMemoryUsage();
        if (afterGcMemory.heapUsed > options.maxMemory) {
          throw new Error('Insufficient memory to start operation');
        }
      }

      let result: T;

      if (options.timeoutMs) {
        result = await this.withTimeout(operation(), options.timeoutMs);
      } else {
        result = await operation();
      }

      // Check memory usage after operation
      const endMemory = this.getCurrentMemoryUsage();
      const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;
      const processingTime = Date.now() - startTime;

      // Log memory usage
      logger.debug('Operation memory usage', {
        operationId,
        memoryDelta,
        processingTime,
        startMemory: startMemory.heapUsed,
        endMemory: endMemory.heapUsed,
      });

      // Record metrics
      metrics.recordHistogram('memory.operation_delta', memoryDelta, {
        operation: operation.name || 'anonymous',
      });

      metrics.recordHistogram('memory.operation_duration', processingTime, {
        operation: operation.name || 'anonymous',
      });

      // Trigger cleanup if memory usage is high
      if (
        this.config.enableAutoCleanup &&
        endMemory.heapUsed > this.config.maxHeapSize * this.config.gcThreshold
      ) {
        await this.performCleanup(operationId);
      }

      return result;
    } catch (error) {
      logger.error('Memory-managed operation failed', error as Error, {
        operationId,
        memoryUsage: this.getCurrentMemoryUsage(),
      });

      // Force cleanup on error
      await this.performCleanup(operationId);
      throw error;
    } finally {
      // Always cleanup operation tracking
      this.activeOperations.delete(operationId);
    }
  }

  /**
   * PDF processing with memory optimization
   */
  async processPDFWithMemoryManagement(
    pdfBuffer: Buffer,
    operationId: string,
  ): Promise<{
    success: boolean;
    memoryUsed: number;
    processingTime: number;
    warnings: string[];
  }> {
    const warnings: string[] = [];
    const startTime = Date.now();
    const startMemory = this.getCurrentMemoryUsage();

    try {
      // Check if buffer is too large for available memory
      const availableMemory = this.config.maxHeapSize - startMemory.heapUsed;
      if (pdfBuffer.length > availableMemory * 0.5) {
        warnings.push('PDF file is large relative to available memory');

        // Try to free memory before processing
        await this.forceGarbageCollection();
      }

      return await this.withMemoryManagement(
        operationId,
        async () => {
          // Simulate PDF processing operations
          const chunks = this.chunkBuffer(pdfBuffer, 1024 * 1024); // 1MB chunks

          for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];

            // Process chunk (simulated)
            await this.processChunk(chunk, i);

            // Check memory between chunks
            const currentMemory = this.getCurrentMemoryUsage();
            if (
              currentMemory.heapUsed >
              this.config.maxHeapSize * this.config.alertThreshold
            ) {
              warnings.push(`High memory usage detected at chunk ${i}`);
              await this.forceGarbageCollection();
            }

            // Clear chunk reference
            chunks[i] = null as any;
          }

          const endMemory = this.getCurrentMemoryUsage();
          const memoryUsed = endMemory.heapUsed - startMemory.heapUsed;
          const processingTime = Date.now() - startTime;

          return {
            success: true,
            memoryUsed,
            processingTime,
            warnings,
          };
        },
        {
          maxMemory: this.config.maxHeapSize * 0.8,
          timeoutMs: 300000, // 5 minutes
          cleanup: [
            () => {
              // Clear any remaining references
              chunks.forEach((_, index) => {
                chunks[index] = null as any;
              });
            },
          ],
        },
      );
    } catch (error) {
      logger.error('PDF processing failed', error as Error, {
        operationId,
        pdfSize: pdfBuffer.length,
        memoryUsage: this.getCurrentMemoryUsage(),
      });

      return {
        success: false,
        memoryUsed:
          this.getCurrentMemoryUsage().heapUsed - startMemory.heapUsed,
        processingTime: Date.now() - startTime,
        warnings: [...warnings, 'Processing failed due to error'],
      };
    }
  }

  /**
   * Buffer pool management for large files
   */
  private bufferPool = new Map<number, Buffer[]>();

  getBuffer(size: number): Buffer {
    const poolKey = Math.ceil(size / 1024) * 1024; // Round to nearest KB
    let pool = this.bufferPool.get(poolKey);

    if (!pool) {
      pool = [];
      this.bufferPool.set(poolKey, pool);
    }

    if (pool.length > 0) {
      return pool.pop()!;
    }

    return Buffer.allocUnsafe(poolKey);
  }

  releaseBuffer(buffer: Buffer): void {
    const size = buffer.length;
    const poolKey = Math.ceil(size / 1024) * 1024;
    let pool = this.bufferPool.get(poolKey);

    if (!pool) {
      pool = [];
      this.bufferPool.set(poolKey, pool);
    }

    // Limit pool size to prevent memory hoarding
    if (pool.length < 10) {
      // Clear buffer before returning to pool
      buffer.fill(0);
      pool.push(buffer);
    }
  }

  /**
   * Monitor memory usage continuously
   */
  private startMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(() => {
      const memoryUsage = this.getCurrentMemoryUsage();
      const memoryPercentage = memoryUsage.heapUsed / this.config.maxHeapSize;

      // Record metrics
      metrics.recordGauge('memory.heap_used', memoryUsage.heapUsed);
      metrics.recordGauge('memory.heap_total', memoryUsage.heapTotal);
      metrics.recordGauge('memory.external', memoryUsage.external);
      metrics.recordGauge('memory.array_buffers', memoryUsage.arrayBuffers);
      metrics.recordGauge('memory.usage_percentage', memoryPercentage * 100);

      // Alert if memory usage is high
      if (memoryPercentage > this.config.alertThreshold) {
        logger.warn('High memory usage detected', {
          memoryUsage,
          percentage: memoryPercentage * 100,
          activeOperations: Array.from(this.activeOperations.keys()),
        });

        metrics.incrementCounter('memory.high_usage_alerts', 1);

        // Force GC if enabled
        if (this.config.enableAutoCleanup) {
          this.forceGarbageCollection();
        }
      }

      // Log active operations consuming memory
      if (this.activeOperations.size > 0) {
        const operations = Array.from(this.activeOperations.entries()).map(
          ([id, info]) => ({
            id,
            operation: info.operation,
            duration: Date.now() - info.startTime,
            memoryDelta: memoryUsage.heapUsed - info.startMemory.heapUsed,
          }),
        );

        logger.debug('Active memory operations', { operations });
      }
    }, this.config.monitoringInterval);
  }

  /**
   * Setup garbage collection triggers
   */
  private setupGCTriggers(): void {
    // Trigger GC when memory usage exceeds threshold
    const checkAndTriggerGC = () => {
      const memoryUsage = this.getCurrentMemoryUsage();
      const memoryPercentage = memoryUsage.heapUsed / this.config.maxHeapSize;

      if (memoryPercentage > this.config.gcThreshold) {
        logger.info('Triggering garbage collection', {
          memoryUsage,
          percentage: memoryPercentage * 100,
        });

        this.forceGarbageCollection();
      }
    };

    // Check every minute
    setInterval(checkAndTriggerGC, 60000);
  }

  /**
   * Force garbage collection
   */
  async forceGarbageCollection(): Promise<void> {
    if (global.gc) {
      const beforeGC = this.getCurrentMemoryUsage();

      try {
        global.gc();

        const afterGC = this.getCurrentMemoryUsage();
        const memoryFreed = beforeGC.heapUsed - afterGC.heapUsed;

        logger.debug('Garbage collection completed', {
          memoryFreed,
          beforeGC: beforeGC.heapUsed,
          afterGC: afterGC.heapUsed,
        });

        metrics.incrementCounter('memory.gc_triggered', 1);
        metrics.recordHistogram('memory.gc_freed', memoryFreed);
      } catch (error) {
        logger.error('Garbage collection failed', error as Error);
      }
    } else {
      logger.warn('Garbage collection not available (global.gc not exposed)');
    }
  }

  /**
   * Get current memory usage
   */
  getCurrentMemoryUsage(): MemoryUsage {
    return process.memoryUsage();
  }

  /**
   * Clean up resources for operation
   */
  private async performCleanup(operationId: string): Promise<void> {
    const operation = this.activeOperations.get(operationId);

    if (operation && operation.cleanup) {
      for (const cleanupFn of operation.cleanup) {
        try {
          cleanupFn();
        } catch (error) {
          logger.error('Cleanup function failed', error as Error, {
            operationId,
          });
        }
      }
    }

    // Force GC after cleanup
    await this.forceGarbageCollection();
  }

  /**
   * Chunk large buffers for processing
   */
  private chunkBuffer(buffer: Buffer, chunkSize: number): Buffer[] {
    const chunks: Buffer[] = [];

    for (let i = 0; i < buffer.length; i += chunkSize) {
      const end = Math.min(i + chunkSize, buffer.length);
      chunks.push(buffer.subarray(i, end));
    }

    return chunks;
  }

  /**
   * Process individual chunk (simulated)
   */
  private async processChunk(chunk: Buffer, index: number): Promise<void> {
    // Simulate processing time
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Simulate some memory operations
    const tempBuffer = Buffer.alloc(chunk.length);
    chunk.copy(tempBuffer);

    // Clear temp buffer
    tempBuffer.fill(0);
  }

  /**
   * Timeout wrapper
   */
  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
  ): Promise<T> {
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Operation timed out')), timeoutMs);
    });

    return Promise.race([promise, timeout]);
  }

  /**
   * Get memory statistics
   */
  getMemoryStatistics(): {
    current: MemoryUsage;
    config: MemoryConfig;
    activeOperations: number;
    bufferPools: Record<number, number>;
  } {
    const bufferPools: Record<number, number> = {};
    this.bufferPool.forEach((pool, size) => {
      bufferPools[size] = pool.length;
    });

    return {
      current: this.getCurrentMemoryUsage(),
      config: this.config,
      activeOperations: this.activeOperations.size,
      bufferPools,
    };
  }

  /**
   * Cleanup and shutdown
   */
  shutdown(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    // Clear buffer pools
    this.bufferPool.clear();

    // Clear active operations
    this.activeOperations.clear();

    logger.info('Memory manager shut down');
  }
}

// Export singleton instance
export const memoryManager = new MemoryManager();

// Utility functions
export function withMemoryTracking<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  operationName: string,
) {
  return async (...args: T): Promise<R> => {
    const operationId = `${operationName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return memoryManager.withMemoryManagement(operationId, () => fn(...args), {
      cleanup: [
        () => {
          // Clear any references in arguments
          args.forEach((arg, index) => {
            if (arg && typeof arg === 'object' && arg.constructor === Buffer) {
              (arg as Buffer).fill(0);
            }
            args[index] = null as any;
          });
        },
      ],
    });
  };
}

export function createMemoryManagedAPI<T extends any[], R>(
  handler: (...args: T) => Promise<R>,
  operationName: string,
) {
  return withMemoryTracking(handler, operationName);
}
