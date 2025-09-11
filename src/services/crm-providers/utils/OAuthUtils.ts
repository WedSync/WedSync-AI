/**
 * WS-343 CRM Integration Hub - Team C
 * OAuth2 PKCE Utilities for Secure CRM Authentication
 *
 * This module provides secure OAuth2 PKCE (Proof Key for Code Exchange) utilities
 * for wedding industry CRM providers like HoneyBook that require OAuth authentication.
 *
 * @priority CRITICAL - Security foundation for OAuth providers
 * @weddingContext Handles sensitive wedding data - maximum security required
 * @compliance GDPR compliant token handling with secure storage
 */

import { z } from 'zod';
import { randomBytes, createHash } from 'crypto';

/**
 * OAuth2 Token Response Schema
 * Validates responses from OAuth providers
 */
export const OAuth2TokenSchema = z.object({
  access_token: z.string().min(1, 'Access token is required'),
  token_type: z.string().default('bearer'),
  expires_in: z.number().int().positive().optional(),
  refresh_token: z.string().optional(),
  scope: z.string().optional(),
  created_at: z.number().int().optional(),
});

export type OAuth2Token = z.infer<typeof OAuth2TokenSchema>;

/**
 * PKCE (Proof Key for Code Exchange) Parameters
 * Used for secure OAuth2 flows in public clients
 */
export interface PKCEChallenge {
  codeVerifier: string;
  codeChallenge: string;
  codeChallengeMethod: 'S256';
}

/**
 * OAuth2 Configuration for Different Providers
 */
export interface OAuth2Config {
  clientId: string;
  clientSecret?: string; // Optional for PKCE flows
  authUrl: string;
  tokenUrl: string;
  scopes: string[];
  redirectUrl: string;
}

/**
 * OAuth2 Authorization URL Parameters
 */
export interface AuthorizationUrlParams {
  clientId: string;
  redirectUri: string;
  scopes: string[];
  state: string;
  codeChallenge: string;
  codeChallengeMethod: 'S256';
  responseType: 'code';
}

/**
 * Token Exchange Parameters
 */
export interface TokenExchangeParams {
  code: string;
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
  codeVerifier: string;
  grantType: 'authorization_code';
}

/**
 * OAuth2 PKCE Utilities Class
 *
 * Provides secure OAuth2 PKCE implementation for wedding CRM providers.
 * Uses industry best practices for token generation and validation.
 *
 * @security Implements PKCE to prevent authorization code interception
 * @crypto Uses secure random generation and SHA256 hashing
 */
export class OAuthPKCEUtils {
  /**
   * Generate PKCE Challenge Pair
   *
   * Creates a cryptographically secure code verifier and challenge
   * for OAuth2 PKCE flow. The verifier is kept secret, the challenge
   * is sent to the authorization server.
   *
   * @returns PKCE challenge pair with S256 method
   */
  static generatePKCEChallenge(): PKCEChallenge {
    // Generate 128 bytes of random data (recommended by RFC 7636)
    const codeVerifier = this.base64URLEscape(
      randomBytes(96).toString('base64'),
    );

    // Create SHA256 hash of verifier
    const codeChallenge = this.base64URLEscape(
      createHash('sha256').update(codeVerifier).digest('base64'),
    );

    return {
      codeVerifier,
      codeChallenge,
      codeChallengeMethod: 'S256',
    };
  }

  /**
   * Generate Secure State Parameter
   *
   * Creates a cryptographically secure state parameter to prevent
   * CSRF attacks during OAuth flow.
   *
   * @returns URL-safe random state string
   */
  static generateState(): string {
    return this.base64URLEscape(randomBytes(32).toString('base64'));
  }

