/**
 * WS-173 Team D Round 2: Enhanced PWA Manager
 *
 * Comprehensive PWA performance optimizations for wedding supplier mobile workflows
 * Integrates with network adaptation, caching, and touch optimization systems
 */

import React from 'react';
import {
  mobileNetworkAdapter,
  type AdaptationStrategy,
} from '../network/mobile-network-adapter';
import { cacheManager } from '../performance/advanced-cache-manager';

export interface PWACapabilities {
  installable: boolean;
  installed: boolean;
  standalone: boolean;
  fullscreen: boolean;
  notificationSupported: boolean;
  backgroundSyncSupported: boolean;
  pushSupported: boolean;
  offlineSupported: boolean;
}

export interface PWAInstallPrompt {
  canPrompt: boolean;
  hasBeenPrompted: boolean;
  userChoice: 'accepted' | 'dismissed' | 'pending';
  lastPromptTime: number;
  promptCount: number;
}

export interface PWAPerformanceConfig {
  enableBackgroundSync: boolean;
  enablePushNotifications: boolean;
  enableOfflineMode: boolean;
  cacheStrategy: 'network-first' | 'cache-first' | 'stale-while-revalidate';
  preloadCriticalResources: boolean;
  optimizeForWeddingWorkflows: boolean;
}

export interface WeddingPWAContext {
  weddingId: string;
  supplierRole: 'photographer' | 'coordinator' | 'vendor' | 'officiant';
  eventPhase: 'pre-event' | 'ceremony' | 'reception' | 'post-event';
  criticalFeatures: string[];
  venueConnectivity: 'reliable' | 'unstable' | 'poor';
}

class EnhancedPWAManager {
  private capabilities: PWACapabilities | null = null;
  private installPrompt: PWAInstallPrompt | null = null;
  private serviceWorker: ServiceWorkerRegistration | null = null;
  private performanceConfig: PWAPerformanceConfig;
  private installPromptEvent: any = null;
  private updateAvailable = false;
  private weddingContext: WeddingPWAContext | null = null;

  // Wedding-specific PWA configurations
  private static WEDDING_PWA_CONFIGS = {
    photographer: {
      criticalResources: [
        '/api/photo-groups',
        '/api/wedding/basic-info',
        '/offline-photo-editor',
      ],
      backgroundSyncPriority: ['photo-uploads', 'metadata-sync'],
      notificationTypes: ['photo-requests', 'schedule-changes'],
    },
    coordinator: {
      criticalResources: [
        '/api/wedding/timeline',
        '/api/suppliers/contacts',
        '/api/guests/assignments',
      ],
      backgroundSyncPriority: ['status-updates', 'communication'],
      notificationTypes: ['timeline-alerts', 'supplier-updates', 'emergencies'],
    },
    vendor: {
      criticalResources: [
        '/api/wedding/basic-info',
        '/api/tasks/assigned',
        '/api/communication',
      ],
      backgroundSyncPriority: ['task-updates', 'messages'],
      notificationTypes: ['task-assignments', 'schedule-changes'],
    },
    officiant: {
      criticalResources: [
        '/api/wedding/ceremony-details',
        '/api/wedding/participants',
        '/emergency-contacts',
      ],
      backgroundSyncPriority: ['ceremony-updates'],
      notificationTypes: ['ceremony-changes', 'emergencies'],
    },
  };

  constructor() {
    this.performanceConfig = {
      enableBackgroundSync: true,
      enablePushNotifications: true,
      enableOfflineMode: true,
      cacheStrategy: 'stale-while-revalidate',
      preloadCriticalResources: true,
      optimizeForWeddingWorkflows: true,
    };

    this.initializePWA();
  }

  /**
   * Initialize PWA capabilities and features
   */
  private async initializePWA(): Promise<void> {
    try {
      // Detect PWA capabilities
      await this.detectCapabilities();

      // Register enhanced service worker
      await this.registerEnhancedServiceWorker();

      // Setup installation prompt handling
      this.setupInstallPromptHandling();

      // Setup background sync if supported
      if (this.capabilities?.backgroundSyncSupported) {
        this.setupBackgroundSync();
      }

      // Setup push notifications if supported
      if (this.capabilities?.pushSupported) {
        this.setupPushNotifications();
      }

      // Setup performance monitoring
      this.setupPWAPerformanceMonitoring();

      // Integrate with network adapter
      this.integrateWithNetworkAdapter();
    } catch (error) {
      console.error('PWA initialization failed:', error);
    }
  }

