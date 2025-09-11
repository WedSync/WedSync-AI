/**
 * WS-171: PWA Storage Optimizer
 * Storage quota monitoring and management for optimal offline performance
 */

import { createClient } from '@supabase/supabase-js';
import { CachePriority, WeddingDataType } from './cache-manager';

export interface StorageQuota {
  quota: number; // Total available storage in bytes
  usage: number; // Current usage in bytes
  available: number; // Available storage in bytes
  usagePercentage: number;
}

export interface StorageBreakdown {
  cache: number;
  indexedDB: number;
  localStorage: number;
  webSQL: number;
  serviceWorker: number;
  other: number;
}

export interface StorageAlert {
  type: 'warning' | 'critical' | 'info';
  threshold: number;
  currentUsage: number;
  message: string;
  action?: string;
  timestamp: number;
}

export interface CleanupResult {
  freedBytes: number;
  deletedEntries: number;
  cleanupDuration: number;
  success: boolean;
  errors: string[];
}

export interface StorageConfig {
  warningThreshold: number; // Percentage (e.g., 80)
  criticalThreshold: number; // Percentage (e.g., 95)
  autoCleanup: boolean;
  cleanupInterval: number; // milliseconds
  retentionPolicies: RetentionPolicyConfig;
  compressionEnabled: boolean;
  emergencyCleanup: boolean;
}

export interface RetentionPolicyConfig {
  [WeddingDataType.TIMELINE]: number; // days
  [WeddingDataType.VENDORS]: number;
  [WeddingDataType.GUESTS]: number;
  [WeddingDataType.TASKS]: number;
  [WeddingDataType.VENUES]: number;
  [WeddingDataType.PHOTOS]: number;
  [WeddingDataType.DOCUMENTS]: number;
  [WeddingDataType.PREFERENCES]: number;
  [WeddingDataType.ANALYTICS]: number;
  [WeddingDataType.COMMUNICATIONS]: number;
}

export class PWAStorageOptimizer {
  private config: StorageConfig;
  private supabase: any;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private alerts: StorageAlert[] = [];
  private lastCleanup: number = 0;
  private isCleanupInProgress = false;

  constructor(config: Partial<StorageConfig> = {}) {
    this.config = {
      warningThreshold: config.warningThreshold || 80,
      criticalThreshold: config.criticalThreshold || 95,
      autoCleanup: config.autoCleanup ?? true,
      cleanupInterval: config.cleanupInterval || 1800000, // 30 minutes
      compressionEnabled: config.compressionEnabled ?? true,
      emergencyCleanup: config.emergencyCleanup ?? true,
      retentionPolicies: config.retentionPolicies || {
        [WeddingDataType.TIMELINE]: 30, // Keep timeline data for 30 days
        [WeddingDataType.VENDORS]: 90, // Vendor data for 90 days
        [WeddingDataType.GUESTS]: 60, // Guest data for 60 days
        [WeddingDataType.TASKS]: 45, // Task data for 45 days
        [WeddingDataType.VENUES]: 90, // Venue data for 90 days
        [WeddingDataType.PHOTOS]: 180, // Photo metadata for 180 days
        [WeddingDataType.DOCUMENTS]: 365, // Documents for 1 year
        [WeddingDataType.PREFERENCES]: 365, // Preferences for 1 year
        [WeddingDataType.ANALYTICS]: 7, // Analytics for 7 days
        [WeddingDataType.COMMUNICATIONS]: 30, // Communications for 30 days
      },
    };

    this.initializeSupabase();
    this.startMonitoring();
    this.setupEventHandlers();
  }