  /**
   * Build Authorization URL
   *
   * Constructs the complete authorization URL that users are redirected
   * to for granting permissions to the application.
   *
   * @param config OAuth2 configuration
   * @param pkceChallenge PKCE challenge parameters
   * @param state CSRF protection state
   * @returns Complete authorization URL
   */
  static buildAuthorizationUrl(
    config: OAuth2Config,
    pkceChallenge: PKCEChallenge,
    state: string,
  ): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: config.clientId,
      redirect_uri: config.redirectUrl,
      scope: config.scopes.join(' '),
      state,
      code_challenge: pkceChallenge.codeChallenge,
      code_challenge_method: pkceChallenge.codeChallengeMethod,
    });

    return `${config.authUrl}?${params.toString()}`;
  }

  /**
   * Exchange Authorization Code for Access Token
   *
   * Exchanges the authorization code received from the provider
   * for an access token using PKCE verification.
   *
   * @param config OAuth2 configuration
   * @param code Authorization code from callback
   * @param codeVerifier Original PKCE verifier
   * @returns Access token response
   */
  static async exchangeCodeForToken(
    config: OAuth2Config,
    code: string,
    codeVerifier: string,
  ): Promise<OAuth2Token> {
    const tokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: config.clientId,
      code,
      redirect_uri: config.redirectUrl,
      code_verifier: codeVerifier,
    });

    // Add client secret if provided (for confidential clients)
    if (config.clientSecret) {
      tokenParams.append('client_secret', config.clientSecret);
    }

    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
        'User-Agent': 'WedSync-CRM-Integration/1.0',
      },
      body: tokenParams.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Token exchange failed: ${response.status} ${errorText}`);
    }

    const tokenData = await response.json();

    // Validate token response
    const validatedToken = OAuth2TokenSchema.parse(tokenData);

    // Add timestamp for expiration tracking
    if (validatedToken.expires_in) {
      validatedToken.created_at = Math.floor(Date.now() / 1000);
    }

    return validatedToken;
  }

  /**
   * Refresh Access Token
   *
   * Uses refresh token to obtain a new access token when the current
   * token has expired or is about to expire.
   *
   * @param config OAuth2 configuration
   * @param refreshToken Current refresh token
   * @returns New access token response
   */
  static async refreshAccessToken(
    config: OAuth2Config,
    refreshToken: string,
  ): Promise<OAuth2Token> {
    const refreshParams = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: config.clientId,
    });

    // Add client secret if provided
    if (config.clientSecret) {
      refreshParams.append('client_secret', config.clientSecret);
    }

    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
        'User-Agent': 'WedSync-CRM-Integration/1.0',
      },
      body: refreshParams.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Token refresh failed: ${response.status} ${errorText}`);
    }

    const tokenData = await response.json();
    const validatedToken = OAuth2TokenSchema.parse(tokenData);

    // Add timestamp for expiration tracking
    if (validatedToken.expires_in) {
      validatedToken.created_at = Math.floor(Date.now() / 1000);
    }

    return validatedToken;
  }

  /**
   * Check if Token is Expired
   *
   * Determines if an access token has expired based on the expires_in
   * value and creation timestamp. Includes 60-second buffer for safety.
   *
   * @param token OAuth2 token to check
   * @returns True if token is expired or about to expire
   */
  static isTokenExpired(token: OAuth2Token): boolean {
    if (!token.expires_in || !token.created_at) {
      return false; // No expiration info, assume valid
    }

    const now = Math.floor(Date.now() / 1000);
    const expirationTime = token.created_at + token.expires_in;

    // Add 60-second buffer to prevent using tokens that are about to expire
    return now >= expirationTime - 60;
  }

  /**
   * Validate Authorization Callback
   *
   * Validates the callback parameters returned from the OAuth provider
   * to ensure they match the original request and detect any tampering.
   *
   * @param callbackParams Parameters from OAuth callback
   * @param originalState Original state parameter
   * @returns Validated authorization code
   */
  static validateAuthorizationCallback(
    callbackParams: {
      code?: string;
      state?: string;
      error?: string;
      error_description?: string;
    },
    originalState: string,
  ): string {
    // Check for OAuth errors
    if (callbackParams.error) {
      throw new Error(
        `OAuth authorization failed: ${callbackParams.error} - ${
          callbackParams.error_description || 'Unknown error'
        }`,
      );
    }

    // Validate state parameter (CSRF protection)
    if (callbackParams.state !== originalState) {
      throw new Error('Invalid state parameter - possible CSRF attack');
    }

    // Ensure authorization code is present
    if (!callbackParams.code) {
      throw new Error('Missing authorization code in callback');
    }

    return callbackParams.code;
  }

  /**
   * Create Authorization Header
   *
   * Creates the proper Authorization header for API requests
   * using the access token.
   *
   * @param token OAuth2 access token
   * @returns Authorization header value
   */
  static createAuthorizationHeader(token: OAuth2Token): string {
    return `${token.token_type} ${token.access_token}`;
  }

  /**
   * Revoke Token
   *
   * Revokes an access or refresh token at the provider's revocation endpoint.
   * This is important for security when a user disconnects their account.
   *
   * @param revocationUrl Provider's token revocation endpoint
   * @param token Token to revoke
   * @param clientId OAuth client ID
   * @param clientSecret OAuth client secret (if required)
   */
  static async revokeToken(
    revocationUrl: string,
    token: string,
    clientId: string,
    clientSecret?: string,
  ): Promise<void> {
    const revokeParams = new URLSearchParams({
      token,
      client_id: clientId,
    });

    if (clientSecret) {
      revokeParams.append('client_secret', clientSecret);
    }

    const response = await fetch(revocationUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
        'User-Agent': 'WedSync-CRM-Integration/1.0',
      },
      body: revokeParams.toString(),
    });

    // Token revocation endpoints typically return 200 for success
    // Some may return 204 or other success codes
    if (!response.ok && response.status !== 204) {
      throw new Error(`Token revocation failed: ${response.status}`);
    }
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  /**
   * Base64 URL Escape
   *
   * Converts base64 string to URL-safe base64 by replacing
   * URL-unsafe characters as per RFC 4648.
   *
   * @param str Base64 string to escape
   * @returns URL-safe base64 string
   */
  private static base64URLEscape(str: string): string {
    return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  /**
   * Generate Random String
   *
   * Generates a cryptographically secure random string of specified length
   * using URL-safe characters.
   *
   * @param length Length of string to generate
   * @returns Random string
   */
  static generateRandomString(length: number): string {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    const randomArray = randomBytes(length);
    const result = new Array(length);

    for (let i = 0; i < length; i++) {
      result[i] = chars[randomArray[i] % chars.length];
    }

    return result.join('');
  }

  /**
   * Hash String with SHA256
   *
   * Creates SHA256 hash of input string and returns as base64.
   * Used for PKCE challenge generation and data integrity checks.
   *
   * @param input String to hash
   * @returns Base64 encoded SHA256 hash
   */
  static hashSHA256(input: string): string {
    return createHash('sha256').update(input).digest('base64');
  }
}

