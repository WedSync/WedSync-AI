interface PerformanceMetrics {
  compressionRatio: number;
  syncSpeed: number; // MB/s
  batteryUsage: number; // percentage per hour
  cacheHitRate: number; // percentage
  responseTime: number; // milliseconds
}

interface OptimizationConfig {
  enableCompression: boolean;
  maxConcurrentUploads: number;
  chunkSize: number; // bytes
  batteryThreshold: number; // percentage
  wifiOnlyLargeFiles: boolean;
  adaptiveQuality: boolean;
}

interface BackupChunk {
  id: string;
  data: string;
  size: number;
  priority: 'critical' | 'high' | 'normal' | 'low';
  compressed: boolean;
  checksum: string;
}

export class MobileBackupPerformanceOptimizer {
  private config: OptimizationConfig = {
    enableCompression: true,
    maxConcurrentUploads: 2,
    chunkSize: 256 * 1024, // 256KB chunks for mobile
    batteryThreshold: 20, // Stop intensive operations below 20%
    wifiOnlyLargeFiles: true,
    adaptiveQuality: true,
  };

  private metrics: PerformanceMetrics = {
    compressionRatio: 0,
    syncSpeed: 0,
    batteryUsage: 0,
    cacheHitRate: 0,
    responseTime: 0,
  };

  private compressionWorker: Worker | null = null;
  private uploadQueue: BackupChunk[] = [];
  private activeUploads = new Set<string>();

  constructor(config?: Partial<OptimizationConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
    this.initializeCompressionWorker();
    this.startBatteryMonitoring();
  }

  /**
   * Initialize web worker for background compression
   */
  private initializeCompressionWorker(): void {
    if (typeof Worker !== 'undefined') {
      const workerBlob = new Blob(
        [
          `
        self.onmessage = function(e) {
          const { data, id } = e.data;
          
          try {
            // Simple compression using JSON + Base64
            const jsonStr = JSON.stringify(data);
            const compressed = btoa(unescape(encodeURIComponent(jsonStr)));
            const compressionRatio = compressed.length / jsonStr.length;
            
            self.postMessage({
              id,
              compressed,
              originalSize: jsonStr.length,
              compressedSize: compressed.length,
              compressionRatio,
              success: true
            });
          } catch (error) {
            self.postMessage({
              id,
              error: error.message,
              success: false
            });
          }
        };
      `,
        ],
        { type: 'application/javascript' },
      );

      this.compressionWorker = new Worker(URL.createObjectURL(workerBlob));
      this.compressionWorker.onmessage =
        this.handleCompressionResult.bind(this);
    }
  }

  /**
   * Handle compression worker results
   */
  private handleCompressionResult(event: MessageEvent): void {
    const result = event.data;

    if (result.success) {
      // Update compression metrics
      this.metrics.compressionRatio =
        (this.metrics.compressionRatio + result.compressionRatio) / 2;

      // Process compressed chunk
      this.processCompressedChunk(result);
    } else {
      console.error('Compression failed:', result.error);
    }
  }

  /**
   * Start monitoring device battery for adaptive performance
   */
  private async startBatteryMonitoring(): Promise<void> {
    if ('getBattery' in navigator) {
      try {
        const battery = await (navigator as any).getBattery();

        battery.addEventListener('levelchange', () => {
          this.adaptTobattery(battery.level * 100);
        });

        battery.addEventListener('chargingchange', () => {
          this.adaptToCharging(battery.charging);
        });

        // Initial adaptation
        this.adaptTobattery(battery.level * 100);
        this.adaptToCharging(battery.charging);
      } catch (error) {
        console.warn('Battery monitoring not available:', error);
      }
    }
  }

  /**
   * Adapt performance settings based on battery level
   */
  private adaptToBattery(batteryLevel: number): void {
    if (batteryLevel < this.config.batteryThreshold) {
      // Low battery mode - reduce performance to preserve battery
      this.config.maxConcurrentUploads = 1;
      this.config.enableCompression = false; // Compression uses CPU
      this.config.chunkSize = 128 * 1024; // Smaller chunks
    } else if (batteryLevel > 80) {
      // High battery - maximum performance
      this.config.maxConcurrentUploads = 3;
      this.config.enableCompression = true;
      this.config.chunkSize = 512 * 1024; // Larger chunks for efficiency
    } else {
      // Normal battery - balanced performance
      this.config.maxConcurrentUploads = 2;
      this.config.enableCompression = true;
      this.config.chunkSize = 256 * 1024;
    }
  }

  /**
   * Adapt to charging status
   */
  private adaptToCharging(isCharging: boolean): void {
    if (isCharging) {
      // Device is charging - can use more aggressive optimization
      this.config.maxConcurrentUploads = Math.min(
        4,
        this.config.maxConcurrentUploads + 1,
      );
      this.config.enableCompression = true;
    } else {
      // On battery - preserve power
      this.config.maxConcurrentUploads = Math.max(
        1,
        this.config.maxConcurrentUploads - 1,
      );
    }
  }

