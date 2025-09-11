'use client';

/**
 * WedMe Integration Service for Cross-Platform Mobile Coordination
 * Handles authentication, sync, and collaboration between WedSync and WedMe
 */

export interface WedMeAuthToken {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  scope: string[];
}

export interface WedMeDevice {
  id: string;
  name: string;
  platform: 'ios' | 'android' | 'web';
  lastSeen: Date;
  capabilities: string[];
}

export interface WedMeSyncItem {
  id: string;
  type: 'photo' | 'portfolio' | 'task' | 'note';
  data: any;
  timestamp: Date;
  deviceId: string;
  status: 'pending' | 'synced' | 'conflict';
}

export class WedMeIntegration {
  private static instance: WedMeIntegration;
  private authToken: WedMeAuthToken | null = null;
  private devices: Map<string, WedMeDevice> = new Map();
  private syncQueue: WedMeSyncItem[] = [];
  private listeners: Map<string, Function[]> = new Map();

  private constructor() {
    this.initializeAuth();
    this.setupDeviceDiscovery();
  }

  static getInstance(): WedMeIntegration {
    if (!WedMeIntegration.instance) {
      WedMeIntegration.instance = new WedMeIntegration();
    }
    return WedMeIntegration.instance;
  }

  // Authentication Management
  private async initializeAuth(): Promise<void> {
    const storedAuth = localStorage.getItem('wedme_auth');
    if (storedAuth) {
      try {
        const auth = JSON.parse(storedAuth) as WedMeAuthToken;
        if (auth.expiresAt > Date.now()) {
          this.authToken = auth;
          this.emit('auth:ready', auth);
        } else {
          await this.refreshToken(auth.refreshToken);
        }
      } catch (error) {
        console.error('Failed to restore WedMe auth:', error);
      }
    }
  }

  async authenticate(credentials: {
    username: string;
    password: string;
  }): Promise<WedMeAuthToken> {
    try {
      // Mock WedMe authentication - replace with actual API call
      const mockToken: WedMeAuthToken = {
        accessToken: `wedme_token_${Date.now()}`,
        refreshToken: `wedme_refresh_${Date.now()}`,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
        scope: ['portfolio:read', 'portfolio:write', 'sync:all'],
      };

      this.authToken = mockToken;
      localStorage.setItem('wedme_auth', JSON.stringify(mockToken));
      this.emit('auth:success', mockToken);

      return mockToken;
    } catch (error) {
      this.emit('auth:error', error);
      throw error;
    }
  }

  private async refreshToken(refreshToken: string): Promise<WedMeAuthToken> {
    try {
      // Mock token refresh - replace with actual API call
      const newToken: WedMeAuthToken = {
        accessToken: `wedme_token_${Date.now()}`,
        refreshToken: refreshToken,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
        scope: ['portfolio:read', 'portfolio:write', 'sync:all'],
      };

      this.authToken = newToken;
      localStorage.setItem('wedme_auth', JSON.stringify(newToken));
      this.emit('auth:refreshed', newToken);

      return newToken;
    } catch (error) {
      this.emit('auth:error', error);
      throw error;
    }
  }

  // Device Discovery and Management
  private setupDeviceDiscovery(): void {
    // Mock device discovery - replace with actual WedMe device discovery
    const mockDevices: WedMeDevice[] = [
      {
        id: 'wedme_phone_1',
        name: 'Photographer iPhone',
        platform: 'ios',
        lastSeen: new Date(),
        capabilities: ['camera', 'portfolio', 'offline_sync'],
      },
      {
        id: 'wedme_tablet_1',
        name: 'Assistant iPad',
        platform: 'ios',
        lastSeen: new Date(Date.now() - 1000 * 60 * 5),
        capabilities: ['portfolio', 'offline_sync', 'team_coordination'],
      },
    ];

    mockDevices.forEach((device) => {
      this.devices.set(device.id, device);
    });

    this.emit('devices:discovered', Array.from(this.devices.values()));
  }

  getConnectedDevices(): WedMeDevice[] {
    return Array.from(this.devices.values());
  }

  // Cross-Platform Sync
  async syncWithWedMe(weddingId: string, data: any): Promise<void> {
    if (!this.authToken) {
      throw new Error('Not authenticated with WedMe');
    }

    const syncItem: WedMeSyncItem = {
      id: `sync_${Date.now()}`,
      type: 'portfolio',
      data: {
        weddingId,
        ...data,
      },
      timestamp: new Date(),
      deviceId: this.getCurrentDeviceId(),
      status: 'pending',
    };

    this.syncQueue.push(syncItem);
    this.emit('sync:queued', syncItem);

    try {
      await this.processSyncQueue();
    } catch (error) {
      syncItem.status = 'conflict';
      this.emit('sync:error', { item: syncItem, error });
    }
  }

