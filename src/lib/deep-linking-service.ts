// Deep linking service for Universal Links (iOS) and App Links (Android)
export interface DeepLinkRoute {
  pattern: RegExp;
  handler: (params: Record<string, string>) => void;
  fallback?: string;
}

export class DeepLinkingService {
  private routes: DeepLinkRoute[] = [];
  private isInitialized = false;

  initialize(): void {
    if (this.isInitialized) return;

    // Setup default routes
    this.setupDefaultRoutes();

    // Listen for app URL open events (Capacitor)
    this.setupCapacitorListeners();

    // Listen for web-based deep links
    this.setupWebListeners();

    this.isInitialized = true;
    console.log('Deep linking service initialized');
  }

  private setupDefaultRoutes(): void {
    // Client routes
    this.addRoute(
      /^\/client\/([^\/]+)$/,
      (params) => this.navigateToClient(params['1']),
      '/dashboard/clients',
    );

    this.addRoute(
      /^\/client\/([^\/]+)\/timeline$/,
      (params) => this.navigateToClientTimeline(params['1']),
      '/dashboard/clients',
    );

    this.addRoute(
      /^\/client\/([^\/]+)\/forms$/,
      (params) => this.navigateToClientForms(params['1']),
      '/dashboard/forms',
    );

    this.addRoute(
      /^\/client\/([^\/]+)\/communications$/,
      (params) => this.navigateToClientCommunications(params['1']),
      '/dashboard/communications',
    );

    // Timeline routes
    this.addRoute(
      /^\/timeline\/([^\/]+)$/,
      (params) => this.navigateToTimeline(params['1']),
      '/dashboard',
    );

    this.addRoute(
      /^\/timeline\/([^\/]+)\/edit$/,
      (params) => this.navigateToTimelineEdit(params['1']),
      '/dashboard',
    );

    // Form routes
    this.addRoute(
      /^\/forms\/([^\/]+)$/,
      (params) => this.navigateToForm(params['1']),
      '/dashboard/forms',
    );

    this.addRoute(
      /^\/forms\/([^\/]+)\/respond$/,
      (params) => this.navigateToFormResponse(params['1']),
      '/dashboard/forms',
    );

    // Guest management routes
    this.addRoute(
      /^\/guests\/([^\/]+)$/,
      (params) => this.navigateToGuestManagement(params['1']),
      '/dashboard/clients',
    );

    // RSVP routes
    this.addRoute(
      /^\/rsvp\/([^\/]+)$/,
      (params) => this.navigateToRSVP(params['1']),
      '/rsvp',
    );

    // Wedding website routes
    this.addRoute(
      /^\/wedding\/([^\/]+)$/,
      (params) => this.navigateToWeddingWebsite(params['1']),
      '/',
    );

    // Shared content routes
    this.addRoute(
      /^\/share\/timeline\/([^\/]+)$/,
      (params) => this.navigateToSharedTimeline(params['1']),
      '/',
    );

    this.addRoute(
      /^\/share\/photos\/([^\/]+)$/,
      (params) => this.navigateToSharedPhotos(params['1']),
      '/',
    );
  }

  private setupCapacitorListeners(): void {
    // Capacitor app URL listener
    if (typeof window !== 'undefined' && window.Capacitor) {
      window.addEventListener('appurlopen', (event: any) => {
        console.log('Deep link received:', event.url);
        this.handleDeepLink(event.url);
      });
    }
  }