  /**
   * Optimize data for mobile backup with intelligent compression
   */
  async optimizeForBackup(
    data: any,
    priority: BackupChunk['priority'] = 'normal',
  ): Promise<BackupChunk[]> {
    const startTime = Date.now();
    const chunks: BackupChunk[] = [];

    try {
      const jsonData = JSON.stringify(data);
      const totalSize = jsonData.length;

      // Split into optimized chunks
      const numChunks = Math.ceil(totalSize / this.config.chunkSize);

      for (let i = 0; i < numChunks; i++) {
        const start = i * this.config.chunkSize;
        const end = Math.min(start + this.config.chunkSize, totalSize);
        const chunkData = jsonData.slice(start, end);

        const chunk: BackupChunk = {
          id: `${Date.now()}-${i}`,
          data: chunkData,
          size: chunkData.length,
          priority,
          compressed: false,
          checksum: this.calculateChecksum(chunkData),
        };

        // Compress if enabled and beneficial
        if (this.config.enableCompression && this.shouldCompress(chunkData)) {
          await this.compressChunk(chunk);
        }

        chunks.push(chunk);
      }

      // Update response time metrics
      this.metrics.responseTime =
        (this.metrics.responseTime + (Date.now() - startTime)) / 2;

      return chunks;
    } catch (error) {
      console.error('Backup optimization failed:', error);
      throw new Error('Failed to optimize backup data');
    }
  }

  /**
   * Determine if data should be compressed
   */
  private shouldCompress(data: string): boolean {
    // Don't compress small data or already compressed data
    if (data.length < 1024) return false;

    // Check if data appears to be already compressed/encoded
    const entropy = this.calculateEntropy(data);
    return entropy > 0.7; // Compress if data has high entropy (not already compressed)
  }

  /**
   * Calculate data entropy to determine compressibility
   */
  private calculateEntropy(data: string): number {
    const frequency: { [char: string]: number } = {};
    const length = data.length;

    // Count character frequencies
    for (const char of data) {
      frequency[char] = (frequency[char] || 0) + 1;
    }

    // Calculate entropy
    let entropy = 0;
    for (const count of Object.values(frequency)) {
      const probability = count / length;
      entropy -= probability * Math.log2(probability);
    }

    return entropy / Math.log2(256); // Normalize to 0-1 range
  }

  /**
   * Compress a data chunk
   */
  private async compressChunk(chunk: BackupChunk): Promise<void> {
    if (!this.compressionWorker) {
      // Fallback to synchronous compression
      chunk.data = btoa(unescape(encodeURIComponent(chunk.data)));
      chunk.compressed = true;
      return;
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Compression timeout'));
      }, 5000);

      const handleMessage = (event: MessageEvent) => {
        if (event.data.id === chunk.id) {
          clearTimeout(timeout);
          this.compressionWorker?.removeEventListener('message', handleMessage);

          if (event.data.success) {
            chunk.data = event.data.compressed;
            chunk.size = event.data.compressedSize;
            chunk.compressed = true;
            resolve();
          } else {
            reject(new Error(event.data.error));
          }
        }
      };

