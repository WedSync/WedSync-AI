/**
 * WS-175 Advanced Data Encryption - Smart Encryption Cache
 * LRU cache implementation for encryption keys and operations with performance optimization
 */

import * as crypto from 'node:crypto';
import { performance } from 'node:perf_hooks';
import type {
  EncryptionCacheService,
  CacheConfig,
  CacheEntry,
  CacheMetrics,
  EncryptionMetadata,
  EncryptionError,
  EncryptionErrorCode,
} from '../../../types/encryption-performance';

/**
 * LRU Node for doubly-linked list implementation
 */
class LRUNode {
  key: string;
  entry: CacheEntry;
  prev: LRUNode | null = null;
  next: LRUNode | null = null;

  constructor(key: string, entry: CacheEntry) {
    this.key = key;
    this.entry = entry;
  }
}

/**
 * High-performance encryption cache optimized for wedding data operations
 * Implements LRU eviction with TTL, compression, and security features
 */
export class EncryptionCache implements EncryptionCacheService {
  private cache = new Map<string, LRUNode>();
  private head: LRUNode;
  private tail: LRUNode;
  private config: CacheConfig;

  // Performance metrics
  private metrics = {
    hits: 0,
    misses: 0,
    evictions: 0,
    totalOperations: 0,
    totalAccessTime: 0,
    memoryUsage: 0,
    keyFrequency: new Map<string, number>(),
  };

  // Security features
  private encryptionKey: Buffer;
  private readonly CACHE_KEY_PREFIX = 'wedsync_enc_cache_';

  constructor(config: CacheConfig) {
    this.config = { ...config };
    this.validateConfig();

    // Initialize doubly-linked list with dummy nodes
    this.head = new LRUNode('', {} as CacheEntry);
    this.tail = new LRUNode('', {} as CacheEntry);
    this.head.next = this.tail;
    this.tail.prev = this.head;

    // Generate cache encryption key
    this.encryptionKey = crypto.randomBytes(32);

    // Setup cleanup interval for expired entries
    this.setupTTLCleanup();
  }

  /**
   * Retrieve cached encryption data with performance tracking
   */
  async get(key: string): Promise<CacheEntry | null> {
    const startTime = performance.now();
    this.metrics.totalOperations++;

    try {
      const cacheKey = this.generateCacheKey(key);
      const node = this.cache.get(cacheKey);

      if (!node) {
        this.metrics.misses++;
        this.updateMetrics(startTime);
        return null;
      }

      // Check TTL expiration
      if (this.isExpired(node.entry)) {
        await this.delete(key);
        this.metrics.misses++;
        this.updateMetrics(startTime);
        return null;
      }

      // Move to front (most recently used)
      this.moveToHead(node);

      // Update access statistics
      node.entry.accessCount++;
      node.entry.lastAccessed = new Date();

      // Track key frequency for hot key identification
      const currentFreq = this.metrics.keyFrequency.get(cacheKey) || 0;
      this.metrics.keyFrequency.set(cacheKey, currentFreq + 1);

      this.metrics.hits++;
      this.updateMetrics(startTime);

      // Decrypt cache entry if encryption is enabled
      const decryptedEntry = await this.decryptCacheEntry(node.entry);
      return decryptedEntry;
    } catch (error) {
      this.handleError(
        'CACHE_ERROR',
        `Failed to get cache entry: ${(error as Error).message}`,
        key,
      );
      this.metrics.misses++;
      this.updateMetrics(startTime);
      return null;
    }
  }

  /**
   * Store encrypted data in cache with compression and TTL
   */
  async set(
    key: string,
    value: Buffer,
    metadata: EncryptionMetadata,
  ): Promise<void> {
    const startTime = performance.now();

    try {
      // Validate input size
      if (value.length > this.config.maxKeySize) {
        throw new Error(
          `Value size ${value.length} exceeds maximum ${this.config.maxKeySize}`,
        );
      }

      const cacheKey = this.generateCacheKey(key);
      const now = new Date();

      // Create cache entry
      let entryValue = value;
      if (this.config.compressionEnabled && value.length > 1024) {
        entryValue = await this.compressValue(value);
      }

      // Encrypt cache entry if required
      const encryptedValue = await this.encryptCacheValue(entryValue);

      const entry: CacheEntry = {
        key: cacheKey,
        encryptedValue,
        derivedKey: await this.deriveKey(key),
        metadata: { ...metadata },
        accessCount: 1,
        lastAccessed: now,
        createdAt: now,
        expiresAt: new Date(now.getTime() + this.config.ttlMs),
      };

      // Check if key already exists
      const existingNode = this.cache.get(cacheKey);
      if (existingNode) {
        // Update existing entry
        existingNode.entry = entry;
        this.moveToHead(existingNode);
      } else {
        // Add new entry
        const newNode = new LRUNode(cacheKey, entry);

        // Check capacity and evict if necessary
        if (this.cache.size >= this.config.maxSize) {
          await this.evictLRU();
        }

        // Add to cache and move to head
        this.cache.set(cacheKey, newNode);
        this.addToHead(newNode);
      }

      this.updateMemoryUsage();
    } catch (error) {
      this.handleError(
        'CACHE_ERROR',
        `Failed to set cache entry: ${(error as Error).message}`,
        key,
      );
      throw error;
    }
  }

