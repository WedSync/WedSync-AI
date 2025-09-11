/**
 * @fileoverview Test suite for Cross Domain Authenticator
 * Tests multi-domain SSO, token sharing, and session synchronization
 * @version 1.0.0
 * @author WedSync Development Team
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CrossDomainAuthenticator } from '../CrossDomainAuthenticator';
import type {
  CrossDomainConfiguration,
  DomainAuthBridge,
  SessionSyncResult,
  TokenShareRequest,
  DomainTrustConfiguration,
} from '../CrossDomainAuthenticator';

// Mock crypto for signature generation
global.crypto = {
  randomUUID: vi.fn(() => 'mock-uuid-123'),
  subtle: {
    sign: vi.fn(),
    verify: vi.fn(),
    generateKey: vi.fn(),
    importKey: vi.fn(),
  },
} as any;

// Mock node-fetch
global.fetch = vi.fn();

// Mock jose for JWT handling
vi.mock('jose', () => ({
  SignJWT: vi.fn(() => ({
    setProtectedHeader: vi.fn().mockReturnThis(),
    setIssuedAt: vi.fn().mockReturnThis(),
    setExpirationTime: vi.fn().mockReturnThis(),
    setIssuer: vi.fn().mockReturnThis(),
    setAudience: vi.fn().mockReturnThis(),
    sign: vi.fn().mockResolvedValue('mock-jwt-token'),
  })),
  jwtVerify: vi.fn(),
}));

describe('CrossDomainAuthenticator', () => {
  let crossDomainAuth: CrossDomainAuthenticator;
  let mockConfig: CrossDomainConfiguration;

  beforeEach(() => {
    vi.clearAllMocks();

    mockConfig = {
      domains: [
        {
          domain: 'app.wedsync.com',
          role: 'primary',
          trustedDomains: ['vendors.wedsync.com', 'couples.wedsync.com'],
          signingKey: 'primary-signing-key',
          verificationKey: 'primary-verification-key',
        },
        {
          domain: 'vendors.wedsync.com',
          role: 'secondary',
          trustedDomains: ['app.wedsync.com', 'couples.wedsync.com'],
          signingKey: 'vendors-signing-key',
          verificationKey: 'vendors-verification-key',
        },
        {
          domain: 'couples.wedsync.com',
          role: 'secondary',
          trustedDomains: ['app.wedsync.com', 'vendors.wedsync.com'],
          signingKey: 'couples-signing-key',
          verificationKey: 'couples-verification-key',
        },
      ],
      sessionSyncOptions: {
        syncOnLogin: true,
        syncOnLogout: true,
        syncInterval: 300000, // 5 minutes
        maxSessionAge: 86400000, // 24 hours
        enableHeartbeat: true,
      },
      security: {
        requireHttps: true,
        allowedOrigins: [
          'https://app.wedsync.com',
          'https://vendors.wedsync.com',
          'https://couples.wedsync.com',
        ],
        tokenTtl: 3600, // 1 hour
        maxRedirects: 3,
        csrfProtection: true,
      },
    };

    crossDomainAuth = new CrossDomainAuthenticator(mockConfig);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Domain Trust Configuration', () => {
    it('should establish trust relationship between domains', async () => {
      const trustConfig: DomainTrustConfiguration = {
        sourceDomain: 'app.wedsync.com',
        targetDomain: 'vendors.wedsync.com',
        trustLevel: 'full',
        permissions: ['token_sharing', 'session_sync', 'user_attributes'],
        expiresAt: new Date(Date.now() + 86400000), // 24 hours
      };

      const result = await crossDomainAuth.establishTrust(trustConfig);

      expect(result.success).toBe(true);
      expect(result.trustId).toBeDefined();
      expect(result.configuration?.trustLevel).toBe('full');
    });

    it('should validate domain trust before operations', async () => {
      const trustCheck = await crossDomainAuth.validateDomainTrust(
        'app.wedsync.com',
        'vendors.wedsync.com',
      );

      expect(trustCheck.trusted).toBe(true);
      expect(trustCheck.permissions).toContain('token_sharing');
      expect(trustCheck.permissions).toContain('session_sync');
    });

    it('should reject untrusted domain requests', async () => {
      const trustCheck = await crossDomainAuth.validateDomainTrust(
        'app.wedsync.com',
        'malicious.com',
      );

      expect(trustCheck.trusted).toBe(false);
      expect(trustCheck.reason).toContain('not in trusted domains');
    });
  });

  describe('Token Sharing', () => {
    it('should share authentication token across trusted domains', async () => {
      const tokenRequest: TokenShareRequest = {
        sourceDomain: 'app.wedsync.com',
        targetDomain: 'vendors.wedsync.com',
        userId: 'user-123',
        sessionId: 'session-abc',
        userAttributes: {
          email: 'vendor@example.com',
          name: 'Wedding Vendor',
          roles: ['wedding_vendor', 'photographer'],
        },
        expiresAt: new Date(Date.now() + 3600000), // 1 hour
      };

      // Mock JWT signing
      const mockSignJWT = require('jose').SignJWT;
      mockSignJWT().sign.mockResolvedValue('shared-jwt-token');

      const result = await crossDomainAuth.shareToken(tokenRequest);

      expect(result.success).toBe(true);
      expect(result.sharedToken).toBe('shared-jwt-token');
      expect(result.tokenId).toBeDefined();
      expect(result.validUntil).toBeDefined();
    });

    it('should verify shared token from trusted domain', async () => {
      const sharedToken = 'incoming-jwt-token';
      const sourceDomain = 'app.wedsync.com';

      // Mock JWT verification
      vi.mocked(require('jose').jwtVerify).mockResolvedValue({
        payload: {
          sub: 'user-123',
          iss: 'app.wedsync.com',
          aud: 'vendors.wedsync.com',
          exp: Math.floor(Date.now() / 1000) + 3600,
          user_attributes: {
            email: 'vendor@example.com',
            roles: ['wedding_vendor'],
          },
        },
      });

      const result = await crossDomainAuth.verifySharedToken(
        sharedToken,
        sourceDomain,
      );

      expect(result.valid).toBe(true);
      expect(result.userId).toBe('user-123');
      expect(result.userAttributes?.email).toBe('vendor@example.com');
    });

    it('should reject expired shared tokens', async () => {
      const expiredToken = 'expired-jwt-token';

      vi.mocked(require('jose').jwtVerify).mockRejectedValue(
        new Error('JWT expired'),
      );

      const result = await crossDomainAuth.verifySharedToken(
        expiredToken,
        'app.wedsync.com',
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('JWT expired');
    });
  });

  describe('Session Synchronization', () => {
    it('should synchronize session across trusted domains', async () => {
      const sessionData = {
        userId: 'user-123',
        sessionId: 'session-abc',
        userAttributes: {
          email: 'user@example.com',
          name: 'Test User',
          businessType: 'photographer',
        },
        loginTime: new Date(),
        lastActivity: new Date(),
        sourceDomain: 'app.wedsync.com',
      };

      // Mock successful session sync requests
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, sessionSynced: true }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, sessionSynced: true }),
        } as Response);

      const result =
        await crossDomainAuth.syncSessionToTrustedDomains(sessionData);

      expect(result.success).toBe(true);
      expect(result.syncedDomains).toContain('vendors.wedsync.com');
      expect(result.syncedDomains).toContain('couples.wedsync.com');
      expect(result.failedDomains).toHaveLength(0);
    });

    it('should handle partial session sync failures', async () => {
      const sessionData = {
        userId: 'user-123',
        sessionId: 'session-abc',
        userAttributes: { email: 'user@example.com' },
        sourceDomain: 'app.wedsync.com',
      };

      // Mock mixed success/failure responses
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ error: 'Internal server error' }),
        } as Response);

      const result =
        await crossDomainAuth.syncSessionToTrustedDomains(sessionData);

      expect(result.success).toBe(false); // Partial failure
      expect(result.syncedDomains).toHaveLength(1);
      expect(result.failedDomains).toHaveLength(1);
      expect(result.failedDomains[0].domain).toBe('couples.wedsync.com');
    });

    it('should invalidate session across all domains on logout', async () => {
      const logoutRequest = {
        userId: 'user-123',
        sessionId: 'session-abc',
        sourceDomain: 'app.wedsync.com',
        reason: 'user_logout',
      };

      // Mock successful logout sync
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({ success: true, sessionInvalidated: true }),
      } as Response);

      const result =
        await crossDomainAuth.invalidateSessionAcrossDomains(logoutRequest);

      expect(result.success).toBe(true);
      expect(result.invalidatedDomains).toHaveLength(2);
      expect(fetch).toHaveBeenCalledTimes(2); // Called for each trusted domain
    });
  });

  describe('Authentication Bridge', () => {
    it('should create authentication bridge request', async () => {
      const bridgeRequest = {
        sourceDomain: 'app.wedsync.com',
        targetDomain: 'vendors.wedsync.com',
        userId: 'user-123',
        redirectUrl: 'https://vendors.wedsync.com/dashboard',
        sessionData: {
          userAttributes: {
            email: 'vendor@example.com',
            businessType: 'photographer',
          },
        },
      };

      const result = await crossDomainAuth.createAuthBridge(bridgeRequest);

      expect(result.success).toBe(true);
      expect(result.bridgeToken).toBeDefined();
      expect(result.bridgeUrl).toContain('vendors.wedsync.com');
      expect(result.bridgeUrl).toContain('bridge_token=');
      expect(result.expiresAt).toBeDefined();
    });

    it('should consume authentication bridge token', async () => {
      const bridgeToken = 'bridge-token-123';
      const targetDomain = 'vendors.wedsync.com';

      // Mock bridge token verification
      vi.mocked(require('jose').jwtVerify).mockResolvedValue({
        payload: {
          bridge_id: 'bridge-123',
          user_id: 'user-123',
          source_domain: 'app.wedsync.com',
          target_domain: 'vendors.wedsync.com',
          redirect_url: 'https://vendors.wedsync.com/dashboard',
          exp: Math.floor(Date.now() / 1000) + 300, // 5 minutes
          user_attributes: {
            email: 'vendor@example.com',
            businessType: 'photographer',
          },
        },
      });

      const result = await crossDomainAuth.consumeAuthBridge(
        bridgeToken,
        targetDomain,
      );

      expect(result.success).toBe(true);
      expect(result.userId).toBe('user-123');
      expect(result.redirectUrl).toBe('https://vendors.wedsync.com/dashboard');
      expect(result.userAttributes?.businessType).toBe('photographer');
    });

    it('should prevent bridge token reuse', async () => {
      const bridgeToken = 'used-bridge-token';

      // First consumption should succeed
      vi.mocked(require('jose').jwtVerify).mockResolvedValueOnce({
        payload: {
          bridge_id: 'bridge-123',
          user_id: 'user-123',
          exp: Math.floor(Date.now() / 1000) + 300,
        },
      });

      const firstResult = await crossDomainAuth.consumeAuthBridge(
        bridgeToken,
        'vendors.wedsync.com',
      );
      expect(firstResult.success).toBe(true);

      // Second consumption should fail
      const secondResult = await crossDomainAuth.consumeAuthBridge(
        bridgeToken,
        'vendors.wedsync.com',
      );
      expect(secondResult.success).toBe(false);
      expect(secondResult.error).toContain('already consumed');
    });
  });

  describe('Wedding Industry Cross-Domain Features', () => {
    it('should handle vendor portal to couple portal authentication', async () => {
      const vendorToCouple = {
        vendorId: 'photographer-123',
        coupleId: 'couple-456',
        weddingId: 'wedding-789',
        accessType: 'gallery_sharing',
        sourceDomain: 'vendors.wedsync.com',
        targetDomain: 'couples.wedsync.com',
        permissions: ['view_gallery', 'download_photos', 'leave_feedback'],
      };

      const result =
        await crossDomainAuth.createWeddingAccessBridge(vendorToCouple);

      expect(result.success).toBe(true);
      expect(result.accessToken).toBeDefined();
      expect(result.allowedActions).toContain('view_gallery');
      expect(result.weddingContext?.weddingId).toBe('wedding-789');
    });

    it('should synchronize wedding team member access', async () => {
      const teamMemberSync = {
        teamId: 'planning-team-1',
        memberId: 'planner-sarah',
        weddingIds: ['wedding-1', 'wedding-2', 'wedding-3'],
        role: 'lead_planner',
        permissions: [
          'timeline_management',
          'vendor_coordination',
          'client_communication',
        ],
        sourceDomain: 'app.wedsync.com',
        targetDomains: ['vendors.wedsync.com', 'couples.wedsync.com'],
      };

      const result =
        await crossDomainAuth.syncWeddingTeamAccess(teamMemberSync);

      expect(result.success).toBe(true);
      expect(result.syncedWeddings).toBe(3);
      expect(result.accessGranted).toContain('vendors.wedsync.com');
      expect(result.accessGranted).toContain('couples.wedsync.com');
    });

    it('should handle venue booking system integration', async () => {
      const venueIntegration = {
        venueId: 'venue-grand-ballroom',
        bookingSystemDomain: 'bookings.grandballroom.com',
        weddingId: 'wedding-123',
        coupleId: 'couple-456',
        accessType: 'booking_management',
        allowedOperations: [
          'view_availability',
          'modify_booking',
          'add_services',
        ],
      };

      const result =
        await crossDomainAuth.integrateVenueBookingSystem(venueIntegration);

      expect(result.success).toBe(true);
      expect(result.integrationToken).toBeDefined();
      expect(result.bookingSystemUrl).toContain('bookings.grandballroom.com');
      expect(result.allowedOperations).toContain('modify_booking');
    });
  });

  describe('Security and Validation', () => {
    it('should validate HTTPS requirement', async () => {
      const httpRequest = {
        sourceDomain: 'http://app.wedsync.com', // HTTP instead of HTTPS
        targetDomain: 'vendors.wedsync.com',
        userId: 'user-123',
      };

      const result = await crossDomainAuth.createAuthBridge(httpRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('HTTPS required');
    });

    it('should prevent CSRF attacks', async () => {
      const suspiciousRequest = {
        sourceDomain: 'app.wedsync.com',
        targetDomain: 'vendors.wedsync.com',
        userId: 'user-123',
        origin: 'https://malicious.com', // Different origin
      };

      const result = await crossDomainAuth.createAuthBridge(suspiciousRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('CSRF protection');
    });

    it('should enforce rate limiting on bridge requests', async () => {
      const userId = 'rate-limited-user';

      // Make multiple rapid requests
      const requests = Array.from({ length: 10 }, () =>
        crossDomainAuth.createAuthBridge({
          sourceDomain: 'app.wedsync.com',
          targetDomain: 'vendors.wedsync.com',
          userId,
          redirectUrl: 'https://vendors.wedsync.com/dashboard',
        }),
      );

      const results = await Promise.all(requests);

      const successCount = results.filter((r) => r.success).length;
      const rateLimitedCount = results.filter(
        (r) => !r.success && r.error?.includes('rate limit'),
      ).length;

      expect(successCount).toBeLessThan(10);
      expect(rateLimitedCount).toBeGreaterThan(0);
    });

    it('should validate token signatures', async () => {
      const tamperedToken = 'tampered-jwt-token';

      vi.mocked(require('jose').jwtVerify).mockRejectedValue(
        new Error('Invalid signature'),
      );

      const result = await crossDomainAuth.verifySharedToken(
        tamperedToken,
        'app.wedsync.com',
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid signature');
    });
  });

  describe('Monitoring and Health Checks', () => {
    it('should monitor cross-domain authentication health', async () => {
      // Mock health check responses from trusted domains
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            status: 'healthy',
            responseTime: 120,
            lastHeartbeat: new Date().toISOString(),
          }),
      } as Response);

      const healthStatus = await crossDomainAuth.checkDomainsHealth();

      expect(healthStatus.overall).toBe('healthy');
      expect(healthStatus.domains).toHaveLength(2); // Trusted domains
      expect(healthStatus.domains[0].status).toBe('healthy');
      expect(healthStatus.domains[0].responseTime).toBeLessThan(1000);
    });

    it('should detect unhealthy domains', async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ status: 'healthy' }),
        } as Response)
        .mockRejectedValueOnce(new Error('Connection refused'));

      const healthStatus = await crossDomainAuth.checkDomainsHealth();

      expect(healthStatus.overall).toBe('degraded');
      expect(healthStatus.healthyDomains).toBe(1);
      expect(healthStatus.unhealthyDomains).toBe(1);
    });

    it('should track session sync statistics', async () => {
      const stats = await crossDomainAuth.getSessionSyncStatistics({
        from: new Date(Date.now() - 86400000), // Last 24 hours
        to: new Date(),
      });

      expect(stats.totalSyncRequests).toBeDefined();
      expect(stats.successfulSyncs).toBeDefined();
      expect(stats.failedSyncs).toBeDefined();
      expect(stats.averageResponseTime).toBeDefined();
      expect(stats.domainBreakdown).toBeDefined();
    });
  });

  describe('Token Cleanup and Maintenance', () => {
    it('should clean up expired tokens', async () => {
      const cleanupResult = await crossDomainAuth.cleanupExpiredTokens();

      expect(cleanupResult.success).toBe(true);
      expect(cleanupResult.tokensRemoved).toBeDefined();
      expect(cleanupResult.bridgesRemoved).toBeDefined();
    });

    it('should refresh domain signing keys', async () => {
      const keyRotationResult =
        await crossDomainAuth.rotateSigningKeys('app.wedsync.com');

      expect(keyRotationResult.success).toBe(true);
      expect(keyRotationResult.newKeyId).toBeDefined();
      expect(keyRotationResult.oldKeyDeprecated).toBe(true);
    });
  });
});
