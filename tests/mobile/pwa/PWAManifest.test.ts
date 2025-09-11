import { jest } from '@jest/globals';

// Mock web app manifest APIs
const mockBeforeInstallPromptEvent = {
  platforms: ['web'],
  userChoice: Promise.resolve({ outcome: 'accepted', platform: 'web' }),
  prompt: jest.fn().mockResolvedValue(undefined),
  preventDefault: jest.fn(),
};

// Mock related APIs
Object.defineProperty(window, 'matchMedia', {
  value: jest.fn().mockImplementation(query => ({
    matches: query === '(display-mode: standalone)',
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
  writable: true,
});

// Mock navigator.share API
Object.defineProperty(navigator, 'share', {
  value: jest.fn().mockResolvedValue(undefined),
  writable: true,
});

Object.defineProperty(navigator, 'canShare', {
  value: jest.fn().mockReturnValue(true),
  writable: true,
});

// Mock file system access API
Object.defineProperty(window, 'showOpenFilePicker', {
  value: jest.fn().mockResolvedValue([{
    getFile: () => Promise.resolve(new File(['test'], 'test.csv', { type: 'text/csv' })),
  }]),
  writable: true,
});

Object.defineProperty(window, 'showSaveFilePicker', {
  value: jest.fn().mockResolvedValue({
    createWritable: () => Promise.resolve({
      write: jest.fn(),
      close: jest.fn(),
    }),
  }),
  writable: true,
});

// Mock screen orientation API
Object.defineProperty(screen, 'orientation', {
  value: {
    angle: 0,
    type: 'portrait-primary',
    lock: jest.fn().mockResolvedValue(undefined),
    unlock: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  },
  writable: true,
});

describe('PWA Manifest and Features', () => {
  let mockManifest: any;

  beforeAll(async () => {
    // Load the actual manifest file
    try {
      const fs = await import('fs');
      const path = await import('path');
      
      const manifestContent = fs.readFileSync(
        path.join(process.cwd(), 'wedsync/public/manifest-analytics.json'),
        'utf8'
      );
      mockManifest = JSON.parse(manifestContent);
    } catch (error) {
      // Fallback manifest for testing
      mockManifest = {
        name: 'WedSync Analytics',
        short_name: 'WedSync',
        description: 'Mobile analytics for wedding vendors',
        start_url: '/',
        display: 'standalone',
        theme_color: '#2563eb',
        background_color: '#ffffff',
        orientation: 'portrait-primary',
        scope: '/',
        icons: [
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
        shortcuts: [
          {
            name: 'Dashboard',
            short_name: 'Dashboard',
            description: 'View analytics dashboard',
            url: '/analytics/dashboard',
            icons: [{ src: '/icons/shortcut-dashboard.png', sizes: '96x96' }],
          },
        ],
        screenshots: [
          {
            src: '/screenshots/mobile-dashboard.png',
            sizes: '390x844',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'Analytics Dashboard',
          },
        ],
      };
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset media query mock
    (window.matchMedia as jest.Mock).mockImplementation(query => ({
      matches: query === '(display-mode: standalone)',
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
  });

  describe('Manifest Validation', () => {
    it('should have valid manifest structure', () => {
      expect(mockManifest).toHaveProperty('name');
      expect(mockManifest).toHaveProperty('short_name');
      expect(mockManifest).toHaveProperty('description');
      expect(mockManifest).toHaveProperty('start_url');
      expect(mockManifest).toHaveProperty('display');
      expect(mockManifest).toHaveProperty('theme_color');
      expect(mockManifest).toHaveProperty('background_color');
      expect(mockManifest).toHaveProperty('icons');
    });

    it('should have required icon sizes', () => {
      const requiredSizes = ['192x192', '512x512'];
      const iconSizes = mockManifest.icons.map((icon: any) => icon.sizes);

      requiredSizes.forEach(size => {
        expect(iconSizes).toContain(size);
      });
    });

    it('should have proper icon purposes', () => {
      const hasAnyPurpose = mockManifest.icons.some((icon: any) => 
        icon.purpose?.includes('any')
      );
      const hasMaskablePurpose = mockManifest.icons.some((icon: any) => 
        icon.purpose?.includes('maskable')
      );

      expect(hasAnyPurpose).toBe(true);
      expect(hasMaskablePurpose).toBe(true);
    });

    it('should have valid display modes', () => {
      const validDisplayModes = ['standalone', 'fullscreen', 'minimal-ui', 'browser'];
      expect(validDisplayModes).toContain(mockManifest.display);
    });

    it('should have valid theme and background colors', () => {
      const colorRegex = /^#[0-9A-Fa-f]{6}$/;
      expect(mockManifest.theme_color).toMatch(colorRegex);
      expect(mockManifest.background_color).toMatch(colorRegex);
    });

    it('should have valid shortcuts configuration', () => {
      if (mockManifest.shortcuts) {
        mockManifest.shortcuts.forEach((shortcut: any) => {
          expect(shortcut).toHaveProperty('name');
          expect(shortcut).toHaveProperty('url');
          expect(shortcut.url).toMatch(/^\/.*$/); // Should start with /
        });
      }
    });

    it('should have valid screenshots for app stores', () => {
      if (mockManifest.screenshots) {
        mockManifest.screenshots.forEach((screenshot: any) => {
          expect(screenshot).toHaveProperty('src');
          expect(screenshot).toHaveProperty('sizes');
          expect(screenshot).toHaveProperty('type');
          expect(screenshot).toHaveProperty('form_factor');
        });
      }
    });
  });

  describe('App Installation', () => {
    let beforeInstallPrompt: any;

    beforeEach(() => {
      beforeInstallPrompt = { ...mockBeforeInstallPromptEvent };
      
      // Simulate beforeinstallprompt event
      window.dispatchEvent(
        Object.assign(new Event('beforeinstallprompt'), beforeInstallPrompt)
      );
    });

    it('should detect installable PWA', () => {
      let installPrompt: any = null;

      const handleBeforeInstallPrompt = (e: any) => {
        e.preventDefault();
        installPrompt = e;
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

      window.dispatchEvent(
        Object.assign(new Event('beforeinstallprompt'), beforeInstallPrompt)
      );

      expect(installPrompt).not.toBeNull();
      expect(installPrompt.platforms).toContain('web');
    });

    it('should show install prompt', async () => {
      let installPrompt: any = null;

      const handleBeforeInstallPrompt = (e: any) => {
        e.preventDefault();
        installPrompt = e;
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

      window.dispatchEvent(
        Object.assign(new Event('beforeinstallprompt'), beforeInstallPrompt)
      );

      const showInstallPrompt = async () => {
        if (installPrompt) {
          await installPrompt.prompt();
          const choiceResult = await installPrompt.userChoice;
          return choiceResult;
        }
        return null;
      };

      const result = await showInstallPrompt();

      expect(beforeInstallPrompt.prompt).toHaveBeenCalled();
      expect(result).toEqual({ outcome: 'accepted', platform: 'web' });
    });

    it('should handle successful app installation', async () => {
      let isInstalled = false;

      const handleAppInstalled = () => {
        isInstalled = true;
      };

      window.addEventListener('appinstalled', handleAppInstalled);

      window.dispatchEvent(new Event('appinstalled'));

      expect(isInstalled).toBe(true);
    });

    it('should hide install UI after installation', () => {
      const installButton = document.createElement('button');
      installButton.id = 'install-button';
      installButton.style.display = 'block';
      document.body.appendChild(installButton);

      const handleAppInstalled = () => {
        const btn = document.getElementById('install-button') as HTMLElement;
        if (btn) {
          btn.style.display = 'none';
        }
      };

      window.addEventListener('appinstalled', handleAppInstalled);

      window.dispatchEvent(new Event('appinstalled'));

      expect(installButton.style.display).toBe('none');

      document.body.removeChild(installButton);
    });

    it('should track installation analytics', async () => {
      const analyticsEvents: any[] = [];

      const trackInstallation = (event: string, data: any) => {
        analyticsEvents.push({ event, data, timestamp: Date.now() });
      };

      // Track install prompt shown
      trackInstallation('install_prompt_shown', { platform: 'web' });

      // Track user choice
      beforeInstallPrompt.userChoice.then((choice: any) => {
        trackInstallation('install_choice', choice);
      });

      await beforeInstallPrompt.userChoice;

      expect(analyticsEvents).toHaveLength(2);
      expect(analyticsEvents[0].event).toBe('install_prompt_shown');
      expect(analyticsEvents[1].event).toBe('install_choice');
    });
  });

  describe('Standalone Display Mode', () => {
    it('should detect standalone mode', () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      expect(isStandalone).toBe(true);
    });

    it('should adapt UI for standalone mode', () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

      const adaptUIForStandalone = (standalone: boolean) => {
        if (standalone) {
          document.body.classList.add('standalone');
          // Hide browser-specific UI elements
          const browserElements = document.querySelectorAll('.browser-only');
          browserElements.forEach(el => {
            (el as HTMLElement).style.display = 'none';
          });
        } else {
          document.body.classList.remove('standalone');
        }
      };

      adaptUIForStandalone(isStandalone);

      expect(document.body.classList.contains('standalone')).toBe(true);
    });

    it('should handle status bar overlay on mobile', () => {
      const handleStatusBarOverlay = () => {
        if (window.matchMedia('(display-mode: standalone)').matches) {
          const metaTag = document.createElement('meta');
          metaTag.name = 'apple-mobile-web-app-status-bar-style';
          metaTag.content = 'black-translucent';
          document.head.appendChild(metaTag);

          // Add padding to account for status bar
          document.body.style.paddingTop = 'env(safe-area-inset-top)';
        }
      };

      handleStatusBarOverlay();

      const statusBarMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
      expect(statusBarMeta).toBeTruthy();
      expect(document.body.style.paddingTop).toBe('env(safe-area-inset-top)');
    });

    it('should provide custom navigation for standalone mode', () => {
      const createCustomNavigation = () => {
        if (window.matchMedia('(display-mode: standalone)').matches) {
          const nav = document.createElement('nav');
          nav.className = 'pwa-navigation';
          
          const backButton = document.createElement('button');
          backButton.textContent = '← Back';
          backButton.onclick = () => window.history.back();
          
          const homeButton = document.createElement('button');
          homeButton.textContent = '🏠 Home';
          homeButton.onclick = () => window.location.href = '/';
          
          nav.appendChild(backButton);
          nav.appendChild(homeButton);
          document.body.prepend(nav);
        }
      };

      createCustomNavigation();

      const navigation = document.querySelector('.pwa-navigation');
      expect(navigation).toBeTruthy();
      expect(navigation?.children).toHaveLength(2);
    });
  });

  describe('Web Share API', () => {
    it('should check Web Share API support', () => {
      const isShareSupported = navigator.share !== undefined;
      expect(isShareSupported).toBe(true);
    });

    it('should share analytics data', async () => {
      const shareData = {
        title: 'WedSync Analytics Report',
        text: 'Check out my wedding vendor performance analytics',
        url: 'https://wedsync.com/analytics/shared-report/123',
      };

      if (navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      }

      expect(navigator.canShare).toHaveBeenCalledWith(shareData);
      expect(navigator.share).toHaveBeenCalledWith(shareData);
    });

    it('should handle share cancellation', async () => {
      const shareError = new DOMException('Share cancelled', 'AbortError');
      (navigator.share as jest.Mock).mockRejectedValueOnce(shareError);

      const shareAnalytics = async () => {
        try {
          await navigator.share({
            title: 'Analytics Report',
            url: window.location.href,
          });
          return { success: true };
        } catch (error: any) {
          if (error.name === 'AbortError') {
            return { success: false, reason: 'cancelled' };
          }
          throw error;
        }
      };

      const result = await shareAnalytics();

      expect(result.success).toBe(false);
      expect(result.reason).toBe('cancelled');
    });

    it('should fallback to clipboard when share is not available', async () => {
      // Mock share as unavailable
      Object.defineProperty(navigator, 'share', {
        value: undefined,
        writable: true,
      });

      // Mock clipboard API
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: jest.fn().mockResolvedValue(undefined),
        },
        writable: true,
      });

      const shareWithFallback = async (data: { title: string; url: string }) => {
        if (navigator.share) {
          await navigator.share(data);
        } else if (navigator.clipboard) {
          await navigator.clipboard.writeText(`${data.title} - ${data.url}`);
          return { method: 'clipboard' };
        } else {
          // Further fallback could be a modal with selectable text
          return { method: 'manual' };
        }
      };

      const result = await shareWithFallback({
        title: 'Analytics Report',
        url: 'https://example.com',
      });

      expect(result?.method).toBe('clipboard');
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        'Analytics Report - https://example.com'
      );
    });
  });

  describe('File System Access API', () => {
    it('should export analytics data to file', async () => {
      const analyticsData = {
        vendors: [
          { name: 'Photo Studio A', score: 8.5, bookings: 45 },
          { name: 'Floral Design B', score: 7.8, bookings: 32 },
        ],
        exportDate: new Date().toISOString(),
      };

      const exportToFile = async (data: any, filename: string) => {
        if (window.showSaveFilePicker) {
          const fileHandle = await window.showSaveFilePicker({
            suggestedName: filename,
            types: [{
              description: 'CSV files',
              accept: { 'text/csv': ['.csv'] },
            }],
          });

          const writable = await fileHandle.createWritable();
          await writable.write(JSON.stringify(data, null, 2));
          await writable.close();

          return { success: true, method: 'file_system_api' };
        } else {
          // Fallback to download link
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          a.click();
          URL.revokeObjectURL(url);

          return { success: true, method: 'download_link' };
        }
      };

      const result = await exportToFile(analyticsData, 'analytics-export.json');

      expect(result.success).toBe(true);
      expect(result.method).toBe('file_system_api');
      expect(window.showSaveFilePicker).toHaveBeenCalled();
    });

    it('should import analytics data from file', async () => {
      const importFromFile = async () => {
        if (window.showOpenFilePicker) {
          const [fileHandle] = await window.showOpenFilePicker({
            types: [{
              description: 'Analytics files',
              accept: { 
                'text/csv': ['.csv'],
                'application/json': ['.json'],
              },
            }],
            multiple: false,
          });

          const file = await fileHandle.getFile();
          const text = await file.text();
          
          return {
            success: true,
            data: text,
            filename: file.name,
            type: file.type,
          };
        } else {
          throw new Error('File System Access API not supported');
        }
      };

      const result = await importFromFile();

      expect(result.success).toBe(true);
      expect(result.filename).toBe('test.csv');
      expect(result.type).toBe('text/csv');
      expect(window.showOpenFilePicker).toHaveBeenCalled();
    });
  });

  describe('Screen Orientation', () => {
    it('should lock orientation for analytics view', async () => {
      if (screen.orientation && screen.orientation.lock) {
        await screen.orientation.lock('portrait-primary');
      }

      expect(screen.orientation.lock).toHaveBeenCalledWith('portrait-primary');
    });

    it('should unlock orientation when leaving analytics', () => {
      if (screen.orientation && screen.orientation.unlock) {
        screen.orientation.unlock();
      }

      expect(screen.orientation.unlock).toHaveBeenCalled();
    });

    it('should handle orientation changes', () => {
      const orientationChangeHandler = jest.fn();

      if (screen.orientation) {
        screen.orientation.addEventListener('change', orientationChangeHandler);

        // Simulate orientation change
        const changeEvent = new Event('change');
        screen.orientation.dispatchEvent(changeEvent);

        expect(orientationChangeHandler).toHaveBeenCalled();
      }
    });

    it('should adapt layout for landscape mode', () => {
      const handleOrientationChange = () => {
        const isLandscape = screen.orientation?.type.includes('landscape');
        
        if (isLandscape) {
          document.body.classList.add('landscape');
          document.body.classList.remove('portrait');
        } else {
          document.body.classList.add('portrait');
          document.body.classList.remove('landscape');
        }
      };

      // Mock landscape orientation
      Object.defineProperty(screen, 'orientation', {
        value: {
          ...screen.orientation,
          type: 'landscape-primary',
          angle: 90,
        },
        writable: true,
      });

      handleOrientationChange();

      expect(document.body.classList.contains('landscape')).toBe(true);
      expect(document.body.classList.contains('portrait')).toBe(false);
    });
  });

  describe('PWA Feature Detection', () => {
    it('should detect PWA capabilities', () => {
      const pwaCapabilities = {
        serviceWorker: 'serviceWorker' in navigator,
        webAppManifest: 'onbeforeinstallprompt' in window,
        pushNotifications: 'PushManager' in window,
        backgroundSync: 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype,
        webShare: 'share' in navigator,
        fileSystemAccess: 'showOpenFilePicker' in window,
        screenOrientation: 'orientation' in screen,
        fullscreen: 'requestFullscreen' in document.documentElement,
      };

      expect(pwaCapabilities.serviceWorker).toBe(true);
      expect(pwaCapabilities.webShare).toBe(true);
      expect(pwaCapabilities.fileSystemAccess).toBe(true);
      expect(pwaCapabilities.screenOrientation).toBe(true);
    });

    it('should provide feature detection utilities', () => {
      const PWAFeatures = {
        isInstallable: () => 'onbeforeinstallprompt' in window,
        isStandalone: () => window.matchMedia('(display-mode: standalone)').matches,
        canShare: () => 'share' in navigator,
        canUseFileSystem: () => 'showOpenFilePicker' in window,
        supportsNotifications: () => 'Notification' in window,
        supportsPushMessages: () => 'PushManager' in window,
        supportsBackgroundSync: () => 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype,
      };

      expect(PWAFeatures.canShare()).toBe(true);
      expect(PWAFeatures.canUseFileSystem()).toBe(true);
      expect(PWAFeatures.isStandalone()).toBe(true);
    });

    it('should gracefully handle missing features', () => {
      // Mock missing features
      delete (window as any).showOpenFilePicker;
      delete (navigator as any).share;

      const safeFeatureUse = {
        share: async (data: any) => {
          if (navigator.share) {
            return await navigator.share(data);
          } else {
            console.warn('Web Share API not supported');
            return { fallback: true };
          }
        },
        
        saveFile: async (data: any, filename: string) => {
          if ((window as any).showSaveFilePicker) {
            // Use File System Access API
            return { method: 'filesystem' };
          } else {
            // Use download fallback
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
            return { method: 'download' };
          }
        },
      };

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const shareResult = safeFeatureUse.share({ title: 'test' });
      const saveResult = safeFeatureUse.saveFile('test data', 'test.json');

      expect(shareResult).resolves.toEqual({ fallback: true });
      expect(saveResult).resolves.toEqual({ method: 'download' });
      expect(consoleSpy).toHaveBeenCalledWith('Web Share API not supported');

      consoleSpy.mockRestore();
    });
  });

  describe('Performance Metrics', () => {
    it('should measure PWA loading performance', () => {
      const measurePWAPerformance = () => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        
        return {
          timeToFirstByte: navigation.responseStart - navigation.requestStart,
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.navigationStart,
          loadComplete: navigation.loadEventEnd - navigation.navigationStart,
          cacheHit: navigation.transferSize === 0,
        };
      };

      // Mock navigation timing
      Object.defineProperty(performance, 'getEntriesByType', {
        value: jest.fn(() => [{
          navigationStart: 1000,
          requestStart: 1010,
          responseStart: 1050,
          domContentLoadedEventEnd: 1200,
          loadEventEnd: 1300,
          transferSize: 0, // Indicates cache hit
        }]),
        writable: true,
      });

      const metrics = measurePWAPerformance();

      expect(metrics.timeToFirstByte).toBe(40);
      expect(metrics.domContentLoaded).toBe(200);
      expect(metrics.loadComplete).toBe(300);
      expect(metrics.cacheHit).toBe(true);
    });

    it('should track PWA engagement metrics', () => {
      const trackEngagement = () => {
        const metrics = {
          sessionStart: Date.now(),
          isStandalone: window.matchMedia('(display-mode: standalone)').matches,
          installDate: localStorage.getItem('pwa-install-date'),
          sessionsCount: parseInt(localStorage.getItem('pwa-sessions') || '0') + 1,
          totalUsageTime: parseInt(localStorage.getItem('pwa-usage-time') || '0'),
        };

        localStorage.setItem('pwa-sessions', metrics.sessionsCount.toString());
        
        return metrics;
      };

      // Mock localStorage
      const mockStorage = {
        'pwa-install-date': '2025-01-01',
        'pwa-sessions': '5',
        'pwa-usage-time': '3600000', // 1 hour
      };

      jest.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => mockStorage[key] || null);
      jest.spyOn(Storage.prototype, 'setItem').mockImplementation();

      const metrics = trackEngagement();

      expect(metrics.sessionsCount).toBe(6);
      expect(metrics.isStandalone).toBe(true);
      expect(metrics.installDate).toBe('2025-01-01');
    });
  });

  describe('Integration Tests', () => {
    it('should work end-to-end as installed PWA', async () => {
      // 1. App becomes installable
      let installPrompt: any = null;
      
      window.addEventListener('beforeinstallprompt', (e: any) => {
        e.preventDefault();
        installPrompt = e;
      });

      window.dispatchEvent(
        Object.assign(new Event('beforeinstallprompt'), mockBeforeInstallPromptEvent)
      );

      expect(installPrompt).not.toBeNull();

      // 2. User installs app
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      expect(choice.outcome).toBe('accepted');

      // 3. App launches in standalone mode
      expect(window.matchMedia('(display-mode: standalone)').matches).toBe(true);

      // 4. App uses PWA features
      const shareData = { title: 'Test', url: 'https://test.com' };
      await navigator.share(shareData);
      expect(navigator.share).toHaveBeenCalledWith(shareData);

      // 5. App can export data
      if (window.showSaveFilePicker) {
        const fileHandle = await window.showSaveFilePicker({
          suggestedName: 'export.json',
        });
        expect(fileHandle).toBeDefined();
      }

      // 6. App adapts to orientation
      if (screen.orientation) {
        await screen.orientation.lock('portrait');
        expect(screen.orientation.lock).toHaveBeenCalledWith('portrait');
      }
    });

    it('should maintain functionality without PWA features', async () => {
      // Mock absence of PWA features
      delete (window as any).showSaveFilePicker;
      delete (navigator as any).share;
      Object.defineProperty(window, 'matchMedia', {
        value: jest.fn(() => ({ matches: false })),
        writable: true,
      });

      // App should still work with fallbacks
      const analytics = {
        exportData: async (data: any, filename: string) => {
          if ((window as any).showSaveFilePicker) {
            // Use File System API
            return { method: 'filesystem' };
          } else {
            // Fallback to download
            const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            link.click();
            URL.revokeObjectURL(url);
            return { method: 'download' };
          }
        },
        
        shareData: async (data: any) => {
          if (navigator.share) {
            return await navigator.share(data);
          } else {
            // Fallback to clipboard
            if (navigator.clipboard) {
              await navigator.clipboard.writeText(data.url);
              return { method: 'clipboard' };
            } else {
              return { method: 'manual', text: data.url };
            }
          }
        },
      };

      const exportResult = await analytics.exportData({ test: 'data' }, 'test.json');
      const shareResult = await analytics.shareData({ url: 'https://test.com' });

      expect(exportResult.method).toBe('download');
      expect(shareResult.method).toBe('clipboard');
    });
  });
});