  private setupWebListeners(): void {
    // Handle web-based deep links on page load
    document.addEventListener('DOMContentLoaded', () => {
      this.handleCurrentURL();
    });

    // Handle browser back/forward navigation
    window.addEventListener('popstate', () => {
      this.handleCurrentURL();
    });

    // Handle direct navigation
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () =>
        this.handleCurrentURL(),
      );
    } else {
      this.handleCurrentURL();
    }
  }

  private handleCurrentURL(): void {
    const urlParams = new URLSearchParams(window.location.search);
    const deepLink = urlParams.get('deeplink') || urlParams.get('path');

    if (deepLink) {
      console.log('Web deep link found:', deepLink);
      this.handleDeepLink(deepLink);
    }
  }

  handleDeepLink(url: string): void {
    try {
      let path: string;

      // Parse URL to extract path
      if (url.startsWith('wedsync://')) {
        // Custom scheme: wedsync://client/123/timeline
        path = url.replace('wedsync://', '/');
      } else if (url.startsWith('https://')) {
        // Universal Link: https://wedsync.app/client/123/timeline
        const urlObj = new URL(url);
        path = urlObj.pathname;
      } else if (url.startsWith('/')) {
        // Direct path: /client/123/timeline
        path = url;
      } else {
        console.warn('Unrecognized deep link format:', url);
        return;
      }

      console.log('Processing deep link path:', path);

      // Find matching route
      const matchedRoute = this.findMatchingRoute(path);

      if (matchedRoute) {
        console.log('Deep link route matched, executing handler');
        matchedRoute.handler(matchedRoute.params);
      } else {
        console.warn('No route found for deep link:', path);
        this.handleFallback(path);
      }
    } catch (error) {
      console.error('Deep link handling failed:', error);
      this.navigateToFallback();
    }
  }

  private findMatchingRoute(path: string): {
    handler: (params: Record<string, string>) => void;
    params: Record<string, string>;
  } | null {
    for (const route of this.routes) {
      const match = path.match(route.pattern);
      if (match) {
        // Extract parameters from regex groups
        const params: Record<string, string> = {};
        match.forEach((value, index) => {
          if (index > 0) {
            // Skip full match
            params[index.toString()] = value;
          }
        });

        return {
          handler: route.handler,
          params,
        };
      }
    }
    return null;
  }

  private handleFallback(path: string): void {
    // Try to find a suitable fallback route
    if (path.includes('/client/')) {
      this.navigateTo('/dashboard/clients');
    } else if (path.includes('/timeline/')) {
      this.navigateTo('/dashboard');
    } else if (path.includes('/forms/')) {
      this.navigateTo('/dashboard/forms');
    } else if (path.includes('/rsvp/')) {
      this.navigateTo('/rsvp');
    } else {
      this.navigateToFallback();
    }
  }

  private navigateToFallback(): void {
    this.navigateTo('/dashboard');
  }

  // Route handlers
  private navigateToClient(clientId: string): void {
    console.log('Navigating to client:', clientId);
    this.navigateTo(`/dashboard/clients/${clientId}`);
  }

  private navigateToClientTimeline(clientId: string): void {
    console.log('Navigating to client timeline:', clientId);
    this.navigateTo(`/dashboard/clients/${clientId}#timeline`);
  }

  private navigateToClientForms(clientId: string): void {
    console.log('Navigating to client forms:', clientId);
    this.navigateTo(`/dashboard/clients/${clientId}#forms`);
  }

  private navigateToClientCommunications(clientId: string): void {
    console.log('Navigating to client communications:', clientId);
    this.navigateTo(`/dashboard/communications?client=${clientId}`);
  }

  private navigateToTimeline(timelineId: string): void {
    console.log('Navigating to timeline:', timelineId);
    this.navigateTo(`/dashboard/timeline/${timelineId}`);
  }

  private navigateToTimelineEdit(timelineId: string): void {
    console.log('Navigating to timeline edit:', timelineId);
    this.navigateTo(`/dashboard/timeline/${timelineId}/edit`);
  }

  private navigateToForm(formId: string): void {
    console.log('Navigating to form:', formId);
    this.navigateTo(`/dashboard/forms/${formId}`);
  }

  private navigateToFormResponse(formId: string): void {
    console.log('Navigating to form response:', formId);
    this.navigateTo(`/dashboard/forms/${formId}/respond`);
  }

  private navigateToGuestManagement(clientId: string): void {
    console.log('Navigating to guest management:', clientId);
    this.navigateTo(`/dashboard/clients/${clientId}/guests`);
  }

  private navigateToRSVP(rsvpCode: string): void {
    console.log('Navigating to RSVP:', rsvpCode);
    this.navigateTo(`/rsvp/${rsvpCode}`);
  }

  private navigateToWeddingWebsite(weddingId: string): void {
    console.log('Navigating to wedding website:', weddingId);
    this.navigateTo(`/wedding/${weddingId}`);
  }

  private navigateToSharedTimeline(shareId: string): void {
    console.log('Navigating to shared timeline:', shareId);
    this.navigateTo(`/share/timeline/${shareId}`);
  }

  private navigateToSharedPhotos(shareId: string): void {
    console.log('Navigating to shared photos:', shareId);
    this.navigateTo(`/share/photos/${shareId}`);
  }

  private navigateTo(path: string): void {
    if (typeof window !== 'undefined') {
      // Use Next.js router if available
      if (window.next?.router) {
        window.next.router.push(path);
      } else {
        // Fallback to location change
        window.location.href = path;
      }
    }
  }

  // Public API for adding custom routes
  addRoute(
    pattern: RegExp,
    handler: (params: Record<string, string>) => void,
    fallback?: string,
  ): void {
    this.routes.push({ pattern, handler, fallback });
  }

  // Generate deep links
  generateDeepLink(path: string, useCustomScheme: boolean = false): string {
    if (useCustomScheme) {
      return `wedsync://${path.startsWith('/') ? path.slice(1) : path}`;
    } else {
      // Use Universal Link format
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://wedsync.app';
      return `${baseUrl}${path.startsWith('/') ? path : '/' + path}`;
    }
  }

  // Generate shareable links with fallback
  generateShareableLink(path: string, fallbackUrl?: string): string {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://wedsync.app';
    const params = new URLSearchParams();

    params.set('deeplink', path);
    if (fallbackUrl) {
      params.set('fallback', fallbackUrl);
    }

    return `${baseUrl}/?${params.toString()}`;
  }

  // Handle app installation detection
  handleAppInstallPrompt(path: string): void {
    const isNative = this.isNativeApp();

    if (!isNative) {
      // Show app install prompt for web users
      const shouldPrompt = this.shouldShowAppInstallPrompt();

      if (shouldPrompt) {
        this.showAppInstallPrompt(path);
      }
    }
  }

  private isNativeApp(): boolean {
    return (
      typeof window !== 'undefined' &&
      window.Capacitor &&
      window.Capacitor.isNativePlatform()
    );
  }

  private shouldShowAppInstallPrompt(): boolean {
    // Check if user has dismissed app install prompt recently
    const lastPrompt = localStorage.getItem('last_app_install_prompt');
    if (lastPrompt) {
      const daysSincePrompt =
        (Date.now() - new Date(lastPrompt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSincePrompt < 7) {
        return false; // Don't prompt more than once per week
      }
    }

    // Check if running as PWA
    if (
      window.matchMedia &&
      window.matchMedia('(display-mode: standalone)').matches
    ) {
      return false; // Already installed as PWA
    }

    return true;
  }

  private showAppInstallPrompt(deepLinkPath: string): void {
    const modal = document.createElement('div');
    modal.className =
      'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
    modal.innerHTML = `
      <div class="bg-white rounded-lg p-6 max-w-md">
        <h3 class="text-lg font-semibold mb-4">Get the WedSync App</h3>
        <p class="text-gray-600 mb-6">For the best experience, download our mobile app with native features like camera integration and push notifications.</p>
        <div class="flex space-x-3">
          <a href="https://apps.apple.com/app/wedsync/id1234567890" class="flex-1 bg-black text-white px-4 py-2 rounded text-center">
            Download for iOS
          </a>
          <a href="https://play.google.com/store/apps/details?id=app.wedsync.supplier" class="flex-1 bg-green-600 text-white px-4 py-2 rounded text-center">
            Download for Android
          </a>
          <button id="dismiss-prompt" class="px-4 py-2 text-gray-500 hover:text-gray-700">
            Continue in browser
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Handle dismiss
    modal.querySelector('#dismiss-prompt')?.addEventListener('click', () => {
      document.body.removeChild(modal);
      localStorage.setItem('last_app_install_prompt', new Date().toISOString());
    });

    // Auto dismiss after 30 seconds
    setTimeout(() => {
      if (document.body.contains(modal)) {
        document.body.removeChild(modal);
        localStorage.setItem(
          'last_app_install_prompt',
          new Date().toISOString(),
        );
      }
    }, 30000);
  }

  // Test deep link functionality
  testDeepLink(path: string): void {
    console.log('Testing deep link:', path);
    this.handleDeepLink(path);
  }
}