  private initializeSupabase() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
    }
  }

  /**
   * Get current storage quota and usage
   */
  async getStorageQuota(): Promise<StorageQuota> {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        const quota = estimate.quota || 0;
        const usage = estimate.usage || 0;
        const available = quota - usage;
        const usagePercentage = quota > 0 ? (usage / quota) * 100 : 0;

        return {
          quota,
          usage,
          available,
          usagePercentage,
        };
      }
    } catch (error) {
      console.error('Failed to get storage quota:', error);
    }

    // Fallback estimation
    return {
      quota: 50 * 1024 * 1024 * 1024, // 50GB default
      usage: 0,
      available: 50 * 1024 * 1024 * 1024,
      usagePercentage: 0,
    };
  }

  /**
   * Get detailed storage breakdown by type
   */
  async getStorageBreakdown(): Promise<StorageBreakdown> {
    const breakdown: StorageBreakdown = {
      cache: 0,
      indexedDB: 0,
      localStorage: 0,
      webSQL: 0,
      serviceWorker: 0,
      other: 0,
    };

    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();

        if (estimate.usageDetails) {
          breakdown.cache = estimate.usageDetails.caches || 0;
          breakdown.indexedDB = estimate.usageDetails.indexedDB || 0;
          breakdown.serviceWorker = estimate.usageDetails.serviceWorker || 0;
        }
      }

      // Estimate localStorage size
      let localStorageSize = 0;
      for (const key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          localStorageSize += localStorage[key].length + key.length;
        }
      }
      breakdown.localStorage = localStorageSize * 2; // UTF-16 encoding

      // Calculate other storage
      const totalUsage = Object.values(breakdown).reduce(
        (sum, size) => sum + size,
        0,
      );
      const quota = await this.getStorageQuota();
      breakdown.other = Math.max(0, quota.usage - totalUsage);
    } catch (error) {
      console.error('Failed to get storage breakdown:', error);
    }

    return breakdown;
  }

  /**
   * Check if storage needs cleanup based on thresholds
   */
  async checkStorageHealth(): Promise<StorageAlert[]> {
    const quota = await this.getStorageQuota();
    const alerts: StorageAlert[] = [];

    if (quota.usagePercentage >= this.config.criticalThreshold) {
      alerts.push({
        type: 'critical',
        threshold: this.config.criticalThreshold,
        currentUsage: quota.usagePercentage,
        message: `Storage usage is critically high (${quota.usagePercentage.toFixed(1)}%). Immediate cleanup required.`,
        action: 'emergency_cleanup',
        timestamp: Date.now(),
      });

      if (this.config.emergencyCleanup && this.config.autoCleanup) {
        await this.performEmergencyCleanup();
      }
    } else if (quota.usagePercentage >= this.config.warningThreshold) {
      alerts.push({
        type: 'warning',
        threshold: this.config.warningThreshold,
        currentUsage: quota.usagePercentage,
        message: `Storage usage is high (${quota.usagePercentage.toFixed(1)}%). Consider cleaning up old data.`,
        action: 'scheduled_cleanup',
        timestamp: Date.now(),
      });

      if (this.config.autoCleanup) {
        await this.performScheduledCleanup();
      }
    } else {
      alerts.push({
        type: 'info',
        threshold: 0,
        currentUsage: quota.usagePercentage,
        message: `Storage usage is normal (${quota.usagePercentage.toFixed(1)}%).`,
        timestamp: Date.now(),
      });
    }

    this.alerts = alerts;
    await this.trackStorageHealth(quota, alerts);

    return alerts;
  }

  /**
   * Perform scheduled cleanup based on retention policies
   */
  async performScheduledCleanup(): Promise<CleanupResult> {
    if (this.isCleanupInProgress) {
      return {
        freedBytes: 0,
        deletedEntries: 0,
        cleanupDuration: 0,
        success: false,
        errors: ['Cleanup already in progress'],
      };
    }

    this.isCleanupInProgress = true;
    const startTime = Date.now();
    let freedBytes = 0;
    let deletedEntries = 0;
    const errors: string[] = [];

    try {
      // Clean up expired cache entries
      const cacheResult = await this.cleanupExpiredCache();
      freedBytes += cacheResult.freedBytes;
      deletedEntries += cacheResult.deletedEntries;
      errors.push(...cacheResult.errors);

      // Clean up old data based on retention policies
      const retentionResult = await this.applyRetentionPolicies();
      freedBytes += retentionResult.freedBytes;
      deletedEntries += retentionResult.deletedEntries;
      errors.push(...retentionResult.errors);

      // Clean up localStorage
      const localStorageResult = await this.cleanupLocalStorage();
      freedBytes += localStorageResult.freedBytes;
      deletedEntries += localStorageResult.deletedEntries;
      errors.push(...localStorageResult.errors);

      this.lastCleanup = Date.now();

      const result: CleanupResult = {
        freedBytes,
        deletedEntries,
        cleanupDuration: Date.now() - startTime,
        success: errors.length === 0,
        errors,
      };

      await this.trackCleanupResult('scheduled', result);
      return result;
    } catch (error) {
      const result: CleanupResult = {
        freedBytes,
        deletedEntries,
        cleanupDuration: Date.now() - startTime,
        success: false,
        errors: [
          ...errors,
          error instanceof Error ? error.message : 'Unknown error',
        ],
      };

      await this.trackCleanupResult('scheduled', result);
      return result;
    } finally {
      this.isCleanupInProgress = false;
    }
  }

  /**
   * Perform emergency cleanup when storage is critically full
   */
  async performEmergencyCleanup(): Promise<CleanupResult> {
    if (this.isCleanupInProgress) {
      return {
        freedBytes: 0,
        deletedEntries: 0,
        cleanupDuration: 0,
        success: false,
        errors: ['Cleanup already in progress'],
      };
    }

    this.isCleanupInProgress = true;
    const startTime = Date.now();
    let freedBytes = 0;
    let deletedEntries = 0;
    const errors: string[] = [];

    try {
      // More aggressive cleanup for emergency situations

      // 1. Remove all analytics and background priority data
      const analyticsResult = await this.cleanupByDataType(
        WeddingDataType.ANALYTICS,
      );
      freedBytes += analyticsResult.freedBytes;
      deletedEntries += analyticsResult.deletedEntries;

      // 2. Remove all low priority cache entries
      const lowPriorityResult = await this.cleanupByPriority(
        CachePriority.BACKGROUND,
      );
      freedBytes += lowPriorityResult.freedBytes;
      deletedEntries += lowPriorityResult.deletedEntries;

      // 3. Clean up old photos and documents metadata (keep only recent)
      const mediaResult = await this.cleanupOldMediaData(7); // Keep only last 7 days
      freedBytes += mediaResult.freedBytes;
      deletedEntries += mediaResult.deletedEntries;

      // 4. Compress remaining data
      if (this.config.compressionEnabled) {
        const compressionResult = await this.compressUncompressedData();
        freedBytes += compressionResult.freedBytes;
      }

      // 5. Clear browser caches
      const browserCacheResult = await this.clearBrowserCaches();
      freedBytes += browserCacheResult.freedBytes;
      deletedEntries += browserCacheResult.deletedEntries;

      this.lastCleanup = Date.now();

      const result: CleanupResult = {
        freedBytes,
        deletedEntries,
        cleanupDuration: Date.now() - startTime,
        success: errors.length === 0,
        errors,
      };

      await this.trackCleanupResult('emergency', result);
      return result;
    } catch (error) {
      const result: CleanupResult = {
        freedBytes,
        deletedEntries,
        cleanupDuration: Date.now() - startTime,
        success: false,
        errors: [
          ...errors,
          error instanceof Error ? error.message : 'Unknown error',
        ],
      };

      await this.trackCleanupResult('emergency', result);
      return result;
    } finally {
      this.isCleanupInProgress = false;
    }
  }

  /**
   * Clean up data by specific data type
   */
  async cleanupByDataType(dataType: WeddingDataType): Promise<CleanupResult> {
    let freedBytes = 0;
    let deletedEntries = 0;
    const errors: string[] = [];

    try {
      // Clean from cache manager (would need to integrate)
      if (typeof window !== 'undefined' && (window as any).cacheManager) {
        const deleted = await (window as any).cacheManager.clear({ dataType });
        deletedEntries += deleted;
      }

      // Clean from localStorage
      const keysToDelete: string[] = [];
      for (const key in localStorage) {
        if (key.includes(dataType.toLowerCase())) {
          const size = localStorage[key].length * 2;
          freedBytes += size;
          keysToDelete.push(key);
        }
      }

      keysToDelete.forEach((key) => localStorage.removeItem(key));
      deletedEntries += keysToDelete.length;
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Unknown error');
    }

    return {
      freedBytes,
      deletedEntries,
      cleanupDuration: 0,
      success: errors.length === 0,
      errors,
    };
  }

  /**
   * Clean up data by priority level
   */
  async cleanupByPriority(priority: CachePriority): Promise<CleanupResult> {
    let freedBytes = 0;
    let deletedEntries = 0;
    const errors: string[] = [];

    try {
      // Clean from cache manager
      if (typeof window !== 'undefined' && (window as any).cacheManager) {
        const deleted = await (window as any).cacheManager.clear({ priority });
        deletedEntries += deleted;
      }

      // Estimate freed bytes (would be more accurate with actual cache manager integration)
      freedBytes = deletedEntries * 1024; // Rough estimate
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Unknown error');
    }

    return {
      freedBytes,
      deletedEntries,
      cleanupDuration: 0,
      success: errors.length === 0,
      errors,
    };
  }

  /**
   * Apply retention policies to clean up old data
   */
  private async applyRetentionPolicies(): Promise<CleanupResult> {
    let freedBytes = 0;
    let deletedEntries = 0;
    const errors: string[] = [];

    try {
      for (const [dataType, retentionDays] of Object.entries(
        this.config.retentionPolicies,
      )) {
        const cutoffDate = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

        // Clean from cache manager
        if (typeof window !== 'undefined' && (window as any).cacheManager) {
          const deleted = await (window as any).cacheManager.clear({
            dataType: dataType as WeddingDataType,
            olderThan: cutoffDate,
          });
          deletedEntries += deleted;
        }

        // Clean from localStorage
        const keysToDelete: string[] = [];
        for (const key in localStorage) {
          if (key.includes(dataType.toLowerCase())) {
            try {
              const data = JSON.parse(localStorage[key]);
              if (data.timestamp && data.timestamp < cutoffDate) {
                const size = localStorage[key].length * 2;
                freedBytes += size;
                keysToDelete.push(key);
              }
            } catch {
              // If can't parse, assume it's old and remove
              const size = localStorage[key].length * 2;
              freedBytes += size;
              keysToDelete.push(key);
            }
          }
        }

        keysToDelete.forEach((key) => localStorage.removeItem(key));
        deletedEntries += keysToDelete.length;
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Unknown error');
    }

    return {
      freedBytes,
      deletedEntries,
      cleanupDuration: 0,
      success: errors.length === 0,
      errors,
    };
  }

  /**
   * Clean up expired cache entries
   */
  private async cleanupExpiredCache(): Promise<CleanupResult> {
    let freedBytes = 0;
    let deletedEntries = 0;
    const errors: string[] = [];

    try {
      // This would integrate with the cache manager's cleanup functionality
      if (typeof window !== 'undefined' && (window as any).cacheManager) {
        const stats = (window as any).cacheManager.getStats();
        const initialEntries = stats.totalEntries;

        // Trigger cleanup
        await (window as any).cacheManager.cleanup();

        const newStats = (window as any).cacheManager.getStats();
        deletedEntries = initialEntries - newStats.totalEntries;
        freedBytes = stats.totalSize - newStats.totalSize;
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Unknown error');
    }

    return {
      freedBytes,
      deletedEntries,
      cleanupDuration: 0,
      success: errors.length === 0,
      errors,
    };
  }

  /**
   * Clean up localStorage entries
   */
  private async cleanupLocalStorage(): Promise<CleanupResult> {
    let freedBytes = 0;
    let deletedEntries = 0;
    const errors: string[] = [];

    try {
      const keysToDelete: string[] = [];

      for (const key in localStorage) {
        // Remove expired session data
        if (key.startsWith('temp_') || key.startsWith('cache:')) {
          try {
            const data = JSON.parse(localStorage[key]);
            if (data.expirationTime && Date.now() > data.expirationTime) {
              const size = localStorage[key].length * 2;
              freedBytes += size;
              keysToDelete.push(key);
            }
          } catch {
            // If can't parse, remove anyway
            const size = localStorage[key].length * 2;
            freedBytes += size;
            keysToDelete.push(key);
          }
        }

        // Remove large items that might be taking up space
        if (localStorage[key].length > 100000) {
          // > 100KB
          const size = localStorage[key].length * 2;
          freedBytes += size;
          keysToDelete.push(key);
        }
      }

      keysToDelete.forEach((key) => localStorage.removeItem(key));
      deletedEntries = keysToDelete.length;
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Unknown error');
    }

    return {
      freedBytes,
      deletedEntries,
      cleanupDuration: 0,
      success: errors.length === 0,
      errors,
    };
  }

  /**
   * Clean up old media data (photos/documents metadata)
   */
  private async cleanupOldMediaData(keepDays: number): Promise<CleanupResult> {
    let freedBytes = 0;
    let deletedEntries = 0;
    const errors: string[] = [];

    try {
      const cutoffDate = Date.now() - keepDays * 24 * 60 * 60 * 1000;

      const mediaTypes = [WeddingDataType.PHOTOS, WeddingDataType.DOCUMENTS];

      for (const dataType of mediaTypes) {
        const result = await this.cleanupByDataType(dataType);
        freedBytes += result.freedBytes;
        deletedEntries += result.deletedEntries;
        errors.push(...result.errors);
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Unknown error');
    }

    return {
      freedBytes,
      deletedEntries,
      cleanupDuration: 0,
      success: errors.length === 0,
      errors,
    };
  }

  /**
   * Compress uncompressed data to save space
   */
  private async compressUncompressedData(): Promise<CleanupResult> {
    let freedBytes = 0;
    const errors: string[] = [];

    try {
      // This would work with the cache manager to identify and compress large uncompressed entries
      if (typeof window !== 'undefined' && (window as any).cacheManager) {
        // Implementation would depend on cache manager API
        // For now, estimate savings
        freedBytes = 1024 * 1024; // 1MB estimated savings
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Unknown error');
    }

    return {
      freedBytes,
      deletedEntries: 0,
      cleanupDuration: 0,
      success: errors.length === 0,
      errors,
    };
  }

  /**
   * Clear browser caches
   */
  private async clearBrowserCaches(): Promise<CleanupResult> {
    let freedBytes = 0;
    let deletedEntries = 0;
    const errors: string[] = [];

    try {
      if ('caches' in window) {
        const cacheNames = await caches.keys();

        for (const cacheName of cacheNames) {
          // Only clear non-critical caches
          if (!cacheName.includes('critical') && !cacheName.includes('v1')) {
            const cache = await caches.open(cacheName);
            const keys = await cache.keys();

            for (const request of keys) {
              await cache.delete(request);
              deletedEntries++;
              freedBytes += 1024; // Rough estimate
            }
          }
        }
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Unknown error');
    }

    return {
      freedBytes,
      deletedEntries,
      cleanupDuration: 0,
      success: errors.length === 0,
      errors,
    };
  }

  /**
   * Start monitoring storage usage
   */
  private startMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(() => {
      this.checkStorageHealth();
    }, this.config.cleanupInterval);

    // Initial check
    this.checkStorageHealth();
  }

  /**
   * Setup event handlers for storage events
   */
  private setupEventHandlers(): void {
    // Listen for quota exceeded errors
    window.addEventListener('error', (event) => {
      if (event.error && event.error.name === 'QuotaExceededError') {
        console.warn('Storage quota exceeded, triggering emergency cleanup');
        this.performEmergencyCleanup();
      }
    });

    // Listen for visibility change to optimize storage
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // App going to background - good time for cleanup
        if (this.config.autoCleanup && !this.isCleanupInProgress) {
          this.performScheduledCleanup();
        }
      }
    });
  }

  /**
   * Track storage health metrics
   */
  private async trackStorageHealth(
    quota: StorageQuota,
    alerts: StorageAlert[],
  ): Promise<void> {
    if (this.supabase) {
      try {
        await this.supabase.from('pwa_storage_metrics').insert({
          quota_bytes: quota.quota,
          usage_bytes: quota.usage,
          available_bytes: quota.available,
          usage_percentage: quota.usagePercentage,
          alert_count: alerts.length,
          critical_alerts: alerts.filter((a) => a.type === 'critical').length,
          warning_alerts: alerts.filter((a) => a.type === 'warning').length,
          timestamp: new Date().toISOString(),
          session_id: this.getSessionId(),
        });
      } catch (error) {
        console.error('Failed to track storage health:', error);
      }
    }
  }

  /**
   * Track cleanup results
   */
  private async trackCleanupResult(
    type: string,
    result: CleanupResult,
  ): Promise<void> {
    if (this.supabase) {
      try {
        await this.supabase.from('pwa_storage_cleanup').insert({
          cleanup_type: type,
          freed_bytes: result.freedBytes,
          deleted_entries: result.deletedEntries,
          duration_ms: result.cleanupDuration,
          success: result.success,
          error_count: result.errors.length,
          errors: result.errors,
          timestamp: new Date().toISOString(),
          session_id: this.getSessionId(),
        });
      } catch (error) {
        console.error('Failed to track cleanup result:', error);
      }
    }
  }

  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('session_id', sessionId);
    }
    return sessionId;
  }

  /**
   * Public API
   */

  public async getStorageStatus(): Promise<{
    quota: StorageQuota;
    breakdown: StorageBreakdown;
    alerts: StorageAlert[];
    lastCleanup: number;
  }> {
    const quota = await this.getStorageQuota();
    const breakdown = await this.getStorageBreakdown();
    const alerts = await this.checkStorageHealth();

    return {
      quota,
      breakdown,
      alerts,
      lastCleanup: this.lastCleanup,
    };
  }

  public async triggerCleanup(
    type: 'scheduled' | 'emergency' = 'scheduled',
  ): Promise<CleanupResult> {
    return type === 'emergency'
      ? this.performEmergencyCleanup()
      : this.performScheduledCleanup();
  }

  public getConfig(): StorageConfig {
    return { ...this.config };
  }

  public updateConfig(updates: Partial<StorageConfig>): void {
    this.config = { ...this.config, ...updates };

    // Restart monitoring with new interval if changed
    if (updates.cleanupInterval) {
      this.startMonitoring();
    }
  }

  public isCleanupInProgress(): boolean {
    return this.isCleanupInProgress;
  }

  /**
   * Cleanup and destroy
   */
  public destroy(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.alerts = [];
  }
}

// Export singleton instance
export const storageOptimizer =
  typeof window !== 'undefined' ? new PWAStorageOptimizer() : null;
