/**
 * WS-146: PWA Update Manager
 * Handles service worker updates, version management, and update notifications
 */

import { createClient } from '@supabase/supabase-js';

export interface UpdateInfo {
  currentVersion: string;
  newVersion: string;
  updateSize?: number;
  releaseNotes?: string[];
  criticalUpdate?: boolean;
  updateAvailable: boolean;
}

export interface UpdateOptions {
  autoUpdate?: boolean;
  notifyUser?: boolean;
  forceUpdate?: boolean;
  checkInterval?: number; // in milliseconds
}

export class PWAUpdateManager {
  private currentVersion: string;
  private newVersion: string | null = null;
  private updateAvailable = false;
  private updateInProgress = false;
  private registration: ServiceWorkerRegistration | null = null;
  private updateCheckInterval: number;
  private intervalId: NodeJS.Timeout | null = null;
  private supabase: any;
  private options: UpdateOptions;

  constructor(options: UpdateOptions = {}) {
    this.currentVersion = this.getCurrentVersion();
    this.updateCheckInterval = options.checkInterval || 3600000; // Default: 1 hour
    this.options = {
      autoUpdate: options.autoUpdate ?? false,
      notifyUser: options.notifyUser ?? true,
      forceUpdate: options.forceUpdate ?? false,
      checkInterval: this.updateCheckInterval,
    };

    this.initializeSupabase();
    this.initialize();
  }