  private async processSyncQueue(): Promise<void> {
    const pendingItems = this.syncQueue.filter(
      (item) => item.status === 'pending',
    );

    for (const item of pendingItems) {
      try {
        // Mock sync processing - replace with actual WedMe API calls
        await new Promise((resolve) => setTimeout(resolve, 1000));

        item.status = 'synced';
        this.emit('sync:completed', item);
      } catch (error) {
        item.status = 'conflict';
        this.emit('sync:conflict', { item, error });
      }
    }
  }

  // Portfolio Coordination
  async syncPortfolio(portfolioData: any): Promise<void> {
    const syncItem: WedMeSyncItem = {
      id: `portfolio_${Date.now()}`,
      type: 'portfolio',
      data: portfolioData,
      timestamp: new Date(),
      deviceId: this.getCurrentDeviceId(),
      status: 'pending',
    };

    this.syncQueue.push(syncItem);

    try {
      await this.uploadToWedMe(syncItem);
      syncItem.status = 'synced';
      this.emit('portfolio:synced', syncItem);
    } catch (error) {
      syncItem.status = 'conflict';
      this.emit('portfolio:error', { item: syncItem, error });
    }
  }

  private async uploadToWedMe(item: WedMeSyncItem): Promise<void> {
    if (!this.authToken) {
      throw new Error('Not authenticated');
    }

    // Mock upload - replace with actual WedMe API call
    console.log('Uploading to WedMe:', item);
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  // Deep Linking Support
  generateDeepLink(action: string, params: Record<string, any>): string {
    const baseUrl = 'wedme://';
    const queryString = new URLSearchParams({
      action,
      source: 'wedsync',
      ...params,
    }).toString();

    return `${baseUrl}${action}?${queryString}`;
  }

  handleDeepLink(url: string): void {
    try {
      const parsedUrl = new URL(url);
      const action = parsedUrl.pathname.replace('/', '');
      const params = Object.fromEntries(parsedUrl.searchParams.entries());

      this.emit('deeplink:received', { action, params });
    } catch (error) {
      console.error('Invalid deep link:', url, error);
    }
  }

  // Offline Collaboration
  async sendOfflineMessage(recipientId: string, message: any): Promise<void> {
    const offlineMessage = {
      id: `msg_${Date.now()}`,
      recipientId,
      message,
      timestamp: new Date(),
      status: 'queued',
    };

    // Store in local storage for offline access
    const offlineMessages = this.getOfflineMessages();
    offlineMessages.push(offlineMessage);
    localStorage.setItem(
      'wedme_offline_messages',
      JSON.stringify(offlineMessages),
    );

    this.emit('message:queued', offlineMessage);
  }

  private getOfflineMessages(): any[] {
    const stored = localStorage.getItem('wedme_offline_messages');
    return stored ? JSON.parse(stored) : [];
  }

  async syncOfflineMessages(): Promise<void> {
    const messages = this.getOfflineMessages();
    const pendingMessages = messages.filter((msg) => msg.status === 'queued');

    for (const message of pendingMessages) {
      try {
        // Mock message sync - replace with actual WedMe API call
        await new Promise((resolve) => setTimeout(resolve, 500));
        message.status = 'sent';
        this.emit('message:sent', message);
      } catch (error) {
        message.status = 'error';
        this.emit('message:error', { message, error });
      }
    }

    localStorage.setItem('wedme_offline_messages', JSON.stringify(messages));
  }

  // Event System
  private emit(event: string, data?: any): void {
    const listeners = this.listeners.get(event) || [];
    listeners.forEach((listener) => {
      try {
        listener(data);
      } catch (error) {
        console.error(`Error in WedMe event listener for ${event}:`, error);
      }
    });
  }

  on(event: string, listener: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
  }

  off(event: string, listener: Function): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  // Utility Methods
  private getCurrentDeviceId(): string {
    // Generate or retrieve current device ID
    let deviceId = localStorage.getItem('wedsync_device_id');
    if (!deviceId) {
      deviceId = `wedsync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('wedsync_device_id', deviceId);
    }
    return deviceId;
  }

  isAuthenticated(): boolean {
    return this.authToken !== null && this.authToken.expiresAt > Date.now();
  }

  getSyncQueueSize(): number {
    return this.syncQueue.filter((item) => item.status === 'pending').length;
  }

  getConflictCount(): number {
    return this.syncQueue.filter((item) => item.status === 'conflict').length;
  }
}

// Export singleton instance
export const wedMeIntegration = WedMeIntegration.getInstance();
