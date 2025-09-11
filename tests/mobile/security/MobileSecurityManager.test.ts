import { jest } from '@jest/globals';
import { MobileSecurityManager } from '../../../src/lib/security/MobileSecurityManager';

// Mock crypto API
const mockCrypto = {
  subtle: {
    generateKey: jest.fn(),
    exportKey: jest.fn(),
    importKey: jest.fn(),
    encrypt: jest.fn(),
    decrypt: jest.fn(),
    sign: jest.fn(),
    verify: jest.fn(),
    digest: jest.fn(),
    deriveBits: jest.fn(),
    deriveKey: jest.fn(),
  },
  getRandomValues: jest.fn((array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  }),
  randomUUID: jest.fn(() => '123e4567-e89b-12d3-a456-426614174000'),
};

global.crypto = mockCrypto as any;

// Mock Web Authentication API
const mockNavigatorCredentials = {
  create: jest.fn(),
  get: jest.fn(),
};

Object.defineProperty(navigator, 'credentials', {
  value: mockNavigatorCredentials,
  writable: true,
});

// Mock device motion for device fingerprinting
global.DeviceMotionEvent = {
  requestPermission: jest.fn().mockResolvedValue('granted'),
} as any;

global.DeviceOrientationEvent = {
  requestPermission: jest.fn().mockResolvedValue('granted'),
} as any;

// Mock canvas for fingerprinting
const mockCanvas = {
  getContext: jest.fn(() => ({
    fillText: jest.fn(),
    fillRect: jest.fn(),
    getImageData: jest.fn(() => ({ data: new Uint8Array(16) })),
    toDataURL: jest.fn(() => 'data:image/png;base64,iVBORw0KGgoAAAANS'),
  })),
  width: 200,
  height: 50,
};

global.HTMLCanvasElement.prototype.getContext = mockCanvas.getContext as any;

// Mock performance API for timing attack detection
const mockPerformance = {
  now: jest.fn(() => Date.now()),
  mark: jest.fn(),
  measure: jest.fn(),
  getEntriesByType: jest.fn(() => []),
};

global.performance = mockPerformance as any;

