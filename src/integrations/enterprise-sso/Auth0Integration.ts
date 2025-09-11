/**
 * Auth0 Identity Provider Integration
 *
 * Enterprise SSO integration with Auth0's cloud identity platform.
 * Enables wedding businesses, venue management companies, and hospitality
 * groups using Auth0's flexible identity platform to authenticate their
 * teams and manage customer identities through WedSync.
 *
 * Common enterprise scenarios:
 * - SaaS wedding planning companies using Auth0 for multi-tenant authentication
 * - Venue booking platforms requiring social login integration
 * - Wedding marketplaces with complex user role management
 * - Event management companies requiring passwordless authentication
 * - International wedding businesses needing global identity support
 *
 * @author WedSync Enterprise Team C
 * @version 1.0.0
 */

import {
  IdentityProviderConfig,
  AuthenticationResult,
  EnterpriseUserAttributes,
} from './IdentityProviderConnector';
import {
  AuthenticationApi,
  ManagementApi,
  User,
  Auth0UserProfile,
  Role,
  Permission,
  Organization,
} from 'auth0';
import * as jwt from 'jsonwebtoken';
import { createHash, randomBytes } from 'crypto';
import fetch from 'node-fetch';

/**
 * Auth0 configuration
 */
interface Auth0Config {
  domain: string; // Auth0 domain (e.g., 'company.auth0.com')
  clientId: string; // Application client ID
  clientSecret: string; // Application client secret
  audience?: string; // API audience/identifier
  scope?: string; // OAuth2 scopes
  redirectUri: string; // OAuth2 redirect URI
  mgmtApiToken?: string; // Management API access token
  connection?: string; // Database connection name
  organizationId?: string; // Auth0 organization ID (for B2B)
}

/**
 * Auth0 user profile with metadata
 */
interface Auth0UserProfile extends User {
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
  roles?: Role[];
  permissions?: Permission[];
  organizations?: Organization[];
  identities?: Array<{
    provider: string;
    user_id: string;
    connection: string;
    isSocial: boolean;
  }>;
}

/**
 * Auth0 token response
 */
interface Auth0TokenResponse {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}

/**
 * Auth0 ID token claims
 */
interface Auth0IdTokenClaims {
  iss: string;
  sub: string;
  aud: string;
  exp: number;
  iat: number;
  email?: string;
  email_verified?: boolean;
  name?: string;
  nickname?: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
  org_id?: string;
  org_name?: string;
  roles?: string[];
  permissions?: string[];
  [key: string]: unknown;
}

/**
 * Auth0 passwordless authentication options
 */
interface PasswordlessOptions {
  type: 'email' | 'sms';
  email?: string;
  phone_number?: string;
  authParams?: Record<string, unknown>;
}

/**
 * Auth0 Identity Provider Connector
 *
 * Handles authentication via OAuth2, OpenID Connect, passwordless,
 * and social connections through Auth0's identity platform.
 */
export class Auth0Integration {
  private config: Auth0Config;
  private authApi: AuthenticationApi;
  private mgmtApi?: ManagementApi;
  private readonly timeout = 10000; // 10 seconds

  constructor(auth0Config: Auth0Config) {
    this.config = auth0Config;
    this.initializeAuth0();
  }

  /**
   * Initialize Auth0 APIs
   */
  private initializeAuth0(): void {
    // Initialize Authentication API
    this.authApi = new AuthenticationApi({
      domain: this.config.domain,
      clientId: this.config.clientId,
      clientSecret: this.config.clientSecret,
    });

    // Initialize Management API if token provided
    if (this.config.mgmtApiToken) {
      this.mgmtApi = new ManagementApi({
        domain: this.config.domain,
        token: this.config.mgmtApiToken,
      });
    }
  }

