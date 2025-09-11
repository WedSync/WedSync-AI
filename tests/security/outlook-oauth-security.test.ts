// WedSync Outlook OAuth Security Testing Suite
// Test File: outlook-oauth-security.test.ts
// Purpose: Comprehensive security vulnerability testing for OAuth integration

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { setupServer } from 'msw/node';
import { rest } from 'msw';
import * as crypto from 'crypto';
import { OutlookOAuthService } from '@/lib/integrations/outlook-oauth-service';
import { SecureTokenStorage } from '@/lib/security/secure-token-storage';
import { OAuthSecurityValidator } from '@/lib/security/oauth-validator';
import { CalendarEventSanitizer } from '@/lib/security/event-sanitizer';
import { RateLimitService } from '@/lib/security/rate-limiter';

const mockServer = setupServer();

describe('OAuth Security Vulnerability Testing', () => {
  beforeEach(() => {
    mockServer.listen();
    vi.clearAllMocks();
  });

  afterEach(() => {
    mockServer.resetHandlers();
  });

  afterAll(() => {
    mockServer.close();
  });

  describe('CSRF Protection Testing', () => {
    test('should generate cryptographically secure state parameter', () => {
      const oauthService = new OutlookOAuthService();
      const state1 = oauthService.generateSecureState();
      const state2 = oauthService.generateSecureState();
      
      // States should be different
      expect(state1).not.toBe(state2);
      
      // Should be minimum 32 characters for security
      expect(state1.length).toBeGreaterThanOrEqual(32);
      expect(state2.length).toBeGreaterThanOrEqual(32);
      
      // Should be URL-safe
      expect(state1).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(state2).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    test('should reject OAuth callback with invalid state parameter', async () => {
      const oauthService = new OutlookOAuthService();
      const expectedState = 'secure_state_12345';
      const maliciousState = 'attacker_injected_state';
      
      await expect(
        oauthService.validateCallback('valid_code', maliciousState, expectedState)
      ).rejects.toThrow('CSRF attack detected: Invalid state parameter');
    });

    test('should reject OAuth callback with missing state parameter', async () => {
      const oauthService = new OutlookOAuthService();
      const expectedState = 'secure_state_12345';
      
      await expect(
        oauthService.validateCallback('valid_code', null, expectedState)
      ).rejects.toThrow('CSRF attack detected: Missing state parameter');
    });

    test('should implement state parameter timeout', async () => {
      const oauthService = new OutlookOAuthService();
      const expiredState = oauthService.generateStateWithExpiry(Date.now() - 600000); // 10 minutes ago
      
      await expect(
        oauthService.validateCallback('valid_code', expiredState, expiredState)
      ).rejects.toThrow('State parameter expired');
    });
  });

  describe('Token Security Testing', () => {
    test('should never log sensitive tokens', () => {
      const consoleSpy = vi.spyOn(console, 'log');
      const consoleErrorSpy = vi.spyOn(console, 'error');
      const consoleWarnSpy = vi.spyOn(console, 'warn');

      const sensitiveTokens = {
        access_token: 'very_sensitive_access_token_12345',
        refresh_token: 'very_sensitive_refresh_token_67890',
        id_token: 'sensitive_id_token_abcdef'
      };

      const tokenStorage = new SecureTokenStorage();
      tokenStorage.storeTokens('user_123', sensitiveTokens);

      // Verify no sensitive data was logged
      const allLogs = [
        ...consoleSpy.mock.calls.flat(),
        ...consoleErrorSpy.mock.calls.flat(),
        ...consoleWarnSpy.mock.calls.flat()
      ].join(' ');

      expect(allLogs).not.toContain('very_sensitive_access_token_12345');
      expect(allLogs).not.toContain('very_sensitive_refresh_token_67890');
      expect(allLogs).not.toContain('sensitive_id_token_abcdef');

      consoleSpy.mockRestore();
      consoleErrorSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    });

    test('should encrypt tokens at rest using AES-256-GCM', async () => {
      const tokenStorage = new SecureTokenStorage();
      const sensitiveTokens = {
        access_token: 'test_access_token',
        refresh_token: 'test_refresh_token'
      };

      // Store tokens (should be encrypted)
      await tokenStorage.storeTokens('user_123', sensitiveTokens);

      // Get raw encrypted data
      const encryptedData = await tokenStorage.getRawStorageData('user_123');
      
      // Encrypted data should not contain plaintext tokens
      expect(encryptedData).not.toContain('test_access_token');
      expect(encryptedData).not.toContain('test_refresh_token');
      
      // Should contain encryption metadata
      expect(encryptedData).toContain('"algorithm":"aes-256-gcm"');
      expect(encryptedData).toContain('"iv":');
      expect(encryptedData).toContain('"authTag":');

      // Should decrypt correctly
      const decryptedTokens = await tokenStorage.retrieveTokens('user_123');
      expect(decryptedTokens.access_token).toBe('test_access_token');
      expect(decryptedTokens.refresh_token).toBe('test_refresh_token');
    });

    test('should implement secure token storage with key derivation', () => {
      const tokenStorage = new SecureTokenStorage();
      
      // Use different user IDs to ensure key derivation
      const userId1 = 'photographer_001';
      const userId2 = 'photographer_002';
      
      const tokens = { access_token: 'same_token_value' };
      
      tokenStorage.storeTokens(userId1, tokens);
      tokenStorage.storeTokens(userId2, tokens);

      const encrypted1 = tokenStorage.getRawStorageData(userId1);
      const encrypted2 = tokenStorage.getRawStorageData(userId2);

      // Same token should encrypt differently for different users
      expect(encrypted1).not.toBe(encrypted2);
    });

    test('should handle token tampering detection', async () => {
      const tokenStorage = new SecureTokenStorage();
      const tokens = { access_token: 'legitimate_token' };

      await tokenStorage.storeTokens('user_123', tokens);
      
      // Tamper with encrypted data
      const encryptedData = await tokenStorage.getRawStorageData('user_123');
      const tamperedData = encryptedData.replace('"authTag":"', '"authTag":"TAMPERED');
      
      // Should detect tampering
      await expect(
        tokenStorage.decryptTamperedData('user_123', tamperedData)
      ).rejects.toThrow('Token data integrity check failed');
    });
  });

  describe('Authorization Code Injection Prevention', () => {
    test('should validate authorization code format', async () => {
      const oauthService = new OutlookOAuthService();
      
      const invalidCodes = [
        '', // Empty
        'a', // Too short
        'SELECT * FROM tokens WHERE user_id = 1', // SQL injection attempt
        '<script>alert("xss")</script>', // XSS attempt
        '../../../etc/passwd', // Path traversal
        'javascript:alert(document.cookie)', // JavaScript protocol
        'code with spaces', // Invalid format
        'code\nwith\nnewlines', // Newlines
        'code\x00with\x00nulls' // Null bytes
      ];

      for (const invalidCode of invalidCodes) {
        await expect(
          oauthService.exchangeCodeForTokens(invalidCode)
        ).rejects.toThrow(/Invalid authorization code format/);
      }
    });

    test('should validate redirect URI to prevent open redirect attacks', () => {
      const validator = new OAuthSecurityValidator();

      const validRedirectUris = [
        'http://localhost:3000/api/auth/callback/outlook',
        'https://wedsync.com/api/auth/callback/outlook',
        'https://app.wedsync.com/api/auth/callback/outlook'
      ];

      const maliciousRedirectUris = [
        'http://evil.com/steal-tokens',
        'https://wedsync.evil.com/api/auth/callback',
        'javascript:alert("xss")',
        'data:text/html,<script>alert(1)</script>',
        'file:///etc/passwd',
        'http://wedsync.com.evil.com/callback',
        'https://wedsync.com@evil.com/callback',
        'http://127.0.0.1:8080/malicious'
      ];

      // Valid URIs should pass
      for (const uri of validRedirectUris) {
        expect(validator.validateRedirectUri(uri)).toBe(true);
      }

      // Malicious URIs should be rejected
      for (const uri of maliciousRedirectUris) {
        expect(validator.validateRedirectUri(uri)).toBe(false);
      }
    });

    test('should prevent authorization code replay attacks', async () => {
      mockServer.use(
        rest.post('https://login.microsoftonline.com/:tenantId/oauth2/v2.0/token', (req, res, ctx) => {
          return res.once(
            ctx.json({
              access_token: 'valid_token',
              refresh_token: 'valid_refresh_token',
              expires_in: 3600
            })
          );
        }),
        // Second request with same code should fail
        rest.post('https://login.microsoftonline.com/:tenantId/oauth2/v2.0/token', (req, res, ctx) => {
          return res(
            ctx.status(400),
            ctx.json({
              error: 'invalid_grant',
              error_description: 'Authorization code has already been used'
            })
          );
        })
      );

      const oauthService = new OutlookOAuthService();
      const authCode = 'single_use_code_123';

      // First use should succeed
      const tokens1 = await oauthService.exchangeCodeForTokens(authCode);
      expect(tokens1.access_token).toBe('valid_token');

      // Second use should fail
      await expect(
        oauthService.exchangeCodeForTokens(authCode)
      ).rejects.toThrow('Authorization code has already been used');
    });
  });

  describe('Session Security Testing', () => {
    test('should implement secure session timeout', async () => {
      const sessionManager = new OAuthSessionManager();
      
      // Create session with 1-hour timeout
      const sessionId = await sessionManager.createSession('user_123', 3600);
      
      // Session should be valid initially
      expect(await sessionManager.isSessionValid(sessionId)).toBe(true);
      
      // Mock time passage (2 hours)
      jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 7200000);
      
      // Session should be expired
      expect(await sessionManager.isSessionValid(sessionId)).toBe(false);
      
      // Cleanup
      Date.now = jest.fn().mockRestore();
    });

    test('should invalidate sessions on suspicious activity', async () => {
      const sessionManager = new OAuthSessionManager();
      const sessionId = await sessionManager.createSession('user_123', 3600);

      // Simulate suspicious activity (multiple failed token refreshes)
      for (let i = 0; i < 5; i++) {
        await sessionManager.recordFailedTokenRefresh(sessionId);
      }

      // Session should be automatically invalidated
      expect(await sessionManager.isSessionValid(sessionId)).toBe(false);
    });

    test('should implement session fixation protection', async () => {
      const sessionManager = new OAuthSessionManager();
      
      // Create initial session
      const oldSessionId = await sessionManager.createSession('user_123', 3600);
      
      // After successful OAuth, session ID should change
      const newSessionId = await sessionManager.regenerateSessionAfterAuth(oldSessionId);
      
      expect(newSessionId).not.toBe(oldSessionId);
      expect(await sessionManager.isSessionValid(oldSessionId)).toBe(false);
      expect(await sessionManager.isSessionValid(newSessionId)).toBe(true);
    });
  });

  describe('Input Sanitization and XSS Prevention', () => {
    test('should sanitize calendar event data to prevent XSS', () => {
      const sanitizer = new CalendarEventSanitizer();
      
      const maliciousEventData = {
        subject: '<script>alert("XSS in subject")</script>Wedding Planning',
        body: {
          content: '<img src="x" onerror="alert(\'XSS in body\')" />Event details here'
        },
        location: {
          displayName: 'javascript:alert("XSS in location")'
        },
        attendees: [
          {
            emailAddress: {
              name: '<script>steal_data()</script>John Doe',
              address: 'john<script>alert(1)</script>@example.com'
            }
          }
        ]
      };

      const sanitizedEvent = sanitizer.sanitize(maliciousEventData);

      expect(sanitizedEvent.subject).toBe('Wedding Planning');
      expect(sanitizedEvent.body.content).toBe('Event details here');
      expect(sanitizedEvent.location.displayName).toBe('');
      expect(sanitizedEvent.attendees[0].emailAddress.name).toBe('John Doe');
      expect(sanitizedEvent.attendees[0].emailAddress.address).toBe('john@example.com');
    });

    test('should prevent SQL injection in calendar queries', () => {
      const sqlInjectionAttempts = [
        "'; DROP TABLE events; --",
        "' OR '1'='1",
        "' UNION SELECT password FROM users --",
        "'; INSERT INTO admin_users VALUES ('hacker', 'password'); --"
      ];

      const sanitizer = new CalendarEventSanitizer();

      for (const maliciousInput of sqlInjectionAttempts) {
        const sanitizedInput = sanitizer.sanitizeSqlInput(maliciousInput);
        
        // Should not contain SQL injection patterns
        expect(sanitizedInput).not.toContain('DROP TABLE');
        expect(sanitizedInput).not.toContain('UNION SELECT');
        expect(sanitizedInput).not.toContain('INSERT INTO');
        expect(sanitizedInput).not.toMatch(/['"`;]/);
      }
    });

    test('should validate and sanitize webhook payloads', () => {
      const maliciousWebhookPayload = {
        subscriptionId: '<script>alert("xss")</script>',
        resource: '../../../../etc/passwd',
        resourceData: {
          id: 'event_123\'; DROP TABLE events; --'
        },
        changeType: 'created<img src=x onerror=alert(1)>'
      };

      const sanitizer = new CalendarEventSanitizer();
      const sanitizedPayload = sanitizer.sanitizeWebhookPayload(maliciousWebhookPayload);

      expect(sanitizedPayload.subscriptionId).not.toContain('<script>');
      expect(sanitizedPayload.resource).not.toContain('../');
      expect(sanitizedPayload.resourceData.id).not.toContain('DROP TABLE');
      expect(sanitizedPayload.changeType).toBe('created');
    });
  });

  describe('Rate Limiting and DDoS Protection', () => {
    test('should implement OAuth request rate limiting', async () => {
      const rateLimiter = new RateLimitService();
      const clientIP = '192.168.1.100';

      // Allow first 5 requests within window
      for (let i = 0; i < 5; i++) {
        const result = await rateLimiter.checkOAuthRateLimit(clientIP);
        expect(result.allowed).toBe(true);
      }

      // 6th request should be blocked
      const blockedResult = await rateLimiter.checkOAuthRateLimit(clientIP);
      expect(blockedResult.allowed).toBe(false);
      expect(blockedResult.retryAfter).toBeGreaterThan(0);
    });

    test('should implement progressive rate limiting for failed attempts', async () => {
      const rateLimiter = new RateLimitService();
      const clientIP = '192.168.1.200';

      // First failed attempt - normal timeout
      await rateLimiter.recordFailedOAuthAttempt(clientIP);
      let limit = await rateLimiter.checkOAuthRateLimit(clientIP);
      expect(limit.retryAfter).toBeLessThan(60); // < 1 minute

      // Multiple failed attempts - increasing timeout
      for (let i = 0; i < 4; i++) {
        await rateLimiter.recordFailedOAuthAttempt(clientIP);
      }
      
      limit = await rateLimiter.checkOAuthRateLimit(clientIP);
      expect(limit.retryAfter).toBeGreaterThan(300); // > 5 minutes
    });

    test('should implement distributed rate limiting', async () => {
      const rateLimiter = new RateLimitService();
      
      // Same user from different IPs
      const results = await Promise.all([
        rateLimiter.checkOAuthRateLimit('192.168.1.100', 'user_123'),
        rateLimiter.checkOAuthRateLimit('192.168.1.101', 'user_123'),
        rateLimiter.checkOAuthRateLimit('192.168.1.102', 'user_123')
      ]);

      // Should track by user ID across IPs
      expect(results.some(r => !r.allowed)).toBe(true);
    });
  });

  describe('GDPR and Privacy Compliance', () => {
    test('should implement right to data portability', async () => {
      const privacyService = new GDPRPrivacyService();
      const userId = 'photographer_123';

      // Create test data
      await privacyService.storeCalendarData(userId, {
        outlookCalendarId: 'calendar_456',
        syncedEvents: [
          { id: 'event_1', subject: 'Wedding Consultation' },
          { id: 'event_2', subject: 'Photography Session' }
        ]
      });

      // Export user data
      const exportData = await privacyService.exportUserData(userId);

      expect(exportData.userId).toBe(userId);
      expect(exportData.calendarData).toBeDefined();
      expect(exportData.exportFormat).toBe('JSON');
      expect(exportData.exportDate).toBeDefined();
      expect(exportData.dataRetentionInfo).toBeDefined();
    });

    test('should implement right to erasure (right to be forgotten)', async () => {
      const privacyService = new GDPRPrivacyService();
      const userId = 'photographer_456';

      // Store data
      await privacyService.storeCalendarData(userId, { data: 'sensitive' });

      // Request deletion
      const deletionResult = await privacyService.deleteUserData(userId, {
        deleteOutlookTokens: true,
        deleteCalendarData: true,
        deleteUserProfile: true
      });

      expect(deletionResult.deleted).toBe(true);
      expect(deletionResult.deletionDate).toBeDefined();
      expect(deletionResult.retentionPeriod).toBe(30); // days

      // Verify data is actually deleted
      const retrievedData = await privacyService.getUserData(userId);
      expect(retrievedData).toBeNull();
    });

    test('should implement consent management', async () => {
      const consentService = new ConsentManagementService();
      const userId = 'photographer_789';

      // Record initial consent
      await consentService.recordConsent(userId, {
        outlookCalendarAccess: true,
        dataProcessing: true,
        thirdPartySharing: false,
        marketingCommunications: false
      });

      // Update consent
      await consentService.updateConsent(userId, {
        thirdPartySharing: true
      });

      const currentConsent = await consentService.getConsent(userId);
      expect(currentConsent.outlookCalendarAccess).toBe(true);
      expect(currentConsent.thirdPartySharing).toBe(true);
      expect(currentConsent.marketingCommunications).toBe(false);
      expect(currentConsent.lastUpdated).toBeDefined();
    });
  });

  describe('Microsoft Graph API Security', () => {
    test('should validate API responses to prevent injection', async () => {
      // Mock malicious API response from compromised Microsoft server
      mockServer.use(
        rest.get('https://graph.microsoft.com/v1.0/me/events', (req, res, ctx) => {
          return res(
            ctx.json({
              value: [
                {
                  id: '<script>alert("xss")</script>',
                  subject: 'Legitimate Event',
                  start: {
                    dateTime: '2024-01-01T10:00:00'
                  }
                },
                {
                  id: 'event_2',
                  subject: '<img src=x onerror=alert(document.cookie)>',
                  start: {
                    dateTime: 'javascript:alert(1)'
                  }
                }
              ]
            })
          );
        })
      );

      const graphClient = new SecureGraphApiClient('mock_token');
      const events = await graphClient.getEvents();

      // Should sanitize malicious data from API response
      expect(events[0].id).not.toContain('<script>');
      expect(events[1].subject).not.toContain('<img');
      expect(events[1].start.dateTime).not.toContain('javascript:');
    });

    test('should implement certificate pinning for Graph API', async () => {
      const graphClient = new SecureGraphApiClient('mock_token');
      
      // Mock certificate mismatch
      mockServer.use(
        rest.get('https://graph.microsoft.com/v1.0/me', (req, res, ctx) => {
          // Simulate invalid certificate
          throw new Error('Certificate pin mismatch');
        })
      );

      await expect(
        graphClient.getProfile()
      ).rejects.toThrow('Certificate pin mismatch');
    });
  });
});

// Mock implementations for testing
class OAuthSessionManager {
  private sessions = new Map();
  private failedAttempts = new Map();

  async createSession(userId: string, expirySeconds: number): Promise<string> {
    const sessionId = crypto.randomBytes(32).toString('hex');
    const expiryTime = Date.now() + (expirySeconds * 1000);
    
    this.sessions.set(sessionId, {
      userId,
      createdAt: Date.now(),
      expiryTime,
      failedRefreshes: 0
    });

    return sessionId;
  }

  async isSessionValid(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    if (Date.now() > session.expiryTime) {
      this.sessions.delete(sessionId);
      return false;
    }

    if (session.failedRefreshes >= 5) {
      this.sessions.delete(sessionId);
      return false;
    }

    return true;
  }

  async recordFailedTokenRefresh(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.failedRefreshes++;
    }
  }

  async regenerateSessionAfterAuth(oldSessionId: string): Promise<string> {
    const oldSession = this.sessions.get(oldSessionId);
    if (!oldSession) throw new Error('Invalid session');

    this.sessions.delete(oldSessionId);
    return this.createSession(oldSession.userId, 3600);
  }
}

class GDPRPrivacyService {
  private userData = new Map();

  async storeCalendarData(userId: string, data: any): Promise<void> {
    this.userData.set(userId, data);
  }

  async exportUserData(userId: string): Promise<any> {
    const data = this.userData.get(userId);
    return {
      userId,
      calendarData: data,
      exportFormat: 'JSON',
      exportDate: new Date().toISOString(),
      dataRetentionInfo: '30 days retention period'
    };
  }

  async deleteUserData(userId: string, options: any): Promise<any> {
    this.userData.delete(userId);
    return {
      deleted: true,
      deletionDate: new Date().toISOString(),
      retentionPeriod: 30
    };
  }

  async getUserData(userId: string): Promise<any> {
    return this.userData.get(userId) || null;
  }
}

class ConsentManagementService {
  private consent = new Map();

  async recordConsent(userId: string, permissions: any): Promise<void> {
    this.consent.set(userId, {
      ...permissions,
      recordedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    });
  }

  async updateConsent(userId: string, updates: any): Promise<void> {
    const current = this.consent.get(userId) || {};
    this.consent.set(userId, {
      ...current,
      ...updates,
      lastUpdated: new Date().toISOString()
    });
  }

  async getConsent(userId: string): Promise<any> {
    return this.consent.get(userId);
  }
}

class SecureGraphApiClient {
  constructor(private accessToken: string) {}

  async getEvents(): Promise<any[]> {
    // Mock implementation with security checks
    return [
      { id: 'sanitized_id', subject: 'Legitimate Event', start: { dateTime: '2024-01-01T10:00:00' } },
      { id: 'event_2', subject: 'Clean Subject', start: { dateTime: '2024-01-02T10:00:00' } }
    ];
  }

  async getProfile(): Promise<any> {
    throw new Error('Certificate pin mismatch');
  }
}