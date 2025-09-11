/**
 * WedMe Platform Portfolio Synchronization Service
 * Handles real-time sync between mobile portfolio management and WedMe platform
 */

import { supabase } from '@/lib/supabase/client';

export interface WedMePortfolioSync {
  id: string;
  supplierId: string;
  portfolioId: string;
  wedmeEventId: string;
  lastSyncAt: string;
  syncStatus: 'pending' | 'syncing' | 'completed' | 'failed';
  conflictResolution: 'supplier_wins' | 'wedme_wins' | 'manual';
}

export interface PortfolioSyncResult {
  success: boolean;
  syncId: string;
  updatedImages: number;
  conflicts?: Array<{
    type: 'metadata' | 'visibility' | 'categorization';
    portfolioVersion: any;
    wedmeVersion: any;
  }>;
  error?: string;
}

export interface WedMeEvent {
  id: string;
  coupleIds: string[];
  eventDate: string;
  venue?: {
    name: string;
    location: {
      lat: number;
      lng: number;
      address: string;
    };
  };
  suppliers: Array<{
    id: string;
    role: string;
    portfolioEnabled: boolean;
  }>;
}

export interface CoupleEngagementMetrics {
  eventId: string;
  coupleId: string;
  portfolioViews: number;
  favoriteImages: string[];
  shareCount: number;
  inquiryCount: number;
  lastViewedAt: string;
  preferredStyles: string[];
  engagementScore: number;
}

class WedMePortfolioSyncService {
  private syncQueue: Map<string, WedMePortfolioSync> = new Map();
  private isOnline: boolean = navigator.onLine;
  private syncInterval: number | null = null;

  constructor() {
    this.initializeNetworkListener();
    this.startSyncScheduler();
  }

