/**
 * @fileoverview Test suite for Auth0 Integration
 * Tests Auth0 Management API, multiple authentication flows, and B2B features
 * @version 1.0.0
 * @author WedSync Development Team
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Auth0Integration } from '../Auth0Integration';
import type {
  Auth0Configuration,
  Auth0AuthenticationResult,
  Auth0UserProfile,
  PasswordlessAuthOptions,
  B2BOrganizationConfig,
} from '../Auth0Integration';

// Mock node-fetch
global.fetch = vi.fn();

// Mock jose for JWT verification
vi.mock('jose', () => ({
  jwtVerify: vi.fn(),
  createRemoteJWKSet: vi.fn(),
}));

describe('Auth0Integration', () => {
  let auth0Integration: Auth0Integration;
  let mockConfig: Auth0Configuration;

  beforeEach(() => {
    vi.clearAllMocks();

    mockConfig = {
      domain: 'wedsync.auth0.com',
      clientId: 'auth0-client-id',
      clientSecret: 'auth0-client-secret',
      redirectUri: 'https://app.wedsync.com/auth/auth0/callback',
      audience: 'https://api.wedsync.com',
      scopes: ['openid', 'profile', 'email', 'read:users', 'update:users'],
      managementApiClientId: 'mgmt-client-id',
      managementApiClientSecret: 'mgmt-client-secret',
      features: {
        passwordlessAuth: true,
        socialConnections: true,
        b2bOrganizations: true,
        rulesPipeline: true,
        customDomains: true,
      },
    };

    auth0Integration = new Auth0Integration(mockConfig);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('OAuth2 Authentication Flow', () => {
    it('should generate authorization URL with proper parameters', () => {
      const state = 'auth0-state-123';
      const nonce = 'auth0-nonce-456';

      const authUrl = auth0Integration.getAuthorizationUrl(
        state,
        nonce,
        'login',
      );

      expect(authUrl).toContain(`https://${mockConfig.domain}/authorize`);
      expect(authUrl).toContain(`client_id=${mockConfig.clientId}`);
      expect(authUrl).toContain(
        `redirect_uri=${encodeURIComponent(mockConfig.redirectUri)}`,
      );
      expect(authUrl).toContain(`state=${state}`);
      expect(authUrl).toContain(`nonce=${nonce}`);
      expect(authUrl).toContain('response_type=code');
      expect(authUrl).toContain('prompt=login');
    });

    it('should exchange authorization code for tokens', async () => {
      const mockTokenResponse = {
        access_token: 'auth0-access-token',
        id_token: 'auth0-id-token',
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'openid profile email',
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTokenResponse),
      } as Response);

      const result = await auth0Integration.exchangeCodeForTokens('auth-code');

      expect(result.success).toBe(true);
      expect(result.tokens?.accessToken).toBe('auth0-access-token');
      expect(result.tokens?.idToken).toBe('auth0-id-token');

      expect(fetch).toHaveBeenCalledWith(
        `https://${mockConfig.domain}/oauth/token`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/x-www-form-urlencoded',
          }),
        }),
      );
    });

    it('should handle token exchange errors gracefully', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () =>
          Promise.resolve({
            error: 'invalid_grant',
            error_description: 'Invalid authorization code',
          }),
      } as Response);

      const result =
        await auth0Integration.exchangeCodeForTokens('invalid-code');

      expect(result.success).toBe(false);
      expect(result.error).toContain('invalid_grant');
    });
  });

  describe('Passwordless Authentication', () => {
    it('should initiate passwordless email authentication', async () => {
      const options: PasswordlessAuthOptions = {
        email: 'vendor@example.com',
        type: 'email',
        authParams: {
          scope: 'openid profile email',
          state: 'passwordless-state',
        },
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            _id: 'passwordless-request-123',
            email: 'vendor@example.com',
          }),
      } as Response);

      const result = await auth0Integration.initiatePasswordlessAuth(options);

      expect(result.success).toBe(true);
      expect(result.requestId).toBe('passwordless-request-123');

      expect(fetch).toHaveBeenCalledWith(
        `https://${mockConfig.domain}/passwordless/start`,
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('vendor@example.com'),
        }),
      );
    });

    it('should initiate passwordless SMS authentication', async () => {
      const options: PasswordlessAuthOptions = {
        phoneNumber: '+1234567890',
        type: 'sms',
        authParams: {
          scope: 'openid profile',
        },
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            _id: 'sms-request-456',
            phone_number: '+1234567890',
          }),
      } as Response);

      const result = await auth0Integration.initiatePasswordlessAuth(options);

      expect(result.success).toBe(true);
      expect(result.requestId).toBe('sms-request-456');
    });

    it('should verify passwordless authentication code', async () => {
      const mockTokenResponse = {
        access_token: 'passwordless-token',
        id_token: 'passwordless-id-token',
        token_type: 'Bearer',
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTokenResponse),
      } as Response);

      const result = await auth0Integration.verifyPasswordlessAuth(
        'vendor@example.com',
        '123456',
      );

      expect(result.success).toBe(true);
      expect(result.tokens?.accessToken).toBe('passwordless-token');
    });
  });

  describe('Credentials-based Authentication', () => {
    it('should authenticate with username and password', async () => {
      const mockTokenResponse = {
        access_token: 'credentials-token',
        id_token: 'credentials-id-token',
        token_type: 'Bearer',
        expires_in: 3600,
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTokenResponse),
      } as Response);

      const result = await auth0Integration.authenticateWithCredentials({
        username: 'photographer@example.com',
        password: 'secure-password-123',
        connection: 'Username-Password-Authentication',
      });

      expect(result.success).toBe(true);
      expect(result.tokens?.accessToken).toBe('credentials-token');

      expect(fetch).toHaveBeenCalledWith(
        `https://${mockConfig.domain}/oauth/token`,
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('photographer@example.com'),
        }),
      );
    });

    it('should handle invalid credentials', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: () =>
          Promise.resolve({
            error: 'access_denied',
            error_description: 'Wrong email or password.',
          }),
      } as Response);

      const result = await auth0Integration.authenticateWithCredentials({
        username: 'invalid@example.com',
        password: 'wrong-password',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Wrong email or password');
    });
  });

  describe('Management API Integration', () => {
    it('should get Management API access token', async () => {
      const mockMgmtTokenResponse = {
        access_token: 'mgmt-api-token',
        token_type: 'Bearer',
        expires_in: 86400,
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMgmtTokenResponse),
      } as Response);

      const token = await auth0Integration.getManagementApiToken();

      expect(token).toBe('mgmt-api-token');

      expect(fetch).toHaveBeenCalledWith(
        `https://${mockConfig.domain}/oauth/token`,
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining(
            `audience=https%3A%2F%2F${mockConfig.domain}%2Fapi%2Fv2%2F`,
          ),
        }),
      );
    });

    it('should fetch user profile via Management API', async () => {
      const mockUserProfile: Auth0UserProfile = {
        user_id: 'auth0|user123',
        email: 'vendor@example.com',
        email_verified: true,
        name: 'Wedding Vendor',
        nickname: 'vendor',
        picture: 'https://example.com/avatar.jpg',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-15T12:00:00.000Z',
        user_metadata: {
          businessType: 'photographer',
          yearsExperience: 5,
        },
        app_metadata: {
          roles: ['vendor', 'photographer'],
          permissions: ['read:bookings', 'write:portfolio'],
        },
      };

      // Mock Management API token
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ access_token: 'mgmt-token' }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockUserProfile),
        } as Response);

      const profile = await auth0Integration.getUserProfile('auth0|user123');

      expect(profile).toBeDefined();
      expect(profile?.email).toBe('vendor@example.com');
      expect(profile?.user_metadata?.businessType).toBe('photographer');
      expect(profile?.app_metadata?.roles).toContain('photographer');
    });

    it('should update user metadata', async () => {
      const updates = {
        user_metadata: {
          businessType: 'venue',
          businessName: 'Grand Ballroom Events',
          capacity: 200,
        },
      };

      // Mock Management API token and update response
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ access_token: 'mgmt-token' }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              user_id: 'auth0|user123',
              ...updates,
            }),
        } as Response);

      const result = await auth0Integration.updateUserProfile(
        'auth0|user123',
        updates,
      );

      expect(result.success).toBe(true);
      expect(fetch).toHaveBeenLastCalledWith(
        `https://${mockConfig.domain}/api/v2/users/auth0|user123`,
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(updates),
        }),
      );
    });
  });

  describe('B2B Organizations Support', () => {
    it('should create B2B organization', async () => {
      const orgConfig: B2BOrganizationConfig = {
        name: 'Wedding Vendor Network',
        displayName: 'Wedding Vendor Network',
        domains: ['weddingvendors.com'],
        metadata: {
          industry: 'wedding_services',
          tier: 'premium',
          memberCount: 150,
        },
      };

      // Mock Management API responses
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ access_token: 'mgmt-token' }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              id: 'org_123456',
              ...orgConfig,
            }),
        } as Response);

      const result = await auth0Integration.createB2BOrganization(orgConfig);

      expect(result.success).toBe(true);
      expect(result.organization?.id).toBe('org_123456');
      expect(result.organization?.name).toBe('Wedding Vendor Network');
    });

    it('should invite user to organization', async () => {
      const invitation = {
        inviter: {
          name: 'Admin User',
        },
        invitee: {
          email: 'newvendor@example.com',
        },
        roles: ['vendor_member'],
        client_id: mockConfig.clientId,
        connection_id: 'con_12345',
        ttl_sec: 604800, // 7 days
      };

      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ access_token: 'mgmt-token' }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              id: 'invitation_789',
              organization_id: 'org_123456',
              ...invitation,
            }),
        } as Response);

      const result = await auth0Integration.inviteUserToOrganization(
        'org_123456',
        invitation,
      );

      expect(result.success).toBe(true);
      expect(result.invitationId).toBe('invitation_789');
    });

    it('should get organization members', async () => {
      const mockMembers = [
        {
          user_id: 'auth0|member1',
          email: 'member1@weddingvendors.com',
          roles: [{ id: 'role_admin', name: 'Administrator' }],
        },
        {
          user_id: 'auth0|member2',
          email: 'member2@weddingvendors.com',
          roles: [{ id: 'role_member', name: 'Member' }],
        },
      ];

      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ access_token: 'mgmt-token' }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockMembers),
        } as Response);

      const members =
        await auth0Integration.getOrganizationMembers('org_123456');

      expect(members).toHaveLength(2);
      expect(members?.[0].email).toBe('member1@weddingvendors.com');
      expect(members?.[1].roles?.[0].name).toBe('Member');
    });
  });

  describe('JWT Token Validation', () => {
    it('should validate ID token successfully', async () => {
      const mockPayload = {
        sub: 'auth0|user123',
        email: 'user@example.com',
        name: 'Test User',
        iss: `https://${mockConfig.domain}/`,
        aud: mockConfig.clientId,
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        'https://wedsync.com/business_type': 'photographer',
      };

      const mockJWKS = vi.fn();
      vi.mocked(require('jose').createRemoteJWKSet).mockReturnValue(mockJWKS);
      vi.mocked(require('jose').jwtVerify).mockResolvedValue({
        payload: mockPayload,
        protectedHeader: { alg: 'RS256' },
      });

      const result = await auth0Integration.validateIdToken('mock-id-token');

      expect(result.valid).toBe(true);
      expect(result.payload?.sub).toBe('auth0|user123');
      expect(result.payload?.email).toBe('user@example.com');
      expect(result.payload?.['https://wedsync.com/business_type']).toBe(
        'photographer',
      );
    });

    it('should reject expired tokens', async () => {
      vi.mocked(require('jose').jwtVerify).mockRejectedValue(
        new Error('JWT expired'),
      );

      const result = await auth0Integration.validateIdToken('expired-token');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('JWT expired');
    });
  });

  describe('User Attribute Mapping', () => {
    it('should map Auth0 user to WedSync format', () => {
      const auth0User: Auth0UserProfile = {
        user_id: 'auth0|vendor123',
        email: 'photographer@example.com',
        name: 'Amazing Photography',
        picture: 'https://example.com/avatar.jpg',
        user_metadata: {
          businessType: 'photographer',
          businessName: 'Amazing Photography Studio',
          specialties: ['wedding', 'portrait', 'event'],
          yearsExperience: 8,
          location: 'San Francisco, CA',
        },
        app_metadata: {
          roles: ['vendor', 'photographer'],
          subscription: 'professional',
          verificationStatus: 'verified',
        },
      };

      const wedSyncUser = auth0Integration.mapUserAttributes(auth0User);

      expect(wedSyncUser.id).toBe('auth0|vendor123');
      expect(wedSyncUser.email).toBe('photographer@example.com');
      expect(wedSyncUser.businessType).toBe('photographer');
      expect(wedSyncUser.businessName).toBe('Amazing Photography Studio');
      expect(wedSyncUser.specialties).toEqual(['wedding', 'portrait', 'event']);
      expect(wedSyncUser.roles).toContain('photographer');
      expect(wedSyncUser.subscriptionTier).toBe('professional');
      expect(wedSyncUser.isVerified).toBe(true);
    });

    it('should handle missing optional attributes', () => {
      const minimalAuth0User: Auth0UserProfile = {
        user_id: 'auth0|basic123',
        email: 'basic@example.com',
      };

      const wedSyncUser = auth0Integration.mapUserAttributes(minimalAuth0User);

      expect(wedSyncUser.id).toBe('auth0|basic123');
      expect(wedSyncUser.email).toBe('basic@example.com');
      expect(wedSyncUser.businessType).toBe('unknown');
      expect(wedSyncUser.roles).toEqual([]);
      expect(wedSyncUser.isVerified).toBe(false);
    });
  });

  describe('Wedding Industry Features', () => {
    it('should authenticate venue with capacity validation', async () => {
      const venueProfile = {
        email: 'events@grandballroom.com',
        user_metadata: {
          businessType: 'venue',
          businessName: 'Grand Ballroom Events',
          capacity: 500,
          venueType: 'reception_hall',
          amenities: ['parking', 'catering_kitchen', 'bridal_suite'],
          priceRange: '$$$$',
        },
      };

      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ access_token: 'mgmt-token' }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              user_id: 'auth0|venue123',
              ...venueProfile,
            }),
        } as Response);

      const result = await auth0Integration.authenticateVenue('auth0|venue123');

      expect(result.success).toBe(true);
      expect(result.venue?.businessType).toBe('venue');
      expect(result.venue?.capacity).toBe(500);
      expect(result.venue?.amenities).toContain('bridal_suite');
      expect(result.capacityCategory).toBe('large'); // > 300
    });

    it('should validate wedding vendor business verification', async () => {
      const vendorData = {
        businessType: 'florist',
        businessName: 'Elegant Blooms',
        licenseNumber: 'FL-2024-1234',
        insurancePolicyNumber: 'INS-567890',
        yearsInBusiness: 12,
        portfolioImages: 25,
        clientReviews: 89,
        averageRating: 4.8,
      };

      const verification = auth0Integration.validateWeddingVendor(vendorData);

      expect(verification.isVerified).toBe(true);
      expect(verification.verificationScore).toBeGreaterThan(85);
      expect(verification.businessTier).toBe('established'); // > 10 years
      expect(verification.recommendedSubscription).toBe('professional');
    });

    it('should sync wedding team roles and permissions', async () => {
      const teamMembers = [
        {
          user_id: 'auth0|planner1',
          email: 'sarah@weddingplanning.com',
          app_metadata: {
            roles: ['wedding_planner', 'team_lead'],
            permissions: [
              'manage_timeline',
              'coordinate_vendors',
              'client_communication',
            ],
          },
        },
        {
          user_id: 'auth0|coordinator1',
          email: 'mike@weddingplanning.com',
          app_metadata: {
            roles: ['event_coordinator'],
            permissions: ['vendor_coordination', 'day_of_coordination'],
          },
        },
      ];

      const syncResult = auth0Integration.syncWeddingTeamRoles(teamMembers);

      expect(syncResult.success).toBe(true);
      expect(syncResult.syncedMembers).toBe(2);
      expect(syncResult.roleMapping).toHaveProperty('wedding_planner');
      expect(syncResult.roleMapping?.['wedding_planner']).toContain(
        'manage_timeline',
      );
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle Auth0 service outages', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Service unavailable'));

      const result = await auth0Integration.exchangeCodeForTokens('test-code');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Service unavailable');
    });

    it('should handle rate limiting gracefully', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: new Headers({
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Date.now() + 60000),
        }),
        json: () =>
          Promise.resolve({
            error: 'too_many_requests',
            error_description: 'Rate limit exceeded',
          }),
      } as Response);

      const result = await auth0Integration.getUserProfile('user123');

      expect(result).toBeNull();
      // Should implement retry mechanism
    });

    it('should perform comprehensive health check', async () => {
      // Mock successful Auth0 domain check
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            tenant: mockConfig.domain.split('.')[0],
            status: 'active',
          }),
      } as Response);

      const result = await auth0Integration.healthCheck();

      expect(result.healthy).toBe(true);
      expect(result.services?.auth0).toBe('healthy');
      expect(result.services?.managementApi).toBe('healthy');
    });
  });
});
