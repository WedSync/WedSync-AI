'use client';

/**
 * PWA Service for Mobile Offline Functionality
 * Handles service worker registration, push notifications, and device API access
 */

export interface PWACapabilities {
  serviceWorker: boolean;
  pushNotifications: boolean;
  camera: boolean;
  geolocation: boolean;
  contacts: boolean;
  battery: boolean;
  networkInformation: boolean;
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: any;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

export class PWAService {
  private static instance: PWAService;
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;
  private capabilities: PWACapabilities;
  private listeners: Map<string, Function[]> = new Map();

  private constructor() {
    this.capabilities = this.detectCapabilities();
    this.initializeServiceWorker();
    this.setupEventListeners();
  }

  static getInstance(): PWAService {
    if (!PWAService.instance) {
      PWAService.instance = new PWAService();
    }
    return PWAService.instance;
  }

  // Capability Detection
  private detectCapabilities(): PWACapabilities {
    return {
      serviceWorker: 'serviceWorker' in navigator,
      pushNotifications: 'PushManager' in window && 'Notification' in window,
      camera:
        'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
      geolocation: 'geolocation' in navigator,
      contacts: 'contacts' in navigator,
      battery: 'getBattery' in navigator,
      networkInformation:
        'connection' in navigator ||
        'mozConnection' in navigator ||
        'webkitConnection' in navigator,
    };
  }

  getCapabilities(): PWACapabilities {
    return this.capabilities;
  }

