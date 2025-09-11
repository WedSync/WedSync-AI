/**
 * WS-336: Calendar Integration System - OAuth Service
 *
 * Handles OAuth 2.0 flows for Google Calendar, Microsoft Outlook, and Apple Calendar.
 * Implements PKCE, state validation, and secure token management for wedding vendors.
 *
 * SECURITY CRITICAL: OAuth flows must be bulletproof to protect vendor calendar access.
 */

import * as crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { SecureCalendarTokenManager } from './token-encryption';

interface PKCEData {
  codeVerifier: string;
  codeChallenge: string;
  codeChallengeMethod: string;
}

interface OAuthState {
  organizationId: string;
  userId: string;
  provider: CalendarProvider;
  timestamp: number;
  nonce: string;
  returnUrl?: string;
}

interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  scope: string;
  tokenType: string;
}

interface CalendarConnection {
  id?: string;
  organizationId: string;
  userId: string;
  provider: CalendarProvider;
  providerAccountId: string;
  providerEmail: string;
  status: 'active' | 'inactive' | 'expired' | 'error';
  isPrimary: boolean;
  syncEnabled: boolean;
  syncDirection: 'import_only' | 'export_only' | 'bidirectional';
  defaultCalendarId?: string;
  lastSyncAt?: Date;
}

type CalendarProvider = 'google' | 'outlook' | 'apple' | 'exchange';

export class CalendarOAuthService {
  private static readonly STATE_TTL_MINUTES = 10;
  private static readonly PKCE_CODE_VERIFIER_LENGTH = 128;

