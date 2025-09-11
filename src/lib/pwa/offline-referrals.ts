/**
 * Offline PWA Support for WS-344 Referral System
 * Handles caching of referral data and QR codes for wedding venues with poor WiFi
 * Optimized for wedding suppliers working at venues with limited connectivity
 */

interface ReferralData {
  referralLink: string;
  qrCodeUrl: string;
  supplierName: string;
  referralCode: string;
  stats: {
    totalShares: number;
    conversions: number;
    viralCoefficient: number;
    rewardsEarned: number;
  };
  customMessage?: string;
  timestamp: number;
}

interface PendingAction {
  id: string;
  type: 'share' | 'track' | 'conversion';
  data: any;
  timestamp: number;
  retryCount: number;
}

interface OfflineConfig {
  cacheVersion: string;
  maxCacheAge: number;
  maxRetries: number;
  syncInterval: number;
}

export class OfflineReferralSupport {
  private cache: Cache | null = null;
  private config: OfflineConfig = {
    cacheVersion: 'referral-offline-v1.2',
    maxCacheAge: 24 * 60 * 60 * 1000, // 24 hours
    maxRetries: 3,
    syncInterval: 30 * 1000, // 30 seconds
  };

  private pendingActionsKey = 'wedsync-pending-referral-actions';
  private lastSyncKey = 'wedsync-last-sync';
  private syncInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initialize();
    this.setupSyncMonitoring();
  }

  /**
   * Initialize the offline referral system
   */
  async initialize(): Promise<void> {
    try {
      if ('caches' in window) {
        this.cache = await caches.open(this.config.cacheVersion);
        console.log('🔄 Offline referral system initialized');
      }

      // Setup service worker message listener
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener(
          'message',
          this.handleServiceWorkerMessage.bind(this),
        );
      }

      // Setup online/offline event listeners
      window.addEventListener('online', this.handleOnline.bind(this));
      window.addEventListener('offline', this.handleOffline.bind(this));

      // Initial sync if online
      if (navigator.onLine) {
        await this.syncWhenOnline();
      }
    } catch (error) {
      console.error('Failed to initialize offline referral support:', error);
    }
  }

  /**
   * Cache referral data for a supplier
   */
  async cacheReferralData(
    supplierId: string,
    data: ReferralData,
  ): Promise<void> {
    if (!this.cache) {
      console.warn('Cache not available, storing in localStorage as fallback');
      this.storeInLocalStorage(`referral-data-${supplierId}`, data);
      return;
    }

    try {
      // Cache essential referral data
      const cacheData = {
        ...data,
        timestamp: Date.now(),
        cached: true,
        supplierId,
      };

      const response = new Response(JSON.stringify(cacheData), {
        headers: { 'Content-Type': 'application/json' },
      });

      await this.cache.put(`referral-data-${supplierId}`, response);

      // Cache QR code image if available
      if (data.qrCodeUrl) {
        await this.cacheQRCode(data.qrCodeUrl, supplierId);
      }

      // Cache referral link preview
      if (data.referralLink) {
        await this.cacheReferralLink(data.referralLink);
      }

      console.log(`✅ Cached referral data for supplier: ${supplierId}`);
    } catch (error) {
      console.error('Failed to cache referral data:', error);
      // Fallback to localStorage
      this.storeInLocalStorage(`referral-data-${supplierId}`, data);
    }
  }

  /**
   * Get referral data from offline cache
   */
  async getReferralDataOffline(
    supplierId: string,
  ): Promise<ReferralData | null> {
    if (!this.cache) {
      return this.getFromLocalStorage(`referral-data-${supplierId}`);
    }

    try {
      const cachedResponse = await this.cache.match(
        `referral-data-${supplierId}`,
      );
      if (!cachedResponse) {
        return this.getFromLocalStorage(`referral-data-${supplierId}`);
      }

      const data = await cachedResponse.json();

      // Check if cache is still valid
      const cacheAge = Date.now() - data.timestamp;
      if (cacheAge > this.config.maxCacheAge) {
        console.log('Cache expired for supplier:', supplierId);
        return null;
      }

      console.log(
        `📱 Retrieved offline referral data for supplier: ${supplierId}`,
      );
      return data;
    } catch (error) {
      console.error('Failed to retrieve offline referral data:', error);
      return this.getFromLocalStorage(`referral-data-${supplierId}`);
    }
  }

  /**
   * Cache QR code image for offline access
   */
  private async cacheQRCode(
    qrCodeUrl: string,
    supplierId: string,
  ): Promise<void> {
    if (!this.cache) return;

    try {
      // Generate QR code if it's a data URL
      if (qrCodeUrl.startsWith('data:')) {
        const response = new Response(this.dataURLToBlob(qrCodeUrl));
        await this.cache.put(`qr-code-${supplierId}`, response);
      } else {
        // Cache external QR code image
        await this.cache.add(qrCodeUrl);
      }

      console.log(`✅ Cached QR code for supplier: ${supplierId}`);
    } catch (error) {
      console.error('Failed to cache QR code:', error);
    }
  }

  /**
   * Cache referral link for offline preview
   */
  private async cacheReferralLink(referralLink: string): Promise<void> {
    if (!this.cache) return;

    try {
      // Cache the referral link page
      await this.cache.add(referralLink);
      console.log(`✅ Cached referral link: ${referralLink}`);
    } catch (error) {
      console.warn(
        'Could not cache referral link (normal for external URLs):',
        error,
      );
    }
  }

  /**
   * Store pending action for later sync
   */
  async storePendingAction(
    action: Omit<PendingAction, 'id' | 'timestamp' | 'retryCount'>,
  ): Promise<void> {
    try {
      const pendingAction: PendingAction = {
        id: this.generateActionId(),
        timestamp: Date.now(),
        retryCount: 0,
        ...action,
      };

      const existingActions = this.getPendingActions();
      existingActions.push(pendingAction);

      localStorage.setItem(
        this.pendingActionsKey,
        JSON.stringify(existingActions),
      );

      console.log(`📝 Stored pending action: ${action.type}`, pendingAction);
    } catch (error) {
      console.error('Failed to store pending action:', error);
    }
  }

  /**
   * Get all pending actions
   */
  getPendingActions(): PendingAction[] {
    try {
      const stored = localStorage.getItem(this.pendingActionsKey);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  /**
   * Remove completed action
   */
  async removePendingAction(actionId: string): Promise<void> {
    try {
      const actions = this.getPendingActions();
      const filteredActions = actions.filter(
        (action) => action.id !== actionId,
      );
      localStorage.setItem(
        this.pendingActionsKey,
        JSON.stringify(filteredActions),
      );

      console.log(`✅ Removed pending action: ${actionId}`);
    } catch (error) {
      console.error('Failed to remove pending action:', error);
    }
  }

  /**
   * Sync pending actions when online
   */
  async syncWhenOnline(): Promise<void> {
    if (!navigator.onLine) {
      console.log('🔄 Cannot sync - offline');
      return;
    }

    const pendingActions = this.getPendingActions();
    if (pendingActions.length === 0) {
      console.log('✅ No pending actions to sync');
      return;
    }

    console.log(`🔄 Syncing ${pendingActions.length} pending actions...`);

    for (const action of pendingActions) {
      try {
        const success = await this.executePendingAction(action);
        if (success) {
          await this.removePendingAction(action.id);
        } else {
          // Increment retry count
          action.retryCount++;
          if (action.retryCount >= this.config.maxRetries) {
            console.error(`❌ Max retries reached for action: ${action.id}`);
            await this.removePendingAction(action.id);
          } else {
            // Update retry count in storage
            const actions = this.getPendingActions();
            const actionIndex = actions.findIndex((a) => a.id === action.id);
            if (actionIndex !== -1) {
              actions[actionIndex] = action;
              localStorage.setItem(
                this.pendingActionsKey,
                JSON.stringify(actions),
              );
            }
          }
        }
      } catch (error) {
        console.error('Failed to sync action:', action, error);
      }
    }

    // Update last sync timestamp
    localStorage.setItem(this.lastSyncKey, Date.now().toString());
    console.log('✅ Sync completed');
  }

  /**
   * Execute a pending action
   */
  private async executePendingAction(action: PendingAction): Promise<boolean> {
    try {
      switch (action.type) {
        case 'share':
          return await this.syncShareAction(action.data);
        case 'track':
          return await this.syncTrackAction(action.data);
        case 'conversion':
          return await this.syncConversionAction(action.data);
        default:
          console.warn('Unknown action type:', action.type);
          return false;
      }
    } catch (error) {
      console.error('Failed to execute pending action:', action, error);
      return false;
    }
  }

  /**
   * Sync share action
   */
  private async syncShareAction(data: any): Promise<boolean> {
    try {
      const response = await fetch('/api/referrals/track-share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          synced_at: new Date().toISOString(),
          was_offline: true,
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to sync share action:', error);
      return false;
    }
  }

  /**
   * Sync track action
   */
  private async syncTrackAction(data: any): Promise<boolean> {
    try {
      const response = await fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          synced_at: new Date().toISOString(),
          was_offline: true,
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to sync track action:', error);
      return false;
    }
  }

  /**
   * Sync conversion action
   */
  private async syncConversionAction(data: any): Promise<boolean> {
    try {
      const response = await fetch('/api/referrals/track-conversion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          synced_at: new Date().toISOString(),
          was_offline: true,
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to sync conversion action:', error);
      return false;
    }
  }

  /**
   * Setup sync monitoring
   */
  private setupSyncMonitoring(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(async () => {
      if (navigator.onLine) {
        await this.syncWhenOnline();
      }
    }, this.config.syncInterval);
  }

  /**
   * Handle online event
   */
  private async handleOnline(): Promise<void> {
    console.log('📶 Connection restored - syncing pending actions...');
    await this.syncWhenOnline();
  }

  /**
   * Handle offline event
   */
  private handleOffline(): void {
    console.log('📴 Connection lost - switching to offline mode');
  }

  /**
   * Handle service worker messages
   */
  private handleServiceWorkerMessage(event: MessageEvent): void {
    if (event.data && event.data.type === 'CACHE_UPDATED') {
      console.log('🔄 Service worker updated cache:', event.data);
    }
  }

  /**
   * Utility: Convert data URL to Blob
   */
  private dataURLToBlob(dataURL: string): Blob {
    const parts = dataURL.split(',');
    const byteCharacters = atob(parts[1]);
    const byteNumbers = new Array(byteCharacters.length);

    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: 'image/png' });
  }

  /**
   * Generate unique action ID
   */
  private generateActionId(): string {
    return `action-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Fallback: Store in localStorage
   */
  private storeInLocalStorage(key: string, data: any): void {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to store in localStorage:', error);
    }
  }

  /**
   * Fallback: Get from localStorage
   */
  private getFromLocalStorage(key: string): any | null {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  /**
   * Get offline status
   */
  getOfflineStatus(): {
    isOffline: boolean;
    pendingActions: number;
    lastSync: Date | null;
    cacheSize: number;
  } {
    const lastSyncTimestamp = localStorage.getItem(this.lastSyncKey);
    const lastSync = lastSyncTimestamp
      ? new Date(parseInt(lastSyncTimestamp))
      : null;

    return {
      isOffline: !navigator.onLine,
      pendingActions: this.getPendingActions().length,
      lastSync,
      cacheSize: Object.keys(localStorage).filter(
        (key) =>
          key.startsWith('referral-data-') ||
          key.startsWith(this.pendingActionsKey),
      ).length,
    };
  }

  /**
   * Clear all offline data (for testing or cleanup)
   */
  async clearOfflineData(): Promise<void> {
    try {
      if (this.cache) {
        await caches.delete(this.config.cacheVersion);
        this.cache = null;
      }

      // Clear localStorage data
      Object.keys(localStorage).forEach((key) => {
        if (
          key.startsWith('referral-data-') ||
          key.startsWith(this.pendingActionsKey) ||
          key.startsWith(this.lastSyncKey)
        ) {
          localStorage.removeItem(key);
        }
      });

      console.log('🧹 Cleared all offline referral data');
    } catch (error) {
      console.error('Failed to clear offline data:', error);
    }
  }

  /**
   * Cleanup old cache entries
   */
  async cleanupOldData(): Promise<void> {
    try {
      if (!this.cache) return;

      const keys = await this.cache.keys();
      const now = Date.now();

      for (const request of keys) {
        const response = await this.cache.match(request);
        if (response) {
          const data = await response.json().catch(() => null);
          if (
            data &&
            data.timestamp &&
            now - data.timestamp > this.config.maxCacheAge
          ) {
            await this.cache.delete(request);
            console.log('🧹 Cleaned up old cache entry:', request.url);
          }
        }
      }
    } catch (error) {
      console.error('Failed to cleanup old data:', error);
    }
  }

  /**
   * Destroy the offline support instance
   */
  destroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    window.removeEventListener('online', this.handleOnline.bind(this));
    window.removeEventListener('offline', this.handleOffline.bind(this));

    console.log('🔄 Offline referral support destroyed');
  }
}

// Export singleton instance
export const offlineReferralSupport = new OfflineReferralSupport();

// Export types
export type { ReferralData, PendingAction, OfflineConfig };
