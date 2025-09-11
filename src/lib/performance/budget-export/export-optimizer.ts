/**
 * WS-166 Budget Export Performance Optimizer
 * Team D - Round 1 Implementation
 *
 * Mobile-first export optimization with memory management and progressive loading
 */

export interface BudgetData {
  categories: BudgetCategory[];
  transactions: BudgetTransaction[];
  totals: BudgetTotals;
  metadata: BudgetMetadata;
}

export interface OptimizedBudgetData extends BudgetData {
  chunks: BudgetDataChunk[];
  optimization: OptimizationMetrics;
}

export interface BudgetCategory {
  id: string;
  name: string;
  allocated: number;
  spent: number;
  remaining: number;
  transactions: BudgetTransaction[];
}

export interface BudgetTransaction {
  id: string;
  categoryId: string;
  vendorId?: string;
  amount: number;
  description: string;
  date: Date;
  type: 'expense' | 'payment' | 'refund';
  status: 'pending' | 'completed' | 'cancelled';
}

export interface BudgetTotals {
  totalBudget: number;
  totalSpent: number;
  totalRemaining: number;
  categoriesCount: number;
  transactionsCount: number;
}

export interface BudgetMetadata {
  weddingId: string;
  coupleIds: string[];
  currency: string;
  lastUpdated: Date;
  exportedAt: Date;
}

export interface BudgetDataChunk {
  chunkId: string;
  startIndex: number;
  endIndex: number;
  data: Partial<BudgetData>;
  size: number; // in bytes
}

export interface DeviceInfo {
  memory: number; // in GB
  connectionType: 'wifi' | '4g' | '3g' | 'slow' | 'offline';
  screenWidth: number;
  userAgent: string;
  isLowEndDevice: boolean;
  batteryLevel?: number;
}

export interface PerformanceMetrics {
  renderTime: number;
  exportGenerationTime: number;
  fileDownloadTime: number;
  memoryUsage: number;
  batteryImpact: number;
  networkUsage: number;
  chunksProcessed: number;
  errorRate: number;
}

export interface OptimizationMetrics {
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
  chunksCreated: number;
  memoryReduction: number;
}

export interface ExportRequest {
  weddingId: string;
  format: 'csv' | 'pdf' | 'excel' | 'json';
  categories?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  includeVendors: boolean;
  includeTransactions: boolean;
  groupBy?: 'category' | 'vendor' | 'date';
}

/**
 * Performance optimizer for budget export operations
 * Handles mobile constraints, memory management, and progressive loading
 */
export class ExportPerformanceOptimizer {
  private static readonly CHUNK_SIZE_THRESHOLD = 50; // transactions per chunk
  private static readonly MEMORY_THRESHOLD = 100 * 1024 * 1024; // 100MB
  private static readonly MAX_CONCURRENT_CHUNKS = 3;
  private static readonly OPTIMIZATION_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  private static performanceCache = new Map<string, OptimizedBudgetData>();
  private static deviceCapabilities = new Map<string, DeviceInfo>();