  /**
   * Authenticate user via OAuth2 authorization code flow
   */
  async authenticateOAuth2(
    provider: IdentityProviderConfig,
    authCode: string,
    codeVerifier?: string,
  ): Promise<AuthenticationResult> {
    try {
      console.log('Starting Auth0 OAuth2 authentication...');

      // Step 1: Exchange authorization code for tokens
      const tokenResponse = await this.exchangeCodeForTokens(
        authCode,
        codeVerifier,
      );

      // Step 2: Decode and validate ID token
      const idTokenClaims = await this.validateIdToken(tokenResponse.id_token!);

      // Step 3: Get detailed user profile
      const userProfile = await this.getUserProfile(idTokenClaims.sub);
      if (!userProfile) {
        throw new Error('Unable to retrieve user profile');
      }

      // Step 4: Get user roles and permissions
      const [userRoles, userPermissions, userOrgs] = await Promise.all([
        this.getUserRoles(userProfile.user_id!),
        this.getUserPermissions(userProfile.user_id!),
        this.getUserOrganizations(userProfile.user_id!),
      ]);

      // Step 5: Map Auth0 attributes to WedSync format
      const enterpriseAttributes = this.mapAuth0UserToEnterprise(
        userProfile,
        userRoles,
        userPermissions,
        userOrgs,
        provider,
      );

      console.log(
        `Auth0 OAuth2 authentication successful for: ${userProfile.email}`,
      );

      return {
        success: true,
        userId: userProfile.user_id!,
        email: userProfile.email!,
        displayName:
          userProfile.name ||
          userProfile.nickname ||
          `${userProfile.given_name || ''} ${userProfile.family_name || ''}`.trim(),
        attributes: enterpriseAttributes,
        provider: provider.id,
        sessionToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        expiresAt: new Date(Date.now() + tokenResponse.expires_in * 1000),
      };
    } catch (error) {
      console.error('Auth0 OAuth2 authentication failed:', error);
      return {
        success: false,
        email: '',
        attributes: {},
        provider: provider.id,
        error:
          error instanceof Error
            ? error.message
            : 'OAuth2 authentication failed',
        errorCode: 'AUTH0_OAUTH2_ERROR',
      };
    }
  }

  /**
   * Authenticate user with username/password
   */
  async authenticateCredentials(
    provider: IdentityProviderConfig,
    credentials: { username: string; password: string },
  ): Promise<AuthenticationResult> {
    try {
      console.log(`Authenticating Auth0 user: ${credentials.username}`);

      const tokenResponse = await this.authApi.passwordGrant({
        username: credentials.username,
        password: credentials.password,
        scope: this.config.scope || 'openid profile email',
        audience: this.config.audience,
      });

      if (!tokenResponse.data.access_token) {
        throw new Error('No access token received');
      }

      // Decode ID token for user info
      const idTokenClaims = await this.validateIdToken(
        tokenResponse.data.id_token!,
      );

      // Get detailed user profile
      const userProfile = await this.getUserProfile(idTokenClaims.sub);
      if (!userProfile) {
        throw new Error('Unable to retrieve user profile');
      }

      // Get user roles, permissions, and organizations
      const [userRoles, userPermissions, userOrgs] = await Promise.all([
        this.getUserRoles(userProfile.user_id!),
        this.getUserPermissions(userProfile.user_id!),
        this.getUserOrganizations(userProfile.user_id!),
      ]);

      const enterpriseAttributes = this.mapAuth0UserToEnterprise(
        userProfile,
        userRoles,
        userPermissions,
        userOrgs,
        provider,
      );

      console.log(
        `Auth0 credentials authentication successful for: ${userProfile.email}`,
      );

      return {
        success: true,
        userId: userProfile.user_id!,
        email: userProfile.email!,
        displayName:
          userProfile.name ||
          userProfile.nickname ||
          `${userProfile.given_name || ''} ${userProfile.family_name || ''}`.trim(),
        attributes: enterpriseAttributes,
        provider: provider.id,
        sessionToken: tokenResponse.data.access_token,
        refreshToken: tokenResponse.data.refresh_token,
      };
    } catch (error) {
      console.error('Auth0 credentials authentication failed:', error);
      return {
        success: false,
        email: credentials.username,
        attributes: {},
        provider: provider.id,
        error:
          error instanceof Error
            ? error.message
            : 'Credentials authentication failed',
        errorCode: 'AUTH0_CRED_ERROR',
      };
    }
  }

