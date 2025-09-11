/**
 * WS-146: PWA Installation Manager
 * Smart install prompts with user engagement detection
 */

import { createClient } from '@supabase/supabase-js';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface UserEngagementMetrics {
  sessionDuration: number;
  pageViews: number;
  interactions: number;
  returningVisitor: boolean;
  lastVisit?: Date;
}

export class InstallationManager {
  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  private isStandalone = false;
  private engagementMetrics: UserEngagementMetrics;
  private installPromptShown = false;
  private sessionStartTime: number;
  private supabase: any;

  constructor() {
    this.sessionStartTime = Date.now();
    this.engagementMetrics = {
      sessionDuration: 0,
      pageViews: 0,
      interactions: 0,
      returningVisitor: this.checkReturningVisitor(),
      lastVisit: this.getLastVisit(),
    };

    this.detectStandalone();
    this.setupInstallPrompt();
    this.setupUpdateManager();
    this.trackPageView();
    this.setupInteractionTracking();
    this.initializeSupabase();
  }

  private initializeSupabase() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
    }
  }

  /**
   * Detect if app is running in standalone mode
   */
  private detectStandalone() {
    this.isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      'standalone' in (window.navigator as any) ||
      document.referrer.includes('android-app://');

    // Store standalone status
    if (this.isStandalone) {
      localStorage.setItem('pwa_installed', 'true');
      localStorage.setItem('install_date', new Date().toISOString());
    }
  }

  /**
   * Setup install prompt handler
   */
  private setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      this.deferredPrompt = e as BeforeInstallPromptEvent;

      // Check if we should show prompt automatically
      if (this.shouldShowInstallPrompt()) {
        setTimeout(() => this.showInstallPrompt(), 5000);
      }
    });

    // iOS Safari detection
    if (this.isIOSSafari() && !this.isStandalone) {
      this.setupIOSInstallPrompt();
    }
  }

  /**
   * Setup update manager for PWA updates
   */
  private setupUpdateManager() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        this.showUpdateNotification();
      });
    }
  }

  /**
   * Check if user is returning visitor
   */
  private checkReturningVisitor(): boolean {
    const lastVisit = localStorage.getItem('last_visit');
    return lastVisit !== null;
  }

  /**
   * Get last visit date
   */
  private getLastVisit(): Date | undefined {
    const lastVisit = localStorage.getItem('last_visit');
    return lastVisit ? new Date(lastVisit) : undefined;
  }

  /**
   * Track page views for engagement
   */
  private trackPageView() {
    this.engagementMetrics.pageViews++;

    // Update session duration
    this.engagementMetrics.sessionDuration = Date.now() - this.sessionStartTime;

    // Store last visit
    localStorage.setItem('last_visit', new Date().toISOString());
  }

  /**
   * Setup interaction tracking
   */
  private setupInteractionTracking() {
    const events = ['click', 'scroll', 'keypress', 'touchstart'];

    events.forEach((event) => {
      document.addEventListener(
        event,
        () => {
          this.engagementMetrics.interactions++;
        },
        { once: false, passive: true },
      );
    });
  }

  /**
   * Check if user has sufficient engagement
   */
  private hasUserEngagement(): boolean {
    // Engagement criteria
    const criteria = {
      minSessionDuration: 30000, // 30 seconds
      minPageViews: 2,
      minInteractions: 5,
      isReturningVisitor: this.engagementMetrics.returningVisitor,
    };

    return (
      this.engagementMetrics.sessionDuration >= criteria.minSessionDuration ||
      this.engagementMetrics.pageViews >= criteria.minPageViews ||
      this.engagementMetrics.interactions >= criteria.minInteractions ||
      criteria.isReturningVisitor
    );
  }

  /**
   * Calculate engagement score (1-10)
   */
  private calculateEngagementScore(): number {
    let score = 0;

    // Session duration (max 3 points)
    const sessionMinutes = this.engagementMetrics.sessionDuration / 60000;
    score += Math.min(3, Math.floor(sessionMinutes / 2));

    // Page views (max 3 points)
    score += Math.min(3, Math.floor(this.engagementMetrics.pageViews / 2));

    // Interactions (max 2 points)
    score += Math.min(2, Math.floor(this.engagementMetrics.interactions / 10));

    // Returning visitor (2 points)
    if (this.engagementMetrics.returningVisitor) {
      score += 2;
    }

    return Math.min(10, score);
  }

  /**
   * Determine if install prompt should be shown
   */
  private shouldShowInstallPrompt(): boolean {
    // Don't show if already installed or prompt already shown
    if (this.isStandalone || this.installPromptShown) {
      return false;
    }

    // Don't show if dismissed recently
    const lastDismissed = localStorage.getItem('install_prompt_dismissed');
    if (lastDismissed) {
      const daysSinceDismissed =
        (Date.now() - new Date(lastDismissed).getTime()) /
        (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 7) {
        return false;
      }
    }

    return this.hasUserEngagement();
  }

  /**
   * Wait for user engagement
   */
  private async waitForEngagement(): Promise<void> {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (this.hasUserEngagement()) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 5000);

      // Timeout after 5 minutes
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve();
      }, 300000);
    });
  }

  /**
   * Show install prompt
   */
  async showInstallPrompt(): Promise<boolean> {
    if (!this.deferredPrompt || this.isStandalone) {
      return false;
    }

    // Wait for user engagement if needed
    if (!this.hasUserEngagement()) {
      await this.waitForEngagement();
    }

    try {
      // Track prompt shown
      await this.trackInstallPrompt('shown');

      this.deferredPrompt.prompt();
      this.installPromptShown = true;

      const choiceResult = await this.deferredPrompt.userChoice;

      if (choiceResult.outcome === 'accepted') {
        await this.trackInstallation('pwa_prompt');
        return true;
      } else {
        localStorage.setItem(
          'install_prompt_dismissed',
          new Date().toISOString(),
        );
        await this.trackInstallPrompt('dismissed');
      }

      this.deferredPrompt = null;
      return false;
    } catch (error) {
      console.error('Install prompt failed:', error);
      await this.trackInstallPrompt('error');
      return false;
    }
  }

  /**
   * Check if device is iOS Safari
   */
  private isIOSSafari(): boolean {
    const ua = window.navigator.userAgent;
    const iOS = !!ua.match(/iPad/i) || !!ua.match(/iPhone/i);
    const webkit = !!ua.match(/WebKit/i);
    const iOSSafari =
      iOS && webkit && !ua.match(/CriOS/i) && !ua.match(/FxiOS/i);
    return iOSSafari;
  }

  /**
   * Setup iOS install prompt
   */
  private setupIOSInstallPrompt() {
    // Check if prompt should be shown
    if (!this.shouldShowInstallPrompt()) {
      return;
    }

    // Create iOS install instructions UI
    setTimeout(() => {
      this.showIOSInstallInstructions();
    }, 10000);
  }

  /**
   * Show iOS install instructions
   */
  private showIOSInstallInstructions() {
    const modal = document.createElement('div');
    modal.className = 'ios-install-modal';
    modal.innerHTML = `
      <div class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end">
        <div class="bg-white w-full rounded-t-2xl p-6 animate-slide-up">
          <div class="flex justify-between items-start mb-4">
            <h3 class="text-lg font-semibold">Install WedSync</h3>
            <button class="text-gray-400 hover:text-gray-600" onclick="this.closest('.ios-install-modal').remove()">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p class="text-gray-600 mb-4">Install WedSync on your iPhone for the best experience with offline access and push notifications.</p>
          <div class="space-y-3">
            <div class="flex items-center space-x-3">
              <div class="bg-blue-100 p-2 rounded">
                <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </div>
              <p class="text-sm">Tap the Share button in Safari</p>
            </div>
            <div class="flex items-center space-x-3">
              <div class="bg-blue-100 p-2 rounded">
                <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <p class="text-sm">Scroll down and tap "Add to Home Screen"</p>
            </div>
            <div class="flex items-center space-x-3">
              <div class="bg-blue-100 p-2 rounded">
                <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p class="text-sm">Tap "Add" to install</p>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.trackInstallPrompt('ios_shown');
  }

  /**
   * Show update notification
   */
  private showUpdateNotification() {
    const notification = document.createElement('div');
    notification.className = 'update-notification';
    notification.innerHTML = `
      <div class="fixed top-4 right-4 bg-white shadow-lg rounded-lg p-4 z-50 animate-slide-in">
        <div class="flex items-center space-x-3">
          <svg class="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <div>
            <p class="font-semibold">App updated!</p>
            <p class="text-sm text-gray-600">Refresh for new features.</p>
          </div>
          <button 
            class="ml-4 bg-indigo-600 text-white px-3 py-1 rounded text-sm hover:bg-indigo-700"
            onclick="window.location.reload()"
          >
            Refresh
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(notification);

    // Auto-remove after 10 seconds
    setTimeout(() => {
      notification.remove();
    }, 10000);
  }

  /**
   * Track installation to analytics
   */
  private async trackInstallation(source: string) {
    const installData = {
      install_source: source,
      device_type: this.getDeviceType(),
      browser_info: this.getBrowserInfo(),
      referrer: document.referrer,
      install_completed: true,
      install_timestamp: new Date().toISOString(),
      user_engagement_score: this.calculateEngagementScore(),
    };

    // Store locally
    localStorage.setItem('pwa_install_data', JSON.stringify(installData));

    // Send to Supabase if available
    if (this.supabase) {
      try {
        await this.supabase.from('app_store_metrics').insert(installData);
      } catch (error) {
        console.error('Failed to track installation:', error);
      }
    }

    // Send to analytics
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'pwa_install', {
        event_category: 'PWA',
        event_label: source,
        value: this.calculateEngagementScore(),
      });
    }
  }

  /**
   * Track install prompt events
   */
  private async trackInstallPrompt(action: string) {
    const promptData = {
      session_id: this.getSessionId(),
      prompt_type: this.getPromptType(),
      page_url: window.location.href,
      user_engagement_score: this.calculateEngagementScore(),
      prompt_shown_at: new Date().toISOString(),
      user_response: action,
    };

    // Send to Supabase if available
    if (this.supabase) {
      try {
        await this.supabase.from('install_prompts').insert(promptData);
      } catch (error) {
        console.error('Failed to track install prompt:', error);
      }
    }
  }

  /**
   * Get device type
   */
  private getDeviceType(): string {
    const ua = navigator.userAgent;
    if (/tablet|ipad|playbook|silk/i.test(ua)) {
      return 'tablet';
    }
    if (
      /mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(
        ua,
      )
    ) {
      return 'mobile';
    }
    return 'desktop';
  }

  /**
   * Get browser info
   */
  private getBrowserInfo() {
    const ua = navigator.userAgent;
    let browser = 'Unknown';

    if (ua.indexOf('Chrome') > -1) browser = 'Chrome';
    else if (ua.indexOf('Safari') > -1) browser = 'Safari';
    else if (ua.indexOf('Firefox') > -1) browser = 'Firefox';
    else if (ua.indexOf('Edge') > -1) browser = 'Edge';

    return {
      browser,
      userAgent: ua,
      platform: navigator.platform,
      language: navigator.language,
    };
  }

  /**
   * Get session ID
   */
  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('session_id', sessionId);
    }
    return sessionId;
  }

  /**
   * Get prompt type based on context
   */
  private getPromptType(): string {
    if (this.isIOSSafari()) return 'ios_instructions';
    if (this.engagementMetrics.returningVisitor) return 'returning_visitor';
    if (this.engagementMetrics.pageViews > 5) return 'high_engagement';
    return 'contextual';
  }

  /**
   * Public API
   */

  public isAppInstalled(): boolean {
    return this.isStandalone;
  }

  public canShowInstallPrompt(): boolean {
    return !this.isStandalone && this.deferredPrompt !== null;
  }

  public getEngagementScore(): number {
    return this.calculateEngagementScore();
  }

  public async triggerInstallPrompt(): Promise<boolean> {
    return this.showInstallPrompt();
  }
}

// Export singleton instance
export const installationManager =
  typeof window !== 'undefined' ? new InstallationManager() : null;