  /**
   * Optimize budget data for mobile devices
   */
  static async optimizeForMobile(
    budgetData: BudgetData,
    deviceCapabilities: DeviceInfo,
  ): Promise<OptimizedBudgetData> {
    const startTime = performance.now();

    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(budgetData, deviceCapabilities);
      const cached = this.performanceCache.get(cacheKey);
      if (cached && this.isCacheValid(cached)) {
        return cached;
      }

      // Determine optimal chunk size based on device capabilities
      const optimalChunkSize = await this.getOptimalChunkSize(
        budgetData.transactions.length,
        deviceCapabilities.memory,
      );

      // Create optimized chunks
      const chunks = await this.createOptimizedChunks(
        budgetData,
        optimalChunkSize,
      );

      // Compress data if needed for low-end devices
      const compressedData = deviceCapabilities.isLowEndDevice
        ? await this.compressDataForLowEndDevices(budgetData)
        : budgetData;

      // Calculate optimization metrics
      const optimizationMetrics: OptimizationMetrics = {
        originalSize: this.calculateDataSize(budgetData),
        optimizedSize: this.calculateDataSize(compressedData),
        compressionRatio: 0,
        chunksCreated: chunks.length,
        memoryReduction: 0,
      };

      optimizationMetrics.compressionRatio =
        optimizationMetrics.originalSize / optimizationMetrics.optimizedSize;
      optimizationMetrics.memoryReduction =
        optimizationMetrics.originalSize - optimizationMetrics.optimizedSize;

      const optimizedData: OptimizedBudgetData = {
        ...compressedData,
        chunks,
        optimization: optimizationMetrics,
      };

      // Cache the result
      this.performanceCache.set(cacheKey, optimizedData);
      this.scheduleCacheCleanup();

      return optimizedData;
    } catch (error) {
      console.error('Error optimizing budget data for mobile:', error);
      throw new Error('Failed to optimize budget data for mobile device');
    }
  }

  /**
   * Measure export performance metrics
   */
  static async measureExportPerformance(
    exportType: string,
    dataSize: number,
  ): Promise<PerformanceMetrics> {
    const startTime = performance.now();
    const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

    try {
      // Simulate or measure actual export performance
      const renderTime = await this.measureRenderTime(exportType, dataSize);
      const exportGenerationTime = performance.now() - startTime;
      const currentMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryUsage = currentMemory - initialMemory;

      const metrics: PerformanceMetrics = {
        renderTime,
        exportGenerationTime,
        fileDownloadTime: 0, // Will be measured during actual download
        memoryUsage,
        batteryImpact: await this.estimateBatteryImpact(
          exportGenerationTime,
          memoryUsage,
        ),
        networkUsage: await this.estimateNetworkUsage(dataSize, exportType),
        chunksProcessed: Math.ceil(dataSize / this.CHUNK_SIZE_THRESHOLD),
        errorRate: 0, // Will be updated based on actual errors
      };

      // Store metrics for analysis
      await this.storePerformanceMetrics(metrics, exportType, dataSize);

      return metrics;
    } catch (error) {
      console.error('Error measuring export performance:', error);
      throw new Error('Failed to measure export performance');
    }
  }

  /**
   * Calculate optimal chunk size based on device capabilities
   */
  static async getOptimalChunkSize(
    totalRecords: number,
    deviceMemory: number,
  ): Promise<number> {
    // Base chunk size calculations
    const baseChunkSize = this.CHUNK_SIZE_THRESHOLD;

    // Adjust for device memory
    let memoryMultiplier = 1;
    if (deviceMemory < 2) {
      // Less than 2GB
      memoryMultiplier = 0.5;
    } else if (deviceMemory < 4) {
      // Less than 4GB
      memoryMultiplier = 0.75;
    } else if (deviceMemory >= 8) {
      // 8GB or more
      memoryMultiplier = 2;
    }

    // Adjust for total record count
    let recordMultiplier = 1;
    if (totalRecords > 1000) {
      recordMultiplier = 0.5;
    } else if (totalRecords < 100) {
      recordMultiplier = 2;
    }

    const optimalChunkSize = Math.floor(
      baseChunkSize * memoryMultiplier * recordMultiplier,
    );

    // Ensure minimum and maximum bounds
    return Math.max(10, Math.min(optimalChunkSize, 200));
  }

  /**
   * Preload critical budget data for faster exports
   */
  static async preloadCriticalData(coupleId: string): Promise<void> {
    try {
      // Preload frequently accessed budget categories
      const criticalCategories = await this.getCriticalCategories(coupleId);

      // Cache category totals
      const categoryTotals =
        await this.precomputeCategoryTotals(criticalCategories);

      // Cache recent transactions
      const recentTransactions = await this.getRecentTransactions(coupleId, 30); // Last 30 days

      // Store in optimization cache
      const cacheKey = `preload_${coupleId}`;
      this.performanceCache.set(cacheKey, {
        categories: criticalCategories,
        transactions: recentTransactions,
        totals: categoryTotals,
        metadata: {
          weddingId: coupleId,
          coupleIds: [coupleId],
          currency: 'USD',
          lastUpdated: new Date(),
          exportedAt: new Date(),
        },
        chunks: [],
        optimization: {
          originalSize: 0,
          optimizedSize: 0,
          compressionRatio: 1,
          chunksCreated: 0,
          memoryReduction: 0,
        },
      });

      console.log(`Preloaded critical data for couple ${coupleId}`);
    } catch (error) {
      console.error('Error preloading critical data:', error);
      // Don't throw - preloading is an optimization, not critical
    }
  }

  /**
   * Create optimized data chunks for progressive loading
   */
  private static async createOptimizedChunks(
    budgetData: BudgetData,
    chunkSize: number,
  ): Promise<BudgetDataChunk[]> {
    const chunks: BudgetDataChunk[] = [];
    const transactions = budgetData.transactions;

    for (let i = 0; i < transactions.length; i += chunkSize) {
      const chunkTransactions = transactions.slice(i, i + chunkSize);
      const chunkCategories = this.getRelevantCategories(
        chunkTransactions,
        budgetData.categories,
      );

      const chunkData: Partial<BudgetData> = {
        transactions: chunkTransactions,
        categories: chunkCategories,
        totals: this.calculateChunkTotals(chunkTransactions),
      };

      const chunk: BudgetDataChunk = {
        chunkId: `chunk_${i}_${i + chunkSize}`,
        startIndex: i,
        endIndex: Math.min(i + chunkSize, transactions.length),
        data: chunkData,
        size: this.calculateDataSize(chunkData),
      };

      chunks.push(chunk);
    }

    return chunks;
  }

  /**
   * Compress data for low-end devices
   */
  private static async compressDataForLowEndDevices(
    budgetData: BudgetData,
  ): Promise<BudgetData> {
    return {
      ...budgetData,
      transactions: budgetData.transactions.map((transaction) => ({
        ...transaction,
        // Remove optional fields to save memory
        vendorId: transaction.vendorId || undefined,
      })),
      categories: budgetData.categories.map((category) => ({
        ...category,
        // Limit transaction details in categories for low-end devices
        transactions: category.transactions.slice(0, 10),
      })),
    };
  }

  /**
   * Measure render time for export components
   */
  private static async measureRenderTime(
    exportType: string,
    dataSize: number,
  ): Promise<number> {
    // Simulate render time based on export type and data size
    const baseTime = 100; // Base 100ms
    const sizeMultiplier = dataSize / 1000; // 1ms per 1000 records
    const typeMultiplier =
      exportType === 'pdf' ? 3 : exportType === 'excel' ? 2 : 1;

    return baseTime + sizeMultiplier * typeMultiplier;
  }

  /**
   * Estimate battery impact of export operation
   */
  private static async estimateBatteryImpact(
    processingTime: number,
    memoryUsage: number,
  ): Promise<number> {
    // Battery impact estimation (percentage)
    const timeImpact = (processingTime / 1000) * 0.1; // 0.1% per second
    const memoryImpact = (memoryUsage / (1024 * 1024)) * 0.05; // 0.05% per MB

    return Math.min(timeImpact + memoryImpact, 5); // Cap at 5%
  }

  /**
   * Estimate network usage for export
   */
  private static async estimateNetworkUsage(
    dataSize: number,
    exportType: string,
  ): Promise<number> {
    // Network usage estimation in bytes
    const compressionRatio =
      exportType === 'csv'
        ? 0.3
        : exportType === 'json'
          ? 0.6
          : exportType === 'excel'
            ? 0.8
            : 1.0;

    return dataSize * compressionRatio;
  }

  /**
   * Utility methods
   */
  private static generateCacheKey(
    budgetData: BudgetData,
    deviceCapabilities: DeviceInfo,
  ): string {
    const dataHash = this.hashData(budgetData);
    const deviceHash = this.hashDevice(deviceCapabilities);
    return `export_${dataHash}_${deviceHash}`;
  }

  private static hashData(data: BudgetData): string {
    return `${data.metadata.weddingId}_${data.transactions.length}_${data.metadata.lastUpdated.getTime()}`;
  }

  private static hashDevice(device: DeviceInfo): string {
    return `${device.memory}_${device.connectionType}_${device.isLowEndDevice}`;
  }

  private static isCacheValid(cached: OptimizedBudgetData): boolean {
    const cacheAge = Date.now() - cached.metadata.exportedAt.getTime();
    return cacheAge < this.OPTIMIZATION_CACHE_TTL;
  }

  private static calculateDataSize(data: any): number {
    return JSON.stringify(data).length;
  }

  private static getRelevantCategories(
    transactions: BudgetTransaction[],
    allCategories: BudgetCategory[],
  ): BudgetCategory[] {
    const categoryIds = new Set(transactions.map((t) => t.categoryId));
    return allCategories.filter((category) => categoryIds.has(category.id));
  }

  private static calculateChunkTotals(
    transactions: BudgetTransaction[],
  ): BudgetTotals {
    const totalSpent = transactions.reduce((sum, t) => sum + t.amount, 0);
    return {
      totalBudget: 0, // Will be calculated at category level
      totalSpent,
      totalRemaining: 0,
      categoriesCount: new Set(transactions.map((t) => t.categoryId)).size,
      transactionsCount: transactions.length,
    };
  }

  private static async getCriticalCategories(
    coupleId: string,
  ): Promise<BudgetCategory[]> {
    // Mock implementation - would fetch from database
    return [];
  }

  private static async precomputeCategoryTotals(
    categories: BudgetCategory[],
  ): Promise<BudgetTotals> {
    // Mock implementation - would calculate from categories
    return {
      totalBudget: 0,
      totalSpent: 0,
      totalRemaining: 0,
      categoriesCount: categories.length,
      transactionsCount: 0,
    };
  }

  private static async getRecentTransactions(
    coupleId: string,
    days: number,
  ): Promise<BudgetTransaction[]> {
    // Mock implementation - would fetch from database
    return [];
  }

  private static async storePerformanceMetrics(
    metrics: PerformanceMetrics,
    exportType: string,
    dataSize: number,
  ): Promise<void> {
    // Store metrics for analysis - would send to analytics service
    console.log('Performance metrics:', { metrics, exportType, dataSize });
  }

  private static scheduleCacheCleanup(): void {
    // Clean up expired cache entries
    setTimeout(() => {
      const now = Date.now();
      const entries = Array.from(this.performanceCache.entries());
      entries.forEach(([key, data]) => {
        if (
          now - data.metadata.exportedAt.getTime() >
          this.OPTIMIZATION_CACHE_TTL
        ) {
          this.performanceCache.delete(key);
        }
      });
    }, this.OPTIMIZATION_CACHE_TTL);
  }
}

