/**
 * WS-251: Mobile Enterprise SSO - CrossPlatformAuthSync Tests
 * Tests for cross-platform authentication synchronization
 */

import { jest } from '@jest/globals';
import { CrossPlatformAuthSync } from '../../../../src/components/mobile/enterprise-auth/CrossPlatformAuthSync';
import '../mocks/indexeddb.mock';
import '../mocks/crypto.mock';
import { clearMockDatabase } from '../mocks/indexeddb.mock';
import { createMockAESKey } from '../mocks/crypto.mock';

describe('CrossPlatformAuthSync', () => {
  let syncManager: CrossPlatformAuthSync;
  const weddingId = 'wedding-123';
  const vendorId = 'vendor-456';
  const deviceId = 'device-789';

  beforeEach(() => {
    syncManager = new CrossPlatformAuthSync(weddingId, vendorId, deviceId);
    clearMockDatabase('WedSyncCrossPlatform');
    
    // Mock console methods
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();

    // Mock WebSocket
    global.WebSocket = jest.fn().mockImplementation(() => ({
      send: jest.fn(),
      close: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      readyState: 1, // OPEN
      CONNECTING: 0,
      OPEN: 1,
      CLOSING: 2,
      CLOSED: 3,
    }));

    // Mock Broadcast Channel
    global.BroadcastChannel = jest.fn().mockImplementation(() => ({
      postMessage: jest.fn(),
      close: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize cross-platform sync successfully', async () => {
      const initialized = await syncManager.initialize();
      
      expect(initialized).toBe(true);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('CROSS_PLATFORM_INIT'),
        expect.objectContaining({
          weddingId,
          vendorId,
          deviceId,
          status: 'initialized'
        })
      );
    });

    it('should establish secure sync channels', async () => {
      await syncManager.initialize();
      
      const channels = await syncManager.getActiveChannels();
      
      expect(channels).toContain('websocket');
      expect(channels).toContain('broadcast');
    });

    it('should register device fingerprint', async () => {
      await syncManager.initialize();
      
      const fingerprint = await syncManager.getDeviceFingerprint();
      
      expect(fingerprint).toBeDefined();
      expect(fingerprint.deviceId).toBe(deviceId);
      expect(fingerprint.browser).toBeDefined();
      expect(fingerprint.platform).toBeDefined();
    });
  });

  describe('Session Synchronization', () => {
    beforeEach(async () => {
      await syncManager.initialize();
    });

    it('should sync authentication session across devices', async () => {
      const sessionData = {
        userId: 'user-123',
        accessToken: 'token-abc',
        refreshToken: 'refresh-xyz',
        expiresAt: Date.now() + 3600000,
        permissions: ['photo_upload', 'timeline_view']
      };

      const synced = await syncManager.syncSession(sessionData);
      
      expect(synced).toBe(true);
      expect(global.WebSocket).toHaveBeenCalled();
    });

    it('should handle session updates from other devices', async () => {
      const sessionUpdate = {
        type: 'session_update',
        deviceId: 'other-device-456',
        sessionData: {
          userId: 'user-123',
          permissions: ['photo_upload', 'timeline_view', 'gallery_edit']
        },
        timestamp: Date.now()
      };

      const onSessionUpdate = jest.fn();
      syncManager.onSessionUpdate(onSessionUpdate);

      // Simulate receiving update from another device
      await syncManager.handleIncomingSync(sessionUpdate);
      
      expect(onSessionUpdate).toHaveBeenCalledWith(sessionUpdate.sessionData);
    });

    it('should encrypt session data during sync', async () => {
      const sessionData = {
        userId: 'user-123',
        accessToken: 'sensitive-token'
      };

      await syncManager.syncSession(sessionData);
      
      expect(global.crypto.subtle.encrypt).toHaveBeenCalled();
    });

    it('should handle sync conflicts with last-write-wins strategy', async () => {
      const localSession = {
        userId: 'user-123',
        lastModified: Date.now()
      };
      
      const remoteSession = {
        userId: 'user-123',
        lastModified: Date.now() + 1000 // 1 second later
      };

      const resolution = await syncManager.resolveConflict(localSession, remoteSession);
      
      expect(resolution.winner).toBe('remote');
      expect(resolution.resolvedData).toEqual(remoteSession);
    });
  });

  describe('Real-time Communication', () => {
    beforeEach(async () => {
      await syncManager.initialize();
    });

    it('should establish WebSocket connection for real-time sync', async () => {
      const connected = await syncManager.connectWebSocket();
      
      expect(connected).toBe(true);
      expect(global.WebSocket).toHaveBeenCalledWith(
        expect.stringContaining('wss://'),
        expect.arrayContaining(['wedsync-sync'])
      );
    });

    it('should handle WebSocket disconnection and reconnect', async () => {
      await syncManager.connectWebSocket();
      
      // Simulate disconnect
      const mockWs = new (global.WebSocket as jest.Mock)();
      const disconnectHandler = mockWs.addEventListener.mock.calls
        .find(([event]: any) => event === 'close')?.[1];
      
      if (disconnectHandler) {
        disconnectHandler({ code: 1006, reason: 'Connection lost' });
      }

      // Should attempt reconnection
      await new Promise(resolve => setTimeout(resolve, 1100)); // Wait for reconnect delay
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('WEBSOCKET_RECONNECT_ATTEMPT')
      );
    });

    it('should use BroadcastChannel for same-origin tab sync', async () => {
      const tabSynced = await syncManager.syncWithTabs({
        userId: 'user-123',
        action: 'login',
        timestamp: Date.now()
      });
      
      expect(tabSynced).toBe(true);
      expect(global.BroadcastChannel).toHaveBeenCalledWith('wedsync-auth-sync');
    });

    it('should handle tab visibility changes', async () => {
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        writable: true
      });

      const visibilityHandler = jest.fn();
      syncManager.onVisibilityChange(visibilityHandler);

      // Simulate tab becoming visible
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        writable: true
      });

      document.dispatchEvent(new Event('visibilitychange'));
      
      expect(visibilityHandler).toHaveBeenCalledWith('visible');
    });
  });

  describe('Wedding Team Coordination', () => {
    beforeEach(async () => {
      await syncManager.initialize();
    });

    it('should coordinate team member authentication', async () => {
      const teamMembers = [
        { vendorId: 'vendor-1', role: 'photographer', status: 'active' },
        { vendorId: 'vendor-2', role: 'coordinator', status: 'active' }
      ];

      const coordinated = await syncManager.coordinateTeamAuth(teamMembers);
      
      expect(coordinated).toBe(true);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('TEAM_AUTH_COORDINATED'),
        expect.objectContaining({ teamSize: 2 })
      );
    });

    it('should handle team member check-in synchronization', async () => {
      const checkInData = {
        vendorId: 'vendor-1',
        weddingId,
        location: { lat: 40.7128, lng: -74.0060 },
        timestamp: Date.now(),
        status: 'checked_in'
      };

      const synced = await syncManager.syncTeamCheckIn(checkInData);
      
      expect(synced).toBe(true);
    });

    it('should broadcast emergency alerts to team', async () => {
      const emergencyAlert = {
        type: 'emergency',
        message: 'Venue power outage - switch to backup plan',
        priority: 'high',
        weddingId,
        timestamp: Date.now()
      };

      const broadcasted = await syncManager.broadcastEmergencyAlert(emergencyAlert);
      
      expect(broadcasted).toBe(true);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('EMERGENCY_ALERT_SENT')
      );
    });

    it('should maintain team presence indicators', async () => {
      const presenceData = {
        vendorId,
        weddingId,
        isOnline: true,
        lastSeen: Date.now(),
        currentSection: 'photo_gallery'
      };

      await syncManager.updatePresence(presenceData);
      
      const teamPresence = await syncManager.getTeamPresence();
      
      expect(teamPresence[vendorId]).toEqual(
        expect.objectContaining({
          isOnline: true,
          currentSection: 'photo_gallery'
        })
      );
    });
  });

  describe('Offline Support', () => {
    beforeEach(async () => {
      await syncManager.initialize();
      
      // Mock offline status
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });
    });

    it('should queue sync operations when offline', async () => {
      const syncData = {
        type: 'session_update',
        data: { userId: 'user-123' },
        timestamp: Date.now()
      };

      const queued = await syncManager.queueForSync(syncData);
      
      expect(queued).toBe(true);
      
      const queueSize = await syncManager.getSyncQueueSize();
      expect(queueSize).toBe(1);
    });

    it('should process sync queue when back online', async () => {
      // Queue some operations while offline
      await syncManager.queueForSync({ type: 'login', userId: 'user-1' });
      await syncManager.queueForSync({ type: 'logout', userId: 'user-2' });

      // Go back online
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
      });

      window.dispatchEvent(new Event('online'));
      
      // Wait for queue processing
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('SYNC_QUEUE_PROCESSED')
      );
    });

    it('should store offline sync data securely', async () => {
      const syncData = { userId: 'user-123', sensitiveData: 'secret' };
      
      await syncManager.storeOfflineSync(syncData);
      
      expect(global.crypto.subtle.encrypt).toHaveBeenCalled();
    });

    it('should handle offline-online transitions gracefully', async () => {
      // Start offline
      const onlineHandler = jest.fn();
      syncManager.onConnectivityChange(onlineHandler);

      // Go online
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
      });

      window.dispatchEvent(new Event('online'));
      
      expect(onlineHandler).toHaveBeenCalledWith(true);
    });
  });

  describe('Security Features', () => {
    beforeEach(async () => {
      await syncManager.initialize();
    });

    it('should validate device trust before syncing', async () => {
      const untrustedDevice = {
        deviceId: 'unknown-device-999',
        fingerprint: 'suspicious-fingerprint'
      };

      const trusted = await syncManager.validateDeviceTrust(untrustedDevice);
      
      expect(trusted).toBe(false);
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('UNTRUSTED_DEVICE_REJECTED')
      );
    });

    it('should implement message authentication codes', async () => {
      const message = { userId: 'user-123', action: 'login' };
      
      const signedMessage = await syncManager.signMessage(message);
      
      expect(signedMessage.mac).toBeDefined();
      expect(signedMessage.message).toEqual(message);
    });

    it('should verify message integrity', async () => {
      const message = { userId: 'user-123', action: 'login' };
      const signedMessage = await syncManager.signMessage(message);
      
      const isValid = await syncManager.verifyMessage(signedMessage);
      
      expect(isValid).toBe(true);
    });

    it('should detect and reject replay attacks', async () => {
      const message = { userId: 'user-123', timestamp: Date.now() };
      
      // Process message first time
      await syncManager.processMessage(message);
      
      // Attempt replay
      const replayResult = await syncManager.processMessage(message);
      
      expect(replayResult.rejected).toBe(true);
      expect(replayResult.reason).toBe('replay_attack');
    });

    it('should rate limit sync requests', async () => {
      // Send multiple rapid requests
      const requests = Array.from({ length: 20 }, (_, i) => 
        syncManager.syncSession({ userId: 'user-123', requestId: i })
      );

      const results = await Promise.all(requests);
      const rateLimited = results.some(result => result === false);
      
      expect(rateLimited).toBe(true);
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('RATE_LIMIT_EXCEEDED')
      );
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await syncManager.initialize();
    });

    it('should handle WebSocket connection errors', async () => {
      // Mock WebSocket constructor to throw
      global.WebSocket = jest.fn().mockImplementation(() => {
        throw new Error('Connection failed');
      });

      const connected = await syncManager.connectWebSocket();
      
      expect(connected).toBe(false);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('WEBSOCKET_CONNECTION_ERROR')
      );
    });

    it('should handle malformed sync messages', async () => {
      const malformedMessage = { invalid: 'data', missing: 'required_fields' };
      
      const processed = await syncManager.handleIncomingSync(malformedMessage);
      
      expect(processed).toBe(false);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('INVALID_SYNC_MESSAGE')
      );
    });

    it('should implement exponential backoff for failed connections', async () => {
      // Mock connection failures
      let attemptCount = 0;
      global.WebSocket = jest.fn().mockImplementation(() => {
        attemptCount++;
        throw new Error(`Connection attempt ${attemptCount} failed`);
      });

      await syncManager.connectWebSocket();
      await syncManager.connectWebSocket();
      await syncManager.connectWebSocket();

      const backoffDelay = await syncManager.getBackoffDelay();
      
      expect(backoffDelay).toBeGreaterThan(2000); // Should have increased
    });

    it('should gracefully handle encryption errors', async () => {
      // Mock crypto failure
      jest.spyOn(global.crypto.subtle, 'encrypt').mockRejectedValue(
        new Error('Encryption failed')
      );

      const sessionData = { userId: 'user-123' };
      const synced = await syncManager.syncSession(sessionData);
      
      expect(synced).toBe(false);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('SYNC_ENCRYPTION_ERROR')
      );
    });
  });

  describe('Performance Optimization', () => {
    beforeEach(async () => {
      await syncManager.initialize();
    });

    it('should batch multiple sync operations', async () => {
      const operations = [
        { type: 'login', userId: 'user-1' },
        { type: 'permission_update', userId: 'user-1' },
        { type: 'checkin', userId: 'user-1' }
      ];

      const batched = await syncManager.batchOperations(operations);
      
      expect(batched).toBe(true);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('OPERATIONS_BATCHED'),
        expect.objectContaining({ count: 3 })
      );
    });

    it('should compress large sync payloads', async () => {
      const largeData = {
        userId: 'user-123',
        portfolioImages: new Array(100).fill('large-base64-image-data')
      };

      const compressed = await syncManager.compressPayload(largeData);
      
      expect(compressed.compressed).toBe(true);
      expect(compressed.originalSize).toBeGreaterThan(compressed.compressedSize);
    });

    it('should implement connection pooling for multiple weddings', async () => {
      const weddingIds = ['wedding-1', 'wedding-2', 'wedding-3'];
      
      const pooled = await syncManager.createConnectionPool(weddingIds);
      
      expect(pooled).toBe(true);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('CONNECTION_POOL_CREATED'),
        expect.objectContaining({ poolSize: 3 })
      );
    });

    it('should debounce rapid sync requests', async () => {
      const debounceSpy = jest.spyOn(syncManager, 'debouncedSync');
      
      // Rapid fire sync requests
      syncManager.syncSession({ userId: 'user-1' });
      syncManager.syncSession({ userId: 'user-1' });
      syncManager.syncSession({ userId: 'user-1' });
      
      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(debounceSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Wedding Day Features', () => {
    beforeEach(async () => {
      await syncManager.initialize();
    });

    it('should enable high-priority sync mode on wedding day', async () => {
      const weddingDayMode = await syncManager.enableWeddingDayMode();
      
      expect(weddingDayMode).toBe(true);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('WEDDING_DAY_MODE_ENABLED')
      );
    });

    it('should prioritize critical wedding data sync', async () => {
      await syncManager.enableWeddingDayMode();
      
      const criticalData = {
        type: 'timeline_update',
        urgency: 'high',
        weddingId,
        data: { nextEvent: 'Ceremony', timeRemaining: '10 minutes' }
      };

      const synced = await syncManager.syncWithPriority(criticalData);
      
      expect(synced).toBe(true);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('HIGH_PRIORITY_SYNC')
      );
    });

    it('should maintain redundant connections on wedding day', async () => {
      await syncManager.enableWeddingDayMode();
      
      const redundancyEstablished = await syncManager.establishRedundantConnections();
      
      expect(redundancyEstablished).toBe(true);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('REDUNDANT_CONNECTIONS_ACTIVE')
      );
    });
  });
});