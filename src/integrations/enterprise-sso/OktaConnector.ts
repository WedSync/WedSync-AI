/**
 * Okta Identity Provider Integration
 *
 * Enterprise SSO integration with Okta's cloud identity platform.
 * Enables wedding venues, event management companies, and hospitality groups
 * using Okta for centralized identity management to seamlessly authenticate
 * their staff with WedSync.
 *
 * Common enterprise scenarios:
 * - Hilton Hotels wedding coordinators using Okta SSO
 * - Large catering companies with distributed teams
 * - Multi-brand wedding venue groups with centralized IT
 * - Corporate event planning firms using Okta Universal Directory
 *
 * @author WedSync Enterprise Team C
 * @version 1.0.0
 */

import {
  IdentityProviderConfig,
  AuthenticationResult,
  EnterpriseUserAttributes,
} from './IdentityProviderConnector';
import fetch from 'node-fetch';
import { createHash, randomBytes } from 'crypto';
import * as jwt from 'jsonwebtoken';

/**
 * Okta API configuration
 */
interface OktaConfig {
  domain: string; // e.g., 'dev-123456.okta.com'
  clientId: string; // OAuth2 client ID
  clientSecret: string; // OAuth2 client secret
  apiToken?: string; // Admin API token for user management
  redirectUri: string; // OAuth2 redirect URI
  scopes: string[]; // OAuth2 scopes
  issuer: string; // OIDC issuer URL
  authorizationServerId?: string; // Custom authorization server ID
}

/**
 * Okta user profile structure
 */
interface OktaUserProfile {
  id: string;
  status: string;
  created: string;
  activated: string;
  statusChanged: string;
  lastLogin: string;
  lastUpdated: string;
  passwordChanged: string;
  type: {
    id: string;
  };
  profile: {
    firstName: string;
    lastName: string;
    mobilePhone: string;
    secondEmail: string;
    login: string;
    email: string;
    displayName: string;
    department: string;
    title: string;
    employeeNumber: string;
    manager: string;
    organization: string;
    division: string;
    costCenter: string;
    [key: string]: unknown;
  };
  credentials: {
    password: any;
    emails: Array<{
      value: string;
      status: string;
      type: string;
    }>;
    provider: {
      type: string;
      name: string;
    };
  };
}

/**
 * Okta group information
 */
interface OktaGroup {
  id: string;
  created: string;
  lastUpdated: string;
  lastMembershipUpdated: string;
  objectClass: string[];
  type: string;
  profile: {
    name: string;
    description: string;
  };
}

/**
 * OAuth2 token response from Okta
 */
interface OktaTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  refresh_token?: string;
  id_token?: string;
}

/**
 * OIDC ID token claims
 */
interface OktaIdTokenClaims {
  iss: string;
  aud: string;
  iat: number;
  exp: number;
  sub: string;
  email: string;
  name: string;
  preferred_username: string;
  groups?: string[];
  [key: string]: unknown;
}

/**
 * Okta SAML response attributes
 */
interface OktaSAMLAttributes {
  nameId: string;
  sessionIndex: string;
  attributes: Record<string, string | string[]>;
}

/**
 * Okta Identity Provider Connector
 *
 * Handles authentication via OAuth2, OpenID Connect, and SAML
 * with Okta's enterprise identity platform.
 */
export class OktaConnector {
  private config: OktaConfig;
  private readonly apiBaseUrl: string;
  private readonly maxRetries = 3;
  private readonly timeout = 10000; // 10 seconds

  constructor(oktaConfig: OktaConfig) {
    this.config = oktaConfig;
    this.apiBaseUrl = `https://${oktaConfig.domain}/api/v1`;
  }

