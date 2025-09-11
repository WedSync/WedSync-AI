import jwt from 'jsonwebtoken';
import { OAuth2Credentials } from '@/types/presence';
import {
  logIntegrationActivity,
  logIntegrationError,
} from '@/lib/integrations/audit-logger';

// JWT token interface for OAuth validation
interface JWTToken {
  userId: string;
  provider: string;
  scope: string;
  exp: number;
  iat: number;
}

// OAuth token validation result
interface TokenValidationResult {
  isValid: boolean;
  userId?: string;
  provider?: string;
  scope?: string;
  error?: string;
}

/**
 * Validate OAuth token from Authorization header
 */
export async function validateOAuthToken(
  authHeader: string,
): Promise<JWTToken | null> {
  try {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Invalid authorization header format');
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!token) {
      throw new Error('No token provided');
    }

    // Verify JWT token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET not configured');
    }

    const decoded = jwt.verify(token, jwtSecret) as JWTToken;

    // Validate token structure
    if (!decoded.userId || !decoded.provider) {
      throw new Error('Invalid token payload');
    }

    // Check if token is expired
    if (decoded.exp && Date.now() >= decoded.exp * 1000) {
      throw new Error('Token expired');
    }

    return decoded;
  } catch (error) {
    console.error('OAuth token validation failed:', error);
    await logIntegrationError(
      'unknown',
      'oauth_token_validation_failed',
      error,
    );
    return null;
  }
}

/**
 * Validate OAuth credentials and refresh if needed
 */
export async function validateAndRefreshOAuthCredentials(
  credentials: OAuth2Credentials,
  userId: string,
): Promise<OAuth2Credentials> {
  try {
    // Check if token is expired or expires soon (within 5 minutes)
    const now = Date.now();
    const expiresAt = credentials.expiresAt.getTime();
    const fiveMinutes = 5 * 60 * 1000;

    if (expiresAt - now < fiveMinutes) {
      console.log(`Token expires soon for user ${userId}, refreshing...`);

      const refreshedCredentials = await refreshOAuthToken(credentials, userId);

      await logIntegrationActivity(userId, 'oauth_token_refreshed', {
        provider: credentials.provider,
        oldExpiry: credentials.expiresAt.toISOString(),
        newExpiry: refreshedCredentials.expiresAt.toISOString(),
      });

      return refreshedCredentials;
    }

    return credentials;
  } catch (error) {
    await logIntegrationError(
      userId,
      'oauth_credential_validation_failed',
      error,
    );
    throw error;
  }
}

/**
 * Refresh OAuth token using refresh token
 */
export async function refreshOAuthToken(
  credentials: OAuth2Credentials,
  userId: string,
): Promise<OAuth2Credentials> {
  try {
    const refreshedCredentials = await performTokenRefresh(credentials);

    // Store refreshed credentials securely
    await storeRefreshedCredentials(
      userId,
      credentials.provider,
      refreshedCredentials,
    );

    await logIntegrationActivity(userId, 'oauth_token_refresh_success', {
      provider: credentials.provider,
      newExpiresAt: refreshedCredentials.expiresAt.toISOString(),
    });

    return refreshedCredentials;
  } catch (error) {
    await logIntegrationError(userId, 'oauth_token_refresh_failed', error);
    throw new Error(
      `Token refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

/**
 * Perform actual token refresh based on provider
 */
async function performTokenRefresh(
  credentials: OAuth2Credentials,
): Promise<OAuth2Credentials> {
  switch (credentials.provider) {
    case 'google':
      return await refreshGoogleToken(credentials);
    case 'microsoft':
      return await refreshMicrosoftToken(credentials);
    case 'slack':
      return await refreshSlackToken(credentials);
    default:
      throw new Error(`Unsupported OAuth provider: ${credentials.provider}`);
  }
}

/**
 * Refresh Google OAuth token
 */
async function refreshGoogleToken(
  credentials: OAuth2Credentials,
): Promise<OAuth2Credentials> {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: credentials.refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      throw new Error(`Google token refresh failed: ${response.status}`);
    }

    const data = await response.json();

    return {
      ...credentials,
      accessToken: data.access_token,
      refreshToken: data.refresh_token || credentials.refreshToken, // Google may not return new refresh token
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      tokenType: data.token_type || 'Bearer',
    };
  } catch (error) {
    console.error('Google token refresh failed:', error);
    throw error;
  }
}

/**
 * Refresh Microsoft OAuth token
 */
async function refreshMicrosoftToken(
  credentials: OAuth2Credentials,
): Promise<OAuth2Credentials> {
  try {
    const response = await fetch(
      'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: process.env.MICROSOFT_CLIENT_ID!,
          client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
          refresh_token: credentials.refreshToken,
          grant_type: 'refresh_token',
          scope: credentials.scope,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Microsoft token refresh failed: ${response.status}`);
    }

    const data = await response.json();

    return {
      ...credentials,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      scope: data.scope,
      tokenType: data.token_type || 'Bearer',
    };
  } catch (error) {
    console.error('Microsoft token refresh failed:', error);
    throw error;
  }
}

