import { jest } from '@jest/globals';
import { BiometricAuthService } from '../../../src/lib/security/BiometricAuthService';

// Mock Web Authentication API
const mockCredential = {
  id: 'credential-id-123',
  rawId: new ArrayBuffer(16),
  response: {
    clientDataJSON: new ArrayBuffer(32),
    authenticatorData: new ArrayBuffer(64),
    signature: new ArrayBuffer(32),
    attestationObject: new ArrayBuffer(128),
  },
  type: 'public-key',
  authenticatorAttachment: 'platform',
  getClientExtensionResults: jest.fn(() => ({})),
};

const mockNavigatorCredentials = {
  create: jest.fn(),
  get: jest.fn(),
};

Object.defineProperty(navigator, 'credentials', {
  value: mockNavigatorCredentials,
  writable: true,
});

// Mock PublicKeyCredential
global.PublicKeyCredential = {
  isUserVerifyingPlatformAuthenticatorAvailable: jest.fn(),
  isConditionalMediationAvailable: jest.fn(),
  isExternalCTAP2SecurityKeySupported: jest.fn(),
} as any;

// Mock crypto for key operations
const mockCrypto = {
  subtle: {
    generateKey: jest.fn(),
    exportKey: jest.fn(),
    importKey: jest.fn(),
    sign: jest.fn(),
    verify: jest.fn(),
    digest: jest.fn(),
  },
  getRandomValues: jest.fn((array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  }),
};

global.crypto = mockCrypto as any;

// Mock base64 utilities
global.btoa = jest.fn((str) => Buffer.from(str, 'binary').toString('base64'));
global.atob = jest.fn((str) => Buffer.from(str, 'base64').toString('binary'));

// Mock ArrayBuffer to string conversion utilities
const mockArrayBufferToString = (buffer: ArrayBuffer) => {
  return String.fromCharCode(...new Uint8Array(buffer));
};

const mockStringToArrayBuffer = (str: string) => {
  const buffer = new ArrayBuffer(str.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < str.length; i++) {
    view[i] = str.charCodeAt(i);
  }
  return buffer;
};

