/**
 * WS-153: Photographer Integration Hub
 * Professional photographer app integration and coordination
 */

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/lib/database.types';

export interface PhotographerAccess {
  id: string;
  photographerId: string;
  weddingId: string;
  accessToken: string;
  permissions: PhotographerPermission[];
  validFrom: Date;
  validUntil: Date;
  isEmergency: boolean;
  deviceInfo?: DeviceInfo;
  lastAccessed?: Date;
}

export interface PhotographerPermission {
  resource: 'photo_groups' | 'timeline' | 'guests' | 'locations';
  actions: ('read' | 'write' | 'update' | 'delete')[];
}

export interface DeviceInfo {
  platform: 'ios' | 'android' | 'web';
  appVersion: string;
  deviceId: string;
  pushToken?: string;
}

export interface PhotoDelivery {
  id: string;
  photographerId: string;
  photoGroupId: string;
  status: 'pending' | 'uploading' | 'processing' | 'delivered';
  photoCount: number;
  uploadedAt?: Date;
  deliveredAt?: Date;
  storageUrl?: string;
  metadata?: PhotoMetadata;
}

export interface PhotoMetadata {
  camera?: string;
  lens?: string;
  settings?: {
    iso?: number;
    aperture?: string;
    shutterSpeed?: string;
  };
  location?: {
    lat: number;
    lng: number;
    venue?: string;
  };
  tags?: string[];
  faces?: number;
}

export interface ShotListSync {
  id: string;
  weddingId: string;
  photographerId: string;
  shotList: ShotItem[];
  completedShots: string[];
  lastSyncedAt: Date;
  syncStatus: 'synced' | 'pending' | 'conflict';
}

export interface ShotItem {
  id: string;
  category: string;
  description: string;
  priority: 'must-have' | 'nice-to-have' | 'optional';
  location?: string;
  timeSlot?: string;
  participants?: string[];
  completed: boolean;
  photoIds?: string[];
}

export class PhotographerIntegrationHub {
  private supabase = createClientComponentClient<Database>();
  private activeConnections: Map<string, PhotographerAccess> = new Map();
  private syncInterval: NodeJS.Timeout | null = null;
  private realtimeChannel: any = null;

  constructor() {
    this.setupRealtimeSync();
    this.startPeriodicSync();
  }

  /**
   * Generate secure access for photographer
   */
  public async generatePhotographerAccess(
    weddingId: string,
    photographerId: string,
    options: {
      isEmergency?: boolean;
      duration?: number; // hours
      permissions?: PhotographerPermission[];
    } = {},
  ): Promise<PhotographerAccess> {
    const accessToken = this.generateSecureToken();
    const now = new Date();
    const validUntil = new Date(
      now.getTime() + (options.duration || 12) * 60 * 60 * 1000,
    );

    const access: PhotographerAccess = {
      id: crypto.randomUUID(),
      photographerId,
      weddingId,
      accessToken,
      permissions: options.permissions || this.getDefaultPermissions(),
      validFrom: now,
      validUntil,
      isEmergency: options.isEmergency || false,
    };

    // Store in database
    const { error } = await this.supabase
      .from('photographer_access')
      .insert(access);

    if (error) throw error;

    // Cache active connection
    this.activeConnections.set(accessToken, access);

    // Generate QR code data
    const qrData = this.generateQRCode(access);

    return { ...access, qrCode: qrData } as any;
  }

  /**
   * Validate photographer access token
   */
  public async validateAccess(token: string): Promise<boolean> {
    // Check cache first
    if (this.activeConnections.has(token)) {
      const access = this.activeConnections.get(token)!;
      if (new Date() <= access.validUntil) {
        return true;
      }
      this.activeConnections.delete(token);
    }

    // Check database
    const { data, error } = await this.supabase
      .from('photographer_access')
      .select('*')
      .eq('accessToken', token)
      .single();

    if (error || !data) return false;

    const now = new Date();
    if (new Date(data.validUntil) < now) {
      return false;
    }

    // Update last accessed
    await this.supabase
      .from('photographer_access')
      .update({ lastAccessed: now.toISOString() })
      .eq('id', data.id);

    // Cache for future requests
    this.activeConnections.set(token, data as any);

    return true;
  }