/**
 * Refresh Slack OAuth token
 */
async function refreshSlackToken(
  credentials: OAuth2Credentials,
): Promise<OAuth2Credentials> {
  try {
    const response = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.SLACK_CLIENT_ID!,
        client_secret: process.env.SLACK_CLIENT_SECRET!,
        refresh_token: credentials.refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      throw new Error(`Slack token refresh failed: ${response.status}`);
    }

    const data = await response.json();

    if (!data.ok) {
      throw new Error(`Slack API error: ${data.error}`);
    }

    return {
      ...credentials,
      accessToken: data.access_token,
      refreshToken: data.refresh_token || credentials.refreshToken,
      expiresAt: data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000)
        : new Date(Date.now() + 24 * 60 * 60 * 1000), // Default 24 hours if not provided
      scope: data.scope || credentials.scope,
      tokenType: 'Bearer',
    };
  } catch (error) {
    console.error('Slack token refresh failed:', error);
    throw error;
  }
}

/**
 * Validate OAuth scopes for integration
 */
export function validateOAuthScopes(
  requiredScopes: string[],
  providedScopes: string,
): boolean {
  try {
    const providedScopeArray = providedScopes.split(' ');

    // Check if all required scopes are present
    return requiredScopes.every((scope) => providedScopeArray.includes(scope));
  } catch (error) {
    console.error('OAuth scope validation failed:', error);
    return false;
  }
}

/**
 * Generate JWT token for OAuth integration
 */
export function generateOAuthJWT(
  userId: string,
  provider: string,
  scope: string,
  expiresIn: string = '1h',
): string {
  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET not configured');
    }

    const payload = {
      userId,
      provider,
      scope,
      iat: Math.floor(Date.now() / 1000),
    };

    return jwt.sign(payload, jwtSecret, { expiresIn });
  } catch (error) {
    console.error('JWT generation failed:', error);
    throw error;
  }
}

/**
 * Validate OAuth state parameter to prevent CSRF attacks
 */
export function validateOAuthState(
  providedState: string,
  expectedState: string,
): boolean {
  try {
    if (!providedState || !expectedState) {
      return false;
    }

    // Timing-safe comparison to prevent timing attacks
    const providedBuffer = Buffer.from(providedState);
    const expectedBuffer = Buffer.from(expectedState);

    if (providedBuffer.length !== expectedBuffer.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < providedBuffer.length; i++) {
      result |= providedBuffer[i] ^ expectedBuffer[i];
    }

    return result === 0;
  } catch (error) {
    console.error('OAuth state validation failed:', error);
    return false;
  }
}

// Helper functions (would be implemented with actual database operations)
async function storeRefreshedCredentials(
  userId: string,
  provider: string,
  credentials: OAuth2Credentials,
): Promise<void> {
  // Implementation would store encrypted credentials in database
  console.log(
    `Storing refreshed credentials for user ${userId}, provider ${provider}`,
  );
}

/**
 * OAuth provider configuration
 */
export const OAuthProviders = {
  google: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    requiredScopes: ['https://www.googleapis.com/auth/calendar.readonly'],
    redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback/google`,
  },
  microsoft: {
    authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    requiredScopes: [
      'https://graph.microsoft.com/Calendars.Read',
      'https://graph.microsoft.com/Presence.Read',
    ],
    redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback/microsoft`,
  },
  slack: {
    authUrl: 'https://slack.com/oauth/v2/authorize',
    tokenUrl: 'https://slack.com/api/oauth.v2.access',
    requiredScopes: ['users.profile:read', 'users.profile:write', 'users:read'],
    redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback/slack`,
  },
} as const;

/**
 * Generate OAuth authorization URL
 */
export function generateOAuthAuthorizationUrl(
  provider: keyof typeof OAuthProviders,
  state: string,
  userId: string,
): string {
  const config = OAuthProviders[provider];
  const clientId = process.env[`${provider.toUpperCase()}_CLIENT_ID`];

  if (!clientId) {
    throw new Error(`Client ID not configured for provider: ${provider}`);
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: config.redirectUri,
    scope: config.requiredScopes.join(' '),
    response_type: 'code',
    state: state,
    access_type: 'offline', // For refresh token
    prompt: 'consent', // Force consent screen for refresh token
  });

  return `${config.authUrl}?${params.toString()}`;
}
