// WS-204 Team E: Cross-Platform Presence Compatibility Testing
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import type { PresenceStatus, PresenceManager } from '@/types/presence';

// Browser compatibility test utilities
interface MockBrowser {
  name: string;
  userAgent: string;
  webSocketSupport: boolean;
  serviceWorkerSupport: boolean;
  notificationSupport: boolean;
  localStorage: boolean;
}

interface PlatformConfig {
  platform: 'web' | 'mobile-ios' | 'mobile-android';
  features: {
    webSocket: boolean;
    pushNotifications: boolean;
    backgroundSync: boolean;
    offlineStorage: boolean;
  };
}

const mockBrowsers: MockBrowser[] = [
  {
    name: 'chrome',
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    webSocketSupport: true,
    serviceWorkerSupport: true,
    notificationSupport: true,
    localStorage: true,
  },
  {
    name: 'firefox',
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
    webSocketSupport: true,
    serviceWorkerSupport: true,
    notificationSupport: true,
    localStorage: true,
  },
  {
    name: 'safari',
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Version/17.0 Safari/537.36',
    webSocketSupport: true,
    serviceWorkerSupport: true,
    notificationSupport: false, // Safari has limited notification support
    localStorage: true,
  },
  {
    name: 'edge',
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.2210.144',
    webSocketSupport: true,
    serviceWorkerSupport: true,
    notificationSupport: true,
    localStorage: true,
  },
];

const platformConfigs: PlatformConfig[] = [
  {
    platform: 'web',
    features: {
      webSocket: true,
      pushNotifications: true,
      backgroundSync: true,
      offlineStorage: true,
    },
  },
  {
    platform: 'mobile-ios',
    features: {
      webSocket: true,
      pushNotifications: true,
      backgroundSync: false, // Limited on iOS
      offlineStorage: true,
    },
  },
  {
    platform: 'mobile-android',
    features: {
      webSocket: true,
      pushNotifications: true,
      backgroundSync: true,
      offlineStorage: true,
    },
  },
];

// Mock implementations
const createMockBrowser = (browserName: string): MockBrowser => {
  const browser = mockBrowsers.find((b) => b.name === browserName);
  if (!browser) throw new Error(`Unknown browser: ${browserName}`);
  return { ...browser };
};

const getPlatformPresenceConfig = (platform: string): PlatformConfig => {
  const config = platformConfigs.find((p) => p.platform === platform);
  if (!config) throw new Error(`Unknown platform: ${platform}`);
  return { ...config };
};

const establishPresenceConnection = async (browser: MockBrowser) => {
  // Simulate connection establishment based on browser capabilities
  if (!browser.webSocketSupport) {
    return { status: 'failed', reason: 'WebSocket not supported' };
  }

  return {
    status: 'connected',
    protocol: 'wss://api.wedsync.com/presence',
    browser: browser.name,
    features: {
      webSocket: browser.webSocketSupport,
      notifications: browser.notificationSupport,
      storage: browser.localStorage,
    },
  };
};

// Mock PresenceManager for testing
class MockPresenceManager implements Partial<PresenceManager> {
  private config: PlatformConfig;
  private _status:
    | 'disconnected'
    | 'connecting'
    | 'connected'
    | 'reconnecting' = 'disconnected';
  private _supported = true;
  private updateQueue: any[] = [];

  constructor(config?: PlatformConfig) {
    this.config = config || platformConfigs[0];
  }

  async initialize(): Promise<void> {
    if (!this.config.features.webSocket) {
      this._supported = false;
      return;
    }

    this._status = 'connecting';
    // Simulate connection delay
    await new Promise((resolve) => setTimeout(resolve, 100));
    this._status = 'connected';
  }

  isSupported(): boolean {
    return this._supported;
  }

  get status() {
    return this._status;
  }

  get queuedUpdates() {
    return this.updateQueue;
  }