  /**
   * Delete cache entry with secure cleanup
   */
  async delete(key: string): Promise<boolean> {
    try {
      const cacheKey = this.generateCacheKey(key);
      const node = this.cache.get(cacheKey);

      if (!node) {
        return false;
      }

      // Secure wipe if configured
      if (this.config.encryptionAlgorithm) {
        await this.secureWipe(node.entry.encryptedValue);
        await this.secureWipe(node.entry.derivedKey);
      }

      // Remove from cache and linked list
      this.cache.delete(cacheKey);
      this.removeFromList(node);
      this.metrics.keyFrequency.delete(cacheKey);

      this.updateMemoryUsage();
      return true;
    } catch (error) {
      this.handleError(
        'CACHE_ERROR',
        `Failed to delete cache entry: ${(error as Error).message}`,
        key,
      );
      return false;
    }
  }

  /**
   * Clear entire cache with secure cleanup
   */
  async clear(): Promise<void> {
    try {
      // Secure wipe all entries if required
      if (this.config.encryptionAlgorithm) {
        const promises = Array.from(this.cache.values()).map(async (node) => {
          await this.secureWipe(node.entry.encryptedValue);
          await this.secureWipe(node.entry.derivedKey);
        });
        await Promise.all(promises);
      }

      // Clear all data structures
      this.cache.clear();
      this.metrics.keyFrequency.clear();

      // Reset linked list
      this.head.next = this.tail;
      this.tail.prev = this.head;

      // Reset metrics
      this.metrics.memoryUsage = 0;
    } catch (error) {
      this.handleError(
        'CACHE_ERROR',
        `Failed to clear cache: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  /**
   * Get comprehensive cache performance metrics
   */
  getMetrics(): CacheMetrics {
    const totalRequests = this.metrics.hits + this.metrics.misses;
    const hitRate = totalRequests > 0 ? this.metrics.hits / totalRequests : 0;
    const avgAccessTime =
      this.metrics.totalOperations > 0
        ? this.metrics.totalAccessTime / this.metrics.totalOperations
        : 0;

    // Get hot keys (top 10 most accessed)
    const hotKeys = Array.from(this.metrics.keyFrequency.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([key]) => key);

    return {
      hitRate,
      missRate: 1 - hitRate,
      evictionCount: this.metrics.evictions,
      totalEntries: this.cache.size,
      memoryUsageBytes: this.metrics.memoryUsage,
      avgAccessTime,
      hotKeys,
    };
  }

  /**
   * Update cache configuration
   */
  configure(config: CacheConfig): void {
    const oldConfig = { ...this.config };
    this.config = { ...config };
    this.validateConfig();

    // Handle size reduction
    if (config.maxSize < oldConfig.maxSize) {
      this.enforceMaxSize();
    }

    // Handle TTL changes
    if (config.ttlMs !== oldConfig.ttlMs) {
      this.updateAllTTLs(config.ttlMs);
    }
  }

  // Private helper methods

  private validateConfig(): void {
    if (this.config.maxSize <= 0) {
      throw new Error('maxSize must be positive');
    }
    if (this.config.ttlMs <= 0) {
      throw new Error('ttlMs must be positive');
    }
    if (this.config.maxKeySize <= 0) {
      throw new Error('maxKeySize must be positive');
    }
  }

  private generateCacheKey(key: string): string {
    const hash = crypto.createHash('sha256').update(key).digest('hex');
    return `${this.CACHE_KEY_PREFIX}${hash}`;
  }

  private async deriveKey(baseKey: string): Promise<Buffer> {
    const salt = crypto.randomBytes(16);
    return crypto.pbkdf2Sync(baseKey, salt, 100000, 32, 'sha256');
  }

  private async encryptCacheValue(value: Buffer): Promise<Buffer> {
    if (!this.config.encryptionAlgorithm) {
      return value;
    }

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-gcm', this.encryptionKey);
    cipher.setAAD(Buffer.from('wedsync-cache-data'));

    const encrypted = Buffer.concat([cipher.update(value), cipher.final()]);

    const authTag = cipher.getAuthTag();
    return Buffer.concat([iv, authTag, encrypted]);
  }

  private async decryptCacheEntry(entry: CacheEntry): Promise<CacheEntry> {
    if (!this.config.encryptionAlgorithm) {
      return entry;
    }

    const buffer = entry.encryptedValue;
    const iv = buffer.slice(0, 16);
    const authTag = buffer.slice(16, 32);
    const encrypted = buffer.slice(32);

    const decipher = crypto.createDecipher('aes-256-gcm', this.encryptionKey);
    decipher.setAAD(Buffer.from('wedsync-cache-data'));
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return {
      ...entry,
      encryptedValue: decrypted,
    };
  }

  private async compressValue(value: Buffer): Promise<Buffer> {
    const zlib = await import('zlib');
    return zlib.gzipSync(value);
  }

  private isExpired(entry: CacheEntry): boolean {
    return new Date() > entry.expiresAt;
  }

  private moveToHead(node: LRUNode): void {
    this.removeFromList(node);
    this.addToHead(node);
  }

  private addToHead(node: LRUNode): void {
    node.next = this.head.next;
    node.prev = this.head;
    if (this.head.next) {
      this.head.next.prev = node;
    }
    this.head.next = node;
  }

  private removeFromList(node: LRUNode): void {
    if (node.prev) {
      node.prev.next = node.next;
    }
    if (node.next) {
      node.next.prev = node.prev;
    }
  }

  private async evictLRU(): Promise<void> {
    const lru = this.tail.prev;
    if (lru && lru !== this.head) {
      await this.secureWipe(lru.entry.encryptedValue);
      await this.secureWipe(lru.entry.derivedKey);
      this.cache.delete(lru.key);
      this.removeFromList(lru);
      this.metrics.evictions++;
    }
  }

  private async secureWipe(buffer: Buffer): Promise<void> {
    // Overwrite with random data for secure deletion
    crypto.randomFillSync(buffer);
    buffer.fill(0);
  }

  private updateMetrics(startTime: number): void {
    const duration = performance.now() - startTime;
    this.metrics.totalAccessTime += duration;
  }

  private updateMemoryUsage(): void {
    let totalSize = 0;
    for (const node of Array.from(this.cache.values())) {
      totalSize += node.entry.encryptedValue.length;
      totalSize += node.entry.derivedKey.length;
      totalSize += JSON.stringify(node.entry.metadata).length;
    }
    this.metrics.memoryUsage = totalSize;
  }

  private enforceMaxSize(): void {
    while (this.cache.size > this.config.maxSize) {
      this.evictLRU();
    }
  }

  private updateAllTTLs(newTtlMs: number): void {
    const now = new Date();
    for (const node of Array.from(this.cache.values())) {
      const remainingTime = node.entry.expiresAt.getTime() - now.getTime();
      const newExpiresAt = new Date(
        now.getTime() + Math.min(remainingTime, newTtlMs),
      );
      node.entry.expiresAt = newExpiresAt;
    }
  }

  private setupTTLCleanup(): void {
    // Clean expired entries every minute
    setInterval(() => {
      this.cleanupExpiredEntries();
    }, 60000);
  }

  private async cleanupExpiredEntries(): Promise<void> {
    const now = new Date();
    const expiredKeys: string[] = [];

    for (const [key, node] of Array.from(this.cache.entries())) {
      if (node.entry.expiresAt < now) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      const cleanKey = key.replace(this.CACHE_KEY_PREFIX, '');
      await this.delete(cleanKey);
    }
  }

  private handleError(
    code: EncryptionErrorCode,
    message: string,
    fieldId?: string,
  ): void {
    const error: EncryptionError = {
      errorId: crypto.randomUUID(),
      operation: 'cache_lookup',
      code,
      message,
      fieldId,
      timestamp: new Date(),
      recoverable: code !== 'CONFIGURATION_ERROR',
    };

    console.error('EncryptionCache Error:', error);
  }
}

/**
 * Factory function to create configured encryption cache
 */
export function createEncryptionCache(
  config?: Partial<CacheConfig>,
): EncryptionCache {
  const defaultConfig: CacheConfig = {
    maxSize: 1000, // Optimize for wedding venue with 500+ guest records
    ttlMs: 15 * 60 * 1000, // 15 minutes - balances security with performance
    maxKeySize: 64 * 1024, // 64KB per cache entry
    compressionEnabled: true,
    encryptionAlgorithm: 'aes-256-gcm',
    keyRotationIntervalMs: 24 * 60 * 60 * 1000, // 24 hours
  };

  const mergedConfig = { ...defaultConfig, ...config };
  return new EncryptionCache(mergedConfig);
}

/**
 * Wedding-optimized cache configuration for high-performance guest data operations
 */
export function createWeddingOptimizedCache(): EncryptionCache {
  const weddingConfig: CacheConfig = {
    maxSize: 2000, // Handle large weddings with multiple suppliers
    ttlMs: 30 * 60 * 1000, // 30 minutes for seating chart updates
    maxKeySize: 128 * 1024, // Larger entries for guest data with photos
    compressionEnabled: true,
    encryptionAlgorithm: 'aes-256-gcm',
    keyRotationIntervalMs: 12 * 60 * 60 * 1000, // 12 hours - higher security
  };

  return new EncryptionCache(weddingConfig);
}