  // Service Worker Management
  private async initializeServiceWorker(): Promise<void> {
    if (!this.capabilities.serviceWorker) {
      console.warn('Service Worker not supported');
      return;
    }

    try {
      this.serviceWorkerRegistration = await navigator.serviceWorker.register(
        '/sw.js',
        {
          scope: '/',
        },
      );

      console.log('Service Worker registered successfully');
      this.emit('sw:registered', this.serviceWorkerRegistration);

      // Handle service worker updates
      this.serviceWorkerRegistration.addEventListener('updatefound', () => {
        const newWorker = this.serviceWorkerRegistration?.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (
              newWorker.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              this.emit('sw:updated', newWorker);
            }
          });
        }
      });
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      this.emit('sw:error', error);
    }
  }

  async updateServiceWorker(): Promise<void> {
    if (this.serviceWorkerRegistration) {
      await this.serviceWorkerRegistration.update();
    }
  }

  // Push Notifications
  async requestNotificationPermission(): Promise<NotificationPermission> {
    if (!this.capabilities.pushNotifications) {
      throw new Error('Push notifications not supported');
    }

    const permission = await Notification.requestPermission();
    this.emit('notifications:permission', permission);
    return permission;
  }

  async subscribeToPushNotifications(
    vapidPublicKey: string,
  ): Promise<PushSubscription | null> {
    if (!this.serviceWorkerRegistration) {
      throw new Error('Service Worker not registered');
    }

    const permission = await this.requestNotificationPermission();
    if (permission !== 'granted') {
      throw new Error('Notification permission not granted');
    }

    try {
      const subscription =
        await this.serviceWorkerRegistration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: vapidPublicKey,
        });

      this.emit('notifications:subscribed', subscription);
      return subscription;
    } catch (error) {
      console.error('Push subscription failed:', error);
      this.emit('notifications:error', error);
      throw error;
    }
  }

  async showNotification(payload: PushNotificationPayload): Promise<void> {
    if (!this.serviceWorkerRegistration) {
      throw new Error('Service Worker not registered');
    }

    await this.serviceWorkerRegistration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon || '/icon-192.png',
      badge: payload.badge || '/badge-72.png',
      data: payload.data,
      actions: payload.actions,
      tag: 'wedsync-notification',
      renotify: true,
    });
  }

  // Camera API Access
  async requestCameraAccess(
    constraints?: MediaStreamConstraints,
  ): Promise<MediaStream> {
    if (!this.capabilities.camera) {
      throw new Error('Camera not supported');
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
        ...constraints,
      });

      this.emit('camera:granted', stream);
      return stream;
    } catch (error) {
      console.error('Camera access failed:', error);
      this.emit('camera:error', error);
      throw error;
    }
  }

  async takePicture(stream: MediaStream): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      if (!context) {
        reject(new Error('Canvas context not available'));
        return;
      }

      video.srcObject = stream;
      video.onloadedmetadata = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        video.play();

        setTimeout(() => {
          context.drawImage(video, 0, 0);
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Failed to capture image'));
              }
            },
            'image/jpeg',
            0.85,
          );
        }, 100);
      };
    });
  }

  stopCameraStream(stream: MediaStream): void {
    stream.getTracks().forEach((track) => track.stop());
    this.emit('camera:stopped', null);
  }

  // Geolocation API
  async getCurrentLocation(): Promise<GeolocationPosition> {
    if (!this.capabilities.geolocation) {
      throw new Error('Geolocation not supported');
    }

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.emit('location:granted', position);
          resolve(position);
        },
        (error) => {
          console.error('Geolocation failed:', error);
          this.emit('location:error', error);
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // 5 minutes
        },
      );
    });
  }

  watchLocation(callback: (position: GeolocationPosition) => void): number {
    if (!this.capabilities.geolocation) {
      throw new Error('Geolocation not supported');
    }

    return navigator.geolocation.watchPosition(
      callback,
      (error) => {
        console.error('Location watch failed:', error);
        this.emit('location:error', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000, // 1 minute
      },
    );
  }

  stopWatchingLocation(watchId: number): void {
    navigator.geolocation.clearWatch(watchId);
  }

  // Battery Status API
  async getBatteryInfo(): Promise<any> {
    if (!this.capabilities.battery) {
      throw new Error('Battery API not supported');
    }

    try {
      const battery = await (navigator as any).getBattery();

      const batteryInfo = {
        level: Math.round(battery.level * 100),
        charging: battery.charging,
        chargingTime: battery.chargingTime,
        dischargingTime: battery.dischargingTime,
      };

      this.emit('battery:info', batteryInfo);
      return batteryInfo;
    } catch (error) {
      console.error('Battery info failed:', error);
      this.emit('battery:error', error);
      throw error;
    }
  }

  // Network Information API
  getNetworkInfo(): any {
    if (!this.capabilities.networkInformation) {
      return null;
    }

    const connection =
      (navigator as any).connection ||
      (navigator as any).mozConnection ||
      (navigator as any).webkitConnection;

    if (!connection) return null;

    const networkInfo = {
      type: connection.type,
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt,
      saveData: connection.saveData,
    };

    this.emit('network:info', networkInfo);
    return networkInfo;
  }

  // Offline Analytics
  private analytics: Array<{ event: string; data: any; timestamp: Date }> = [];

  trackOfflineEvent(event: string, data: any): void {
    this.analytics.push({
      event,
      data,
      timestamp: new Date(),
    });

    // Keep only last 1000 events
    if (this.analytics.length > 1000) {
      this.analytics = this.analytics.slice(-1000);
    }

    // Store in localStorage for persistence
    localStorage.setItem('pwa_analytics', JSON.stringify(this.analytics));
    this.emit('analytics:tracked', { event, data });
  }

  getAnalytics(): Array<{ event: string; data: any; timestamp: Date }> {
    // Load from localStorage if not in memory
    if (this.analytics.length === 0) {
      const stored = localStorage.getItem('pwa_analytics');
      if (stored) {
        this.analytics = JSON.parse(stored).map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp),
        }));
      }
    }
    return this.analytics;
  }

  async syncAnalytics(): Promise<void> {
    const analytics = this.getAnalytics();
    if (analytics.length === 0) return;

    try {
      // Mock analytics sync - replace with actual endpoint
      console.log('Syncing analytics:', analytics);

      // Clear analytics after successful sync
      this.analytics = [];
      localStorage.removeItem('pwa_analytics');

      this.emit('analytics:synced', analytics);
    } catch (error) {
      console.error('Analytics sync failed:', error);
      this.emit('analytics:error', error);
    }
  }

  // Event Listeners Setup
  private setupEventListeners(): void {
    // Online/offline status
    window.addEventListener('online', () => {
      this.emit('network:online', null);
      this.trackOfflineEvent('network:online', { timestamp: new Date() });
    });

    window.addEventListener('offline', () => {
      this.emit('network:offline', null);
      this.trackOfflineEvent('network:offline', { timestamp: new Date() });
    });

    // Visibility change (app focus/blur)
    document.addEventListener('visibilitychange', () => {
      const isVisible = !document.hidden;
      this.emit('app:visibility', { isVisible });
      this.trackOfflineEvent('app:visibility', {
        isVisible,
        timestamp: new Date(),
      });
    });

    // Service Worker messages
    navigator.serviceWorker?.addEventListener('message', (event) => {
      this.emit('sw:message', event.data);
    });
  }

  // Event System
  private emit(event: string, data?: any): void {
    const listeners = this.listeners.get(event) || [];
    listeners.forEach((listener) => {
      try {
        listener(data);
      } catch (error) {
        console.error(`Error in PWA event listener for ${event}:`, error);
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
  isOnline(): boolean {
    return navigator.onLine;
  }

  isStandalone(): boolean {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    );
  }

  getInstallPromptEvent(): Event | null {
    return (window as any).deferredPrompt || null;
  }
}

// Export singleton instance
export const pwaService = PWAService.getInstance();