  /**
   * Setup real-time sync with photographer apps
   */
  private setupRealtimeSync(): void {
    this.realtimeChannel = this.supabase
      .channel('photographer-sync')
      .on('broadcast', { event: 'shot-completed' }, (payload) => {
        this.handleShotCompleted(payload);
      })
      .on('broadcast', { event: 'photo-uploaded' }, (payload) => {
        this.handlePhotoUploaded(payload);
      })
      .on('broadcast', { event: 'location-update' }, (payload) => {
        this.handleLocationUpdate(payload);
      })
      .on('presence', { event: 'sync' }, () => {
        this.syncPhotographerPresence();
      })
      .subscribe();
  }

  /**
   * Start periodic sync for offline changes
   */
  private startPeriodicSync(): void {
    // Sync every 30 seconds when online
    this.syncInterval = setInterval(() => {
      if (navigator.onLine) {
        this.syncPendingChanges();
      }
    }, 30000);
  }

  /**
   * Sync shot list with photographer app
   */
  public async syncShotList(
    weddingId: string,
    photographerId: string,
    shotList: ShotItem[],
  ): Promise<ShotListSync> {
    const syncData: ShotListSync = {
      id: crypto.randomUUID(),
      weddingId,
      photographerId,
      shotList,
      completedShots: [],
      lastSyncedAt: new Date(),
      syncStatus: 'synced',
    };

    try {
      // Store in database
      const { data, error } = await this.supabase
        .from('shot_list_sync')
        .upsert(syncData)
        .select()
        .single();

      if (error) throw error;

      // Broadcast to photographer app
      await this.realtimeChannel.send({
        type: 'broadcast',
        event: 'shot-list-update',
        payload: syncData,
      });

      return data;
    } catch (error) {
      syncData.syncStatus = 'pending';
      // Queue for later sync if offline
      this.queueForSync(syncData);
      return syncData;
    }
  }

  /**
   * Handle completed shot notification
   */
  private async handleShotCompleted(payload: any): Promise<void> {
    const { shotId, photographerId, photoCount, metadata } = payload;

    // Update shot status
    await this.supabase
      .from('shot_items')
      .update({
        completed: true,
        photoCount,
        metadata,
        completedAt: new Date().toISOString(),
      })
      .eq('id', shotId);

    // Notify couple
    this.notifyCouple('shot-completed', {
      shotId,
      photographerId,
      photoCount,
    });
  }

  /**
   * Handle photo upload from photographer
   */
  private async handlePhotoUploaded(payload: any): Promise<void> {
    const { photoGroupId, photographerId, photos, uploadProgress } = payload;

    const delivery: PhotoDelivery = {
      id: crypto.randomUUID(),
      photographerId,
      photoGroupId,
      status: uploadProgress === 100 ? 'processing' : 'uploading',
      photoCount: photos.length,
      uploadedAt: new Date(),
    };

    // Store delivery record
    await this.supabase.from('photo_deliveries').insert(delivery);

    // Process photos if upload complete
    if (uploadProgress === 100) {
      await this.processUploadedPhotos(photos);
    }
  }

  /**
   * Handle photographer location update
   */
  private async handleLocationUpdate(payload: any): Promise<void> {
    const { photographerId, location, timestamp } = payload;

    // Store location for tracking
    await this.supabase.from('photographer_locations').insert({
      photographerId,
      lat: location.lat,
      lng: location.lng,
      timestamp,
      accuracy: location.accuracy,
    });

    // Check if photographer is at venue
    await this.checkVenueArrival(photographerId, location);
  }

  /**
   * Process uploaded photos
   */
  private async processUploadedPhotos(photos: any[]): Promise<void> {
    for (const photo of photos) {
      // Generate thumbnails
      await this.generateThumbnails(photo);

      // Extract metadata
      const metadata = await this.extractPhotoMetadata(photo);

      // Run face detection
      const faces = await this.detectFaces(photo);

      // Store processed photo
      await this.supabase.from('processed_photos').insert({
        id: photo.id,
        url: photo.url,
        thumbnailUrl: photo.thumbnailUrl,
        metadata,
        faceCount: faces.length,
        processedAt: new Date().toISOString(),
      });
    }
  }

