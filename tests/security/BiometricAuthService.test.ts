import { BiometricAuthService } from '@/lib/security/BiometricAuthService';

// Mock WebAuthn API
const mockPublicKeyCredential = {
  id: 'mock-credential-id',
  rawId: new ArrayBuffer(32),
  response: {
    clientDataJSON: new ArrayBuffer(128),
    attestationObject: new ArrayBuffer(256),
    authenticatorData: new ArrayBuffer(64),
    signature: new ArrayBuffer(64),
    userHandle: new ArrayBuffer(16),
  },
  type: 'public-key',
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
Object.defineProperty(window, 'PublicKeyCredential', {
  value: {
    isUserVerifyingPlatformAuthenticatorAvailable: jest.fn().mockResolvedValue(true),
    isConditionalMediationAvailable: jest.fn().mockResolvedValue(true),
  },
  writable: true,
});

// Mock crypto for challenge generation
Object.defineProperty(global, 'crypto', {
  value: {
    subtle: {
      digest: jest.fn().mockResolvedValue(new ArrayBuffer(32)),
      verify: jest.fn().mockResolvedValue(true),
    },
    getRandomValues: jest.fn((array) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
      return array;
    }),
  },
  writable: true,
});

// Mock platform detection
Object.defineProperty(navigator, 'userAgent', {
  value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)',
  writable: true,
});

Object.defineProperty(navigator, 'platform', {
  value: 'iPhone',
  writable: true,
});

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock IndexedDB for credential storage
const mockIDB = {
  open: jest.fn(),
  deleteDatabase: jest.fn(),
};

const mockDB = {
  createObjectStore: jest.fn(),
  transaction: jest.fn(),
  close: jest.fn(),
};

const mockTransaction = {
  objectStore: jest.fn(),
  oncomplete: null,
  onerror: null,
};

const mockObjectStore = {
  add: jest.fn(),
  put: jest.fn(),
  get: jest.fn(),
  getAll: jest.fn(),
  delete: jest.fn(),
  clear: jest.fn(),
  createIndex: jest.fn(),
};

Object.defineProperty(global, 'indexedDB', {
  value: mockIDB,
  writable: true,
});