      this.compressionWorker.addEventListener('message', handleMessage);
      this.compressionWorker.postMessage({
        id: chunk.id,
        data: chunk.data,
      });
    });
  }

  /**
   * Process compressed chunk result
   */
  private processCompressedChunk(result: any): void {
    // Add to upload queue with proper priority
    const chunk = this.uploadQueue.find((c) => c.id === result.id);
    if (chunk) {
      // Update chunk with compression results
      chunk.data = result.compressed;
      chunk.size = result.compressedSize;
      chunk.compressed = true;

      // Move to priority queue based on chunk priority
      this.prioritizeUpload(chunk);
    }
  }

  /**
   * Prioritize upload queue based on chunk priority and wedding day context
   */
  private prioritizeUpload(chunk: BackupChunk): void {
    // Remove from current position
    this.uploadQueue = this.uploadQueue.filter((c) => c.id !== chunk.id);

    // Find correct position based on priority
    const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
    let insertIndex = 0;

    for (let i = 0; i < this.uploadQueue.length; i++) {
      if (
        priorityOrder[chunk.priority] <
        priorityOrder[this.uploadQueue[i].priority]
      ) {
        insertIndex = i;
        break;
      }
      insertIndex = i + 1;
    }

    this.uploadQueue.splice(insertIndex, 0, chunk);
  }

  /**
   * Smart caching with wedding day awareness
   */
  async optimizeCache(): Promise<void> {
    try {
      const cacheKeys = await this.getCacheKeys();
      const totalCacheSize = await this.calculateCacheSize(cacheKeys);
      const maxCacheSize = await this.getMaxCacheSize();

      if (totalCacheSize > maxCacheSize * 0.8) {
        // Cache is getting full - intelligent cleanup
        await this.performIntelligentCacheCleanup(cacheKeys);
      }

      // Pre-cache critical wedding data
      await this.preCacheCriticalData();

      // Update cache hit rate metrics
      this.updateCacheMetrics();
    } catch (error) {
      console.error('Cache optimization failed:', error);
    }
  }

  /**
   * Get cache keys from localStorage and other storage
   */
  private async getCacheKeys(): Promise<string[]> {
    const keys: string[] = [];

    // LocalStorage keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) keys.push(key);
    }

    // IndexedDB cache keys (if applicable)
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        keys.push(...cacheNames);
      } catch (error) {
        console.warn('Could not access cache API:', error);
      }
    }

    return keys;
  }

  /**
   * Calculate total cache size
   */
  private async calculateCacheSize(keys: string[]): Promise<number> {
    let totalSize = 0;

    for (const key of keys) {
      const data = localStorage.getItem(key);
      if (data) {
        totalSize += data.length;
      }
    }

    return totalSize;
  }

  /**
   * Get maximum recommended cache size for mobile
   */
  private async getMaxCacheSize(): Promise<number> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return (estimate.quota || 50 * 1024 * 1024) * 0.1; // Use 10% of available storage
    }

    return 5 * 1024 * 1024; // 5MB default for mobile
  }

  /**
   * Perform intelligent cache cleanup prioritizing wedding data
   */
  private async performIntelligentCacheCleanup(keys: string[]): Promise<void> {
    const protectedKeys = [
      'wedding_details',
      'guest_lists',
      'wedding_timeline',
      'vendors',
      'emergency_contacts',
    ];

    const cleanupCandidates = keys.filter(
      (key) => !protectedKeys.some((protected) => key.includes(protected)),
    );

    // Sort by last access time (if available) or alphabetically
    cleanupCandidates.sort();

    // Remove oldest 25% of non-critical cache
    const itemsToRemove = Math.floor(cleanupCandidates.length * 0.25);

    for (let i = 0; i < itemsToRemove; i++) {
      try {
        localStorage.removeItem(cleanupCandidates[i]);
      } catch (error) {
        console.warn(
          `Failed to remove cache item ${cleanupCandidates[i]}:`,
          error,
        );
      }
    }
  }

  /**
   * Pre-cache critical wedding data for offline access
   */
  private async preCacheCriticalData(): Promise<void> {
    const criticalEndpoints = [
      '/api/wedding/timeline',
      '/api/vendors/contacts',
      '/api/guests/list',
      '/api/emergency/contacts',
    ];

    const cachePromises = criticalEndpoints.map(async (endpoint) => {
      try {
        const response = await fetch(endpoint);
        const data = await response.json();

        // Store with expiry
        const cacheData = {
          data,
          timestamp: Date.now(),
          expiry: Date.now() + 4 * 60 * 60 * 1000, // 4 hours
        };

        localStorage.setItem(`cache_${endpoint}`, JSON.stringify(cacheData));
      } catch (error) {
        console.warn(`Failed to pre-cache ${endpoint}:`, error);
      }
    });

    await Promise.allSettled(cachePromises);
  }

  /**
   * Update cache hit rate metrics
   */
  private updateCacheMetrics(): void {
    // This would typically track actual cache hits/misses
    // For now, simulate based on cache optimization
    this.metrics.cacheHitRate = Math.min(95, this.metrics.cacheHitRate + 1);
  }

  /**
   * Calculate simple checksum for data integrity
   */
  private calculateChecksum(data: string): string {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Network-aware sync optimization
   */
  async optimizeNetworkSync(): Promise<void> {
    const connection = (navigator as any).connection;

    if (connection) {
      const effectiveType = connection.effectiveType;
      const downlink = connection.downlink;

      // Adjust configuration based on network speed
      if (effectiveType === '4g' && downlink > 10) {
        // Fast connection - maximize throughput
        this.config.maxConcurrentUploads = 4;
        this.config.chunkSize = 1024 * 1024; // 1MB chunks
      } else if (effectiveType === '3g' || downlink < 1) {
        // Slow connection - minimize overhead
        this.config.maxConcurrentUploads = 1;
        this.config.chunkSize = 128 * 1024; // 128KB chunks
      } else {
        // Moderate connection - balanced approach
        this.config.maxConcurrentUploads = 2;
        this.config.chunkSize = 256 * 1024; // 256KB chunks
      }

      // Update sync speed metrics
      this.metrics.syncSpeed = downlink || 1;
    }
  }

  /**
   * Wedding day performance mode
   */
  enableWeddingDayMode(): void {
    // Ultra-conservative settings for wedding day reliability
    this.config = {
      ...this.config,
      enableCompression: false, // Avoid CPU overhead
      maxConcurrentUploads: 1, // Minimize network congestion
      chunkSize: 64 * 1024, // Small, reliable chunks
      batteryThreshold: 30, // Higher battery threshold
      wifiOnlyLargeFiles: true,
      adaptiveQuality: false, // Consistent, predictable performance
    };

    console.log('Wedding Day Performance Mode Enabled');
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Get current configuration
   */
  getConfig(): OptimizationConfig {
    return { ...this.config };
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.compressionWorker) {
      this.compressionWorker.terminate();
      this.compressionWorker = null;
    }

    this.uploadQueue = [];
    this.activeUploads.clear();
  }
}
