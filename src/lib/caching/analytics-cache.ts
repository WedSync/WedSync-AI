interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class AnalyticsCache {
  private cache = new Map<string, CacheEntry<any>>();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes

  set<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Analytics-specific cache methods
  getCampaignData(campaignId: string): any {
    return this.get(`campaign:${campaignId}`);
  }

  setCampaignData(campaignId: string, data: any, ttl?: number): void {
    this.set(`campaign:${campaignId}`, data, ttl);
  }

  getSupplierOverview(supplierId: string): any {
    return this.get(`supplier_overview:${supplierId}`);
  }

  setSupplierOverview(supplierId: string, data: any, ttl?: number): void {
    this.set(`supplier_overview:${supplierId}`, data, ttl);
  }

  getReviewMetrics(supplierId: string): any {
    return this.get(`review_metrics:${supplierId}`);
  }

  setReviewMetrics(supplierId: string, data: any, ttl?: number): void {
    this.set(`review_metrics:${supplierId}`, data, ttl);
  }
}

export const analyticsCache = new AnalyticsCache();