describe('BiometricAuthService', () => {
  let biometricService: BiometricAuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset credential API mocks
    mockNavigatorCredentials.create.mockResolvedValue(mockCredential);
    mockNavigatorCredentials.get.mockResolvedValue(mockCredential);
    
    // Reset WebAuthn capability checks
    (global.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable as jest.Mock)
      .mockResolvedValue(true);
    (global.PublicKeyCredential.isConditionalMediationAvailable as jest.Mock)
      .mockResolvedValue(true);
    
    // Reset crypto mocks
    mockCrypto.subtle.generateKey.mockResolvedValue({
      algorithm: { name: 'ECDSA', namedCurve: 'P-256' },
      extractable: false,
      type: 'private',
      usages: ['sign'],
    } as any);
    
    mockCrypto.subtle.verify.mockResolvedValue(true);
    mockCrypto.subtle.digest.mockResolvedValue(new ArrayBuffer(32));

    biometricService = BiometricAuthService.getInstance();
  });

  afterEach(() => {
    biometricService.cleanup();
    jest.resetAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = BiometricAuthService.getInstance();
      const instance2 = BiometricAuthService.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('should maintain state across getInstance calls', () => {
      const instance1 = BiometricAuthService.getInstance();
      instance1.setRelyingParty('test.com', 'Test App');
      
      const instance2 = BiometricAuthService.getInstance();
      
      expect(instance2.getRelyingParty()).toEqual({
        id: 'test.com',
        name: 'Test App',
      });
    });
  });

  describe('Biometric Availability Detection', () => {
    it('should detect biometric authentication availability', async () => {
      const isAvailable = await biometricService.isBiometricAuthAvailable();
      
      expect(isAvailable).toBe(true);
      expect(global.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable)
        .toHaveBeenCalled();
    });

    it('should handle missing WebAuthn API', async () => {
      // Mock missing WebAuthn
      Object.defineProperty(navigator, 'credentials', {
        value: undefined,
        writable: true,
      });

      const isAvailable = await biometricService.isBiometricAuthAvailable();
      
      expect(isAvailable).toBe(false);
    });

    it('should detect conditional mediation support', async () => {
      const supportsConditional = await biometricService.supportsConditionalMediation();
      
      expect(supportsConditional).toBe(true);
      expect(global.PublicKeyCredential.isConditionalMediationAvailable)
        .toHaveBeenCalled();
    });

    it('should get supported authenticator types', async () => {
      const supportedTypes = await biometricService.getSupportedAuthenticatorTypes();
      
      expect(supportedTypes).toContain('platform');
      expect(Array.isArray(supportedTypes)).toBe(true);
    });

    it('should detect specific biometric modalities', async () => {
      // Mock user agent for different platforms
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)',
        writable: true,
      });

      const modalities = await biometricService.getAvailableBiometricModalities();
      
      expect(modalities).toContain('touchId');
      expect(modalities).toContain('faceId');
    });
  });

  describe('Biometric Enrollment', () => {
    it('should enroll new biometric credential', async () => {
      const userInfo = {
        id: 'user123',
        name: 'john@example.com',
        displayName: 'John Doe',
      };

      const credential = await biometricService.enrollBiometric(userInfo);

      expect(credential).toBeDefined();
      expect(credential.id).toBe(mockCredential.id);
      expect(mockNavigatorCredentials.create).toHaveBeenCalledWith({
        publicKey: expect.objectContaining({
          user: expect.objectContaining({
            id: expect.any(ArrayBuffer),
            name: userInfo.name,
            displayName: userInfo.displayName,
          }),
          challenge: expect.any(ArrayBuffer),
          rp: expect.objectContaining({
            name: expect.any(String),
            id: expect.any(String),
          }),
          pubKeyCredParams: expect.arrayContaining([
            expect.objectContaining({ alg: -7 }), // ES256
          ]),
          authenticatorSelection: expect.objectContaining({
            authenticatorAttachment: 'platform',
            userVerification: 'required',
            requireResidentKey: true,
          }),
          attestation: 'direct',
        }),
      });
    });

    it('should handle enrollment errors', async () => {
      mockNavigatorCredentials.create.mockRejectedValue(
        new Error('User cancelled enrollment')
      );

      const userInfo = {
        id: 'user123',
        name: 'john@example.com',
        displayName: 'John Doe',
      };

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(biometricService.enrollBiometric(userInfo))
        .rejects.toThrow('User cancelled enrollment');

      expect(consoleSpy).toHaveBeenCalledWith(
        'Biometric enrollment failed:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should validate user info during enrollment', async () => {
      const invalidUserInfo = {
        id: '', // Invalid empty ID
        name: 'john@example.com',
        displayName: 'John Doe',
      };

      await expect(biometricService.enrollBiometric(invalidUserInfo))
        .rejects.toThrow('Invalid user information provided');
    });

    it('should store enrolled credentials securely', async () => {
      const userInfo = {
        id: 'user123',
        name: 'john@example.com',
        displayName: 'John Doe',
      };

      const credential = await biometricService.enrollBiometric(userInfo);
      
      const storedCredentials = await biometricService.getStoredCredentials(userInfo.id);
      expect(storedCredentials).toHaveLength(1);
      expect(storedCredentials[0].id).toBe(credential.id);
    });

    it('should support multiple credentials per user', async () => {
      const userInfo = {
        id: 'user123',
        name: 'john@example.com',
        displayName: 'John Doe',
      };

      // Enroll first credential
      const credential1 = await biometricService.enrollBiometric(userInfo);
      
      // Mock different credential for second enrollment
      const secondCredential = { ...mockCredential, id: 'credential-id-456' };
      mockNavigatorCredentials.create.mockResolvedValueOnce(secondCredential);
      
      // Enroll second credential
      const credential2 = await biometricService.enrollBiometric(userInfo);

      const storedCredentials = await biometricService.getStoredCredentials(userInfo.id);
      expect(storedCredentials).toHaveLength(2);
    });
  });

  describe('Biometric Authentication', () => {
    beforeEach(async () => {
      // Enroll a credential first
      await biometricService.enrollBiometric({
        id: 'user123',
        name: 'john@example.com',
        displayName: 'John Doe',
      });
    });

    it('should authenticate with biometric', async () => {
      const result = await biometricService.authenticateWithBiometric('user123');

      expect(result.success).toBe(true);
      expect(result.credentialId).toBe(mockCredential.id);
      expect(mockNavigatorCredentials.get).toHaveBeenCalledWith({
        publicKey: expect.objectContaining({
          challenge: expect.any(ArrayBuffer),
          allowCredentials: expect.arrayContaining([
            expect.objectContaining({
              id: expect.any(ArrayBuffer),
              type: 'public-key',
            }),
          ]),
          userVerification: 'required',
        }),
      });
    });

    it('should handle authentication failure', async () => {
      mockNavigatorCredentials.get.mockRejectedValue(
        new Error('Authentication failed')
      );

      const result = await biometricService.authenticateWithBiometric('user123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Authentication failed');
    });

    it('should verify authentication response', async () => {
      const verifyResult = await biometricService.verifyAuthenticationResponse(
        mockCredential,
        'user123'
      );

      expect(verifyResult).toBe(true);
      expect(mockCrypto.subtle.verify).toHaveBeenCalled();
    });

    it('should handle signature verification failure', async () => {
      mockCrypto.subtle.verify.mockResolvedValue(false);

      const verifyResult = await biometricService.verifyAuthenticationResponse(
        mockCredential,
        'user123'
      );

      expect(verifyResult).toBe(false);
    });

    it('should support conditional mediation authentication', async () => {
      const result = await biometricService.authenticateWithConditionalMediation();

      expect(result.success).toBe(true);
      expect(mockNavigatorCredentials.get).toHaveBeenCalledWith({
        publicKey: expect.objectContaining({
          challenge: expect.any(ArrayBuffer),
        }),
        mediation: 'conditional',
      });
    });

    it('should implement reauthentication for sensitive operations', async () => {
      const sensitiveOperation = 'delete_account';
      
      const result = await biometricService.reauthenticateForSensitiveOperation(
        'user123',
        sensitiveOperation
      );

      expect(result.success).toBe(true);
      expect(result.operationType).toBe(sensitiveOperation);
    });
  });

  describe('Credential Management', () => {
    it('should list enrolled credentials', async () => {
      // Enroll multiple credentials
      await biometricService.enrollBiometric({
        id: 'user123',
        name: 'john@example.com',
        displayName: 'John Doe',
      });

      const credentials = await biometricService.listCredentials('user123');

      expect(credentials).toHaveLength(1);
      expect(credentials[0]).toHaveProperty('id');
      expect(credentials[0]).toHaveProperty('createdAt');
      expect(credentials[0]).toHaveProperty('lastUsed');
    });

    it('should remove specific credentials', async () => {
      // Enroll credential
      const credential = await biometricService.enrollBiometric({
        id: 'user123',
        name: 'john@example.com',
        displayName: 'John Doe',
      });

      // Remove credential
      const removed = await biometricService.removeCredential('user123', credential.id);

      expect(removed).toBe(true);

      const remainingCredentials = await biometricService.listCredentials('user123');
      expect(remainingCredentials).toHaveLength(0);
    });

    it('should remove all credentials for a user', async () => {
      // Enroll multiple credentials
      await biometricService.enrollBiometric({
        id: 'user123',
        name: 'john@example.com',
        displayName: 'John Doe',
      });

      const removedCount = await biometricService.removeAllCredentials('user123');

      expect(removedCount).toBe(1);

      const remainingCredentials = await biometricService.listCredentials('user123');
      expect(remainingCredentials).toHaveLength(0);
    });

    it('should update credential metadata', async () => {
      const credential = await biometricService.enrollBiometric({
        id: 'user123',
        name: 'john@example.com',
        displayName: 'John Doe',
      });

      const newMetadata = {
        nickname: 'Work Phone',
        device: 'iPhone 12',
      };

      const updated = await biometricService.updateCredentialMetadata(
        'user123',
        credential.id,
        newMetadata
      );

      expect(updated).toBe(true);

      const credentials = await biometricService.listCredentials('user123');
      expect(credentials[0].metadata).toEqual(expect.objectContaining(newMetadata));
    });
  });

  describe('Platform-Specific Features', () => {
    it('should detect Touch ID availability on iOS', async () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)',
        writable: true,
      });

      const hasTouchId = await biometricService.hasTouchIdSupport();
      expect(hasTouchId).toBe(true);
    });

    it('should detect Face ID availability on iOS', async () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)',
        writable: true,
      });

      const hasFaceId = await biometricService.hasFaceIdSupport();
      expect(hasFaceId).toBe(true);
    });

    it('should detect Windows Hello availability', async () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        writable: true,
      });

      const hasWindowsHello = await biometricService.hasWindowsHelloSupport();
      expect(hasWindowsHello).toBe(true);
    });

    it('should detect Android biometric availability', async () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Linux; Android 11)',
        writable: true,
      });

      const hasAndroidBiometrics = await biometricService.hasAndroidBiometricSupport();
      expect(hasAndroidBiometrics).toBe(true);
    });

    it('should provide platform-specific enrollment options', async () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)',
        writable: true,
      });

      const options = await biometricService.getPlatformEnrollmentOptions();

      expect(options).toHaveProperty('supportedModalities');
      expect(options.supportedModalities).toContain('touchId');
      expect(options.supportedModalities).toContain('faceId');
    });
  });

  describe('Security Features', () => {
    it('should implement liveness detection', async () => {
      const livenessResult = await biometricService.performLivenessDetection();

      expect(livenessResult).toHaveProperty('isLive');
      expect(livenessResult).toHaveProperty('confidence');
      expect(livenessResult).toHaveProperty('challenges');
    });

    it('should detect spoofing attempts', async () => {
      // Mock spoofing indicators
      const suspiciousCredential = {
        ...mockCredential,
        response: {
          ...mockCredential.response,
          authenticatorData: new ArrayBuffer(32), // Unusually small
        },
      };

      const isSpoofing = await biometricService.detectSpoofingAttempt(suspiciousCredential);
      expect(isSpoofing).toBe(true);
    });

    it('should implement attestation verification', async () => {
      const attestationResult = await biometricService.verifyAttestation(mockCredential);

      expect(attestationResult).toHaveProperty('isValid');
      expect(attestationResult).toHaveProperty('trustLevel');
      expect(attestationResult).toHaveProperty('certificateChain');
    });

    it('should handle replay attacks', async () => {
      // First authentication
      await biometricService.authenticateWithBiometric('user123');

      // Attempt to replay the same challenge
      const replayResult = await biometricService.detectReplayAttack(
        mockCredential,
        'user123'
      );

      expect(replayResult).toBe(true);
    });

    it('should implement biometric template protection', async () => {
      const template = new ArrayBuffer(256); // Mock biometric template
      
      const protected = await biometricService.protectBiometricTemplate(template);

      expect(protected).not.toEqual(template);
      expect(protected.byteLength).toBeGreaterThan(0);
      expect(mockCrypto.subtle.digest).toHaveBeenCalled();
    });
  });

  describe('Error Handling and Fallbacks', () => {
    it('should handle user cancellation gracefully', async () => {
      mockNavigatorCredentials.get.mockRejectedValue(
        new DOMException('The operation was cancelled by the user', 'NotAllowedError')
      );

      const result = await biometricService.authenticateWithBiometric('user123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('User cancelled authentication');
      expect(result.errorCode).toBe('USER_CANCELLED');
    });

    it('should handle device lock scenarios', async () => {
      mockNavigatorCredentials.get.mockRejectedValue(
        new DOMException('Device is locked', 'SecurityError')
      );

      const result = await biometricService.authenticateWithBiometric('user123');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('DEVICE_LOCKED');
    });

    it('should implement fallback authentication methods', async () => {
      // Simulate biometric failure
      mockNavigatorCredentials.get.mockRejectedValue(
        new Error('Biometric sensor not available')
      );

      const fallbackOptions = await biometricService.getFallbackAuthenticationMethods();

      expect(fallbackOptions).toContain('password');
      expect(fallbackOptions).toContain('pin');
    });

    it('should handle platform API changes gracefully', async () => {
      // Mock API change
      delete (global.PublicKeyCredential as any).isUserVerifyingPlatformAuthenticatorAvailable;

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const isAvailable = await biometricService.isBiometricAuthAvailable();

      expect(isAvailable).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Biometric API not fully supported on this platform'
      );

      consoleSpy.mockRestore();
    });

    it('should recover from corrupted credential storage', async () => {
      // Corrupt stored credentials
      const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');
      const getItemSpy = jest.spyOn(Storage.prototype, 'getItem')
        .mockReturnValue('invalid-json{');

      const credentials = await biometricService.listCredentials('user123');

      expect(credentials).toEqual([]);

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Should clean up corrupted data
      expect(consoleSpy).toHaveBeenCalledWith(
        'Corrupted credential storage detected, reinitializing'
      );

      setItemSpy.mockRestore();
      getItemSpy.mockRestore();
      consoleSpy.mockRestore();
    });
  });

  describe('Privacy and Compliance', () => {
    it('should anonymize biometric data', async () => {
      const biometricData = {
        templateHash: 'hash123',
        features: [1, 2, 3, 4, 5],
        quality: 0.95,
      };

      const anonymized = await biometricService.anonymizeBiometricData(biometricData);

      expect(anonymized.templateHash).not.toBe(biometricData.templateHash);
      expect(anonymized.features).not.toEqual(biometricData.features);
      expect(anonymized.quality).toBeUndefined(); // Personal quality metrics removed
    });

    it('should implement biometric data retention policies', () => {
      biometricService.setBiometricDataRetentionPolicy({
        maxAge: 365, // 1 year
        autoDelete: true,
        anonymizeAfter: 180, // 6 months
      });

      const shouldRetain = biometricService.shouldRetainBiometricData(400); // 400 days old
      expect(shouldRetain).toBe(false);
    });

    it('should provide biometric data deletion', async () => {
      await biometricService.enrollBiometric({
        id: 'user123',
        name: 'john@example.com',
        displayName: 'John Doe',
      });

      const deleted = await biometricService.deleteBiometricData('user123');

      expect(deleted).toBe(true);

      const remainingCredentials = await biometricService.listCredentials('user123');
      expect(remainingCredentials).toHaveLength(0);
    });

    it('should generate biometric privacy reports', async () => {
      const privacyReport = await biometricService.generateBiometricPrivacyReport();

      expect(privacyReport).toHaveProperty('dataProcessingPurposes');
      expect(privacyReport).toHaveProperty('retentionPeriods');
      expect(privacyReport).toHaveProperty('securityMeasures');
      expect(privacyReport).toHaveProperty('userRights');
    });
  });

  describe('Performance and Optimization', () => {
    it('should track biometric authentication performance', async () => {
      const startTime = Date.now();

      await biometricService.authenticateWithBiometric('user123');

      const metrics = biometricService.getPerformanceMetrics();

      expect(metrics.averageAuthenticationTime).toBeGreaterThan(0);
      expect(metrics.successRate).toBeGreaterThan(0);
    });

    it('should optimize for slow devices', async () => {
      // Mock slow device
      Object.defineProperty(navigator, 'hardwareConcurrency', { value: 2 });
      
      biometricService.optimizeForDevice();

      const config = biometricService.getOptimizationConfig();
      expect(config.reducedSecurity).toBe(false); // Security should never be reduced
      expect(config.optimizedTimeouts).toBe(true);
    });

    it('should cache biometric capabilities', async () => {
      // First call
      const capabilities1 = await biometricService.getBiometricCapabilities();
      
      // Second call should use cache
      const capabilities2 = await biometricService.getBiometricCapabilities();

      expect(capabilities1).toEqual(capabilities2);
      // Platform APIs should only be called once
      expect(global.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable)
        .toHaveBeenCalledTimes(1);
    });
  });

  describe('Integration Tests', () => {
    it('should work end-to-end with enrollment and authentication', async () => {
      const userInfo = {
        id: 'integration-user',
        name: 'integration@example.com',
        displayName: 'Integration Test User',
      };

      // Check biometric availability
      const isAvailable = await biometricService.isBiometricAuthAvailable();
      expect(isAvailable).toBe(true);

      // Enroll biometric
      const credential = await biometricService.enrollBiometric(userInfo);
      expect(credential).toBeDefined();

      // List credentials
      const credentials = await biometricService.listCredentials(userInfo.id);
      expect(credentials).toHaveLength(1);

      // Authenticate
      const authResult = await biometricService.authenticateWithBiometric(userInfo.id);
      expect(authResult.success).toBe(true);

      // Verify authentication
      const verifyResult = await biometricService.verifyAuthenticationResponse(
        mockCredential,
        userInfo.id
      );
      expect(verifyResult).toBe(true);

      // Clean up
      const deletedCount = await biometricService.removeAllCredentials(userInfo.id);
      expect(deletedCount).toBe(1);
    });

    it('should handle multiple users with separate credentials', async () => {
      const users = [
        { id: 'user1', name: 'user1@example.com', displayName: 'User One' },
        { id: 'user2', name: 'user2@example.com', displayName: 'User Two' },
      ];

      // Enroll both users
      for (const user of users) {
        const credential = await biometricService.enrollBiometric(user);
        expect(credential).toBeDefined();
      }

      // Verify separate credential storage
      const user1Creds = await biometricService.listCredentials('user1');
      const user2Creds = await biometricService.listCredentials('user2');

      expect(user1Creds).toHaveLength(1);
      expect(user2Creds).toHaveLength(1);
      expect(user1Creds[0].id).not.toBe(user2Creds[0].id);

      // Authenticate each user separately
      const auth1 = await biometricService.authenticateWithBiometric('user1');
      const auth2 = await biometricService.authenticateWithBiometric('user2');

      expect(auth1.success).toBe(true);
      expect(auth2.success).toBe(true);
    });

    it('should maintain security across various error scenarios', async () => {
      const userInfo = {
        id: 'security-test-user',
        name: 'security@example.com',
        displayName: 'Security Test User',
      };

      await biometricService.enrollBiometric(userInfo);

      // Test various attack scenarios
      const attackScenarios = [
        // Invalid credential ID
        () => biometricService.authenticateWithBiometric('invalid-user'),
        
        // Corrupted credential data
        async () => {
          const corruptedCredential = { ...mockCredential, id: null };
          return biometricService.verifyAuthenticationResponse(
            corruptedCredential as any,
            userInfo.id
          );
        },
        
        // Replay attack simulation
        () => biometricService.detectReplayAttack(mockCredential, userInfo.id),
      ];

      const results = await Promise.all(
        attackScenarios.map(async (scenario) => {
          try {
            return await scenario();
          } catch {
            return false; // Safely handled
          }
        })
      );

      // All scenarios should be handled securely
      results.forEach((result, index) => {
        if (index === 2) {
          expect(result).toBe(true); // Replay detection should work
        } else {
          expect(result).toBeFalsy(); // Attacks should be blocked
        }
      });
    });
  });
});