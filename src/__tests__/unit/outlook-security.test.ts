/**
 * WS-217 Outlook Security Module - Unit Tests
 *
 * Test Suite: outlook-security-validation
 * Coverage: Security components (OAuth, webhook validation, data protection)
 *
 * @author WS-217-team-c
 * @version 1.0.0
 * @created 2025-01-22
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { validateOutlookWebhook } from '../../lib/webhooks/outlook/outlook-security';
import { validateOAuthToken } from '../../lib/webhooks/outlook/outlook-oauth-security';
import {
  validateGDPRConsent,
  anonymizeWeddingData,
} from '../../lib/webhooks/outlook/outlook-data-protection';

// Mock data for testing
const mockValidWebhook = {
  subscriptionId: 'valid-subscription-123',
  changeType: 'created',
  tenantId: 'tenant-456',
  clientState: 'valid-client-state-token',
  subscriptionExpirationDateTime: '2025-01-25T14:00:00.000Z',
  resource: '/me/calendar/events/event-123',
  resourceData: {
    id: 'event-123',
    subject: 'Wedding Ceremony - John & Jane',
    start: { dateTime: '2025-08-15T14:00:00.000Z' },
    end: { dateTime: '2025-08-15T15:00:00.000Z' },
  },
};

const mockValidOAuthToken = {
  aud: 'valid-client-id',
  iss: 'https://sts.windows.net/tenant-id/',
  iat: Math.floor(Date.now() / 1000) - 300, // 5 minutes ago
  exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
  scp: 'Calendars.ReadWrite',
  tid: 'tenant-456',
  sub: 'user-123',
};

const mockWeddingData = {
  coupleNames: ['Sarah Johnson', 'Michael Chen'],
  venue: 'Grand Wedding Hall',
  weddingDate: '2025-08-15',
  guestList: ['guest1@example.com', 'guest2@example.com'],
  vendorInfo: 'Photographer: John Smith, Phone: +1234567890',
};

describe('Outlook Security Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock environment variables
    process.env.OUTLOOK_WEBHOOK_SECRET = 'test-webhook-secret';
    process.env.OUTLOOK_CLIENT_ID = 'valid-client-id';
    process.env.OUTLOOK_TENANT_ID = 'tenant-456';
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Webhook Signature Validation', () => {
    it('should validate correct HMAC signatures', async () => {
      const payload = JSON.stringify(mockValidWebhook);
      const validSignature = 'sha256=mock-valid-signature';

      // Mock crypto validation to return true for this test
      vi.spyOn(require('crypto'), 'timingSafeEqual').mockReturnValue(true);

      const result = await validateOutlookWebhook({
        payload,
        signature: validSignature,
        subscriptionId: mockValidWebhook.subscriptionId,
        clientState: mockValidWebhook.clientState,
      });

      expect(result.isValid).toBe(true);
      expect(result.validationResults.signatureValid).toBe(true);
    });

    it('should reject invalid HMAC signatures', async () => {
      const payload = JSON.stringify(mockValidWebhook);
      const invalidSignature = 'sha256=invalid-signature';

      // Mock crypto validation to return false
      vi.spyOn(require('crypto'), 'timingSafeEqual').mockReturnValue(false);

      const result = await validateOutlookWebhook({
        payload,
        signature: invalidSignature,
        subscriptionId: mockValidWebhook.subscriptionId,
        clientState: mockValidWebhook.clientState,
      });

      expect(result.isValid).toBe(false);
      expect(result.validationResults.signatureValid).toBe(false);
      expect(result.securityViolations).toContain('INVALID_SIGNATURE');
    });

    it('should enforce rate limiting per IP address', async () => {
      const payload = JSON.stringify(mockValidWebhook);
      const signature = 'sha256=mock-valid-signature';
      const clientIP = '192.168.1.100';

      // Mock multiple rapid requests from same IP
      const requests = Array.from({ length: 15 }, () =>
        validateOutlookWebhook({
          payload,
          signature,
          subscriptionId: mockValidWebhook.subscriptionId,
          clientState: mockValidWebhook.clientState,
          clientIP,
        }),
      );

      const results = await Promise.all(requests);

      // Some requests should be rate limited (default: 10 per minute)
      const rateLimitedResults = results.filter((r) =>
        r.securityViolations?.includes('RATE_LIMIT_EXCEEDED'),
      );

      expect(rateLimitedResults.length).toBeGreaterThan(0);
    });

    it('should validate client state tokens with expiration', async () => {
      const expiredClientState = 'expired-token-' + (Date.now() - 3600000); // 1 hour ago
      const payload = JSON.stringify({
        ...mockValidWebhook,
        clientState: expiredClientState,
      });

      const result = await validateOutlookWebhook({
        payload,
        signature: 'sha256=mock-signature',
        subscriptionId: mockValidWebhook.subscriptionId,
        clientState: expiredClientState,
      });

      expect(result.isValid).toBe(false);
      expect(result.validationResults.clientStateValid).toBe(false);
      expect(result.securityViolations).toContain('EXPIRED_CLIENT_STATE');
    });

    it('should enforce HTTPS-only webhook URLs', async () => {
      const httpWebhookUrl = 'http://insecure-webhook.example.com/webhook';

      const result = await validateOutlookWebhook({
        payload: JSON.stringify(mockValidWebhook),
        signature: 'sha256=mock-signature',
        subscriptionId: mockValidWebhook.subscriptionId,
        clientState: mockValidWebhook.clientState,
        webhookUrl: httpWebhookUrl,
      });

      expect(result.isValid).toBe(false);
      expect(result.securityViolations).toContain('INSECURE_WEBHOOK_URL');
    });
  });

  describe('OAuth Token Validation', () => {
    it('should validate properly signed JWT tokens', async () => {
      const validToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9...'; // Mock JWT

      // Mock JWT verification
      vi.mock('jsonwebtoken', () => ({
        verify: vi.fn().mockReturnValue(mockValidOAuthToken),
      }));

      const result = await validateOAuthToken({
        token: validToken,
        clientId: 'valid-client-id',
        tenantId: 'tenant-456',
      });

      expect(result.isValid).toBe(true);
      expect(result.tokenData?.aud).toBe('valid-client-id');
      expect(result.tokenData?.scp).toBe('Calendars.ReadWrite');
    });

    it('should reject expired tokens', async () => {
      const expiredTokenData = {
        ...mockValidOAuthToken,
        exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
      };

      vi.mock('jsonwebtoken', () => ({
        verify: vi.fn().mockReturnValue(expiredTokenData),
      }));

      const result = await validateOAuthToken({
        token: 'expired-token',
        clientId: 'valid-client-id',
        tenantId: 'tenant-456',
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('TOKEN_EXPIRED');
    });

    it('should validate required calendar scopes', async () => {
      const insufficientScopeToken = {
        ...mockValidOAuthToken,
        scp: 'User.Read', // Missing calendar permissions
      };

      vi.mock('jsonwebtoken', () => ({
        verify: vi.fn().mockReturnValue(insufficientScopeToken),
      }));

      const result = await validateOAuthToken({
        token: 'insufficient-scope-token',
        clientId: 'valid-client-id',
        tenantId: 'tenant-456',
        requiredScopes: ['Calendars.ReadWrite'],
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('INSUFFICIENT_SCOPE');
    });

    it('should validate tenant authorization', async () => {
      const wrongTenantToken = {
        ...mockValidOAuthToken,
        tid: 'unauthorized-tenant-789',
      };

      vi.mock('jsonwebtoken', () => ({
        verify: vi.fn().mockReturnValue(wrongTenantToken),
      }));

      const result = await validateOAuthToken({
        token: 'wrong-tenant-token',
        clientId: 'valid-client-id',
        tenantId: 'tenant-456',
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('UNAUTHORIZED_TENANT');
    });
  });

  describe('GDPR Data Protection', () => {
    it('should validate explicit user consent for calendar access', async () => {
      const validConsent = {
        userId: 'user-123',
        organizationId: 'org-456',
        consentType: 'outlook_calendar_sync',
        consentGiven: true,
        consentTimestamp: new Date().toISOString(),
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0...',
      };

      const result = await validateGDPRConsent(validConsent);

      expect(result.isValid).toBe(true);
      expect(result.consentLevel).toBe('explicit');
    });

    it('should reject consent without explicit permission', async () => {
      const invalidConsent = {
        userId: 'user-123',
        organizationId: 'org-456',
        consentType: 'outlook_calendar_sync',
        consentGiven: false, // No explicit consent
        consentTimestamp: new Date().toISOString(),
      };

      const result = await validateGDPRConsent(invalidConsent);

      expect(result.isValid).toBe(false);
      expect(result.violations).toContain('NO_EXPLICIT_CONSENT');
    });

    it('should properly anonymize wedding data for logging', async () => {
      const result = await anonymizeWeddingData(mockWeddingData, 'minimal');

      expect(result.coupleNames).toEqual(['S****** J******', 'M****** C***']);
      expect(result.venue).toBe('G**** W****** H***');
      expect(result.guestList).toBeUndefined(); // Removed in minimal anonymization
      expect(result.vendorInfo).toBeUndefined(); // Removed in minimal anonymization
    });

    it('should provide different anonymization levels', async () => {
      const minimalResult = await anonymizeWeddingData(
        mockWeddingData,
        'minimal',
      );
      const standardResult = await anonymizeWeddingData(
        mockWeddingData,
        'standard',
      );
      const fullResult = await anonymizeWeddingData(mockWeddingData, 'full');

      // Minimal: Basic masking
      expect(minimalResult.coupleNames).toEqual([
        'S****** J******',
        'M****** C***',
      ]);

      // Standard: More thorough anonymization
      expect(standardResult.coupleNames).toEqual(['[REDACTED]', '[REDACTED]']);
      expect(standardResult.venue).toBe('[VENUE_REDACTED]');

      // Full: Complete anonymization
      expect(fullResult.coupleNames).toBeUndefined();
      expect(fullResult.venue).toBeUndefined();
      expect(fullResult.weddingDate).toBeUndefined();
    });

    it('should track data retention and auto-deletion', async () => {
      const testDataRecord = {
        dataId: 'wedding-data-123',
        organizationId: 'org-456',
        dataType: 'wedding_calendar_sync',
        createdAt: new Date('2018-01-01'), // 7 years ago
        retentionPeriod: 7 * 365 * 24 * 60 * 60 * 1000, // 7 years in milliseconds
      };

      // Mock the data protection service
      const { checkRetentionPolicy } = await import(
        '../../lib/webhooks/outlook/outlook-data-protection'
      );

      const result = await checkRetentionPolicy(testDataRecord);

      expect(result.shouldDelete).toBe(true);
      expect(result.reason).toBe('RETENTION_PERIOD_EXCEEDED');
      expect(result.daysOverdue).toBeGreaterThan(0);
    });

    it('should implement right to erasure (GDPR Article 17)', async () => {
      const erasureRequest = {
        userId: 'user-123',
        organizationId: 'org-456',
        requestType: 'complete_erasure',
        requestedBy: 'data_subject',
        legalBasis: 'gdpr_article_17',
      };

      const { processErasureRequest } = await import(
        '../../lib/webhooks/outlook/outlook-data-protection'
      );

      const result = await processErasureRequest(erasureRequest);

      expect(result.success).toBe(true);
      expect(result.dataTypesErased).toContain('outlook_calendar_events');
      expect(result.dataTypesErased).toContain('outlook_access_tokens');
      expect(result.dataTypesErased).toContain('wedding_timeline_mappings');
      expect(result.completedAt).toBeDefined();
    });
  });

  describe('Security Logging and Monitoring', () => {
    it('should log security violations without exposing sensitive data', async () => {
      const logSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await validateOutlookWebhook({
        payload: JSON.stringify(mockValidWebhook),
        signature: 'invalid-signature',
        subscriptionId: mockValidWebhook.subscriptionId,
        clientState: mockValidWebhook.clientState,
      });

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('[SECURITY_VIOLATION]'),
        expect.not.stringContaining('Sarah Johnson'), // No wedding data in logs
        expect.not.stringContaining('Michael Chen'),
      );

      logSpy.mockRestore();
    });

    it('should implement security event correlation', async () => {
      const securityEvents = [
        {
          type: 'INVALID_SIGNATURE',
          clientIP: '192.168.1.100',
          timestamp: Date.now(),
        },
        {
          type: 'RATE_LIMIT_EXCEEDED',
          clientIP: '192.168.1.100',
          timestamp: Date.now() + 1000,
        },
        {
          type: 'INVALID_CLIENT_STATE',
          clientIP: '192.168.1.100',
          timestamp: Date.now() + 2000,
        },
      ];

      const { correlateSecurityEvents } = await import(
        '../../lib/webhooks/outlook/outlook-security'
      );

      const result = await correlateSecurityEvents(
        securityEvents,
        '192.168.1.100',
      );

      expect(result.suspiciousActivity).toBe(true);
      expect(result.riskLevel).toBe('high');
      expect(result.recommendedAction).toBe('block_ip');
    });
  });
});

// Mock implementations for testing
vi.mock('crypto', () => ({
  createHmac: vi.fn().mockReturnValue({
    update: vi.fn().mockReturnThis(),
    digest: vi.fn().mockReturnValue('mock-hash'),
  }),
  timingSafeEqual: vi.fn(),
}));

vi.mock('jsonwebtoken', () => ({
  verify: vi.fn(),
}));