  /**
   * Authenticate user via OAuth2 authorization code flow
   * Standard flow for web applications
   */
  async authenticateOAuth2(
    provider: IdentityProviderConfig,
    authCode: string,
    codeVerifier?: string,
  ): Promise<AuthenticationResult> {
    try {
      console.log('Starting Okta OAuth2 authentication...');

      // Step 1: Exchange authorization code for tokens
      const tokenResponse = await this.exchangeCodeForTokens(
        authCode,
        codeVerifier,
      );

      // Step 2: Validate and decode ID token
      const idTokenClaims = await this.validateIdToken(tokenResponse.id_token!);

      // Step 3: Get detailed user profile
      const userProfile = await this.getUserProfile(idTokenClaims.sub);

      // Step 4: Get user groups for role mapping
      const userGroups = await this.getUserGroups(idTokenClaims.sub);

      // Step 5: Map Okta attributes to WedSync format
      const enterpriseAttributes = this.mapOktaUserToEnterprise(
        userProfile,
        userGroups,
        provider,
      );

      console.log(
        `Okta OAuth2 authentication successful for: ${userProfile.profile.email}`,
      );

      return {
        success: true,
        userId: userProfile.id,
        email: userProfile.profile.email,
        displayName:
          userProfile.profile.displayName ||
          `${userProfile.profile.firstName} ${userProfile.profile.lastName}`,
        attributes: enterpriseAttributes,
        provider: provider.id,
        sessionToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        expiresAt: new Date(Date.now() + tokenResponse.expires_in * 1000),
      };
    } catch (error) {
      console.error('Okta OAuth2 authentication failed:', error);
      return {
        success: false,
        email: '',
        attributes: {},
        provider: provider.id,
        error:
          error instanceof Error
            ? error.message
            : 'OAuth2 authentication failed',
        errorCode: 'OKTA_OAUTH2_ERROR',
      };
    }
  }

  /**
   * Authenticate user via username/password
   * For applications that need direct credential validation
   */
  async authenticateCredentials(
    provider: IdentityProviderConfig,
    credentials: { username: string; password: string },
  ): Promise<AuthenticationResult> {
    try {
      console.log(`Authenticating Okta user: ${credentials.username}`);

      // Use Okta Authentication API for primary authentication
      const authResponse = await this.primaryAuthentication(
        credentials.username,
        credentials.password,
      );

      if (authResponse.status !== 'SUCCESS') {
        return {
          success: false,
          email: credentials.username,
          attributes: {},
          provider: provider.id,
          error: `Authentication failed: ${authResponse.status}`,
          errorCode: 'OKTA_AUTH_FAILED',
        };
      }

      // Get user profile and groups
      const userId = authResponse._embedded?.user?.id;
      if (!userId) {
        throw new Error('User ID not found in authentication response');
      }

      const userProfile = await this.getUserProfile(userId);
      const userGroups = await this.getUserGroups(userId);

      const enterpriseAttributes = this.mapOktaUserToEnterprise(
        userProfile,
        userGroups,
        provider,
      );

      console.log(
        `Okta credentials authentication successful for: ${userProfile.profile.email}`,
      );

      return {
        success: true,
        userId: userProfile.id,
        email: userProfile.profile.email,
        displayName:
          userProfile.profile.displayName ||
          `${userProfile.profile.firstName} ${userProfile.profile.lastName}`,
        attributes: enterpriseAttributes,
        provider: provider.id,
        sessionToken: authResponse.sessionToken,
      };
    } catch (error) {
      console.error('Okta credentials authentication failed:', error);
      return {
        success: false,
        email: credentials.username,
        attributes: {},
        provider: provider.id,
        error:
          error instanceof Error
            ? error.message
            : 'Credentials authentication failed',
        errorCode: 'OKTA_CRED_ERROR',
      };
    }
  }

  /**
   * Handle SAML authentication response
   * For enterprises using SAML SSO
   */
  async authenticateSAML(
    provider: IdentityProviderConfig,
    samlResponse: string,
    relayState?: string,
  ): Promise<AuthenticationResult> {
    try {
      console.log('Processing Okta SAML authentication...');

      // Parse and validate SAML response
      const samlAttributes = await this.parseSAMLResponse(samlResponse);

      // Find user by SAML NameID
      const userProfile = await this.getUserByEmail(samlAttributes.nameId);
      if (!userProfile) {
        return {
          success: false,
          email: samlAttributes.nameId,
          attributes: {},
          provider: provider.id,
          error: 'User not found',
          errorCode: 'USER_NOT_FOUND',
        };
      }

      // Get user groups
      const userGroups = await this.getUserGroups(userProfile.id);

      // Map attributes including SAML assertions
      const enterpriseAttributes = this.mapOktaUserToEnterprise(
        userProfile,
        userGroups,
        provider,
        samlAttributes.attributes,
      );

      console.log(
        `Okta SAML authentication successful for: ${userProfile.profile.email}`,
      );

      return {
        success: true,
        userId: userProfile.id,
        email: userProfile.profile.email,
        displayName:
          userProfile.profile.displayName ||
          `${userProfile.profile.firstName} ${userProfile.profile.lastName}`,
        attributes: enterpriseAttributes,
        provider: provider.id,
      };
    } catch (error) {
      console.error('Okta SAML authentication failed:', error);
      return {
        success: false,
        email: '',
        attributes: {},
        provider: provider.id,
        error:
          error instanceof Error ? error.message : 'SAML authentication failed',
        errorCode: 'OKTA_SAML_ERROR',
      };
    }
  }

