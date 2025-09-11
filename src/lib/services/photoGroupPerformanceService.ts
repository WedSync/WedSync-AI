import { PhotoGroup, PhotoGroupAssignment, Guest } from '@/types/photo-groups';

/**
 * Photo Group Performance Service
 * Handles caching, optimization, and performance enhancements for photo groups
 */
class PhotoGroupPerformanceService {
  private cache: Map<string, any> = new Map();
  private pendingRequests: Map<string, Promise<any>> = new Map();
  private lastFetchTime: Map<string, number> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly DEBOUNCE_DELAY = 300; // 300ms
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Get cached data with automatic refresh
   */
  async getCachedData<T>(
    key: string,
    fetcher: () => Promise<T>,
    forceRefresh = false,
  ): Promise<T> {
    const now = Date.now();
    const lastFetch = this.lastFetchTime.get(key) || 0;
    const isExpired = now - lastFetch > this.CACHE_TTL;

    // Return cached data if valid and not forcing refresh
    if (!forceRefresh && !isExpired && this.cache.has(key)) {
      return this.cache.get(key) as T;
    }

    // Check if there's already a pending request for this key
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key) as Promise<T>;
    }

    // Create new request
    const request = fetcher()
      .then((data) => {
        this.cache.set(key, data);
        this.lastFetchTime.set(key, Date.now());
        this.pendingRequests.delete(key);
        return data;
      })
      .catch((error) => {
        this.pendingRequests.delete(key);
        throw error;
      });

    this.pendingRequests.set(key, request);
    return request;
  }

  /**
   * Batch multiple operations for better performance
   */
  async batchOperations<T>(operations: Array<() => Promise<T>>): Promise<T[]> {
    const batchSize = 5; // Process 5 operations at a time
    const results: T[] = [];

    for (let i = 0; i < operations.length; i += batchSize) {
      const batch = operations.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map((op) => op()));
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Debounce function calls for performance
   */
  debounce<T extends (...args: any[]) => any>(
    func: T,
    key: string,
    delay = this.DEBOUNCE_DELAY,
  ): (...args: Parameters<T>) => Promise<ReturnType<T>> {
    return (...args: Parameters<T>) => {
      return new Promise((resolve) => {
        // Clear existing timer for this key
        if (this.debounceTimers.has(key)) {
          clearTimeout(this.debounceTimers.get(key)!);
        }

        // Set new timer
        const timer = setTimeout(() => {
          this.debounceTimers.delete(key);
          resolve(func(...args));
        }, delay);

        this.debounceTimers.set(key, timer);
      });
    };
  }

  /**
   * Optimize large guest lists with virtualization data
   */
  prepareVirtualList<T>(
    items: T[],
    pageSize = 50,
  ): {
    pages: T[][];
    totalPages: number;
    totalItems: number;
  } {
    const pages: T[][] = [];

    for (let i = 0; i < items.length; i += pageSize) {
      pages.push(items.slice(i, i + pageSize));
    }

    return {
      pages,
      totalPages: pages.length,
      totalItems: items.length,
    };
  }

  /**
   * Calculate priority score for photo group scheduling
   */
  calculatePriorityScore(group: PhotoGroup): number {
    let score = 0;

    // Base priority
    score += (10 - group.priority) * 10;

    // Guest count factor
    const guestCount = group.assignments?.length || 0;
    score += Math.min(guestCount * 2, 20);

    // Time sensitivity
    if (group.estimated_time_minutes > 30) {
      score += 5; // Longer sessions need priority
    }

    // Photo type priority
    const typePriorities: Record<string, number> = {
      family: 15,
      couple: 20,
      bridal_party: 10,
      formal: 12,
      candid: 5,
    };
    score += typePriorities[group.photo_type || ''] || 0;

    return score;
  }

  /**
   * Detect scheduling conflicts
   */
  detectConflicts(
    groups: PhotoGroup[],
  ): Array<{ group1: PhotoGroup; group2: PhotoGroup; type: string }> {
    const conflicts: Array<{
      group1: PhotoGroup;
      group2: PhotoGroup;
      type: string;
    }> = [];

    for (let i = 0; i < groups.length; i++) {
      for (let j = i + 1; j < groups.length; j++) {
        const group1 = groups[i];
        const group2 = groups[j];

        // Time conflict
        if (this.hasTimeOverlap(group1, group2)) {
          conflicts.push({ group1, group2, type: 'time' });
        }

        // Guest conflict (same guest in both groups at overlapping times)
        if (this.hasGuestConflict(group1, group2)) {
          conflicts.push({ group1, group2, type: 'guest' });
        }

        // Location conflict
        if (this.hasLocationConflict(group1, group2)) {
          conflicts.push({ group1, group2, type: 'location' });
        }
      }
    }

    return conflicts;
  }

  private hasTimeOverlap(group1: PhotoGroup, group2: PhotoGroup): boolean {
    if (!group1.scheduled_time || !group2.scheduled_time) return false;

    const start1 = new Date(group1.scheduled_time).getTime();
    const end1 = start1 + group1.estimated_time_minutes * 60 * 1000;

    const start2 = new Date(group2.scheduled_time).getTime();
    const end2 = start2 + group2.estimated_time_minutes * 60 * 1000;

    return start1 < end2 && start2 < end1;
  }

  private hasGuestConflict(group1: PhotoGroup, group2: PhotoGroup): boolean {
    if (!this.hasTimeOverlap(group1, group2)) return false;

    const guests1 = new Set(group1.assignments?.map((a) => a.guest_id) || []);
    const guests2 = new Set(group2.assignments?.map((a) => a.guest_id) || []);

    for (const guestId of guests1) {
      if (guests2.has(guestId)) {
        return true;
      }
    }

    return false;
  }

  private hasLocationConflict(group1: PhotoGroup, group2: PhotoGroup): boolean {
    if (!this.hasTimeOverlap(group1, group2)) return false;
    if (!group1.location || !group2.location) return false;

    return group1.location.toLowerCase() === group2.location.toLowerCase();
  }

  /**
   * Optimize photo group schedule
   */
  optimizeSchedule(groups: PhotoGroup[]): PhotoGroup[] {
    // Sort by priority score
    const sorted = [...groups].sort((a, b) => {
      return this.calculatePriorityScore(b) - this.calculatePriorityScore(a);
    });

    // Auto-schedule groups without conflicts
    const scheduled: PhotoGroup[] = [];
    let currentTime = new Date();
    currentTime.setHours(14, 0, 0, 0); // Start at 2 PM

    for (const group of sorted) {
      // Find next available slot
      let scheduledTime = new Date(currentTime);
      let hasConflict = true;

      while (hasConflict) {
        hasConflict = false;

        // Check for conflicts with already scheduled groups
        for (const scheduled of scheduled) {
          const tempGroup = {
            ...group,
            scheduled_time: scheduledTime.toISOString(),
          };
          if (
            this.hasTimeOverlap(tempGroup, scheduled) ||
            this.hasGuestConflict(tempGroup, scheduled) ||
            this.hasLocationConflict(tempGroup, scheduled)
          ) {
            hasConflict = true;
            // Move to next slot
            scheduledTime = new Date(scheduledTime.getTime() + 15 * 60 * 1000); // Add 15 minutes
            break;
          }
        }
      }

      scheduled.push({
        ...group,
        scheduled_time: scheduledTime.toISOString(),
      });

      // Update current time for next group
      currentTime = new Date(
        scheduledTime.getTime() + group.estimated_time_minutes * 60 * 1000,
      );
    }

    return scheduled;
  }

  /**
   * Generate performance metrics
   */
  getPerformanceMetrics(): {
    cacheHitRate: number;
    averageResponseTime: number;
    memoryUsage: number;
  } {
    const cacheRequests = this.cache.size;
    const totalRequests = cacheRequests + this.pendingRequests.size;

    return {
      cacheHitRate:
        totalRequests > 0 ? (cacheRequests / totalRequests) * 100 : 0,
      averageResponseTime: 145, // Mock value - would track actual times
      memoryUsage: this.estimateMemoryUsage(),
    };
  }

  private estimateMemoryUsage(): number {
    // Rough estimation of memory usage in MB
    const cacheSize = JSON.stringify([...this.cache.entries()]).length;
    return Math.round((cacheSize / 1024 / 1024) * 100) / 100;
  }

  /**
   * Clear cache and reset service
   */
  clearCache(key?: string): void {
    if (key) {
      this.cache.delete(key);
      this.lastFetchTime.delete(key);
    } else {
      this.cache.clear();
      this.lastFetchTime.clear();
      this.pendingRequests.clear();

      // Clear all debounce timers
      this.debounceTimers.forEach((timer) => clearTimeout(timer));
      this.debounceTimers.clear();
    }
  }

  /**
   * Prefetch data for improved performance
   */
  async prefetchData(
    keys: string[],
    fetchers: Map<string, () => Promise<any>>,
  ): Promise<void> {
    const promises = keys.map((key) => {
      const fetcher = fetchers.get(key);
      if (fetcher) {
        return this.getCachedData(key, fetcher);
      }
      return Promise.resolve();
    });

    await Promise.all(promises);
  }

  /**
   * Export photo groups data for offline use
   */
  exportForOffline(groups: PhotoGroup[]): string {
    const exportData = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      groups: groups.map((g) => ({
        ...g,
        // Remove unnecessary data for offline storage
        created_at: undefined,
        updated_at: undefined,
      })),
    };

    return JSON.stringify(exportData);
  }

  /**
   * Import offline data
   */
  importOfflineData(data: string): PhotoGroup[] {
    try {
      const imported = JSON.parse(data);

      if (imported.version !== '1.0') {
        throw new Error('Unsupported data version');
      }

      return imported.groups;
    } catch (error) {
      console.error('Failed to import offline data:', error);
      return [];
    }
  }
}

// Export singleton instance
export const photoGroupPerformance = new PhotoGroupPerformanceService();

// Export type for use in components
export type { PhotoGroupPerformanceService };