  /**
   * Detect PWA capabilities
   */
  private async detectCapabilities(): Promise<void> {
    const capabilities: PWACapabilities = {
      installable: false,
      installed: window.matchMedia('(display-mode: standalone)').matches,
      standalone: window.matchMedia('(display-mode: standalone)').matches,
      fullscreen: window.matchMedia('(display-mode: fullscreen)').matches,
      notificationSupported: 'Notification' in window,
      backgroundSyncSupported:
        'serviceWorker' in navigator &&
        'sync' in window.ServiceWorkerRegistration.prototype,
      pushSupported: 'serviceWorker' in navigator && 'PushManager' in window,
      offlineSupported: 'serviceWorker' in navigator && 'caches' in window,
    };

    this.capabilities = capabilities;

    // Log capabilities for debugging
    console.log('PWA Capabilities detected:', capabilities);
  }

  /**
   * Register enhanced service worker with wedding-specific optimizations
   */
  private async registerEnhancedServiceWorker(): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Worker not supported');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.register(
        '/sw-enhanced.js',
        {
          scope: '/',
        },
      );

      this.serviceWorker = registration;

      // Handle service worker updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (
              newWorker.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              this.updateAvailable = true;
              this.notifyUpdateAvailable();
            }
          });
        }
      });

      // Setup message handling with service worker
      this.setupServiceWorkerMessaging(registration);

      console.log('Enhanced Service Worker registered successfully');
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }

  /**
   * Setup service worker messaging for performance optimization
   */
  private setupServiceWorkerMessaging(
    registration: ServiceWorkerRegistration,
  ): void {
    navigator.serviceWorker.addEventListener('message', (event) => {
      const { type, data } = event.data;

      switch (type) {
        case 'CACHE_PERFORMANCE':
          this.handleCachePerformanceUpdate(data);
          break;
        case 'NETWORK_STATUS':
          this.handleNetworkStatusUpdate(data);
          break;
        case 'BACKGROUND_SYNC_COMPLETE':
          this.handleBackgroundSyncComplete(data);
          break;
        case 'CRITICAL_RESOURCE_CACHED':
          this.handleCriticalResourceCached(data);
          break;
      }
    });
  }

  /**
   * Setup installation prompt handling with wedding-specific triggers
   */
  private setupInstallPromptHandling(): void {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.installPromptEvent = e;

      this.installPrompt = {
        canPrompt: true,
        hasBeenPrompted: false,
        userChoice: 'pending',
        lastPromptTime: Date.now(),
        promptCount: this.getInstallPromptCount(),
      };

      this.capabilities!.installable = true;

      // Trigger wedding-specific install logic
      this.evaluateWeddingInstallTriggers();
    });

    // Handle successful installation
    window.addEventListener('appinstalled', () => {
      this.capabilities!.installed = true;
      this.capabilities!.standalone = true;

      // Track installation for analytics
      this.trackInstallationEvent();

      // Optimize for installed app experience
      this.optimizeForInstalledApp();
    });
  }

  /**
   * Evaluate wedding-specific install triggers
   */
  private evaluateWeddingInstallTriggers(): void {
    if (!this.weddingContext) return;

    const triggers = {
      // Install during active wedding coordination
      activeCoordination:
        this.weddingContext.eventPhase === 'ceremony' ||
        this.weddingContext.eventPhase === 'reception',
      // Install for poor venue connectivity
      poorConnectivity:
        this.weddingContext.venueConnectivity === 'poor' ||
        this.weddingContext.venueConnectivity === 'unstable',
      // Install for photographers managing many photo groups
      photoIntensive:
        this.weddingContext.supplierRole === 'photographer' &&
        this.weddingContext.criticalFeatures.includes('photo-management'),
      // Install for coordinators managing complex events
      coordinationIntensive:
        this.weddingContext.supplierRole === 'coordinator' &&
        this.weddingContext.criticalFeatures.length > 3,
    };

    // Show install prompt if any trigger is met
    if (Object.values(triggers).some(Boolean)) {
      this.scheduleInstallPrompt(2000); // Show after 2 seconds
    }
  }

  /**
   * Schedule install prompt display
   */
  private scheduleInstallPrompt(delay: number): void {
    setTimeout(() => {
      if (this.canShowInstallPrompt()) {
        this.showInstallPrompt();
      }
    }, delay);
  }

  /**
   * Check if install prompt can be shown
   */
  private canShowInstallPrompt(): boolean {
    if (!this.installPrompt?.canPrompt || !this.installPromptEvent)
      return false;

    const now = Date.now();
    const lastPrompt = this.installPrompt.lastPromptTime;
    const daysSinceLastPrompt = (now - lastPrompt) / (1000 * 60 * 60 * 24);

    // Don't prompt too frequently
    if (daysSinceLastPrompt < 7) return false;

    // Don't prompt if already dismissed multiple times
    if (this.installPrompt.promptCount > 3) return false;

    return true;
  }

  /**
   * Show install prompt with wedding-specific messaging
   */
  async showInstallPrompt(): Promise<'accepted' | 'dismissed'> {
    if (!this.installPromptEvent || !this.installPrompt) {
      return 'dismissed';
    }

    try {
      this.installPrompt.hasBeenPrompted = true;
      this.installPrompt.promptCount += 1;
      this.installPrompt.lastPromptTime = Date.now();

      // Store prompt count
      localStorage.setItem(
        'pwa-install-prompt-count',
        this.installPrompt.promptCount.toString(),
      );

      const result = await this.installPromptEvent.prompt();
      const choice = await this.installPromptEvent.userChoice;

      this.installPrompt.userChoice = choice.outcome;

      if (choice.outcome === 'accepted') {
        console.log('PWA installation accepted');
        this.trackInstallationPromptAccepted();
      } else {
        console.log('PWA installation dismissed');
        this.trackInstallationPromptDismissed();
      }

      this.installPromptEvent = null;
      return choice.outcome;
    } catch (error) {
      console.error('Install prompt failed:', error);
      return 'dismissed';
    }
  }

  /**
   * Setup background sync for wedding workflows
   */
  private setupBackgroundSync(): void {
    if (!this.serviceWorker) return;

    // Register background sync tasks for wedding workflows
    navigator.serviceWorker.ready.then((registration) => {
      if ('sync' in registration) {
        // Wedding-specific sync tasks
        const syncTasks = [
          'photo-uploads',
          'guest-assignments',
          'supplier-communications',
          'timeline-updates',
          'task-completions',
        ];

        syncTasks.forEach((task) => {
          (registration as any).sync.register(task);
        });
      }
    });
  }

  /**
   * Setup push notifications for wedding coordination
   */
  private async setupPushNotifications(): Promise<void> {
    if (!this.capabilities?.pushSupported) return;

    try {
      const permission = await Notification.requestPermission();

      if (permission === 'granted') {
        await this.subscribeToPushNotifications();
      }
    } catch (error) {
      console.error('Push notification setup failed:', error);
    }
  }

  /**
   * Subscribe to push notifications
   */
  private async subscribeToPushNotifications(): Promise<void> {
    if (!this.serviceWorker) return;

    try {
      const subscription = await this.serviceWorker.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_KEY || '',
        ),
      });

      // Send subscription to server
      await fetch('/api/push-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription,
          context: this.weddingContext,
        }),
      });
    } catch (error) {
      console.error('Push subscription failed:', error);
    }
  }

  /**
   * Setup PWA performance monitoring
   */
  private setupPWAPerformanceMonitoring(): void {
    // Monitor PWA-specific metrics
    this.monitorAppStartupTime();
    this.monitorOfflineCapability();
    this.monitorInstallationMetrics();
    this.monitorCachePerformance();
  }

  /**
   * Monitor app startup time
   */
  private monitorAppStartupTime(): void {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'navigation') {
          const navigationEntry = entry as PerformanceNavigationTiming;
          const startupTime =
            navigationEntry.loadEventEnd - navigationEntry.fetchStart;

          this.reportPWAMetric('app-startup-time', startupTime, {
            standalone: this.capabilities?.standalone || false,
            cached: navigationEntry.transferSize === 0,
          });
        }
      }
    });

    observer.observe({ entryTypes: ['navigation'] });
  }

  /**
   * Monitor offline capability
   */
  private monitorOfflineCapability(): void {
    let wasOffline = !navigator.onLine;

    const checkOfflineCapability = () => {
      const isOnline = navigator.onLine;

      if (wasOffline && isOnline) {
        // Coming back online - test offline capability
        this.testOfflineCapability();
      }

      wasOffline = !isOnline;
    };

    window.addEventListener('online', checkOfflineCapability);
    window.addEventListener('offline', checkOfflineCapability);
  }

  /**
   * Test offline capability
   */
  private async testOfflineCapability(): Promise<void> {
    try {
      // Test if critical resources are available offline
      const criticalPaths = [
        '/',
        '/wedding/dashboard',
        '/photo-groups',
        '/offline',
      ];

      const offlineTests = criticalPaths.map(async (path) => {
        try {
          const response = await fetch(path, { cache: 'only-if-cached' });
          return { path, available: response.ok };
        } catch {
          return { path, available: false };
        }
      });

      const results = await Promise.all(offlineTests);
      const offlineScore =
        results.filter((r) => r.available).length / results.length;

      this.reportPWAMetric('offline-capability-score', offlineScore, {
        results: results.reduce(
          (acc, r) => ({ ...acc, [r.path]: r.available }),
          {},
        ),
      });
    } catch (error) {
      console.error('Offline capability test failed:', error);
    }
  }

  /**
   * Integrate with network adapter
   */
  private integrateWithNetworkAdapter(): void {
    mobileNetworkAdapter.onAdaptationChange((strategy: AdaptationStrategy) => {
      this.adaptPWAForNetworkConditions(strategy);
    });
  }

  /**
   * Adapt PWA behavior for network conditions
   */
  private adaptPWAForNetworkConditions(strategy: AdaptationStrategy): void {
    // Update cache strategy based on network conditions
    this.updateCacheStrategy(strategy.cachingStrategy);

    // Adjust background sync frequency
    this.adjustBackgroundSyncFrequency(strategy);

    // Update preload strategy
    this.updatePreloadStrategy(strategy);
  }

  /**
   * Update cache strategy
   */
  private updateCacheStrategy(
    cacheStrategy: AdaptationStrategy['cachingStrategy'],
  ): void {
    if (this.serviceWorker) {
      this.serviceWorker.postMessage({
        type: 'UPDATE_CACHE_STRATEGY',
        strategy: cacheStrategy,
      });
    }
  }

  /**
   * Adjust background sync frequency
   */
  private adjustBackgroundSyncFrequency(strategy: AdaptationStrategy): void {
    const frequency =
      strategy.cachingStrategy === 'aggressive' ? 'low' : 'normal';

    if (this.serviceWorker) {
      this.serviceWorker.postMessage({
        type: 'ADJUST_SYNC_FREQUENCY',
        frequency,
      });
    }
  }

  /**
   * Update preload strategy
   */
  private updatePreloadStrategy(strategy: AdaptationStrategy): void {
    if (!strategy.prefetchEnabled) {
      // Disable preloading for poor connections
      if (this.serviceWorker) {
        this.serviceWorker.postMessage({
          type: 'DISABLE_PRELOAD',
        });
      }
    } else {
      // Enable targeted preloading
      this.preloadCriticalWeddingResources();
    }
  }

  /**
   * Preload critical wedding resources
   */
  private async preloadCriticalWeddingResources(): Promise<void> {
    if (!this.weddingContext) return;

    const config =
      EnhancedPWAManager.WEDDING_PWA_CONFIGS[this.weddingContext.supplierRole];
    const resources = config.criticalResources;

    // Preload through service worker for better caching
    if (this.serviceWorker) {
      this.serviceWorker.postMessage({
        type: 'PRELOAD_RESOURCES',
        resources,
        priority: 'high',
      });
    }
  }

  /**
   * Optimize for installed app experience
   */
  private optimizeForInstalledApp(): void {
    // Enable full-screen mode for ceremony phase
    if (this.weddingContext?.eventPhase === 'ceremony') {
      this.requestFullscreen();
    }

    // Optimize UI for standalone mode
    document.documentElement.classList.add('pwa-installed');

    // Enable advanced features available only in installed mode
    this.enableAdvancedPWAFeatures();
  }

  /**
   * Enable advanced PWA features for installed apps
   */
  private enableAdvancedPWAFeatures(): void {
    // Enable persistent storage
    if ('storage' in navigator && 'persist' in navigator.storage) {
      navigator.storage.persist();
    }

    // Enable wake lock during critical wedding phases
    if (
      this.weddingContext?.eventPhase === 'ceremony' ||
      this.weddingContext?.eventPhase === 'reception'
    ) {
      this.requestWakeLock();
    }

    // Enable device orientation features for photographers
    if (this.weddingContext?.supplierRole === 'photographer') {
      this.enableOrientationFeatures();
    }
  }

  /**
   * Request fullscreen mode
   */
  private async requestFullscreen(): Promise<void> {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch (error) {
      console.log('Fullscreen request failed:', error);
    }
  }

  /**
   * Request wake lock
   */
  private async requestWakeLock(): Promise<void> {
    try {
      if ('wakeLock' in navigator) {
        const wakeLock = await (navigator as any).wakeLock.request('screen');
        console.log('Wake lock acquired');

        // Release wake lock when not needed
        setTimeout(
          () => {
            wakeLock.release();
          },
          30 * 60 * 1000,
        ); // 30 minutes
      }
    } catch (error) {
      console.log('Wake lock request failed:', error);
    }
  }

  /**
   * Enable orientation features
   */
  private enableOrientationFeatures(): void {
    if ('orientation' in screen && 'lock' in screen.orientation) {
      // Lock to portrait for photo review, landscape for shooting
      const lockOrientation = (orientation: OrientationLockType) => {
        screen.orientation.lock(orientation).catch(() => {
          console.log('Orientation lock not supported');
        });
      };

      // Add orientation controls to photo interface
      window.addEventListener('orientationchange', () => {
        this.handleOrientationChange();
      });
    }
  }

  /**
   * Handle orientation change
   */
  private handleOrientationChange(): void {
    const orientation = screen.orientation?.angle || 0;

    // Notify components of orientation change
    window.dispatchEvent(
      new CustomEvent('pwa-orientation-change', {
        detail: { angle: orientation },
      }),
    );
  }

  /**
   * Utility methods
   */

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  private getInstallPromptCount(): number {
    return parseInt(localStorage.getItem('pwa-install-prompt-count') || '0');
  }

  /**
   * Event handlers
   */

  private handleCachePerformanceUpdate(data: any): void {
    console.log('Cache performance update:', data);
  }

  private handleNetworkStatusUpdate(data: any): void {
    console.log('Network status update from SW:', data);
  }

  private handleBackgroundSyncComplete(data: any): void {
    console.log('Background sync complete:', data);

    // Notify UI components
    window.dispatchEvent(
      new CustomEvent('background-sync-complete', {
        detail: data,
      }),
    );
  }

  private handleCriticalResourceCached(data: any): void {
    console.log('Critical resource cached:', data);
  }

  /**
   * Analytics and monitoring
   */

  private trackInstallationEvent(): void {
    this.reportPWAMetric('pwa-installed', 1, {
      context: this.weddingContext,
      capabilities: this.capabilities,
    });
  }

  private trackInstallationPromptAccepted(): void {
    this.reportPWAMetric('install-prompt-accepted', 1, {
      promptCount: this.installPrompt?.promptCount,
    });
  }

  private trackInstallationPromptDismissed(): void {
    this.reportPWAMetric('install-prompt-dismissed', 1, {
      promptCount: this.installPrompt?.promptCount,
    });
  }

  private monitorInstallationMetrics(): void {
    // Monitor installation funnel
    const metrics = {
      installable: this.capabilities?.installable || false,
      prompted: this.installPrompt?.hasBeenPrompted || false,
      installed: this.capabilities?.installed || false,
    };

    this.reportPWAMetric('installation-funnel', 1, metrics);
  }

  private monitorCachePerformance(): void {
    // Monitor cache hit rates and performance
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name.includes('/api/')) {
          const isCached = (entry as any).transferSize === 0;

          this.reportPWAMetric('api-cache-performance', 1, {
            endpoint: entry.name,
            cached: isCached,
            duration: entry.duration,
          });
        }
      }
    });

    observer.observe({ entryTypes: ['resource'] });
  }

  private notifyUpdateAvailable(): void {
    window.dispatchEvent(new CustomEvent('pwa-update-available'));
  }

  private reportPWAMetric(metric: string, value: number, details?: any): void {
    if ('sendBeacon' in navigator) {
      navigator.sendBeacon(
        '/api/analytics/pwa',
        JSON.stringify({
          metric,
          value,
          details,
          timestamp: Date.now(),
          context: this.weddingContext,
        }),
      );
    }
  }

  /**
   * Public API
   */

  setWeddingContext(context: WeddingPWAContext): void {
    this.weddingContext = context;

    // Reconfigure PWA for wedding context
    this.preloadCriticalWeddingResources();
    this.evaluateWeddingInstallTriggers();
  }

  getCapabilities(): PWACapabilities | null {
    return this.capabilities;
  }

  getInstallPromptStatus(): PWAInstallPrompt | null {
    return this.installPrompt;
  }

  isUpdateAvailable(): boolean {
    return this.updateAvailable;
  }

  async applyUpdate(): Promise<void> {
    if (this.updateAvailable && this.serviceWorker) {
      this.serviceWorker.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  }

  async manualInstallPrompt(): Promise<'accepted' | 'dismissed'> {
    return this.showInstallPrompt();
  }

  updatePerformanceConfig(config: Partial<PWAPerformanceConfig>): void {
    this.performanceConfig = { ...this.performanceConfig, ...config };
  }

  destroy(): void {
    // Clean up resources
    if (this.serviceWorker) {
      this.serviceWorker.postMessage({ type: 'CLEANUP' });
    }
  }
}