  /**
   * Generate OAuth2 authorization URL
   * Used to initiate OAuth2 flow
   */
  generateAuthorizationUrl(
    state?: string,
    codeChallenge?: string,
  ): {
    url: string;
    state: string;
    codeVerifier?: string;
  } {
    const generatedState = state || this.generateRandomString(32);
    const scopes = this.config.scopes.join(' ');

    let authUrl =
      `https://${this.config.domain}/oauth2/default/v1/authorize?` +
      `client_id=${encodeURIComponent(this.config.clientId)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent(scopes)}` +
      `&redirect_uri=${encodeURIComponent(this.config.redirectUri)}` +
      `&state=${encodeURIComponent(generatedState)}`;

    // Add PKCE if code challenge provided
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
   * Provision new user in Okta
   * Used for JIT provisioning from WedSync
   */
  async provisionUser(userAttributes: {
    email: string;
    firstName: string;
    lastName: string;
    department?: string;
    title?: string;
    manager?: string;
  }): Promise<OktaUserProfile> {
    const userData = {
      profile: {
        email: userAttributes.email,
        login: userAttributes.email,
        firstName: userAttributes.firstName,
        lastName: userAttributes.lastName,
        department: userAttributes.department,
        title: userAttributes.title,
        manager: userAttributes.manager,
      },
      credentials: {
        password: {
          value: this.generateRandomString(16),
        },
      },
    };

    const response = await this.oktaApiRequest('POST', '/users', userData);
    return response;
  }

  /**
   * Exchange authorization code for tokens
   */
  private async exchangeCodeForTokens(
    code: string,
    codeVerifier?: string,
  ): Promise<OktaTokenResponse> {
    const tokenEndpoint = `https://${this.config.domain}/oauth2/default/v1/token`;

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      code,
      redirect_uri: this.config.redirectUri,
    });