describe('MobileSecurityManager', () => {
  let securityManager: MobileSecurityManager;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Reset crypto mocks
    mockCrypto.subtle.generateKey.mockResolvedValue({
      algorithm: { name: 'AES-GCM', length: 256 },
    } as any);
    
    mockCrypto.subtle.encrypt.mockResolvedValue(new ArrayBuffer(16));
    mockCrypto.subtle.decrypt.mockResolvedValue(new ArrayBuffer(16));
    mockCrypto.subtle.digest.mockResolvedValue(new ArrayBuffer(32));

    securityManager = MobileSecurityManager.getInstance();
  });

  afterEach(() => {
    securityManager.cleanup();
    jest.useRealTimers();
    jest.resetAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = MobileSecurityManager.getInstance();
      const instance2 = MobileSecurityManager.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('should maintain state across getInstance calls', () => {
      const instance1 = MobileSecurityManager.getInstance();
      instance1.setSecurityLevel('high');
      
      const instance2 = MobileSecurityManager.getInstance();
      
      expect(instance2.getSecurityLevel()).toBe('high');
    });
  });

  describe('Security Policy Management', () => {
    it('should set and enforce security policies', () => {
      const policy = {
        requireBiometrics: true,
        sessionTimeout: 300000, // 5 minutes
        maxFailedAttempts: 3,
        requireSSL: true,
        allowDebugMode: false,
      };

      securityManager.setSecurityPolicy(policy);
      
      const enforcedPolicy = securityManager.getSecurityPolicy();
      expect(enforcedPolicy).toEqual(policy);
    });

    it('should validate security policy parameters', () => {
      const invalidPolicy = {
        requireBiometrics: true,
        sessionTimeout: -1, // Invalid
        maxFailedAttempts: 0, // Invalid
        requireSSL: true,
        allowDebugMode: false,
      };

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      securityManager.setSecurityPolicy(invalidPolicy);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Invalid security policy parameter: sessionTimeout must be positive'
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        'Invalid security policy parameter: maxFailedAttempts must be positive'
      );

      consoleSpy.mockRestore();
    });

    it('should apply default security policies for different levels', () => {
      securityManager.setSecurityLevel('basic');
      const basicPolicy = securityManager.getSecurityPolicy();

      securityManager.setSecurityLevel('high');
      const highPolicy = securityManager.getSecurityPolicy();

      expect(highPolicy.sessionTimeout).toBeLessThan(basicPolicy.sessionTimeout);
      expect(highPolicy.maxFailedAttempts).toBeLessThan(basicPolicy.maxFailedAttempts);
    });

    it('should enforce CSP (Content Security Policy)', () => {
      const cspDirectives = securityManager.generateCSP();

      expect(cspDirectives).toContain("default-src 'self'");
      expect(cspDirectives).toContain("script-src 'self'");
      expect(cspDirectives).toContain("style-src 'self' 'unsafe-inline'");
      expect(cspDirectives).toContain("img-src 'self' data: https:");
    });
  });

  describe('Authentication Management', () => {
    it('should generate secure session tokens', async () => {
      const token = await securityManager.generateSessionToken();

      expect(token).toBeDefined();
      expect(token).toHaveLength(64); // 32 bytes = 64 hex chars
      expect(mockCrypto.getRandomValues).toHaveBeenCalled();
    });

    it('should validate session tokens', async () => {
      const validToken = await securityManager.generateSessionToken();
      const invalidToken = 'invalid-token';

      expect(await securityManager.validateSessionToken(validToken)).toBe(true);
      expect(await securityManager.validateSessionToken(invalidToken)).toBe(false);
    });

    it('should handle session timeout', async () => {
      securityManager.setSecurityPolicy({ sessionTimeout: 1000 }); // 1 second

      const token = await securityManager.generateSessionToken();
      
      expect(await securityManager.validateSessionToken(token)).toBe(true);

      jest.advanceTimersByTime(1500); // Advance past timeout

      expect(await securityManager.validateSessionToken(token)).toBe(false);
    });

    it('should track failed authentication attempts', async () => {
      const invalidToken = 'invalid';

      // Simulate failed attempts
      for (let i = 0; i < 4; i++) {
        await securityManager.validateSessionToken(invalidToken);
      }

      const isLocked = securityManager.isAccountLocked();
      expect(isLocked).toBe(true);
    });

    it('should implement account lockout after failed attempts', async () => {
      securityManager.setSecurityPolicy({ maxFailedAttempts: 2 });

      const invalidToken = 'invalid';

      // First failed attempt
      await securityManager.validateSessionToken(invalidToken);
      expect(securityManager.isAccountLocked()).toBe(false);

      // Second failed attempt
      await securityManager.validateSessionToken(invalidToken);
      expect(securityManager.isAccountLocked()).toBe(false);

      // Third failed attempt - should lock
      await securityManager.validateSessionToken(invalidToken);
      expect(securityManager.isAccountLocked()).toBe(true);
    });

    it('should unlock account after lockout period', async () => {
      securityManager.setSecurityPolicy({ 
        maxFailedAttempts: 1,
        lockoutDuration: 1000, // 1 second
      });

      // Trigger lockout
      await securityManager.validateSessionToken('invalid');
      await securityManager.validateSessionToken('invalid');
      
      expect(securityManager.isAccountLocked()).toBe(true);

      jest.advanceTimersByTime(1500); // Advance past lockout duration

      expect(securityManager.isAccountLocked()).toBe(false);
    });
  });

  describe('Data Encryption and Decryption', () => {
    it('should encrypt sensitive data', async () => {
      const sensitiveData = { 
        creditCard: '4111-1111-1111-1111',
        ssn: '123-45-6789',
      };

      const encrypted = await securityManager.encryptData(sensitiveData);

      expect(encrypted).toBeDefined();
      expect(encrypted).not.toEqual(sensitiveData);
      expect(mockCrypto.subtle.encrypt).toHaveBeenCalled();
    });

    it('should decrypt encrypted data', async () => {
      const originalData = { secret: 'top-secret-information' };

      const encrypted = await securityManager.encryptData(originalData);
      
      // Mock decrypt to return original data
      mockCrypto.subtle.decrypt.mockResolvedValue(
        new TextEncoder().encode(JSON.stringify(originalData))
      );

      const decrypted = await securityManager.decryptData(encrypted);

      expect(decrypted).toEqual(originalData);
      expect(mockCrypto.subtle.decrypt).toHaveBeenCalled();
    });

    it('should handle encryption errors gracefully', async () => {
      mockCrypto.subtle.encrypt.mockRejectedValue(new Error('Encryption failed'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await securityManager.encryptData({ test: 'data' });

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Encryption failed:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should use different keys for different data types', async () => {
      await securityManager.encryptData({ type: 'personal' }, 'personal');
      await securityManager.encryptData({ type: 'financial' }, 'financial');

      // Should have generated different keys
      expect(mockCrypto.subtle.generateKey).toHaveBeenCalledTimes(2);
    });

    it('should implement key rotation', async () => {
      const keyRotationSpy = jest.spyOn(securityManager, 'rotateEncryptionKeys');

      securityManager.setKeyRotationInterval(1000); // 1 second
      
      jest.advanceTimersByTime(1500);

      expect(keyRotationSpy).toHaveBeenCalled();
    });
  });

  describe('Device Fingerprinting', () => {
    it('should generate device fingerprint', async () => {
      const fingerprint = await securityManager.generateDeviceFingerprint();

      expect(fingerprint).toBeDefined();
      expect(fingerprint).toHaveProperty('screen');
      expect(fingerprint).toHaveProperty('timezone');
      expect(fingerprint).toHaveProperty('language');
      expect(fingerprint).toHaveProperty('platform');
      expect(fingerprint).toHaveProperty('canvasFingerprint');
    });

    it('should include hardware characteristics in fingerprint', async () => {
      Object.defineProperty(navigator, 'hardwareConcurrency', { value: 4 });
      Object.defineProperty(navigator, 'deviceMemory', { value: 8 });

      const fingerprint = await securityManager.generateDeviceFingerprint();

      expect(fingerprint.hardware).toEqual({
        concurrency: 4,
        memory: 8,
      });
    });

    it('should detect device fingerprint changes', async () => {
      const fingerprint1 = await securityManager.generateDeviceFingerprint();
      
      // Store fingerprint
      securityManager.storeDeviceFingerprint(fingerprint1);

      // Change device characteristics
      Object.defineProperty(screen, 'width', { value: 1920 });
      Object.defineProperty(screen, 'height', { value: 1080 });

      const fingerprint2 = await securityManager.generateDeviceFingerprint();
      
      const hasChanged = securityManager.hasDeviceFingerprintChanged(fingerprint2);
      expect(hasChanged).toBe(true);
    });

    it('should calculate fingerprint similarity score', async () => {
      const fingerprint1 = await securityManager.generateDeviceFingerprint();
      const fingerprint2 = { ...fingerprint1, timezone: 'UTC' }; // Slight change

      const similarity = securityManager.calculateFingerprintSimilarity(
        fingerprint1, 
        fingerprint2
      );

      expect(similarity).toBeGreaterThan(0.8); // Should be similar but not identical
      expect(similarity).toBeLessThan(1.0);
    });

    it('should handle missing fingerprint APIs gracefully', async () => {
      // Mock missing APIs
      Object.defineProperty(navigator, 'hardwareConcurrency', { value: undefined });
      delete (navigator as any).deviceMemory;

      const fingerprint = await securityManager.generateDeviceFingerprint();

      expect(fingerprint).toBeDefined();
      expect(fingerprint.hardware.concurrency).toBeUndefined();
    });
  });

  describe('Threat Detection', () => {
    it('should detect SQL injection attempts', () => {
      const maliciousInputs = [
        "'; DROP TABLE users; --",
        "1' OR '1'='1",
        "admin'--",
        "1' UNION SELECT * FROM passwords--",
      ];

      maliciousInputs.forEach(input => {
        const isThreat = securityManager.detectSQLInjection(input);
        expect(isThreat).toBe(true);
      });
    });

    it('should allow safe SQL inputs', () => {
      const safeInputs = [
        "john@example.com",
        "normal user input",
        "123456",
        "user's name with apostrophe",
      ];

      safeInputs.forEach(input => {
        const isThreat = securityManager.detectSQLInjection(input);
        expect(isThreat).toBe(false);
      });
    });

    it('should detect XSS attempts', () => {
      const xssInputs = [
        "<script>alert('xss')</script>",
        "javascript:alert('xss')",
        "<img src=x onerror=alert('xss')>",
        "<iframe src='javascript:alert(1)'></iframe>",
      ];

      xssInputs.forEach(input => {
        const isThreat = securityManager.detectXSS(input);
        expect(isThreat).toBe(true);
      });
    });

    it('should detect timing attacks', () => {
      const timingData = [
        { operation: 'login', duration: 100 },
        { operation: 'login', duration: 105 },
        { operation: 'login', duration: 2000 }, // Suspicious timing
        { operation: 'login', duration: 98 },
      ];

      timingData.forEach(data => {
        securityManager.recordOperationTiming(data.operation, data.duration);
      });

      const isTimingAttack = securityManager.detectTimingAttack('login');
      expect(isTimingAttack).toBe(true);
    });

    it('should detect brute force attacks', () => {
      const clientIP = '192.168.1.100';

      // Simulate rapid failed login attempts
      for (let i = 0; i < 20; i++) {
        securityManager.recordFailedAttempt(clientIP);
      }

      const isBruteForce = securityManager.detectBruteForceAttack(clientIP);
      expect(isBruteForce).toBe(true);
    });

    it('should implement rate limiting', () => {
      const clientIP = '192.168.1.200';
      
      // First few requests should be allowed
      for (let i = 0; i < 5; i++) {
        expect(securityManager.isRateLimited(clientIP)).toBe(false);
        securityManager.recordRequest(clientIP);
      }

      // Subsequent requests should be rate limited
      expect(securityManager.isRateLimited(clientIP)).toBe(true);
    });

    it('should detect anomalous behavior patterns', () => {
      const userBehavior = {
        userId: 'user123',
        actions: [
          { type: 'login', timestamp: Date.now() },
          { type: 'view_data', timestamp: Date.now() + 1000 },
          { type: 'download_all_data', timestamp: Date.now() + 2000 }, // Suspicious
          { type: 'delete_account', timestamp: Date.now() + 3000 }, // Very suspicious
        ],
      };

      const anomalyScore = securityManager.detectAnomalousUserBehavior(userBehavior);
      expect(anomalyScore).toBeGreaterThan(0.7); // High anomaly score
    });
  });

  describe('Certificate and SSL Management', () => {
    it('should validate SSL certificates', async () => {
      const mockCertificate = {
        issuer: 'DigiCert Inc',
        subject: 'wedsync.com',
        validFrom: new Date('2024-01-01'),
        validTo: new Date('2025-12-31'),
        fingerprint: 'abc123...',
      };

      const isValid = await securityManager.validateSSLCertificate(mockCertificate);
      expect(isValid).toBe(true);
    });

    it('should detect expired certificates', async () => {
      const expiredCertificate = {
        issuer: 'Test CA',
        subject: 'expired.com',
        validFrom: new Date('2020-01-01'),
        validTo: new Date('2021-01-01'), // Expired
        fingerprint: 'def456...',
      };

      const isValid = await securityManager.validateSSLCertificate(expiredCertificate);
      expect(isValid).toBe(false);
    });

    it('should implement certificate pinning', () => {
      const pinnedFingerprints = [
        'sha256/abc123...',
        'sha256/def456...',
      ];

      securityManager.setCertificatePins('wedsync.com', pinnedFingerprints);

      const isValidPin = securityManager.validateCertificatePin(
        'wedsync.com',
        'abc123...'
      );

      expect(isValidPin).toBe(true);
    });

    it('should warn about certificate pin mismatches', () => {
      const pinnedFingerprints = ['sha256/expected123...'];
      securityManager.setCertificatePins('secure.com', pinnedFingerprints);

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const isValidPin = securityManager.validateCertificatePin(
        'secure.com',
        'different456...'
      );

      expect(isValidPin).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Certificate pin mismatch for secure.com'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Security Event Logging', () => {
    it('should log security events', () => {
      const securityEvent = {
        type: 'authentication_failure',
        severity: 'high' as const,
        userId: 'user123',
        timestamp: Date.now(),
        details: {
          reason: 'invalid_credentials',
          clientIP: '192.168.1.1',
        },
      };

      securityManager.logSecurityEvent(securityEvent);

      const logs = securityManager.getSecurityLogs();
      expect(logs).toContain(securityEvent);
    });

    it('should categorize security events by severity', () => {
      const events = [
        { type: 'login_success', severity: 'low' as const },
        { type: 'password_change', severity: 'medium' as const },
        { type: 'data_breach_attempt', severity: 'critical' as const },
      ];

      events.forEach(event => securityManager.logSecurityEvent(event));

      const criticalEvents = securityManager.getSecurityLogs('critical');
      expect(criticalEvents).toHaveLength(1);
      expect(criticalEvents[0].type).toBe('data_breach_attempt');
    });

    it('should implement log rotation', () => {
      securityManager.setMaxLogEntries(5);

      // Add more logs than the maximum
      for (let i = 0; i < 10; i++) {
        securityManager.logSecurityEvent({
          type: 'test_event',
          severity: 'low',
          timestamp: Date.now() + i,
        });
      }

      const logs = securityManager.getSecurityLogs();
      expect(logs).toHaveLength(5); // Should only keep the latest 5
    });

    it('should export security logs for analysis', () => {
      const testEvents = [
        { type: 'event1', severity: 'low' as const, timestamp: Date.now() },
        { type: 'event2', severity: 'medium' as const, timestamp: Date.now() + 1000 },
      ];

      testEvents.forEach(event => securityManager.logSecurityEvent(event));

      const exportedLogs = securityManager.exportSecurityLogs();
      
      expect(exportedLogs).toBeDefined();
      expect(exportedLogs.events).toHaveLength(2);
      expect(exportedLogs.exportTimestamp).toBeDefined();
    });
  });

  describe('Mobile-Specific Security Features', () => {
    it('should detect jailbroken/rooted devices', () => {
      // Mock jailbreak indicators
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 Cydia/1.1.32',
        writable: true,
      });

      const isJailbroken = securityManager.detectJailbrokenDevice();
      expect(isJailbroken).toBe(true);
    });

    it('should implement app integrity checks', async () => {
      const integrityCheck = await securityManager.performAppIntegrityCheck();

      expect(integrityCheck).toHaveProperty('isValid');
      expect(integrityCheck).toHaveProperty('signature');
      expect(integrityCheck).toHaveProperty('checksum');
    });

    it('should detect debugging attempts', () => {
      // Mock debugger detection
      const originalConsole = global.console;
      let debuggerDetected = false;

      Object.defineProperty(global, 'console', {
        get: () => {
          debuggerDetected = true;
          return originalConsole;
        },
        configurable: true,
      });

      const isDebugging = securityManager.detectDebugging();
      
      // Restore console
      Object.defineProperty(global, 'console', {
        value: originalConsole,
        writable: true,
      });

      expect(isDebugging).toBe(true);
    });

    it('should implement screen recording protection', () => {
      const protectionSpy = jest.spyOn(securityManager, 'enableScreenRecordingProtection');

      securityManager.enableScreenRecordingProtection();

      expect(protectionSpy).toHaveBeenCalled();
    });

    it('should detect emulator environments', () => {
      // Mock emulator characteristics
      Object.defineProperty(navigator, 'platform', { value: 'Android Emulator' });
      
      const isEmulator = securityManager.detectEmulator();
      expect(isEmulator).toBe(true);
    });
  });

  describe('Compliance and Privacy', () => {
    it('should implement GDPR data protection measures', () => {
      const gdprCompliance = securityManager.ensureGDPRCompliance();

      expect(gdprCompliance).toHaveProperty('dataMinimization', true);
      expect(gdprCompliance).toHaveProperty('consentManagement', true);
      expect(gdprCompliance).toHaveProperty('rightToErasure', true);
      expect(gdprCompliance).toHaveProperty('dataPortability', true);
    });

    it('should handle data anonymization', async () => {
      const personalData = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        analytics: {
          views: 42,
          clicks: 15,
        },
      };

      const anonymized = await securityManager.anonymizeData(personalData);

      expect(anonymized.name).not.toBe(personalData.name);
      expect(anonymized.email).not.toBe(personalData.email);
      expect(anonymized.analytics).toEqual(personalData.analytics); // Analytics preserved
    });

    it('should implement data retention policies', () => {
      securityManager.setDataRetentionPolicy({
        personalData: 30, // 30 days
        analyticsData: 365, // 1 year
        auditLogs: 2555, // 7 years
      });

      const shouldRetain = securityManager.shouldRetainData('personalData', 45); // 45 days old
      expect(shouldRetain).toBe(false);
    });

    it('should generate privacy impact assessments', () => {
      const dataProcessing = {
        dataTypes: ['personal', 'biometric'],
        purposes: ['authentication', 'fraud_prevention'],
        recipients: ['internal_systems'],
        retention: 90,
      };

      const assessment = securityManager.generatePrivacyImpactAssessment(dataProcessing);

      expect(assessment.riskLevel).toBeDefined();
      expect(assessment.recommendations).toBeDefined();
      expect(assessment.complianceStatus).toBeDefined();
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle cryptographic failures gracefully', async () => {
      mockCrypto.subtle.generateKey.mockRejectedValue(new Error('Crypto API unavailable'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const token = await securityManager.generateSessionToken();

      expect(token).toBeDefined(); // Should fallback to less secure method
      expect(consoleSpy).toHaveBeenCalledWith(
        'Crypto API failed, using fallback:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should recover from authentication system failures', async () => {
      // Simulate auth system failure
      const originalValidate = securityManager.validateSessionToken;
      securityManager.validateSessionToken = jest.fn().mockRejectedValue(new Error('Auth failure'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await securityManager.validateSessionToken('test-token');

      expect(result).toBe(false); // Should fail safely
      expect(consoleSpy).toHaveBeenCalledWith(
        'Authentication system error:',
        expect.any(Error)
      );

      // Restore original function
      securityManager.validateSessionToken = originalValidate;
      consoleSpy.mockRestore();
    });

    it('should handle security policy violations', () => {
      const violation = {
        type: 'unauthorized_access',
        userId: 'user456',
        resource: '/api/admin/users',
        timestamp: Date.now(),
      };

      const actionTaken = securityManager.handleSecurityViolation(violation);

      expect(actionTaken).toHaveProperty('blocked', true);
      expect(actionTaken).toHaveProperty('logged', true);
      expect(actionTaken).toHaveProperty('alertSent', true);
    });
  });

  describe('Configuration and Settings', () => {
    it('should allow security configuration updates', () => {
      const config = {
        encryptionAlgorithm: 'AES-256-GCM',
        keyRotationInterval: 86400000, // 24 hours
        sessionTimeout: 1800000, // 30 minutes
        maxFailedAttempts: 5,
        requireBiometrics: true,
      };

      securityManager.updateConfiguration(config);

      const savedConfig = securityManager.getConfiguration();
      expect(savedConfig).toEqual(expect.objectContaining(config));
    });

    it('should validate configuration parameters', () => {
      const invalidConfig = {
        encryptionAlgorithm: 'MD5', // Weak algorithm
        keyRotationInterval: -1, // Invalid
        sessionTimeout: 0, // Invalid
      };

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      securityManager.updateConfiguration(invalidConfig);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Weak encryption algorithm detected: MD5'
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        'Invalid configuration value: keyRotationInterval must be positive'
      );

      consoleSpy.mockRestore();
    });

    it('should persist security settings', () => {
      const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');
      
      const config = { securityLevel: 'high' };
      securityManager.updateConfiguration(config);
      securityManager.persistSettings();

      expect(setItemSpy).toHaveBeenCalledWith(
        'mobile-security-config',
        expect.stringContaining('"securityLevel":"high"')
      );

      setItemSpy.mockRestore();
    });
  });

  describe('Integration Tests', () => {
    it('should work end-to-end with authentication flow', async () => {
      // Set high security policy
      securityManager.setSecurityPolicy({
        requireBiometrics: false, // For testing
        sessionTimeout: 300000,
        maxFailedAttempts: 3,
      });

      // Generate device fingerprint
      const fingerprint = await securityManager.generateDeviceFingerprint();
      securityManager.storeDeviceFingerprint(fingerprint);

      // Create session
      const sessionToken = await securityManager.generateSessionToken();
      expect(sessionToken).toBeDefined();

      // Validate session
      const isValid = await securityManager.validateSessionToken(sessionToken);
      expect(isValid).toBe(true);

      // Test failed attempts
      await securityManager.validateSessionToken('invalid1');
      await securityManager.validateSessionToken('invalid2');
      await securityManager.validateSessionToken('invalid3');

      expect(securityManager.isAccountLocked()).toBe(true);

      // Check device fingerprint hasn't changed
      const newFingerprint = await securityManager.generateDeviceFingerprint();
      const hasChanged = securityManager.hasDeviceFingerprintChanged(newFingerprint);
      expect(hasChanged).toBe(false);
    });

    it('should handle complex threat scenarios', async () => {
      // Simulate multiple attack vectors
      const attackScenarios = [
        () => securityManager.detectSQLInjection("'; DROP TABLE users; --"),
        () => securityManager.detectXSS("<script>alert('xss')</script>"),
        () => {
          for (let i = 0; i < 10; i++) {
            securityManager.recordFailedAttempt('192.168.1.100');
          }
          return securityManager.detectBruteForceAttack('192.168.1.100');
        },
      ];

      const threats = attackScenarios.map(scenario => scenario());
      
      expect(threats.every(threat => threat === true)).toBe(true);

      // Check that all threats were logged
      const securityLogs = securityManager.getSecurityLogs();
      expect(securityLogs.length).toBeGreaterThan(0);
    });

    it('should maintain security across app lifecycle', async () => {
      // App initialization
      await securityManager.initialize();
      
      // Simulate app going to background
      securityManager.handleAppBackground();
      
      // Simulate app coming to foreground
      await securityManager.handleAppForeground();
      
      // Verify security state is maintained
      const securityStatus = securityManager.getSecurityStatus();
      expect(securityStatus.isInitialized).toBe(true);
      expect(securityStatus.isSecure).toBe(true);
    });
  });
});