// Export singleton instance
export const enhancedPWAManager = new EnhancedPWAManager();

// React hook for PWA functionality
export function useEnhancedPWA(weddingContext?: WeddingPWAContext) {
  const [capabilities, setCapabilities] =
    React.useState<PWACapabilities | null>(null);
  const [installPrompt, setInstallPrompt] =
    React.useState<PWAInstallPrompt | null>(null);
  const [updateAvailable, setUpdateAvailable] = React.useState(false);
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);

  React.useEffect(() => {
    // Set wedding context if provided
    if (weddingContext) {
      enhancedPWAManager.setWeddingContext(weddingContext);
    }

    // Get initial states
    setCapabilities(enhancedPWAManager.getCapabilities());
    setInstallPrompt(enhancedPWAManager.getInstallPromptStatus());
    setUpdateAvailable(enhancedPWAManager.isUpdateAvailable());

    // Setup event listeners
    const handleUpdateAvailable = () => {
      setUpdateAvailable(true);
    };

    const handleOnlineChange = () => {
      setIsOnline(navigator.onLine);
    };

    const handleOrientationChange = (event: CustomEvent) => {
      // Handle orientation changes for PWA
      console.log('Orientation changed:', event.detail);
    };

    window.addEventListener('pwa-update-available', handleUpdateAvailable);
    window.addEventListener('online', handleOnlineChange);
    window.addEventListener('offline', handleOnlineChange);
    window.addEventListener(
      'pwa-orientation-change',
      handleOrientationChange as EventListener,
    );

    return () => {
      window.removeEventListener('pwa-update-available', handleUpdateAvailable);
      window.removeEventListener('online', handleOnlineChange);
      window.removeEventListener('offline', handleOnlineChange);
      window.removeEventListener(
        'pwa-orientation-change',
        handleOrientationChange as EventListener,
      );
    };
  }, [weddingContext]);

  const promptInstall = React.useCallback(async () => {
    const result = await enhancedPWAManager.manualInstallPrompt();

    // Update install prompt state
    setInstallPrompt(enhancedPWAManager.getInstallPromptStatus());

    return result;
  }, []);

  const applyUpdate = React.useCallback(async () => {
    await enhancedPWAManager.applyUpdate();
  }, []);

  return {
    capabilities,
    installPrompt,
    updateAvailable,
    isOnline,
    isInstalled: capabilities?.installed || false,
    isInstallable: capabilities?.installable || false,
    isStandalone: capabilities?.standalone || false,
    promptInstall,
    applyUpdate,
  };
}