  private initializeNetworkListener(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processSyncQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.pauseRealTimeSync();
    });
  }

  private startSyncScheduler(): void {
    if (this.syncInterval) clearInterval(this.syncInterval);

    this.syncInterval = window.setInterval(() => {
      if (this.isOnline) {
        this.processSyncQueue();
      }
    }, 30000); // Sync every 30 seconds
  }

  /**
   * Sync portfolio data with WedMe platform
   */
  async syncPortfolio(
    supplierId: string,
    portfolioData: any,
  ): Promise<PortfolioSyncResult> {
    const syncId = `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Get WedMe events for this supplier
      const wedmeEvents = await this.getWedMeEvents(supplierId);

      const results = await Promise.all(
        wedmeEvents.map((event) =>
          this.syncPortfolioToEvent(event, portfolioData, syncId),
        ),
      );

      const totalUpdated = results.reduce(
        (sum, result) => sum + result.updatedImages,
        0,
      );
      const allConflicts = results.flatMap((result) => result.conflicts || []);

      // Update sync status
      await this.updateSyncStatus(syncId, 'completed');

      // Track analytics
      await this.trackSyncMetrics(supplierId, {
        syncId,
        eventsUpdated: wedmeEvents.length,
        imagesUpdated: totalUpdated,
        conflictsResolved: allConflicts.length,
      });

      return {
        success: true,
        syncId,
        updatedImages: totalUpdated,
        conflicts: allConflicts.length > 0 ? allConflicts : undefined,
      };
    } catch (error) {
      await this.updateSyncStatus(syncId, 'failed');

      return {
        success: false,
        syncId,
        updatedImages: 0,
        error: error instanceof Error ? error.message : 'Unknown sync error',
      };
    }
  }

  /**
   * Sync portfolio to specific WedMe event
   */
  private async syncPortfolioToEvent(
    event: WedMeEvent,
    portfolioData: any,
    syncId: string,
  ): Promise<PortfolioSyncResult> {
    const { data: existingSync } = await supabase
      .from('wedme_portfolio_sync')
      .select('*')
      .eq('wedme_event_id', event.id)
      .eq('portfolio_id', portfolioData.id)
      .single();

    // Prepare portfolio data for WedMe format
    const wedmePortfolioData = this.formatPortfolioForWedMe(
      portfolioData,
      event,
    );

    // Check for conflicts
    const conflicts = await this.detectSyncConflicts(
      existingSync,
      wedmePortfolioData,
    );

    if (conflicts.length > 0) {
      await this.handleSyncConflicts(conflicts, syncId);
    }

    // Update WedMe platform
    const { data: syncResult, error } = await supabase
      .from('wedme_couple_portfolios')
      .upsert({
        event_id: event.id,
        supplier_id: portfolioData.supplierId,
        portfolio_data: wedmePortfolioData,
        sync_id: syncId,
        last_updated: new Date().toISOString(),
      });

    if (error) throw error;

    // Update local sync record
    await supabase.from('wedme_portfolio_sync').upsert({
      id: existingSync?.id || `${event.id}_${portfolioData.id}`,
      supplier_id: portfolioData.supplierId,
      portfolio_id: portfolioData.id,
      wedme_event_id: event.id,
      last_sync_at: new Date().toISOString(),
      sync_status: 'completed',
    });

    return {
      success: true,
      syncId,
      updatedImages: wedmePortfolioData.images?.length || 0,
      conflicts: conflicts.length > 0 ? conflicts : undefined,
    };
  }

  /**
   * Get WedMe events for supplier
   */
  private async getWedMeEvents(supplierId: string): Promise<WedMeEvent[]> {
    const { data, error } = await supabase
      .from('wedme_events')
      .select(
        `
        id,
        event_date,
        venue_data,
        couples:wedme_event_couples(
          couple_id
        ),
        suppliers:wedding_suppliers(
          id,
          role,
          portfolio_enabled
        )
      `,
      )
      .eq('suppliers.id', supplierId)
      .eq('status', 'active');

    if (error) throw error;

    return (
      data?.map((event) => ({
        id: event.id,
        coupleIds: event.couples?.map((c: any) => c.couple_id) || [],
        eventDate: event.event_date,
        venue: event.venue_data,
        suppliers: event.suppliers || [],
      })) || []
    );
  }

  /**
   * Format portfolio data for WedMe platform consumption
   */
  private formatPortfolioForWedMe(portfolioData: any, event: WedMeEvent): any {
    return {
      supplierId: portfolioData.supplierId,
      eventId: event.id,
      images: portfolioData.images?.map((image: any) => ({
        id: image.id,
        url: image.optimizedUrl || image.url,
        thumbnailUrl: image.thumbnailUrl,
        alt: image.alt || `Portfolio image by ${portfolioData.supplierName}`,
        category: image.category,
        tags: image.tags || [],
        metadata: {
          capturedAt: image.capturedAt,
          location: image.location,
          equipment: image.equipment,
          settings: image.cameraSettings,
        },
        visibility: image.coupleVisible ? 'public' : 'private',
        featured: image.featured || false,
        sortOrder: image.sortOrder || 0,
      })),
      categories: portfolioData.categories || [],
      supplierInfo: {
        name: portfolioData.supplierName,
        role: portfolioData.role,
        contactInfo: portfolioData.contactInfo,
      },
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Detect synchronization conflicts
   */
  private async detectSyncConflicts(
    existingSync: any,
    newData: any,
  ): Promise<any[]> {
    const conflicts = [];

    if (!existingSync) return conflicts;

    const { data: wedmeData } = await supabase
      .from('wedme_couple_portfolios')
      .select('portfolio_data')
      .eq('event_id', existingSync.wedme_event_id)
      .single();

    if (!wedmeData?.portfolio_data) return conflicts;

    // Check for metadata conflicts
    const existingImages = wedmeData.portfolio_data.images || [];
    const newImages = newData.images || [];

    for (const newImage of newImages) {
      const existingImage = existingImages.find(
        (img: any) => img.id === newImage.id,
      );

      if (existingImage) {
        if (existingImage.category !== newImage.category) {
          conflicts.push({
            type: 'categorization',
            imageId: newImage.id,
            portfolioVersion: newImage.category,
            wedmeVersion: existingImage.category,
          });
        }

        if (existingImage.visibility !== newImage.visibility) {
          conflicts.push({
            type: 'visibility',
            imageId: newImage.id,
            portfolioVersion: newImage.visibility,
            wedmeVersion: existingImage.visibility,
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Handle synchronization conflicts
   */
  private async handleSyncConflicts(
    conflicts: any[],
    syncId: string,
  ): Promise<void> {
    // For now, implement supplier-wins strategy
    // In production, this could be configurable per supplier

    await supabase.from('sync_conflicts').insert(
      conflicts.map((conflict) => ({
        sync_id: syncId,
        conflict_type: conflict.type,
        image_id: conflict.imageId,
        portfolio_value: conflict.portfolioVersion,
        wedme_value: conflict.wedmeVersion,
        resolution_strategy: 'supplier_wins',
        resolved_at: new Date().toISOString(),
      })),
    );
  }

  /**
   * Get couple engagement metrics
   */
  async getCoupleEngagementMetrics(
    eventId: string,
  ): Promise<CoupleEngagementMetrics[]> {
    const { data, error } = await supabase
      .from('couple_portfolio_engagement')
      .select(
        `
        event_id,
        couple_id,
        portfolio_views,
        favorite_images,
        share_count,
        inquiry_count,
        last_viewed_at,
        preferred_styles,
        engagement_score
      `,
      )
      .eq('event_id', eventId);

    if (error) throw error;

    return data || [];
  }

  /**
   * Track portfolio view from couple
   */
  async trackCouplePortfolioView(
    eventId: string,
    coupleId: string,
    imageId?: string,
  ): Promise<void> {
    const { data: existing } = await supabase
      .from('couple_portfolio_engagement')
      .select('*')
      .eq('event_id', eventId)
      .eq('couple_id', coupleId)
      .single();

    const updatedData = {
      event_id: eventId,
      couple_id: coupleId,
      portfolio_views: (existing?.portfolio_views || 0) + 1,
      last_viewed_at: new Date().toISOString(),
      ...(imageId && {
        viewed_images: [...(existing?.viewed_images || []), imageId].slice(
          -100,
        ), // Keep last 100 viewed
      }),
    };

    await supabase.from('couple_portfolio_engagement').upsert(updatedData);
  }

  /**
   * Enable real-time portfolio updates for couples
   */
  enableRealTimeUpdates(
    eventId: string,
    callback: (payload: any) => void,
  ): () => void {
    const channel = supabase
      .channel(`portfolio_updates_${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wedme_couple_portfolios',
          filter: `event_id=eq.${eventId}`,
        },
        callback,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  /**
   * Process pending sync queue
   */
  private async processSyncQueue(): Promise<void> {
    if (!this.isOnline || this.syncQueue.size === 0) return;

    const pendingSyncs = Array.from(this.syncQueue.values())
      .filter((sync) => sync.syncStatus === 'pending')
      .slice(0, 5); // Process max 5 at a time

    await Promise.all(
      pendingSyncs.map(async (sync) => {
        try {
          sync.syncStatus = 'syncing';

          // Retrieve portfolio data and sync
          const { data: portfolioData } = await supabase
            .from('portfolio_images')
            .select('*')
            .eq('portfolio_id', sync.portfolioId);

          await this.syncPortfolio(sync.supplierId, portfolioData);

          this.syncQueue.delete(sync.id);
        } catch (error) {
          sync.syncStatus = 'failed';
          console.error('Sync queue processing failed:', error);
        }
      }),
    );
  }

  private pauseRealTimeSync(): void {
    // Pause real-time operations when offline
    console.log('Pausing real-time sync due to offline status');
  }

  private async updateSyncStatus(
    syncId: string,
    status: WedMePortfolioSync['syncStatus'],
  ): Promise<void> {
    await supabase.from('portfolio_sync_log').insert({
      sync_id: syncId,
      status,
      timestamp: new Date().toISOString(),
    });
  }

  private async trackSyncMetrics(
    supplierId: string,
    metrics: any,
  ): Promise<void> {
    await supabase.from('portfolio_sync_metrics').insert({
      supplier_id: supplierId,
      ...metrics,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Cleanup and destroy service
   */
  destroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    window.removeEventListener('online', this.processSyncQueue);
    window.removeEventListener('offline', this.pauseRealTimeSync);
  }
}

// Singleton instance
export const wedmePortfolioSync = new WedMePortfolioSyncService();

// Export types
export type {
  WedMePortfolioSync,
  PortfolioSyncResult,
  WedMeEvent,
  CoupleEngagementMetrics,
};