  // OAuth 2.0 Provider Configurations
  private static readonly PROVIDER_CONFIGS = {
    google: {
      authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
      scopes: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/userinfo.email',
      ],
      responseType: 'code',
      accessType: 'offline',
      prompt: 'consent', // Forces refresh token
    },
    outlook: {
      authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
      tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
      scopes: [
        'https://graph.microsoft.com/Calendars.ReadWrite',
        'https://graph.microsoft.com/User.Read',
        'offline_access',
      ],
      responseType: 'code',
      accessType: 'offline',
    },
    apple: {
      // Apple Calendar uses CalDAV - different auth flow
      authUrl: 'https://appleid.apple.com/auth/authorize',
      tokenUrl: 'https://appleid.apple.com/auth/token',
      scopes: ['name', 'email'],
      responseType: 'code',
      // Note: Apple Calendar requires additional CalDAV setup after OAuth
    },
  };

  /**
   * Generate PKCE code verifier and challenge for OAuth 2.0
   */
  private static generatePKCE(): PKCEData {
    // Generate code verifier (43-128 characters, URL safe)
    const codeVerifier = crypto
      .randomBytes(96) // 96 bytes = 128 characters base64
      .toString('base64')
      .replace(/[+/]/g, (c) => (c === '+' ? '-' : '_'))
      .replace(/=/g, '')
      .substring(0, this.PKCE_CODE_VERIFIER_LENGTH);

    // Generate code challenge (SHA256 hash of verifier, base64url encoded)
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64')
      .replace(/[+/]/g, (c) => (c === '+' ? '-' : '_'))
      .replace(/=/g, '');

    return {
      codeVerifier,
      codeChallenge,
      codeChallengeMethod: 'S256',
    };
  }

  /**
   * Generate and sign OAuth state parameter
   */
  private static generateState(
    organizationId: string,
    userId: string,
    provider: CalendarProvider,
    returnUrl?: string,
  ): string {
    const stateData: OAuthState = {
      organizationId,
      userId,
      provider,
      timestamp: Date.now(),
      nonce: crypto.randomBytes(16).toString('hex'),
      returnUrl,
    };

    // Sign the state with HMAC
    const stateJson = JSON.stringify(stateData);
    const signature = crypto
      .createHmac('sha256', process.env.OAUTH_STATE_SECRET!)
      .update(stateJson)
      .digest('hex');

    // Combine state data and signature
    const signedState = {
      data: stateData,
      signature,
    };

    return Buffer.from(JSON.stringify(signedState)).toString('base64url');
  }

  /**
   * Validate and parse OAuth state parameter
   */
  private static validateState(stateParam: string): OAuthState | null {
    try {
      const decoded = JSON.parse(
        Buffer.from(stateParam, 'base64url').toString(),
      );
      const { data, signature } = decoded;

      // Verify signature
      const expectedSignature = crypto
        .createHmac('sha256', process.env.OAUTH_STATE_SECRET!)
        .update(JSON.stringify(data))
        .digest('hex');

      if (
        !crypto.timingSafeEqual(
          Buffer.from(signature, 'hex'),
          Buffer.from(expectedSignature, 'hex'),
        )
      ) {
        console.error('OAuth state signature validation failed');
        return null;
      }

      // Check expiration
      const now = Date.now();
      const stateAge = now - data.timestamp;
      const maxAge = this.STATE_TTL_MINUTES * 60 * 1000;

      if (stateAge > maxAge) {
        console.error('OAuth state has expired', { stateAge, maxAge });
        return null;
      }

      return data as OAuthState;
    } catch (error) {
      console.error('Failed to validate OAuth state:', error);
      return null;
    }
  }

  /**
   * Generate OAuth authorization URL for calendar provider
   */
  static async generateAuthUrl(
    provider: CalendarProvider,
    organizationId: string,
    userId: string,
    returnUrl?: string,
  ): Promise<{ url: string; state: string; codeVerifier?: string } | null> {
    try {
      if (!this.PROVIDER_CONFIGS[provider]) {
        throw new Error(`Unsupported calendar provider: ${provider}`);
      }

      const config = this.PROVIDER_CONFIGS[provider];

      // Get provider credentials
      const clientId = process.env[`${provider.toUpperCase()}_OAUTH_CLIENT_ID`];
      const redirectUri =
        process.env[`${provider.toUpperCase()}_OAUTH_REDIRECT_URI`] ||
        `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/oauth/${provider}/callback`;

      if (!clientId) {
        throw new Error(`Missing OAuth client ID for ${provider}`);
      }

      // Generate PKCE for security
      const pkce = this.generatePKCE();

      // Generate state parameter
      const state = this.generateState(
        organizationId,
        userId,
        provider,
        returnUrl,
      );

      // Store PKCE verifier temporarily (in production, use Redis)
      // For now, we'll include it in the response for the callback to use
      await this.storePKCEVerifier(state, pkce.codeVerifier);

      // Build authorization URL
      const authUrl = new URL(config.authUrl);
      const params = {
        client_id: clientId,
        response_type: config.responseType,
        redirect_uri: redirectUri,
        scope: config.scopes.join(' '),
        state: state,
        code_challenge: pkce.codeChallenge,
        code_challenge_method: pkce.codeChallengeMethod,
        ...(config.accessType && { access_type: config.accessType }),
        ...(config.prompt && { prompt: config.prompt }),
      };

      Object.entries(params).forEach(([key, value]) => {
        authUrl.searchParams.set(key, value);
      });

      return {
        url: authUrl.toString(),
        state,
        codeVerifier: pkce.codeVerifier, // Only for debugging, remove in production
      };
    } catch (error) {
      console.error('Failed to generate OAuth auth URL:', error);
      return null;
    }
  }

  /**
   * Exchange OAuth authorization code for tokens
   */
  static async exchangeCodeForTokens(
    provider: CalendarProvider,
    authCode: string,
    state: string,
  ): Promise<OAuthTokens | null> {
    try {
      // Validate state parameter
      const stateData = this.validateState(state);
      if (!stateData) {
        throw new Error('Invalid or expired OAuth state');
      }

      if (stateData.provider !== provider) {
        throw new Error('Provider mismatch in OAuth state');
      }

      const config = this.PROVIDER_CONFIGS[provider];
      const clientId = process.env[`${provider.toUpperCase()}_OAUTH_CLIENT_ID`];
      const clientSecret =
        process.env[`${provider.toUpperCase()}_OAUTH_CLIENT_SECRET`];
      const redirectUri =
        process.env[`${provider.toUpperCase()}_OAUTH_REDIRECT_URI`] ||
        `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/oauth/${provider}/callback`;

      if (!clientId || !clientSecret) {
        throw new Error(`Missing OAuth credentials for ${provider}`);
      }

      // Retrieve PKCE verifier
      const codeVerifier = await this.retrievePKCEVerifier(state);
      if (!codeVerifier) {
        throw new Error('PKCE code verifier not found');
      }

      // Prepare token request
      const tokenRequestBody = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code: authCode,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
      });

      // Exchange code for tokens
      const tokenResponse = await fetch(config.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: tokenRequestBody.toString(),
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.text();
        throw new Error(`Token exchange failed: ${errorData}`);
      }

      const tokenData = await tokenResponse.json();

      // Clean up PKCE verifier
      await this.deletePKCEVerifier(state);

      return {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresIn: tokenData.expires_in || 3600,
        scope: tokenData.scope || config.scopes.join(' '),
        tokenType: tokenData.token_type || 'Bearer',
      };
    } catch (error) {
      console.error('OAuth token exchange failed:', error);
      return null;
    }
  }

  /**
   * Refresh OAuth access token
   */
  static async refreshAccessToken(
    provider: CalendarProvider,
    refreshToken: string,
    organizationId: string,
  ): Promise<OAuthTokens | null> {
    try {
      const config = this.PROVIDER_CONFIGS[provider];
      const clientId = process.env[`${provider.toUpperCase()}_OAUTH_CLIENT_ID`];
      const clientSecret =
        process.env[`${provider.toUpperCase()}_OAUTH_CLIENT_SECRET`];

      if (!clientId || !clientSecret) {
        throw new Error(`Missing OAuth credentials for ${provider}`);
      }

      // Prepare refresh request
      const refreshRequestBody = new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
      });

      // Request new access token
      const refreshResponse = await fetch(config.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: refreshRequestBody.toString(),
      });

      if (!refreshResponse.ok) {
        const errorData = await refreshResponse.text();
        throw new Error(`Token refresh failed: ${errorData}`);
      }

      const tokenData = await refreshResponse.json();

      return {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || refreshToken, // Some providers don't return new refresh token
        expiresIn: tokenData.expires_in || 3600,
        scope: tokenData.scope || config.scopes.join(' '),
        tokenType: tokenData.token_type || 'Bearer',
      };
    } catch (error) {
      console.error('OAuth token refresh failed:', error);
      return null;
    }
  }

  /**
   * Get user info from OAuth provider
   */
  static async getUserInfo(
    provider: CalendarProvider,
    accessToken: string,
  ): Promise<{ id: string; email: string; name?: string } | null> {
    try {
      const config = this.PROVIDER_CONFIGS[provider];

      const userInfoResponse = await fetch(config.userInfoUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      });

      if (!userInfoResponse.ok) {
        throw new Error(
          `User info request failed: ${userInfoResponse.statusText}`,
        );
      }

      const userInfo = await userInfoResponse.json();

      // Normalize user info across providers
      switch (provider) {
        case 'google':
          return {
            id: userInfo.id,
            email: userInfo.email,
            name: userInfo.name,
          };
        case 'outlook':
          return {
            id: userInfo.id,
            email: userInfo.mail || userInfo.userPrincipalName,
            name: userInfo.displayName,
          };
        case 'apple':
          return {
            id: userInfo.sub,
            email: userInfo.email,
            name: userInfo.name
              ? `${userInfo.name.firstName} ${userInfo.name.lastName}`
              : undefined,
          };
        default:
          throw new Error(`Unsupported provider for user info: ${provider}`);
      }
    } catch (error) {
      console.error('Failed to get user info:', error);
      return null;
    }
  }

  /**
   * Store calendar connection in database
   */
  static async storeConnection(
    connectionData: Omit<CalendarConnection, 'id'>,
    tokens: OAuthTokens,
  ): Promise<CalendarConnection | null> {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
      );

      // Encrypt tokens before storage
      const encryptedAccessToken = await SecureCalendarTokenManager.storeToken(
        tokens.accessToken,
        connectionData.organizationId,
        'access',
      );

      const encryptedRefreshToken = tokens.refreshToken
        ? await SecureCalendarTokenManager.storeToken(
            tokens.refreshToken,
            connectionData.organizationId,
            'refresh',
          )
        : null;

      if (!encryptedAccessToken) {
        throw new Error('Failed to encrypt access token');
      }

      // Calculate token expiration time
      const tokenExpiresAt = new Date(Date.now() + tokens.expiresIn * 1000);

      // Insert connection record
      const { data, error } = await supabase
        .from('calendar_connections')
        .insert({
          organization_id: connectionData.organizationId,
          user_id: connectionData.userId,
          provider: connectionData.provider,
          provider_account_id: connectionData.providerAccountId,
          provider_email: connectionData.providerEmail,
          status: connectionData.status,
          is_primary: connectionData.isPrimary,
          sync_enabled: connectionData.syncEnabled,
          sync_direction: connectionData.syncDirection,
          default_calendar_id: connectionData.defaultCalendarId,
          access_token_encrypted: encryptedAccessToken,
          refresh_token_encrypted: encryptedRefreshToken,
          token_expires_at: tokenExpiresAt.toISOString(),
          created_by: connectionData.userId,
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to store calendar connection:', error);
        return null;
      }

      return {
        id: data.id,
        organizationId: data.organization_id,
        userId: data.user_id,
        provider: data.provider as CalendarProvider,
        providerAccountId: data.provider_account_id,
        providerEmail: data.provider_email,
        status: data.status as CalendarConnection['status'],
        isPrimary: data.is_primary,
        syncEnabled: data.sync_enabled,
        syncDirection:
          data.sync_direction as CalendarConnection['syncDirection'],
        defaultCalendarId: data.default_calendar_id,
        lastSyncAt: data.last_sync_at ? new Date(data.last_sync_at) : undefined,
      };
    } catch (error) {
      console.error('Failed to store calendar connection:', error);
      return null;
    }
  }

  /**
   * Revoke OAuth tokens and disconnect calendar
   */
  static async revokeConnection(
    connectionId: string,
    organizationId: string,
  ): Promise<boolean> {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
      );

      // Get connection details
      const { data: connection } = await supabase
        .from('calendar_connections')
        .select('*')
        .eq('id', connectionId)
        .eq('organization_id', organizationId)
        .single();

      if (!connection) {
        throw new Error('Calendar connection not found');
      }

      // Retrieve and revoke tokens
      if (connection.access_token_encrypted) {
        const tokenResult = await SecureCalendarTokenManager.retrieveToken(
          connection.access_token_encrypted,
          organizationId,
          'access',
        );

        if (tokenResult?.token) {
          await this.revokeTokenWithProvider(
            connection.provider,
            tokenResult.token,
          );
        }
      }

      // Delete connection record
      const { error } = await supabase
        .from('calendar_connections')
        .delete()
        .eq('id', connectionId)
        .eq('organization_id', organizationId);

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Failed to revoke calendar connection:', error);
      return false;
    }
  }

  /**
   * Revoke token with OAuth provider
   */
  private static async revokeTokenWithProvider(
    provider: CalendarProvider,
    accessToken: string,
  ): Promise<boolean> {
    try {
      const revokeUrls = {
        google: 'https://oauth2.googleapis.com/revoke',
        outlook: 'https://login.microsoftonline.com/common/oauth2/v2.0/logout',
        apple: undefined, // Apple doesn't have a revoke endpoint
      };

      const revokeUrl = revokeUrls[provider];
      if (!revokeUrl) {
        console.warn(`No revoke URL for provider: ${provider}`);
        return true; // Consider it successful if no revoke endpoint
      }

      const response = await fetch(revokeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          token: accessToken,
        }).toString(),
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to revoke token with provider:', error);
      return false;
    }
  }

  /**
   * Temporary storage for PKCE verifiers (use Redis in production)
   */
  private static pkceStore = new Map<string, string>();

  private static async storePKCEVerifier(
    state: string,
    verifier: string,
  ): Promise<void> {
    this.pkceStore.set(state, verifier);

    // Clean up after 15 minutes
    setTimeout(
      () => {
        this.pkceStore.delete(state);
      },
      15 * 60 * 1000,
    );
  }

  private static async retrievePKCEVerifier(
    state: string,
  ): Promise<string | null> {
    return this.pkceStore.get(state) || null;
  }

  private static async deletePKCEVerifier(state: string): Promise<void> {
    this.pkceStore.delete(state);
  }
}

export type { CalendarProvider, CalendarConnection, OAuthTokens, OAuthState };