  /**
   * Authenticate via passwordless (email or SMS)
   * Modern authentication method popular in hospitality industry
   */
  async authenticatePasswordless(
    provider: IdentityProviderConfig,
    options: PasswordlessOptions,
    verificationCode?: string,
  ): Promise<
    AuthenticationResult | { verificationSent: boolean; messageId: string }
  > {
    try {
      if (!verificationCode) {
        // Step 1: Send verification code
        console.log(`Sending passwordless verification via ${options.type}`);

        const result = await this.authApi.passwordless.start({
          connection: 'email', // or 'sms'
          send: options.type,
          email: options.email,
          phone_number: options.phone_number,
          authParams: options.authParams,
        });

        return {
          verificationSent: true,
          messageId: result.data._id || 'sent',
        };
      } else {
        // Step 2: Verify code and authenticate
        console.log('Verifying passwordless code...');

        const tokenResponse = await this.authApi.passwordless.verify({
          connection: 'email', // or 'sms'
          email: options.email,
          phone_number: options.phone_number,
          code: verificationCode,
          scope: this.config.scope || 'openid profile email',
          audience: this.config.audience,
        });

        if (!tokenResponse.data.access_token) {
          throw new Error(
            'No access token received from passwordless verification',
          );
        }

        // Process similar to OAuth2 flow
        const idTokenClaims = await this.validateIdToken(
          tokenResponse.data.id_token!,
        );
        const userProfile = await this.getUserProfile(idTokenClaims.sub);

        if (!userProfile) {
          throw new Error('Unable to retrieve user profile');
        }

        const [userRoles, userPermissions, userOrgs] = await Promise.all([
          this.getUserRoles(userProfile.user_id!),
          this.getUserPermissions(userProfile.user_id!),
          this.getUserOrganizations(userProfile.user_id!),
        ]);

        const enterpriseAttributes = this.mapAuth0UserToEnterprise(
          userProfile,
          userRoles,
          userPermissions,
          userOrgs,
          provider,
        );

        console.log(
          `Auth0 passwordless authentication successful for: ${userProfile.email}`,
        );

        return {
          success: true,
          userId: userProfile.user_id!,
          email: userProfile.email!,
          displayName: userProfile.name || userProfile.nickname,
          attributes: enterpriseAttributes,
          provider: provider.id,
          sessionToken: tokenResponse.data.access_token,
          refreshToken: tokenResponse.data.refresh_token,
        } as AuthenticationResult;
      }
    } catch (error) {
      console.error('Auth0 passwordless authentication failed:', error);
      return {
        success: false,
        email: options.email || '',
        attributes: {},
        provider: provider.id,
        error:
          error instanceof Error
            ? error.message
            : 'Passwordless authentication failed',
        errorCode: 'AUTH0_PASSWORDLESS_ERROR',
      } as AuthenticationResult;
    }
  }