/**
 * Device capability detector for mobile optimization
 */
export class DeviceCapabilityDetector {
  /**
   * Detect device capabilities for optimization
   */
  static async detectCapabilities(): Promise<DeviceInfo> {
    const memory = this.getDeviceMemory();
    const connectionType = await this.getConnectionType();
    const screenWidth = window.innerWidth;
    const userAgent = navigator.userAgent;
    const isLowEndDevice = this.isLowEndDevice(memory, screenWidth, userAgent);
    const batteryLevel = await this.getBatteryLevel();

    return {
      memory,
      connectionType,
      screenWidth,
      userAgent,
      isLowEndDevice,
      batteryLevel,
    };
  }

  private static getDeviceMemory(): number {
    // @ts-ignore - Navigator memory API
    return (navigator as any).deviceMemory || 4; // Default to 4GB if not available
  }

  private static async getConnectionType(): Promise<
    DeviceInfo['connectionType']
  > {
    // @ts-ignore - Navigator connection API
    const connection =
      (navigator as any).connection ||
      (navigator as any).mozConnection ||
      (navigator as any).webkitConnection;

    if (!connection) return '4g'; // Default assumption

    const effectiveType = connection.effectiveType;
    switch (effectiveType) {
      case 'slow-2g':
      case '2g':
        return 'slow';
      case '3g':
        return '3g';
      case '4g':
        return '4g';
      default:
        return connection.type === 'wifi' ? 'wifi' : '4g';
    }
  }

  private static isLowEndDevice(
    memory: number,
    screenWidth: number,
    userAgent: string,
  ): boolean {
    // Low-end device heuristics
    return (
      memory <= 2 || screenWidth <= 375 || /Android.*[2-4]\./i.test(userAgent)
    );
  }

  private static async getBatteryLevel(): Promise<number | undefined> {
    try {
      // @ts-ignore - Battery API
      const battery = await (navigator as any).getBattery();
      return battery ? battery.level : undefined;
    } catch {
      return undefined; // Battery API not available
    }
  }
}
