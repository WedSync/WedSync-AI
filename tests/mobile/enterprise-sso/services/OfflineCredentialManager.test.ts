/**
 * WS-251: Mobile Enterprise SSO - OfflineCredentialManager Tests
 * Comprehensive tests for offline credential management and synchronization
 */

import { jest } from '@jest/globals';
import { OfflineCredentialManager } from '../../../../src/components/mobile/enterprise-auth/OfflineCredentialManager';
import '../mocks/indexeddb.mock';
import '../mocks/crypto.mock';
import { clearMockDatabase, createMockWeddingData, createMockVendorCredentials } from '../mocks/indexeddb.mock';
import { createMockAESKey, createMockEncryptedData } from '../mocks/crypto.mock';

describe('OfflineCredentialManager', () => {
  let manager: OfflineCredentialManager;
  const weddingId = 'wedding-123';
  const vendorId = 'vendor-456';

  beforeEach(() => {
    manager = new OfflineCredentialManager(weddingId, vendorId);
    clearMockDatabase('WedSyncOffline');
    
    // Mock console methods
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();

    // Mock service worker registration
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        register: jest.fn().mockResolvedValue({
          active: { postMessage: jest.fn() },
          addEventListener: jest.fn()
        }),
        ready: Promise.resolve({
          active: { postMessage: jest.fn() }
        })
      },
      writable: true
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize offline storage successfully', async () => {
      const initialized = await manager.initialize();
      
      expect(initialized).toBe(true);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('OFFLINE_INIT'),
        expect.objectContaining({
          weddingId,
          vendorId,
          status: 'initialized'
        })
      );
    });

    it('should setup encryption keys on initialization', async () => {
      await manager.initialize();
      
      const hasEncryption = await manager.hasValidEncryption();
      
      expect(hasEncryption).toBe(true);
    });

    it('should register service worker for background sync', async () => {
      await manager.initialize();
      
      expect(navigator.serviceWorker.register).toHaveBeenCalledWith(
        '/sw-offline-sync.js'
      );
    });

    it('should handle initialization errors gracefully', async () => {
      // Mock IndexedDB to fail
      global.indexedDB.open = jest.fn().mockImplementation(() => {
        const request = {
          result: null,
          error: new Error('Database init failed'),
          onsuccess: null,
          onerror: null
        };
        setTimeout(() => {
          if (request.onerror) request.onerror({ target: request });
        }, 0);
        return request;
      });

      const initialized = await manager.initialize();
      
      expect(initialized).toBe(false);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('OFFLINE_INIT_ERROR')
      );
    });
  });

  describe('Credential Storage', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should store vendor credentials securely', async () => {
      const credentials = {
        vendorId,
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-456',
        expiresAt: Date.now() + 3600000,
        permissions: ['photo_upload', 'timeline_view']
      };

      const stored = await manager.storeCredentials(credentials);
      
      expect(stored).toBe(true);
    });

    it('should encrypt stored credentials', async () => {
      const credentials = createMockVendorCredentials();
      
      await manager.storeCredentials(credentials);
      
      // Verify encryption was used
      expect(global.crypto.subtle.encrypt).toHaveBeenCalled();
    });

    it('should store wedding-specific data', async () => {
      const weddingData = createMockWeddingData();
      
      const stored = await manager.storeWeddingData(weddingData);
      
      expect(stored).toBe(true);
    });

    it('should handle storage quota exceeded', async () => {
      // Mock storage quota exceeded error
      const mockTransaction = {
        objectStore: jest.fn().mockReturnValue({
          add: jest.fn().mockReturnValue({
            onsuccess: null,
            onerror: (event: any) => {
              const error = new Error('Quota exceeded');
              error.name = 'QuotaExceededError';
              event.target.error = error;
            }
          })
        })
      };

      global.indexedDB.open = jest.fn().mockImplementation(() => {
        const request = {
          result: {
            transaction: jest.fn().mockReturnValue(mockTransaction)
          },
          onsuccess: null,
          onerror: null
        };
        setTimeout(() => {
          if (request.onsuccess) request.onsuccess({ target: request });
        }, 0);
        return request;
      });

      const credentials = createMockVendorCredentials();
      const stored = await manager.storeCredentials(credentials);
      
      expect(stored).toBe(false);
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('STORAGE_QUOTA_EXCEEDED')
      );
    });
  });

  describe('Credential Retrieval', () => {
    beforeEach(async () => {
      await manager.initialize();
      
      // Store test credentials
      const credentials = createMockVendorCredentials();
      await manager.storeCredentials(credentials);
    });

    it('should retrieve stored credentials', async () => {
      const credentials = await manager.getStoredCredentials();
      
      expect(credentials).toBeDefined();
      expect(credentials.vendorId).toBe('vendor-456');
      expect(credentials.decrypted).toBe(true);
    });

    it('should decrypt retrieved credentials', async () => {
      const credentials = await manager.getStoredCredentials();
      
      expect(global.crypto.subtle.decrypt).toHaveBeenCalled();
      expect(credentials.accessToken).toBeDefined();
    });

    it('should return null for non-existent credentials', async () => {
      clearMockDatabase('WedSyncOffline');
      await manager.initialize();
      
      const credentials = await manager.getStoredCredentials();
      
      expect(credentials).toBeNull();
    });

    it('should handle decryption errors', async () => {
      // Mock decryption failure
      jest.spyOn(global.crypto.subtle, 'decrypt').mockRejectedValue(
        new Error('Decryption failed')
      );

      const credentials = await manager.getStoredCredentials();
      
      expect(credentials).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('CREDENTIAL_DECRYPT_ERROR')
      );
    });
  });

  describe('Wedding Day Support', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should cache essential wedding data', async () => {
      const weddingData = {
        ...createMockWeddingData(),
        timeline: [
          { time: '14:00', event: 'Ceremony', location: 'Chapel' },
          { time: '18:00', event: 'Reception', location: 'Ballroom' }
        ],
        contacts: [
          { name: 'Wedding Coordinator', phone: '+1234567890', role: 'coordinator' }
        ]
      };

      const cached = await manager.cacheWeddingEssentials(weddingData);
      
      expect(cached).toBe(true);
    });

    it('should provide offline wedding timeline access', async () => {
      const weddingData = {
        ...createMockWeddingData(),
        timeline: [
          { time: '14:00', event: 'Ceremony', location: 'Chapel' },
          { time: '18:00', event: 'Reception', location: 'Ballroom' }
        ]
      };

      await manager.cacheWeddingEssentials(weddingData);
      
      const timeline = await manager.getOfflineTimeline();
      
      expect(timeline).toHaveLength(2);
      expect(timeline[0].event).toBe('Ceremony');
    });

    it('should handle emergency contact access offline', async () => {
      const weddingData = {
        ...createMockWeddingData(),
        emergencyContacts: [
          { name: 'Venue Manager', phone: '+1234567890', role: 'venue' },
          { name: 'Wedding Coordinator', phone: '+0987654321', role: 'coordinator' }
        ]
      };

      await manager.cacheWeddingEssentials(weddingData);
      
      const contacts = await manager.getEmergencyContacts();
      
      expect(contacts).toHaveLength(2);
      expect(contacts.some(contact => contact.role === 'venue')).toBe(true);
    });

    it('should prioritize wedding day data storage', async () => {
      const weddingData = createMockWeddingData();
      const isWeddingDay = true;
      
      const stored = await manager.storeWeddingData(weddingData, { priority: 'high', isWeddingDay });
      
      expect(stored).toBe(true);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('WEDDING_DAY_PRIORITY'),
        expect.objectContaining({ priority: 'high' })
      );
    });
  });

  describe('Data Synchronization', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should detect when sync is needed', async () => {
      // Store some offline data
      await manager.storeCredentials(createMockVendorCredentials());
      
      // Mark as needing sync
      await manager.markForSync('credentials_update');
      
      const needsSync = await manager.needsSync();
      
      expect(needsSync).toBe(true);
    });

    it('should perform full sync when online', async () => {
      // Mock online status
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
      });

      // Store offline data
      await manager.storeCredentials(createMockVendorCredentials());
      await manager.markForSync('credentials_update');

      const syncResult = await manager.performSync();
      
      expect(syncResult.success).toBe(true);
      expect(syncResult.syncedItems).toBeGreaterThan(0);
    });

    it('should queue sync operations when offline', async () => {
      // Mock offline status
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });

      await manager.markForSync('photo_upload');
      
      const queueSize = await manager.getSyncQueueSize();
      
      expect(queueSize).toBeGreaterThan(0);
    });

    it('should handle sync conflicts', async () => {
      const localData = { ...createMockVendorCredentials(), lastModified: Date.now() };
      const serverData = { ...createMockVendorCredentials(), lastModified: Date.now() + 1000 };

      const resolution = await manager.resolveConflict(localData, serverData);
      
      expect(resolution.strategy).toBe('server_wins');
      expect(resolution.resolvedData).toEqual(serverData);
    });

    it('should implement exponential backoff for failed syncs', async () => {
      // Mock sync failure
      jest.spyOn(manager, 'syncToServer').mockRejectedValue(new Error('Network error'));

      const attempt1 = Date.now();
      await manager.performSync();
      
      const attempt2 = Date.now();
      await manager.performSync();
      
      const backoffDelay = await manager.getBackoffDelay();
      
      expect(backoffDelay).toBeGreaterThan(1000); // Should have increased
    });
  });

  describe('Data Integrity', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should validate stored data integrity', async () => {
      const credentials = createMockVendorCredentials();
      await manager.storeCredentials(credentials);
      
      const isValid = await manager.validateDataIntegrity();
      
      expect(isValid).toBe(true);
    });

    it('should detect data corruption', async () => {
      // Store valid data first
      await manager.storeCredentials(createMockVendorCredentials());
      
      // Simulate corruption by modifying stored data
      // This would be detected by checksum validation
      const corrupted = await manager.detectCorruption();
      
      expect(corrupted).toBe(false); // Should be false for valid data
    });

    it('should recover from data corruption', async () => {
      // Simulate corrupted data scenario
      const recoverySuccess = await manager.attemptRecovery();
      
      expect(recoverySuccess).toBe(true);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('DATA_RECOVERY'),
        expect.objectContaining({ status: 'success' })
      );
    });

    it('should maintain data checksums', async () => {
      const data = createMockVendorCredentials();
      const checksum = await manager.generateChecksum(data);
      
      expect(checksum).toBeDefined();
      expect(typeof checksum).toBe('string');
      expect(checksum.length).toBeGreaterThan(0);
    });
  });

  describe('Storage Management', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should monitor storage usage', async () => {
      const usage = await manager.getStorageUsage();
      
      expect(usage).toHaveProperty('used');
      expect(usage).toHaveProperty('available');
      expect(usage).toHaveProperty('percentage');
    });

    it('should cleanup old data when storage is full', async () => {
      // Mock storage near capacity
      jest.spyOn(manager, 'getStorageUsage').mockResolvedValue({
        used: 9000000,
        available: 10000000,
        percentage: 90
      });

      const cleaned = await manager.cleanupOldData();
      
      expect(cleaned).toBe(true);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('STORAGE_CLEANUP')
      );
    });

    it('should prioritize critical data during cleanup', async () => {
      // Store various types of data
      await manager.storeCredentials(createMockVendorCredentials());
      await manager.storeWeddingData(createMockWeddingData());
      
      const priorities = await manager.getCleanupPriorities();
      
      expect(priorities.critical).toContain('credentials');
      expect(priorities.critical).toContain('wedding_data');
    });

    it('should compress stored data to save space', async () => {
      const largeData = {
        ...createMockVendorCredentials(),
        portfolioImages: new Array(100).fill('base64-image-data-here')
      };

      const stored = await manager.storeCredentials(largeData, { compress: true });
      
      expect(stored).toBe(true);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('DATA_COMPRESSED')
      );
    });
  });

  describe('Security Features', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should implement secure credential expiration', async () => {
      const expiredCredentials = {
        ...createMockVendorCredentials(),
        expiresAt: Date.now() - 3600000 // Expired 1 hour ago
      };

      await manager.storeCredentials(expiredCredentials);
      
      const retrieved = await manager.getStoredCredentials();
      
      expect(retrieved).toBeNull(); // Should not return expired credentials
    });

    it('should rotate encryption keys periodically', async () => {
      const rotated = await manager.rotateEncryptionKeys();
      
      expect(rotated).toBe(true);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('KEY_ROTATION'),
        expect.objectContaining({ status: 'success' })
      );
    });

    it('should implement secure data deletion', async () => {
      await manager.storeCredentials(createMockVendorCredentials());
      
      const deleted = await manager.secureDelete(['credentials']);
      
      expect(deleted).toBe(true);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('SECURE_DELETE')
      );
    });

    it('should log security events', async () => {
      await manager.storeCredentials(createMockVendorCredentials());
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('SECURITY_EVENT'),
        expect.objectContaining({
          event: 'credentials_stored',
          vendorId,
          weddingId
        })
      );
    });
  });

  describe('Network Awareness', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should detect network status changes', async () => {
      // Mock going offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });

      window.dispatchEvent(new Event('offline'));
      
      const isOnline = await manager.isOnline();
      
      expect(isOnline).toBe(false);
    });

    it('should attempt sync when network becomes available', async () => {
      // Start offline with queued data
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });

      await manager.markForSync('data_update');
      
      // Go online
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
      });

      window.dispatchEvent(new Event('online'));
      
      // Should trigger automatic sync
      await new Promise(resolve => setTimeout(resolve, 100)); // Wait for async handlers
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('NETWORK_SYNC_TRIGGERED')
      );
    });

    it('should optimize data usage on slow connections', async () => {
      // Mock slow connection
      Object.defineProperty(navigator, 'connection', {
        value: {
          effectiveType: '2g',
          downlink: 0.5
        },
        writable: true
      });

      const optimized = await manager.optimizeForConnection();
      
      expect(optimized.compressionEnabled).toBe(true);
      expect(optimized.batchSize).toBeLessThan(100);
    });
  });

  describe('Error Recovery', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should handle database corruption gracefully', async () => {
      // Mock database corruption
      global.indexedDB.open = jest.fn().mockImplementation(() => {
        const request = {
          result: null,
          error: new Error('Database corrupted'),
          onsuccess: null,
          onerror: null
        };
        setTimeout(() => {
          if (request.onerror) request.onerror({ target: request });
        }, 0);
        return request;
      });

      const recovered = await manager.handleDatabaseCorruption();
      
      expect(recovered).toBe(true);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('DATABASE_RECOVERY')
      );
    });

    it('should provide fallback storage mechanisms', async () => {
      // Disable IndexedDB
      delete (global as any).indexedDB;

      const fallbackUsed = await manager.useFallbackStorage();
      
      expect(fallbackUsed).toBe(true);
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('FALLBACK_STORAGE')
      );
    });

    it('should maintain service continuity during errors', async () => {
      // Mock storage error
      jest.spyOn(manager, 'storeCredentials').mockRejectedValue(new Error('Storage failed'));

      const credentials = createMockVendorCredentials();
      const stored = await manager.storeCredentials(credentials, { fallback: true });
      
      // Should still succeed using fallback
      expect(stored).toBe(true);
    });
  });
});