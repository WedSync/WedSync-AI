/**
 * PWA Installation and Manifest Tests
 * Tests PWA installation prompts, manifest validation, and app-like features
 */

// Mock window and navigator objects for PWA testing
global.window = {
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  location: {
    href: 'https://analytics.wedsync.com/',
    origin: 'https://analytics.wedsync.com',
    protocol: 'https:',
  },
  navigator: {
    standalone: false, // Not in standalone mode initially
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)',
    platform: 'iPhone',
  },
  screen: {
    width: 375,
    height: 812,
  },
  matchMedia: jest.fn(),
  localStorage: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
  fetch: jest.fn(),
};

// Mock navigator for PWA features
global.navigator = {
  ...global.window.navigator,
  serviceWorker: {
    register: jest.fn(),
    ready: Promise.resolve({
      showNotification: jest.fn(),
      update: jest.fn(),
    }),
    controller: null,
  },
  share: jest.fn(),
  clipboard: {
    writeText: jest.fn(),
  },
  getBattery: jest.fn(),
  connection: {
    effectiveType: '4g',
    downlink: 10,
    rtt: 100,
  },
};

// Mock PWA install event
let mockBeforeInstallPromptEvent = null;
const createMockInstallPrompt = () => ({
  preventDefault: jest.fn(),
  prompt: jest.fn().mockResolvedValue({ outcome: 'accepted', platform: 'web' }),
  userChoice: Promise.resolve({ outcome: 'accepted', platform: 'web' }),
  platforms: ['web'],
});