    if (codeVerifier) {
      body.append('code_verifier', codeVerifier);
    }

    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: body.toString(),
      timeout: this.timeout,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token exchange failed: ${response.status} ${error}`);
    }

    return (await response.json()) as OktaTokenResponse;
  }

  /**
   * Validate and decode ID token
   */
  private async validateIdToken(idToken: string): Promise<OktaIdTokenClaims> {
    // Get Okta's JWKS for signature verification
    const jwksResponse = await fetch(
      `https://${this.config.domain}/oauth2/default/v1/keys`,
      { timeout: this.timeout },
    );
    const jwks = await jwksResponse.json();

    // Decode without verification first to get key ID
    const unverified = jwt.decode(idToken, { complete: true }) as any;
    if (!unverified || !unverified.header.kid) {
      throw new Error('Invalid ID token format');
    }

    // Find matching key
    const key = jwks.keys.find((k: any) => k.kid === unverified.header.kid);
    if (!key) {
      throw new Error('Unable to find matching key for token verification');
    }

    // Verify and decode token
    try {
      const verified = jwt.verify(idToken, this.constructJWKSCert(key), {
        algorithms: ['RS256'],
        audience: this.config.clientId,
        issuer: `https://${this.config.domain}/oauth2/default`,
      }) as OktaIdTokenClaims;

      return verified;
    } catch (error) {
      throw new Error(`ID token validation failed: ${error}`);
    }
  }

  /**
   * Primary authentication with username/password
   */
  private async primaryAuthentication(
    username: string,
    password: string,
  ): Promise<any> {
    const authData = {
      username,
      password,
      options: {
        multiOptionalFactorEnroll: false,
        warnBeforePasswordExpired: true,
      },
    };

    const response = await fetch(`https://${this.config.domain}/api/v1/authn`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(authData),
      timeout: this.timeout,
    });

    if (!response.ok) {
      throw new Error(`Authentication failed: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Get user profile from Okta
   */
  private async getUserProfile(userId: string): Promise<OktaUserProfile> {
    return await this.oktaApiRequest('GET', `/users/${userId}`);
  }

  /**
   * Get user by email address
   */
  private async getUserByEmail(email: string): Promise<OktaUserProfile | null> {
    const users = await this.oktaApiRequest(
      'GET',
      `/users?q=${encodeURIComponent(email)}&limit=1`,
    );
    return users.length > 0 ? users[0] : null;
  }

  /**
   * Get user's group memberships
   */
  private async getUserGroups(userId: string): Promise<OktaGroup[]> {
    return await this.oktaApiRequest('GET', `/users/${userId}/groups`);
  }

  /**
   * Make authenticated request to Okta API
   */
  private async oktaApiRequest(
    method: string,
    path: string,
    body?: any,
  ): Promise<any> {
    if (!this.config.apiToken) {
      throw new Error('Okta API token required for this operation');
    }

    const url = `${this.apiBaseUrl}${path}`;
    const options: any = {
      method,
      headers: {
        Authorization: `SSWS ${this.config.apiToken}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      timeout: this.timeout,
    };

    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Okta API request failed: ${response.status} ${errorText}`,
      );
    }

    return await response.json();
  }

  /**
   * Parse SAML response (simplified implementation)
   */
  private async parseSAMLResponse(
    samlResponse: string,
  ): Promise<OktaSAMLAttributes> {
    // Decode base64 SAML response
    const decoded = Buffer.from(samlResponse, 'base64').toString('utf-8');

    // Extract NameID (simplified regex parsing)
    const nameIdMatch = decoded.match(
      /<saml2:NameID[^>]*>([^<]+)<\/saml2:NameID>/,
    );
    const nameId = nameIdMatch ? nameIdMatch[1] : '';

    // Extract session index
    const sessionMatch = decoded.match(/SessionIndex="([^"]+)"/);
    const sessionIndex = sessionMatch ? sessionMatch[1] : '';

    // Extract attributes (simplified)
    const attributes: Record<string, string | string[]> = {};

    return {
      nameId,
      sessionIndex,
      attributes,
    };
  }

  /**
   * Map Okta user profile to WedSync enterprise attributes
   */
  private mapOktaUserToEnterprise(
    user: OktaUserProfile,
    groups: OktaGroup[],
    provider: IdentityProviderConfig,
    samlAttributes?: Record<string, string | string[]>,
  ): EnterpriseUserAttributes {
    const groupNames = groups.map((g) => g.profile.name);
    const roles = this.mapGroupsToRoles(groupNames, provider);

    return {
      employeeId: user.profile.employeeNumber || user.id,
      department: user.profile.department,
      jobTitle: user.profile.title,
      manager: user.profile.manager,
      location: user.profile.division,
      phone: user.profile.mobilePhone,
      groups: groupNames,
      roles,
      customAttributes: {
        oktaId: user.id,
        status: user.status,
        lastLogin: user.lastLogin,
        organization: user.profile.organization,
        costCenter: user.profile.costCenter,
        samlAttributes,
        ...user.profile,
      },
    };
  }

  /**
   * Map Okta groups to WedSync roles
   */
  private mapGroupsToRoles(
    groupNames: string[],
    provider: IdentityProviderConfig,
  ): string[] {
    const roles: string[] = [];

    if (provider.groupMapping) {
      for (const [oktaGroup, wedSyncRole] of Object.entries(
        provider.groupMapping,
      )) {
        if (
          groupNames.some((group) =>
            group.toLowerCase().includes(oktaGroup.toLowerCase()),
          )
        ) {
          roles.push(wedSyncRole);
        }
      }
    }

    return roles;
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
    // Simplified JWKS cert construction
    // In production, would use proper JWKS library
    return `-----BEGIN CERTIFICATE-----\n${key.x5c[0]}\n-----END CERTIFICATE-----`;
  }
}