  private initializeSupabase() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
    }
  }

  /**
   * Initialize update manager
   */
  private async initialize() {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Worker not supported');
      return;
    }

    try {
      // Get service worker registration
      this.registration = await navigator.serviceWorker.ready;

      // Setup update handlers
      this.setupUpdateHandlers();

      // Start periodic update checks
      this.startUpdateChecks();

      // Check for updates immediately
      await this.checkForUpdates();
    } catch (error) {
      console.error('Failed to initialize PWA Update Manager:', error);
    }
  }

  /**
   * Get current app version
   */
  private getCurrentVersion(): string {
    // Try to get version from meta tag
    const versionMeta = document.querySelector('meta[name="app-version"]');
    if (versionMeta) {
      return versionMeta.getAttribute('content') || '1.0.0';
    }

    // Fallback to package.json version or default
    return process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0';
  }

  /**
   * Setup service worker update handlers
   */
  private setupUpdateHandlers() {
    if (!this.registration) return;

    // Listen for service worker updates
    this.registration.addEventListener('updatefound', () => {
      const newWorker = this.registration!.installing;

      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (
            newWorker.state === 'installed' &&
            navigator.serviceWorker.controller
          ) {
            // New service worker installed, update available
            this.handleUpdateAvailable();
          }
        });
      }
    });

    // Listen for controller change (new SW activated)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      // New service worker has taken control
      if (!this.updateInProgress) {
        this.handleUpdateActivated();
      }
    });

    // Listen for messages from service worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data.type === 'VERSION_INFO') {
        this.newVersion = event.data.version;
        this.handleVersionInfo(event.data);
      }
    });
  }

  /**
   * Start periodic update checks
   */
  private startUpdateChecks() {
    // Clear existing interval if any
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    // Set up periodic checks
    this.intervalId = setInterval(() => {
      this.checkForUpdates();
    }, this.updateCheckInterval);

    // Also check on visibility change
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.checkForUpdates();
      }
    });
  }

  /**
   * Check for updates
   */
  async checkForUpdates(): Promise<UpdateInfo> {
    if (!this.registration) {
      return {
        currentVersion: this.currentVersion,
        newVersion: this.currentVersion,
        updateAvailable: false,
      };
    }

    try {
      // Trigger update check
      await this.registration.update();

      // Check if update is waiting
      if (this.registration.waiting) {
        this.updateAvailable = true;

        // Get version info from waiting worker
        this.registration.waiting.postMessage({ type: 'GET_VERSION' });
      }

      // Track update check
      await this.trackUpdateCheck();

      return {
        currentVersion: this.currentVersion,
        newVersion: this.newVersion || this.currentVersion,
        updateAvailable: this.updateAvailable,
      };
    } catch (error) {
      console.error('Failed to check for updates:', error);
      return {
        currentVersion: this.currentVersion,
        newVersion: this.currentVersion,
        updateAvailable: false,
      };
    }
  }

  /**
   * Handle update available
   */
  private handleUpdateAvailable() {
    this.updateAvailable = true;

    if (this.options.autoUpdate) {
      // Auto-update if configured
      this.applyUpdate();
    } else if (this.options.notifyUser) {
      // Show update notification
      this.showUpdateNotification();
    }

    // Track update availability
    this.trackUpdateAvailable();
  }

  /**
   * Handle version info from service worker
   */
  private handleVersionInfo(info: any) {
    this.newVersion = info.version;

    if (info.criticalUpdate && this.options.forceUpdate) {
      // Force update for critical updates
      this.applyUpdate();
    }
  }

  /**
   * Handle update activated
   */
  private handleUpdateActivated() {
    // Track successful update
    this.trackUpdateCompleted();

    // Show success notification
    if (this.options.notifyUser) {
      this.showUpdateSuccessNotification();
    }
  }

  /**
   * Apply update
   */
  async applyUpdate(): Promise<boolean> {
    if (!this.updateAvailable || !this.registration?.waiting) {
      return false;
    }

    this.updateInProgress = true;
    const startTime = Date.now();

    try {
      // Skip waiting and activate new service worker
      this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });

      // Track update start
      await this.trackUpdateStart();

      // Wait for activation (handled by controllerchange event)
      return new Promise((resolve) => {
        const listener = () => {
          navigator.serviceWorker.removeEventListener(
            'controllerchange',
            listener,
          );

          // Track completion time
          const duration = Date.now() - startTime;
          this.trackUpdateDuration(duration);

          this.updateInProgress = false;
          resolve(true);

          // Reload page after update
          if (this.options.forceUpdate) {
            window.location.reload();
          }
        };

        navigator.serviceWorker.addEventListener('controllerchange', listener);

        // Timeout after 30 seconds
        setTimeout(() => {
          navigator.serviceWorker.removeEventListener(
            'controllerchange',
            listener,
          );
          this.updateInProgress = false;
          resolve(false);
        }, 30000);
      });
    } catch (error) {
      console.error('Failed to apply update:', error);
      this.updateInProgress = false;
      await this.trackUpdateError(error);
      return false;
    }
  }

  /**
   * Show update notification
   */
  private showUpdateNotification() {
    const notification = document.createElement('div');
    notification.id = 'pwa-update-notification';
    notification.className = 'pwa-update-notification';
    notification.innerHTML = `
      <div class="fixed bottom-4 right-4 bg-white shadow-xl rounded-lg p-4 z-50 max-w-sm animate-slide-up">
        <div class="flex items-start space-x-3">
          <div class="flex-shrink-0">
            <svg class="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <div class="flex-1">
            <h4 class="text-sm font-semibold text-gray-900">Update Available</h4>
            <p class="text-sm text-gray-600 mt-1">A new version of WedSync is available with improvements and bug fixes.</p>
            ${this.newVersion ? `<p class="text-xs text-gray-500 mt-1">Version ${this.newVersion}</p>` : ''}
            <div class="mt-3 flex space-x-2">
              <button 
                id="update-now-btn"
                class="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 transition"
              >
                Update Now
              </button>
              <button 
                id="update-later-btn"
                class="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300 transition"
              >
                Later
              </button>
            </div>
          </div>
          <button 
            id="update-close-btn"
            class="flex-shrink-0 text-gray-400 hover:text-gray-600"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(notification);

    // Add event listeners
    document.getElementById('update-now-btn')?.addEventListener('click', () => {
      notification.remove();
      this.applyUpdate();
    });

    document
      .getElementById('update-later-btn')
      ?.addEventListener('click', () => {
        notification.remove();
        this.scheduleUpdateReminder();
      });

    document
      .getElementById('update-close-btn')
      ?.addEventListener('click', () => {
        notification.remove();
      });

    // Auto-hide after 30 seconds
    setTimeout(() => {
      if (document.getElementById('pwa-update-notification')) {
        notification.remove();
      }
    }, 30000);
  }

  /**
   * Show update success notification
   */
  private showUpdateSuccessNotification() {
    const notification = document.createElement('div');
    notification.className = 'pwa-update-success';
    notification.innerHTML = `
      <div class="fixed top-4 right-4 bg-green-50 border border-green-200 rounded-lg p-4 z-50 max-w-sm animate-slide-in">
        <div class="flex items-center space-x-3">
          <svg class="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p class="font-semibold text-green-900">Update Complete!</p>
            <p class="text-sm text-green-700">WedSync has been updated to the latest version.</p>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      notification.remove();
    }, 5000);
  }

  /**
   * Schedule update reminder
   */
  private scheduleUpdateReminder() {
    // Remind user after 24 hours
    setTimeout(() => {
      if (this.updateAvailable) {
        this.showUpdateNotification();
      }
    }, 86400000); // 24 hours
  }

  /**
   * Analytics tracking methods
   */

  private async trackUpdateCheck() {
    if (this.supabase) {
      try {
        await this.supabase.from('pwa_updates').insert({
          version_from: this.currentVersion,
          version_to: this.newVersion || this.currentVersion,
          update_type: 'check',
          update_status: this.updateAvailable ? 'ready' : 'pending',
          session_id: this.getSessionId(),
        });
      } catch (error) {
        console.error('Failed to track update check:', error);
      }
    }
  }

  private async trackUpdateAvailable() {
    if (this.supabase) {
      try {
        await this.supabase.from('pwa_updates').insert({
          version_from: this.currentVersion,
          version_to: this.newVersion || 'unknown',
          update_type: 'automatic',
          update_status: 'ready',
          session_id: this.getSessionId(),
        });
      } catch (error) {
        console.error('Failed to track update available:', error);
      }
    }
  }

  private async trackUpdateStart() {
    if (this.supabase) {
      try {
        await this.supabase.from('pwa_updates').insert({
          version_from: this.currentVersion,
          version_to: this.newVersion || 'unknown',
          update_type: this.options.autoUpdate ? 'automatic' : 'manual',
          update_status: 'downloading',
          session_id: this.getSessionId(),
        });
      } catch (error) {
        console.error('Failed to track update start:', error);
      }
    }
  }

  private async trackUpdateCompleted() {
    if (this.supabase) {
      try {
        await this.supabase.from('pwa_updates').insert({
          version_from: this.currentVersion,
          version_to: this.newVersion || 'unknown',
          update_type: this.options.autoUpdate ? 'automatic' : 'manual',
          update_status: 'installed',
          session_id: this.getSessionId(),
          completed_at: new Date().toISOString(),
        });
      } catch (error) {
        console.error('Failed to track update completed:', error);
      }
    }
  }

  private async trackUpdateDuration(duration: number) {
    if (this.supabase) {
      try {
        await this.supabase.from('pwa_updates').insert({
          version_from: this.currentVersion,
          version_to: this.newVersion || 'unknown',
          update_type: this.options.autoUpdate ? 'automatic' : 'manual',
          update_status: 'installed',
          installation_duration_ms: duration,
          session_id: this.getSessionId(),
        });
      } catch (error) {
        console.error('Failed to track update duration:', error);
      }
    }
  }

  private async trackUpdateError(error: any) {
    if (this.supabase) {
      try {
        await this.supabase.from('pwa_updates').insert({
          version_from: this.currentVersion,
          version_to: this.newVersion || 'unknown',
          update_type: this.options.autoUpdate ? 'automatic' : 'manual',
          update_status: 'failed',
          error_message: error.message || 'Unknown error',
          session_id: this.getSessionId(),
        });
      } catch (trackError) {
        console.error('Failed to track update error:', trackError);
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

  public getUpdateInfo(): UpdateInfo {
    return {
      currentVersion: this.currentVersion,
      newVersion: this.newVersion || this.currentVersion,
      updateAvailable: this.updateAvailable,
    };
  }

  public isUpdateAvailable(): boolean {
    return this.updateAvailable;
  }

  public async forceUpdateCheck(): Promise<UpdateInfo> {
    return this.checkForUpdates();
  }

  public async installUpdate(): Promise<boolean> {
    return this.applyUpdate();
  }

  public setUpdateCheckInterval(interval: number) {
    this.updateCheckInterval = interval;
    this.startUpdateChecks();
  }

  public destroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

// Export singleton instance
export const updateManager =
  typeof window !== 'undefined' ? new PWAUpdateManager() : null;