describe('PWA Installation and Manifest', () => {
  let pwaManager;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock PWA Manager (would be imported from actual implementation)
    pwaManager = {
      isInstallable: false,
      isInstalled: false,
      installPrompt: null,
      
      // Methods
      init: jest.fn(),
      checkInstallability: jest.fn(),
      showInstallPrompt: jest.fn(),
      handleInstallPrompt: jest.fn(),
      trackInstallation: jest.fn(),
      updateManifest: jest.fn(),
    };

    mockBeforeInstallPromptEvent = createMockInstallPrompt();
  });

  describe('Manifest Validation', () => {
    it('validates manifest.json structure and content', async () => {
      const mockManifest = {
        name: 'WedSync Analytics',
        short_name: 'Analytics',
        description: 'Mobile analytics dashboard for wedding vendors',
        start_url: '/analytics-dashboard',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#6366f1',
        orientation: 'portrait',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable any',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable any',
          },
        ],
        categories: ['business', 'productivity'],
        screenshots: [
          {
            src: '/screenshots/mobile-dashboard.png',
            sizes: '375x812',
            type: 'image/png',
            platform: 'narrow',
            label: 'Mobile Analytics Dashboard',
          },
        ],
        shortcuts: [
          {
            name: 'View Vendors',
            short_name: 'Vendors',
            description: 'Quick access to vendor analytics',
            url: '/analytics/vendors',
            icons: [{ src: '/icons/vendors-shortcut.png', sizes: '96x96' }],
          },
        ],
        file_handlers: [
          {
            action: '/analytics/import',
            accept: {
              'text/csv': ['.csv'],
              'application/json': ['.json'],
            },
          },
        ],
      };

      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockManifest),
      });

      // Mock manifest validation
      const validateManifest = async () => {
        const response = await fetch('/manifest-analytics.json');
        const manifest = await response.json();

        const validation = {
          isValid: true,
          errors: [],
          warnings: [],
        };

        // Required fields validation
        const requiredFields = ['name', 'icons', 'start_url'];
        for (const field of requiredFields) {
          if (!manifest[field]) {
            validation.isValid = false;
            validation.errors.push(`Missing required field: ${field}`);
          }
        }

        // Icons validation
        if (manifest.icons && manifest.icons.length > 0) {
          const hasLargeIcon = manifest.icons.some(icon => 
            icon.sizes.includes('512x512') || icon.sizes.includes('192x192')
          );
          if (!hasLargeIcon) {
            validation.warnings.push('No large icon (192x192 or 512x512) found');
          }
        }

        // Start URL validation
        if (manifest.start_url && !manifest.start_url.startsWith('/')) {
          validation.warnings.push('start_url should be relative to manifest');
        }

        return { manifest, validation };
      };

      const result = await validateManifest();

      expect(result.validation.isValid).toBe(true);
      expect(result.validation.errors).toHaveLength(0);
      expect(result.manifest.name).toBe('WedSync Analytics');
      expect(result.manifest.icons).toHaveLength(2);
    });

    it('detects missing or invalid manifest fields', async () => {
      const invalidManifest = {
        // Missing required fields
        short_name: 'Analytics',
        background_color: 'invalid-color',
        icons: [], // Empty icons array
      };

      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(invalidManifest),
      });

      // Mock validation with errors
      const validateWithErrors = async () => {
        const response = await fetch('/manifest-analytics.json');
        const manifest = await response.json();

        const validation = {
          isValid: false,
          errors: [],
          warnings: [],
        };

        if (!manifest.name) {
          validation.errors.push('Missing required field: name');
        }

        if (!manifest.icons || manifest.icons.length === 0) {
          validation.errors.push('At least one icon is required');
        }

        if (manifest.background_color && !manifest.background_color.match(/^#[0-9a-f]{6}$/i)) {
          validation.errors.push('Invalid background_color format');
        }

        return { manifest, validation };
      };

      const result = await validateWithErrors();

      expect(result.validation.isValid).toBe(false);
      expect(result.validation.errors).toContain('Missing required field: name');
      expect(result.validation.errors).toContain('At least one icon is required');
    });

    it('validates icon formats and sizes', async () => {
      const manifestWithIcons = {
        name: 'WedSync Analytics',
        icons: [
          {
            src: '/icons/icon-48.png',
            sizes: '48x48',
            type: 'image/png',
          },
          {
            src: '/icons/icon-invalid.webp',
            sizes: '192x192',
            type: 'image/webp', // Unsupported format
          },
          {
            src: '/icons/icon-512.png',
            sizes: 'invalid-size', // Invalid size format
            type: 'image/png',
          },
        ],
      };

      // Mock icon validation
      const validateIcons = (icons) => {
        const validation = {
          isValid: true,
          errors: [],
          warnings: [],
        };

        const supportedFormats = ['image/png', 'image/jpeg', 'image/svg+xml'];
        const validSizePattern = /^\d+x\d+$/;

        icons.forEach((icon, index) => {
          if (!supportedFormats.includes(icon.type)) {
            validation.warnings.push(`Icon ${index}: Unsupported format ${icon.type}`);
          }

          if (!validSizePattern.test(icon.sizes)) {
            validation.errors.push(`Icon ${index}: Invalid size format ${icon.sizes}`);
            validation.isValid = false;
          }
        });

        return validation;
      };

      const result = validateIcons(manifestWithIcons.icons);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Icon 2: Invalid size format invalid-size');
      expect(result.warnings).toContain('Icon 1: Unsupported format image/webp');
    });
  });

  describe('Installation Detection and Prompts', () => {
    it('detects when PWA can be installed', () => {
      // Mock beforeinstallprompt event
      window.addEventListener.mockImplementation((event, handler) => {
        if (event === 'beforeinstallprompt') {
          setTimeout(() => handler(mockBeforeInstallPromptEvent), 0);
        }
      });

      // Mock installation detection
      const detectInstallability = () => {
        let isInstallable = false;
        let installPrompt = null;

        window.addEventListener('beforeinstallprompt', (event) => {
          event.preventDefault();
          isInstallable = true;
          installPrompt = event;
        });

        return { isInstallable, installPrompt };
      };

      const result = detectInstallability();

      expect(window.addEventListener).toHaveBeenCalledWith(
        'beforeinstallprompt',
        expect.any(Function)
      );

      // Simulate the event
      const handler = window.addEventListener.mock.calls[0][1];
      handler(mockBeforeInstallPromptEvent);

      expect(mockBeforeInstallPromptEvent.preventDefault).toHaveBeenCalled();
    });

    it('shows custom install prompt UI', async () => {
      const mockPromptUI = {
        show: jest.fn(),
        hide: jest.fn(),
        updateContent: jest.fn(),
      };

      // Mock custom install prompt
      const showInstallPrompt = async (installEvent) => {
        mockPromptUI.updateContent({
          title: 'Install WedSync Analytics',
          description: 'Get quick access to your vendor analytics dashboard',
          benefits: [
            'Fast access from your home screen',
            'Works offline',
            'Push notifications for alerts',
            'Full-screen experience',
          ],
        });

        mockPromptUI.show();

        // Wait for user interaction
        const userChoice = await new Promise((resolve) => {
          // Mock user clicking install
          setTimeout(() => resolve('install'), 100);
        });

        if (userChoice === 'install') {
          mockPromptUI.hide();
          const result = await installEvent.prompt();
          return result;
        }

        mockPromptUI.hide();
        return { outcome: 'dismissed' };
      };

      const result = await showInstallPrompt(mockBeforeInstallPromptEvent);

      expect(mockPromptUI.show).toHaveBeenCalled();
      expect(mockPromptUI.updateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Install WedSync Analytics',
          benefits: expect.arrayContaining(['Works offline']),
        })
      );
      expect(mockBeforeInstallPromptEvent.prompt).toHaveBeenCalled();
    });

    it('tracks installation analytics', async () => {
      const analytics = {
        events: [],
        track: jest.fn((event, data) => {
          analytics.events.push({ event, data, timestamp: Date.now() });
        }),
      };

      // Mock installation tracking
      const trackInstallation = async () => {
        analytics.track('pwa_install_prompt_shown', {
          platform: 'web',
          userAgent: navigator.userAgent,
          timestamp: Date.now(),
        });

        const result = await mockBeforeInstallPromptEvent.prompt();
        
        analytics.track('pwa_install_result', {
          outcome: result.outcome,
          platform: result.platform,
          timestamp: Date.now(),
        });

        if (result.outcome === 'accepted') {
          analytics.track('pwa_installed', {
            platform: result.platform,
            installSource: 'prompt',
            timestamp: Date.now(),
          });
        }

        return result;
      };

      await trackInstallation();

      expect(analytics.events).toHaveLength(3);
      expect(analytics.events[0].event).toBe('pwa_install_prompt_shown');
      expect(analytics.events[2].event).toBe('pwa_installed');
    });

    it('handles installation on different platforms', () => {
      const platformHandlers = {
        detectPlatform: () => {
          const userAgent = navigator.userAgent;
          
          if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
            return 'ios';
          }
          
          if (userAgent.includes('Android')) {
            return 'android';
          }
          
          if (userAgent.includes('Windows')) {
            return 'windows';
          }
          
          return 'unknown';
        },

        getInstallInstructions: (platform) => {
          const instructions = {
            ios: {
              title: 'Install on iOS',
              steps: [
                'Tap the Share button in Safari',
                'Scroll down and tap "Add to Home Screen"',
                'Tap "Add" to install the app',
              ],
              icon: '📱',
            },
            android: {
              title: 'Install on Android',
              steps: [
                'Tap the menu button (⋮) in Chrome',
                'Select "Add to Home Screen"',
                'Tap "Add" to install the app',
              ],
              icon: '🤖',
            },
            windows: {
              title: 'Install on Windows',
              steps: [
                'Click the install button in the address bar',
                'Click "Install" in the dialog',
                'The app will be added to your Start menu',
              ],
              icon: '🖥️',
            },
          };

          return instructions[platform] || {
            title: 'Install App',
            steps: ['Use your browser\'s install option'],
            icon: '💻',
          };
        },
      };

      const platform = platformHandlers.detectPlatform();
      const instructions = platformHandlers.getInstallInstructions(platform);

      expect(platform).toBe('ios'); // Based on mocked userAgent
      expect(instructions.title).toBe('Install on iOS');
      expect(instructions.steps).toContain('Add to Home Screen');
    });

    it('handles installation cancellation gracefully', async () => {
      // Mock user canceling installation
      mockBeforeInstallPromptEvent.prompt.mockResolvedValue({
        outcome: 'dismissed',
        platform: '',
      });

      const handleInstallCancellation = async () => {
        const result = await mockBeforeInstallPromptEvent.prompt();
        
        if (result.outcome === 'dismissed') {
          // Track cancellation
          const cancelReason = {
            reason: 'user_dismissed',
            timestamp: Date.now(),
            platform: navigator.userAgent,
          };

          // Show alternative engagement options
          const alternatives = [
            'Add bookmark for quick access',
            'Enable browser notifications',
            'Share with colleagues',
          ];

          return {
            cancelled: true,
            reason: cancelReason,
            alternatives,
          };
        }

        return { cancelled: false };
      };

      const result = await handleInstallCancellation();

      expect(result.cancelled).toBe(true);
      expect(result.alternatives).toContain('Add bookmark for quick access');
    });
  });

  describe('Standalone Mode Detection', () => {
    it('detects when app is running in standalone mode', () => {
      // Mock standalone detection
      const isStandalone = () => {
        return (
          window.navigator.standalone === true || // iOS Safari
          window.matchMedia('(display-mode: standalone)').matches || // Standard
          window.matchMedia('(display-mode: minimal-ui)').matches ||
          window.matchMedia('(display-mode: fullscreen)').matches
        );
      };

      // Mock matchMedia responses
      window.matchMedia.mockImplementation((query) => ({
        matches: query.includes('standalone'),
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));

      const standalone = isStandalone();

      expect(standalone).toBe(true);
      expect(window.matchMedia).toHaveBeenCalledWith('(display-mode: standalone)');
    });

    it('adapts UI for standalone mode', () => {
      // Mock UI adaptations for standalone mode
      const adaptUIForStandalone = () => {
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
        
        const adaptations = {
          showStatusBar: isStandalone,
          hideBackButton: isStandalone,
          enableSwipeNavigation: isStandalone,
          showAppHeader: isStandalone,
          adaptSafeAreas: true,
        };

        if (isStandalone) {
          // Add PWA-specific CSS classes
          document.body?.classList.add('pwa-standalone');
          
          // Handle safe areas for different devices
          document.documentElement?.style.setProperty(
            '--safe-area-inset-top',
            'env(safe-area-inset-top, 0px)'
          );
        }

        return adaptations;
      };

      // Mock document
      global.document = {
        body: {
          classList: {
            add: jest.fn(),
            remove: jest.fn(),
          },
        },
        documentElement: {
          style: {
            setProperty: jest.fn(),
          },
        },
      };

      window.matchMedia.mockReturnValue({ matches: true });

      const adaptations = adaptUIForStandalone();

      expect(adaptations.showStatusBar).toBe(true);
      expect(adaptations.hideBackButton).toBe(true);
      expect(document.body.classList.add).toHaveBeenCalledWith('pwa-standalone');
    });

    it('handles navigation in standalone mode', () => {
      const navigationHandler = {
        isStandalone: true,
        
        handleNavigation: (url) => {
          if (navigationHandler.isStandalone) {
            // Handle in-app navigation
            if (url.startsWith('/')) {
              // Internal navigation - use app router
              return { type: 'internal', url };
            } else {
              // External link - open in system browser
              return { type: 'external', url };
            }
          }
          
          // Normal browser navigation
          return { type: 'browser', url };
        },

        openExternal: (url) => {
          if (navigationHandler.isStandalone) {
            // In standalone mode, open external links in system browser
            window.open(url, '_system');
          } else {
            window.open(url, '_blank');
          }
        },
      };

      const internalNav = navigationHandler.handleNavigation('/analytics/vendors');
      const externalNav = navigationHandler.handleNavigation('https://wedsync.com');

      expect(internalNav.type).toBe('internal');
      expect(externalNav.type).toBe('external');
    });
  });

  describe('PWA Features Integration', () => {
    it('integrates with Web Share API', async () => {
      navigator.share.mockResolvedValue(undefined);

      const shareAnalytics = async (data) => {
        if (navigator.share) {
          const shareData = {
            title: 'Vendor Performance Report',
            text: `Check out this performance analysis: ${data.vendorName} scored ${data.performanceScore}/100`,
            url: `${window.location.origin}/analytics/vendors/${data.vendorId}`,
          };

          await navigator.share(shareData);
          return { success: true, method: 'native' };
        }

        // Fallback to clipboard
        const shareText = `${shareData.title}\n${shareData.text}\n${shareData.url}`;
        await navigator.clipboard.writeText(shareText);
        return { success: true, method: 'clipboard' };
      };

      const result = await shareAnalytics({
        vendorId: 'vendor-123',
        vendorName: 'Elite Photography',
        performanceScore: 95,
      });

      expect(navigator.share).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Vendor Performance Report',
          text: expect.stringContaining('Elite Photography scored 95/100'),
        })
      );
      expect(result.success).toBe(true);
      expect(result.method).toBe('native');
    });

    it('handles file uploads and associations', async () => {
      // Mock file handler
      const handleFileImport = async (files) => {
        const supportedTypes = ['text/csv', 'application/json'];
        const results = [];

        for (const file of files) {
          if (supportedTypes.includes(file.type)) {
            const content = await file.text();
            
            results.push({
              file: file.name,
              type: file.type,
              size: file.size,
              processed: true,
              preview: content.substring(0, 100),
            });
          } else {
            results.push({
              file: file.name,
              type: file.type,
              processed: false,
              error: 'Unsupported file type',
            });
          }
        }

        return results;
      };

      // Mock file objects
      const csvFile = new File(
        ['vendor,score\nElite Photography,95\nBloom Florists,87'],
        'vendors.csv',
        { type: 'text/csv' }
      );

      const results = await handleFileImport([csvFile]);

      expect(results).toHaveLength(1);
      expect(results[0].processed).toBe(true);
      expect(results[0].type).toBe('text/csv');
    });

    it('manages shortcuts and quick actions', () => {
      const shortcutManager = {
        shortcuts: [
          {
            id: 'view-vendors',
            name: 'View Vendors',
            url: '/analytics/vendors',
            icon: '/icons/vendors-shortcut.png',
          },
          {
            id: 'performance-report',
            name: 'Performance Report',
            url: '/analytics/reports/performance',
            icon: '/icons/reports-shortcut.png',
          },
        ],

        handleShortcut: (shortcutId) => {
          const shortcut = shortcutManager.shortcuts.find(s => s.id === shortcutId);
          
          if (shortcut) {
            return {
              action: 'navigate',
              url: shortcut.url,
              title: shortcut.name,
            };
          }

          return { action: 'none' };
        },

        getAvailableShortcuts: () => {
          return shortcutManager.shortcuts.map(shortcut => ({
            id: shortcut.id,
            name: shortcut.name,
            available: true,
          }));
        },
      };

      const action = shortcutManager.handleShortcut('view-vendors');
      const available = shortcutManager.getAvailableShortcuts();

      expect(action.action).toBe('navigate');
      expect(action.url).toBe('/analytics/vendors');
      expect(available).toHaveLength(2);
    });

    it('implements app badging for notifications', async () => {
      // Mock navigator.setAppBadge (if available)
      navigator.setAppBadge = jest.fn().mockResolvedValue(undefined);
      navigator.clearAppBadge = jest.fn().mockResolvedValue(undefined);

      const badgeManager = {
        setBadge: async (count) => {
          if (navigator.setAppBadge) {
            await navigator.setAppBadge(count);
            return { success: true, count };
          }
          return { success: false, reason: 'Not supported' };
        },

        clearBadge: async () => {
          if (navigator.clearAppBadge) {
            await navigator.clearAppBadge();
            return { success: true };
          }
          return { success: false, reason: 'Not supported' };
        },

        updateBadgeForAlerts: async (alerts) => {
          const unreadCount = alerts.filter(alert => !alert.read).length;
          
          if (unreadCount > 0) {
            return badgeManager.setBadge(unreadCount);
          } else {
            return badgeManager.clearBadge();
          }
        },
      };

      const alerts = [
        { id: 1, type: 'performance', read: false },
        { id: 2, type: 'threshold', read: true },
        { id: 3, type: 'error', read: false },
      ];

      const result = await badgeManager.updateBadgeForAlerts(alerts);

      expect(navigator.setAppBadge).toHaveBeenCalledWith(2);
      expect(result.success).toBe(true);
      expect(result.count).toBe(2);
    });
  });

  describe('Offline Capabilities', () => {
    it('detects online/offline status', () => {
      const connectionMonitor = {
        isOnline: navigator.onLine,
        connectionType: navigator.connection?.effectiveType || 'unknown',
        
        startMonitoring: () => {
          window.addEventListener('online', connectionMonitor.handleOnline);
          window.addEventListener('offline', connectionMonitor.handleOffline);
          
          if (navigator.connection) {
            navigator.connection.addEventListener('change', connectionMonitor.handleConnectionChange);
          }
        },

        handleOnline: () => {
          connectionMonitor.isOnline = true;
          // Sync pending data
          connectionMonitor.syncPendingData();
        },

        handleOffline: () => {
          connectionMonitor.isOnline = false;
          // Cache current state
          connectionMonitor.cacheCurrentState();
        },

        handleConnectionChange: () => {
          connectionMonitor.connectionType = navigator.connection?.effectiveType || 'unknown';
        },

        syncPendingData: jest.fn(),
        cacheCurrentState: jest.fn(),
      };

      connectionMonitor.startMonitoring();

      expect(window.addEventListener).toHaveBeenCalledWith('online', connectionMonitor.handleOnline);
      expect(window.addEventListener).toHaveBeenCalledWith('offline', connectionMonitor.handleOffline);
    });

    it('provides offline analytics functionality', async () => {
      const offlineAnalytics = {
        pendingEvents: [],
        
        track: (event, data) => {
          const analyticsEvent = {
            id: Date.now() + Math.random(),
            event,
            data,
            timestamp: Date.now(),
            synced: false,
          };

          if (navigator.onLine) {
            // Send immediately
            offlineAnalytics.sendEvent(analyticsEvent);
          } else {
            // Queue for later
            offlineAnalytics.pendingEvents.push(analyticsEvent);
            offlineAnalytics.persistPendingEvents();
          }
        },

        sendEvent: jest.fn(async (event) => {
          // Mock sending event
          event.synced = true;
          return { success: true };
        }),

        persistPendingEvents: () => {
          window.localStorage.setItem(
            'pending_analytics',
            JSON.stringify(offlineAnalytics.pendingEvents)
          );
        },

        syncPendingEvents: async () => {
          for (const event of offlineAnalytics.pendingEvents) {
            if (!event.synced) {
              await offlineAnalytics.sendEvent(event);
            }
          }
          
          // Clear synced events
          offlineAnalytics.pendingEvents = offlineAnalytics.pendingEvents.filter(
            event => !event.synced
          );
          offlineAnalytics.persistPendingEvents();
        },
      };

      // Test offline tracking
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
      
      offlineAnalytics.track('vendor_view', { vendorId: 'vendor-123' });
      
      expect(offlineAnalytics.pendingEvents).toHaveLength(1);
      expect(window.localStorage.setItem).toHaveBeenCalled();

      // Test online sync
      Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
      
      await offlineAnalytics.syncPendingEvents();
      
      expect(offlineAnalytics.sendEvent).toHaveBeenCalled();
    });
  });

  describe('Error Handling and Fallbacks', () => {
    it('handles PWA installation failures gracefully', async () => {
      // Mock installation failure
      mockBeforeInstallPromptEvent.prompt.mockRejectedValue(new Error('Installation failed'));

      const handleInstallationError = async (installPrompt) => {
        try {
          const result = await installPrompt.prompt();
          return { success: true, result };
        } catch (error) {
          console.warn('PWA installation failed:', error.message);
          
          // Provide fallback options
          const fallback = {
            success: false,
            error: error.message,
            fallbackOptions: [
              'Create desktop shortcut manually',
              'Bookmark this page for quick access',
              'Enable browser notifications',
            ],
          };

          return fallback;
        }
      };

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await handleInstallationError(mockBeforeInstallPromptEvent);

      expect(result.success).toBe(false);
      expect(result.fallbackOptions).toContain('Create desktop shortcut manually');
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'PWA installation failed:',
        'Installation failed'
      );

      consoleWarnSpy.mockRestore();
    });

    it('handles manifest loading failures', async () => {
      // Mock manifest fetch failure
      global.fetch.mockRejectedValue(new Error('Manifest not found'));

      const handleManifestError = async () => {
        try {
          const response = await fetch('/manifest-analytics.json');
          return await response.json();
        } catch (error) {
          console.error('Failed to load PWA manifest:', error.message);
          
          // Return fallback manifest
          return {
            name: 'WedSync Analytics',
            short_name: 'Analytics',
            start_url: '/',
            display: 'browser', // Fallback to browser mode
            background_color: '#ffffff',
            theme_color: '#000000',
            icons: [], // No icons available
            fallback: true,
          };
        }
      };

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const manifest = await handleManifestError();

      expect(manifest.fallback).toBe(true);
      expect(manifest.display).toBe('browser');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to load PWA manifest:',
        'Manifest not found'
      );

      consoleErrorSpy.mockRestore();
    });

    it('provides graceful degradation for unsupported browsers', () => {
      const featureSupport = {
        checkSupport: () => {
          return {
            serviceWorker: 'serviceWorker' in navigator,
            webAppManifest: 'manifest' in document.createElement('link'),
            pushNotifications: 'PushManager' in window,
            backgroundSync: 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype,
            webShare: 'share' in navigator,
            installPrompt: 'onbeforeinstallprompt' in window,
          };
        },

        getAlternatives: (unsupportedFeatures) => {
          const alternatives = {};

          if (unsupportedFeatures.includes('pushNotifications')) {
            alternatives.pushNotifications = 'Email notifications available';
          }

          if (unsupportedFeatures.includes('webShare')) {
            alternatives.webShare = 'Copy link functionality available';
          }

          if (unsupportedFeatures.includes('installPrompt')) {
            alternatives.installPrompt = 'Manual bookmark creation instructions';
          }

          return alternatives;
        },
      };

      // Mock limited browser support
      delete window.ServiceWorkerRegistration;
      delete navigator.share;

      const support = featureSupport.checkSupport();
      const unsupported = Object.keys(support).filter(key => !support[key]);
      const alternatives = featureSupport.getAlternatives(unsupported);

      expect(support.backgroundSync).toBe(false);
      expect(support.webShare).toBe(false);
      expect(alternatives.webShare).toBe('Copy link functionality available');
    });
  });
});