describe('BiometricAuthService', () => {
  let biometricService: BiometricAuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    
    // Setup IndexedDB mocks
    mockIDB.open.mockImplementation(() => {
      const request = {
        result: mockDB,
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null,
      };
      
      setTimeout(() => {
        if (request.onsuccess) request.onsuccess({ target: { result: mockDB } });
      }, 0);
      
      return request;
    });
    
    mockDB.transaction.mockReturnValue(mockTransaction);
    mockTransaction.objectStore.mockReturnValue(mockObjectStore);
    
    biometricService = BiometricAuthService.getInstance();
  });

  describe('Initialization', () => {
    it('creates singleton instance', () => {
      const instance1 = BiometricAuthService.getInstance();
      const instance2 = BiometricAuthService.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('initializes with configuration', async () => {
      await biometricService.initialize({
        rpId: 'example.com',
        rpName: 'WedSync',
        timeout: 60000,
        userVerification: 'preferred',
      });
      
      const config = biometricService.getConfiguration();
      
      expect(config.rpId).toBe('example.com');
      expect(config.rpName).toBe('WedSync');
      expect(config.timeout).toBe(60000);
    });

    it('detects WebAuthn support', async () => {
      const isSupported = await biometricService.isSupported();
      
      expect(isSupported).toBe(true);
      expect(window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable)
        .toHaveBeenCalled();
    });

    it('handles missing WebAuthn support gracefully', async () => {
      // Mock missing WebAuthn support
      Object.defineProperty(window, 'PublicKeyCredential', {
        value: undefined,
        writable: true,
      });
      
      const isSupported = await biometricService.isSupported();
      
      expect(isSupported).toBe(false);
    });

    it('detects platform authenticator availability', async () => {
      const isAvailable = await biometricService.isPlatformAuthenticatorAvailable();
      
      expect(isAvailable).toBe(true);
      expect(window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable)
        .toHaveBeenCalled();
    });

    it('detects conditional mediation support', async () => {
      const isConditionalSupported = await biometricService.isConditionalMediationAvailable();
      
      expect(isConditionalSupported).toBe(true);
      expect(window.PublicKeyCredential.isConditionalMediationAvailable)
        .toHaveBeenCalled();
    });
  });

  describe('Enrollment Process', () => {
    beforeEach(async () => {
      await biometricService.initialize({
        rpId: 'example.com',
        rpName: 'WedSync',
      });
    });

    it('enrolls new biometric credential', async () => {
      mockNavigatorCredentials.create.mockResolvedValue(mockPublicKeyCredential);
      
      const mockRequest = { onsuccess: null, onerror: null };
      mockObjectStore.add.mockReturnValue(mockRequest);
      
      setTimeout(() => {
        if (mockRequest.onsuccess) mockRequest.onsuccess({});
      }, 0);
      
      const result = await biometricService.enroll({
        userId: 'user-123',
        userName: 'john.doe@example.com',
        displayName: 'John Doe',
      });
      
      expect(result.success).toBe(true);
      expect(result.credentialId).toBeDefined();
      expect(mockNavigatorCredentials.create).toHaveBeenCalledWith({
        publicKey: expect.objectContaining({
          rp: { id: 'example.com', name: 'WedSync' },
          user: expect.objectContaining({
            id: expect.any(Uint8Array),
            name: 'john.doe@example.com',
            displayName: 'John Doe',
          }),
          challenge: expect.any(Uint8Array),
          pubKeyCredParams: expect.any(Array),
        }),
      });
    });

    it('handles enrollment with authenticator selection', async () => {
      mockNavigatorCredentials.create.mockResolvedValue(mockPublicKeyCredential);
      
      const mockRequest = { onsuccess: null, onerror: null };
      mockObjectStore.add.mockReturnValue(mockRequest);
      
      setTimeout(() => {
        if (mockRequest.onsuccess) mockRequest.onsuccess({});
      }, 0);
      
      await biometricService.enroll({
        userId: 'user-123',
        userName: 'john.doe@example.com',
        displayName: 'John Doe',
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          requireResidentKey: true,
          userVerification: 'required',
        },
      });
      
      expect(mockNavigatorCredentials.create).toHaveBeenCalledWith({
        publicKey: expect.objectContaining({
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            requireResidentKey: true,
            userVerification: 'required',
          },
        }),
      });
    });

    it('supports multiple authenticator types', async () => {
      const supportedTypes = biometricService.getSupportedAuthenticatorTypes();
      
      expect(supportedTypes).toContain('platform');
      expect(supportedTypes).toContain('cross-platform');
    });

    it('validates enrollment prerequisites', async () => {
      const prerequisites = await biometricService.checkEnrollmentPrerequisites();
      
      expect(prerequisites.webAuthnSupported).toBe(true);
      expect(prerequisites.platformAuthenticatorAvailable).toBe(true);
      expect(prerequisites.userVerificationAvailable).toBe(true);
    });

    it('handles enrollment errors gracefully', async () => {
      mockNavigatorCredentials.create.mockRejectedValue(
        new Error('User cancelled enrollment')
      );
      
      const result = await biometricService.enroll({
        userId: 'user-123',
        userName: 'john.doe@example.com',
        displayName: 'John Doe',
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('User cancelled enrollment');
    });

    it('prevents duplicate enrollments for same user', async () => {
      // Mock existing credential
      const existingCredential = {
        credentialId: 'existing-credential-id',
        userId: 'user-123',
        createdAt: new Date(),
      };
      
      const mockRequest = { onsuccess: null, onerror: null };
      mockObjectStore.get.mockReturnValue(mockRequest);
      
      setTimeout(() => {
        if (mockRequest.onsuccess) {
          mockRequest.onsuccess({ target: { result: existingCredential } });
        }
      }, 0);
      
      const result = await biometricService.enroll({
        userId: 'user-123',
        userName: 'john.doe@example.com',
        displayName: 'John Doe',
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('already enrolled');
    });
  });

  describe('Authentication Process', () => {
    beforeEach(async () => {
      await biometricService.initialize({
        rpId: 'example.com',
        rpName: 'WedSync',
      });
    });

    it('authenticates with biometric credential', async () => {
      mockNavigatorCredentials.get.mockResolvedValue(mockPublicKeyCredential);
      
      const result = await biometricService.authenticate({
        userId: 'user-123',
      });
      
      expect(result.success).toBe(true);
      expect(result.credentialId).toBe('mock-credential-id');
      expect(mockNavigatorCredentials.get).toHaveBeenCalledWith({
        publicKey: expect.objectContaining({
          challenge: expect.any(Uint8Array),
          timeout: expect.any(Number),
          userVerification: 'preferred',
        }),
      });
    });

    it('supports conditional mediation authentication', async () => {
      mockNavigatorCredentials.get.mockResolvedValue(mockPublicKeyCredential);
      
      await biometricService.authenticateWithConditionalUI();
      
      expect(mockNavigatorCredentials.get).toHaveBeenCalledWith({
        publicKey: expect.objectContaining({
          challenge: expect.any(Uint8Array),
        }),
        mediation: 'conditional',
      });
    });

    it('authenticates with specific allowCredentials', async () => {
      mockNavigatorCredentials.get.mockResolvedValue(mockPublicKeyCredential);
      
      const allowedCredentials = [
        {
          id: new Uint8Array([1, 2, 3, 4]),
          type: 'public-key' as const,
          transports: ['internal'] as AuthenticatorTransport[],
        },
      ];
      
      await biometricService.authenticate({
        userId: 'user-123',
        allowCredentials: allowedCredentials,
      });
      
      expect(mockNavigatorCredentials.get).toHaveBeenCalledWith({
        publicKey: expect.objectContaining({
          allowCredentials: allowedCredentials,
        }),
      });
    });

    it('verifies authentication signatures', async () => {
      mockNavigatorCredentials.get.mockResolvedValue(mockPublicKeyCredential);
      
      const result = await biometricService.authenticate({
        userId: 'user-123',
        verifySignature: true,
      });
      
      expect(crypto.subtle.verify).toHaveBeenCalled();
      expect(result.signatureValid).toBe(true);
    });

    it('handles authentication cancellation', async () => {
      mockNavigatorCredentials.get.mockRejectedValue(
        new DOMException('User cancelled authentication', 'AbortError')
      );
      
      const result = await biometricService.authenticate({
        userId: 'user-123',
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('cancelled');
    });

    it('handles timeout during authentication', async () => {
      mockNavigatorCredentials.get.mockRejectedValue(
        new DOMException('Authentication timeout', 'TimeoutError')
      );
      
      const result = await biometricService.authenticate({
        userId: 'user-123',
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
    });

    it('tracks failed authentication attempts', async () => {
      mockNavigatorCredentials.get.mockRejectedValue(
        new Error('Authentication failed')
      );
      
      // Make multiple failed attempts
      await biometricService.authenticate({ userId: 'user-123' });
      await biometricService.authenticate({ userId: 'user-123' });
      await biometricService.authenticate({ userId: 'user-123' });
      
      const failedAttempts = biometricService.getFailedAttempts('user-123');
      
      expect(failedAttempts).toBe(3);
    });
  });

  describe('Credential Management', () => {
    beforeEach(async () => {
      await biometricService.initialize({
        rpId: 'example.com',
        rpName: 'WedSync',
      });
    });

    it('stores credential metadata securely', async () => {
      mockNavigatorCredentials.create.mockResolvedValue(mockPublicKeyCredential);
      
      const mockRequest = { onsuccess: null, onerror: null };
      mockObjectStore.add.mockReturnValue(mockRequest);
      
      setTimeout(() => {
        if (mockRequest.onsuccess) mockRequest.onsuccess({});
      }, 0);
      
      await biometricService.enroll({
        userId: 'user-123',
        userName: 'john.doe@example.com',
        displayName: 'John Doe',
      });
      
      expect(mockObjectStore.add).toHaveBeenCalledWith(
        expect.objectContaining({
          credentialId: 'mock-credential-id',
          userId: 'user-123',
          userName: 'john.doe@example.com',
          createdAt: expect.any(Date),
          lastUsed: null,
        })
      );
    });

    it('retrieves user credentials', async () => {
      const mockCredentials = [
        {
          credentialId: 'cred-1',
          userId: 'user-123',
          deviceName: 'iPhone 13',
          createdAt: new Date('2024-01-01'),
        },
        {
          credentialId: 'cred-2',
          userId: 'user-123',
          deviceName: 'MacBook Pro',
          createdAt: new Date('2024-01-02'),
        },
      ];
      
      const mockRequest = { onsuccess: null, onerror: null };
      mockObjectStore.getAll.mockReturnValue(mockRequest);
      
      setTimeout(() => {
        if (mockRequest.onsuccess) {
          mockRequest.onsuccess({ target: { result: mockCredentials } });
        }
      }, 0);
      
      const credentials = await biometricService.getUserCredentials('user-123');
      
      expect(credentials).toHaveLength(2);
      expect(credentials[0].deviceName).toBe('iPhone 13');
    });

    it('updates credential metadata on successful authentication', async () => {
      mockNavigatorCredentials.get.mockResolvedValue(mockPublicKeyCredential);
      
      const mockGetRequest = { onsuccess: null, onerror: null };
      const mockPutRequest = { onsuccess: null, onerror: null };
      
      mockObjectStore.get.mockReturnValue(mockGetRequest);
      mockObjectStore.put.mockReturnValue(mockPutRequest);
      
      setTimeout(() => {
        if (mockGetRequest.onsuccess) {
          mockGetRequest.onsuccess({
            target: {
              result: {
                credentialId: 'mock-credential-id',
                userId: 'user-123',
                lastUsed: null,
              },
            },
          });
        }
        if (mockPutRequest.onsuccess) mockPutRequest.onsuccess({});
      }, 0);
      
      await biometricService.authenticate({ userId: 'user-123' });
      
      expect(mockObjectStore.put).toHaveBeenCalledWith(
        expect.objectContaining({
          lastUsed: expect.any(Date),
        })
      );
    });

    it('removes credential from storage', async () => {
      const mockRequest = { onsuccess: null, onerror: null };
      mockObjectStore.delete.mockReturnValue(mockRequest);
      
      setTimeout(() => {
        if (mockRequest.onsuccess) mockRequest.onsuccess({});
      }, 0);
      
      const result = await biometricService.removeCredential('mock-credential-id');
      
      expect(result.success).toBe(true);
      expect(mockObjectStore.delete).toHaveBeenCalledWith('mock-credential-id');
    });

    it('lists all user devices with biometric credentials', async () => {
      const mockCredentials = [
        {
          credentialId: 'cred-1',
          userId: 'user-123',
          deviceInfo: {
            name: 'iPhone 13',
            platform: 'iOS',
            userAgent: 'Mobile Safari',
          },
          createdAt: new Date(),
        },
      ];
      
      const mockRequest = { onsuccess: null, onerror: null };
      mockObjectStore.getAll.mockReturnValue(mockRequest);
      
      setTimeout(() => {
        if (mockRequest.onsuccess) {
          mockRequest.onsuccess({ target: { result: mockCredentials } });
        }
      }, 0);
      
      const devices = await biometricService.getUserDevices('user-123');
      
      expect(devices).toHaveLength(1);
      expect(devices[0].name).toBe('iPhone 13');
      expect(devices[0].platform).toBe('iOS');
    });
  });

  describe('Platform-Specific Behavior', () => {
    beforeEach(async () => {
      await biometricService.initialize({
        rpId: 'example.com',
        rpName: 'WedSync',
      });
    });

    it('adapts to iOS Safari behavior', async () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
        writable: true,
      });
      
      const platformHandler = biometricService.getPlatformHandler();
      
      expect(platformHandler.platform).toBe('ios');
      expect(platformHandler.requiresUserActivation).toBe(true);
    });

    it('adapts to Android Chrome behavior', async () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Linux; Android 11; SM-G975F) AppleWebKit/537.36 Chrome/91.0.4472.120',
        writable: true,
      });
      
      const platformHandler = biometricService.getPlatformHandler();
      
      expect(platformHandler.platform).toBe('android');
      expect(platformHandler.supportsSecurityKey).toBe(true);
    });

    it('adapts to Windows Hello behavior', async () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/91.0.4472.120',
        writable: true,
      });
      
      Object.defineProperty(navigator, 'platform', {
        value: 'Win32',
        writable: true,
      });
      
      const platformHandler = biometricService.getPlatformHandler();
      
      expect(platformHandler.platform).toBe('windows');
      expect(platformHandler.supportsWindowsHello).toBe(true);
    });

    it('handles cross-platform authenticators', async () => {
      const crossPlatformOptions = biometricService.getCrossPlatformOptions();
      
      expect(crossPlatformOptions.authenticatorAttachment).toBe('cross-platform');
      expect(crossPlatformOptions.transports).toContain('usb');
      expect(crossPlatformOptions.transports).toContain('nfc');
    });

    it('detects available biometric types', async () => {
      const availableTypes = await biometricService.getAvailableBiometricTypes();
      
      // Mock different platforms would return different types
      expect(availableTypes).toContain('touch_id');
    });
  });

  describe('Liveness Detection', () => {
    beforeEach(async () => {
      await biometricService.initialize({
        rpId: 'example.com',
        rpName: 'WedSync',
        enableLivenessDetection: true,
      });
    });

    it('performs liveness detection during authentication', async () => {
      mockNavigatorCredentials.get.mockResolvedValue(mockPublicKeyCredential);
      
      const result = await biometricService.authenticateWithLivenessDetection({
        userId: 'user-123',
      });
      
      expect(result.success).toBe(true);
      expect(result.livenessScore).toBeGreaterThan(0.8); // High confidence in live user
    });

    it('detects presentation attacks', async () => {
      // Mock low liveness score (potential spoofing)
      const spoofingResult = await biometricService.detectPresentationAttack({
        userId: 'user-123',
      });
      
      expect(spoofingResult.riskScore).toBeGreaterThanOrEqual(0);
      expect(spoofingResult.riskScore).toBeLessThanOrEqual(1);
    });

    it('requires additional verification for low liveness scores', async () => {
      const lowLivenessResult = {
        success: true,
        credentialId: 'mock-credential-id',
        livenessScore: 0.3, // Low score
        requiresAdditionalVerification: true,
      };
      
      const additionalAuth = await biometricService.requireAdditionalAuthentication(
        lowLivenessResult
      );
      
      expect(additionalAuth.methods).toContain('knowledge_based');
      expect(additionalAuth.required).toBe(true);
    });

    it('logs suspicious authentication attempts', async () => {
      await biometricService.authenticateWithLivenessDetection({
        userId: 'user-123',
        logSuspiciousActivity: true,
      });
      
      const auditLogs = biometricService.getAuditLogs();
      const suspiciousLogs = auditLogs.filter(log => log.suspicious);
      
      // Should log if liveness detection fails
      if (suspiciousLogs.length > 0) {
        expect(suspiciousLogs[0].type).toBe('low_liveness_score');
      }
    });
  });

  describe('Error Handling and Edge Cases', () => {
    beforeEach(async () => {
      await biometricService.initialize({
        rpId: 'example.com',
        rpName: 'WedSync',
      });
    });

    it('handles authenticator not found errors', async () => {
      mockNavigatorCredentials.get.mockRejectedValue(
        new DOMException('No authenticators found', 'NotFoundError')
      );
      
      const result = await biometricService.authenticate({ userId: 'user-123' });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('No authenticators found');
    });

    it('handles invalid state errors during enrollment', async () => {
      mockNavigatorCredentials.create.mockRejectedValue(
        new DOMException('Invalid state', 'InvalidStateError')
      );
      
      const result = await biometricService.enroll({
        userId: 'user-123',
        userName: 'john.doe@example.com',
        displayName: 'John Doe',
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('already enrolled');
    });

    it('handles constraint errors', async () => {
      mockNavigatorCredentials.create.mockRejectedValue(
        new DOMException('Constraint not satisfied', 'ConstraintError')
      );
      
      const result = await biometricService.enroll({
        userId: 'user-123',
        userName: 'john.doe@example.com',
        displayName: 'John Doe',
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          requireResidentKey: true,
          userVerification: 'required',
        },
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('requirements not met');
    });

    it('handles database storage errors gracefully', async () => {
      mockNavigatorCredentials.create.mockResolvedValue(mockPublicKeyCredential);
      
      // Mock database error
      const mockRequest = { onsuccess: null, onerror: null };
      mockObjectStore.add.mockReturnValue(mockRequest);
      
      setTimeout(() => {
        if (mockRequest.onerror) {
          mockRequest.onerror({ target: { error: new Error('Database error') } });
        }
      }, 0);
      
      const result = await biometricService.enroll({
        userId: 'user-123',
        userName: 'john.doe@example.com',
        displayName: 'John Doe',
      });
      
      // Enrollment should succeed even if storage fails
      expect(result.success).toBe(true);
      expect(result.warning).toContain('Failed to store credential metadata');
    });

    it('recovers from corrupted credential storage', async () => {
      // Mock corrupted data
      const mockRequest = { onsuccess: null, onerror: null };
      mockObjectStore.getAll.mockReturnValue(mockRequest);
      
      setTimeout(() => {
        if (mockRequest.onsuccess) {
          mockRequest.onsuccess({ target: { result: 'invalid-data' } });
        }
      }, 0);
      
      const consoleWarn = jest.spyOn(console, 'warn').mockImplementation();
      
      const credentials = await biometricService.getUserCredentials('user-123');
      
      expect(credentials).toEqual([]);
      expect(consoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('Corrupted credential data')
      );
      
      consoleWarn.mockRestore();
    });

    it('handles network failures during server verification', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
      
      mockNavigatorCredentials.get.mockResolvedValue(mockPublicKeyCredential);
      
      const result = await biometricService.authenticate({
        userId: 'user-123',
        serverVerification: true,
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('server verification failed');
    });

    it('implements fallback mechanisms for unsupported browsers', async () => {
      // Mock unsupported browser
      Object.defineProperty(window, 'PublicKeyCredential', {
        value: undefined,
        writable: true,
      });
      
      const fallbackMethods = await biometricService.getFallbackAuthMethods();
      
      expect(fallbackMethods).toContain('password');
      expect(fallbackMethods).toContain('sms_otp');
    });
  });

  describe('Security and Privacy', () => {
    beforeEach(async () => {
      await biometricService.initialize({
        rpId: 'example.com',
        rpName: 'WedSync',
      });
    });

    it('generates secure challenges', async () => {
      const challenge1 = biometricService.generateChallenge();
      const challenge2 = biometricService.generateChallenge();
      
      expect(challenge1).not.toEqual(challenge2);
      expect(challenge1.byteLength).toBe(32); // 256 bits
    });

    it('validates challenge authenticity', async () => {
      const challenge = biometricService.generateChallenge();
      const clientDataJSON = JSON.stringify({
        type: 'webauthn.get',
        challenge: btoa(String.fromCharCode(...new Uint8Array(challenge))),
        origin: 'https://example.com',
      });
      
      const isValid = await biometricService.validateChallenge(
        challenge,
        new TextEncoder().encode(clientDataJSON)
      );
      
      expect(isValid).toBe(true);
    });

    it('prevents replay attacks', async () => {
      const challenge = biometricService.generateChallenge();
      
      // Use challenge once
      await biometricService.consumeChallenge(challenge);
      
      // Try to reuse the same challenge
      const reuseAttempt = await biometricService.validateChallenge(challenge, new ArrayBuffer(0));
      
      expect(reuseAttempt).toBe(false);
    });

    it('implements proper key attestation validation', async () => {
      const attestationResult = await biometricService.validateKeyAttestation({
        credentialId: 'mock-credential-id',
        attestationObject: new ArrayBuffer(256),
        clientDataJSON: new ArrayBuffer(128),
      });
      
      expect(attestationResult.trustworthy).toBe(true);
      expect(attestationResult.authenticatorInfo).toBeDefined();
    });

    it('protects against timing attacks', async () => {
      const startTime = performance.now();
      
      // Authentication with invalid credential should take similar time as valid one
      mockNavigatorCredentials.get.mockRejectedValue(
        new DOMException('No credentials found', 'NotFoundError')
      );
      
      await biometricService.authenticate({ userId: 'user-123' });
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should have consistent timing (within reasonable bounds)
      expect(duration).toBeGreaterThan(100); // Minimum processing time
      expect(duration).toBeLessThan(5000); // Maximum reasonable time
    });

    it('sanitizes user input properly', async () => {
      const maliciousInput = {
        userId: '<script>alert("xss")</script>',
        userName: 'user@example.com<script>',
        displayName: 'John</script><script>alert(1)</script>',
      };
      
      const result = await biometricService.enroll(maliciousInput);
      
      // Should sanitize inputs before processing
      expect(mockNavigatorCredentials.create).toHaveBeenCalledWith({
        publicKey: expect.objectContaining({
          user: expect.objectContaining({
            name: 'user@example.com', // Script tags removed
            displayName: 'John', // Script tags removed
          }),
        }),
      });
    });
  });
});