  /**
   * Generate OAuth2 authorization URL
   */
  generateAuthorizationUrl(
    state?: string,
    codeChallenge?: string,
    organization?: string,
  ): {
    url: string;
    state: string;
    codeVerifier?: string;
  } {
    const generatedState = state || this.generateRandomString(32);

    let authUrl =
      `https://${this.config.domain}/authorize?` +
      `client_id=${encodeURIComponent(this.config.clientId)}` +
      `&response_type=code` +
      `&redirect_uri=${encodeURIComponent(this.config.redirectUri)}` +
      `&scope=${encodeURIComponent(this.config.scope || 'openid profile email')}` +
      `&state=${encodeURIComponent(generatedState)}`;

    // Add audience if specified
    if (this.config.audience) {
      authUrl += `&audience=${encodeURIComponent(this.config.audience)}`;
    }

    // Add organization for Auth0 B2B
    if (organization || this.config.organizationId) {
      authUrl += `&organization=${encodeURIComponent(organization || this.config.organizationId!)}`;
    }

    // Add PKCE if code challenge provided or generate it
    let codeVerifier: string | undefined;
    if (codeChallenge) {
      authUrl += `&code_challenge=${encodeURIComponent(codeChallenge)}`;
      authUrl += `&code_challenge_method=S256`;
    } else {
      // Generate PKCE parameters
      codeVerifier = this.generateRandomString(128);
      const challenge = createHash('sha256')
        .update(codeVerifier)
        .digest('base64url');
      authUrl += `&code_challenge=${encodeURIComponent(challenge)}`;
      authUrl += `&code_challenge_method=S256`;
    }

    return {
      url: authUrl,
      state: generatedState,
      codeVerifier,
    };
  }

  /**
   * Create new user in Auth0
   */
  async createUser(userAttributes: {
    email: string;
    name?: string;
    given_name?: string;
    family_name?: string;
    picture?: string;
    user_metadata?: Record<string, unknown>;
    app_metadata?: Record<string, unknown>;
    connection?: string;
  }): Promise<Auth0UserProfile> {
    if (!this.mgmtApi) {
      throw new Error('Management API not initialized - token required');
    }

    const userData = {
      email: userAttributes.email,
      name: userAttributes.name,
      given_name: userAttributes.given_name,
      family_name: userAttributes.family_name,
      picture: userAttributes.picture,
      user_metadata: userAttributes.user_metadata || {},
      app_metadata: userAttributes.app_metadata || {},
      connection:
        userAttributes.connection ||
        this.config.connection ||
        'Username-Password-Authentication',
      verify_email: false,
      email_verified: true,
    };

    const result = await this.mgmtApi.users.create(userData);
    return result.data as Auth0UserProfile;
  }

  /**
   * Assign roles to user
   */
  async assignUserRoles(userId: string, roleIds: string[]): Promise<void> {
    if (!this.mgmtApi) {
      throw new Error('Management API not initialized');
    }

    await this.mgmtApi.users.assignRoles({ id: userId }, { roles: roleIds });
  }

  /**
   * Exchange authorization code for tokens
   */
  private async exchangeCodeForTokens(
    code: string,
    codeVerifier?: string,
  ): Promise<Auth0TokenResponse> {
    const tokenData: any = {
      grant_type: 'authorization_code',
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      code,
      redirect_uri: this.config.redirectUri,
    };

    if (codeVerifier) {
      tokenData.code_verifier = codeVerifier;
    }

    const result = await this.authApi.oauth.authorizationCodeGrant(tokenData);
    return result.data;
  }

  /**
   * Validate and decode Auth0 ID token
   */
  private async validateIdToken(idToken: string): Promise<Auth0IdTokenClaims> {
    // Get Auth0 JWKS for signature verification
    const jwksResponse = await fetch(
      `https://${this.config.domain}/.well-known/jwks.json`,
      {
        timeout: this.timeout,
      },
    );
    const jwks = await jwksResponse.json();

    // Decode token to get key ID
    const unverified = jwt.decode(idToken, { complete: true }) as any;
    if (!unverified || !unverified.header.kid) {
      throw new Error('Invalid ID token format');
    }

    // Find matching key
    const key = jwks.keys.find((k: any) => k.kid === unverified.header.kid);
    if (!key) {
      throw new Error('Unable to find matching key for token verification');
    }

    // Verify token
    try {
      const verified = jwt.verify(idToken, this.constructJWKSCert(key), {
        algorithms: ['RS256'],
        audience: this.config.clientId,
        issuer: `https://${this.config.domain}/`,
      }) as Auth0IdTokenClaims;

      return verified;
    } catch (error) {
      throw new Error(`ID token validation failed: ${error}`);
    }
  }