/**
 * Wedding-Specific OAuth Security Enhancements
 *
 * Additional security measures specifically for wedding industry CRM integrations
 * where data sensitivity and reliability are critical.
 */
export class WeddingOAuthSecurity {
  /**
   * Validate Wedding Context in Token
   *
   * Some providers include business context in tokens.
   * This validates that the token is appropriate for wedding industry use.
   *
   * @param token OAuth2 token to validate
   * @param expectedScopes Required scopes for wedding operations
   * @returns True if token has appropriate wedding context
   */
  static validateWeddingContext(
    token: OAuth2Token,
    expectedScopes: string[],
  ): boolean {
    if (!token.scope) {
      return false; // No scope info
    }

    const tokenScopes = token.scope.split(' ');

    // Check that all required scopes are present
    return expectedScopes.every((scope) => tokenScopes.includes(scope));
  }

  /**
   * Check Token Permissions for Wedding Operations
   *
   * Verifies that the token has sufficient permissions for
   * reading wedding/event data from the CRM provider.
   *
   * @param token OAuth2 token to check
   * @param provider Provider name ('honeybook', 'tave', etc.)
   * @returns True if token has wedding data permissions
   */
  static hasWeddingDataPermissions(
    token: OAuth2Token,
    provider: string,
  ): boolean {
    if (!token.scope) return false;

    const scopes = token.scope.split(' ');

    // Provider-specific scope validation
    switch (provider.toLowerCase()) {
      case 'honeybook':
        return (
          scopes.includes('read:projects') || scopes.includes('read:clients')
        );

      case 'tave':
        return scopes.includes('read:jobs') || scopes.includes('read:contacts');

      default:
        // Generic check for data access scopes
        return scopes.some(
          (scope) =>
            scope.includes('read') ||
            scope.includes('client') ||
            scope.includes('project') ||
            scope.includes('event'),
        );
    }
  }

