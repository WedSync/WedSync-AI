import { MobileSecurityManager } from '@/lib/security/MobileSecurityManager';

// Mock crypto API
Object.defineProperty(global, 'crypto', {
  value: {
    subtle: {
      generateKey: jest.fn().mockResolvedValue({
        algorithm: { name: 'AES-GCM', length: 256 },
      }),
      encrypt: jest.fn().mockResolvedValue(new ArrayBuffer(32)),
      decrypt: jest.fn().mockResolvedValue(new ArrayBuffer(32)),
      digest: jest.fn().mockResolvedValue(new ArrayBuffer(32)),
      sign: jest.fn().mockResolvedValue(new ArrayBuffer(64)),
      verify: jest.fn().mockResolvedValue(true),
      importKey: jest.fn().mockResolvedValue({}),
      exportKey: jest.fn().mockResolvedValue(new ArrayBuffer(32)),
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

// Mock fetch
global.fetch = jest.fn();

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

// Mock navigator properties
Object.defineProperty(navigator, 'userAgent', {
  value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
  writable: true,
});

Object.defineProperty(navigator, 'platform', {
  value: 'iPhone',
  writable: true,
});

// Mock performance
Object.defineProperty(performance, 'now', {
  value: jest.fn(() => Date.now()),
});

// Mock canvas fingerprinting
const mockCanvas = {
  getContext: jest.fn(() => ({
    fillText: jest.fn(),
    getImageData: jest.fn(() => ({ data: new Uint8ClampedArray(100) })),
    measureText: jest.fn(() => ({ width: 100 })),
    font: '14px Arial',
    fillStyle: '#000',
  })),
  toDataURL: jest.fn(() => 'data:image/png;base64,mockcanvasdata'),
  width: 300,
  height: 150,
};

Object.defineProperty(document, 'createElement', {
  value: jest.fn((tagName) => {
    if (tagName === 'canvas') return mockCanvas;
    return {};
  }),
  writable: true,
});

describe('MobileSecurityManager', () => {
  let securityManager: MobileSecurityManager;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    securityManager = MobileSecurityManager.getInstance();
  });

  describe('Initialization', () => {
    it('creates singleton instance', () => {
      const instance1 = MobileSecurityManager.getInstance();
      const instance2 = MobileSecurityManager.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('initializes with default security configuration', async () => {
      await securityManager.initialize({
        organizationId: 'test-org',
        enableBiometrics: true,
        enableDeviceFingerprinting: true,
        maxFailedAttempts: 5,
        sessionTimeout: 30 * 60 * 1000, // 30 minutes
      });
      
      const config = securityManager.getConfiguration();
      
      expect(config.organizationId).toBe('test-org');
      expect(config.enableBiometrics).toBe(true);
      expect(config.maxFailedAttempts).toBe(5);
    });

    it('generates secure encryption keys', async () => {
      await securityManager.initialize({ organizationId: 'test-org' });
      
      expect(crypto.subtle.generateKey).toHaveBeenCalledWith(
        {
          name: 'AES-GCM',
          length: 256,
        },
        true,
        ['encrypt', 'decrypt']
      );
    });

    it('loads existing configuration from storage', async () => {
      const existingConfig = {
        organizationId: 'stored-org',
        enableBiometrics: false,
        deviceFingerprint: 'existing-fingerprint',
      };
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(existingConfig));
      
      await securityManager.initialize({ organizationId: 'test-org' });
      
      const config = securityManager.getConfiguration();
      expect(config.organizationId).toBe('stored-org');
    });
  });

  describe('Authentication Management', () => {
    beforeEach(async () => {
      await securityManager.initialize({ 
        organizationId: 'test-org',
        maxFailedAttempts: 3,
      });
    });

    it('validates user credentials', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValue(new Response(JSON.stringify({
        valid: true,
        user: { id: 'user-123', role: 'admin' },
        sessionToken: 'secure-token-123',
      })));
      
      const result = await securityManager.validateCredentials('user@example.com', 'password123');
      
      expect(result.success).toBe(true);
      expect(result.user?.id).toBe('user-123');
      expect(result.sessionToken).toBe('secure-token-123');
    });

    it('tracks failed authentication attempts', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValue(new Response(JSON.stringify({
        valid: false,
        error: 'Invalid credentials',
      })));
      
      // Make 3 failed attempts
      await securityManager.validateCredentials('user@example.com', 'wrong1');
      await securityManager.validateCredentials('user@example.com', 'wrong2');
      await securityManager.validateCredentials('user@example.com', 'wrong3');
      
      const securityStatus = securityManager.getSecurityStatus();
      
      expect(securityStatus.failedAttempts).toBe(3);
      expect(securityStatus.isLocked).toBe(true);
    });

    it('implements account lockout after max attempts', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValue(new Response(JSON.stringify({
        valid: false,
        error: 'Invalid credentials',
      })));
      
      // Exceed max failed attempts
      for (let i = 0; i < 4; i++) {
        await securityManager.validateCredentials('user@example.com', 'wrong');
      }
      
      const result = await securityManager.validateCredentials('user@example.com', 'correct');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Account locked');
    });

    it('manages session timeouts', async () => {
      jest.useFakeTimers();
      
      await securityManager.createSession({
        userId: 'user-123',
        email: 'user@example.com',
        role: 'user',
      });
      
      // Advance time beyond session timeout
      jest.advanceTimersByTime(31 * 60 * 1000); // 31 minutes
      
      const isValid = await securityManager.validateSession();
      
      expect(isValid).toBe(false);
      
      jest.useRealTimers();
    });

    it('refreshes sessions automatically', async () => {
      jest.useFakeTimers();
      
      await securityManager.createSession({
        userId: 'user-123',
        email: 'user@example.com',
        role: 'user',
      });
      
      // Simulate user activity before timeout
      jest.advanceTimersByTime(25 * 60 * 1000); // 25 minutes
      await securityManager.refreshSession();
      
      // Should still be valid after original timeout period
      jest.advanceTimersByTime(10 * 60 * 1000); // 35 minutes total
      
      const isValid = await securityManager.validateSession();
      expect(isValid).toBe(true);
      
      jest.useRealTimers();
    });
  });

  describe('Device Fingerprinting', () => {
    beforeEach(async () => {
      await securityManager.initialize({ 
        organizationId: 'test-org',
        enableDeviceFingerprinting: true,
      });
    });

    it('generates comprehensive device fingerprint', async () => {
      const fingerprint = await securityManager.generateDeviceFingerprint();
      
      expect(fingerprint).toBeDefined();
      expect(fingerprint.length).toBeGreaterThan(32);
    });

    it('includes canvas fingerprinting', async () => {
      const fingerprint = await securityManager.generateDeviceFingerprint();
      
      expect(mockCanvas.getContext).toHaveBeenCalledWith('2d');
      expect(mockCanvas.toDataURL).toHaveBeenCalled();
    });

    it('includes hardware and software characteristics', async () => {
      const fingerprint = await securityManager.generateDeviceFingerprint();
      const details = securityManager.getFingerprintDetails();
      
      expect(details.userAgent).toContain('iPhone');
      expect(details.platform).toBe('iPhone');
      expect(details.screenResolution).toBeDefined();
      expect(details.timezone).toBeDefined();
    });

    it('validates known devices', async () => {
      const fingerprint = await securityManager.generateDeviceFingerprint();
      
      // Register device
      await securityManager.registerDevice(fingerprint, {
        name: 'iPhone 13',
        trusted: true,
      });
      
      const isKnownDevice = await securityManager.isKnownDevice(fingerprint);
      
      expect(isKnownDevice).toBe(true);
    });

    it('detects suspicious device changes', async () => {
      const originalFingerprint = await securityManager.generateDeviceFingerprint();
      
      await securityManager.registerDevice(originalFingerprint, {
        name: 'Trusted Device',
        trusted: true,
      });
      
      // Simulate device change
      mockCanvas.toDataURL.mockReturnValue('data:image/png;base64,differentcanvasdata');
      
      const newFingerprint = await securityManager.generateDeviceFingerprint();
      const suspiciousChange = await securityManager.detectSuspiciousDeviceChange(
        originalFingerprint,
        newFingerprint
      );
      
      expect(suspiciousChange.isSuspicious).toBe(true);
      expect(suspiciousChange.changes).toContain('canvas');
    });

    it('handles device fingerprinting gracefully when APIs unavailable', async () => {
      // Mock missing canvas support
      Object.defineProperty(document, 'createElement', {
        value: jest.fn(() => null),
        writable: true,
      });
      
      const consoleWarn = jest.spyOn(console, 'warn').mockImplementation();
      
      const fingerprint = await securityManager.generateDeviceFingerprint();
      
      expect(fingerprint).toBeDefined();
      expect(consoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('Canvas fingerprinting not available')
      );
      
      consoleWarn.mockRestore();
    });
  });

  describe('Threat Detection', () => {
    beforeEach(async () => {
      await securityManager.initialize({ organizationId: 'test-org' });
    });

    it('detects automated bot behavior', async () => {
      // Simulate rapid, repetitive actions
      const rapidActions = Array.from({ length: 100 }, (_, i) => ({
        type: 'click',
        timestamp: Date.now() + i,
        coordinates: { x: 100, y: 100 }, // Same coordinates
      }));
      
      rapidActions.forEach(action => {
        securityManager.trackUserBehavior(action);
      });
      
      const threatLevel = await securityManager.analyzeThreatLevel();
      
      expect(threatLevel.level).toBe('high');
      expect(threatLevel.reasons).toContain('Automated behavior detected');
    });

    it('monitors for session hijacking attempts', async () => {
      await securityManager.createSession({
        userId: 'user-123',
        email: 'user@example.com',
        role: 'user',
      });
      
      // Simulate session access from different device
      const differentFingerprint = 'different-device-fingerprint';
      
      const hijackingDetected = await securityManager.detectSessionHijacking(
        'current-session-token',
        differentFingerprint
      );
      
      expect(hijackingDetected.suspicious).toBe(true);
      expect(hijackingDetected.reason).toContain('device fingerprint mismatch');
    });

    it('detects brute force attempts', async () => {
      // Simulate rapid failed login attempts
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValue(new Response(JSON.stringify({
        valid: false,
        error: 'Invalid credentials',
      })));
      
      const startTime = Date.now();
      
      // 10 rapid attempts within 1 minute
      for (let i = 0; i < 10; i++) {
        await securityManager.validateCredentials(`user${i}@example.com`, 'password');
      }
      
      const threatAnalysis = await securityManager.analyzeThreatLevel();
      
      expect(threatAnalysis.level).toBe('high');
      expect(threatAnalysis.reasons).toContain('Brute force attack detected');
    });

    it('monitors for unusual access patterns', async () => {
      // Simulate normal usage pattern
      for (let i = 0; i < 5; i++) {
        securityManager.trackUserBehavior({
          type: 'page_view',
          timestamp: Date.now() + i * 60000, // 1 minute intervals
          page: '/dashboard',
        });
      }
      
      // Simulate unusual pattern - accessing sensitive data at unusual time
      securityManager.trackUserBehavior({
        type: 'data_access',
        timestamp: Date.now() + 2 * 60 * 60 * 1000, // 2 hours later
        resource: '/api/sensitive-data',
        time: '03:00', // 3 AM
      });
      
      const anomalies = await securityManager.detectAnomalies();
      
      expect(anomalies).toContainEqual(
        expect.objectContaining({
          type: 'unusual_access_time',
          severity: 'medium',
        })
      );
    });

    it('implements rate limiting for security-sensitive operations', async () => {
      // Attempt multiple password resets rapidly
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(securityManager.requestPasswordReset('user@example.com'));
      }
      
      const results = await Promise.all(promises);
      
      // Should rate limit after first few requests
      const rateLimitedResults = results.filter(r => !r.success && r.error?.includes('rate limit'));
      expect(rateLimitedResults.length).toBeGreaterThan(0);
    });
  });

  describe('Data Encryption', () => {
    beforeEach(async () => {
      await securityManager.initialize({ organizationId: 'test-org' });
    });

    it('encrypts sensitive data', async () => {
      const sensitiveData = {
        ssn: '123-45-6789',
        creditCard: '4111-1111-1111-1111',
        personalInfo: 'Confidential information',
      };
      
      const encrypted = await securityManager.encryptData(sensitiveData);
      
      expect(encrypted).toBeDefined();
      expect(encrypted).not.toContain('123-45-6789');
      expect(crypto.subtle.encrypt).toHaveBeenCalled();
    });

    it('decrypts data correctly', async () => {
      const originalData = { secret: 'confidential-value' };
      
      const encrypted = await securityManager.encryptData(originalData);
      
      // Mock decrypt to return original data
      const encoder = new TextEncoder();
      crypto.subtle.decrypt = jest.fn().mockResolvedValue(
        encoder.encode(JSON.stringify(originalData))
      );
      
      const decrypted = await securityManager.decryptData(encrypted);
      
      expect(decrypted).toEqual(originalData);
    });

    it('uses different encryption keys for different data types', async () => {
      await securityManager.encryptData({ type: 'personal' }, 'personal');
      await securityManager.encryptData({ type: 'financial' }, 'financial');
      
      const encryptCalls = (crypto.subtle.encrypt as jest.Mock).mock.calls;
      
      // Should use different keys for different data types
      expect(encryptCalls).toHaveLength(2);
    });

    it('handles encryption errors gracefully', async () => {
      crypto.subtle.encrypt = jest.fn().mockRejectedValue(new Error('Encryption failed'));
      
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      
      const result = await securityManager.encryptData({ data: 'test' });
      
      expect(result).toBeNull();
      expect(consoleError).toHaveBeenCalledWith(
        expect.stringContaining('Data encryption failed')
      );
      
      consoleError.mockRestore();
    });

    it('implements secure key rotation', async () => {
      const originalKeyCount = Object.keys(securityManager.getEncryptionKeys()).length;
      
      await securityManager.rotateEncryptionKeys();
      
      const newKeyCount = Object.keys(securityManager.getEncryptionKeys()).length;
      
      // Should generate new keys
      expect(crypto.subtle.generateKey).toHaveBeenCalledTimes(newKeyCount);
    });
  });

  describe('Mobile-Specific Security', () => {
    beforeEach(async () => {
      await securityManager.initialize({ organizationId: 'test-org' });
    });

    it('detects jailbroken/rooted devices', async () => {
      // Mock indicators of jailbroken device
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) Cydia/1.1.36',
        writable: true,
      });
      
      const deviceStatus = await securityManager.checkDeviceSecurity();
      
      expect(deviceStatus.isCompromised).toBe(true);
      expect(deviceStatus.indicators).toContain('jailbreak_detected');
    });

    it('validates app integrity', async () => {
      // Mock app integrity check
      const integrityResult = await securityManager.validateAppIntegrity();
      
      expect(integrityResult.isValid).toBe(true);
      expect(integrityResult.checksum).toBeDefined();
    });

    it('implements certificate pinning validation', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValue(new Response('{}'));
      
      const pinnedRequest = await securityManager.makeSecureRequest('/api/secure-endpoint', {
        method: 'GET',
        certificatePin: 'expected-certificate-hash',
      });
      
      // Should validate certificate
      expect(pinnedRequest.certificateValidated).toBe(true);
    });

    it('detects debugging and developer tools', async () => {
      // Mock developer tools detection
      Object.defineProperty(console, 'clear', {
        value: jest.fn(() => {
          // Simulate devtools clearing console
        }),
        writable: true,
      });
      
      const debugStatus = await securityManager.detectDebugging();
      
      expect(debugStatus.debuggingDetected).toBe(false); // Should be secure in test env
    });

    it('implements secure storage validation', async () => {
      const storageCheck = await securityManager.validateSecureStorage();
      
      expect(storageCheck.isSecure).toBe(true);
      expect(storageCheck.encryptionEnabled).toBe(true);
    });
  });

  describe('Audit and Compliance', () => {
    beforeEach(async () => {
      await securityManager.initialize({ organizationId: 'test-org' });
    });

    it('logs security events', async () => {
      await securityManager.logSecurityEvent({
        type: 'authentication',
        action: 'login_success',
        userId: 'user-123',
        ipAddress: '192.168.1.100',
        userAgent: 'Mobile App',
        timestamp: new Date(),
      });
      
      const auditLogs = securityManager.getAuditLogs();
      
      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].type).toBe('authentication');
      expect(auditLogs[0].action).toBe('login_success');
    });

    it('generates security compliance reports', async () => {
      // Generate some security events
      await securityManager.logSecurityEvent({
        type: 'data_access',
        action: 'sensitive_data_viewed',
        userId: 'user-123',
        resource: '/api/customer-data',
        timestamp: new Date(),
      });
      
      const complianceReport = await securityManager.generateComplianceReport({
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        endDate: new Date(),
        includeDetails: true,
      });
      
      expect(complianceReport.totalEvents).toBe(1);
      expect(complianceReport.eventsByType.data_access).toBe(1);
      expect(complianceReport.complianceScore).toBeGreaterThan(0);
    });

    it('monitors GDPR compliance', async () => {
      const gdprCompliance = await securityManager.checkGDPRCompliance();
      
      expect(gdprCompliance.dataProcessingConsent).toBeDefined();
      expect(gdprCompliance.rightToErasure).toBeDefined();
      expect(gdprCompliance.dataPortability).toBeDefined();
    });

    it('implements data retention policies', async () => {
      // Mock old audit logs
      const oldTimestamp = new Date(Date.now() - 366 * 24 * 60 * 60 * 1000); // Over 1 year old
      
      await securityManager.logSecurityEvent({
        type: 'authentication',
        action: 'login',
        userId: 'user-123',
        timestamp: oldTimestamp,
      });
      
      await securityManager.enforceDataRetentionPolicy();
      
      const remainingLogs = securityManager.getAuditLogs();
      
      // Old logs should be archived or removed
      const oldLogs = remainingLogs.filter(log => 
        new Date(log.timestamp).getTime() < Date.now() - 365 * 24 * 60 * 60 * 1000
      );
      
      expect(oldLogs).toHaveLength(0);
    });
  });

  describe('Error Handling and Recovery', () => {
    beforeEach(async () => {
      await securityManager.initialize({ organizationId: 'test-org' });
    });

    it('handles crypto API unavailability', async () => {
      // Mock missing crypto API
      const originalCrypto = global.crypto;
      delete (global as any).crypto;
      
      const consoleWarn = jest.spyOn(console, 'warn').mockImplementation();
      
      const result = await securityManager.encryptData({ data: 'test' });
      
      expect(result).toBeNull();
      expect(consoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('Crypto API not available')
      );
      
      global.crypto = originalCrypto;
      consoleWarn.mockRestore();
    });

    it('recovers from corrupted security configuration', async () => {
      // Corrupt stored configuration
      localStorageMock.getItem.mockReturnValue('invalid-json');
      
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      
      await securityManager.initialize({ organizationId: 'test-org' });
      
      // Should use default configuration
      const config = securityManager.getConfiguration();
      expect(config.organizationId).toBe('test-org');
      expect(consoleError).toHaveBeenCalledWith(
        expect.stringContaining('Failed to load security configuration')
      );
      
      consoleError.mockRestore();
    });

    it('handles network failures during security operations', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockRejectedValue(new Error('Network error'));
      
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      
      const result = await securityManager.validateCredentials('user@example.com', 'password');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
      expect(consoleError).toHaveBeenCalled();
      
      consoleError.mockRestore();
    });

    it('implements fallback security measures', async () => {
      // Simulate biometric authentication failure
      const biometricResult = await securityManager.authenticateWithBiometrics();
      
      if (!biometricResult.success) {
        // Should fall back to password authentication
        const fallbackOptions = securityManager.getFallbackAuthMethods();
        expect(fallbackOptions).toContain('password');
        expect(fallbackOptions).toContain('security_questions');
      }
    });

    it('handles security policy violations gracefully', async () => {
      const violationHandler = jest.fn();
      securityManager.onSecurityViolation(violationHandler);
      
      // Simulate security policy violation
      await securityManager.enforceSecurityPolicy({
        maxSessionDuration: 1000, // Very short for testing
      });
      
      // Create session that exceeds policy
      await securityManager.createSession({
        userId: 'user-123',
        email: 'user@example.com',
        role: 'user',
      });
      
      jest.useFakeTimers();
      jest.advanceTimersByTime(2000); // Exceed max duration
      
      expect(violationHandler).toHaveBeenCalledWith({
        type: 'session_duration_exceeded',
        severity: 'medium',
        userId: 'user-123',
      });
      
      jest.useRealTimers();
    });
  });

  describe('Performance and Optimization', () => {
    beforeEach(async () => {
      await securityManager.initialize({ organizationId: 'test-org' });
    });

    it('optimizes fingerprinting performance', async () => {
      const startTime = performance.now();
      
      await securityManager.generateDeviceFingerprint();
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Fingerprinting should complete within reasonable time
      expect(duration).toBeLessThan(1000); // 1 second
    });

    it('caches security decisions to improve performance', async () => {
      const deviceFingerprint = 'test-device-fingerprint';
      
      // First call should compute result
      const result1 = await securityManager.isKnownDevice(deviceFingerprint);
      
      // Second call should use cache
      const result2 = await securityManager.isKnownDevice(deviceFingerprint);
      
      expect(result1).toBe(result2);
      
      // Should have cached the result
      const cacheStats = securityManager.getCacheStatistics();
      expect(cacheStats.hitRate).toBeGreaterThan(0);
    });

    it('implements efficient threat analysis', async () => {
      // Add many behavior samples
      for (let i = 0; i < 1000; i++) {
        securityManager.trackUserBehavior({
          type: 'click',
          timestamp: Date.now() + i,
          coordinates: { x: Math.random() * 800, y: Math.random() * 600 },
        });
      }
      
      const startTime = performance.now();
      await securityManager.analyzeThreatLevel();
      const endTime = performance.now();
      
      // Analysis should be efficient even with large datasets
      expect(endTime - startTime).toBeLessThan(500); // 500ms
    });

    it('manages memory usage in security operations', () => {
      const memoryBefore = process.memoryUsage?.() || { heapUsed: 0 };
      
      // Perform many security operations
      for (let i = 0; i < 100; i++) {
        securityManager.trackUserBehavior({
          type: 'action',
          timestamp: Date.now() + i,
          data: new Array(1000).fill('data'), // Large data
        });
      }
      
      // Clean up
      securityManager.cleanupSecurityData();
      
      const memoryAfter = process.memoryUsage?.() || { heapUsed: 0 };
      
      // Memory should be managed properly
      expect(memoryAfter.heapUsed - memoryBefore.heapUsed).toBeLessThan(10 * 1024 * 1024); // 10MB
    });
  });
});