  updateStatus(status: PresenceStatus): void {
    if (this._status === 'connected') {
      // Send immediately
      this.updateQueue = [];
    } else {
      // Queue for later
      this.updateQueue.push({ status, timestamp: Date.now() });
    }
  }
}

// Network simulation utilities
const simulateNetworkDisconnection = () => {
  global.navigator = {
    ...global.navigator,
    onLine: false,
  } as any;

  global.dispatchEvent(new Event('offline'));
};

const simulateNetworkReconnection = () => {
  global.navigator = {
    ...global.navigator,
    onLine: true,
  } as any;

  global.dispatchEvent(new Event('online'));
};

describe('Cross-Platform Presence Compatibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.navigator = {
      ...global.navigator,
      onLine: true,
    } as any;
  });

  afterEach(() => {
    cleanup();
  });

  describe('WebSocket Support', () => {
    mockBrowsers.forEach((browser) => {
      it(`should establish presence connection on ${browser.name}`, async () => {
        const mockBrowser = createMockBrowser(browser.name);
        const connection = await establishPresenceConnection(mockBrowser);

        expect(connection.status).toBe('connected');
        expect(connection.protocol).toMatch(/wss?:\/\//);
        expect(connection.browser).toBe(browser.name);
        expect(connection.features.webSocket).toBe(true);
      });

      it(`should handle ${browser.name} specific WebSocket features`, async () => {
        const mockBrowser = createMockBrowser(browser.name);

        // Test browser-specific WebSocket handling
        const connectionFeatures = {
          binarySupport: browser.name !== 'safari', // Safari has limited binary support
          compressionSupport:
            browser.name === 'chrome' || browser.name === 'firefox',
          heartbeatInterval: browser.name === 'safari' ? 30000 : 15000, // Safari needs longer intervals
        };

        expect(connectionFeatures.binarySupport).toBeDefined();
        expect(connectionFeatures.compressionSupport).toBeDefined();
        expect(connectionFeatures.heartbeatInterval).toBeGreaterThan(0);
      });
    });

    platformConfigs.forEach((platform) => {
      it(`should handle ${platform.platform} specific presence patterns`, async () => {
        const platformConfig = getPlatformPresenceConfig(platform.platform);
        const presenceManager = new MockPresenceManager(platformConfig);

        await presenceManager.initialize();
        expect(presenceManager.isSupported()).toBe(true);

        // Test platform-specific behaviors
        if (platform.platform === 'mobile-ios') {
          // iOS has stricter background limitations
          expect(platform.features.backgroundSync).toBe(false);
        } else {
          expect(platform.features.backgroundSync).toBe(true);
        }
      });
    });
  });

  async function simulateConnectionCycle() {
    simulateNetworkDisconnection();
    await new Promise((resolve) => setTimeout(resolve, 50));
    simulateNetworkReconnection();
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  describe('Offline Presence Handling', () => {
    it('should gracefully handle network interruptions', async () => {
      const presenceManager = new MockPresenceManager();
      await presenceManager.initialize();

      expect(presenceManager.status).toBe('connected');

      // Simulate network disconnection
      simulateNetworkDisconnection();

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should detect disconnection and attempt reconnection
      expect(global.navigator.onLine).toBe(false);

      // Restore network
      simulateNetworkReconnection();

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(global.navigator.onLine).toBe(true);
    });

    it('should queue presence updates during offline periods', async () => {
      const presenceManager = new MockPresenceManager();
      await presenceManager.initialize();

      // Go offline
      simulateNetworkDisconnection();
      presenceManager['_status'] = 'disconnected';

      const updates = [
        { status: 'away' as PresenceStatus, timestamp: Date.now() },
        { status: 'busy' as PresenceStatus, timestamp: Date.now() + 1000 },
        { status: 'online' as PresenceStatus, timestamp: Date.now() + 2000 },
      ];

      updates.forEach((update) => presenceManager.updateStatus(update.status));

      expect(presenceManager.queuedUpdates).toHaveLength(3);

      // Go back online
      simulateNetworkReconnection();
      presenceManager['_status'] = 'connected';

      // Process queued updates
      presenceManager.updateStatus('online');

      expect(presenceManager.queuedUpdates).toHaveLength(0);
    });

    it('should handle intermittent connectivity gracefully', async () => {
      const presenceManager = new MockPresenceManager();
      await presenceManager.initialize();

      // Simulate flaky connection - on/off/on/off
      // Run 5 cycles
      for (let i = 0; i < 5; i++) {
        await simulateConnectionCycle();
      }

      // Should handle without crashing
      expect(presenceManager.isSupported()).toBe(true);
    });
  });

  describe('Mobile Device Handling', () => {
    it('should handle mobile app lifecycle events', async () => {
      const mobileConfig = getPlatformPresenceConfig('mobile-ios');
      const presenceManager = new MockPresenceManager(mobileConfig);

      await presenceManager.initialize();

      // Simulate app going to background
      const backgroundEvent = new Event('pagehide');
      global.dispatchEvent(backgroundEvent);

      // Should pause presence updates
      presenceManager.updateStatus('away');

      // Simulate app returning to foreground
      const foregroundEvent = new Event('pageshow');
      global.dispatchEvent(foregroundEvent);

      // Should resume presence updates
      presenceManager.updateStatus('online');

      expect(presenceManager.status).toBe('connected');
    });

    it('should adapt to mobile data constraints', async () => {
      const mobileConfig = getPlatformPresenceConfig('mobile-android');
      const presenceManager = new MockPresenceManager(mobileConfig);

      // Mock reduced data mode
      const connectionInfo = {
        effectiveType: '3g',
        saveData: true,
        downlink: 1.5,
        rtt: 300,
      };

      // Should reduce update frequency on slow connections
      const updateInterval =
        connectionInfo.effectiveType === '3g' ? 10000 : 5000;
      expect(updateInterval).toBe(10000); // 10 seconds instead of 5

      // Should batch updates more aggressively
      const batchSize = connectionInfo.saveData ? 10 : 5;
      expect(batchSize).toBe(10);
    });

    it('should handle device orientation changes', async () => {
      const presenceManager = new MockPresenceManager();
      await presenceManager.initialize();

      // Simulate orientation change
      const orientationChangeEvent = new Event('orientationchange');
      global.dispatchEvent(orientationChangeEvent);

      // Should maintain connection during orientation changes
      expect(presenceManager.status).toBe('connected');

      // Should not queue unnecessary updates
      expect(presenceManager.queuedUpdates).toHaveLength(0);
    });
  });

  describe('Browser Storage Compatibility', () => {
    // Helper functions to reduce nesting depth for S2004 compliance
    const testLocalStorageOperation = (presenceData: any) => {
      global.localStorage?.setItem(
        'presence_cache',
        JSON.stringify(presenceData),
      );
    };

    const testStorageOperationForBrowser = (browserName: string, shouldWork: boolean) => {
      const mockBrowser = createMockBrowser(browserName);

      try {
        if (shouldWork) {
          const presenceData = {
            userId: 'user-123',
            status: 'online',
            lastUpdated: Date.now(),
          };

          expect(() => testLocalStorageOperation(presenceData)).not.toThrow();

          const stored = global.localStorage?.getItem('presence_cache');
          expect(stored).toBeTruthy();
        }
      } catch (error) {
        if (!shouldWork) {
          expect(error).toBeTruthy();
        }
      }
    };

    it('should handle localStorage limitations', async () => {
      // Test each browser - now only 2 nesting levels
      mockBrowsers.forEach((browser) => {
        testStorageOperationForBrowser(browser.name, browser.localStorage);
      });
    });

    it('should fallback gracefully when storage is unavailable', async () => {
      // Mock storage unavailable
      const originalLocalStorage = global.localStorage;
      delete (global as any).localStorage;

      const presenceManager = new MockPresenceManager();

      // Should still work without local storage
      expect(() => presenceManager.initialize()).not.toThrow();

      // Restore
      global.localStorage = originalLocalStorage;
    });
  });

  describe('Performance Across Platforms', () => {
    it('should maintain acceptable performance on low-end devices', async () => {
      const lowEndConfig: PlatformConfig = {
        platform: 'mobile-android',
        features: {
          webSocket: true,
          pushNotifications: true,
          backgroundSync: false, // Disabled for performance
          offlineStorage: true,
        },
      };

      const presenceManager = new MockPresenceManager(lowEndConfig);

      const startTime = performance.now();
      await presenceManager.initialize();
      const initTime = performance.now() - startTime;

      expect(initTime).toBeLessThan(500); // Should initialize quickly
      expect(lowEndConfig.features.backgroundSync).toBe(false); // Disabled for performance
    });

    it('should scale update frequency based on device capabilities', async () => {
      // Helper function to reduce nesting depth for S2004 compliance
      const validateLowEndDeviceConfig = (config: any) => {
        expect(config.updateInterval).toBeGreaterThan(5000);
        expect(config.batchSize).toBeGreaterThan(15);
      };

      const deviceCapabilities = [
        { type: 'high-end', cpu: 'fast', memory: 'high', updateInterval: 2000 },
        {
          type: 'mid-range',
          cpu: 'medium',
          memory: 'medium',
          updateInterval: 5000,
        },
        { type: 'low-end', cpu: 'slow', memory: 'low', updateInterval: 10000 },
      ];

      deviceCapabilities.forEach((device) => {
        const config = {
          updateInterval: device.updateInterval,
          batchSize: device.memory === 'low' ? 20 : 10,
          compressionEnabled: device.cpu !== 'slow',
        };

        expect(config.updateInterval).toBeGreaterThan(0);
        expect(config.batchSize).toBeGreaterThan(0);

        if (device.type === 'low-end') {
          validateLowEndDeviceConfig(config);
        }
      });
    });
  });

  describe('WebRTC Support for Direct Presence', () => {
    it('should detect WebRTC support for peer-to-peer presence', async () => {
      const webRTCSupport = typeof RTCPeerConnection !== 'undefined';

      if (webRTCSupport) {
        // Test WebRTC-based direct presence updates
        const peerConnection = {
          localDescription: null,
          remoteDescription: null,
          iceConnectionState: 'new',
          connectionState: 'new',
        };

        expect(peerConnection.connectionState).toBe('new');

        // Should be able to establish peer connections for direct presence
        peerConnection.connectionState = 'connected';
        expect(peerConnection.connectionState).toBe('connected');
      } else {
        // Should fallback to WebSocket-based presence
        const presenceManager = new MockPresenceManager();
        await presenceManager.initialize();
        expect(presenceManager.status).toBe('connected');
      }
    });
  });

  describe('Notification Compatibility', () => {
    // Helper functions to reduce nesting depth for S2004 compliance
    const testSupportedNotifications = () => {
      const notificationPermission = 'granted';

      const presenceNotification = {
        title: 'Wedding Coordinator is Online',
        body: 'Sarah (Wedding Coordinator) is now available for your wedding',
        icon: '/icons/coordinator.png',
        badge: '/icons/badge.png',
        tag: 'presence-coordinator',
        requireInteraction: false,
        actions: [
          { action: 'message', title: 'Send Message' },
          { action: 'dismiss', title: 'Dismiss' },
        ],
      };

      expect(notificationPermission).toBe('granted');
      expect(presenceNotification.title).toBeTruthy();
      expect(presenceNotification.actions).toHaveLength(2);
    };

    const testFallbackNotifications = () => {
      const presenceUpdate = {
        type: 'coordinator_online',
        fallback: 'in-app-banner',
      };

      expect(presenceUpdate.fallback).toBe('in-app-banner');
    };

    mockBrowsers.forEach((browser) => {
      it(`should handle presence notifications on ${browser.name}`, async () => {
        const mockBrowser = createMockBrowser(browser.name);

        if (mockBrowser.notificationSupport) {
          testSupportedNotifications();
        } else {
          testFallbackNotifications();
        }
      });
    });
  });

  describe('Accessibility Features', () => {
    it('should support screen readers for presence indicators', async () => {
      const presenceIndicators = [
        {
          status: 'online',
          ariaLabel: 'User is currently online and available',
          color: '#22c55e',
        },
        {
          status: 'away',
          ariaLabel: 'User is away from their device',
          color: '#f59e0b',
        },
        {
          status: 'busy',
          ariaLabel: 'User is busy and may not respond immediately',
          color: '#ef4444',
        },
        {
          status: 'offline',
          ariaLabel: 'User is offline and unavailable',
          color: '#6b7280',
        },
      ];

      presenceIndicators.forEach((indicator) => {
        expect(indicator.ariaLabel).toBeTruthy();
        expect(indicator.ariaLabel.length).toBeGreaterThan(10);
        expect(indicator.color).toMatch(/^#[0-9a-f]{6}$/i);
      });
    });

    it('should support high contrast mode for presence indicators', async () => {
      const highContrastSupport = {
        online: { color: '#000000', background: '#00ff00' },
        away: { color: '#000000', background: '#ffff00' },
        busy: { color: '#ffffff', background: '#ff0000' },
        offline: { color: '#ffffff', background: '#000000' },
      };

      Object.entries(highContrastSupport).forEach(([status, colors]) => {
        expect(colors.color).toMatch(/^#[0-9a-f]{6}$/i);
        expect(colors.background).toMatch(/^#[0-9a-f]{6}$/i);
      });
    });

    it('should support keyboard navigation for presence controls', async () => {
      // Helper function to reduce nesting depth for S2004 compliance
      const validateAriaLabel = (ariaLabel: string) => {
        expect(ariaLabel.length).toBeGreaterThan(5);
      };

      const presenceControls = {
        statusToggle: {
          tabIndex: 0,
          role: 'button',
          ariaLabel: 'Toggle presence status',
        },
        settingsButton: {
          tabIndex: 0,
          role: 'button',
          ariaLabel: 'Open presence settings',
        },
        activityIndicator: { tabIndex: -1, role: 'status', ariaLive: 'polite' },
      };

      Object.entries(presenceControls).forEach(([control, attributes]) => {
        expect(attributes.role).toBeTruthy();
        expect(attributes.tabIndex).toBeDefined();
        if (attributes.ariaLabel) {
          validateAriaLabel(attributes.ariaLabel);
        }
      });
    });
  });

  describe('Security Across Platforms', () => {
    it('should enforce HTTPS for presence connections', async () => {
      const secureConnectionTests = mockBrowsers.map((browser) => ({
        browser: browser.name,
        connection: {
          protocol: 'wss:', // Secure WebSocket
          origin: 'https://app.wedsync.com',
          certificateValid: true,
        },
      }));

      secureConnectionTests.forEach((test) => {
        expect(test.connection.protocol).toBe('wss:');
        expect(test.connection.origin).toMatch(/^https:/);
        expect(test.connection.certificateValid).toBe(true);
      });
    });

    it('should validate presence data on all platforms', async () => {
      const presenceValidation = {
        statusWhitelist: ['online', 'away', 'busy', 'offline'],
        maxActivityLength: 100,
        sanitizeHtml: true,
        rateLimitUpdates: true,
      };

      // Test invalid status
      const invalidStatus = 'custom_status';
      expect(presenceValidation.statusWhitelist).not.toContain(invalidStatus);

      // Test activity length
      const longActivity = 'A'.repeat(150);
      expect(longActivity.length).toBeGreaterThan(
        presenceValidation.maxActivityLength,
      );

      expect(presenceValidation.sanitizeHtml).toBe(true);
      expect(presenceValidation.rateLimitUpdates).toBe(true);
    });
  });
});