  /**
   * Generate secure access token
   */
  private generateSecureToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join(
      '',
    );
  }

  /**
   * Generate QR code for photographer access
   */
  private generateQRCode(access: PhotographerAccess): string {
    const data = {
      token: access.accessToken,
      wedding: access.weddingId,
      expires: access.validUntil.toISOString(),
      emergency: access.isEmergency,
    };

    return `wedsync://photographer/access?data=${encodeURIComponent(JSON.stringify(data))}`;
  }

  /**
   * Get default photographer permissions
   */
  private getDefaultPermissions(): PhotographerPermission[] {
    return [
      {
        resource: 'photo_groups',
        actions: ['read', 'update'],
      },
      {
        resource: 'timeline',
        actions: ['read'],
      },
      {
        resource: 'guests',
        actions: ['read'],
      },
      {
        resource: 'locations',
        actions: ['read', 'update'],
      },
    ];
  }

  /**
   * Queue data for sync when offline
   */
  private queueForSync(data: any): void {
    const queue = JSON.parse(
      localStorage.getItem('photographer_sync_queue') || '[]',
    );
    queue.push({
      ...data,
      queuedAt: Date.now(),
    });
    localStorage.setItem('photographer_sync_queue', JSON.stringify(queue));
  }

  /**
   * Sync pending changes
   */
  private async syncPendingChanges(): Promise<void> {
    const queue = JSON.parse(
      localStorage.getItem('photographer_sync_queue') || '[]',
    );

    for (const item of queue) {
      try {
        await this.supabase.from('sync_queue').insert(item);

        // Remove from queue after successful sync
        const updatedQueue = queue.filter((q: any) => q.id !== item.id);
        localStorage.setItem(
          'photographer_sync_queue',
          JSON.stringify(updatedQueue),
        );
      } catch (error) {
        console.error('Sync failed for item:', item.id);
      }
    }
  }

  /**
   * Sync photographer presence
   */
  private async syncPhotographerPresence(): Promise<void> {
    const activePhotographers = Array.from(
      this.activeConnections.values(),
    ).filter((conn) => new Date() <= conn.validUntil);

    for (const photographer of activePhotographers) {
      await this.realtimeChannel.track({
        photographerId: photographer.photographerId,
        weddingId: photographer.weddingId,
        online: true,
        lastSeen: new Date().toISOString(),
      });
    }
  }

  /**
   * Check if photographer arrived at venue
   */
  private async checkVenueArrival(
    photographerId: string,
    location: { lat: number; lng: number },
  ): Promise<void> {
    // Get venue location from wedding data
    const { data: wedding } = await this.supabase
      .from('weddings')
      .select('venue_lat, venue_lng')
      .single();

    if (!wedding) return;

    // Calculate distance to venue
    const distance = this.calculateDistance(
      location.lat,
      location.lng,
      wedding.venue_lat,
      wedding.venue_lng,
    );

    // If within 100 meters of venue
    if (distance < 100) {
      await this.notifyCouple('photographer-arrived', {
        photographerId,
        arrivedAt: new Date().toISOString(),
      });
    }
  }

  /**
   * Calculate distance between two coordinates
   */
  private calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const R = 6371e3; // Earth radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Notify couple of photographer updates
   */
  private async notifyCouple(event: string, data: any): Promise<void> {
    // Send push notification
    await this.supabase.functions.invoke('send-notification', {
      body: {
        event,
        data,
        recipients: ['couple'],
      },
    });
  }

  // Placeholder methods for photo processing
  private async generateThumbnails(photo: any): Promise<void> {
    // Implementation would generate thumbnails
  }

  private async extractPhotoMetadata(photo: any): Promise<any> {
    // Implementation would extract EXIF data
    return {};
  }

  private async detectFaces(photo: any): Promise<any[]> {
    // Implementation would detect faces using ML
    return [];
  }

  /**
   * Cleanup on destroy
   */
  public destroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    if (this.realtimeChannel) {
      this.supabase.removeChannel(this.realtimeChannel);
    }
  }
}