  /**
   * Saturday Safety Check for OAuth Operations
   *
   * Implements wedding day protection by limiting OAuth operations
   * on Saturdays during wedding season (May-October).
   *
   * @returns True if OAuth operations are safe to proceed
   */
  static isSafeForOAuthOperations(): boolean {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
    const month = now.getMonth() + 1; // 1-12

    // Saturday check
    const isSaturday = dayOfWeek === 6;

    // Wedding season check (May through October)
    const isWeddingSeason = month >= 5 && month <= 10;

    // Allow OAuth operations unless it's Saturday during wedding season
    return !(isSaturday && isWeddingSeason);
  }

  /**
   * Generate Wedding-Safe State Parameter
   *
   * Generates state parameter with wedding-specific entropy
   * to prevent predictable state attacks in wedding CRM context.
   *
   * @param providerName CRM provider name
   * @param userId User identifier
   * @returns Secure state parameter with wedding context
   */
  static generateWeddingState(providerName: string, userId: string): string {
    const timestamp = Date.now().toString();
    const randomPart = OAuthPKCEUtils.generateRandomString(16);
    const contextHash = OAuthPKCEUtils.hashSHA256(
      `${providerName}:${userId}:wedding`,
    );

    return `ws_${timestamp}_${randomPart}_${contextHash.substring(0, 8)}`;
  }
}

/**
 * OAuth Error Handling for Wedding CRM Context
 */
export enum OAuthErrorCode {
  INVALID_CLIENT = 'invalid_client',
  INVALID_GRANT = 'invalid_grant',
  INVALID_REQUEST = 'invalid_request',
  UNAUTHORIZED_CLIENT = 'unauthorized_client',
  UNSUPPORTED_GRANT_TYPE = 'unsupported_grant_type',
  INVALID_SCOPE = 'invalid_scope',
  ACCESS_DENIED = 'access_denied',
  TEMPORARILY_UNAVAILABLE = 'temporarily_unavailable',

  // Wedding-specific errors
  WEDDING_DAY_RESTRICTION = 'wedding_day_restriction',
  INSUFFICIENT_WEDDING_PERMISSIONS = 'insufficient_wedding_permissions',
  PROVIDER_MAINTENANCE = 'provider_maintenance',
}

export class OAuthError extends Error {
  constructor(
    public code: OAuthErrorCode,
    message: string,
    public weddingCritical: boolean = false,
  ) {
    super(message);
    this.name = 'OAuthError';
  }
}

/**
 * Provider-Specific OAuth Configurations
 */
export const OAUTH_PROVIDERS = {
  honeybook: {
    authUrl: 'https://app.honeybook.com/oauth/authorize',
    tokenUrl: 'https://app.honeybook.com/oauth/token',
    revokeUrl: 'https://app.honeybook.com/oauth/revoke',
    scopes: ['read:projects', 'read:clients', 'read:invoices'],
    requiresClientSecret: true,
  },

  tave: {
    authUrl: 'https://tave.com/oauth/authorize',
    tokenUrl: 'https://tave.com/oauth/token',
    revokeUrl: 'https://tave.com/oauth/revoke',
    scopes: ['read:jobs', 'read:contacts', 'read:workflows'],
    requiresClientSecret: false, // PKCE only
  },
} as const;