  /**
   * Get user profile from Auth0 Management API
   */
  private async getUserProfile(
    userId: string,
  ): Promise<Auth0UserProfile | null> {
    if (!this.mgmtApi) return null;

    try {
      const result = await this.mgmtApi.users.get({ id: userId });
      return result.data as Auth0UserProfile;
    } catch (error) {
      console.error('Failed to get user profile:', error);
      return null;
    }
  }

  /**
   * Get user's assigned roles
   */
  private async getUserRoles(userId: string): Promise<Role[]> {
    if (!this.mgmtApi) return [];

    try {
      const result = await this.mgmtApi.users.getRoles({ id: userId });
      return result.data || [];
    } catch (error) {
      console.error('Failed to get user roles:', error);
      return [];
    }
  }

  /**
   * Get user's permissions
   */
  private async getUserPermissions(userId: string): Promise<Permission[]> {
    if (!this.mgmtApi) return [];

    try {
      const result = await this.mgmtApi.users.getPermissions({ id: userId });
      return result.data || [];
    } catch (error) {
      console.error('Failed to get user permissions:', error);
      return [];
    }
  }

  /**
   * Get user's organization memberships (Auth0 B2B)
   */
  private async getUserOrganizations(userId: string): Promise<Organization[]> {
    if (!this.mgmtApi) return [];

    try {
      const result = await this.mgmtApi.users.getUserOrganizations({
        id: userId,
      });
      return result.data || [];
    } catch (error) {
      console.error('Failed to get user organizations:', error);
      return [];
    }
  }

  /**
   * Map Auth0 user to WedSync enterprise attributes
   */
  private mapAuth0UserToEnterprise(
    user: Auth0UserProfile,
    roles: Role[],
    permissions: Permission[],
    organizations: Organization[],
    provider: IdentityProviderConfig,
  ): EnterpriseUserAttributes {
    const roleNames = roles.map((r) => r.name!);
    const permissionNames = permissions.map((p) => p.permission_name!);
    const orgNames = organizations.map((o) => o.name!);

    return {
      employeeId: (user.app_metadata?.employee_id as string) || user.user_id,
      department:
        (user.app_metadata?.department as string) ||
        (user.user_metadata?.department as string),
      jobTitle:
        (user.app_metadata?.job_title as string) ||
        (user.user_metadata?.job_title as string),
      manager:
        (user.app_metadata?.manager as string) ||
        (user.user_metadata?.manager as string),
      location:
        (user.app_metadata?.location as string) ||
        (user.user_metadata?.location as string),
      phone: user.phone_number,
      groups: [...roleNames, ...orgNames],
      roles: roleNames,
      customAttributes: {
        auth0Id: user.user_id,
        nickname: user.nickname,
        picture: user.picture,
        identities: user.identities,
        emailVerified: user.email_verified,
        phoneVerified: user.phone_verified,
        permissions: permissionNames,
        organizations: orgNames,
        userMetadata: user.user_metadata,
        appMetadata: user.app_metadata,
        lastLogin: user.last_login,
        loginsCount: user.logins_count,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      },
    };
  }

  /**
   * Generate random string for security purposes
   */
  private generateRandomString(length: number): string {
    return randomBytes(length).toString('base64url').slice(0, length);
  }

  /**
   * Construct certificate from JWKS key for JWT verification
   */
  private constructJWKSCert(key: any): string {
    // Simplified JWKS cert construction for Auth0
    if (key.x5c && key.x5c[0]) {
      return `-----BEGIN CERTIFICATE-----\n${key.x5c[0]}\n-----END CERTIFICATE-----`;
    }

    // Alternative: construct from RSA components (simplified)
    if (key.n && key.e) {
      // Would use proper RSA key construction library in production
      throw new Error(
        'RSA key construction not implemented - use x5c certificate chain',
      );
    }

    throw new Error('Unable to construct certificate from JWKS key');
  }
}
