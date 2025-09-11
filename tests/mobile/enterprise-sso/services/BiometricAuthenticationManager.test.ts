/**
 * WS-251: Mobile Enterprise SSO - BiometricAuthenticationManager Tests
 * Comprehensive tests for WebAuthn/biometric authentication
 */

import { jest } from '@jest/globals';
import { BiometricAuthenticationManager } from '../../../../src/components/mobile/enterprise-auth/BiometricAuthenticationManager';
import '../mocks/webauthn.mock';
import '../mocks/indexeddb.mock';
import '../mocks/crypto.mock';
import { mockWebAuthnError, mockWebAuthnSuccess, mockWebAuthnUnavailable, restoreWebAuthnMocks } from '../mocks/webauthn.mock';
import { createMockObjectStore, clearMockDatabase } from '../mocks/indexeddb.mock';

describe('BiometricAuthenticationManager', () => {
  let manager: BiometricAuthenticationManager;
  const weddingId = 'wedding-123';
  const vendorId = 'vendor-456';

  beforeEach(() => {
    manager = new BiometricAuthenticationManager(weddingId, vendorId);
    restoreWebAuthnMocks();
    clearMockDatabase('WedSyncAuth');
    
    // Mock console methods
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('Availability Detection', () => {
    it('should detect WebAuthn availability', async () => {
      const isAvailable = await manager.isAvailable();
      
      expect(isAvailable).toBe(true);
      expect(global.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable).toHaveBeenCalled();
    });

    it('should handle WebAuthn unavailability', async () => {
      mockWebAuthnUnavailable();
      
      const isAvailable = await manager.isAvailable();
      
      expect(isAvailable).toBe(false);
    });

    it('should detect platform authenticator support', async () => {
      global.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable = jest.fn().mockResolvedValue(true);
      
      const hasSupport = await manager.hasPlatformAuthenticatorSupport();
      
      expect(hasSupport).toBe(true);
    });

    it('should detect conditional mediation support', async () => {
      global.PublicKeyCredential.isConditionalMediationAvailable = jest.fn().mockResolvedValue(true);
      
      const hasSupport = await manager.hasConditionalMediationSupport();
      
      expect(hasSupport).toBe(true);
    });
  });

  describe('Credential Registration', () => {
    it('should register new biometric credentials successfully', async () => {
      const mockRequest = {
        result: null,
        onupgradeneeded: null,
        onsuccess: null,
        onerror: null
      };

      // Mock IndexedDB open
      global.indexedDB.open = jest.fn().mockImplementation(() => {
        setTimeout(() => {
          if (mockRequest.onupgradeneeded) {
            mockRequest.onupgradeneeded({ target: mockRequest, oldVersion: 0, newVersion: 1 });
          }
          mockRequest.result = {
            createObjectStore: jest.fn().mockReturnValue({
              createIndex: jest.fn()
            })
          };
          if (mockRequest.onsuccess) {
            mockRequest.onsuccess({ target: mockRequest });
          }
        }, 0);
        return mockRequest;
      });

      const result = await manager.register({
        userId: 'user-123',
        userName: 'John Smith',
        displayName: 'John Smith - Smith Photography'
      });

      expect(result.success).toBe(true);
      expect(result.credentialId).toBeDefined();
      expect(result.credentialId).toMatch(/^mock-credential-id-/);
    });

    it('should handle registration errors', async () => {
      mockWebAuthnError('NotSupportedError');

      const result = await manager.register({
        userId: 'user-123',
        userName: 'John Smith',
        displayName: 'John Smith'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('biometric_not_supported');
      expect(result.message).toContain('not supported');
    });

    it('should handle user cancellation', async () => {
      mockWebAuthnError('AbortError');

      const result = await manager.register({
        userId: 'user-123',
        userName: 'John Smith',
        displayName: 'John Smith'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('user_cancelled');
    });

    it('should store credential metadata', async () => {
      const mockDB = {
        transaction: jest.fn().mockReturnValue({
          objectStore: jest.fn().mockReturnValue({
            add: jest.fn().mockReturnValue({
              onsuccess: null,
              onerror: null
            })
          })
        })
      };

      global.indexedDB.open = jest.fn().mockImplementation(() => {
        const request = {
          result: mockDB,
          onsuccess: null,
          onerror: null,
          onupgradeneeded: null
        };
        setTimeout(() => {
          if (request.onsuccess) request.onsuccess({ target: request });
        }, 0);
        return request;
      });

      await manager.register({
        userId: 'user-123',
        userName: 'John Smith',
        displayName: 'John Smith'
      });

      expect(mockDB.transaction).toHaveBeenCalledWith(['credentials'], 'readwrite');
    });
  });

  describe('Authentication', () => {
    beforeEach(async () => {
      // Setup a registered credential first
      await manager.register({
        userId: 'user-123',
        userName: 'John Smith',
        displayName: 'John Smith'
      });
    });

    it('should authenticate successfully with existing credentials', async () => {
      const result = await manager.authenticate({
        userVerification: 'required',
        allowCredentials: ['mock-credential-id-existing']
      });

      expect(result.success).toBe(true);
      expect(result.credentialId).toBe('mock-credential-id-existing');
      expect(result.userHandle).toBeDefined();
    });

    it('should handle authentication failure', async () => {
      mockWebAuthnError('NotAllowedError');

      const result = await manager.authenticate({
        userVerification: 'required'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('authentication_failed');
    });

    it('should handle timeout errors', async () => {
      mockWebAuthnError('TimeoutError');

      const result = await manager.authenticate({
        userVerification: 'required',
        timeout: 30000
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('timeout');
    });

    it('should validate credential against stored data', async () => {
      // Mock stored credentials
      const mockDB = {
        transaction: jest.fn().mockReturnValue({
          objectStore: jest.fn().mockReturnValue({
            get: jest.fn().mockReturnValue({
              onsuccess: null,
              onerror: null,
              result: {
                id: 'mock-credential-id-existing',
                userId: 'user-123',
                counter: 0,
                lastUsed: Date.now() - 60000
              }
            })
          })
        })
      };

      global.indexedDB.open = jest.fn().mockImplementation(() => {
        const request = {
          result: mockDB,
          onsuccess: null,
          onerror: null
        };
        setTimeout(() => {
          if (request.onsuccess) request.onsuccess({ target: request });
        }, 0);
        return request;
      });

      const result = await manager.authenticate({
        userVerification: 'required'
      });

      expect(result.success).toBe(true);
      expect(mockDB.transaction).toHaveBeenCalledWith(['credentials'], 'readonly');
    });
  });

  describe('Wedding Day Features', () => {
    it('should handle emergency wedding access', async () => {
      const result = await manager.authenticateEmergency({
        weddingId,
        emergencyCode: 'WEDDING123',
        requestReason: 'Vendor needs urgent access to photo gallery'
      });

      expect(result.success).toBe(true);
      expect(result.accessLevel).toBe('emergency');
      expect(result.restrictions).toContain('photo_upload_only');
    });

    it('should validate emergency access codes', async () => {
      const result = await manager.authenticateEmergency({
        weddingId,
        emergencyCode: 'INVALID',
        requestReason: 'Test access'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('invalid_emergency_code');
    });

    it('should enforce wedding day time restrictions', async () => {
      // Mock wedding date as today
      const mockWeddingDate = new Date();
      mockWeddingDate.setHours(14, 0, 0, 0); // 2 PM wedding

      // Mock current time as 3 hours before wedding
      jest.useFakeTimers();
      const mockNow = new Date(mockWeddingDate.getTime() - 3 * 60 * 60 * 1000);
      jest.setSystemTime(mockNow);

      const result = await manager.authenticate({
        userVerification: 'required',
        weddingDayMode: true,
        weddingDate: mockWeddingDate
      });

      expect(result.weddingDayContext).toEqual({
        isWeddingDay: true,
        hoursUntilWedding: 3,
        accessLevel: 'pre_wedding'
      });

      jest.useRealTimers();
    });

    it('should provide different access levels during wedding day', async () => {
      const mockWeddingDate = new Date();
      mockWeddingDate.setHours(14, 0, 0, 0);

      // Mock time during wedding ceremony
      jest.useFakeTimers();
      const mockNow = new Date(mockWeddingDate.getTime() + 30 * 60 * 1000); // 30 minutes after start
      jest.setSystemTime(mockNow);

      const result = await manager.authenticate({
        userVerification: 'required',
        weddingDayMode: true,
        weddingDate: mockWeddingDate
      });

      expect(result.weddingDayContext?.accessLevel).toBe('during_wedding');
      expect(result.weddingDayContext?.restrictions).toContain('silent_mode');

      jest.useRealTimers();
    });
  });

  describe('Security Features', () => {
    it('should enforce rate limiting', async () => {
      // Attempt multiple authentications rapidly
      const promises = Array.from({ length: 6 }, () =>
        manager.authenticate({ userVerification: 'required' })
      );

      const results = await Promise.all(promises);
      
      // Last attempt should be rate limited
      const lastResult = results[results.length - 1];
      expect(lastResult.success).toBe(false);
      expect(lastResult.error).toBe('rate_limit_exceeded');
    });

    it('should detect and handle replay attacks', async () => {
      const firstAuth = await manager.authenticate({
        userVerification: 'required'
      });

      // Attempt to replay the same authentication
      const replayAttempt = await manager.authenticate({
        userVerification: 'required',
        allowCredentials: [firstAuth.credentialId!]
      });

      // Should be detected and handled appropriately
      expect(replayAttempt.securityFlags).toContain('potential_replay');
    });

    it('should log security events', async () => {
      const consoleSpy = jest.spyOn(console, 'log');

      await manager.authenticate({
        userVerification: 'required'
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('BIOMETRIC_AUTH'),
        expect.objectContaining({
          event: 'authentication_attempt',
          weddingId,
          vendorId,
          timestamp: expect.any(Number)
        })
      );
    });

    it('should handle device trust verification', async () => {
      const result = await manager.verifyDeviceTrust({
        deviceId: 'device-123',
        expectedFingerprint: 'mock-fingerprint',
        requireTrustedDevice: true
      });

      expect(result.trusted).toBe(true);
      expect(result.trustLevel).toBe('high');
    });

    it('should enforce counter verification for registered credentials', async () => {
      // Mock credential with counter
      const mockCredential = {
        id: 'cred-123',
        counter: 5,
        lastUsed: Date.now() - 60000
      };

      const result = await manager.verifyCredentialCounter(mockCredential, 6);
      
      expect(result.valid).toBe(true);
      expect(result.counterIncreased).toBe(true);
    });
  });

  describe('Offline Support', () => {
    beforeEach(() => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });
    });

    it('should handle offline authentication', async () => {
      const result = await manager.authenticateOffline({
        credentialId: 'cached-cred-123',
        cachedCredentials: {
          id: 'cached-cred-123',
          userId: 'user-123',
          publicKey: 'mock-public-key',
          counter: 5
        }
      });

      expect(result.success).toBe(true);
      expect(result.offline).toBe(true);
      expect(result.syncRequired).toBe(true);
    });

    it('should cache authentication data for offline use', async () => {
      // First authenticate online
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
      });

      await manager.authenticate({
        userVerification: 'required'
      });

      // Verify data was cached
      const cachedData = await manager.getCachedAuthData();
      
      expect(cachedData).toBeDefined();
      expect(cachedData.credentials).toBeDefined();
      expect(cachedData.cachedAt).toBeDefined();
    });

    it('should sync offline authentication when back online', async () => {
      // Authenticate offline first
      await manager.authenticateOffline({
        credentialId: 'cached-cred-123',
        cachedCredentials: {
          id: 'cached-cred-123',
          userId: 'user-123',
          publicKey: 'mock-public-key',
          counter: 5
        }
      });

      // Go back online
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
      });

      const syncResult = await manager.syncOfflineAuthentications();
      
      expect(syncResult.success).toBe(true);
      expect(syncResult.syncedCount).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle IndexedDB errors gracefully', async () => {
      global.indexedDB.open = jest.fn().mockImplementation(() => {
        const request = {
          result: null,
          error: new Error('IndexedDB error'),
          onsuccess: null,
          onerror: null
        };
        setTimeout(() => {
          if (request.onerror) request.onerror({ target: request });
        }, 0);
        return request;
      });

      const result = await manager.register({
        userId: 'user-123',
        userName: 'John Smith',
        displayName: 'John Smith'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('storage_error');
    });

    it('should handle crypto operations failures', async () => {
      // Mock crypto.subtle.digest to fail
      jest.spyOn(global.crypto.subtle, 'digest').mockRejectedValue(
        new Error('Crypto operation failed')
      );

      const result = await manager.authenticate({
        userVerification: 'required'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('crypto_error');
    });

    it('should provide detailed error information', async () => {
      mockWebAuthnError('SecurityError');

      const result = await manager.authenticate({
        userVerification: 'required'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('security_error');
      expect(result.details).toBeDefined();
      expect(result.details.originalError).toBe('SecurityError');
    });
  });

  describe('Credential Management', () => {
    it('should list stored credentials', async () => {
      // Register multiple credentials
      await manager.register({
        userId: 'user-123',
        userName: 'John Smith',
        displayName: 'John Smith - Device 1'
      });

      await manager.register({
        userId: 'user-123',
        userName: 'John Smith',
        displayName: 'John Smith - Device 2'
      });

      const credentials = await manager.listCredentials('user-123');
      
      expect(credentials.length).toBe(2);
      expect(credentials[0]).toHaveProperty('id');
      expect(credentials[0]).toHaveProperty('displayName');
      expect(credentials[0]).toHaveProperty('lastUsed');
    });

    it('should remove credentials', async () => {
      const registration = await manager.register({
        userId: 'user-123',
        userName: 'John Smith',
        displayName: 'John Smith'
      });

      const removed = await manager.removeCredential(registration.credentialId!);
      
      expect(removed).toBe(true);

      const credentials = await manager.listCredentials('user-123');
      expect(credentials.length).toBe(0);
    });

    it('should update credential metadata', async () => {
      const registration = await manager.register({
        userId: 'user-123',
        userName: 'John Smith',
        displayName: 'John Smith'
      });

      const updated = await manager.updateCredentialMetadata(registration.credentialId!, {
        displayName: 'John Smith - Updated Device',
        lastUsed: Date.now(),
        trusted: true
      });

      expect(updated).toBe(true);
    });
  });

  describe('Wedding Industry Integration', () => {
    it('should handle vendor role-based authentication', async () => {
      const result = await manager.authenticate({
        userVerification: 'required',
        vendorRole: 'photographer',
        weddingContext: {
          weddingId,
          permissions: ['photo_upload', 'gallery_access']
        }
      });

      expect(result.success).toBe(true);
      expect(result.vendorContext).toEqual({
        role: 'photographer',
        permissions: ['photo_upload', 'gallery_access'],
        weddingId
      });
    });

    it('should validate wedding permissions', async () => {
      const result = await manager.validateWeddingPermissions({
        weddingId,
        vendorId,
        requiredPermissions: ['timeline_edit', 'guest_management']
      });

      expect(result.valid).toBe(true);
      expect(result.grantedPermissions).toContain('timeline_edit');
      expect(result.grantedPermissions).toContain('guest_management');
    });

    it('should handle multi-vendor authentication', async () => {
      const result = await manager.authenticateVendorTeam({
        weddingId,
        teamMembers: [
          { vendorId: 'vendor-1', role: 'photographer' },
          { vendorId: 'vendor-2', role: 'coordinator' }
        ]
      });

      expect(result.success).toBe(true);
      expect(result.authenticatedMembers).toHaveLength(2);
    });
  });
});